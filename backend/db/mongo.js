// db/mongo.js
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ ERROR: MONGODB_URI is missing.");
  console.error("Local dev: set it in /backend/.env");
  console.error("Production: set it in Vercel > Settings > Environment Variables");
  throw new Error("MONGODB_URI is not set");
}

const DB_NAME = process.env.MONGODB_DB || "database1";

// Serverless note: each warm Vercel container reuses this module, but a burst of
// cold starts creates many containers. Caching the *promise* (not the resolved
// client) on globalThis means concurrent invocations in one container share a
// single connection attempt instead of each opening their own pool, which is what
// exhausts the Atlas connection limit. maxPoolSize is kept small for the same reason.
const globalCache = globalThis.__guardiansMongo || (globalThis.__guardiansMongo = {});

function getClientPromise() {
  if (!globalCache.clientPromise) {
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    globalCache.clientPromise = client.connect().catch((err) => {
      // Clear the cache so the next request retries instead of reusing a
      // permanently rejected promise.
      globalCache.clientPromise = null;
      throw err;
    });
  }

  return globalCache.clientPromise;
}

async function connectToMongo() {
  try {
    const client = await getClientPromise();
    return client.db(DB_NAME);
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    throw err;
  }
}

async function getDb() {
  return connectToMongo();
}

module.exports = {
  connectToMongo,
  getDb,
};
