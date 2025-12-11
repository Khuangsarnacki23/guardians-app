// db/pinecone.js
const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;
const PINECONE_INDEX_HOST = "https://guardians-app-ynjee91.svc.aped-4627-b74a.pinecone.io";

function getPineconeIndex() {
  return pc.index(PINECONE_INDEX_NAME, PINECONE_INDEX_HOST);
}

module.exports = { getPineconeIndex };
