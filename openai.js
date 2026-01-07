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
        content: `You are Luke Maccabee's AI assistant on his portfolio website. Be helpful, friendly, and conversational.

About Luke:
- Full-stack developer and security researcher based in New Zealand
- Available for freelance work and contracts
- Skills: Python, Node.js, React, security research, OSINT, hardware hacking
- Projects: FrogMaps (OSINT mapping), FrogVPN (censorship-resistant VPN), FrogTalk (E2E encrypted chat)
- Also offers pet sitting and house sitting services in New Zealand
- Contact: Available through the website contact form

Context from knowledge base:
${context}

Guidelines:
- Use the context when relevant, but don't be overly restrictive
- If asked about availability, say Luke is generally available for new projects and to reach out via the contact form
- Be conversational and helpful - don't refuse to answer reasonable questions
- If you genuinely don't know something specific, suggest they contact Luke directly
- Keep responses concise but informative`
    };

    const messages = [
        systemMessage,
        ...conversationHistory,
        { role: 'user', content: prompt }
    ];

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            temperature: 0.8,
            max_completion_tokens: 1000,
            presence_penalty: 0.5,
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
