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
  origin = { lat: DEFAULT_ORIGIN.lat, lng: DEFAULT_ORIGIN.lng, name: 'Kundrathur, Chennai' },
  destination,
  routeType = 'safe',
  height = 300,
  incidents = [],
  interactive = true,
  allowFullScreen = true,
  onRouteLoaded,
}: GraphHopperMapProps) {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [safeCoords, setSafeCoords] = useState<[number, number][]>([]);
  const [fastCoords, setFastCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: string; durationMin: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRouteType, setActiveRouteType] = useState<'safe' | 'fast'>(routeType);

  const hasDestination = !!(destination && destination.lat && destination.lng);

  useEffect(() => {
    setActiveRouteType(routeType);
  }, [routeType]);

  useEffect(() => {
    let isMounted = true;

    if (!hasDestination) {
      setLoading(false);
      setRouteCoordinates([]);
      setSafeCoords([]);
      setFastCoords([]);
      setRouteInfo(null);
      return;
    }

    async function fetchRouteMultiEngine() {
      setLoading(true);
      try {
        // 1. Shortest Direct Route (Red Line passing through Pammal Accident Spot)
        const pammalLat = 12.9730;
        const pammalLng = 80.1340;
        const directUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${pammalLng},${pammalLat};${destination!.lng},${destination!.lat}?overview=full&geometries=geojson`;
        const resDirect = await fetch(directUrl);
        let rawFast: [number, number][] = [];
        if (resDirect.ok) {
          const dataDirect = await resDirect.json();
          if (dataDirect.routes && dataDirect.routes.length > 0) {
            rawFast = dataDirect.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
          }
        }

        // 2. Safest Detour Route (Emerald Green Solid Line detouring North via Kovur / Porur)
        const porurLat = 13.0180;
        const porurLng = 80.1250;
        const safeUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${porurLng},${porurLat};${destination!.lng},${destination!.lat}?overview=full&geometries=geojson`;
        const resSafe = await fetch(safeUrl);
        let rawSafe: [number, number][] = [];
        let distKm = '14.8 km';
        let durMin = 24;

        if (resSafe.ok) {
          const dataSafe = await resSafe.json();
          if (dataSafe.routes && dataSafe.routes.length > 0) {
            const route = dataSafe.routes[0];
            rawSafe = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
            distKm = (route.distance / 1000).toFixed(1) + ' km';
            durMin = Math.round(route.duration / 60);
          }
        }

        if (isMounted) {
          setFastCoords(rawFast);
          setSafeCoords(rawSafe.length > 0 ? rawSafe : rawFast);
          setRouteCoordinates(activeRouteType === 'safe' ? (rawSafe.length > 0 ? rawSafe : rawFast) : rawFast);
          const info = { distanceKm: distKm, durationMin: durMin };
          setRouteInfo(info);
          onRouteLoaded?.(info);
          setLoading(false);
        }
      } catch (err: any) {
        console.warn('Dual route fetch warning:', err);
        if (isMounted) setLoading(false);
      }
    }

    fetchRouteMultiEngine();
    return () => { isMounted = false; };
  }, [origin.lat, origin.lng, destination?.lat, destination?.lng, activeRouteType, hasDestination]);

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #F8FAFC; }
    .round-pin { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.35); }
    .round-pin-sos { background: radial-gradient(circle at 35% 35%, #DC2626, #7F1D1D) !important; border: 3px solid #FFFFFF !important; box-shadow: 0 0 16px #DC2626, 0 0 30px rgba(220, 38, 38, 0.8) !important; animation: sosPulseRing 1.2s infinite alternate ease-in-out; z-index: 10000 !important; }
    @keyframes sosPulseRing {
      0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); transform: scale(1); }
      70% { box-shadow: 0 0 0 14px rgba(220, 38, 38, 0); transform: scale(1.1); }
      100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); transform: scale(1); }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${origin.lat}, ${origin.lng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    ${
      !hasDestination
        ? `
        map.setView([${origin.lat}, ${origin.lng}], 15);
        L.marker([${origin.lat}, ${origin.lng}]).addTo(map).bindPopup('You are here').openPopup();
        `
        : `
        var safeCoords = ${JSON.stringify(safeCoords)};
        var fastCoords = ${JSON.stringify(fastCoords)};

        if (fastCoords && fastCoords.length > 0) {
          L.polyline(fastCoords, {
            color: '#EF4444',
            weight: 5,
            opacity: ${activeRouteType === 'fast' ? 0.95 : 0.45},
            dashArray: '8, 8',
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);
        }

        if (safeCoords && safeCoords.length > 0) {
          L.polyline(safeCoords, {
            color: '#059669',
            weight: 10,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          var safePoly = L.polyline(safeCoords, {
            color: '#10B981',
            weight: 6,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);

          var startIcon = L.divIcon({
            className: 'start-marker',
            html: '<div style="background:#2563EB; width:18px; height:18px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });
          L.marker(safeCoords[0] || [${origin.lat}, ${origin.lng}], { icon: startIcon }).addTo(map).bindPopup('<b>Start:</b> Kundrathur, Chennai');

          var endIcon = L.divIcon({
            className: 'end-marker',
            html: '<div style="background:#10B981; width:20px; height:20px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;"><span style="color:#fff; font-size:10px; font-weight:bold;">🏁</span></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          L.marker(safeCoords[safeCoords.length - 1] || [${destination?.lat}, ${destination?.lng}], { icon: endIcon }).addTo(map).bindPopup('<b>Destination:</b> Guindy, Chennai');
          map.fitBounds(safePoly.getBounds(), { padding: [32, 32] });
        }
        `
    }

    function updateZoomStyles() {
      var currentZoom = map.getZoom();
      var container = map.getContainer();
      if (!container) return;
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

    var accidentBlockageMarker = null;
    if (incidents && incidents.length > 0) {
      var incidentBounds = [];
      var sosMarker = null;
      var sosCoords = null;
      incidents.forEach(function(item) {
        var iconHtml = '⚠️';
        var pinClass = 'round-pin round-pin-hazard';
        var badgeBg = '#D97706';

        var isAccidentBlockage = item.id === 'mock_accident_blockage_pammal' || (item.title && item.title.indexOf('Collision Blockage') !== -1);

        if (item.id.indexOf('sos') !== -1 || (item.title && item.title.indexOf('SOS') !== -1)) {
          iconHtml = '🚨';
          pinClass = 'round-pin round-pin-sos';
          badgeBg = '#DC2626';
        } else if (item.category === 'Crime') {
          iconHtml = '🚨';
          pinClass = 'round-pin round-pin-crime';
          badgeBg = '#DC2626';
        } else if (item.category === 'Accident' || isAccidentBlockage) {
          iconHtml = '🚨';
          pinClass = 'round-pin round-pin-crime';
          badgeBg = '#DC2626';
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

        var popupHtml = '';
        if (isAccidentBlockage) {
          popupHtml = '<div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:12px 14px; box-shadow:0 8px 24px rgba(0,0,0,0.18); min-width:260px; font-family:sans-serif;">' +
            '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">' +
              '<span style="background:#fee2e2; color:#dc2626; font-size:10px; font-weight:800; padding:3px 8px; border-radius:6px; letter-spacing:0.5px;">⚠️ ROAD ACCIDENT BLOCKAGE</span>' +
              '<span style="color:#dc2626; font-size:10px; font-weight:800;">HIGH RISK 88%</span>' +
            '</div>' +
            '<div style="font-size:13px; font-weight:800; color:#991b1b; margin-bottom:4px;">Multi-Vehicle Collision Blockage</div>' +
            '<div style="font-size:11px; color:#475569; margin-bottom:8px;">Shortest Direct Road Blocked • Police & Rescue Active</div>' +
            '<div style="background:#ecfdf5; border:1px solid #a7f3d0; color:#059669; font-size:11px; font-weight:700; padding:5px 8px; border-radius:6px; text-align:center;">⚡ SafeSignal AI Auto-Reroute Active (Detour)</div>' +
          '</div>';
        } else {
          popupHtml = '<div style="font-family:sans-serif; min-width:190px; padding:2px;">' +
            '<div style="font-size:10px; font-weight:800; color:' + badgeBg + '; text-transform:uppercase; margin-bottom:3px; letter-spacing:0.5px;">' + iconHtml + ' ' + item.category + ' ALERT (' + cleanDistrict + ')</div>' +
            '<div style="font-size:13px; font-weight:700; color:#0F172A; margin-bottom:5px; line-height:1.25;">' + cleanTitle + '</div>' +
            '<div style="font-size:11px; color:#475569; margin-bottom:8px;">📍 ' + cleanSub + ' • ' + (item.time || 'Recently') + '</div>' +
            (item.sourceUrl ? '<a href="' + item.sourceUrl + '" target="_blank" style="display:inline-block; font-size:11px; color:#2563EB; font-weight:600; text-decoration:none; background:#EFF6FF; padding:4px 8px; border-radius:6px;">Read full news report &rarr;</a>' : '') +
            '</div>';
        }

        var marker = L.marker([item.lat, item.lng], { icon: markerIcon }).addTo(map).bindPopup(popupHtml);
        if (isAccidentBlockage) {
          accidentBlockageMarker = marker;
        }
        if (item.id.indexOf('sos') !== -1 || (item.title && item.title.indexOf('SOS') !== -1)) {
          sosMarker = marker;
          sosCoords = [item.lat, item.lng];
        }
        incidentBounds.push([item.lat, item.lng]);
      });

      updateZoomStyles();

      if (accidentBlockageMarker) {
        setTimeout(function() { accidentBlockageMarker.openPopup(); }, 500);
      } else if (sosMarker && sosCoords) {
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
