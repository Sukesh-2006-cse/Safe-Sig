// Safe User Authentication & Local Storage Service for SafeSignal AI
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, saveUserProfileToMongoDB, getUserProfileFromMongoDB } from './mongoService';

const AUTH_USER_KEY = '@safesignal_user_profile_v1';

// Get locally saved user session
export async function getStoredUserSession(): Promise<UserProfile | null> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const rawWeb = window.localStorage.getItem(AUTH_USER_KEY);
      if (rawWeb) return JSON.parse(rawWeb);
    }
    const rawAsync = await AsyncStorage.getItem(AUTH_USER_KEY);
    if (rawAsync) return JSON.parse(rawAsync);
  } catch (err) {
    console.warn('Error reading stored user session:', err);
  }
  return null;
}

// Persist user session locally
export async function saveStoredUserSession(profile: UserProfile): Promise<void> {
  try {
    const jsonStr = JSON.stringify(profile);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AUTH_USER_KEY, jsonStr);
    }
    await AsyncStorage.setItem(AUTH_USER_KEY, jsonStr);
  } catch (err) {
    console.warn('Error saving stored user session:', err);
  }
}

// Clear user session (Logout)
export async function clearUserSession(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(AUTH_USER_KEY);
    }
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  } catch (err) {
    console.warn('Error clearing user session:', err);
  }
}

// Register or Update User Account
export async function registerOrUpdateUser(data: {
  name: string;
  mobileNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodGroup: string;
  passcode?: string;
}): Promise<{ success: boolean; profile?: UserProfile; message?: string }> {
  if (!data.name || data.name.trim().length < 2) {
    return { success: false, message: 'Please enter a valid full name (at least 2 characters).' };
  }

  const cleanMobile = data.mobileNumber.replace(/\D/g, '');
  if (cleanMobile.length < 10) {
    return { success: false, message: 'Please enter a valid 10-digit mobile number.' };
  }

  const cleanEmergencyPhone = data.emergencyContactPhone.replace(/\D/g, '');
  if (cleanEmergencyPhone.length < 10) {
    return { success: false, message: 'Please enter a valid 10-digit emergency contact phone number.' };
  }

  const now = new Date().toISOString();
  const existing = await getStoredUserSession();

  const profile: UserProfile = {
    id: existing?.id || `usr_${cleanMobile}_${Date.now()}`,
    name: data.name.trim(),
    mobileNumber: cleanMobile,
    emergencyContactName: data.emergencyContactName.trim() || 'Emergency Contact',
    emergencyContactPhone: cleanEmergencyPhone,
    bloodGroup: data.bloodGroup || 'O+',
    passcode: data.passcode || existing?.passcode || '1234',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  // 1. Save locally for instant UX responsiveness
  await saveStoredUserSession(profile);

  // 2. Sync to MongoDB Atlas
  saveUserProfileToMongoDB(profile).catch((err) => {
    console.warn('Background MongoDB profile sync warning:', err);
  });

  return { success: true, profile };
}

// Sign In via Mobile Number & Passcode
export async function loginWithMobileAndPin(
  mobileNumber: string,
  passcode: string
): Promise<{ success: boolean; profile?: UserProfile; message?: string }> {
  const cleanMobile = mobileNumber.replace(/\D/g, '');
  if (cleanMobile.length < 10) {
    return { success: false, message: 'Please enter your 10-digit mobile number.' };
  }

  if (!passcode || passcode.trim().length < 4) {
    return { success: false, message: 'Please enter your 4-digit security PIN.' };
  }

  // 1. Check MongoDB Atlas
  const mongoUser = await getUserProfileFromMongoDB(cleanMobile);
  if (mongoUser) {
    if (mongoUser.passcode && mongoUser.passcode !== passcode.trim()) {
      return { success: false, message: 'Incorrect 4-digit PIN. Please try again.' };
    }
    await saveStoredUserSession(mongoUser);
    return { success: true, profile: mongoUser };
  }

  // 2. Fallback check local session
  const localUser = await getStoredUserSession();
  if (localUser && localUser.mobileNumber === cleanMobile) {
    if (localUser.passcode && localUser.passcode !== passcode.trim()) {
      return { success: false, message: 'Incorrect 4-digit PIN. Please try again.' };
    }
    return { success: true, profile: localUser };
  }

  return { success: false, message: 'No account found with this mobile number. Please register first.' };
}
