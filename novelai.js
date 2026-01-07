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
        throw new Error('Prompt cannot be empty');
    }

    console.log('Generating response with:', { prompt, historyLength: conversationHistory.length });

    const historyText = conversationHistory.map(message => {
        return `${message.role === 'user' ? 'Client' : 'Assistant'}: ${message.content}`;
    }).join('\n');

    // Add relevant docs to base prompt
    const relevantDocs = await searchDocs(prompt);
    const docSnippets = relevantDocs.map(doc => `Content from ${doc.filename}:\n${doc.content}`).join('\n\n');

    const basePrompt = `***
[Conversation History]:
${historyText || 'None'}

[Reference Documents]:
${docSnippets || 'None'}

Instructions: You are an AI assistant. Follow these rules:
1. Use the provided context and documents for your response.
2. If the required information is not available, state "I don\'t have information about that".
3. Be concise, accurate, and professional.
4. Never fabricate or assume information.

Task:
${prompt}

Response:`;

    const payload = {
        input: basePrompt,
        model: "6B-v4", // NovelAI model identifier
        parameters: {
            use_string: true,
            temperature: 0.7,
            min_length: 50,
            max_length: 250,
            top_k: 40,
            top_p: 0.9,
            repetition_penalty: 1.2,
            repetition_penalty_range: 1024,
            repetition_penalty_slope: 0.1,
            do_sample: true,
            early_stopping: false,
            num_beams: 1,
            generate_until_sentence: true,
            prefix: "Assistant:"
        }
    };

    try {
        // Validate API key format
        if (!/^[a-zA-Z0-9]{64}$/.test(NOVELAI_API_KEY)) {
            throw new Error('Invalid NovelAI API key format');
        }

        console.log('Sending request to NovelAI API...');

        const response = await axios.post(API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NOVELAI_API_KEY}`
            },
            timeout: 30000,
            validateStatus: status => status >= 200 && status < 300
        });

        console.log('Response received:', {
            status: response.status,
            hasData: !!response.data,
            dataLength: response.data?.output?.length || 0
        });

        // Validate and parse response
        const output = response.data?.output;
        if (!output || typeof output !== 'string') {
            throw new Error('Invalid response format from NovelAI API');
        }

        // Clean and format response
        const cleanResponse = output
            .replace(/^Assistant:\s*/i, '')
            .replace(/([.,!?])([A-Za-z])/g, '$1 $2')
            .replace(/,([^\s])/g, ', $1')
            .replace(/\.([^\s])/g, '. $1')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanResponse) {
            throw new Error('Received empty response from NovelAI');
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
            status: error.response?.status
        });
        throw error;
    }
}

module.exports = {
    generateResponse
};
