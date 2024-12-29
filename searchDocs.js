require('dotenv').config();
const { PineconeClient } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function searchDocs(query) {
    try {
        // Initialize Pinecone
        const pinecone = new PineconeClient();
        await pinecone.init({
            apiKey: process.env.PINECONE_API_KEY,
            environment: process.env.PINECONE_ENVIRONMENT,
            projectId: process.env.PINECONE_PROJECT
        });

        // Initialize OpenAI
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Generate query embedding
        const embeddingResponse = await openai.embeddings.create({
            model: process.env.PINECONE_EMBEDDING_MODEL,
            input: query
        });
        const queryVector = embeddingResponse.data[0].embedding;

        // Query Pinecone using direct API
        const searchResponse = await axios({
            method: 'post',
            url: `${process.env.PINECONE_HOST}/query`,
            headers: {
                'Api-Key': process.env.PINECONE_API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: {
                vector: queryVector,
                topK: 3,
                includeMetadata: true,
                includeValues: false
            }
        });

        // Transform the response to include scores and content
        const matches = searchResponse.data.matches || [];
        const results = await Promise.all(matches.map(async match => {
            const content = fs.readFileSync(path.join(__dirname, 'lukedocs', match.metadata.filename), 'utf-8');
            return {
                filename: match.metadata.filename,
                score: match.score,
                metadata: match.metadata,
                content: content
            };
        }));

        // Filter results by 80% relevance
        const relevantDocs = results.filter(doc => doc.score >= 0.8);

        return relevantDocs;
    } catch (error) {
        console.error('Search error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        throw error;
    }
}

module.exports = { searchDocs };