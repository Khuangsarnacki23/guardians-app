// db/mongo.js
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGODB_URI;  
if (!uri) {
  console.error("❌ ERROR: MONGO_URI is missing in /backend/.env");
  console.error("You MUST have: MONGO_URI=<your-atlas-url>");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const DB_NAME = "database1";
let db = null;

async function connectToMongo() {
  try {
    if (db) return db;

    console.log("⏳ Connecting to MongoDB Atlas...");
    await client.connect();

    db = client.db(DB_NAME);

    console.log(`🔥 Connected to MongoDB Atlas → DB: ${DB_NAME}`);
    return db;
  } catch (err) {
    console.error("❌ MongoDB Connection Error:");
    console.error(err);
    throw err; // important: this makes your route catch it
  }
}

async function getDb() {
  if (!db) {
    await connectToMongo();
  }
  return db;
}

module.exports = {
  connectToMongo,
  getDb,
};
