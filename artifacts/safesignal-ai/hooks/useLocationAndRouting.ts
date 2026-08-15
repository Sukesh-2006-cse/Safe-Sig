import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { GRAPHHOPPER_API_KEY, DEFAULT_ORIGIN } from '@/constants/config';
import { MapCache } from '@/utils/mapCache';

export type LocationCoords = { lat: number; lng: number; name?: string };

export function useLocationAndRouting(
  initialSource: string = 'Current location (GPS)',
  initialDestination: string = ''
) {
  const [sourceText, setSourceText] = useState<string>(initialSource);
  const [destinationText, setDestinationText] = useState<string>(initialDestination);

  const [originCoords, setOriginCoords] = useState<LocationCoords>({
    lat: DEFAULT_ORIGIN.lat,
    lng: DEFAULT_ORIGIN.lng,
    name: initialSource,
  });

  const [destinationCoords, setDestinationCoords] = useState<LocationCoords | null>(
    initialDestination ? { lat: DEFAULT_ORIGIN.lat + 0.01, lng: DEFAULT_ORIGIN.lng + 0.01, name: initialDestination } : null
  );

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

  // 2. Geocode Source text input using GraphHopper API
  const geocodeSource = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2 || query.includes('Current location')) return;
    
    const cached = MapCache.getCachedGeocode(query);
    if (cached) {
      setOriginCoords({ lat: cached.lat, lng: cached.lng, name: cached.name });
      return;
    }

    setIsGeocodingSource(true);
    try {
      const primaryUrl = `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&point=${originCoords.lat},${originCoords.lng}&locale=en&key=${GRAPHHOPPER_API_KEY}`;
      let res = await fetch(primaryUrl);
      let data = res.ok ? await res.json() : null;

      if (!data || !data.hits || data.hits.length === 0) {
        const fallbackUrl = `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query + ', Bengaluru')}&locale=en&key=${GRAPHHOPPER_API_KEY}`;
        res = await fetch(fallbackUrl);
        data = res.ok ? await res.json() : null;
      }

      if (data && data.hits && data.hits.length > 0) {
        const hit = data.hits.find((h: any) => h.countrycode === 'IN' || h.country === 'India') || data.hits[0];
        const result = {
          lat: hit.point.lat,
          lng: hit.point.lng,
          name: hit.name || query,
        };
        MapCache.setCachedGeocode(query, result);
        setOriginCoords(result);
      }
    } catch (err) {
      console.warn('Source Geocoding error:', err);
    } finally {
      setIsGeocodingSource(false);
    }
  }, [originCoords.lat, originCoords.lng]);

  // 3. Geocode Destination text input using GraphHopper API
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
      const primaryUrl = `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query)}&point=${originCoords.lat},${originCoords.lng}&locale=en&key=${GRAPHHOPPER_API_KEY}`;
      let res = await fetch(primaryUrl);
      let data = res.ok ? await res.json() : null;

      if (!data || !data.hits || data.hits.length === 0) {
        const fallbackUrl = `https://graphhopper.com/api/1/geocode?q=${encodeURIComponent(query + ', Bengaluru')}&locale=en&key=${GRAPHHOPPER_API_KEY}`;
        res = await fetch(fallbackUrl);
        data = res.ok ? await res.json() : null;
      }

      if (data && data.hits && data.hits.length > 0) {
        const hit = data.hits.find((h: any) => h.countrycode === 'IN' || h.country === 'India') || data.hits[0];
        const result = {
          lat: hit.point.lat,
          lng: hit.point.lng,
          name: hit.name || query,
        };
        MapCache.setCachedGeocode(query, result);
        setDestinationCoords(result);
      }
    } catch (err) {
      console.warn('Destination Geocoding error:', err);
    } finally {
      setIsGeocodingDest(false);
    }
  }, [originCoords.lat, originCoords.lng]);

  // Debounce source geocoding
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceText && sourceText.trim() && !sourceText.includes('Current location')) {
        geocodeSource(sourceText);
      }
    }, 500);
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
    }, 500);
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
