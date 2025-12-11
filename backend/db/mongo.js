// db/mongo.js
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = "mongodb+srv://khuangsarnacki_db_user:MxFGjFVQXHtYHjsS@cluster0.evaduzv.mongodb.net/?appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const DB_NAME = "database1";
let db;

async function connectToMongo() {
  if (db) return db;
  console.log(client);
  await client.connect();
  db = client.db(DB_NAME);
  console.log("🔥 Connected to MongoDB Atlas:", DB_NAME);
  return db;
}

async function getDb() {
  // simple helper so routes can call getDb()
  if (!db) {
    await connectToMongo();
  }
  return db;
}

module.exports = {
  connectToMongo,
  getDb
};
