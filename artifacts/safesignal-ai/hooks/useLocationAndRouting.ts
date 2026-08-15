import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { GRAPHHOPPER_API_KEY, DEFAULT_ORIGIN } from '@/constants/config';
import { MapCache } from '@/utils/mapCache';

export type LocationCoords = { lat: number; lng: number; name?: string };

// Instant Pre-indexed City & Landmark Dictionary for Tamil Nadu & India
const FAMOUS_INDIAN_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  'chennai': { lat: 13.0827, lng: 80.2707, name: 'Chennai, Tamil Nadu' },
  'anna salai': { lat: 13.0604, lng: 80.2496, name: 'Anna Salai, Chennai' },
  't nagar': { lat: 13.0418, lng: 80.2341, name: 'T. Nagar, Chennai' },
  't. nagar': { lat: 13.0418, lng: 80.2341, name: 'T. Nagar, Chennai' },
  'anna nagar': { lat: 13.0850, lng: 80.2101, name: 'Anna Nagar, Chennai' },
  'guindy': { lat: 13.0067, lng: 80.2020, name: 'Guindy, Chennai' },
  'velachery': { lat: 12.9815, lng: 80.2180, name: 'Velachery, Chennai' },
  'marina beach': { lat: 13.0500, lng: 80.2824, name: 'Marina Beach, Chennai' },
  'coimbatore': { lat: 11.0168, lng: 76.9558, name: 'Coimbatore, Tamil Nadu' },
  'gandhipuram': { lat: 11.0183, lng: 76.9644, name: 'Gandhipuram, Coimbatore' },
  'peelamedu': { lat: 11.0270, lng: 77.0016, name: 'Peelamedu, Coimbatore' },
  'madurai': { lat: 9.9252, lng: 78.1198, name: 'Madurai, Tamil Nadu' },
  'goripalayam': { lat: 9.9320, lng: 78.1250, name: 'Goripalayam, Madurai' },
  'mattuthavani': { lat: 9.9480, lng: 78.1560, name: 'Mattuthavani, Madurai' },
  'meenakshi temple': { lat: 9.9195, lng: 78.1193, name: 'Meenakshi Temple, Madurai' },
  'trichy': { lat: 10.7905, lng: 78.7047, name: 'Tiruchirappalli, Tamil Nadu' },
  'tiruchirappalli': { lat: 10.7905, lng: 78.7047, name: 'Tiruchirappalli, Tamil Nadu' },
  'salem': { lat: 11.6643, lng: 78.1460, name: 'Salem, Tamil Nadu' },
  'omalur': { lat: 11.7420, lng: 78.0430, name: 'Omalur, Salem' },
  'tirunelveli': { lat: 8.7139, lng: 77.7567, name: 'Tirunelveli, Tamil Nadu' },
  'palayamkottai': { lat: 8.7170, lng: 77.7420, name: 'Palayamkottai, Tirunelveli' },
  'vellore': { lat: 12.9165, lng: 79.1325, name: 'Vellore, Tamil Nadu' },
  'katpadi': { lat: 12.9730, lng: 79.1380, name: 'Katpadi, Vellore' },
  'erode': { lat: 11.3410, lng: 77.7172, name: 'Erode, Tamil Nadu' },
  'thanjavur': { lat: 10.7870, lng: 79.1378, name: 'Thanjavur, Tamil Nadu' },
  'tanjore': { lat: 10.7870, lng: 79.1378, name: 'Thanjavur, Tamil Nadu' },
  'dindigul': { lat: 10.3673, lng: 77.9803, name: 'Dindigul, Tamil Nadu' },
  'kanchipuram': { lat: 12.8342, lng: 79.7036, name: 'Kanchipuram, Tamil Nadu' },
  'cuddalore': { lat: 11.7480, lng: 79.7714, name: 'Cuddalore, Tamil Nadu' },
  'thoothukudi': { lat: 8.7642, lng: 78.1348, name: 'Thoothukudi, Tamil Nadu' },
  'ooty': { lat: 11.4102, lng: 76.6950, name: 'Ooty, Tamil Nadu' },
  'kodaikanal': { lat: 10.2381, lng: 77.4892, name: 'Kodaikanal, Tamil Nadu' },
  'pondicherry': { lat: 11.9416, lng: 79.8083, name: 'Puducherry' },
  'puducherry': { lat: 11.9416, lng: 79.8083, name: 'Puducherry' },
  'bengaluru': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru, Karnataka' },
  'bangalore': { lat: 12.9716, lng: 77.5946, name: 'Bengaluru, Karnataka' },
  'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad, Telangana' },
  'mumbai': { lat: 19.0760, lng: 72.8777, name: 'Mumbai, Maharashtra' },
  'delhi': { lat: 28.6139, lng: 77.2090, name: 'New Delhi' },
};

async function geocodeLocationMultiEngine(query: string, referenceCoords: LocationCoords): Promise<LocationCoords | null> {
  const cleanQuery = query.trim().toLowerCase();
  
  // 1. Instant Pre-indexed Dictionary Match
  if (FAMOUS_INDIAN_LOCATIONS[cleanQuery]) {
    return FAMOUS_INDIAN_LOCATIONS[cleanQuery];
  }

  for (const key in FAMOUS_INDIAN_LOCATIONS) {
    if (cleanQuery.includes(key) || key.includes(cleanQuery)) {
      return FAMOUS_INDIAN_LOCATIONS[key];
    }
  }

  // 2. Nominatim OpenStreetMap Geocoder (High Accuracy for India & TN)
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`;
    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'SafeSignalAI/1.0',
      },
    });
    if (res.ok) {
      const results = await res.json();
      if (results && results.length > 0) {
        const top = results[0];
        return {
          lat: parseFloat(top.lat),
          lng: parseFloat(top.lon),
          name: top.display_name.split(',')[0] || query,
        };
      }
    }
  } catch (err) {
    console.warn('Nominatim geocoding fallback warning:', err);
  }

  // 3. GraphHopper Geocoding API
  try {
    const ghUrl = `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&point=${referenceCoords.lat},${referenceCoords.lng}&locale=en&key=${GRAPHHOPPER_API_KEY}`;
    const res = await fetch(ghUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.hits && data.hits.length > 0) {
        const hit = data.hits[0];
        return {
          lat: hit.point.lat,
          lng: hit.point.lng,
          name: hit.name || query,
        };
      }
    }
  } catch (err) {
    console.warn('GraphHopper geocoding warning:', err);
  }

  return null;
}

export function useLocationAndRouting(
  initialSource: string = 'Current location (GPS)',
  initialDestination: string = 'Guindy, Chennai'
) {
  const [sourceText, setSourceText] = useState<string>(initialSource);
  const [destinationText, setDestinationText] = useState<string>(initialDestination);

  const [originCoords, setOriginCoords] = useState<LocationCoords>({
    lat: 12.9810,
    lng: 80.0520,
    name: 'Current location (Kundrathur)',
  });

  const [destinationCoords, setDestinationCoords] = useState<LocationCoords | null>({
    lat: 13.0067,
    lng: 80.2020,
    name: 'Guindy, Chennai',
  });

  const [isGeocodingSource, setIsGeocodingSource] = useState<boolean>(false);
  const [isGeocodingDest, setIsGeocodingDest] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'ready' | 'denied'>('idle');

  // 1. Request GPS Foreground Location for Source
  const useCurrentGpsAsSource = useCallback(async () => {
    setGpsStatus('locating');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          name: 'Current location (GPS)',
        };
        setOriginCoords(coords);
        setSourceText('Current location (GPS)');
        setGpsStatus('ready');
      } else {
        setGpsStatus('denied');
      }
    } catch (err) {
      console.warn('GPS location access error:', err);
      setGpsStatus('denied');
    }
  }, []);

  useEffect(() => {
    useCurrentGpsAsSource();
  }, [useCurrentGpsAsSource]);

  // 2. Geocode Source text input using Multi-Engine
  const geocodeSource = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2 || query.includes('Current location')) return;
    
    const cached = MapCache.getCachedGeocode(query);
    if (cached) {
      setOriginCoords({ lat: cached.lat, lng: cached.lng, name: cached.name });
      return;
    }

    setIsGeocodingSource(true);
    try {
      const result = await geocodeLocationMultiEngine(query, originCoords);
      if (result) {
        MapCache.setCachedGeocode(query, { lat: result.lat, lng: result.lng, name: result.name || query });
        setOriginCoords(result);
      }
    } catch (err) {
      console.warn('Source Geocoding error:', err);
    } finally {
      setIsGeocodingSource(false);
    }
  }, [originCoords]);

  // 3. Geocode Destination text input using Multi-Engine
  const geocodeDestination = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setDestinationCoords(null);
      return;
    }

    const cached = MapCache.getCachedGeocode(query);
    if (cached) {
      setDestinationCoords({ lat: cached.lat, lng: cached.lng, name: cached.name });
      return;
    }

    setIsGeocodingDest(true);
    try {
      const result = await geocodeLocationMultiEngine(query, originCoords);
      if (result) {
        MapCache.setCachedGeocode(query, { lat: result.lat, lng: result.lng, name: result.name || query });
        setDestinationCoords(result);
      }
    } catch (err) {
      console.warn('Destination Geocoding error:', err);
    } finally {
      setIsGeocodingDest(false);
    }
  }, [originCoords]);

  // Debounce source geocoding
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceText && sourceText.trim() && !sourceText.includes('Current location')) {
        geocodeSource(sourceText);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [sourceText, geocodeSource]);

  // Debounce destination geocoding
  useEffect(() => {
    if (!destinationText || !destinationText.trim()) {
      setDestinationCoords(null);
      return;
    }
    const timer = setTimeout(() => {
      geocodeDestination(destinationText);
    }, 400);
    return () => clearTimeout(timer);
  }, [destinationText, geocodeDestination]);

  // Swap Source & Destination
  const swapLocations = useCallback(() => {
    setSourceText(destinationText);
    setDestinationText(sourceText);

    const tempCoords = originCoords;
    setOriginCoords(destinationCoords || DEFAULT_ORIGIN);
    setDestinationCoords(tempCoords);
  }, [sourceText, destinationText, originCoords, destinationCoords]);

  return {
    sourceText,
    setSourceText,
    destinationText,
    setDestinationText,
    originCoords,
    destinationCoords,
    isGeocodingSource,
    isGeocodingDest,
    gpsStatus,
    useCurrentGpsAsSource,
    swapLocations,
    geocodeSource,
    geocodeDestination,
  };
}
