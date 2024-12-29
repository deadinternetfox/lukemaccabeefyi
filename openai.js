const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function getEmbedding(text) {
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-large",
            input: text,
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error getting embedding:', error);
        throw error;
    }
}

async function generateResponse(prompt, conversationHistory = [], context = '') {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
    }

    const systemMessage = {
        role: 'system',
        content: `You are Luke's AI assistant. Your task is to provide accurate information based on the following context. Never make up information.

If the context contains relevant information, use it in your response.
If you don't have specific information in the context, say "I don't have specific information about that."

Context:
${context}

Format your responses professionally and clearly. Do not include source citations - these will be added separately.`
    };

    const messages = [
        systemMessage,
        ...conversationHistory,
        { role: 'user', content: prompt }
    ];

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI Error:', error);
        throw error;
    }
}

module.exports = {
    generateResponse,
    getEmbedding
};
