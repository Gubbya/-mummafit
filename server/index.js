const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const { MongoClient } = require('mongodb');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'mummafit';

let client;
let db;
let connectionPromise;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

async function connectDb() {
  if (db) return db;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing. Create server/.env from server/.env.example.');
  }

  if (!connectionPromise) {
    client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });
    connectionPromise = client.connect().catch((error) => {
      connectionPromise = undefined;
      client = undefined;
      throw error;
    });
  }

  await connectionPromise;
  db = client.db(dbName);
  await db.collection('dailyLogs').createIndex({ userId: 1, date: 1 }, { unique: true });
  return db;
}

app.get('/health', async (_req, res) => {
  try {
    await connectDb();
    res.json({ ok: true, db: dbName });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/logs/:userId', async (req, res) => {
  try {
    const database = await connectDb();
    const logs = await database
      .collection('dailyLogs')
      .find({ userId: req.params.userId })
      .sort({ date: -1 })
      .limit(90)
      .toArray();
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/logs/:userId/:date', async (req, res) => {
  try {
    const database = await connectDb();
    const now = new Date();
    const log = {
      ...req.body,
      userId: req.params.userId,
      date: req.params.date,
      updatedAt: now
    };

    await database.collection('dailyLogs').updateOne(
      { userId: req.params.userId, date: req.params.date },
      { $set: log, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );

    res.json({ ok: true, log });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/logs/:userId/:date', async (req, res) => {
  try {
    const database = await connectDb();
    await database.collection('dailyLogs').deleteOne({
      userId: req.params.userId,
      date: req.params.date
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/backup/:userId', async (req, res) => {
  try {
    const database = await connectDb();
    const backup = await database.collection('backups').findOne({ userId: req.params.userId });
    if (!backup) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }
    res.json(backup.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/backup/:userId', async (req, res) => {
  try {
    const database = await connectDb();
    const now = new Date();
    await database.collection('backups').updateOne(
      { userId: req.params.userId },
      {
        $set: {
          userId: req.params.userId,
          data: req.body,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );
    res.json({ ok: true, updatedAt: now });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`mummafit API running on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  await client?.close();
  process.exit(0);
});
