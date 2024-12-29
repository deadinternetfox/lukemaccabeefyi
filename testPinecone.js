require('dotenv').config();
const { PineconeClient } = require('@pinecone-database/pinecone');
const axios = require('axios');

async function testConnection() {
    try {
        console.log('Initializing Pinecone...');
        const pinecone = new PineconeClient();
        
        console.log('Configuration:', {
            environment: process.env.PINECONE_ENVIRONMENT,
            projectId: process.env.PINECONE_PROJECT,
            indexHost: process.env.PINECONE_HOST
        });

        await pinecone.init({
            apiKey: process.env.PINECONE_API_KEY,
            environment: process.env.PINECONE_ENVIRONMENT,
            projectId: process.env.PINECONE_PROJECT
        });

        console.log('Testing direct API connection...');
        const statsResponse = await axios({
            method: 'post',
            url: `${process.env.PINECONE_HOST}/describe_index_stats`,
            headers: {
                'Api-Key': process.env.PINECONE_API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('Index stats:', JSON.stringify(statsResponse.data, null, 2));

    } catch (err) {
        console.error('Pinecone connection failed:', {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status
        });
    }
}

testConnection();