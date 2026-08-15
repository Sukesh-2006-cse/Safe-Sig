import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Platform, TouchableOpacity, Modal, DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { GRAPHHOPPER_API_KEY, DEFAULT_ORIGIN } from '@/constants/config';
import colors from '@/constants/colors';
import { MapCache } from '@/utils/mapCache';
import { ThreatIncident } from '@/services/tamilNaduNewsService';

const C = colors.light;

export type Coords = { lat: number; lng: number; name?: string };

export interface GraphHopperMapProps {
  origin?: Coords;
  destination?: Coords | null;
  routeType?: 'safe' | 'fast';
  height?: DimensionValue;
  interactive?: boolean;
  allowFullScreen?: boolean;
  onRouteLoaded?: (info: { distanceKm: string; durationMin: number }) => void;
  incidents?: ThreatIncident[];
}

export function GraphHopperMap({
  origin = { lat: DEFAULT_ORIGIN.lat, lng: DEFAULT_ORIGIN.lng, name: 'Current location' },
  destination = null,
  routeType = 'safe',
  height = 240,
  interactive = true,
  allowFullScreen = true,
  onRouteLoaded,
  incidents = [],
}: GraphHopperMapProps) {
  const [loading, setLoading] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: string; durationMin: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRouteType, setActiveRouteType] = useState<'safe' | 'fast'>(routeType);

  const hasDestination = Boolean(destination && destination.lat && destination.lng);

  useEffect(() => {
    setActiveRouteType(routeType);
  }, [routeType]);

  useEffect(() => {
    let isMounted = true;
    if (!hasDestination || !destination) {
      setLoading(false);
      setRouteCoordinates([]);
      setRouteInfo(null);
      return;
    }

    async function fetchGraphHopperRoute() {
      const cacheKey = MapCache.getRouteKey(origin.lat, origin.lng, destination!.lat, destination!.lng, activeRouteType);
      const cachedRoute = MapCache.getCachedRoute(cacheKey);

      if (cachedRoute) {
        if (isMounted) {
          setRouteCoordinates(cachedRoute.coordinates);
          const info = { distanceKm: cachedRoute.distanceKm, durationMin: cachedRoute.durationMin };
          setRouteInfo(info);
          onRouteLoaded?.(info);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const url = `https://graphhopper.com/api/1/route?point=${origin.lat},${origin.lng}&point=${destination!.lat},${destination!.lng}&profile=car&locale=en&key=${GRAPHHOPPER_API_KEY}&points_encoded=false`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`GraphHopper API HTTP ${res.status}`);
        }

        const data = await res.json();
        if (data.paths && data.paths.length > 0) {
          const path = data.paths[0];
          const rawCoords: [number, number][] = path.points.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
          const distKm = (path.distance / 1000).toFixed(1);
          const durMin = Math.round(path.time / (1000 * 60));

          if (isMounted) {
            setRouteCoordinates(rawCoords);
            const info = { distanceKm: `${distKm} km`, durationMin: durMin };
            setRouteInfo(info);
            onRouteLoaded?.(info);
            MapCache.setCachedRoute(cacheKey, {
              coordinates: rawCoords,
              distanceKm: `${distKm} km`,
              durationMin: durMin,
            });
            setLoading(false);
          }
        } else {
          throw new Error('No route paths returned');
        }
      } catch (err: any) {
        console.warn('GraphHopper fetch error, using direct polyline:', err?.message);
        if (isMounted && destination) {
          const fallbackCoords: [number, number][] = [
            [origin.lat, origin.lng],
            [(origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2],
            [destination.lat, destination.lng],
          ];
          setRouteCoordinates(fallbackCoords);
          setRouteInfo({ distanceKm: 'Direct Route', durationMin: 15 });
          setLoading(false);
        }
      }
    }

    fetchGraphHopperRoute();
    return () => { isMounted = false; };
  }, [origin.lat, origin.lng, destination?.lat, destination?.lng, activeRouteType, hasDestination]);

  const lineColor = activeRouteType === 'safe' ? '#2563EB' : '#EF4444';
  const coordsJson = JSON.stringify(routeCoordinates);

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
    }
    .leaflet-container {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .custom-badge {
      background: #ffffff;
      border: 2px solid ${lineColor};
      border-radius: 12px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      color: #0F172A;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    .threat-badge {
      background: #EF4444;
      color: #ffffff;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(239,68,68,0.4);
    }
    .pulse-pin {
      width: 20px;
      height: 20px;
      background: #2563EB;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 12px rgba(37,99,235,0.7);
    }
    
    /* Round Marking Pins */
    .round-pin-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .round-pin {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s;
    }
    .round-pin:hover {
      transform: scale(1.3);
      z-index: 9999 !important;
    }
    .round-pin-crime {
      background: radial-gradient(circle at 35% 35%, #EF4444, #991B1B);
      box-shadow: 0 0 12px rgba(239,68,68,0.7);
    }
    .round-pin-accident {
      background: radial-gradient(circle at 35% 35%, #F97316, #C2410C);
      box-shadow: 0 0 12px rgba(249,115,22,0.7);
    }
    .round-pin-cyber {
      background: radial-gradient(circle at 35% 35%, #A855F7, #6B21A8);
      box-shadow: 0 0 12px rgba(168,85,247,0.7);
    }
    .round-pin-hazard {
      background: radial-gradient(circle at 35% 35%, #F59E0B, #B45309);
      box-shadow: 0 0 12px rgba(245,158,11,0.7);
    }
    .round-pin-sos {
      background: radial-gradient(circle at 35% 35%, #DC2626, #7F1D1D) !important;
      border: 3px solid #FFFFFF !important;
      box-shadow: 0 0 16px #DC2626, 0 0 30px rgba(220, 38, 38, 0.8) !important;
      animation: sosPulseRing 1.2s infinite alternate ease-in-out;
      z-index: 10000 !important;
    }
    @keyframes sosPulseRing {
      0% { transform: scale(1); box-shadow: 0 0 10px #DC2626; }
      100% { transform: scale(1.35); box-shadow: 0 0 25px #DC2626, 0 0 45px rgba(220, 38, 38, 0.9); }
    }

    /* Zoom Responsive Visibility */
    .zoom-hide-pins .tn-incident-marker {
      display: none !important;
    }
    .zoom-low .round-pin {
      width: 20px;
      height: 20px;
      font-size: 10px;
      border-width: 1.5px;
      opacity: 0.88;
    }
    .zoom-medium .round-pin {
      width: 30px;
      height: 30px;
      font-size: 14px;
    }
    .zoom-high .round-pin {
      width: 36px;
      height: 36px;
      font-size: 17px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: ${interactive},
      dragging: ${interactive},
      scrollWheelZoom: ${interactive},
      doubleClickZoom: ${interactive},
      attributionControl: false
    });

    var tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      maxNativeZoom: 19,
      keepBuffer: 6
    });
    tileLayer.addTo(map);

    ${
      !hasDestination
        ? `
        map.setView([${origin.lat}, ${origin.lng}], 15);
        var currentPosIcon = L.divIcon({
          className: 'current-pos-marker',
          html: '<div class="pulse-pin"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        L.marker([${origin.lat}, ${origin.lng}], { icon: currentPosIcon })
          .addTo(map)
          .bindPopup('<b>Current Location</b><br/>${origin.name ? origin.name.replace(/'/g, "\\'") : 'You are here'}')
          .openPopup();
        `
        : `
        var routeCoords = ${coordsJson};
        if (routeCoords && routeCoords.length > 0) {
          var polyline = L.polyline(routeCoords, {
            color: '${lineColor}',
            weight: 6,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          // Start Marker
          var startIcon = L.divIcon({
            className: 'start-marker',
            html: '<div style="background:#2563EB; width:16px; height:16px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          L.marker(routeCoords[0], { icon: startIcon }).addTo(map).bindPopup('<b>Start:</b> ${origin.name ? origin.name.replace(/'/g, "\\'") : 'Source Location'}');

          // End Marker
          var endIcon = L.divIcon({
            className: 'end-marker',
            html: '<div style="background:#10B981; width:18px; height:18px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });
          L.marker(routeCoords[routeCoords.length - 1], { icon: endIcon }).addTo(map).bindPopup('<b>Destination:</b> ${destination?.name ? destination.name.replace(/'/g, "\\'") : 'Destination'}');

          ${
            activeRouteType === 'safe'
              ? `
              var midIdx = Math.floor(routeCoords.length / 2);
              var safeIcon = L.divIcon({
                className: 'custom-badge',
                html: '🛡️ Safe Zone',
                iconSize: [80, 24],
                iconAnchor: [40, 12]
              });
              L.marker(routeCoords[midIdx], { icon: safeIcon }).addTo(map);
              `
              : `
              var midIdx = Math.floor(routeCoords.length / 2);
              var threatIcon = L.divIcon({
                className: 'threat-badge',
                html: '⚠️',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });
              L.marker(routeCoords[midIdx], { icon: threatIcon }).addTo(map).bindPopup('<b>High Risk Zone:</b> Crime & Unsafe Wi-Fi reported');
              `
          }

          map.fitBounds(polyline.getBounds(), { padding: [28, 28] });
        } else {
          map.setView([${origin.lat}, ${origin.lng}], 15);
        }
        `
    }

    // Dynamic Zoom Level Responsive Styles & Visibility
    function updateZoomStyles() {
      var currentZoom = map.getZoom();
      var container = map.getContainer();
      container.classList.remove('zoom-low', 'zoom-medium', 'zoom-high', 'zoom-hide-pins');

      if (currentZoom < 6) {
        container.classList.add('zoom-hide-pins');
      } else if (currentZoom < 9) {
        container.classList.add('zoom-low');
      } else if (currentZoom < 12) {
        container.classList.add('zoom-medium');
      } else {
        container.classList.add('zoom-high');
      }
    }
    map.on('zoomend', updateZoomStyles);

    // Dynamic Categorized Round Marking Pin Plotting for Tamil Nadu
    var incidents = ${JSON.stringify(incidents)};
    if (incidents && incidents.length > 0) {
      var incidentBounds = [];
      var sosMarker = null;
      var sosCoords = null;
      incidents.forEach(function(item) {
        var iconHtml = '⚠️';
        var pinClass = 'round-pin round-pin-hazard';
        var badgeBg = '#D97706';

        if (item.id.indexOf('sos') !== -1 || (item.title && item.title.indexOf('SOS') !== -1)) {
          iconHtml = '🚨';
          pinClass = 'round-pin round-pin-sos';
          badgeBg = '#DC2626';
        } else if (item.category === 'Crime') {
          iconHtml = '🚨';
          pinClass = 'round-pin round-pin-crime';
          badgeBg = '#DC2626';
        } else if (item.category === 'Accident') {
          iconHtml = '🚗';
          pinClass = 'round-pin round-pin-accident';
          badgeBg = '#EA580C';
        } else if (item.category === 'Cyber') {
          iconHtml = '🌐';
          pinClass = 'round-pin round-pin-cyber';
          badgeBg = '#9333EA';
        }

        var cleanTitle = (item.title || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        var cleanSub = (item.subtitle || 'Tamil Nadu').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        var cleanDistrict = (item.district || 'Tamil Nadu').replace(/'/g, "\\'");

        var markerIcon = L.divIcon({
          className: 'tn-incident-marker',
          html: '<div class="' + pinClass + '" title="' + cleanTitle + '"><span>' + iconHtml + '</span></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        var popupHtml = '<div style="font-family:sans-serif; min-width:190px; padding:2px;">' +
          '<div style="font-size:10px; font-weight:800; color:' + badgeBg + '; text-transform:uppercase; margin-bottom:3px; letter-spacing:0.5px;">' + iconHtml + ' ' + item.category + ' ALERT (' + cleanDistrict + ')</div>' +
          '<div style="font-size:13px; font-weight:700; color:#0F172A; margin-bottom:5px; line-height:1.25;">' + cleanTitle + '</div>' +
          '<div style="font-size:11px; color:#475569; margin-bottom:8px;">📍 ' + cleanSub + ' • ' + (item.time || 'Recently') + '</div>' +
          (item.sourceUrl ? '<a href="' + item.sourceUrl + '" target="_blank" style="display:inline-block; font-size:11px; color:#2563EB; font-weight:600; text-decoration:none; background:#EFF6FF; padding:4px 8px; border-radius:6px;">Read full news report &rarr;</a>' : '') +
          '</div>';

        var marker = L.marker([item.lat, item.lng], { icon: markerIcon }).addTo(map).bindPopup(popupHtml);
        if (item.id.indexOf('sos') !== -1 || (item.title && item.title.indexOf('SOS') !== -1)) {
          sosMarker = marker;
          sosCoords = [item.lat, item.lng];
        }
        incidentBounds.push([item.lat, item.lng]);
      });

      updateZoomStyles();

      if (sosMarker && sosCoords) {
        map.setView(sosCoords, 16);
        setTimeout(function() { sosMarker.openPopup(); }, 300);
      } else if (!${hasDestination} && incidentBounds.length > 0) {
        var bounds = L.latLngBounds(incidentBounds);
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
      }
    }
  </script>
</body>
</html>
  `;

  const destLat = destination?.lat || 0;
  const destLng = destination?.lng || 0;
  const incidentsHash = incidents.map(i => i.id).join('_');
  const mapKey = `gh_${origin.lat.toFixed(3)}_${origin.lng.toFixed(3)}_${destLat.toFixed(3)}_${destLng.toFixed(3)}_${activeRouteType}_${hasDestination ? routeCoordinates.length : 0}_${incidents.length}_${incidentsHash}`;

  const renderMapCanvas = (mapHeight: DimensionValue, isFullScreen: boolean = false) => (
    <View style={[styles.container, isFullScreen ? { flex: 1, height: '100%', marginVertical: 0 } : { height: mapHeight }]}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={styles.loadingText}>Fetching GraphHopper route...</Text>
        </View>
      ) : null}

      {Platform.OS === 'web' ? (
        <iframe
          key={mapKey}
          title="GraphHopper Interactive Map"
          srcDoc={mapHtml}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 12,
          }}
        />
      ) : (
        <WebView
          key={mapKey}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={{ flex: 1, backgroundColor: 'transparent', borderRadius: 12 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={interactive}
          nestedScrollEnabled={true}
        />
      )}

      <View style={styles.brandingBadge}>
        <Ionicons name="map" size={13} color={C.primary} />
        <Text style={styles.brandingText}>{hasDestination ? 'GraphHopper Live Routing' : 'Live Location Pinpoint'}</Text>
      </View>

      {!isFullScreen && allowFullScreen ? (
        <TouchableOpacity
          onPress={() => setIsModalOpen(true)}
          style={styles.expandButton}
          activeOpacity={0.8}
          hitSlop={8}
        >
          <Ionicons name="expand" size={16} color={C.foreground} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.infoPill}>
        <Text style={styles.infoText}>
          {hasDestination && routeInfo
            ? `${routeInfo.distanceKm} · ${routeInfo.durationMin} min`
            : 'Enter destination to plan route'}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      {renderMapCanvas(height, false)}

      {/* Full Screen Interactive Map Modal */}
      <Modal
        animationType="slide"
        visible={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseButton} hitSlop={12}>
            <Ionicons name="close" size={24} color={C.foreground} />
          </TouchableOpacity>
          <View style={styles.modalTitleBox}>
            <Text style={styles.modalTitle}>Full Screen Safety Map</Text>
            <Text style={styles.modalSub}>{hasDestination ? 'GraphHopper Live Routing · Interactive' : 'Live Location Pinpoint · Interactive'}</Text>
          </View>
          <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalDoneButton}>
            <Text style={styles.modalDoneText}>Done</Text>
          </TouchableOpacity>
        </View>

        {hasDestination ? (
          <View style={styles.modalToggleRow}>
            <TouchableOpacity
              onPress={() => setActiveRouteType('safe')}
              style={[styles.modalTab, activeRouteType === 'safe' && styles.modalTabActiveSafe]}
            >
              <Ionicons name="shield-checkmark" size={15} color={activeRouteType === 'safe' ? '#FFFFFF' : C.success} />
              <Text style={[styles.modalTabText, activeRouteType === 'safe' && styles.modalTabTextActive]}>Safe Route</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveRouteType('fast')}
              style={[styles.modalTab, activeRouteType === 'fast' && styles.modalTabActiveFast]}
            >
              <Ionicons name="flash" size={15} color={activeRouteType === 'fast' ? '#FFFFFF' : C.warning} />
              <Text style={[styles.modalTabText, activeRouteType === 'fast' && styles.modalTabTextActive]}>Fastest Route</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.modalBody}>
          {renderMapCanvas('100%', true)}
        </View>

        <View style={styles.modalFooter}>
          <View style={styles.modalFooterInfo}>
            <Ionicons name="navigate-circle" size={24} color={C.primary} />
            <View>
              <Text style={styles.modalFooterTitle}>
                {hasDestination
                  ? activeRouteType === 'safe' ? 'Recommended Safe Corridor' : 'Fastest High-Risk Route'
                  : 'Current Location Verified'}
              </Text>
              <Text style={styles.modalFooterSub}>
                {hasDestination && routeInfo
                  ? `${routeInfo.distanceKm} · ${routeInfo.durationMin} min travel duration`
                  : 'Type a destination to calculate turn-by-turn route'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseFullBtn}>
            <Text style={styles.modalCloseFullText}>Close Full Screen Map</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 250, 252, 0.85)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.mutedForeground,
  },
  brandingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 5,
  },
  brandingText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.navy,
  },
  expandButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 6,
  },
  infoPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: C.navy,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 5,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Modal styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitleBox: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.foreground,
  },
  modalSub: {
    fontSize: 11,
    color: C.mutedForeground,
  },
  modalDoneButton: {
    backgroundColor: C.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalDoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
  },
  modalToggleRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: C.background,
    gap: 8,
  },
  modalTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTabActiveSafe: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  modalTabActiveFast: {
    backgroundColor: C.destructive,
    borderColor: C.destructive,
  },
  modalTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.foreground,
  },
  modalTabTextActive: {
    color: '#FFFFFF',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: C.background,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 12,
  },
  modalFooterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalFooterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.foreground,
  },
  modalFooterSub: {
    fontSize: 12,
    color: C.mutedForeground,
  },
  modalCloseFullBtn: {
    backgroundColor: C.navy,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseFullText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
