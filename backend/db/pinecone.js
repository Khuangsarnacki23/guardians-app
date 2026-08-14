// db/pinecone.js
const { Pinecone } = require("@pinecone-database/pinecone");

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

// Host is an optional optimization -- passing it skips a describeIndex lookup.
// It is deliberately NOT hardcoded: a stale host silently points the client at a
// dead or wrong index even when the name is correct. Left unset, the SDK
// resolves the correct host from the index name.
const PINECONE_INDEX_HOST = process.env.PINECONE_INDEX_HOST || undefined;

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
  return PINECONE_INDEX_HOST
    ? getClient().index(PINECONE_INDEX_NAME, PINECONE_INDEX_HOST)
    : getClient().index(PINECONE_INDEX_NAME);
}

module.exports = { getPineconeIndex };
