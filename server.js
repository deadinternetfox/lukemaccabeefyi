require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const novelAI = require('./novelai');
const openAI = require('./openai');
const fs = require('fs');
const { exec } = require('child_process');
const { searchDocs } = require('./searchDocs');

const PORT = process.env.PORT || 3000;

// Add environment variable check
if (!process.env.NOVELAI_API_KEY) {
    console.error('ERROR: NOVELAI_API_KEY environment variable is not set!');
    // Check if .env file exists
    if (!fs.existsSync('.env')) {
        console.error('No .env file found. Please create one with NOVELAI_API_KEY=your_api_key');
    }
    process.exit(1);
}

// Call vectorizeDocs upon server start
exec(`node ${path.join(__dirname, 'vectorizeDocs.js')}`, (error, stdout, stderr) => {
    if (error) {
        console.error('Error running vectorizeDocs:', error);
        return;
    }
    console.log('Vectorization completed:', stdout);
    if (stderr) {
        console.error('Vectorization stderr:', stderr);
    }
});

app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public/static')));
app.use(express.static(path.join(__dirname, 'public')));

// Add new house sitting endpoint
app.get('/house-sitting', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'house-sitting.html'));
});

// Add new endpoints for AI Solutions and Travel & Media
app.get('/ai-solutions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ai-solutions.html'));
});

app.get('/travel-media', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'travel-media.html'));
});

// Handle root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// NovelAI endpoint
app.post('/api/novelai', async (req, res) => {
    const { input, conversation_history = [] } = req.body;

    if (!input || typeof input !== 'string') {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Invalid input parameter'
        });
    }

    try {
        const output = await novelAI.generateResponse(input, conversation_history);
        const sources = await searchDocs(input); // Add this line
        
        if (!output) {
            throw new Error('Empty response from NovelAI');
        }

        res.json({ 
            status: 'complete', 
            text: output,
            sources // Add this line
        });
    } catch (error) {
        console.error('NovelAI Error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message
        });
    }
});

// OpenAI endpoint
app.post('/api/openai', async (req, res) => {
    const { input, conversation_history = [] } = req.body;

    if (!input || typeof input !== 'string') {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Invalid input parameter'
        });
    }

    try {
        const output = await openAI.generateResponse(input, conversation_history);
        const sources = await searchDocs(input); // Add this line
        
        if (!output) {
            throw new Error('Empty response from OpenAI');
        }

        res.json({ 
            status: 'complete', 
            text: output,
            sources // Add this line
        });
    } catch (error) {
        console.error('OpenAI Error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message
        });
    }
});

// Remove the old /api/llm endpoint or update it to use novelAI as default
app.post('/api/llm', async (req, res) => {
    // Redirect to novelai endpoint for backward compatibility
    req.url = '/api/novelai';
    app.handle(req, res);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});