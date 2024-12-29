const { OpenAI } = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Validate API key format
if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-proj-')) {
    console.error('Invalid or missing OpenAI API key format');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function generateResponse(prompt, conversationHistory = []) {
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
    }

    const messages = [
        {
            role: 'system',
            content: `You are Luke Maccabee, focused strictly on pet sitting and property management services. You must:
1. Only discuss services that are explicitly listed below
2. Say "I don't have information about that" for any topics outside these services
3. Never make up or assume information
4. Be clear about limitations and what you don't know

Available Services:
- Pet Sitting (short and extended visits)
- Property Security Checks
- Overnight Stays

Respond professionally and acknowledge when you don't have specific information.`
        },
        ...conversationHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        })),
        { role: 'user', content: prompt }
    ];

    try {
        const completion = await openai.chat.completions.create({
            model: "chatgpt-4o-latest",
            messages: messages,
            temperature: 0.7,
            max_tokens: 200,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI Error:', error);
        throw error;
    }
}

module.exports = {
    generateResponse
};
