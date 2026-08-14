// db/pinecone.js
const { Pinecone } = require("@pinecone-database/pinecone");

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;
const PINECONE_INDEX_HOST =
  process.env.PINECONE_INDEX_HOST ||
  "https://guardians-app-ynjee91.svc.aped-4627-b74a.pinecone.io";

// Lazy singleton: constructing Pinecone at module load throws when the API key
// is absent, which would take down every route in the app (including /api/health)
// rather than just the assistant features that actually need it.
let pc = null;

function getClient() {
  if (!pc) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error("PINECONE_API_KEY is not set");
    }
    pc = new Pinecone({ apiKey });
  }
  return pc;
}

function getPineconeIndex() {
  if (!PINECONE_INDEX_NAME) {
    throw new Error("PINECONE_INDEX_NAME is not set");
  }
  return getClient().index(PINECONE_INDEX_NAME, PINECONE_INDEX_HOST);
}

module.exports = { getPineconeIndex };
