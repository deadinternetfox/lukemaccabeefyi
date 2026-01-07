require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PineconeClient } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
const fetch = require('node-fetch');
const axios = require('axios');

// Helper function for delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
async function retry(fn, retries = 3, backoff = 1000) {
    try {
        return await fn();
    } catch (err) {
        if (retries === 0) throw err;
        console.log(`Retrying after ${backoff}ms...`);
        await delay(backoff);
        return retry(fn, retries - 1, backoff * 2);
    }
}

// Initialize Pinecone client
async function initPinecone() {
    console.log('Initializing Pinecone with:', {
        environment: process.env.PINECONE_ENVIRONMENT,
        project: process.env.PINECONE_PROJECT
    });
    
    const pinecone = new PineconeClient();
    await pinecone.init({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT,
        projectId: process.env.PINECONE_PROJECT
    });
    return pinecone;
}

// Update the index stats verification
async function verifyIndex(pinecone, indexName) {
    console.log('Verifying index:', indexName);
    try {
        const statsResponse = await axios({
            method: 'post',
            url: `${process.env.PINECONE_HOST}/describe_index_stats`,
            headers: {
                'Api-Key': process.env.PINECONE_API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('Index stats:', JSON.stringify(statsResponse.data, null, 2));
        
        // Return the Pinecone index instance for further operations
        return pinecone.Index(indexName);
    } catch (error) {
        console.error('Index verification failed:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        throw error;
    }
}

async function getDocumentMetadata(index, filename) {
    try {
        const response = await axios({
            method: 'post',
            url: `${process.env.PINECONE_HOST}/query`,
            headers: {
                'Api-Key': process.env.PINECONE_API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: {
                id: filename,
                topK: 1,
                includeMetadata: true
            }
        });
        return response.data.matches?.[0]?.metadata;
    } catch (error) {
        console.log(`No existing metadata found for ${filename}`);
        return null;
    }
}

async function processDocuments(index, docsDir, openai) {
    const files = fs.readdirSync(docsDir);
    
    for (const file of files) {
        try {
            const filePath = path.join(docsDir, file);
            const stats = fs.statSync(filePath);
            const lastModified = stats.mtime.toISOString();
            
            // Check if file already exists in Pinecone and compare timestamps
            const existingMetadata = await getDocumentMetadata(index, file);
            if (existingMetadata && existingMetadata.timestamp === lastModified) {
                console.log(`Skipping ${file} - no changes detected`);
                continue;
            }

            const content = fs.readFileSync(filePath, 'utf-8');
            console.log(`Processing ${file} - changes detected or new file`);

            const embeddingResponse = await openai.embeddings.create({
                model: 'text-embedding-3-large',
                input: content,
            });
            const embedding = embeddingResponse.data[0].embedding;

            // Directly call Pinecone API
            const vectorData = {
                id: file,
                values: embedding,
                metadata: {
                    filename: file,
                    timestamp: lastModified,
                    text: content // Store content as 'text' field
                }
            };

            await axios({
                method: 'post',
                url: `${process.env.PINECONE_HOST}/vectors/upsert`,
                headers: {
                    'Api-Key': process.env.PINECONE_API_KEY,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                data: {
                    vectors: [vectorData]
                }
            });

            console.log(`Successfully processed ${file} with metadata:`, vectorData.metadata);
        } catch (err) {
            console.error(`Error processing file ${file}:`, err);
            continue;
        }
    }
}

// Update function signature to accept required parameters
async function processImageDescriptions(index, openai) {
    const imageDir = path.join(__dirname, 'public', 'static', 'images', 'pet-media');
    console.log('Checking pet-media directory:', imageDir);

    try {
        const files = await fs.promises.readdir(imageDir);
        console.log('Found files in pet-media:', files);
        
        for (const file of files) {
            if (!file.endsWith('.txt')) continue;
            
            const filePath = path.join(imageDir, file);
            const stats = fs.statSync(filePath);
            const lastModified = stats.mtime.toISOString();
            
            // Check if description already exists in Pinecone and compare timestamps
            const existingMetadata = await getDocumentMetadata(index, `pet-media/${file}`);
            if (existingMetadata && existingMetadata.timestamp === lastModified) {
                console.log(`Skipping ${file} - no changes detected`);
                continue;
            }

            console.log(`Processing pet-media text file: ${file}`);
            const content = await fs.promises.readFile(filePath, 'utf-8');

            // Generate embedding for the content
            const embeddingResponse = await openai.embeddings.create({
                model: 'text-embedding-3-large',
                input: content,
            });
            const embedding = embeddingResponse.data[0].embedding;

            const baseName = file.replace('.txt', '');
            const mediaFiles = files.filter(f => 
                f.startsWith(baseName) && 
                (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.mp4'))
            );

            console.log(`Found media files for ${baseName}:`, mediaFiles);

            // Update vector in Pinecone
            const vectorData = {
                id: `pet-media/${file}`,
                values: embedding,
                metadata: {
                    filename: `pet-media/${file}`,
                    timestamp: lastModified,
                    text: content,
                    mediaFiles: mediaFiles.map(f => `/static/images/pet-media/${f}`),
                    type: 'image-description'
                }
            };

            await axios({
                method: 'post',
                url: `${process.env.PINECONE_HOST}/vectors/upsert`,
                headers: {
                    'Api-Key': process.env.PINECONE_API_KEY,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                data: {
                    vectors: [vectorData]
                }
            });

            console.log(`Successfully processed ${file} with metadata:`, vectorData.metadata);
        }
    } catch (error) {
        console.error('Error processing image descriptions:', error);
    }
}

// Update the main vectorization function
async function vectorizeDocs() {
    try {
        const pinecone = await retry(() => initPinecone());
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        console.log('Verifying index...');
        const index = await verifyIndex(pinecone, process.env.PINECONE_INDEX);

        // Process regular documents
        const docsDir = path.join(__dirname, 'lukedocs');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }
        await processDocuments(index, docsDir, openai);

        // Process image descriptions (with better error handling)
        console.log('Processing image descriptions...');
        await processImageDescriptions(index, openai);
        
        console.log('Vectorization completed successfully');
    } catch (err) {
        console.error('Fatal error:', {
            message: err.message,
            cause: err.cause?.message,
            stack: err.stack,
            name: err.name
        });
        process.exit(1);
    }
}

(async () => {
    await vectorizeDocs();
})();
