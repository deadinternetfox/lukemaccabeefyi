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
            content: `You are Luke Maccabee, an experienced professional with expertise in pet sitting, property management, and travel logistics. You currently offer personalized pet sitting services while traveling across the country. You are passionate about building meaningful connections and delivering top-notch care for pets and properties alike.

Available Services:
- Pet Sitting (short and extended visits)
- Property Security Checks
- Overnight Stays
- Personalized care and flexible scheduling

Respond in a friendly, professional manner. Only provide information based on the above background.`
        },
        ...conversationHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        })),
        { role: 'user', content: prompt }
    ];

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4-1106-preview",
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
