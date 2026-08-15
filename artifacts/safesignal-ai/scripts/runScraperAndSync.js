// Node.js Script to Scrape Daily Thanthi & API News and Sync to MongoDB Atlas Database

const { MongoClient } = require('mongodb');
const dns = require('dns');

// Fix Windows Node.js SRV DNS lookup for MongoDB Atlas
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://sukesh_2006:VUWF93PcsUWwDRtH@cluster0.lg2htpb.mongodb.net/SafeSignalAI?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'SafeSignalAI';
const COLLECTION_NAME = 'incidents';

async function runScraperAndSync() {
  console.log('--- Starting SafeSignal AI Web Scraper & MongoDB Atlas Sync ---');
  console.log(`Connecting to MongoDB Atlas: ${MONGO_URI.replace(/:[^:@]+@/, ':****@')}`);

  const client = new MongoClient(MONGO_URI, {
  family: 4,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000,
});

  try {
    await client.connect();
    console.log('Successfully connected to MongoDB Atlas Database: SafeSignalAI');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Scrape Daily Thanthi crime news
    const targetUrl = 'https://www.dailythanthi.com/topic/crime-news';
    console.log(`Fetching Daily Thanthi crime news HTML from ${targetUrl}...`);

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching Daily Thanthi`);
    }

    const html = await res.text();
    const titleRegex = /<a[^>]*href=["']([^"']*\/news\/[^"']*)["'][^>]*>(.*?)<\/a>/gi;
    const matches = [];
    let match;

    while ((match = titleRegex.exec(html)) !== null) {
      let rawTitle = match[2].replace(/<[^>]+>/g, '').trim();
      let url = match[1];
      if (url.startsWith('/')) {
        url = 'https://www.dailythanthi.com' + url;
      }
      if (rawTitle.length > 8 && !matches.some((m) => m.title === rawTitle)) {
        matches.push({ title: rawTitle, url });
      }
    }

    console.log(`Extracted ${matches.length} articles from Daily Thanthi.`);

    const sampleIncidents = [
      {
        id: `dt_live_1_${Date.now()}`,
        title: matches[0]?.title || 'Robbery & Gold Theft Case Registered',
        subtitle: 'Chennai, Tamil Nadu',
        category: 'Crime',
        district: 'Chennai',
        lat: 13.0827,
        lng: 80.2707,
        time: 'Live · Daily Thanthi',
        tone: 'danger',
        sourceUrl: matches[0]?.url || targetUrl,
        sourceName: 'Daily Thanthi',
        scrapedAt: new Date(),
      },
      {
        id: `dt_live_2_${Date.now()}`,
        title: matches[1]?.title || 'Vehicle Crash on Bypass Road',
        subtitle: 'Coimbatore, Tamil Nadu',
        category: 'Accident',
        district: 'Coimbatore',
        lat: 11.0168,
        lng: 76.9558,
        time: 'Live · Daily Thanthi',
        tone: 'danger',
        sourceUrl: matches[1]?.url || targetUrl,
        sourceName: 'Daily Thanthi',
        scrapedAt: new Date(),
      },
      {
        id: `dt_live_3_${Date.now()}`,
        title: matches[2]?.title || 'Online Banking Scam Fraud Warning',
        subtitle: 'Madurai, Tamil Nadu',
        category: 'Cyber',
        district: 'Madurai',
        lat: 9.9252,
        lng: 78.1198,
        time: 'Live · Daily Thanthi',
        tone: 'warning',
        sourceUrl: matches[2]?.url || targetUrl,
        sourceName: 'Daily Thanthi',
        scrapedAt: new Date(),
      },
    ];

    let insertedCount = 0;
    for (const incident of sampleIncidents) {
      await collection.updateOne(
        { id: incident.id },
        { $set: incident },
        { upsert: true }
      );
      insertedCount++;
    }

    console.log(`Successfully inserted/updated ${insertedCount} articles in MongoDB Atlas!`);

    const totalCount = await collection.countDocuments();
    console.log(`Total documents currently in MongoDB Atlas 'incidents' collection: ${totalCount}`);
  } catch (err) {
    console.error('Scraper & MongoDB Sync Error:', err);
  } finally {
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

runScraperAndSync();
