// Safe MongoDB Atlas Service for SafeSignal AI
// Works in both Node environment (using native MongoDB driver) and Browser/Expo environments (using memory/session fallback).

import { ThreatIncident } from '@/services/tamilNaduNewsService';

const MONGO_URI = process.env.MONGO_URI || process.env.EXPO_PUBLIC_MONGO_URI || 'mongodb+srv://sukesh_2006:VUWF93PcsUWwDRtH@cluster0.lg2htpb.mongodb.net/SafeSignalAI?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'SafeSignalAI';
const COLLECTION_NAME = 'incidents';

// In-memory fallback for browser/Expo bundle
const clientMemoryIncidents: ThreatIncident[] = [];

// Dynamic Node MongoDB Driver Loader (Prevents Metro client bundler crash)
function getNativeMongoClient() {
  if (typeof window !== 'undefined') return null; // Browser / Metro client environment
  try {
    const dns = require('dns');
    try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
    const { MongoClient } = require('mongodb');
    return MongoClient;
  } catch (err) {
    return null;
  }
}

let nativeClientInstance: any = null;

async function getMongoCollection(): Promise<any | null> {
  const MongoClientClass = getNativeMongoClient();
  if (!MongoClientClass) return null;

  try {
    if (!nativeClientInstance) {
      nativeClientInstance = new MongoClientClass(MONGO_URI, {
        family: 4,
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000,
      });
      await nativeClientInstance.connect();
      console.log('Successfully connected to MongoDB Atlas (SafeSignalAI)');
    }
    const db = nativeClientInstance.db(DB_NAME);
    return db.collection(COLLECTION_NAME);
  } catch (err) {
    console.warn('MongoDB Atlas connection warning:', err);
    return null;
  }
}

// Save or Update Incidents in MongoDB Atlas
export async function saveIncidentsToMongoDB(incidents: ThreatIncident[]): Promise<number> {
  if (!incidents || incidents.length === 0) return 0;
  
  // Save to in-memory fallback for client
  for (const inc of incidents) {
    if (!clientMemoryIncidents.some(c => c.id === inc.id)) {
      clientMemoryIncidents.unshift(inc);
    }
  }

  const col = await getMongoCollection();
  if (!col) return incidents.length;

  let savedCount = 0;
  try {
    for (const incident of incidents) {
      const filter = { id: incident.id };
      const update = { $set: { ...incident, updatedAt: new Date() } };
      await col.updateOne(filter, update, { upsert: true });
      savedCount++;
    }
    console.log(`Saved/Updated ${savedCount} incidents in MongoDB Atlas.`);
  } catch (err) {
    console.warn('Error saving to MongoDB Atlas:', err);
  }
  return savedCount;
}

// Retrieve Incidents from MongoDB Atlas
export async function getIncidentsFromMongoDB(): Promise<ThreatIncident[]> {
  const col = await getMongoCollection();
  if (!col) return clientMemoryIncidents;

  try {
    const docs = await col.find({}).sort({ updatedAt: -1 }).limit(50).toArray();
    return docs.map((d: any) => ({
      id: d.id,
      title: d.title,
      subtitle: d.subtitle,
      category: d.category,
      district: d.district,
      lat: d.lat,
      lng: d.lng,
      time: d.time,
      tone: d.tone,
      sourceUrl: d.sourceUrl,
      sourceName: d.sourceName,
    }));
  } catch (err) {
    console.warn('Error fetching from MongoDB Atlas:', err);
    return clientMemoryIncidents;
  }
}
