require('dotenv').config();
const { PineconeClient } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const pinecone = new PineconeClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getEmbedding(text) {
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
    });
    return response.data[0].embedding;
}

async function searchDocs(query) {
    const results = await similarity.search(query);
    return results.map(result => ({
        ...result,
        isMediaDescription: result.document.type === 'image-description',
        mediaFiles: result.document.mediaFiles || []
    }));
}

module.exports = {
    searchDocs
};