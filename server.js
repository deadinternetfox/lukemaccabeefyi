require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const novelAI = require('./novelai');
const openAI = require('./openai');
const fs = require('fs');
const { exec } = require('child_process');
const { searchDocs } = require('./searchDocs');
const sessionManager = require('./sessionManager');

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

// Projects page
app.get('/projects', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'projects.html'));
});

// Individual project pages
app.get('/projects/:project', (req, res) => {
    const projectFile = path.join(__dirname, 'public', 'projects', `${req.params.project}.html`);
    if (fs.existsSync(projectFile)) {
        res.sendFile(projectFile);
    } else {
        res.status(404).sendFile(path.join(__dirname, 'public', 'projects.html'));
    }
});

// Add new route to get media index before the API routes
app.get('/static/images/pet-media/mediaIndex.json', (req, res) => {
    const mediaDir = path.join(__dirname, 'public/static/images/pet-media');
    try {
        // Get all files and map them with full info
        const mediaFiles = fs.readdirSync(mediaDir)
            .filter(file => !file.endsWith('.txt'))
            .map(file => {
                const baseName = file.substring(0, file.lastIndexOf('.'));
                const extension = file.substring(file.lastIndexOf('.'));
                return { 
                    baseName,
                    extension,
                    fullPath: `/static/images/pet-media/${file}`,
                    filename: file
                };
            });
        
        console.log('Media files found:', mediaFiles);
        res.json(mediaFiles);
    } catch (error) {
        console.error('Error reading media directory:', error);
        res.status(500).json([]);
    }
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

// Add session cleanup interval
setInterval(() => {
    sessionManager.cleanOldSessions();
}, 3600000); // Clean every hour

// OpenAI endpoint
app.post('/api/openai', async (req, res) => {
    const { input, conversation_history = [], context = '', sessionId } = req.body;

    if (!input || typeof input !== 'string') {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Invalid input parameter'
        });
    }

    try {
        // Get or create session
        const session = sessionManager.createSession(sessionId);
        
        const isPetSitting = context.toLowerCase().includes('pet') && 
                           context.toLowerCase().includes('sitting');
        
        const searchResults = await searchDocs(input, isPetSitting);
        
        // Use session's conversation history
        const output = await openAI.generateResponse(
            input, 
            session.conversationHistory,
            searchResults.relevantContent
        );

        // Update conversation history
        session.conversationHistory.push({ role: 'user', content: input });
        session.conversationHistory.push({ role: 'assistant', content: output });
        sessionManager.updateSession(sessionId, session.conversationHistory);
        
        res.json({ 
            status: 'complete', 
            text: output,
            sources: searchResults.sources
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
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Force reindex on startup
    try {
        await new Promise((resolve, reject) => {
            exec(`node ${path.join(__dirname, 'vectorizeDocs.js')} --force`, (error, stdout, stderr) => {
                if (error) {
                    console.error('Error running vectorizeDocs:', error);
                    reject(error);
                    return;
                }
                console.log('Vectorization completed:', stdout);
                if (stderr) {
                    console.error('Vectorization stderr:', stderr);
                }
                resolve();
            });
        });
    } catch (error) {
        console.error('Failed to reindex documents:', error);
    }
});