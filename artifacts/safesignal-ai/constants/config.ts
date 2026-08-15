export const GRAPHHOPPER_API_KEY = process.env.EXPO_PUBLIC_GRAPHHOPPER_API_KEY || process.env.GRAPHHOPPER_API_KEY || '';

export const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

export const GNEWS_API_KEY = process.env.EXPO_PUBLIC_GNEWS_API_KEY || process.env.GNEWS_API_KEY || '';

export const NEWSDATA_API_KEY = process.env.EXPO_PUBLIC_NEWSDATA_API_KEY || process.env.NEWSDATA_API_KEY || '';

export const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || '';

export const VIRUSTOTAL_KEY = process.env.VIRUSTOTAL_KEY || process.env.EXPO_PUBLIC_VIRUSTOTAL_KEY || '';

export const SAFE_BROWSING_KEY = process.env.SAFE_BROWSING_KEY || process.env.EXPO_PUBLIC_SAFE_BROWSING_KEY || '';

// Default Location: Tamil Nadu Central (Chennai / Coimbatore corridor)
export const DEFAULT_ORIGIN = {
  name: 'Current Location (Anna Salai, Chennai, Tamil Nadu)',
  lat: 13.0827,
  lng: 80.2707,
};

export const DEFAULT_DESTINATION = {
  name: 'Gandhipuram, Coimbatore, Tamil Nadu',
  lat: 11.0168,
  lng: 76.9558,
};
