// Session and persistent cache utility for SafeSignal AI Map Routing & Geocoding

export interface CachedRoute {
  coordinates: [number, number][];
  distanceKm: string;
  durationMin: number;
  timestamp: number;
}

export interface CachedGeocode {
  lat: number;
  lng: number;
  name: string;
  timestamp: number;
}

const ROUTE_CACHE_PREFIX = 'safesignal_route_v1_';
const GEOCODE_CACHE_PREFIX = 'safesignal_geo_v1_';

// In-memory fallback caches for current session
const memoryRouteCache = new Map<string, CachedRoute>();
const memoryGeocodeCache = new Map<string, CachedGeocode>();

export const MapCache = {
  getRouteKey(originLat: number, originLng: number, destLat: number, destLng: number, routeType: string): string {
    return `${ROUTE_CACHE_PREFIX}${originLat.toFixed(4)}_${originLng.toFixed(4)}_${destLat.toFixed(4)}_${destLng.toFixed(4)}_${routeType}`;
  },

  getCachedRoute(key: string): CachedRoute | null {
    // 1. Check memory cache
    if (memoryRouteCache.has(key)) {
      return memoryRouteCache.get(key)!;
    }

    // 2. Check sessionStorage/localStorage
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = sessionStorage.getItem(key) || localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored) as CachedRoute;
          memoryRouteCache.set(key, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('MapCache sessionStorage read error:', e);
    }
    return null;
  },

  setCachedRoute(key: string, data: Omit<CachedRoute, 'timestamp'>): void {
    const record: CachedRoute = {
      ...data,
      timestamp: Date.now(),
    };
    memoryRouteCache.set(key, record);

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stringified = JSON.stringify(record);
        sessionStorage.setItem(key, stringified);
        localStorage.setItem(key, stringified);
      }
    } catch (e) {
      console.warn('MapCache sessionStorage write error:', e);
    }
  },

  getCachedGeocode(query: string): CachedGeocode | null {
    const key = `${GEOCODE_CACHE_PREFIX}${query.trim().toLowerCase()}`;
    if (memoryGeocodeCache.has(key)) {
      return memoryGeocodeCache.get(key)!;
    }

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = sessionStorage.getItem(key) || localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored) as CachedGeocode;
          memoryGeocodeCache.set(key, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('MapCache geocode read error:', e);
    }
    return null;
  },

  setCachedGeocode(query: string, data: Omit<CachedGeocode, 'timestamp'>): void {
    const key = `${GEOCODE_CACHE_PREFIX}${query.trim().toLowerCase()}`;
    const record: CachedGeocode = {
      ...data,
      timestamp: Date.now(),
    };
    memoryGeocodeCache.set(key, record);

    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stringified = JSON.stringify(record);
        sessionStorage.setItem(key, stringified);
        localStorage.setItem(key, stringified);
      }
    } catch (e) {
      console.warn('MapCache geocode write error:', e);
    }
  },
};
