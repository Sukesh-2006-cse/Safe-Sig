import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';

const C = colors.light;
type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Screen = 'splash' | 'home' | 'route' | 'scan' | 'alerts' | 'emergency' | 'profile';
type AlertCategory = 'Physical' | 'Cyber';

type AlertItem = {
  icon: IconName;
  title: string;
  subtitle: string;
  category: AlertCategory;
  distance: string;
  time: string;
  tone: 'danger' | 'warning' | 'yellow';
};

const alerts: AlertItem[] = [
  { icon: 'warning', title: 'High Crime Area', subtitle: 'Avoid route ahead', category: 'Physical', distance: '500m ahead', time: '2 min ago', tone: 'danger' },
  { icon: 'wifi', title: 'Suspicious Wi-Fi', subtitle: 'Evil Twin detected', category: 'Cyber', distance: '110m away', time: '5 min ago', tone: 'warning' },
  { icon: 'car', title: 'Accident Reported', subtitle: 'Drive carefully', category: 'Physical', distance: '300m ahead', time: '12 min ago', tone: 'danger' },
  { icon: 'link', title: 'Phishing Link', subtitle: 'Blocked malicious URL', category: 'Cyber', distance: 'N/A', time: '20 min ago', tone: 'warning' },
  { icon: 'bulb', title: 'Low Light Zone', subtitle: 'Poorly lit area ahead', category: 'Physical', distance: '1km ahead', time: '1 hr ago', tone: 'yellow' },
];

const navItems: Array<{ id: Exclude<Screen, 'splash' | 'emergency'>; label: string; icon: IconName }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'route', label: 'Route', icon: 'map' },
  { id: 'scan', label: 'Scan', icon: 'scan' },
  { id: 'alerts', label: 'Alerts', icon: 'notifications' },
  { id: 'profile', label: 'Profile', icon: 'person' },
];

function Icon({ name, size = 20, color = C.mutedForeground }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'soft';
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, styles[`button_${variant}`], disabled && styles.buttonDisabled]}
    >
      {icon ? <Icon name={icon} size={17} color={variant === 'outline' ? C.primary : variant === 'soft' ? C.primary : C.primaryForeground} /> : null}
      <Text style={[styles.buttonText, variant === 'outline' && styles.buttonTextOutline, variant === 'soft' && styles.buttonTextSoft]}>{label}</Text>
    </TouchableOpacity>
  );
}

function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarSide}>{onBack ? <TouchableOpacity onPress={onBack} hitSlop={12}><Icon name="arrow-back" size={23} color={C.foreground} /></TouchableOpacity> : null}</View>
      <Text style={styles.topBarTitle}>{title}</Text>
      <View style={[styles.topBarSide, styles.topBarRight]}>{right}</View>
    </View>
  );
}

function SectionHeading({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function MapPlaceholder() {
  return (
    <View style={styles.mapPlaceholder}>
      <View style={styles.mapIconCircle}><Icon name="map-outline" size={28} color={C.mutedForeground} /></View>
      <Text style={styles.mapTitle}>Map integration coming soon</Text>
      <Text style={styles.mapSubtitle}>Your safer route will appear here</Text>
    </View>
  );
}

function AppHeader({ onNotification }: { onNotification: () => void }) {
  return (
    <View style={styles.dashboardHeader}>
      <View>
        <Text style={styles.eyebrow}>GOOD MORNING, SUKESH</Text>
        <Text style={styles.brandTitle}>SafeSignal <Text style={styles.brandAccent}>AI</Text></Text>
      </View>
      <TouchableOpacity onPress={onNotification} style={styles.headerIconButton}>
        <Icon name="notifications-outline" size={22} color={C.foreground} />
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );
}

function StatusBanner({ danger, onPress }: { danger: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.statusBanner, danger ? styles.statusDanger : styles.statusSafe]}>
      <View style={[styles.statusIcon, { backgroundColor: danger ? '#FECACA' : '#BBF7D0' }]}>
        <Icon name={danger ? 'warning' : 'shield-checkmark'} size={22} color={danger ? C.destructive : C.success} />
      </View>
      <View style={styles.statusCopy}>
        <Text style={styles.statusTitle}>{danger ? 'High Risk Zone Detected' : 'You are in a Safe Zone'}</Text>
        <Text style={styles.statusSubtitle}>{danger ? 'Multiple threats detected nearby' : 'Low risk area detected'}</Text>
      </View>
      <Icon name="chevron-forward" size={18} color={danger ? '#B91C1C' : '#15803D'} />
    </TouchableOpacity>
  );
}

function StatCard({ icon, label, value, tint }: { icon: IconName; label: string; value: string; tint: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint + '18' }]}><Icon name={icon} size={17} color={tint} /></View>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
    </View>
  );
}

function AlertRow({ alert, compact = false }: { alert: AlertItem; compact?: boolean }) {
  const toneColor = alert.tone === 'danger' ? C.destructive : alert.tone === 'warning' ? C.warning : '#EAB308';
  return (
    <View style={[styles.alertRow, { borderLeftColor: toneColor }, compact && styles.alertRowCompact]}>
      <View style={[styles.alertIcon, { backgroundColor: toneColor + '15' }]}><Icon name={alert.icon} size={18} color={toneColor} /></View>
      <View style={styles.alertCopy}>
        <Text style={styles.alertTitle}>{alert.title}</Text>
        <Text style={styles.alertSubtitle}>{alert.subtitle}</Text>
      </View>
      <View style={styles.alertMeta}>
        <Text style={styles.alertDistance}>{alert.distance}</Text>
        <Text style={styles.alertTime}>{alert.time}</Text>
      </View>
    </View>
  );
}

function BottomNav({ active, onNavigate }: { active: Exclude<Screen, 'splash' | 'emergency'>; onNavigate: (screen: Exclude<Screen, 'splash' | 'emergency'>) => void }) {
  return (
    <View style={styles.bottomNav}>
      {navItems.map((item) => {
        const selected = item.id === active;
        return (
          <TouchableOpacity key={item.id} onPress={() => onNavigate(item.id)} style={styles.navItem} activeOpacity={0.75}>
            <View style={[styles.navIconWrap, selected && styles.navIconWrapActive]}><Icon name={item.icon} size={21} color={selected ? C.primary : '#94A3B8'} /></View>
            <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Page({ children, active, onNavigate, topInset, scroll = true }: { children: React.ReactNode; active: Exclude<Screen, 'splash' | 'emergency'>; onNavigate: (screen: Exclude<Screen, 'splash' | 'emergency'>) => void; topInset: number; scroll?: boolean }) {
  return (
    <View style={[styles.page, { paddingTop: topInset }]}>
      {scroll ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>{children}</ScrollView> : children}
      <BottomNav active={active} onNavigate={onNavigate} />
    </View>
  );
}

function HomeScreen({ danger, onToggleDanger, onNavigate, onEmergency, onNotification, topInset }: { danger: boolean; onToggleDanger: () => void; onNavigate: (screen: Exclude<Screen, 'splash' | 'emergency'>) => void; onEmergency: () => void; onNotification: () => void; topInset: number }) {
  const [destination, setDestination] = useState('Indiranagar, Bengaluru');
  const [selectedRoute, setSelectedRoute] = useState<'safe' | 'fast'>('safe');
  const [navigating, setNavigating] = useState(false);
  const [showTripDetails, setShowTripDetails] = useState(false);

  return (
    <Page active="home" onNavigate={onNavigate} topInset={topInset}>
      <View style={styles.routeHomeHeader}>
        <View>
          <Text style={styles.eyebrow}>YOUR SAFE TRIP</Text>
          <Text style={styles.brandTitle}>Plan a safer <Text style={styles.brandAccent}>journey</Text></Text>
          <Text style={styles.homeHeaderSub}>Good morning, Sukesh</Text>
        </View>
        <TouchableOpacity onPress={onNotification} style={styles.headerIconButton}>
          <Icon name="notifications-outline" size={22} color={C.foreground} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onToggleDanger} activeOpacity={0.84} style={[styles.tripSafetyPill, danger && styles.tripSafetyPillDanger]}>
        <View style={[styles.tripSafetyDot, danger && styles.tripSafetyDotDanger]} />
        <Text style={[styles.tripSafetyText, danger && styles.tripSafetyTextDanger]}>{danger ? 'High risk detected around you' : 'You are in a low-risk area'}</Text>
        <Icon name="chevron-forward" size={16} color={danger ? C.destructive : C.success} />
      </TouchableOpacity>

      <View style={styles.routeSearchCard}>
        <View style={styles.routeSearchTitleRow}><View><Text style={styles.routeSearchEyebrow}>SAFE ROUTE PLANNER</Text><Text style={styles.routeSearchTitle}>Where are you going?</Text></View><View style={styles.routeSearchIcon}><Icon name="navigate" size={20} color={C.primary} /></View></View>
        <View style={styles.routeHomeInput}><View style={styles.routeInputRail}><View style={styles.routeInputDot} /><View style={styles.routeInputLine} /><View style={[styles.routeInputDot, styles.routeInputDotEnd]} /></View><View style={styles.routeInputCopy}><Text style={styles.routeInputLabel}>FROM</Text><Text style={styles.routeInputValue}>Current location</Text><View style={styles.routeLiveTag}><View style={styles.liveDot} /><Text style={styles.liveText}>Live</Text></View><Text style={[styles.routeInputLabel, styles.routeToLabel]}>TO</Text><TextInput value={destination} onChangeText={setDestination} placeholder="Enter destination" placeholderTextColor={C.mutedForeground} style={styles.routeHomeTextInput} /></View></View>
      </View>

      <View style={styles.homeMapPreview}>
        <View style={styles.mapPreviewTop}><View style={styles.mapPreviewStatus}><View style={styles.mapPreviewStatusDot} /><Text style={styles.mapPreviewStatusText}>Safety map preview</Text></View><TouchableOpacity onPress={() => setShowTripDetails(!showTripDetails)} style={styles.mapPreviewControl}><Icon name={showTripDetails ? 'contract' : 'expand'} size={17} color={C.foreground} /></TouchableOpacity></View>
        <View style={styles.routeVisual}><View style={styles.routeVisualLineBack} /><View style={styles.routeVisualLine} /><View style={styles.routeStartDot}><Icon name="location" size={13} color={C.primaryForeground} /></View><View style={styles.routeEndDot}><Icon name="flag" size={13} color={C.primaryForeground} /></View><View style={styles.routeVisualLabel}><Icon name="shield-checkmark" size={13} color={C.success} /><Text style={styles.routeVisualLabelText}>Low-risk corridor</Text></View></View>
        <View style={styles.mapPreviewBottom}><View><Text style={styles.mapPreviewDistance}>12 km</Text><Text style={styles.mapPreviewMeta}>20 min via safe route</Text></View><View style={styles.mapPlaceholderMini}><Icon name="map-outline" size={15} color={C.mutedForeground} /><Text style={styles.mapMiniText}>Map coming soon</Text></View></View>
      </View>

      <View style={styles.bestRouteHeading}><View><Text style={styles.sectionTitle}>Best route for you</Text><Text style={styles.bestRouteSub}>Prioritizing safety over speed</Text></View><View style={styles.routeScore}><Icon name="shield-checkmark" size={14} color={C.success} /><Text style={styles.routeScoreText}>92 safety score</Text></View></View>
      <TouchableOpacity onPress={() => setSelectedRoute('safe')} activeOpacity={0.88} style={[styles.homeRouteOption, selectedRoute === 'safe' && styles.homeRouteOptionSelected]}>
        <View style={styles.homeRouteIcon}><Icon name="shield-checkmark" size={21} color={C.success} /></View><View style={styles.homeRouteCopy}><View style={styles.homeRouteTitleRow}><Text style={styles.homeRouteTitle}>Safe route</Text><Text style={styles.homeRecommended}>RECOMMENDED</Text></View><Text style={styles.homeRouteMeta}>20 min  ·  12 km  ·  Low crime</Text></View><View style={[styles.radio, selectedRoute === 'safe' && styles.radioSelected]}>{selectedRoute === 'safe' ? <View style={styles.radioInner} /> : null}</View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setSelectedRoute('fast')} activeOpacity={0.88} style={[styles.homeRouteOption, selectedRoute === 'fast' && styles.homeRouteOptionFastSelected]}>
        <View style={[styles.homeRouteIcon, styles.homeRouteIconFast]}><Icon name="flash" size={21} color={C.warning} /></View><View style={styles.homeRouteCopy}><View style={styles.homeRouteTitleRow}><Text style={styles.homeRouteTitle}>Fastest route</Text><Text style={styles.homeNotRecommended}>HIGH RISK</Text></View><Text style={styles.homeRouteMeta}>14 min  ·  9 km  ·  Accident zone</Text></View><View style={[styles.radio, selectedRoute === 'fast' && { borderColor: C.warning }]}>{selectedRoute === 'fast' ? <View style={[styles.radioInner, { backgroundColor: C.warning }]} /> : null}</View>
      </TouchableOpacity>

      {showTripDetails ? <View style={styles.tripDetails}><View style={styles.tripDetail}><Icon name="shield-checkmark-outline" size={17} color={C.success} /><Text style={styles.tripDetailText}>No accident reports along this route</Text></View><View style={styles.tripDetail}><Icon name="wifi-outline" size={17} color={C.primary} /><Text style={styles.tripDetailText}>Safe network coverage expected</Text></View></View> : null}
      <Button label={navigating ? 'End navigation' : `Start ${selectedRoute === 'safe' ? 'safe' : 'fastest'} navigation`} icon={navigating ? 'stop-circle-outline' : 'navigate'} variant={navigating ? 'danger' : 'primary'} onPress={() => setNavigating(!navigating)} />
      {navigating ? <View style={styles.navigationLive}><View style={styles.navigationLiveDot} /><Text style={styles.navigationLiveText}>Navigation active · Rechecking threats as you travel</Text></View> : null}

      <View style={styles.homeActionRow}><TouchableOpacity onPress={() => onNavigate('scan')} style={styles.homeActionCard}><View style={styles.homeActionIcon}><Icon name="scan-outline" size={20} color={C.primary} /></View><Text style={styles.homeActionTitle}>Scan area</Text><Text style={styles.homeActionSub}>Check nearby threats</Text></TouchableOpacity><TouchableOpacity onPress={() => onNavigate('alerts')} style={styles.homeActionCard}><View style={styles.homeActionIcon}><Icon name="notifications-outline" size={20} color={C.warning} /></View><Text style={styles.homeActionTitle}>Live alerts</Text><Text style={styles.homeActionSub}>2 active nearby</Text></TouchableOpacity></View>
      <TouchableOpacity onPress={onEmergency} style={styles.sosButton} activeOpacity={0.8}>
        <Icon name="alert-circle" size={21} color={C.primaryForeground} />
        <Text style={styles.sosButtonText}>SOS EMERGENCY</Text>
      </TouchableOpacity>
    </Page>
  );
}

function RouteScreen({ onNavigate, onBack, onEmergency, topInset }: { onNavigate: (screen: Exclude<Screen, 'splash' | 'emergency'>) => void; onBack: () => void; onEmergency: () => void; topInset: number }) {
  const [destination, setDestination] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<'safe' | 'fast'>('safe');
  return (
    <Page active="route" onNavigate={onNavigate} topInset={topInset}>
      <TopBar title="Plan safe route" onBack={onBack} right={<TouchableOpacity onPress={onEmergency} style={styles.routeHeaderSos}><Icon name="alert-circle" size={19} color={C.destructive} /></TouchableOpacity>} />
      <View style={styles.inputStack}>
        <View style={styles.inputShell}><Icon name="location" size={18} color={C.primary} /><Text style={styles.inputText}>Current location</Text><View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>Live</Text></View></View>
        <View style={styles.inputShell}><Icon name="flag" size={18} color={C.mutedForeground} /><TextInput value={destination} onChangeText={setDestination} placeholder="Enter destination" placeholderTextColor={C.mutedForeground} style={styles.textInput} /></View>
      </View>
      <MapPlaceholder />
      <TouchableOpacity onPress={onEmergency} activeOpacity={0.84} style={styles.routeEmergencyBanner}>
        <View style={styles.routeEmergencyIcon}><Icon name="alert-circle" size={23} color={C.primaryForeground} /></View>
        <View style={styles.routeEmergencyCopy}><Text style={styles.routeEmergencyTitle}>Need help on this trip?</Text><Text style={styles.routeEmergencySubtitle}>Emergency contacts and nearby services are ready</Text></View>
        <View style={styles.routeEmergencyButton}><Text style={styles.routeEmergencyButtonText}>SOS</Text><Icon name="chevron-forward" size={15} color={C.primaryForeground} /></View>
      </TouchableOpacity>
      <SectionHeading title="Choose your route" />
      <TouchableOpacity onPress={() => setSelectedRoute('safe')} activeOpacity={0.88} style={[styles.routeCard, selectedRoute === 'safe' && styles.routeCardSelected, { borderLeftColor: C.success }]}>
        <View style={styles.routeHeader}><View><View style={styles.recommendedBadge}><Icon name="checkmark-circle" size={13} color={C.success} /><Text style={styles.recommendedText}>Recommended</Text></View><Text style={styles.routeTitle}>Safe route</Text></View><View style={[styles.radio, selectedRoute === 'safe' && styles.radioSelected]}>{selectedRoute === 'safe' ? <View style={styles.radioInner} /> : null}</View></View>
        <Text style={styles.routeStats}>20 min  ·  12 km  ·  <Text style={{ color: C.success }}>Risk: Low</Text></Text>
        <View style={styles.chipRow}><View style={styles.successChip}><Text style={styles.chipTextSuccess}>Low crime</Text></View><View style={styles.successChip}><Text style={styles.chipTextSuccess}>No accidents</Text></View><View style={styles.successChip}><Text style={styles.chipTextSuccess}>Safe network</Text></View></View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setSelectedRoute('fast')} activeOpacity={0.88} style={[styles.routeCard, selectedRoute === 'fast' && styles.routeCardSelected, { borderLeftColor: C.destructive }]}>
        <View style={styles.routeHeader}><View><View style={styles.recommendedBadge}><Icon name="warning" size={13} color={C.destructive} /><Text style={styles.notRecommendedText}>Not recommended</Text></View><Text style={styles.routeTitle}>Fastest route</Text></View><View style={[styles.radio, selectedRoute === 'fast' && { borderColor: C.destructive }]}>{selectedRoute === 'fast' ? <View style={[styles.radioInner, { backgroundColor: C.destructive }]} /> : null}</View></View>
        <Text style={styles.routeStats}>14 min  ·  9 km  ·  <Text style={{ color: C.destructive }}>Risk: High</Text></Text>
        <View style={styles.chipRow}><View style={styles.dangerChip}><Text style={styles.chipTextDanger}>High crime</Text></View><View style={styles.dangerChip}><Text style={styles.chipTextDanger}>Accident zone</Text></View><View style={styles.dangerChip}><Text style={styles.chipTextDanger}>Unsafe network</Text></View></View>
      </TouchableOpacity>
      <SectionHeading title="Emergency contacts" action="Manage" />
      <ContactRow initials="PS" name="Priya S." relation="Sister" />
      <ContactRow initials="RM" name="Rajan M." relation="Father" />
      <SectionHeading title="Nearby emergency services" />
      <View style={styles.servicesRow}>{[{ icon: 'shield' as IconName, label: 'Police', distance: '0.8 km' }, { icon: 'medkit' as IconName, label: 'Hospital', distance: '1.2 km' }, { icon: 'flame' as IconName, label: 'Fire station', distance: '2.1 km' }].map((service) => <View key={service.label} style={styles.serviceCard}><View style={styles.serviceIcon}><Icon name={service.icon} size={20} color={C.primary} /></View><Text style={styles.serviceLabel}>{service.label}</Text><Text style={styles.serviceDistance}>{service.distance}</Text><TouchableOpacity onPress={onEmergency} style={styles.callIconButton}><Icon name="call" size={15} color={C.primary} /></TouchableOpacity></View>)}</View>
      <Button label={`Navigate ${selectedRoute === 'safe' ? 'safe' : 'fastest'} route`} icon="navigate" onPress={() => onNavigate('home')} />
    </Page>
  );
}

function ScannerCard({ icon, title, badge, badgeTone, description, onScan }: { icon: IconName; title: string; badge: string; badgeTone: 'warning' | 'success' | 'muted'; description: string; onScan: () => void }) {
  const tone = badgeTone === 'warning' ? C.warning : badgeTone === 'success' ? C.success : C.mutedForeground;
  return (
    <View style={styles.scannerCard}>
      <View style={styles.scannerCardHeader}><View style={styles.scannerIcon}><Icon name={icon} size={21} color={C.primary} /></View><Text style={styles.scannerTitle}>{title}</Text><View style={[styles.badge, { backgroundColor: tone + '16' }]}><Text style={[styles.badgeText, { color: tone }]}>{badge}</Text></View></View>
      <Text style={styles.scannerDescription}>{description}</Text>
      <TouchableOpacity onPress={onScan} style={styles.outlineSmallButton} activeOpacity={0.75}><Icon name="refresh" size={15} color={C.primary} /><Text style={styles.outlineSmallText}>Scan again</Text></TouchableOpacity>
    </View>
  );
}

function ScanScreen({ onNavigate, topInset }: { onNavigate: (screen: Exclude<Screen, 'splash' | 'emergency'>) => void; topInset: number }) {
  const [monitoring, setMonitoring] = useState(true);
  const [url, setUrl] = useState('');
  const [scanMessage, setScanMessage] = useState('Ready to scan');
  return (
    <Page active="scan" onNavigate={onNavigate} topInset={topInset}>
      <TopBar title="Threat scanner" right={<View style={styles.monitoringPill}><View style={styles.monitoringDot} /><Text style={styles.monitoringText}>Live</Text></View>} />
      <View style={styles.monitoringRow}><View><Text style={styles.settingTitle}>Real-time monitoring</Text><Text style={styles.settingSubtitle}>Scan your surroundings continuously</Text></View><Switch value={monitoring} onValueChange={setMonitoring} trackColor={{ false: C.border, true: '#93C5FD' }} thumbColor={monitoring ? C.primary : '#F8FAFC'} /></View>
      <ScannerCard icon="wifi" title="Wi-Fi scanner" badge="2 suspicious found" badgeTone="warning" description="Detected fake hotspots nearby" onScan={() => setScanMessage('Wi-Fi scan refreshed')} />
      <ScannerCard icon="bluetooth" title="Bluetooth monitor" badge="Safe" badgeTone="success" description="No suspicious devices found" onScan={() => setScanMessage('Bluetooth scan refreshed')} />
      <View style={styles.scannerCard}>
        <View style={styles.scannerCardHeader}><View style={styles.scannerIcon}><Icon name="globe-outline" size={21} color={C.primary} /></View><Text style={styles.scannerTitle}>Phishing detector</Text></View>
        <View style={styles.urlRow}><TextInput value={url} onChangeText={setUrl} placeholder="Enter URL or scan QR code" placeholderTextColor={C.mutedForeground} style={styles.urlInput} /><TouchableOpacity onPress={() => setScanMessage(url ? 'No malicious content found' : 'Enter a URL to check')} style={styles.checkButton}><Text style={styles.checkButtonText}>Check</Text></TouchableOpacity></View>
        <Text style={styles.readyText}>{scanMessage}</Text>
      </View>
      <SectionHeading title="Active threats" />
      <View style={styles.threatCard}><View style={styles.threatIcon}><Icon name="wifi" size={19} color={C.destructive} /></View><View style={styles.threatCopy}><Text style={styles.alertTitle}>Evil Twin Wi-Fi</Text><Text style={styles.alertSubtitle}>200m from your location</Text></View><Text style={styles.severityHigh}>High</Text></View>
      <View style={styles.threatCard}><View style={styles.threatIcon}><Icon name="link" size={19} color={C.destructive} /></View><View style={styles.threatCopy}><Text style={styles.alertTitle}>Phishing link blocked</Text><Text style={styles.alertSubtitle}>Just now</Text></View><Text style={styles.severityMedium}>Medium</Text></View>
    </Page>
  );
}

function AlertsScreen({ filter, setFilter, onNavigate, topInset }: { filter: 'All' | AlertCategory; setFilter: (filter: 'All' | AlertCategory) => void; onNavigate: (screen: Exclude<Screen, 'splash' | 'emergency'>) => void; topInset: number }) {
  const filtered = useMemo(() => filter === 'All' ? alerts : alerts.filter((alert) => alert.category === filter), [filter]);
  return (
    <Page active="alerts" onNavigate={onNavigate} topInset={topInset}>
      <TopBar title="Live alerts" right={<View style={styles.alertCount}><Text style={styles.alertCountText}>{alerts.length}</Text></View>} />
      <View style={styles.filterTabs}>
        {(['All', 'Physical', 'Cyber'] as const).map((item) => <TouchableOpacity key={item} onPress={() => setFilter(item)} style={[styles.filterTab, filter === item && styles.filterTabActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></TouchableOpacity>)}
      </View>
      {filtered.length ? <View style={styles.liveAlertList}>{filtered.map((alert) => <AlertRow key={alert.title} alert={alert} />)}</View> : <View style={styles.emptyState}><View style={styles.emptyIcon}><Icon name="shield-checkmark" size={30} color={C.success} /></View><Text style={styles.emptyTitle}>All clear</Text><Text style={styles.emptyText}>No threats match this filter</Text></View>}
    </Page>
  );
}

function EmergencyScreen({ onBack, topInset }: { onBack: () => void; topInset: number }) {
  const pulse = useRef(new Animated.Value(0.55)).current;
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.55, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  return (
    <View style={[styles.page, { paddingTop: topInset }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <TopBar title="Emergency" onBack={onBack} />
        <View style={styles.sosHero}><Animated.View style={[styles.sosCircle, { opacity: pulse }]}><Text style={styles.sosText}>SOS</Text></Animated.View><Text style={styles.sosHint}>Tap to alert emergency contacts & share location</Text><Button label={sharing ? 'Live location shared' : 'Share live location'} variant="outline" icon="location" onPress={() => setSharing(!sharing)} /></View>
        <SectionHeading title="Emergency contacts" />
        <ContactRow initials="PS" name="Priya S." relation="Sister" />
        <ContactRow initials="RM" name="Rajan M." relation="Father" />
        <SectionHeading title="Nearby services" />
        <View style={styles.servicesRow}>{[{ icon: 'shield' as IconName, label: 'Police', distance: '0.8 km' }, { icon: 'medkit' as IconName, label: 'Hospital', distance: '1.2 km' }, { icon: 'flame' as IconName, label: 'Fire station', distance: '2.1 km' }].map((service) => <View key={service.label} style={styles.serviceCard}><View style={styles.serviceIcon}><Icon name={service.icon} size={20} color={C.primary} /></View><Text style={styles.serviceLabel}>{service.label}</Text><Text style={styles.serviceDistance}>{service.distance}</Text><TouchableOpacity style={styles.callIconButton}><Icon name="call" size={15} color={C.primary} /></TouchableOpacity></View>)}</View>
      </ScrollView>
    </View>
  );
}

function ContactRow({ initials, name, relation }: { initials: string; name: string; relation: string }) {
  return <View style={styles.contactRow}><View style={styles.contactAvatar}><Text style={styles.contactInitials}>{initials}</Text></View><View style={styles.contactCopy}><Text style={styles.contactName}>{name}</Text><Text style={styles.contactRelation}>{relation}</Text></View><TouchableOpacity style={styles.callButton}><Icon name="call" size={15} color={C.destructive} /><Text style={styles.callButtonText}>Call</Text></TouchableOpacity></View>;
}

function ProfileScreen({ onNavigate, topInset }: { onNavigate: (screen: Exclude<Screen, 'splash' | 'emergency'>) => void; topInset: number }) {
  const [settings, setSettings] = useState({ push: true, location: true, scan: true, night: true, call: false });
  const [contactsOpen, setContactsOpen] = useState(false);
  const updateSetting = (key: keyof typeof settings) => setSettings((current) => ({ ...current, [key]: !current[key] }));
  const rows: Array<{ icon: IconName; label: string; key?: keyof typeof settings }> = [
    { icon: 'notifications-outline', label: 'Push notifications', key: 'push' },
    { icon: 'location-outline', label: 'Background location', key: 'location' },
    { icon: 'shield-checkmark-outline', label: 'Auto threat scan', key: 'scan' },
    { icon: 'moon-outline', label: 'Night mode alerts', key: 'night' },
    { icon: 'call-outline', label: 'SOS auto-call', key: 'call' },
  ];
  return (
    <Page active="profile" onNavigate={onNavigate} topInset={topInset}>
      <TopBar title="Profile & settings" right={<TouchableOpacity><Icon name="ellipsis-horizontal" size={23} color={C.foreground} /></TouchableOpacity>} />
      <View style={styles.profileCard}><View style={styles.profileAvatar}><Text style={styles.profileInitials}>SM</Text></View><View><Text style={styles.profileName}>Sukesh M</Text><Text style={styles.profileMeta}>24CS0949  ·  CSE Dept</Text><View style={styles.verifiedRow}><Icon name="checkmark-circle" size={13} color={C.success} /><Text style={styles.verifiedText}>Identity verified</Text></View></View><TouchableOpacity style={styles.editButton}><Icon name="create-outline" size={18} color={C.primary} /></TouchableOpacity></View>
      <SectionHeading title="Settings" />
      <View style={styles.settingsCard}>{rows.map((row) => <View key={row.label} style={styles.settingRow}><View style={styles.settingLeading}><Icon name={row.icon} size={20} color={C.primary} /><Text style={styles.settingLabel}>{row.label}</Text></View><Switch value={row.key ? settings[row.key] : false} onValueChange={() => row.key && updateSetting(row.key)} trackColor={{ false: C.border, true: '#93C5FD' }} thumbColor={row.key && settings[row.key] ? C.primary : '#F8FAFC'} /></View>)}<TouchableOpacity onPress={() => setContactsOpen(!contactsOpen)} style={styles.settingRow}><View style={styles.settingLeading}><Icon name="people-outline" size={20} color={C.primary} /><Text style={styles.settingLabel}>Emergency contacts</Text></View><Icon name={contactsOpen ? 'chevron-down' : 'chevron-forward'} size={19} color={C.mutedForeground} /></TouchableOpacity>{contactsOpen ? <View style={styles.contactsEditor}><ContactRow initials="PS" name="Priya S." relation="Sister" /><ContactRow initials="RM" name="Rajan M." relation="Father" /><Button label="Add contact" variant="soft" icon="add" onPress={() => undefined} /></View> : null}</View>
      <TouchableOpacity style={styles.aboutRow}><View style={styles.settingLeading}><Icon name="information-circle-outline" size={20} color={C.primary} /><Text style={styles.settingLabel}>About SafeSignal AI</Text></View><Icon name="chevron-forward" size={19} color={C.mutedForeground} /></TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton}><Icon name="log-out-outline" size={18} color={C.destructive} /><Text style={styles.logoutText}>Log out</Text></TouchableOpacity>
    </Page>
  );
}

function SplashScreen({ onStart, topInset, bottomInset }: { onStart: () => void; topInset: number; bottomInset: number }) {
  return (
    <View style={[styles.splash, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      <View style={styles.splashContent}><View style={styles.splashLogo}><Icon name="shield-checkmark" size={48} color={C.primaryForeground} /></View><Text style={styles.splashTitle}>SafeSignal <Text style={styles.splashAccent}>AI</Text></Text><Text style={styles.splashSubtitle}>Smart navigation. Threat detection.{'\n'}Safe travel.</Text><View style={styles.splashTrust}><Icon name="lock-closed" size={14} color={C.success} /><Text style={styles.splashTrustText}>Your safety, always in view</Text></View></View>
      <View style={styles.splashBottom}><Button label="Get started" icon="arrow-forward" onPress={onStart} /><Text style={styles.splashFootnote}>Private by design  ·  Built for safer journeys</Text></View>
    </View>
  );
}

export default function SafeSignalHome() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'web' ? 67 : 0);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 0);
  const [screen, setScreen] = useState<Screen>('splash');
  const [danger, setDanger] = useState(false);
  const [alertFilter, setAlertFilter] = useState<'All' | AlertCategory>('All');

  const navigate = (next: Exclude<Screen, 'splash' | 'emergency'>) => {
    Haptics.selectionAsync().catch(() => undefined);
    setScreen(next);
  };
  const openEmergency = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    setScreen('emergency');
  };

  if (screen === 'splash') return <SplashScreen onStart={() => setScreen('home')} topInset={topInset} bottomInset={bottomInset} />;
  if (screen === 'home') return <HomeScreen danger={danger} onToggleDanger={() => setDanger(!danger)} onNavigate={navigate} onEmergency={openEmergency} onNotification={() => navigate('alerts')} topInset={topInset} />;
  if (screen === 'route') return <RouteScreen onNavigate={navigate} onBack={() => navigate('home')} onEmergency={openEmergency} topInset={topInset} />;
  if (screen === 'scan') return <ScanScreen onNavigate={navigate} topInset={topInset} />;
  if (screen === 'alerts') return <AlertsScreen filter={alertFilter} setFilter={setAlertFilter} onNavigate={navigate} topInset={topInset} />;
  if (screen === 'profile') return <ProfileScreen onNavigate={navigate} topInset={topInset} />;
  return <EmergencyScreen onBack={() => navigate('home')} topInset={topInset} />;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.background },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 112 },
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBarTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, color: C.foreground, textTransform: 'capitalize' },
  topBarSide: { width: 44, alignItems: 'flex-start', justifyContent: 'center' },
  topBarRight: { alignItems: 'flex-end' },
  routeHeaderSos: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  dashboardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 22 },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.1, color: C.mutedForeground, marginBottom: 5 },
  brandTitle: { fontFamily: 'Inter_700Bold', fontSize: 27, letterSpacing: -0.8, color: C.foreground },
  brandAccent: { color: C.primary },
  routeHomeHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 16 },
  homeHeaderSub: { fontFamily: 'Inter_400Regular', color: C.mutedForeground, fontSize: 12, marginTop: 6 },
  headerIconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', right: 10, top: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: C.destructive, borderWidth: 1.5, borderColor: C.card },
  tripSafetyPill: { minHeight: 37, borderRadius: 11, paddingHorizontal: 12, backgroundColor: C.successSoft, borderWidth: 1, borderColor: '#BBF7D0', flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  tripSafetyPillDanger: { backgroundColor: C.dangerSoft, borderColor: '#FECACA' },
  tripSafetyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.success, marginRight: 8 },
  tripSafetyDotDanger: { backgroundColor: C.destructive },
  tripSafetyText: { flex: 1, fontFamily: 'Inter_600SemiBold', color: '#15803D', fontSize: 11 },
  tripSafetyTextDanger: { color: '#B91C1C' },
  routeSearchCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 15, marginBottom: 13, shadowColor: C.primary, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  routeSearchTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  routeSearchEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1, color: C.primary, marginBottom: 4 },
  routeSearchTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, color: C.foreground, letterSpacing: -0.3 },
  routeSearchIcon: { width: 41, height: 41, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: C.secondary },
  routeHomeInput: { flexDirection: 'row', minHeight: 99, borderRadius: 13, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: C.border, paddingVertical: 11, paddingHorizontal: 10 },
  routeInputRail: { width: 21, alignItems: 'center', paddingTop: 5 },
  routeInputDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: C.primary, backgroundColor: C.card },
  routeInputDotEnd: { borderColor: C.destructive, backgroundColor: C.dangerSoft },
  routeInputLine: { width: 1, flex: 1, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#93C5FD', marginVertical: 3 },
  routeInputCopy: { flex: 1, paddingLeft: 5, position: 'relative' },
  routeInputLabel: { fontFamily: 'Inter_700Bold', color: C.mutedForeground, fontSize: 9, letterSpacing: 0.9, marginBottom: 3 },
  routeInputValue: { fontFamily: 'Inter_500Medium', color: C.foreground, fontSize: 13 },
  routeToLabel: { marginTop: 12 },
  routeLiveTag: { position: 'absolute', right: 2, top: 0, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.successSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 },
  routeHomeTextInput: { fontFamily: 'Inter_500Medium', color: C.foreground, fontSize: 13, paddingVertical: 0, paddingHorizontal: 0, height: 22 },
  homeMapPreview: { height: 198, borderRadius: 17, backgroundColor: '#E2E8F0', overflow: 'hidden', padding: 12, marginBottom: 21 },
  mapPreviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapPreviewStatus: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  mapPreviewStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success, marginRight: 5 },
  mapPreviewStatusText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: C.mutedForeground },
  mapPreviewControl: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  routeVisual: { flex: 1, position: 'relative', marginHorizontal: 16, marginVertical: 3 },
  routeVisualLineBack: { position: 'absolute', left: '18%', right: '16%', top: '45%', height: 8, backgroundColor: '#CBD5E1', borderRadius: 5, transform: [{ rotate: '-17deg' }] },
  routeVisualLine: { position: 'absolute', left: '18%', right: '16%', top: '45%', height: 4, backgroundColor: C.primary, borderRadius: 4, transform: [{ rotate: '-17deg' }] },
  routeStartDot: { position: 'absolute', left: '10%', top: '58%', width: 27, height: 27, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#DBEAFE' },
  routeEndDot: { position: 'absolute', right: '7%', top: '20%', width: 27, height: 27, borderRadius: 14, backgroundColor: C.destructive, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FECACA' },
  routeVisualLabel: { position: 'absolute', left: '35%', top: '18%', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 5 },
  routeVisualLabelText: { fontFamily: 'Inter_600SemiBold', color: '#15803D', fontSize: 10 },
  mapPreviewBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  mapPreviewDistance: { fontFamily: 'Inter_700Bold', color: C.foreground, fontSize: 18 },
  mapPreviewMeta: { fontFamily: 'Inter_400Regular', color: C.mutedForeground, fontSize: 10, marginTop: 2 },
  mapPlaceholderMini: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#CBD5E1', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5 },
  mapMiniText: { fontFamily: 'Inter_500Medium', color: C.mutedForeground, fontSize: 9 },
  bestRouteHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  bestRouteSub: { fontFamily: 'Inter_400Regular', color: C.mutedForeground, fontSize: 11, marginTop: 4 },
  routeScore: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.successSoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 6 },
  routeScoreText: { fontFamily: 'Inter_700Bold', color: '#15803D', fontSize: 10 },
  homeRouteOption: { minHeight: 74, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 11, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  homeRouteOptionSelected: { borderColor: C.success, backgroundColor: '#F0FDF4' },
  homeRouteOptionFastSelected: { borderColor: C.warning, backgroundColor: '#FFFBEB' },
  homeRouteIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.successSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  homeRouteIconFast: { backgroundColor: C.warningSoft },
  homeRouteCopy: { flex: 1 },
  homeRouteTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  homeRouteTitle: { fontFamily: 'Inter_700Bold', color: C.foreground, fontSize: 14 },
  homeRecommended: { fontFamily: 'Inter_700Bold', color: C.success, fontSize: 8, letterSpacing: 0.5 },
  homeNotRecommended: { fontFamily: 'Inter_700Bold', color: C.warning, fontSize: 8, letterSpacing: 0.5 },
  homeRouteMeta: { fontFamily: 'Inter_400Regular', color: C.mutedForeground, fontSize: 11, marginTop: 5 },
  tripDetails: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 11, marginTop: 2, marginBottom: 4 },
  tripDetail: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  tripDetailText: { fontFamily: 'Inter_500Medium', color: C.mutedForeground, fontSize: 11 },
  navigationLive: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.dangerSoft, borderRadius: 10, padding: 9, marginTop: 9 },
  navigationLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.destructive, marginRight: 7 },
  navigationLiveText: { flex: 1, fontFamily: 'Inter_600SemiBold', color: '#B91C1C', fontSize: 10 },
  homeActionRow: { flexDirection: 'row', gap: 9, marginTop: 17, marginBottom: 3 },
  homeActionCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12 },
  homeActionIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  homeActionTitle: { fontFamily: 'Inter_700Bold', color: C.foreground, fontSize: 12 },
  homeActionSub: { fontFamily: 'Inter_400Regular', color: C.mutedForeground, fontSize: 10, marginTop: 4 },
  statusBanner: { borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  statusSafe: { backgroundColor: C.successSoft, borderColor: '#BBF7D0' },
  statusDanger: { backgroundColor: C.dangerSoft, borderColor: '#FECACA' },
  statusIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, marginLeft: 12 },
  statusTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: C.foreground, marginBottom: 3 },
  statusSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: C.mutedForeground },
  statRow: { flexDirection: 'row', gap: 9, marginBottom: 24 },
  statCard: { flex: 1, minHeight: 112, backgroundColor: C.card, borderRadius: 15, borderWidth: 1, borderColor: C.border, padding: 12, shadowColor: '#000', shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: C.mutedForeground, marginBottom: 4 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11, marginTop: 4 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: C.foreground },
  sectionAction: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: C.primary },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  quickAction: { alignItems: 'center', width: '23%' },
  quickIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  quickLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: C.foreground },
  alertList: { gap: 9, marginBottom: 19 },
  alertRow: { borderLeftWidth: 4, backgroundColor: C.card, borderRadius: 13, borderTopLeftRadius: 4, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border, padding: 13, flexDirection: 'row', alignItems: 'center', minHeight: 76, shadowColor: '#000', shadowOpacity: 0.025, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  alertRowCompact: { minHeight: 72, paddingVertical: 11 },
  alertIcon: { width: 35, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  alertCopy: { flex: 1, minWidth: 0 },
  alertTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.foreground, marginBottom: 4 },
  alertSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, color: C.mutedForeground },
  alertMeta: { alignItems: 'flex-end', marginLeft: 6 },
  alertDistance: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: C.primary, backgroundColor: C.secondary, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, marginBottom: 5 },
  alertTime: { fontFamily: 'Inter_400Regular', fontSize: 10, color: C.mutedForeground },
  sosButton: { height: 54, borderRadius: 15, backgroundColor: C.destructive, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, marginTop: 2 },
  sosButtonText: { fontFamily: 'Inter_700Bold', color: C.primaryForeground, fontSize: 14, letterSpacing: 0.7 },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, height: Platform.OS === 'web' ? 84 : 70, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, paddingBottom: Platform.OS === 'web' ? 30 : 6 },
  navItem: { alignItems: 'center', justifyContent: 'flex-start', flex: 1 },
  navIconWrap: { height: 27, minWidth: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  navIconWrapActive: { backgroundColor: C.secondary },
  navLabel: { fontFamily: 'Inter_500Medium', color: '#94A3B8', fontSize: 10, marginTop: 3 },
  navLabelActive: { color: C.primary, fontFamily: 'Inter_700Bold' },
  inputStack: { gap: 10, marginBottom: 16 },
  inputShell: { height: 52, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  inputText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: C.foreground },
  textInput: { flex: 1, height: '100%', fontFamily: 'Inter_400Regular', color: C.foreground, fontSize: 14 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.successSoft, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
  liveText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#15803D' },
  mapPlaceholder: { height: 200, backgroundColor: '#E2E8F0', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  mapIconCircle: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#CBD5E1', marginBottom: 10 },
  mapTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.mutedForeground, textTransform: 'capitalize' },
  mapSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#94A3B8', marginTop: 4 },
  routeEmergencyBanner: { backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 21 },
  routeEmergencyIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: C.destructive, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  routeEmergencyCopy: { flex: 1 },
  routeEmergencyTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#881337', marginBottom: 4 },
  routeEmergencySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 10, color: '#9F1239', lineHeight: 14 },
  routeEmergencyButton: { backgroundColor: C.destructive, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 2 },
  routeEmergencyButtonText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: C.primaryForeground, letterSpacing: 0.5 },
  routeCard: { backgroundColor: C.card, borderRadius: 15, borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, padding: 14, marginBottom: 11 },
  routeCardSelected: { borderColor: C.primary, shadowColor: C.primary, shadowOpacity: 0.09, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recommendedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  recommendedText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: C.success, textTransform: 'uppercase', letterSpacing: 0.4 },
  notRecommendedText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: C.destructive, textTransform: 'uppercase', letterSpacing: 0.4 },
  routeTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: C.foreground },
  routeStats: { fontFamily: 'Inter_500Medium', fontSize: 12, color: C.mutedForeground, marginTop: 10 },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: C.success },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.success },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  successChip: { backgroundColor: C.successSoft, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 8 },
  dangerChip: { backgroundColor: C.dangerSoft, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 8 },
  chipTextSuccess: { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#15803D' },
  chipTextDanger: { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#B91C1C' },
  button: { height: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 9 },
  button_primary: { backgroundColor: C.primary },
  button_outline: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.primary },
  button_danger: { backgroundColor: C.destructive },
  button_soft: { backgroundColor: C.secondary },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: C.primaryForeground, letterSpacing: 0.1 },
  buttonTextOutline: { color: C.primary },
  buttonTextSoft: { color: C.primary },
  monitoringPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.successSoft, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 8 },
  monitoringDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
  monitoringText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#15803D' },
  monitoringRow: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  settingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: C.foreground, marginBottom: 4 },
  settingSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, color: C.mutedForeground },
  scannerCard: { backgroundColor: C.card, borderRadius: 15, borderWidth: 1, borderColor: C.border, padding: 15, marginBottom: 11, shadowColor: '#000', shadowOpacity: 0.025, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  scannerCardHeader: { flexDirection: 'row', alignItems: 'center' },
  scannerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  scannerTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: C.foreground, flex: 1 },
  badge: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 7 },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  scannerDescription: { fontFamily: 'Inter_400Regular', color: C.mutedForeground, fontSize: 12, marginVertical: 11 },
  outlineSmallButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8 },
  outlineSmallText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: C.primary },
  urlRow: { flexDirection: 'row', borderWidth: 1, borderColor: C.border, borderRadius: 10, height: 44, alignItems: 'center', marginTop: 12, overflow: 'hidden' },
  urlInput: { flex: 1, height: '100%', paddingHorizontal: 11, fontFamily: 'Inter_400Regular', color: C.foreground, fontSize: 12 },
  checkButton: { height: '100%', backgroundColor: C.primary, justifyContent: 'center', paddingHorizontal: 14 },
  checkButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: C.primaryForeground },
  readyText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: C.mutedForeground, marginTop: 9 },
  threatCard: { backgroundColor: '#FEF2F2', borderRadius: 13, borderWidth: 1, borderColor: '#FECACA', padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  threatIcon: { width: 37, height: 37, borderRadius: 11, backgroundColor: '#FECACA', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  threatCopy: { flex: 1 },
  severityHigh: { color: C.destructive, fontFamily: 'Inter_700Bold', fontSize: 11, backgroundColor: '#FECACA', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  severityMedium: { color: '#C2410C', fontFamily: 'Inter_700Bold', fontSize: 11, backgroundColor: '#FED7AA', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  alertCount: { width: 28, height: 28, borderRadius: 10, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center' },
  alertCountText: { fontFamily: 'Inter_700Bold', color: C.primary, fontSize: 12 },
  filterTabs: { flexDirection: 'row', backgroundColor: C.muted, borderRadius: 11, padding: 4, marginBottom: 15 },
  filterTab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  filterTabActive: { backgroundColor: C.card, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  filterText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: C.mutedForeground },
  filterTextActive: { fontFamily: 'Inter_700Bold', color: C.primary },
  liveAlertList: { gap: 9 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 90 },
  emptyIcon: { width: 66, height: 66, borderRadius: 24, backgroundColor: C.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: C.foreground },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: C.mutedForeground, marginTop: 5 },
  sosHero: { alignItems: 'center', paddingTop: 22, paddingBottom: 27 },
  sosCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: C.destructive, alignItems: 'center', justifyContent: 'center', shadowColor: C.destructive, shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 7 },
  sosText: { fontFamily: 'Inter_700Bold', color: C.primaryForeground, fontSize: 32, letterSpacing: 2 },
  sosHint: { fontFamily: 'Inter_400Regular', color: C.mutedForeground, fontSize: 12, textAlign: 'center', marginTop: 17, marginBottom: 4 },
  contactRow: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  contactAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  contactInitials: { fontFamily: 'Inter_700Bold', fontSize: 13, color: C.primary },
  contactCopy: { flex: 1 },
  contactName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: C.foreground, marginBottom: 3 },
  contactRelation: { fontFamily: 'Inter_400Regular', fontSize: 11, color: C.mutedForeground },
  callButton: { borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 10 },
  callButtonText: { fontFamily: 'Inter_600SemiBold', color: C.destructive, fontSize: 11 },
  servicesRow: { flexDirection: 'row', gap: 8 },
  serviceCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 11, minHeight: 140 },
  serviceIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  serviceLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: C.foreground, lineHeight: 15 },
  serviceDistance: { fontFamily: 'Inter_400Regular', fontSize: 10, color: C.mutedForeground, marginTop: 4 },
  callIconButton: { width: 27, height: 27, borderRadius: 9, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  profileCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 23 },
  profileAvatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  profileInitials: { fontFamily: 'Inter_700Bold', fontSize: 19, color: C.primaryForeground },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 18, color: C.foreground, marginBottom: 4 },
  profileMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: C.mutedForeground, marginBottom: 7 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontFamily: 'Inter_600SemiBold', color: C.success, fontSize: 10 },
  editButton: { marginLeft: 'auto', width: 34, height: 34, borderRadius: 11, backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center' },
  settingsCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 15, overflow: 'hidden' },
  settingRow: { minHeight: 55, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border },
  settingLeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  settingLabel: { fontFamily: 'Inter_500Medium', color: C.foreground, fontSize: 13 },
  contactsEditor: { padding: 12, backgroundColor: '#F8FAFC' },
  aboutRow: { marginTop: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, minHeight: 56, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 22 },
  logoutText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: C.destructive },
  splash: { flex: 1, backgroundColor: C.card, paddingHorizontal: 25, justifyContent: 'space-between' },
  splashContent: { alignItems: 'center', paddingTop: 102 },
  splashLogo: { width: 96, height: 96, borderRadius: 32, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 22, shadowColor: C.primary, shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  splashTitle: { fontFamily: 'Inter_700Bold', fontSize: 29, letterSpacing: -0.8, color: C.foreground },
  splashAccent: { color: C.primary },
  splashSubtitle: { fontFamily: 'Inter_400Regular', textAlign: 'center', color: C.mutedForeground, fontSize: 14, lineHeight: 22, marginTop: 9 },
  splashTrust: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 28, backgroundColor: C.successSoft, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 9 },
  splashTrustText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#15803D' },
  splashBottom: { paddingBottom: 5 },
  splashFootnote: { fontFamily: 'Inter_400Regular', textAlign: 'center', fontSize: 10, color: C.mutedForeground, marginTop: 15 },
});
