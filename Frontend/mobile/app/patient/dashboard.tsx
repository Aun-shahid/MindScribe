


import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import PatientService, { DashboardData } from '../services/patient.service';
import { Modal, TextInput, Alert } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const CARD_WIDTH = screenWidth / 2 - 32; // Two cards per row, minus padding/margin

type DashboardCard = {
  id: string;
  title: string;
  subtitle: string;
  screen: string;
};

const dashboardCards: DashboardCard[] = [
  {
    id: 'mood',
    title: "Today's Mood",
    subtitle: 'Feeling good 😊',
    screen: './mood',
  },
  {
    id: 'historyDashboard',
    title: 'History Dashboard',
    subtitle: 'View your progress and insights',
    screen: './history-dashboard',
  },
  {
    id: 'journalEntries',
    title: 'Journal Entries',
    subtitle: '12 this month',
    screen: './journal',
  },
  {
    id: 'nextSession',
    title: 'Next Session',
    subtitle: 'Tomorrow · 2:00 PM',
    screen: './sessions',
  },
  {
    id: 'break',
    title: 'Take a Break',
    subtitle: 'Relaxing sounds and nature therapy',
    screen: './take-a-break',
  },
  {
    id: 'journal',
    title: 'Journal',
    subtitle: 'Express yourself with words and voice',
    screen: './journal-list',
  },
  {
    id: 'moodTracker',
    title: 'Mood Tracker',
    subtitle: 'Track and understand your emotions',
    screen: './mood-tracker',
  },
  {
    id: 'activityTracker',
    title: 'Activity Tracker',
    subtitle: 'Log activities and their impact on mood',
    screen: './activity-tracker',
  },
];

export default function PatientDashboard() {
  const { user, profileLoading, fetchProfile } = useAuthContext();
  const { themeStyle } = useTheme();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [therapistPin, setTherapistPin] = useState('');
  const [connectMessage, setConnectMessage] = useState('');
  const [sessionsModalVisible, setSessionsModalVisible] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const data = await PatientService.getDashboardData();
      setDashboardData(data);
    } catch (err: any) {
      console.error('[Dashboard] Error loading data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    loadDashboardData();

    const loadUnread = async () => {
      try {
        const c = await PatientService.getUnreadNotificationCount();
        setUnreadCount(c);
      } catch (e) {}
    };
    loadUnread();

    

    // Refresh dashboard/profile when app comes to foreground (e.g., therapist accepted on another device)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        fetchProfile();
        loadDashboardData();
        // refresh unread count
        PatientService.getUnreadNotificationCount().then((c) => setUnreadCount(c)).catch(() => {});
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [fetchProfile]);

  

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

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
        <Text style={[styles.errorText, { color: themeStyle.error }]}>⚠️ Failed to load profile. Try logging in again.</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: themeStyle.logoutButton }]}
          onPress={() => router.push('../auth/login')}>
          <Text style={[styles.btnlabel, { color: themeStyle.logoutText }]}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
      const sessions = data?.sessions || data?.sessions || [];
      // If the response is a list directly, handle that
      if (Array.isArray(data)) {
        setSessionsList(data);
      } else if (data?.sessions) {
        // data.sessions may be array or object with upcoming/past
        if (Array.isArray(data.sessions)) {
          setSessionsList(data.sessions);
        } else if (data.sessions.upcoming || data.sessions.past) {
          // Flatten upcoming + past into one list
          const combined = [ ...(data.sessions.upcoming || []), ...(data.sessions.past || []) ];
          setSessionsList(combined);
        } else {
          setSessionsList([]);
        }
      } else {
        setSessionsList([]);
      }
    } catch (err: any) {
      console.error('[Sessions] load error', err);
      setSessionsList([]);
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
    const mood = dashboardData.mood_today;
    return mood.label || mood.mood || 'Feeling good';
  };

  // Format next session
  const getNextSessionDisplay = () => {
    if (!dashboardData?.next_session) return 'No upcoming sessions';
    const session = dashboardData.next_session;
    return session.display || session.time || 'Check sessions';
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
      title: "Today's Mood",
      subtitle: getMoodDisplay(),
      screen: './mood',
    },
    {
      id: 'journalEntries',
      title: 'Journal Entries',
      subtitle: getJournalSubtitle(),
      screen: './journal-list',
    },
    {
      id: 'nextSession',
      title: 'Next Session',
      subtitle: getNextSessionDisplay(),
      screen: './sessions',
    },
    {
      id: 'goals',
      title: 'Goals',
      subtitle: getGoalsSubtitle(),
      screen: './goals',
    },
    {
      id: 'break',
      title: 'Take a Break',
      subtitle: getRelaxationSubtitle(),
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
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}>
      <FlatList
        data={[]}
        ListHeaderComponent={() => (
          <>
            {/* Cute Greeting Section */}
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.greeting, { color: themeStyle.title }]}>🌞 Good {getTimeGreeting()}, {user.first_name}!</Text>
                  <Text style={[styles.subtext, { color: themeStyle.label }]}>How are you feeling today? Let’s continue your wellness journey.</Text>
                </View>
                <TouchableOpacity style={{ marginLeft: 12 }} onPress={() => router.push('./notifications' as any)}>
                  <View style={{ position: 'relative', padding: 6 }}>
                    <FontAwesome name="bell" size={22} color={themeStyle.title} />
                    {unreadCount > 0 && (
                      <View style={{ position: 'absolute', right: 2, top: 2, backgroundColor: '#ff3b30', borderRadius: 8, minWidth: 16, paddingHorizontal: 4, height: 16, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Connect / Disconnect actions */}
            <View style={{ alignItems: 'center', marginVertical: 12 }}>
              <TouchableOpacity
                style={[styles.connectBtn, { backgroundColor: '#6b4cff', paddingVertical: 12, paddingHorizontal: 18 }]}
                onPress={openConnectModal}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Connect with Therapist</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 10 }} onPress={handleDisconnect}>
                <Text style={{ color: '#b94a4a' }}>Disconnect</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 12 }} onPress={openSessionsModal}>
                <Text style={{ color: '#2b6cb0', fontWeight: '600' }}>See Sessions & Summaries</Text>
              </TouchableOpacity>
            </View>

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

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: themeStyle.dashboardcard || '#ffffff' }]}>
                <Text style={[styles.statNumber, { color: themeStyle.title }]}>{dashboardData?.emotional_insights_count || 0}</Text>
                <Text style={[styles.statLabel, { color: themeStyle.label }]}>Insights</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: themeStyle.dashboardcard || '#ffffff' }]}>
                <Text style={[styles.statNumber, { color: themeStyle.title }]}>{dashboardData?.mood_trend?.length || 0}</Text>
                <Text style={[styles.statLabel, { color: themeStyle.label }]}>Mood Entries</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: themeStyle.dashboardcard || '#ffffff' }]}>
                <Text style={[styles.statNumber, { color: themeStyle.title }]}>{dashboardData?.upcoming_sessions?.length || 0}</Text>
                <Text style={[styles.statLabel, { color: themeStyle.label }]}>Sessions</Text>
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <View style={[styles.errorBanner, { backgroundColor: '#fee' }]}>
                <Text style={[styles.errorText, { color: '#c00' }]}>⚠️ {error}</Text>
              </View>
            )}

            {/* Dashboard Cards - render as map instead of FlatList to avoid nested VirtualizedList */}
            <View style={styles.cardWrapper}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {dashboardCards.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.card, { backgroundColor: themeStyle.dashboardcard || '#ffffff', width: CARD_WIDTH }]}
                    onPress={() => handleCardPress(item.screen)}
                  >
                    <Text style={[styles.cardTitle, { color: themeStyle.title }]}>{item.title}</Text>
                    <Text style={[styles.cardSubtitle, { color: themeStyle.text }]}>{item.subtitle}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Recent Journal Entries */}
            {dashboardData?.recent_journal_entries && dashboardData.recent_journal_entries.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>📝 Recent Journal Entries</Text>
                {dashboardData.recent_journal_entries.slice(0, 3).map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={[styles.journalCard, { backgroundColor: themeStyle.dashboardcard || '#ffffff' }]}
                    onPress={() => router.push(`./journal/${entry.id}` as any)}
                  >
                    <View style={styles.journalHeader}>
                      <Text style={[styles.journalTitle, { color: themeStyle.title }]}>{entry.title}</Text>
                      {entry.is_favorite && <Text style={styles.favoriteIcon}>⭐</Text>}
                    </View>
                    <Text style={[styles.journalContent, { color: themeStyle.text }]} numberOfLines={2}>{entry.content}</Text>
                    <View style={styles.journalMeta}>
                      <Text style={[styles.journalMetaText, { color: themeStyle.label }]}>{new Date(entry.created_at).toLocaleDateString()}</Text>
                      <Text style={[styles.journalMetaText, { color: themeStyle.label }]}>{entry.word_count} words</Text>
                      {entry.mood_improvement > 0 && <Text style={[styles.journalMetaText, { color: '#4caf50' }]}>+{entry.mood_improvement}% mood</Text>}
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
              <FlatList
                data={sessionsList}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }: { item: any }) => (
                  <View style={[styles.journalCard, { backgroundColor: themeStyle.dashboardcard || '#fff' }]}> 
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
                )}
              />
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
  },
  container: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
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
  reflection: {
    fontSize: 14,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
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
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  journalCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  journalTitle: {
    fontSize: 16,
    fontWeight: '600',
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
  journalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  journalMetaText: {
    fontSize: 12,
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

