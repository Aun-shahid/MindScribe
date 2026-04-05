import { useEffect, useState, useCallback } from 'react';
import {
  AppState,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
// FIX 3: Use SafeAreaView from react-native-safe-area-context, not react-native
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing as ReanimatedEasing,
  cancelAnimation,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import TabLoaderCard from '../components/TabLoaderCard';
import PatientService, { DashboardData } from '../services/patient.service';

const screenHeight = Dimensions.get('window').height;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const CARD_GRADIENT_COLORS = ['rgba(255,179,107,0.11)', 'rgba(167,139,250,0.08)', 'rgba(52,41,73,0.72)'] as const;
const CARD_BG = '#3F3752';
const CARD_BORDER = 'rgba(255,255,255,0.16)';

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊', sad: '😢', angry: '😠', anxious: '😰',
  peaceful: '😌', excited: '🤩', grateful: '🙏',
  overwhelmed: '😵', hopeful: '🌟', stressed: '😫',
};

function useBubbleAnim() {
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  return { y, x };
}

export default function Dashboard() {
  const { user, profileLoading, fetchProfile } = useAuthContext();
  const { themeStyle } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const today = new Date();
  const todayLabel = `${today.toLocaleDateString('en-US', { weekday: 'short' })}, ${today.toLocaleDateString('en-US', { day: '2-digit' })} ${today.toLocaleDateString('en-US', { month: 'short' })} ${today.getFullYear()}`;

  const pageInset              = clamp(width * 0.04, 11, 16);
  const lowerCardInset         = clamp(pageInset + 2, 13, 18);
  const dashboardCardSideInset = clamp(lowerCardInset + 6, 19, 24);
  const cardRowContainerInset  = Math.max(0, dashboardCardSideInset - 6);
  const headerTopPadding       = insets.top + clamp(height * 0.005, 2, 5);

  const dateFontSize        = clamp(width * 0.034, 12, 14);
  const dateIconSize        = clamp(width * 0.038, 14, 16);
  const notifCircleSize     = clamp(width * 0.12, 44, 50);
  const notifIconSize       = clamp(width * 0.043, 16, 18);
  const notifBadgeMinW      = clamp(width * 0.045, 16, 18);
  const notifBadgeH         = clamp(width * 0.045, 16, 18);
  const titleFontSize       = clamp(width * 0.074, 25, 31);
  const titleLineHeight     = Math.round(titleFontSize * 1.12);
  const statIconSize        = clamp(width * 0.051, 18, 20);
  const statBubbleSize      = clamp(width * 0.09, 32, 36);
  const statLabelSize       = clamp(width * 0.03, 11, 12);
  const statNumberSize      = clamp(width * 0.041, 15, 18);
  const graphCardInset      = dashboardCardSideInset;
  const graphCardPadding    = clamp(width * 0.045, 16, 18);
  const graphTitleSize      = clamp(width * 0.041, 15, 17);
  const graphSubtitleSize   = clamp(width * 0.03, 11, 12);
  const graphIconBubbleSize = clamp(width * 0.09, 32, 36);
  const graphIconSize       = clamp(width * 0.046, 17, 19);
  const quickSectionInset   = cardRowContainerInset;
  const quickHeaderInset    = clamp(quickSectionInset + 6, 18, 24);
  const quickTitleSize      = clamp(width * 0.041, 15, 17);
  const quickActionCardH    = clamp(height * 0.14, 94, 112);
  const quickActionIconSize = clamp(width * 0.09, 32, 36);
  const quickActionGlyphSz  = clamp(width * 0.056, 20, 22);
  const quickActionTextSize = clamp(width * 0.032, 12, 13);

  const bubbleLarge  = clamp(width * 0.74, 220, 320);
  const bubbleMedium = clamp(width * 0.56, 170, 260);
  const bubbleSmall  = clamp(width * 0.34, 110, 160);

  // ─── State ──────────────────────────────────────────────────────────────────
  const [dashboardData, setDashboardData]   = useState<DashboardData | null>(null);
  const [loading, setLoading]               = useState<boolean>(true);
  const [refreshing, setRefreshing]         = useState<boolean>(false);
  const [error, setError]                   = useState<string | null>(null);
  const [unreadCount, setUnreadCount]       = useState<number>(0);
  const [groupedSessions, setGroupedSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
  const [sessionsModalVisible, setSessionsModalVisible] = useState<boolean>(false);
  const [selectedSession, setSelectedSession]           = useState<any>(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState<boolean>(false);
  const [connectModalVisible, setConnectModalVisible]   = useState<boolean>(false);
  const [therapistPin, setTherapistPin]     = useState<string>('');
  const [connectMessage, setConnectMessage] = useState<string>('');
  const [sessionsCount, setSessionsCount]   = useState<number | null>(null);
  const [weeklyTrendFallback]               = useState<any[] | null>(null);
  const [weeklyTrendData]                   = useState<any[] | null>(null);
  const [tooltipIndex, setTooltipIndex]     = useState<number | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // ─── Reanimated bubbles ───────────────────────────────────────────────────
  const b1 = useBubbleAnim();
  const b2 = useBubbleAnim();
  const b3 = useBubbleAnim();
  const b4 = useBubbleAnim();
  const b5 = useBubbleAnim();

  const b1Style = useAnimatedStyle(() => ({ transform: [{ translateY: b1.y.value }, { translateX: b1.x.value }] }));
  const b2Style = useAnimatedStyle(() => ({ transform: [{ translateY: b2.y.value }, { translateX: b2.x.value }] }));
  const b3Style = useAnimatedStyle(() => ({ transform: [{ translateY: b3.y.value }, { translateX: b3.x.value }] }));
  const b4Style = useAnimatedStyle(() => ({ transform: [{ translateY: b4.y.value }, { translateX: b4.x.value }] }));
  const b5Style = useAnimatedStyle(() => ({ transform: [{ translateY: b5.y.value }, { translateX: b5.x.value }] }));

  const startBubble = useCallback((
    sv: { y: ReturnType<typeof useSharedValue<number>>; x: ReturnType<typeof useSharedValue<number>> },
    dY: number, dX: number, delayY = 0, delayX = 0,
  ) => {
    sv.y.value = 0; sv.x.value = 0;
    sv.y.value = withDelay(delayY, withRepeat(withSequence(
      withTiming(50,  { duration: dY, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
      withTiming(-50, { duration: dY, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
    ), -1, true));
    sv.x.value = withDelay(delayX, withRepeat(withSequence(
      withTiming(30,  { duration: dX, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
      withTiming(-30, { duration: dX, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
    ), -1, true));
  }, []);

  const stopBubbles = useCallback(() => {
    [b1, b2, b3, b4, b5].forEach(({ y, x }) => { cancelAnimation(y); cancelAnimation(x); });
  }, [b1, b2, b3, b4, b5]);

  const startBubbles = useCallback(() => {
    startBubble(b1, 8000, 7000,    0,  500);
    startBubble(b2, 9000, 8500, 1000, 1500);
    startBubble(b3, 10000, 9000, 500,    0);
    startBubble(b4, 8500, 10000, 1500, 1000);
    startBubble(b5, 9500, 8000,    0, 2000);
  }, [b1, b2, b3, b4, b5, startBubble]);

  useFocusEffect(useCallback(() => {
    startBubbles();
    return () => stopBubbles();
  }, [startBubbles, stopBubbles]));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') startBubbles(); else stopBubbles();
    });
    return () => { sub.remove(); stopBubbles(); };
  }, [startBubbles, stopBubbles]);

  // ─── Chart reveal animation ───────────────────────────────────────────────
  const chartRevealProgress = useSharedValue(0);

  // FIX 1: chartAnimMaxWidth is computed from layout-stable values (width, insets)
  // NOT set via setState inside render. We compute it directly from dimensions.
  const chartWidth        = Math.min(width - graphCardInset * 2 - graphCardPadding * 2, 604);
  const chartHInset       = clamp(width * 0.02, 8, 12);
  const chartLeftNudge    = clamp(width * 0.01, 3, 6) * 8;
  const chartAnimMaxWidth = chartWidth + chartLeftNudge + chartHInset;
  const plotWidth         = Math.max(220, chartWidth - chartHInset * 2);

  const chartMaskStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: chartRevealProgress.value * (chartAnimMaxWidth + 24) }],
  }));

  useEffect(() => {
    const weekly =
      dashboardData?.mood_trend ??
      (dashboardData as any)?.weekly_moods ??
      weeklyTrendData ??
      [];
    if (Array.isArray(weekly) && weekly.length > 0) {
      chartRevealProgress.value = 0;
      chartRevealProgress.value = withTiming(1, {
        duration: 2400,
        easing: ReanimatedEasing.out(ReanimatedEasing.quad),
      });
    }
  }, [dashboardData, weeklyTrendData, chartAnimMaxWidth, chartRevealProgress]);

  // ─── Data loading ──────────────────────────────────────────────────────────
  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await PatientService.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (e) { console.warn('[Dashboard] unread count error', e); }
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null); setLoading(true);
      const data = await PatientService.getDashboardData();
      setDashboardData(data);
      try {
        const sessData: any = await PatientService.getMySessions('upcoming', 1, 0);
        const total = typeof sessData === 'object'
          ? sessData.total_count ?? (Array.isArray(sessData.sessions) ? sessData.sessions.length : null)
          : null;
        setSessionsCount(total ?? null);
      } catch { setSessionsCount(null); }
      await loadUnreadCount();
    } catch (err: any) {
      const respData = err?.response?.data;
      let msg = 'Failed to load dashboard data';
      if (typeof respData === 'string' && respData.trim().startsWith('<'))
        msg = 'Server error (500) — backend returned HTML.';
      else
        msg = respData?.detail || respData?.error || respData?.message || err?.message || msg;
      setError(String(msg));
    } finally { setLoading(false); setRefreshing(false); }
  }, [loadUnreadCount]);

  useEffect(() => { fetchProfile(); loadDashboardData(); }, [fetchProfile, loadDashboardData]);
  useFocusEffect(useCallback(() => { loadUnreadCount(); }, [loadUnreadCount]));
  const onRefresh = () => { setRefreshing(true); loadDashboardData(); };

  // ─── Early returns ────────────────────────────────────────────────────────
  if (profileLoading || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#342949' }]}>
        <TabLoaderCard title="Loading Dashboard" subtitle="Preparing your insights and sessions..." spinnerColor="#A78BFA" fullScreen />
      </View>
    );
  }
  if (!user) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themeStyle.background }]}>
        <Text style={[styles.errorText, { color: themeStyle.error }]}>⚠️ Failed to load profile. Try logging in again.</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: themeStyle.logoutButton }]} onPress={() => router.push('../auth/login')}>
          <Text style={[styles.btnlabel, { color: themeStyle.logoutText }]}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCardPress = (screen: string) => { try { router.push(screen as any); } catch { router.push('./profile'); } };
  const closeConnectModal  = () => setConnectModalVisible(false);
  const closeSessionsModal = () => { setSessionsModalVisible(false); setSelectedSession(null); };

  const handleConnect = async () => {
    if (!therapistPin || therapistPin.trim().length === 0) { Alert.alert('Enter PIN', 'Please enter the therapist PIN'); return; }
    try {
      await PatientService.connectTherapist(therapistPin.trim(), connectMessage.trim());
      Alert.alert('Request Sent', 'Connection request created. Your therapist must approve it.');
      closeConnectModal(); loadDashboardData();
    } catch (err: any) {
      const respData = err?.response?.data;
      if (respData?.detail === 'You are already connected to this therapist.') {
        await fetchProfile(); await loadDashboardData(); closeConnectModal();
        Alert.alert('Connected', 'You are already connected to this therapist.'); return;
      }
      Alert.alert('Error', String(respData || err?.message || 'Failed to send connection request'));
    }
  };

  const loadSessions = async (filter: 'upcoming' | 'past' = 'upcoming') => {
    try {
      setSessionsLoading(true);
      const data = await PatientService.getMySessions(filter, 50, 0);
      const sessions = Array.isArray(data) ? data : (data?.sessions || []);
      const flatSessions: any[] = Array.isArray(sessions) ? sessions : [...(sessions.upcoming || []), ...(sessions.past || [])];
      const groups: Record<string, any[]> = {};
      flatSessions.forEach((s: any) => { const k = s.therapist?.id ? String(s.therapist.id) : 'no'; if (!groups[k]) groups[k] = []; groups[k].push(s); });
      setGroupedSessions(Object.keys(groups).map((k) => ({ therapist: groups[k][0]?.therapist || null, sessions: groups[k] })));
    } catch { setGroupedSessions([]); }
    finally { setSessionsLoading(false); }
  };

  const viewSessionDetail = async (sessionId: string) => {
    try { setSessionDetailLoading(true); const res = await PatientService.getSession(sessionId); setSelectedSession(res?.session || res); }
    catch { Alert.alert('Error', 'Failed to load session details'); }
    finally { setSessionDetailLoading(false); }
  };

  const formatMoodLabel = (raw: string | undefined | null) => {
    if (!raw) return '—';
    try {
      const stripped = raw.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[^\w\s\-])/gu, '').trim();
      if (!stripped) return '—';
      const first = stripped.split('\n')[0].split(' ')[0];
      return first.length > 12 ? first.substring(0, 11) + '…' : first;
    } catch { return raw; }
  };

  const formatMoodName = (raw: string | undefined | null) => {
    if (!raw) return 'Mood';
    try {
      const stripped = raw.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[^\w\s\-])/gu, '').trim();
      if (!stripped) return 'Mood';
      return stripped.split(' ').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    } catch { return String(raw); }
  };

  // ─── Chart data (computed once, not inside render callbacks) ──────────────
  const weekly: any[] = dashboardData?.mood_trend ?? (dashboardData as any)?.weekly_moods ?? weeklyTrendData ?? weeklyTrendFallback ?? [];
  const chartLabels  = Array.isArray(weekly) ? weekly.map((d: any) => { if (d.date) { try { return new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }); } catch { return d.day || d.date || ''; } } return d.day || ''; }) : [];
  const chartMoods   = Array.isArray(weekly) ? weekly.map((d: any) => d.mood_label || d.mood || '') : [];
  const chartValues  = Array.isArray(weekly) ? weekly.map((d: any) => Math.max(0, Math.round(d.intensity ?? d.avg_intensity ?? 0))) : [];
  const moodEmojis   = chartMoods.map((m: string) => MOOD_EMOJIS[(m || '').toLowerCase()] || '😐');
  const hasTrend     = chartValues.some((v: number) => v > 0);
  const hasWeekly    = Array.isArray(weekly) && weekly.length > 0;

  // FIX 2: react-native-chart-kit's color() fn must return a valid CSS colour on native.
  // "url(#lineGradient)" only works in a web SVG context — on native it logs warnings and
  // renders nothing. Use a solid colour instead. The decorator still injects the SVG
  // gradient definition but we can't use it as the line colour on native.
  const chartConfig = {
    backgroundGradientFrom: 'transparent',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: 'transparent',
    backgroundGradientToOpacity: 0,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 138, 91, ${opacity})`,  // solid orange — no url() reference
    labelColor: () => '#B8A8E6',
    style: { borderRadius: 12 },
  };

  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : [''],
    datasets: [{ data: chartValues.length > 0 ? chartValues : [0], color: (opacity = 1) => `rgba(111, 216, 190, ${opacity})` }],
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      <LinearGradient colors={['#342949', '#2A1F3D', '#342949']} start={[0,0]} end={[0,1]}
        style={[styles.screenGradient, { height: screenHeight }]} pointerEvents="none" />

      <View style={styles.floatingBubbles} pointerEvents="none">
        <Animated.View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium, top: '10%', left: '-10%', backgroundColor: 'rgba(167,139,250,0.15)' }, b1Style]} />
        <Animated.View style={[styles.bubble, { width: bubbleLarge,  height: bubbleLarge,  top: '25%', right: '-15%', backgroundColor: 'rgba(184,168,230,0.18)' }, b2Style]} />
        <Animated.View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium, top: '50%', left: '10%',  backgroundColor: 'rgba(167,139,250,0.13)' }, b3Style]} />
        <Animated.View style={[styles.bubble, { width: bubbleLarge * 0.78, height: bubbleLarge * 0.78, bottom: '15%', right: '5%', backgroundColor: 'rgba(184,168,230,0.22)' }, b4Style]} />
        <Animated.View style={[styles.bubble, { width: bubbleSmall, height: bubbleSmall, bottom: '30%', left: '-5%', backgroundColor: 'rgba(167,139,250,0.19)' }, b5Style]} />
      </View>

      <FlatList
        data={[]}
        style={[styles.contentAboveGradient, { backgroundColor: 'transparent' }]}
        contentContainerStyle={{ backgroundColor: 'transparent' }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={null}
        ListEmptyComponent={null}
        ListHeaderComponent={
          // FIX 1: Pass a stable element (not an inline arrow function) so React
          // doesn't re-mount it on every render and trigger setState-during-render.
          <DashboardHeader
            // layout tokens
            headerTopPadding={headerTopPadding}
            dashboardCardSideInset={dashboardCardSideInset}
            cardRowContainerInset={cardRowContainerInset}
            width={width}
            height={height}
            // header row
            todayLabel={todayLabel}
            dateFontSize={dateFontSize}
            dateIconSize={dateIconSize}
            notifCircleSize={notifCircleSize}
            notifIconSize={notifIconSize}
            notifBadgeMinW={notifBadgeMinW}
            notifBadgeH={notifBadgeH}
            unreadCount={unreadCount}
            // title
            titleFontSize={titleFontSize}
            titleLineHeight={titleLineHeight}
            firstName={user.first_name}
            // stats
            statBubbleSize={statBubbleSize}
            statIconSize={statIconSize}
            statLabelSize={statLabelSize}
            statNumberSize={statNumberSize}
            sessionsCount={sessionsCount}
            dashboardData={dashboardData}
            formatMoodLabel={formatMoodLabel}
            // inspiration
            graphCardInset={graphCardInset}
            graphCardPadding={graphCardPadding}
            graphTitleSize={graphTitleSize}
            graphSubtitleSize={graphSubtitleSize}
            graphIconBubbleSize={graphIconBubbleSize}
            graphIconSize={graphIconSize}
            // chart
            hasWeekly={hasWeekly}
            chartWidth={chartWidth}
            chartHInset={chartHInset}
            chartLeftNudge={chartLeftNudge}
            plotWidth={plotWidth}
            chartData={chartData}
            chartConfig={chartConfig}
            chartMaskStyle={chartMaskStyle}
            hasTrend={hasTrend}
            tooltipVisible={tooltipVisible}
            tooltipIndex={tooltipIndex}
            moodEmojis={moodEmojis}
            chartMoods={chartMoods}
            chartValues={chartValues}
            setTooltipVisible={setTooltipVisible}
            setTooltipIndex={setTooltipIndex}
            formatMoodName={formatMoodName}
            // quick actions
            quickSectionInset={quickSectionInset}
            quickHeaderInset={quickHeaderInset}
            quickTitleSize={quickTitleSize}
            quickActionCardH={quickActionCardH}
            quickActionIconSize={quickActionIconSize}
            quickActionGlyphSz={quickActionGlyphSz}
            quickActionTextSize={quickActionTextSize}
            handleCardPress={handleCardPress}
            // error + journals
            error={error}
            recent_journal_entries={dashboardData?.recent_journal_entries}
          />
        }
      />

      {/* ── MODALS ── */}
      <Modal visible={connectModalVisible} animationType="slide" onRequestClose={closeConnectModal}>
        <SafeAreaView style={[styles.modalWrapper, { backgroundColor: themeStyle.background }]}>
          <ScrollView contentContainerStyle={styles.modalContainer}>
            <Text style={[styles.modalTitle, { color: themeStyle.title }]}>Connect with Your Therapist</Text>
            <Text style={[styles.modalHint, { color: themeStyle.label }]}>Scan the QR code provided by your therapist or enter the code manually.</Text>
            <View style={styles.cameraPlaceholder}><Text style={{ color: themeStyle.label }}>Enter the code manually below</Text></View>
            <View style={styles.orDivider}><Text style={{ color: themeStyle.label }}>OR ENTER MANUALLY</Text></View>
            <Text style={[styles.inputLabel, { color: themeStyle.label }]}>Therapist Code</Text>
            <TextInput value={therapistPin} onChangeText={setTherapistPin} placeholder="Enter the code from your therapist" placeholderTextColor={themeStyle.label} style={[styles.textInput, { borderColor: '#6b6b80', color: themeStyle.text }]} />
            <Text style={[styles.inputLabel, { color: themeStyle.label }]}>Message (optional)</Text>
            <TextInput value={connectMessage} onChangeText={setConnectMessage} placeholder="Add a short message for your therapist" placeholderTextColor={themeStyle.label} style={[styles.textInput, { borderColor: '#6b6b80', color: themeStyle.text }]} />
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#7b61ff' }]} onPress={handleConnect}><Text style={styles.btnlabel}>Connect to Therapist</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12 }} onPress={closeConnectModal}><Text style={{ color: themeStyle.label }}>Skip for now</Text></TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={sessionsModalVisible} animationType="slide" onRequestClose={closeSessionsModal}>
        <SafeAreaView style={[styles.modalWrapper, { backgroundColor: themeStyle.background }]}>
          <View style={styles.modalContainer}>
            <Text style={[styles.modalTitle, { color: themeStyle.title }]}>Your Sessions</Text>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <TouchableOpacity onPress={() => loadSessions('upcoming')} style={{ marginRight: 12 }}><Text style={{ color: themeStyle.text }}>Upcoming</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => loadSessions('past')}><Text style={{ color: themeStyle.text }}>Past</Text></TouchableOpacity>
            </View>
            {sessionsLoading ? <TabLoaderCard spinnerColor={themeStyle.text} icon="brain" /> : (
              <ScrollView>
                {groupedSessions.length === 0 && <Text style={{ color: themeStyle.label, marginVertical: 8 }}>No sessions found.</Text>}
                {groupedSessions.map((group: any, gidx: number) => (
                  <View key={`group-${gidx}`} style={{ marginBottom: 16 }}>
                    <View style={[styles.glassCard, { padding: 12, marginBottom: 8 }]}>
                      <LinearGradient colors={CARD_GRADIENT_COLORS} start={{ x:0,y:0 }} end={{ x:1,y:1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
                      <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>{group.therapist ? group.therapist.full_name : 'Other Sessions'}</Text>
                      {group.therapist?.specialization && <Text style={{ color: '#B8A8E6', fontSize: 13 }}>{group.therapist.specialization}</Text>}
                    </View>
                    {group.sessions.map((item: any) => (
                      <View key={item.id} style={[styles.glassCard, { padding: 14, marginBottom: 8 }]}>
                        <LinearGradient colors={CARD_GRADIENT_COLORS} start={{ x:0,y:0 }} end={{ x:1,y:1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
                        <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>{item.session_number ? `Session #${item.session_number}` : 'Session'}</Text>
                        <Text style={{ color: '#B8A8E6', fontSize: 13 }}>{new Date(item.scheduled_date).toLocaleString()}</Text>
                        <Text style={{ color: '#B8A8E6', fontSize: 13 }}>{item.status}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                          <TouchableOpacity style={{ backgroundColor: '#6b6b80', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }} onPress={() => viewSessionDetail(item.id)}>
                            <Text style={{ color: '#fff', fontWeight: '600' }}>See details</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#6b6b80' }]} onPress={closeSessionsModal}><Text style={styles.btnlabel}>Close</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={!!selectedSession} animationType="slide" onRequestClose={() => setSelectedSession(null)}>
        <SafeAreaView style={[styles.modalWrapper, { backgroundColor: themeStyle.background }]}>
          <ScrollView contentContainerStyle={styles.modalContainer}>
            <Text style={[styles.modalTitle, { color: themeStyle.title }]}>Session Details</Text>
            {sessionDetailLoading ? <TabLoaderCard spinnerColor={themeStyle.text} icon="brain" /> : selectedSession ? (
              <View>
                <Text style={{ color: themeStyle.label, marginBottom: 8 }}>Date:</Text>
                <Text style={{ color: themeStyle.text, marginBottom: 12 }}>{new Date(selectedSession.scheduled_date).toLocaleString()}</Text>
                <Text style={{ color: themeStyle.label, marginBottom: 8 }}>Summary:</Text>
                <Text style={{ color: themeStyle.text, marginBottom: 12 }}>{selectedSession.session_summary || 'No summary available.'}</Text>
                <Text style={{ color: themeStyle.label, marginBottom: 8 }}>Goals:</Text>
                <Text style={{ color: themeStyle.text, marginBottom: 12 }}>{selectedSession.patient_goals || 'N/A'}</Text>
                <Text style={{ color: themeStyle.label, marginBottom: 8 }}>Homework:</Text>
                <Text style={{ color: themeStyle.text, marginBottom: 12 }}>{selectedSession.homework_assigned || 'N/A'}</Text>
                <Text style={{ color: themeStyle.label, marginBottom: 8 }}>Next Session Goals:</Text>
                <Text style={{ color: themeStyle.text, marginBottom: 12 }}>{selectedSession.next_session_goals || 'N/A'}</Text>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#6b6b80' }]} onPress={() => setSelectedSession(null)}><Text style={styles.btnlabel}>Close</Text></TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─── Extracted header component ───────────────────────────────────────────────
// Pulling all the ListHeaderComponent content into a named component means React
// gets a stable reference and will never trigger "setState during render".
function DashboardHeader(p: any) {
  const { width, height } = p;
  const clampLocal = clamp;

  return (
    <>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: p.headerTopPadding }]}>
        <View style={[styles.headerMetaRow, { marginHorizontal: p.dashboardCardSideInset }]}>
          <View style={[styles.dateBadge, { gap: clampLocal(width * 0.02, 6, 8) }]}>
            <MaterialIcons name="calendar-today" size={p.dateIconSize} color="rgba(255,255,255,0.72)" />
            <Text style={[styles.dateBadgeText, { fontSize: p.dateFontSize }]}>{p.todayLabel}</Text>
          </View>
          <TouchableOpacity
            style={[styles.notificationCircle, { width: p.notifCircleSize, height: p.notifCircleSize, borderRadius: p.notifCircleSize / 2 }]}
            onPress={() => router.push('./notifications' as any)}
          >
            <View style={{ position: 'relative' }}>
              <FontAwesome name="bell" size={p.notifIconSize} color="#FFFFFF" />
              {p.unreadCount > 0 && (
                <View style={[styles.notificationBadge, { minWidth: p.notifBadgeMinW, height: p.notifBadgeH, borderRadius: p.notifBadgeH / 2 }]}>
                  <Text style={styles.notificationBadgeText}>{p.unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.headerIdentityRow, { marginTop: clampLocal(height * 0.012, 10, 14) }]}>
          <Text style={[styles.headerTitleLarge, { fontSize: p.titleFontSize, lineHeight: p.titleLineHeight }]} numberOfLines={2}>
            <Text style={styles.headerTitleWhite}>Hi, </Text>
            <Text style={styles.headerTitlePurple}>{p.firstName}!</Text>
          </Text>
        </View>

        <View style={[styles.headerStatsRowNew, { marginTop: clampLocal(height * 0.02, 18, 24), marginHorizontal: p.cardRowContainerInset }]}>
          {[
            { label: 'Sessions', value: String(p.sessionsCount ?? (p.dashboardData?.upcoming_sessions?.length ?? 0)), iconBg: '#FFE8EC', iconColor: '#FF6B86', icon: 'monitor-heart' as const },
            { label: 'Mood',     value: p.formatMoodLabel(p.dashboardData?.mood_today?.mood_display || p.dashboardData?.mood_today?.mood), iconBg: '#FFF1E3', iconColor: '#FFB36B', icon: 'favorite' as const },
            { label: 'Goals',   value: String(p.dashboardData?.active_goals_count ?? 0), iconBg: '#E9FAF5', iconColor: '#6FD8BE', icon: 'flag' as const },
          ].map((stat, i) => (
            <View key={i} style={[styles.topStatCard, { minHeight: clampLocal(height * 0.13, 90, 110) }]}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{ x:0,y:0 }} end={{ x:1,y:1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
              <View style={[styles.topStatIcon, { width: p.statBubbleSize, height: p.statBubbleSize, borderRadius: p.statBubbleSize / 2, backgroundColor: stat.iconBg }]}>
                <MaterialIcons name={stat.icon} size={p.statIconSize} color={stat.iconColor} />
              </View>
              <Text style={[styles.topStatLabel, { fontSize: p.statLabelSize }]}>{stat.label}</Text>
              <Text style={[styles.topStatNumber, { fontSize: p.statNumberSize }]}>{stat.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* DAILY INSPIRATION */}
      {p.dashboardData?.daily_inspiration && (
        <View style={[styles.glassCard, { marginHorizontal: p.dashboardCardSideInset, marginBottom: clampLocal(height * 0.025, 16, 22), padding: clampLocal(width * 0.05, 16, 20) }]}>
          <LinearGradient colors={CARD_GRADIENT_COLORS} start={{ x:0,y:0 }} end={{ x:1,y:1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
          <Text style={[styles.inspirationTitle, { fontSize: clampLocal(width * 0.046, 16, 19) }]}>💡 Daily Inspiration</Text>
          <Text style={[styles.quote, { fontSize: clampLocal(width * 0.038, 14, 16) }]}>{`"${p.dashboardData.daily_inspiration.quote}"`}</Text>
          <Text style={[styles.author, { fontSize: clampLocal(width * 0.033, 12, 14) }]}>— {p.dashboardData.daily_inspiration.author}</Text>
          {p.dashboardData.daily_inspiration.reflection_prompt && (
            <Text style={[styles.reflection, { fontSize: clampLocal(width * 0.033, 12, 14) }]}>🤔 {p.dashboardData.daily_inspiration.reflection_prompt}</Text>
          )}
        </View>
      )}

      {/* WEEKLY MOOD CHART */}
      {!p.hasWeekly ? (
        <View style={[styles.glassCard, { marginHorizontal: p.graphCardInset, marginBottom: clampLocal(height * 0.025, 16, 22), padding: p.graphCardPadding }]}>
          <LinearGradient colors={CARD_GRADIENT_COLORS} start={{ x:0,y:0 }} end={{ x:1,y:1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
          <Text style={[styles.graphTitle, { fontSize: p.graphTitleSize }]}>This Week&apos;s Mood</Text>
          <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#B8A8E6' }}>No mood data yet</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.glassCard, { marginHorizontal: p.graphCardInset, marginBottom: clampLocal(height * 0.025, 16, 22) }]}>
          <LinearGradient colors={CARD_GRADIENT_COLORS} start={{ x:0,y:0 }} end={{ x:1,y:1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
          <View style={{ padding: p.graphCardPadding }}>
            <View style={styles.graphHeaderRow}>
              <View>
                <Text style={[styles.graphTitle, { fontSize: p.graphTitleSize }]}>This Week&apos;s Mood</Text>
                <Text style={[styles.graphSubtitle, { fontSize: p.graphSubtitleSize }]}>Your emotional journey</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('./mood?tab=weekly' as any)}>
                <LinearGradient colors={['#FF7A7A', '#FFB36B']} style={[styles.graphIconBubble, { width: p.graphIconBubbleSize, height: p.graphIconBubbleSize, borderRadius: p.graphIconBubbleSize / 2 }]}>
                  <MaterialIcons name="trending-up" size={p.graphIconSize} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {typeof LineChart === 'function' && (
              <View style={styles.graphChartWrapper} onTouchStart={() => p.setTooltipVisible(false)}>
                <View style={{ position: 'relative', alignItems: 'center' }}>
                  <View style={{ width: p.chartWidth, overflow: 'hidden' }}>
                    <View style={{ position: 'relative' }}>
                      <View style={{ paddingHorizontal: p.chartHInset, borderRadius: 12, overflow: 'hidden' }}>
                        <LineChart
                          data={p.chartData}
                          width={p.plotWidth}
                          height={190}
                          fromZero bezier withDots
                          chartConfig={{
                            ...p.chartConfig,
                            propsForDots: { r: '4.5', strokeWidth: '2', stroke: '#FF7A7A', fill: '#FFFFFF' },
                            propsForBackgroundLines: { stroke: 'rgba(255,255,255,0.08)' },
                            decimalPlaces: 0,
                          }}
                          style={{ borderRadius: 14, marginVertical: 4, marginLeft: -p.chartLeftNudge }}
                          withInnerLines withShadow={false} withVerticalLines={false} withHorizontalLabels={false}
                          formatYLabel={() => ''}
                          onDataPointClick={(data) => {
                            if (!p.hasTrend || data.index >= p.chartValues.length || data.index < 0 || !p.chartValues[data.index] || p.chartValues[data.index] <= 0) {
                              p.setTooltipVisible(false); return;
                            }
                            p.setTooltipIndex(data.index); p.setTooltipVisible(true);
                          }}
                        />
                      </View>
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.chartRevealMask,
                          { width: p.chartWidth + 24 },
                          p.chartMaskStyle,
                        ]}
                      />
                    </View>
                  </View>

                  {p.hasTrend && p.tooltipVisible && p.tooltipIndex !== null && p.tooltipIndex >= 0 && p.tooltipIndex < p.chartValues.length && p.chartValues[p.tooltipIndex] > 0 && (
                    <View style={[styles.tooltip, {
                      left: p.chartHInset - p.chartLeftNudge + (p.plotWidth / Math.max(1, p.chartValues.length - 1)) * p.tooltipIndex + (width - p.chartWidth) / 2 - 46,
                      top: 6,
                    }]}>
                      <View style={styles.tooltipEmojiBubble}>
                        <Text style={styles.tooltipEmojiText}>{p.moodEmojis[p.tooltipIndex] || '😐'}</Text>
                      </View>
                      <Text style={styles.tooltipMoodText}>{p.formatMoodName(p.chartMoods[p.tooltipIndex] || '')}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* QUICK ACTIONS */}
      <View style={[styles.quickActionsSection, { marginHorizontal: p.quickSectionInset, marginTop: clampLocal(height * 0.016, 12, 16) }]}>
        <View style={[styles.quickActionsHeader, { marginHorizontal: p.quickHeaderInset - p.quickSectionInset }]}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={[styles.quickActionsTitle, { color: '#FFFFFF', fontSize: p.quickTitleSize }]}>Quick Actions</Text>
            <TouchableOpacity onPress={() => router.push('./actions' as any)} activeOpacity={0.7}>
              <Text style={{ color: '#9D8EC7', fontSize: clampLocal(width * 0.028, 10, 11), fontWeight: '600' }}>More in Actions tab →</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#7A6E9A', fontSize: clampLocal(width * 0.03, 11, 12), marginTop: 3 }}>Shortcuts to your most-used features</Text>
        </View>
        <View style={styles.quickActionsGrid}>
          <View style={styles.quickActionsRow}>
            {[
              { route: './connect-with-therapist?from=dashboard', iconBg: '#FFE7EF', icon: <FontAwesome name="comment"  size={p.quickActionGlyphSz} color="#FF6B86" />, label: 'Connect with Therapist' },
              { route: './mood?from=dashboard',                   iconBg: '#FFF1E3', icon: <MaterialIcons name="local-cafe" size={p.quickActionGlyphSz} color="#FF9F6B" />, label: 'Take a Mood Break' },
              { route: './sessions?from=dashboard',              iconBg: '#EEE9FF', icon: <FontAwesome name="calendar" size={p.quickActionGlyphSz} color="#8B7BFF" />, label: 'View Sessions' },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={[styles.quickActionCard, { minHeight: p.quickActionCardH }]} onPress={() => p.handleCardPress(item.route)} activeOpacity={0.8}>
                <LinearGradient colors={CARD_GRADIENT_COLORS} start={{ x:0,y:0 }} end={{ x:1,y:1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
                <View style={[styles.quickActionIconWrap, { width: p.quickActionIconSize, height: p.quickActionIconSize, borderRadius: p.quickActionIconSize / 2, backgroundColor: item.iconBg }]}>
                  {item.icon}
                </View>
                <Text style={[styles.quickActionText, { fontSize: p.quickActionTextSize }]} numberOfLines={2}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {p.error && (
        <View style={[styles.errorBanner, { backgroundColor: '#fee', marginHorizontal: p.dashboardCardSideInset }]}>
          <Text style={[styles.errorText, { color: '#c00' }]}>⚠️ {p.error}</Text>
        </View>
      )}

      {/* RECENT JOURNALS */}
      {p.recent_journal_entries && p.recent_journal_entries.length > 0 && (
        <View style={[styles.recentSection, { marginTop: clampLocal(height * 0.032, 22, 30) }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: clampLocal(height * 0.016, 10, 14), marginHorizontal: p.dashboardCardSideInset }}>
            <Text style={[styles.quickActionsTitle, { color: '#FFFFFF', fontSize: p.quickTitleSize }]}>Recent Journals</Text>
            <TouchableOpacity onPress={() => router.push('./journal-list' as any)}>
              <Text style={{ color: '#B8A8E6', fontWeight: '600', fontSize: clampLocal(width * 0.034, 12, 14) }}>View All</Text>
            </TouchableOpacity>
          </View>
          {p.recent_journal_entries.slice(0, 2).map((entry: any) => (
            <TouchableOpacity key={entry.id} style={[styles.glassCard, { marginHorizontal: p.dashboardCardSideInset, marginBottom: clampLocal(height * 0.018, 12, 16) }]}
              onPress={() => router.push(`./journal-detail?id=${entry.id}` as any)} activeOpacity={0.8}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{ x:0,y:0 }} end={{ x:1,y:1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
              <View style={{ padding: clampLocal(width * 0.045, 14, 18), flexDirection: 'row', alignItems: 'center' }}>
                <LinearGradient colors={['#FFB6B6', '#FF9F6B']} start={[0,0]} end={[1,1]} style={styles.journalIconCircle}>
                  <FontAwesome name="book" size={clampLocal(width * 0.045, 16, 19)} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: clampLocal(width * 0.03, 10, 13) }}>
                  <Text style={[styles.journalTitle, { fontSize: clampLocal(width * 0.038, 14, 16) }]} numberOfLines={1}>{entry.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <FontAwesome name="calendar" size={clampLocal(width * 0.028, 10, 12)} color="#B8A8E6" />
                    <Text style={[styles.journalDate, { marginLeft: 5, fontSize: clampLocal(width * 0.03, 11, 13) }]}>
                      {new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={[styles.journalContent, { fontSize: clampLocal(width * 0.033, 12, 14), marginTop: 4 }]} numberOfLines={1} ellipsizeMode="tail">{entry.content}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: clampLocal(height * 0.04, 28, 40) }} />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper:               { flex: 1, backgroundColor: '#342949' },
  screenGradient:        { position: 'absolute', top: 0, left: 0, right: 0, width: '100%', zIndex: 0 },
  floatingBubbles:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' },
  bubble:                { position: 'absolute', borderRadius: 9999 },
  contentAboveGradient:  { zIndex: 1 },
  header:                { marginBottom: 12, paddingBottom: 18, backgroundColor: 'transparent' },
  headerMetaRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBadge:             { flexDirection: 'row', alignItems: 'center', flexShrink: 1, paddingVertical: 4 },
  dateBadgeText:         { color: 'rgba(255,255,255,0.72)', fontWeight: '600' },
  notificationCircle:    { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 12 },
  notificationBadge:     { position: 'absolute', right: -8, top: -8, backgroundColor: '#F39C43', paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  notificationBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  headerIdentityRow:     { alignItems: 'center' },
  headerTitleLarge:      { fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  headerTitleWhite:      { color: '#FFFFFF' },
  headerTitlePurple:     { color: '#B8A8E6' },
  headerStatsRowNew:     { flexDirection: 'row', justifyContent: 'space-between' },
  glassCard: {
    borderRadius: 16, overflow: 'hidden', backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: CARD_BORDER,
    shadowColor: '#120A24', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 6,
  },
  topStatCard: {
    flex: 1, marginHorizontal: 6, paddingVertical: 16, paddingHorizontal: 12,
    borderRadius: 16, alignItems: 'flex-start', justifyContent: 'center', overflow: 'hidden',
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER,
    shadowColor: '#120A24', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 6,
  },
  topStatIcon:           { alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  topStatNumber:         { fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  topStatLabel:          { color: '#B8A8E6' },
  inspirationTitle:      { fontWeight: '700', marginBottom: 12, color: '#FFFFFF' },
  quote:                 { fontStyle: 'italic', marginBottom: 8, lineHeight: 22, color: '#E5DCF9' },
  author:                { textAlign: 'right', marginBottom: 10, color: '#B8A8E6' },
  reflection:            { lineHeight: 20, color: '#CEC2EE' },
  graphHeaderRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  graphTitle:            { fontWeight: '700', color: '#FFFFFF' },
  graphSubtitle:         { color: '#9D8EC7', marginTop: 2 },
  graphIconBubble:       { alignItems: 'center', justifyContent: 'center' },
  graphChartWrapper:     { alignItems: 'center' },
  quickActionsSection:   { marginBottom: 6, backgroundColor: 'transparent' },
  quickActionsHeader:    { marginBottom: 10 },
  quickActionsTitle:     { fontWeight: '700' },
  quickActionsGrid:      { flexDirection: 'column' },
  quickActionsRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  quickActionCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 18, marginHorizontal: 6,
    borderRadius: 16, paddingHorizontal: 8, overflow: 'hidden', backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: CARD_BORDER,
    shadowColor: '#120A24', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 6,
  },
  quickActionIconWrap:   { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickActionText:       { color: '#FFFFFF', fontWeight: '600', textAlign: 'center', lineHeight: 16, maxWidth: 100 },
  recentSection:         { marginBottom: 8 },
  journalIconCircle:     { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  journalTitle:          { fontWeight: '700', color: '#FFFFFF', flex: 1 },
  journalDate:           { color: '#B8A8E6' },
  journalContent:        { lineHeight: 18, color: '#CEC2EE' },
  chartRevealMask:       { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: CARD_BG, opacity: 0.98 },
  tooltip: {
    position: 'absolute', backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 14, alignItems: 'center', minWidth: 92,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4,
  },
  tooltipEmojiBubble:    { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFE8EC', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tooltipEmojiText:      { fontSize: 16 },
  tooltipMoodText:       { fontSize: 12, fontWeight: '700', color: '#4B4A78' },
  errorBanner:           { padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText:             { fontSize: 16, textAlign: 'center' },
  errorContainer:        { flex: 1, justifyContent: 'center', padding: 24 },
  loadingContainer:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btn:                   { width: 200, borderRadius: 50, paddingVertical: 12, alignItems: 'center', marginTop: 30 },
  btnlabel:              { color: 'white', fontSize: 22, fontWeight: '600' },
  modalWrapper:          { flex: 1 },
  modalContainer:        { padding: 20 },
  modalTitle:            { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  modalHint:             { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  cameraPlaceholder:     { height: 180, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#777', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  orDivider:             { marginTop: 12, marginBottom: 12, alignItems: 'center' },
  inputLabel:            { fontSize: 14, marginTop: 8, marginBottom: 6 },
  textInput:             { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 },
  cardTitle:             { fontSize: 16, fontWeight: '600', marginBottom: 4 },
});
