const axios = require('axios');
const { searchDocs } = require('./searchDocs');

const NOVELAI_API_KEY = process.env.NOVELAI_API_KEY;
const API_URL = 'https://api.novelai.net/ai/generate';

async function generateResponse(prompt, conversationHistory = []) {
    if (!NOVELAI_API_KEY) {
        throw new Error('NovelAI API key is not configured');
    }

    // Sanitize and validate input
    prompt = String(prompt).trim();
    if (!prompt) {
        throw new Error('Empty prompt');
    }

    console.log('Generating response with:', { prompt, historyLength: conversationHistory.length });

    let historyText = conversationHistory.map(message => {
        return `${message.role === 'user' ? 'Client' : 'Luke'}: ${message.content}`;
    }).join('\n');

    // Add top relevant docs to basePrompt
    const relevantDocs = await searchDocs(prompt);
    const docSnippets = relevantDocs.map(d => 
        `Content from ${d.filename}:\n${d.content}`
    ).join('\n\n');
    
    const basePrompt = `***
[Conversation History]: 
${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Luke'}: ${msg.content}`).join('\n')}

[Reference Documents]:
${docSnippets}

Instructions: Use the reference documents to inform your response, staying true to the content while maintaining your role as Luke Maccabee. If the documents aren't relevant to the query, rely on your standard background information.

Luke:`;

    const payload = {
        input: basePrompt,
        model: "6B-v4", // do not change
        parameters: {
            use_string: true,
            temperature: 0.6,
            min_length: 20,
            max_length: 200,
            top_k: 20,
            top_p: 0.8,
            tail_free_sampling: 0.92,
            repetition_penalty: 1.1,
            repetition_penalty_range: 1024,
            repetition_penalty_slope: 0.1,
            do_sample: true,
            early_stopping: false,
            num_beams: 5,
            bad_words_ids: [[0]],
            generate_until_sentence: true,
            prefix: "Luke:" // Helps format the response appropriately
        }
    };

    try {
        // Test API key format
        if (!NOVELAI_API_KEY.match(/^pst-[a-zA-Z0-9]{64}$/)) {
            throw new Error('Invalid NovelAI API key format');
        }

        console.log('Making request to NovelAI API...');

        const response = await axios.post(API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NOVELAI_API_KEY}`
            },
            timeout: 30000,
            // Accept both 200 and 201 status codes
            validateStatus: status => [200, 201].includes(status)
        });

        console.log('Response received:', {
            status: response.status,
            hasData: !!response.data,
            dataLength: response.data?.output?.length || 0
        });

        // Check if response.data is valid and has output
        if (!response.data || typeof response.data.output !== 'string') {
            console.error('Invalid response structure:', response.data);
            throw new Error('Invalid response format from NovelAI');
        }

        // Get first line of response and clean it
        const lines = response.data.output.split('\n');
        const firstLine = lines[0].trim();
        
        // Clean up response spacing
        const cleanResponse = firstLine
            .replace(/^Luke:\s*/i, '')
            .replace(/([.,!?])([A-Za-z])/g, '$1 $2')
            .replace(/,([^\s])/g, ', $1')
            .replace(/\.([^\s])/g, '. $1')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanResponse) {
            throw new Error('Empty response from NovelAI');
        }

        return cleanResponse;

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Axios error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });

            if (error.response?.status === 401) {
                throw new Error('Invalid NovelAI API key');
            } else if (error.response?.status === 429) {
                throw new Error('NovelAI API rate limit exceeded');
            }
        }

        console.error('NovelAI Error Details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            headers: error.response?.headers
        });
        throw error;
    }
}

module.exports = {
    generateResponse
};