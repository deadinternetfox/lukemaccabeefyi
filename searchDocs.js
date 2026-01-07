require('dotenv').config();
const axios = require('axios');
const { getEmbedding } = require('./openai');

async function searchDocs(query, isPetSitting = false) {
    try {
        console.log('Searching docs for:', query);
        const queryEmbedding = await getEmbedding(query);
        
        const response = await axios({
            method: 'post',
            url: `${process.env.PINECONE_HOST}/query`,
            headers: {
                'Api-Key': process.env.PINECONE_API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            data: {
                vector: queryEmbedding,
                topK: 3,
                includeMetadata: true
            }
        });

        console.log('Raw Pinecone response:', JSON.stringify(response.data, null, 2));

        const matches = response.data.matches
            .filter(match => {
                const threshold = isPetSitting ? 0.35 : 0.5;
                return match.score > threshold;
            })
            .map(match => {
                console.log('Processing match with full metadata:', match);
                return {
                    content: match.metadata?.text || match.metadata?.content || '',
                    source: match.metadata?.filename || '',
                    score: match.score
                };
            })
            .filter(match => match.content && match.content.trim() !== '');

        console.log('Processed matches:', JSON.stringify(matches, null, 2));

        return {
            relevantContent: matches.map(m => m.content).join('\n\n'),
            sources: matches.map(m => `${m.source} (${Math.round(m.score * 100)}% match)`)
        };
    } catch (error) {
        console.error('Error in searchDocs:', error);
        return { relevantContent: '', sources: [] };
    }
}

module.exports = { searchDocs };