# Walkthrough - Initial Location Pinpoint & Dynamic Route Drawing

We have updated the map workflow so that it initially shows **ONLY the user's current live location pin**, and draws the turn-by-turn route path **ONLY when a destination is entered**.

## 📱 Updated Map Workflow

1. **Initial Default View**:
   - The map loads showing **ONLY a single pulsing live location marker** centered on the user's device GPS location (zoom level 15).
   - Status Tag: `Live Location Pinpoint`
   - Info Pill: `Enter destination to plan route`
   - No route line or destination pins are drawn initially.

2. **Destination Route Mode**:
   - Once the user types a destination (e.g., *"Indiranagar"*, *"Airport"*, *"Whitefield"*) or taps **`Update Route`**:
   - GraphHopper Geocoding API converts the destination address into exact coordinates.
   - GraphHopper Routing API calculates the turn-by-turn route path connecting source to destination.
   - The map transitions to display the full polyline route, Start pin, Destination pin, and travel duration (`distance & duration`).
   - Leaflet map auto-centers and zooms (`map.fitBounds`) onto the calculated route.

---

## ⚡ Verification Results
- **Typecheck**: `pnpm --filter @workspace/safesignal-ai run typecheck` passed with **0 errors**.
- **Cross-Platform**: Verified on Web browser and Expo Go Mobile.
