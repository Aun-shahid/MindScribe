


import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus, Platform, StatusBar } from 'react-native';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
  
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import PatientService, { DashboardData } from '../services/patient.service';
import eventBus from '../utils/eventBus';
import api from '../utils/api';
import { Modal, TextInput, Alert } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
const CARD_WIDTH = screenWidth / 2 - 32; // Two cards per row, minus padding/margin

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  anxious: '😰',
  peaceful: '😌',
  excited: '🤩',
  grateful: '🙏',
  overwhelmed: '😵',
  hopeful: '🌟',
  stressed: '😫',
};

type DashboardCard = {
  id: string;
  title: string;
  subtitle: string;
  screen: string;
};
export default function Dashboard() {
  const { user, profileLoading, fetchProfile } = useAuthContext();
  const { themeStyle } = useTheme();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [groupedSessions, setGroupedSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
  const [sessionsModalVisible, setSessionsModalVisible] = useState<boolean>(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState<boolean>(false);

    const [connectModalVisible, setConnectModalVisible] = useState<boolean>(false);
  const [therapistPin, setTherapistPin] = useState<string>('');
  const [connectMessage, setConnectMessage] = useState<string>('');
  const [sessionsCount, setSessionsCount] = useState<number | null>(null);
  const [weeklyTrendFallback, setWeeklyTrendFallback] = useState<any[] | null>(null);
  const [weeklyTrendData, setWeeklyTrendData] = useState<any[] | null>(null);
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [animatedValues, setAnimatedValues] = useState<number[]>([]);
  const [animationSeed, setAnimationSeed] = useState(0);

  // const [refreshing, setRefreshing] = useState(false);
  // const [dashboardData, setDashboardData] = useState<any>(null);
  // const [error, setError] = useState<string | null>(null);

  // ────────── Load Dashboard Data ──────────
  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const data = await PatientService.getDashboardData();
      setDashboardData(data);

      // Fetch sessions count for "Next Session" modal
      try {
        const sessData: any = await PatientService.getMySessions('upcoming', 1, 0);
        const total =
          typeof sessData === 'object'
            ? sessData.total_count ?? (Array.isArray(sessData.sessions) ? sessData.sessions.length : null)
            : null;
        setSessionsCount(total ?? null);
      } catch (e) {
        console.warn('[Dashboard] failed to fetch sessions count', e);
        setSessionsCount(null);
      }
    } catch (err: any) {
      console.error('[Dashboard] Error loading data:', err);
      const respData = err?.response?.data;

      if (respData) {
        console.error('[Dashboard] response.data:', respData);
      }

      let msg = 'Failed to load dashboard data';
      if (typeof respData === 'string' && respData.trim().startsWith('<')) {
        msg = 'Server error (500) — backend returned HTML. Ask the backend deployer to check server logs.';
        console.error('[Dashboard] backend HTML (trimmed):', respData.substring(0, 1000));
      } else {
        msg = respData?.detail || respData?.error || respData?.message || err?.message || msg;
      }

      setError(String(msg));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ────────── Effects ──────────
  useEffect(() => {
    fetchProfile();
    loadDashboardData();
  }, [fetchProfile, loadDashboardData]);

  // ────────── Refresh Handler ──────────
  const onRefresh = () => {
    setRefreshing(true);
    setAnimationSeed((s) => s + 1);
    loadDashboardData();
  };

  // ────────── Loading / Error States ──────────
  if (profileLoading || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeStyle.background }]}>
        <ActivityIndicator size="large" color={themeStyle.text} />
        <Text style={[styles.loadingText, { color: themeStyle.label }]}>Loading your dashboard...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themeStyle.background }]}>
        <Text style={[styles.errorText, { color: themeStyle.error }]}>
          ⚠️ Failed to load profile. Try logging in again.
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: themeStyle.logoutButton }]}
          onPress={() => router.push('../auth/login')}>
          <Text style={[styles.btnlabel, { color: themeStyle.logoutText }]}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ────────── Navigation Handler ──────────
  const handleCardPress = (screen: string) => {
    try {
      console.log('Navigating to:', screen);
      router.push(screen as any);
    } catch (error) {
      console.error('Navigation error:', error);
      router.push('./profile');
    }
  };

  // --- Connect Therapist modal handlers ---

  const openConnectModal = () => {
    setTherapistPin('');
    setConnectMessage('');
    setConnectModalVisible(true);
  };

  const closeConnectModal = () => {
    setConnectModalVisible(false);
  };

  const handleConnect = async () => {
    if (!therapistPin || therapistPin.trim().length === 0) {
      Alert.alert('Enter PIN', 'Please enter the therapist PIN or scan the QR code');
      return;
    }
    try {
      const res = await PatientService.connectTherapist(therapistPin.trim(), connectMessage.trim());
      Alert.alert('Request Sent', 'Connection request created. Your therapist must approve it.');
      closeConnectModal();
      // Optionally refresh dashboard
      loadDashboardData();
      
    } catch (err: any) {
      console.error('[Connect] error', err);
      const respData = err?.response?.data;
      // If server says user is already connected, refresh profile/dashboard automatically
      if (respData && (respData.detail === 'You are already connected to this therapist.' || (typeof respData === 'string' && respData.includes('already connected')))) {
        // refresh state
        await fetchProfile();
        await loadDashboardData();
        closeConnectModal();
        Alert.alert('Connected', 'You are already connected to this therapist. Dashboard updated.');
        return;
      }

      const msg = respData || err?.message || 'Failed to send connection request';
      Alert.alert('Error', String(msg));
    }
  };

  const handleDisconnect = async () => {
    Alert.alert('Disconnect', 'Are you sure you want to disconnect from your therapist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, disconnect',
        style: 'destructive',
            onPress: async () => {
          try {
            await PatientService.disconnectTherapist();
            Alert.alert('Disconnected', 'You have been disconnected from your therapist.');
            loadDashboardData();
          } catch (err: any) {
            console.error('[Disconnect] error', err);
            Alert.alert('Error', err?.response?.data || err?.message || 'Failed to disconnect');
          }
        }
      }
    ]);
  };

  const openSessionsModal = async () => {
    setSessionsModalVisible(true);
    await loadSessions('upcoming');
  };

  const closeSessionsModal = () => {
    setSessionsModalVisible(false);
    setSessionsList([]);
    setSelectedSession(null);
  };

  const loadSessions = async (filter: 'upcoming' | 'past' = 'upcoming') => {
    try {
      setSessionsLoading(true);
      const data = await PatientService.getMySessions(filter, 50, 0);
      // backend returns { user_type, filter_applied, total_count, sessions, ... }
      const sessions = Array.isArray(data) ? data : (data?.sessions || []);
      let flatSessions: any[] = [];
      if (Array.isArray(sessions)) {
        flatSessions = sessions;
      } else if (sessions && typeof sessions === 'object') {
        // may have upcoming/past buckets
        flatSessions = [ ...(sessions.upcoming || []), ...(sessions.past || []) ];
      }

      setSessionsList(flatSessions);

      // Group by therapist (therapist.id or fallback)
      const groups: Record<string, any[]> = {};
      flatSessions.forEach((s: any) => {
        const t = s.therapist || null;
        const key = t && t.id ? String(t.id) : 'no_therapist';
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      });

      const grouped = Object.keys(groups).map((k) => ({
        therapist: groups[k][0]?.therapist || null,
        sessions: groups[k]
      }));
      setGroupedSessions(grouped);
    } catch (err: any) {
      console.error('[Sessions] load error', err);
      setSessionsList([]);
      setGroupedSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const viewSessionDetail = async (sessionId: string) => {
    try {
      setSessionDetailLoading(true);
      const res = await PatientService.getSession(sessionId);
      const session = res?.session || res?.session || res;
      setSelectedSession(session);
    } catch (err: any) {
      console.error('[Session Detail] error', err);
      Alert.alert('Error', 'Failed to load session details');
    } finally {
      setSessionDetailLoading(false);
    }
  };

  

  // Format mood data for display
  const getMoodDisplay = () => {
    if (!dashboardData?.mood_today) return 'Not tracked yet';
    const mood: any = dashboardData.mood_today;
    return mood.mood_display || mood.mood || 'Not tracked yet';
  };

  // Format next session
  const getNextSessionDisplay = () => {
    if (!dashboardData?.next_session) return 'No upcoming sessions';
    const session = dashboardData.next_session;
    return session.display || session.time || 'See session details';
  };

  // Weekly trend preview: link to full weekly trend screen

  const getNextSessionSubtitle = () => {
    if (!dashboardData?.next_session) return 'No upcoming sessions';
    const session = dashboardData.next_session as any;
    // prefer therapist name or generic text; avoid showing time here
    return session.therapist || 'See session details';
  };

  // Format mood label: remove emoji/special chars and shorten
  const formatMoodLabel = (raw: string | undefined | null) => {
    if (!raw) return '—';
    try {
      // strip common emoji ranges and control characters
      const stripped = raw.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[^\w\s\-])/gu, '').trim();
      if (!stripped) return '—';
      // show first word or short phrase (max 12 chars)
      const first = stripped.split('\n')[0].split(' ')[0];
      return first.length > 12 ? (first.substring(0, 11) + '…') : first;
    } catch (e) {
      return raw;
    }
  };

  const formatMoodName = (raw: string | undefined | null) => {
    if (!raw) return 'Mood';
    try {
      const stripped = raw.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[^\w\s\-])/gu, '').trim();
      if (!stripped) return 'Mood';
      return stripped
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    } catch (e) {
      return String(raw);
    }
  };

  // Get journal subtitle
  const getJournalSubtitle = () => {
    const count = dashboardData?.journal_count_this_month || 0;
    return `${count} ${count === 1 ? 'entry' : 'entries'} this month`;
  };

  // Get goals subtitle
  const getGoalsSubtitle = () => {
    const active = dashboardData?.active_goals_count || 0;
    const completed = dashboardData?.completed_goals_count || 0;
    return `${active} active, ${completed} completed`;
  };

  // Get relaxation subtitle
  const getRelaxationSubtitle = () => {
    const minutes = dashboardData?.relaxation_minutes_this_week || 0;
    return `${minutes} minutes this week`;
  };

  // Dynamic dashboard cards based on API data
  const dashboardCards: DashboardCard[] = [
    {
      id: 'mood',
      title: 'Write Your Mood',
      subtitle: 'Open your mood tracker to log how you feel',
      screen: './mood',
    },
    {
      id: 'journalEntries',
      title: 'Journaling Companion',
      subtitle: 'Capture thoughts, feelings, and progress',
      screen: './journal-list',
    },
    {
      id: 'nextSession',
      title: 'Session Information',
      subtitle: 'See session details',
      screen: './sessions',
    },
    {
      id: 'goals',
      title: 'Goals',
      subtitle: 'Track progress and milestones',
      screen: './goals',
    },
    {
      id: 'break',
      title: 'Take a Break',
      subtitle: 'Short guided breaks and calming sounds',
      screen: './take-a-break',
    },
  ];

  const renderCard = ({ item }: { item: DashboardCard }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: themeStyle.dashboardcard || '#ffffff', width: CARD_WIDTH }]}
      onPress={() => handleCardPress(item.screen)}
    >
      <Text style={[styles.cardTitle, { color: themeStyle.title }]}>{item.title}</Text>
      <Text style={[styles.cardSubtitle, { color: themeStyle.text }]}>{item.subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: '#FFFFFF' }]}>
      {/* subtle top-right gradient wash across the whole screen */}
      <LinearGradient
        colors={['rgba(255,230,221,0.95)', 'rgba(231,250,245,0.7)', 'rgba(255,255,255,0.0)']}
        start={[0.15, 0]}
        end={[1, 1]}
        style={[styles.screenGradient, { height: screenHeight } ]}
        pointerEvents="none"
      />
      <FlatList
        data={[]}
        style={styles.contentAboveGradient}
        ListHeaderComponent={() => (
          <>
            {/* Top header with greeting and stat cards */}
            <View style={[styles.header, { paddingVertical: 26, paddingHorizontal: 18 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.headerTitleLarge]}>Welcome, {user.first_name}</Text>
                </View>
                <TouchableOpacity style={{ marginLeft: 12 }} onPress={() => router.push('./notifications' as any)}>
                  <View style={{ position: 'relative', padding: 6, marginTop: -2 }}>
                    <FontAwesome name="bell" size={22} color={'#524f85'} />
                    {unreadCount > 0 && (
                      <View style={{ position: 'absolute', right: 2, top: 2, backgroundColor: '#ff3b30', borderRadius: 8, minWidth: 16, paddingHorizontal: 4, height: 16, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.headerStatsRowNew}>
                <View style={styles.topStatCard}>
                  <View style={[styles.topStatIcon, { backgroundColor: '#FFE8EC' }]}> 
                    <MaterialIcons name="monitor-heart" size={20} color={'#FF6B86'} />
                  </View>
                  <Text style={[styles.topStatLabel]}>Sessions</Text>
                  <Text style={[styles.topStatNumber]}>{sessionsCount ?? (dashboardData?.upcoming_sessions?.length ?? 0)}</Text>
                </View>
                <View style={[styles.topStatCard, { marginHorizontal: 8 }]}> 
                  <View style={[styles.topStatIcon, { backgroundColor: '#FFF1E3' }]}>
                    <MaterialIcons name="favorite" size={20} color={'#FFB36B'} />
                  </View>
                  <Text style={[styles.topStatLabel]}>Mood</Text>
                  <Text style={[styles.topStatNumber]}>{formatMoodLabel(dashboardData?.mood_today?.mood_display || dashboardData?.mood_today?.mood)}</Text>
                </View>
                <View style={styles.topStatCard}>
                  <View style={[styles.topStatIcon, { backgroundColor: '#E9FAF5' }]}>
                    <MaterialIcons name="flag" size={20} color={'#6FD8BE'} />
                  </View>
                  <Text style={[styles.topStatLabel]}>Goals</Text>
                  <Text style={[styles.topStatNumber]}>{dashboardData?.active_goals_count ?? 0}</Text>
                </View>
              </View>
            </View>

            {/* Connect actions moved to a full-width card below the chart */}

            {/* Daily Inspiration Card */}
            {dashboardData?.daily_inspiration && (
              <View style={[styles.inspirationCard, { backgroundColor: themeStyle.dashboardcard || '#f0f8ff' }]}>
                <Text style={[styles.inspirationTitle, { color: themeStyle.title }]}>💡 Daily Inspiration</Text>
                <Text style={[styles.quote, { color: themeStyle.text }]}>"{dashboardData.daily_inspiration.quote}"</Text>
                <Text style={[styles.author, { color: themeStyle.label }]}>— {dashboardData.daily_inspiration.author}</Text>
                {dashboardData.daily_inspiration.reflection_prompt && (
                  <Text style={[styles.reflection, { color: themeStyle.text }]}>🤔 {dashboardData.daily_inspiration.reflection_prompt}</Text>
                )}
              </View>
            )}

            {/* removed legacy quick stats row - stats now show inside the purple header */}

            {/* Weekly Mood Trend — modern BarChart using react-native-chart-kit */}
              {(() => {
              // Prepare weekly trend variables (guard against missing backend fields)
              const weekly: any[] =
                dashboardData?.mood_trend ??
                (dashboardData as any)?.weekly_moods ??
                weeklyTrendData ??
                weeklyTrendFallback ??
                [];

              const labels = Array.isArray(weekly)
                ? weekly.map((d: any) => {
                    if (d.date) {
                      try {
                        return new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' });
                      } catch (e) {
                        return d.day || d.date || '';
                      }
                    }
                    // fallback to provided day label or empty
                    return d.day || '';
                  })
                : [];
              const moods = Array.isArray(weekly) ? weekly.map((d: any) => d.mood_label || d.mood || '') : [];
              const values = Array.isArray(weekly) ? weekly.map((d: any) => Math.max(0, Math.round(d.intensity ?? d.avg_intensity ?? 0))) : [];
              const moodEmojis = moods.map((m: string) => MOOD_EMOJIS[(m || '').toLowerCase()] || '😐');
              const hasTrend = values.some((v: number) => v > 0);

              if (!weekly || weekly.length === 0) {
                return (
                  <View style={[styles.trendWrapper, { backgroundColor: themeStyle.dashboardcard || '#fff' }]}>
                    <Text style={[styles.trendTitle, { color: themeStyle.title }]}>This Week's Mood</Text>
                    <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: themeStyle.label }}>No mood data yet</Text>
                    </View>
                    {/* removed legacy small "View Weekly Trend" button in favor of full chart/cards */}
                  </View>
                );
              }
              // Debug: log weekly mapping so we can inspect missing intensity fields at runtime
              console.log('[Dashboard] weekly trend raw:', weekly);
              console.log('[Dashboard] weekly trend labels:', labels, 'values:', values, 'moods:', moods);
              const chartWidth = Math.min(screenWidth - 48, 640);

              const chartData = {
                labels,
                datasets: [{ data: (animatedValues.length === values.length ? animatedValues : values) }]
              };

              const chartConfig = {
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => 'url(#lineGradient)',
                labelColor: (opacity = 1) => '#8D8BA7',
                style: { borderRadius: 12 },
              };

              return (
                <View style={[styles.graphCard]}>
                  <View style={styles.graphHeaderRow}>
                    <View>
                      <Text style={styles.graphTitle}>This Week's Mood</Text>
                      <Text style={styles.graphSubtitle}>Your emotional journey</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('./mood-weekly-trend' as any)}>
                      <LinearGradient colors={['#FF7A7A', '#FFB36B']} style={styles.graphIconBubble}>
                        <MaterialIcons name="trending-up" size={18} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                      {typeof LineChart === 'function' ? (
                        <>
                          <View style={styles.graphChartWrapper} onTouchStart={() => setTooltipVisible(false)}>
                            <View style={{ position: 'relative', alignItems: 'center' }}>
                              <View style={{ width: chartWidth }}>
                                <LineChart
                                  data={chartData}
                                  width={chartWidth}
                                  height={190}
                                  fromZero
                                  bezier
                                  withDots
                                  chartConfig={{
                                    ...chartConfig,
                                    propsForDots: {
                                      r: '4.5',
                                      strokeWidth: '2',
                                      stroke: '#FF7A7A',
                                      fill: '#FFFFFF',
                                    },
                                    propsForBackgroundLines: {
                                      stroke: 'rgba(0,0,0,0)'
                                    },
                                    decimalPlaces: 0,
                                  }}
                                  style={{ borderRadius: 14, marginVertical: 4 }}
                                  withInnerLines={false}
                                  withShadow={false}
                                  withVerticalLines={false}
                                  formatYLabel={() => ''}
                                  onDataPointClick={(data) => {
                                    if (!hasTrend) {
                                      setTooltipVisible(false);
                                      return;
                                    }
                                    if (!values[data.index] || values[data.index] <= 0) {
                                      setTooltipVisible(false);
                                      return;
                                    }
                                    setTooltipIndex(data.index);
                                    setTooltipVisible(true);
                                  }}
                                  decorator={() => (
                                    <Defs>
                                      <SvgLinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                                        <Stop offset="0%" stopColor="#FF8A5B" stopOpacity="1" />
                                        <Stop offset="100%" stopColor="#6FD8BE" stopOpacity="1" />
                                      </SvgLinearGradient>
                                    </Defs>
                                  )}
                                />
                              </View>
                              {hasTrend && tooltipVisible && tooltipIndex !== null && values[tooltipIndex] > 0 && (
                                <View
                                  style={[
                                    styles.tooltip,
                                    {
                                      left: ((chartWidth / Math.max(1, (values.length - 1))) * tooltipIndex) + ((screenWidth - chartWidth)/2) - 46,
                                      top: 6
                                    }
                                  ]}
                                >
                                  <View style={styles.tooltipEmojiBubble}>
                                    <Text style={styles.tooltipEmojiText}>{moodEmojis[tooltipIndex] || '😐'}</Text>
                                  </View>
                                  <Text style={styles.tooltipMoodText}>{formatMoodName(moods[tooltipIndex])}</Text>
                                </View>
                              )}
                            </View>
                          </View>

                                  
                        </>
                      ) : (
                    <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: themeStyle.label }}>Chart unavailable — try restarting the app.</Text>
                    </View>
                  )}
                  {/* removed legacy "Open Full Trend" button to keep UI concise */}
                </View>
              );
            })()}

            {/* duplicate Connect card removed (keep quick-actions connect) */}

            {/* Quick actions grid (no outer card) */}
            <View style={styles.quickActionsSection}>
              <View style={styles.quickActionsHeader}>
                <Text style={[styles.quickActionsTitle, { color: themeStyle.title }]}>Quick Actions</Text>
              </View>
              <View style={styles.quickActionsGrid}>
                <View style={styles.quickActionsRow}>
                  <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: themeStyle.dashboardcard || '#fff' }]} onPress={() => router.push('./connect-with-therapist' as any)}>
                    <View style={[styles.quickActionIconWrap, { backgroundColor: '#FFE7EF' }]}>
                      <FontAwesome name="comment" size={22} color="#FF6B86" />
                    </View>
                    <Text style={styles.quickActionText} numberOfLines={2}>Connect with Therapist</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: themeStyle.dashboardcard || '#fff' }]} onPress={() => handleCardPress('./mood')}>
                    <View style={[styles.quickActionIconWrap, { backgroundColor: '#FFF1E3' }]}>
                      <MaterialIcons name="local-cafe" size={22} color="#FF9F6B" />
                    </View>
                    <Text style={styles.quickActionText} numberOfLines={2}>Take a Mood Break</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: themeStyle.dashboardcard || '#fff' }]} onPress={() => handleCardPress('./journal-list')}>
                    <View style={[styles.quickActionIconWrap, { backgroundColor: '#E8FAF4' }]}>
                      <FontAwesome name="book" size={22} color="#4BC7B0" />
                    </View>
                    <Text style={styles.quickActionText}>Journaling</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.quickActionsRow}>
                  <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: themeStyle.dashboardcard || '#fff' }]} onPress={() => handleCardPress('./goals')}>
                    <View style={[styles.quickActionIconWrap, { backgroundColor: '#EEE9FF' }]}>
                      <MaterialIcons name="add" size={22} color="#8B7BFF" />
                    </View>
                    <Text style={styles.quickActionText}>Add a Goal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: themeStyle.dashboardcard || '#fff' }]} onPress={() => openSessionsModal()}>
                    <View style={[styles.quickActionIconWrap, { backgroundColor: '#FFE7EF' }]}>
                      <FontAwesome name="calendar" size={22} color="#FF6B86" />
                    </View>
                    <Text style={styles.quickActionText}>View Sessions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: themeStyle.dashboardcard || '#fff' }]} onPress={() => handleCardPress('./take-a-break')}>
                    <View style={[styles.quickActionIconWrap, { backgroundColor: '#FFF1E3' }]}>
                      <MaterialIcons name="local-cafe" size={22} color="#FF9F6B" />
                    </View>
                    <Text style={styles.quickActionText}>Take a Break</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <View style={[styles.errorBanner, { backgroundColor: '#fee' }]}>
                <Text style={[styles.errorText, { color: '#c00' }]}>⚠️ {error}</Text>
              </View>
            )}

            {/* Legacy dashboard card grid removed — replaced by image-style quick cards above */}

            {/* Recent Journal Entries */}
            {dashboardData?.recent_journal_entries && dashboardData.recent_journal_entries.length > 0 && (
              <View style={styles.recentSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginHorizontal: 12 }}>
                  <Text style={[styles.quickActionsTitle, { color: themeStyle.title }]}>Recent Journals</Text>
                  <TouchableOpacity onPress={() => router.push('./journal-list' as any)}>
                    <Text style={{ color: themeStyle.progressbarmain || '#49467E', fontWeight: '600' }}>View All</Text>
                  </TouchableOpacity>
                </View>
                {dashboardData.recent_journal_entries.slice(0, 2).map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={[styles.journalCard, { backgroundColor: themeStyle.dashboardcard || '#ffffff' }]}
                    onPress={() => router.push(`./journal-detail?id=${entry.id}` as any)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <LinearGradient
                        colors={["#FFB6B6", "#FF9F6B"]}
                        start={[0,0]}
                        end={[1,1]}
                        style={styles.journalIconCircle}
                      >
                        <FontAwesome name="book" size={18} color="#fff" />
                      </LinearGradient>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.journalTitle, { color: themeStyle.title }]} numberOfLines={1}>{entry.title}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                          <FontAwesome name="calendar" size={12} color={themeStyle.label} />
                          <Text style={[styles.journalDate, { color: themeStyle.label, marginLeft: 6 }]}>{new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                        </View>

                        <Text style={[styles.journalContent, { color: themeStyle.text, marginTop: 8 }]} numberOfLines={2}>{entry.content}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.container}
        // Provide an empty renderItem since data is empty
        renderItem={null}
        ListEmptyComponent={null}
      />

      {/* Connect Therapist Modal */}
      <Modal visible={connectModalVisible} animationType="slide" onRequestClose={closeConnectModal}>
        <SafeAreaView style={[styles.modalWrapper, { backgroundColor: themeStyle.background }] }>
          <ScrollView contentContainerStyle={styles.modalContainer}>
            <Text style={[styles.modalTitle, { color: themeStyle.title }]}>Connect with Your Therapist</Text>
            <Text style={[styles.modalHint, { color: themeStyle.label }]}>Scan the QR code provided by your therapist or enter the code manually.</Text>

            <View style={styles.cameraPlaceholder}>
              <Text style={{ color: themeStyle.label }}>Enter the code manually below</Text>
            </View>

            <View style={styles.orDivider}><Text style={{ color: themeStyle.label }}>OR ENTER MANUALLY</Text></View>

            <Text style={[styles.inputLabel, { color: themeStyle.label }]}>Therapist Code</Text>
            <TextInput
              value={therapistPin}
              onChangeText={setTherapistPin}
              placeholder="Enter the code from your therapist"
              placeholderTextColor={themeStyle.placeholder}
              style={[styles.textInput, { borderColor: '#6b6b80', color: themeStyle.text }]}
            />

            <Text style={[styles.inputLabel, { color: themeStyle.label }]}>Message (optional)</Text>
            <TextInput
              value={connectMessage}
              onChangeText={setConnectMessage}
              placeholder="Add a short message for your therapist"
              placeholderTextColor={themeStyle.placeholder}
              style={[styles.textInput, { borderColor: '#6b6b80', color: themeStyle.text }]}
            />

            <TouchableOpacity style={[styles.btn, { backgroundColor: '#7b61ff' }]} onPress={handleConnect}>
              <Text style={styles.btnlabel}>Connect to Therapist</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 12 }} onPress={closeConnectModal}>
              <Text style={{ color: themeStyle.label }}>Skip for now</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Sessions Modal */}
      <Modal visible={sessionsModalVisible} animationType="slide" onRequestClose={closeSessionsModal}>
        <SafeAreaView style={[styles.modalWrapper, { backgroundColor: themeStyle.background }] }>
          <View style={[styles.modalContainer]}>
            <Text style={[styles.modalTitle, { color: themeStyle.title }]}>Your Sessions</Text>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <TouchableOpacity onPress={() => loadSessions('upcoming')} style={{ marginRight: 12 }}>
                <Text style={{ color: themeStyle.text }}>Upcoming</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => loadSessions('past')}>
                <Text style={{ color: themeStyle.text }}>Past</Text>
              </TouchableOpacity>
            </View>

            {sessionsLoading ? (
              <ActivityIndicator size="large" color={themeStyle.text} />
            ) : (
              <ScrollView>
                {groupedSessions.length === 0 && (
                  <Text style={{ color: themeStyle.label, marginVertical: 8 }}>No sessions found.</Text>
                )}
                {groupedSessions.map((group: any, gidx: number) => (
                  <View key={`group-${gidx}-${group.therapist?.id || 'no'}`} style={{ marginBottom: 16 }}>
                    <View style={[styles.journalCard, { backgroundColor: themeStyle.dashboardcard || '#eef', padding: 12 }] }>
                      <Text style={[styles.cardTitle, { color: themeStyle.title }]}>{group.therapist ? group.therapist.full_name : 'Other Sessions'}</Text>
                      {group.therapist?.specialization && (
                        <Text style={[styles.cardSubtitle, { color: themeStyle.label }]}>{group.therapist.specialization}</Text>
                      )}
                    </View>

                    {group.sessions.map((item: any) => (
                      <View key={item.id} style={[styles.journalCard, { backgroundColor: themeStyle.dashboardcard || '#fff', marginTop: 8 }]}>
                        <Text style={[styles.cardTitle, { color: themeStyle.title }]}>{item.session_number ? `Session #${item.session_number}` : 'Session'}</Text>
                        <Text style={[styles.cardSubtitle, { color: themeStyle.text }]}>{new Date(item.scheduled_date).toLocaleString()}</Text>
                        <Text style={[styles.cardSubtitle, { color: themeStyle.label }]}>{item.status}</Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                          <TouchableOpacity
                            style={[styles.smallBtn, { backgroundColor: themeStyle.primary || '#6b6b80', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }]}
                            onPress={() => viewSessionDetail(item.id)}
                          >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>See details</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity style={[styles.btn, { backgroundColor: '#6b6b80' }]} onPress={closeSessionsModal}>
              <Text style={styles.btnlabel}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Session Detail Modal */}
      <Modal visible={!!selectedSession} animationType="slide" onRequestClose={() => setSelectedSession(null)}>
        <SafeAreaView style={[styles.modalWrapper, { backgroundColor: themeStyle.background }] }>
          <ScrollView contentContainerStyle={styles.modalContainer}>
            <Text style={[styles.modalTitle, { color: themeStyle.title }]}>Session Details</Text>
            {sessionDetailLoading ? (
              <ActivityIndicator size="large" color={themeStyle.text} />
            ) : selectedSession ? (
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

                <TouchableOpacity style={[styles.btn, { backgroundColor: '#6b6b80' }]} onPress={() => setSelectedSession(null)}>
                  <Text style={styles.btnlabel}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Utility function for time-based greeting
const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
};



const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 12) : 12,
  },
  screenGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 360,
    borderRadius: 0,
    zIndex: 0,
  },
  contentAboveGradient: {
    zIndex: 1,
  },
  container: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  header: {
    marginBottom: 16,
    marginHorizontal: -12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  dateText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginBottom: 6,
  },
  subtext: {
    fontSize: 15,
    marginBottom: 10,
  },
  inspirationCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  inspirationTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  quote: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 24,
  },
  author: {
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  headerStatCard: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  moodStatCard: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  headerStatNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  headerStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)'
  },
  statCard: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoRow: {
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  cardWrapper: {
    flex: 1,
  },
  cardRow: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  btn: {
    width: 200,
    backgroundColor: '#524f85',
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  btnlabel: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
  },
  connectBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 2,
  },
  smallBtn: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalWrapper: {
    flex: 1,
  },
  modalContainer: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  cameraPlaceholder: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#777',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  orDivider: {
    marginTop: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  recentSection: {
    marginTop: 36,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginHorizontal: 8,
  },
  sectionAccent: {
    width: 6,
    height: 28,
    borderRadius: 4,
    marginRight: 10,
  },
  journalCard: {
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    marginHorizontal: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)'
  },
  journalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalDate: {
    fontSize: 12,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  journalTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  favoriteIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  journalContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  journalMetaText: {
    fontSize: 12,
  },
  smallGraphRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  smallYAxisLabels: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  smallBarsWrapper: {
    flex: 1,
    paddingLeft: 8,
    paddingRight: 8,
  },
  smallBarContainer: {
    alignItems: 'center',
    marginRight: 8,
  },
  smallBar: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  trendWrapper: {
    marginTop: 16,
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  connectFullCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    elevation: 2,
  },
  connectFullTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  connectFullSubtitle: {
    color: '#ffffff',
    fontSize: 14,
  },
  imageCard: {
    flex: 1,
    height: 100,
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  imageCardIcon: {
    backgroundColor: '#f2f2f7',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  imageCardTitle: {
    color: '#49467E',
    fontWeight: '600',
  },
  graphCard: {
    padding: 18,
    borderRadius: 18,
    marginBottom: 20,
    marginHorizontal: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  graphHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  graphSubtitle: {
    fontSize: 12,
    color: '#8D8BA7',
    marginTop: 2,
  },
  graphIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphChartWrapper: {
    alignItems: 'center',
  },
  quickActionsSection: {
    marginTop: 14,
    marginBottom: 6,
    marginHorizontal: 12,
    backgroundColor: 'transparent',
  },
  quickActionsHeader: {
    marginBottom: 8,
    marginHorizontal: 12,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  quickActionsHint: {
    fontSize: 12,
  },
  quickActionsGrid: {
    // keep overall layout vertical; rows will be handled explicitly
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    marginHorizontal: 6,
    minHeight: 100,
    borderRadius: 14,
    paddingHorizontal: 8,
    // subtle outer shadow
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionText: {
    color: '#4B4A78',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
    maxWidth: 110,
  },
  quickActionHalf: {
    width: '48%',
  },
  quickActionFull: {
    width: '100%',
  },
  moodLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodLegendItem: {
    alignItems: 'center',
    width: `${(100 / 7)}%`,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 92,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  tooltipEmojiBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tooltipEmojiText: {
    fontSize: 16,
  },
  tooltipMoodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B4A78',
  },
  moodLegendEmoji: {
    fontSize: 18,
    textAlign: 'center',
  },
  seeDetailBtn: {
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(255,255,255,0.6)'
  },
  graphTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B4A78',
  },
  headerDecorCircle: {
    position: 'absolute',
    right: -60,
    top: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.18,
  },
  smallGreeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  headerTitleLarge: {
    fontSize: 26,
    fontWeight: '800',
    color: '#4B4A78',
    marginTop: -14,
    marginLeft: 6,
  },
  topStatCard: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  topStatIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  topStatNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B4A78',
    marginTop: 2,
  },
  topStatLabel: {
    fontSize: 12,
    color: '#8D8BA7',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#524f85',
    marginTop: 6,
  },
  headerStatsRowNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.04)'
  },
  graphContainer: {
    flexDirection: 'row',
  },
  graphSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  yAxisLabels: {
    width: 24,
    justifyContent: 'space-between',
    height: 170,
    paddingVertical: 10,
  },
  yAxisLabel: {
    fontSize: 12,
    textAlign: 'right',
  },
  barsContainer: {
    flex: 1,
    marginLeft: 8,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    height: 150,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    width: '100%',
  },
  bars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 170,
    paddingBottom: 20,
  },
  intensityLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dayLabel: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  modalWrapper: {
    flex: 1,
  },
  modalContainer: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 14,
    marginBottom: 16,
  },
  cameraPlaceholder: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#6b6b80',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  orDivider: {
    alignItems: 'center',
    marginVertical: 12,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 6,
    marginTop: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  connectBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});

