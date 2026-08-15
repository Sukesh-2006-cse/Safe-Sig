// Safe MongoDB Atlas Service for SafeSignal AI
// Works in both Node environment (using native MongoDB driver) and Browser/Expo environments (using memory/session fallback).

import { ThreatIncident } from '@/services/tamilNaduNewsService';

export interface UserProfile {
  id: string;
  name: string;
  mobileNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodGroup: string;
  passcode?: string;
  createdAt: string;
  updatedAt: string;
}

const MONGO_URI = process.env.MONGO_URI || process.env.EXPO_PUBLIC_MONGO_URI || 'mongodb+srv://sukesh_2006:VUWF93PcsUWwDRtH@cluster0.lg2htpb.mongodb.net/SafeSignalAI?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'SafeSignalAI';
const COLLECTION_INCIDENTS = 'incidents';
const COLLECTION_USERS = 'users';

// In-memory fallback for browser/Expo bundle
const clientMemoryIncidents: ThreatIncident[] = [];
const clientMemoryUsers: Map<string, UserProfile> = new Map();

// Dynamic Node MongoDB Driver Loader (Prevents Metro client bundler crash on React Native Android/iOS)
function getNativeMongoClient() {
  // Completely skip in Browser / React Native (Expo Android & iOS) environment
  if (typeof window !== 'undefined' || typeof process === 'undefined' || !process.versions?.node) {
    return null;
  }
  try {
    const req = eval('require');
    const dns = req('dns');
    try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
    const { MongoClient } = req('mongodb');
    return MongoClient;
  } catch (err) {
    return null;
  }
}

let nativeClientInstance: any = null;

async function getMongoDb(): Promise<any | null> {
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
    return nativeClientInstance.db(DB_NAME);
  } catch (err) {
    console.warn('MongoDB Atlas connection warning:', err);
    return null;
  }
}

async function getMongoCollection(collectionName: string = COLLECTION_INCIDENTS): Promise<any | null> {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection(collectionName);
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

  const col = await getMongoCollection(COLLECTION_INCIDENTS);
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
  const col = await getMongoCollection(COLLECTION_INCIDENTS);
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

// Save or Update User Profile in MongoDB Atlas
export async function saveUserProfileToMongoDB(profile: UserProfile): Promise<boolean> {
  if (!profile || !profile.mobileNumber) return false;

  // Save to in-memory fallback
  clientMemoryUsers.set(profile.mobileNumber, profile);

  const col = await getMongoCollection(COLLECTION_USERS);
  if (!col) return true;

  try {
    const filter = { mobileNumber: profile.mobileNumber };
    const update = { $set: { ...profile, updatedAt: new Date().toISOString() } };
    await col.updateOne(filter, update, { upsert: true });
    console.log(`User profile for ${profile.name} (${profile.mobileNumber}) saved to MongoDB Atlas.`);
    return true;
  } catch (err) {
    console.warn('Error saving user profile to MongoDB Atlas:', err);
    return false;
  }
}

// Retrieve User Profile by Mobile Number from MongoDB Atlas
export async function getUserProfileFromMongoDB(mobileNumber: string): Promise<UserProfile | null> {
  if (!mobileNumber) return null;

  const col = await getMongoCollection(COLLECTION_USERS);
  if (!col) {
    return clientMemoryUsers.get(mobileNumber) || null;
  }

  try {
    const doc = await col.findOne({ mobileNumber });
    if (!doc) return clientMemoryUsers.get(mobileNumber) || null;
    return {
      id: doc.id || doc._id?.toString() || `usr_${mobileNumber}`,
      name: doc.name || '',
      mobileNumber: doc.mobileNumber,
      emergencyContactName: doc.emergencyContactName || '',
      emergencyContactPhone: doc.emergencyContactPhone || '',
      bloodGroup: doc.bloodGroup || 'O+',
      passcode: doc.passcode || '',
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: doc.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('Error fetching user profile from MongoDB Atlas:', err);
    return clientMemoryUsers.get(mobileNumber) || null;
  }
}
