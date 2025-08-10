
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTherapistSessions, useTherapistPatients } from '../hooks/useTherapist';
import api from '../utils/api';

const { width } = Dimensions.get('window');

// Dashboard API response type
type DashboardData = {
  therapist_info?: Record<string, string>;
  today_sessions?: any[];
  upcoming_sessions?: any[];
  patient_stats?: Record<string, string>;
  session_stats?: Record<string, string>;
  recent_patients?: any[];
  mood_alerts?: any[];
  soap_notes?: any[];
  session_hours?: {
    total: number;
    today: number;
    thisWeek: number;
  };
  progress_data?: {
    soap_progress: number;
    patient_moods: any[];
  };
};

export default function TherapistDashboard() {
  const { user, profileLoading, fetchProfile } = useAuthContext();
  const { themeStyle } = useTheme();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current hour for greeting
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Ensure profile is fetched
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // When user is available, load dashboard
  useEffect(() => {
    if (!user) return;

    const fetchDashboard = async () => {
      try {
        console.log('📊 [TherapistDashboard] Fetching dashboard data...');
        setLoading(true);
        
        // Fetch therapist profile data using existing endpoint
        const profileResponse = await api.get('/users/therapist-profile/');
        console.log('✅ [TherapistDashboard] Therapist profile fetched:', profileResponse.data);
        
        // Fetch therapist's patients using existing endpoint
        let patientsData = [];
        try {
          const patientsResponse = await api.get('/users/patients/');
          patientsData = patientsResponse.data.patients || [];
          console.log('✅ [TherapistDashboard] Patients data fetched:', patientsData.length, 'patients');
        } catch {
          console.log('ℹ️ [TherapistDashboard] No patients data available');
        }

        // Fetch sessions data using existing endpoint
        let sessionsData = [];
        try {
          const sessionsResponse = await api.get('/therapy_sessions/sessions/');
          sessionsData = sessionsResponse.data.sessions || sessionsResponse.data || [];
          console.log('✅ [TherapistDashboard] Sessions data fetched:', sessionsData.length, 'sessions');
        } catch {
          console.log('ℹ️ [TherapistDashboard] No sessions data available');
        }

        // Create dashboard data from real API responses
        const profile = profileResponse.data;
        const totalPatients = patientsData.length;
        const totalSessions = sessionsData.length;
        
        // Filter today's sessions (match the API response structure)
        const today = new Date().toISOString().split('T')[0];
        console.log('🗓️ [TherapistDashboard] Today\'s date:', today);
        
        const todaySessions = sessionsData.filter((session: any) => {
          // Use session_date field from the API response
          const sessionDate = session.session_date?.split('T')[0];
          const isToday = sessionDate === today;
          console.log(`🔍 [TherapistDashboard] Session ${session.id}: ${sessionDate} === ${today} ? ${isToday}`);
          return isToday;
        });
        
        console.log('📅 [TherapistDashboard] Today\'s sessions found:', todaySessions.length);

        // Filter upcoming sessions (future dates)
        const upcomingSessions = sessionsData.filter((session: any) => {
          const sessionDate = session.session_date?.split('T')[0];
          return sessionDate && sessionDate > today;
        }).slice(0, 5); // Limit to 5 upcoming sessions

        // Recent patients (last 5)
        const recentPatients = patientsData.slice(0, 5);

        // Generate mock mood alerts
        const moodAlerts = [
          { id: 1, patient: 'John D.', mood: 'anxious', level: 'high', color: '#FF6B6B' },
          { id: 2, patient: 'Sarah M.', mood: 'stressed', level: 'medium', color: '#FFB347' },
        ];

        // Generate mock SOAP notes
        const soapNotes = [
          { id: 1, patient: 'Alex K.', status: 'pending', count: 3 },
          { id: 2, patient: 'Maria L.', status: 'completed', count: 1 },
        ];

        // Calculate session hours using actual duration_minutes from API
        const currentDate = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        // Calculate total hours from all sessions
        const totalHours = sessionsData.reduce((total: number, session: any) => {
          return total + (session.duration_minutes || 0);
        }, 0) / 60; // Convert minutes to hours
        
        // Calculate today's hours
        const todayHours = todaySessions.reduce((total: number, session: any) => {
          return total + (session.duration_minutes || 0);
        }, 0) / 60; // Convert minutes to hours
        
        // Calculate this week's hours (filter sessions from this week)
        const thisWeekSessions = sessionsData.filter((session: any) => {
          const sessionDate = new Date(session.session_date);
          return sessionDate >= weekAgo && sessionDate <= currentDate;
        });
        
        const thisWeekHours = thisWeekSessions.reduce((total: number, session: any) => {
          return total + (session.duration_minutes || 0);
        }, 0) / 60; // Convert minutes to hours
        
        console.log('⏰ [TherapistDashboard] Session hours calculated:');
        console.log('  - Total sessions:', sessionsData.length, 'Total hours:', totalHours.toFixed(1));
        console.log('  - Today sessions:', todaySessions.length, 'Today hours:', todayHours.toFixed(1));
        console.log('  - This week sessions:', thisWeekSessions.length, 'This week hours:', thisWeekHours.toFixed(1));

        const sessionHours = {
          total: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
          today: Math.round(todayHours * 10) / 10,
          thisWeek: Math.round(thisWeekHours * 10) / 10,
        };

        // Patient moods data
        const patientMoods = [
          { name: 'Anxious', count: 2, color: '#FF6B6B' },
          { name: 'Peaceful', count: 3, color: '#4ECDC4' },
          { name: 'Sad', count: 1, color: '#A8E6CF' },
          { name: 'Calm', count: 4, color: '#B4A7D6' },
        ];

        const dashboardData: DashboardData = {
          therapist_info: {
            'Name': `${user.first_name} ${user.last_name}`,
            'Email': user.email || 'N/A',
            'Specialization': profile.specialization || 'General Therapy',
            'License Number': profile.license_number || 'N/A',
            'Clinic Name': profile.clinic_name || 'Private Practice',
            'Years of Experience': profile.years_of_experience?.toString() || 'N/A',
            'Therapist PIN': profile.therapist_pin || 'N/A'
          },
          today_sessions: todaySessions.length > 0 ? todaySessions : [],
          upcoming_sessions: upcomingSessions.length > 0 ? upcomingSessions : [],
          patient_stats: {
            'Total Patients': totalPatients.toString(),
            'Active Patients': patientsData.filter((p: any) => p.status === 'active').length.toString(),
            'Connected Patients': patientsData.filter((p: any) => p.connected_at).length.toString()
          },
          session_stats: {
            'Total Sessions': totalSessions.toString(),
            'Today\'s Sessions': todaySessions.length.toString(),
            'Upcoming Sessions': upcomingSessions.length.toString(),
            'Completed Sessions': sessionsData.filter((s: any) => s.status === 'completed').length.toString()
          },
          recent_patients: recentPatients.length > 0 ? recentPatients : [],
          mood_alerts: moodAlerts,
          soap_notes: soapNotes,
          session_hours: sessionHours,
          progress_data: {
            soap_progress: Math.round((sessionsData.filter((s: any) => s.soap_notes).length / Math.max(totalSessions, 1)) * 100),
            patient_moods: patientMoods
          }
        };

        setDashboardData(dashboardData);
        console.log('✅ [TherapistDashboard] Dashboard data set successfully');

      } catch (err: any) {
        console.error('❌ [TherapistDashboard] Failed to fetch dashboard data:', err);
        
        // Fallback to basic user data if API calls fail
        const fallbackData: DashboardData = {
          therapist_info: {
            'Name': `${user.first_name} ${user.last_name}`,
            'Email': user.email || 'N/A',
            'User Type': user.user_type || 'therapist',
            'Status': 'Active'
          },
          today_sessions: [],
          upcoming_sessions: [],
          patient_stats: { 'Status': 'Data unavailable' },
          session_stats: { 'Status': 'Data unavailable' },
          recent_patients: [],
          mood_alerts: [],
          soap_notes: [],
          session_hours: { total: 0, today: 0, thisWeek: 0 },
          progress_data: { soap_progress: 0, patient_moods: [] }
        };
        
        setDashboardData(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user]);

  if (profileLoading || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeStyle.background }]}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#524f85" />
          <Text style={[styles.loadingText, { color: themeStyle.text }]}>Loading your dashboard...</Text>
          <Text style={[styles.loadingSubtext, { color: themeStyle.label }]}>Preparing your therapeutic workspace</Text>
        </View>
      </View>
    );
  }

  if (!user || !dashboardData) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themeStyle.background }]}>
        <View style={styles.errorContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: themeStyle.text }]}>Connection Issue</Text>
          <Text style={[styles.errorText, { color: themeStyle.label }]}>
            Unable to load your dashboard. Please check your connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace('../auth/login')}
          >
            <Text style={styles.retryButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const {
    therapist_info = {},
    today_sessions = [],
    upcoming_sessions = [],
    patient_stats = {},
    session_stats = {},
    recent_patients = [],
    mood_alerts = [],
    soap_notes = [],
    session_hours = { total: 0, today: 0, thisWeek: 0 },
    progress_data = { soap_progress: 0, patient_moods: [] },
  } = dashboardData;

  const handleStartSession = () => {
    router.push('./start-new-session');
  };

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        
        {/* Enhanced Header with Beautiful Gradient Effect */}
        <View style={[styles.headerContainer, { backgroundColor: '#524f85' }]}>
          <View style={styles.headerGradientOverlay}>
            <View style={styles.headerContent}>
              {/* Greeting Section with Better Typography */}
              <View style={styles.greetingSection}>
                <Text style={styles.greeting}>{getCurrentGreeting()}</Text>
                <Text style={styles.doctorName}>Dr. {user.last_name}</Text>
                <Text style={styles.subtitle}>Making a difference, one session at a time</Text>
              </View>

              {/* Professional Badge with Enhanced Design */}
              <View style={[styles.professionalBadge, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                <View style={styles.badgeHeader}>
                  <Text style={styles.badgeTitle}>🏥 Professional Details</Text>
                </View>
                <View style={styles.badgeContent}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.badgeLabel}>License:</Text>
                    <Text style={styles.badgeValue}>
                      {therapist_info['License Number'] || 'LIC123456'}
                    </Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <Text style={styles.badgeLabel}>Specialty:</Text>
                    <Text style={styles.badgeValue}>
                      {therapist_info['Specialization'] || 'Clinical Psychology'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Enhanced Quick Stats with Beautiful Cards */}
        <View style={styles.quickStatsContainer}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>📊 Todays Overview</Text>
          <View style={styles.statsGrid}>
            <StatsCard
              icon="📅"
              title="Sessions Today"
              value={today_sessions.length.toString()}
              subtitle={`${upcoming_sessions.length} upcoming`}
              color="#4A90E2"
              themeStyle={themeStyle}
              onPress={() => router.push('./sessions')}
            />
            
            <StatsCard
              icon="👥"
              title="Total Patients"
              value={patient_stats['Total Patients'] || '0'}
              subtitle="Under your care"
              color="#7B68EE"
              themeStyle={themeStyle}
              onPress={() => router.push('./patients')}
            />
            
            <StatsCard
              icon="⚠️"
              title="Mood Alerts"
              value={mood_alerts.length.toString()}
              subtitle="Require attention"
              color="#FF6B6B"
              themeStyle={themeStyle}
            />
            
            <StatsCard
              icon="📝"
              title="Pending SOAP"
              value={soap_notes.filter(note => note.status === 'pending').length.toString()}
              subtitle="Notes to review"
              color="#FFA726"
              themeStyle={themeStyle}
            />
          </View>
        </View>

        {/* Enhanced Action Center */}
        <View style={[styles.actionCenter, { backgroundColor: themeStyle.dashboardcard }]}>
          <View style={styles.actionHeader}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>🚀 Quick Actions</Text>
            <Text style={[styles.sectionSubtitle, { color: themeStyle.label }]}>
              Start your therapeutic work
            </Text>
          </View>
          
          {/* Primary Action - Start Session */}
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleStartSession}
            activeOpacity={0.8}
          >
            <View style={styles.primaryActionContent}>
              <View style={styles.primaryActionIcon}>
                <Text style={styles.primaryActionIconText}>▶</Text>
              </View>
              <View style={styles.primaryActionTextContainer}>
                <Text style={styles.primaryActionTitle}>Start New Session</Text>
                <Text style={styles.primaryActionSubtitle}>Begin therapeutic intervention</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Secondary Actions */}
          <View style={styles.secondaryActions}>
            <TouchableOpacity 
              style={[styles.secondaryActionButton, { backgroundColor: 'rgba(82, 79, 133, 0.1)' }]}
              onPress={() => router.push('./Session-Calender')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryActionIcon}>📅</Text>
              <Text style={[styles.secondaryActionText, { color: themeStyle.text }]}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Weekly Performance */}
        <View style={[styles.performanceSection, { backgroundColor: themeStyle.dashboardcard }]}>
          <View style={styles.sectionHeaderWithIcon}>
            <Text style={styles.sectionIcon}>📈</Text>
            <View>
              <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Weekly Performance</Text>
              <Text style={[styles.sectionSubtitle, { color: themeStyle.label }]}>
                Your therapeutic impact this week
              </Text>
            </View>
          </View>
          
          <View style={styles.performanceGrid}>
            <PerformanceCard
              icon="⏱️"
              label="Session Hours"
              value={`${session_hours.thisWeek || 24}h`}
              progress={75}
              color="#4CAF50"
              themeStyle={themeStyle}
            />
            <PerformanceCard
              icon="📋"
              label="SOAP Progress"
              value={`${progress_data.soap_progress || 8}/11`}
              progress={72}
              color="#2196F3"
              themeStyle={themeStyle}
            />
            <PerformanceCard
              icon="👥"
              label="Active Patients"
              value={patient_stats['Active Patients'] || '8'}
              progress={90}
              color="#9C27B0"
              themeStyle={themeStyle}
            />
          </View>
        </View>

        {/* Enhanced Patient Moods with Beautiful Visualization */}
        <View style={[styles.moodsSection, { backgroundColor: themeStyle.dashboardcard }]}>
          <View style={styles.sectionHeaderWithIcon}>
            <Text style={styles.sectionIcon}>😊</Text>
            <View>
              <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Patient Mood Insights</Text>
              <Text style={[styles.sectionSubtitle, { color: themeStyle.label }]}>
                Current emotional landscape
              </Text>
            </View>
          </View>
          
          <View style={styles.moodsList}>
            <MoodCard name="Anxious" count={5} color="#FF6B6B" percentage={35} themeStyle={themeStyle} />
            <MoodCard name="Calm" count={8} color="#4ECDC4" percentage={55} themeStyle={themeStyle} />
            <MoodCard name="Hopeful" count={3} color="#95E1D3" percentage={20} themeStyle={themeStyle} />
            <MoodCard name="Stressed" count={2} color="#FFA726" percentage={15} themeStyle={themeStyle} />
          </View>
          
          {/* Inspirational Quote with Better Design */}
          <View style={styles.inspirationalCard}>
            <Text style={styles.quoteIcon}></Text>
            <Text style={[styles.inspirationalText, { color: themeStyle.label }]}>
              The good you do today will often be forgotten. Do good anyway.
            </Text>
            <Text style={[styles.inspirationalAuthor, { color: themeStyle.label }]}>
              — Mother Teresa
            </Text>
          </View>
        </View>

        {/* Enhanced Recent Patients */}
        {recent_patients.length > 0 && (
          <View style={[styles.patientsSection, { backgroundColor: themeStyle.dashboardcard }]}>
            <View style={styles.sectionHeaderWithIcon}>
              <Text style={styles.sectionIcon}>👥</Text>
              <View>
                <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Recent Patients</Text>
                <Text style={[styles.sectionSubtitle, { color: themeStyle.label }]}>
                  Recently connected individuals
                </Text>
              </View>
            </View>
            
            <View style={styles.patientsList}>
              {recent_patients.slice(0, 4).map((patient, index) => (
                <View key={index} style={[styles.patientCard, { borderColor: 'rgba(82, 79, 133, 0.1)' }]}>
                  <View style={styles.patientAvatar}>
                    <Text style={styles.patientAvatarText}>
                      {typeof patient === 'string' 
                        ? patient.charAt(0).toUpperCase() 
                        : (patient.name || patient.full_name || 'P').charAt(0).toUpperCase()
                      }
                    </Text>
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={[styles.patientName, { color: themeStyle.text }]}>
                      {typeof patient === 'string' 
                        ? patient 
                        : patient.name || patient.full_name || 'Patient'
                      }
                    </Text>
                    <Text style={[styles.patientDate, { color: themeStyle.label }]}>
                      {typeof patient === 'object' && patient.connected_at
                        ? new Date(patient.connected_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        : 'Recently connected'
                      }
                    </Text>
                  </View>
                  <View style={styles.patientStatusDot} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />

      </ScrollView>
    </SafeAreaView>
  );
}

// Enhanced Component Definitions with Beautiful Designs

const StatsCard = ({ 
  icon, 
  title, 
  value, 
  subtitle, 
  color,
  themeStyle, 
  onPress 
}: { 
  icon: string; 
  title: string; 
  value: string; 
  subtitle: string; 
  color: string;
  themeStyle: any; 
  onPress?: () => void;
}) => (
  <TouchableOpacity 
    style={[styles.statsCard, { backgroundColor: themeStyle.dashboardcard }]}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.statsCardIconContainer, { backgroundColor: color }]}>
      <Text style={styles.statsCardIcon}>{icon}</Text>
    </View>
    <Text style={[styles.statsCardValue, { color: themeStyle.text }]}>{value}</Text>
    <Text style={[styles.statsCardTitle, { color: themeStyle.label }]}>{title}</Text>
    <Text style={[styles.statsCardSubtitle, { color: themeStyle.label }]}>{subtitle}</Text>
  </TouchableOpacity>
);

const PerformanceCard = ({ 
  icon, 
  label, 
  value, 
  progress,
  color,
  themeStyle 
}: { 
  icon: string; 
  label: string; 
  value: string; 
  progress: number;
  color: string;
  themeStyle: any;
}) => (
  <View style={[styles.performanceCard, { backgroundColor: 'rgba(82, 79, 133, 0.05)' }]}>
    <View style={styles.performanceCardHeader}>
      <Text style={styles.performanceCardIcon}>{icon}</Text>
      <Text style={[styles.performanceCardValue, { color: themeStyle.text }]}>{value}</Text>
    </View>
    <Text style={[styles.performanceCardLabel, { color: themeStyle.label }]}>{label}</Text>
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarBackground, { backgroundColor: 'rgba(82, 79, 133, 0.1)' }]}>
        <View style={[
          styles.progressBarFill,
          { 
            width: `${progress}%`,
            backgroundColor: color
          }
        ]} />
      </View>
      <Text style={[styles.progressText, { color: themeStyle.label }]}>{progress}%</Text>
    </View>
  </View>
);

const MoodCard = ({ 
  name, 
  count, 
  color,
  percentage,
  themeStyle 
}: { 
  name: string; 
  count: number; 
  color: string; 
  percentage: number;
  themeStyle: any;
}) => (
  <View style={styles.moodCard}>
    <View style={styles.moodCardLeft}>
      <View style={[styles.moodIndicator, { backgroundColor: color }]} />
      <View style={styles.moodTextContainer}>
        <Text style={[styles.moodName, { color: themeStyle.text }]}>{name}</Text>
        <Text style={[styles.moodSubtext, { color: themeStyle.label }]}>{count} patients</Text>
      </View>
    </View>
    <View style={styles.moodCardRight}>
      <Text style={[styles.moodPercentage, { color: themeStyle.text }]}>{percentage}%</Text>
      <View style={styles.moodBarContainer}>
        <View style={[styles.moodBarBackground, { backgroundColor: 'rgba(82, 79, 133, 0.1)' }]}>
          <View style={[
            styles.moodBarFill,
            { 
              width: `${percentage}%`,
              backgroundColor: color
            }
          ]} />
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    paddingBottom: 120,
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#524f85',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Enhanced Header
  headerContainer: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  headerGradientOverlay: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 60,
    paddingBottom: 32,
  },
  headerContent: {
    paddingHorizontal: 24,
  },
  greetingSection: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
    fontStyle: 'italic',
  },
  
  // Professional Badge
  professionalBadge: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeHeader: {
    marginBottom: 16,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  badgeContent: {
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  badgeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    flex: 2,
    textAlign: 'right',
  },

  // Quick Stats
  quickStatsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(82, 79, 133, 0.05)',
  },
  statsCardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statsCardIcon: {
    fontSize: 28,
  },
  statsCardValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  statsCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  statsCardSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },

  // Action Center
  actionCenter: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  actionHeader: {
    marginBottom: 20,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  sectionIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  
  // Primary Action Button
  primaryActionButton: {
    backgroundColor: '#524f85',
    borderRadius: 20,
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#524f85',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  primaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  primaryActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  primaryActionIconText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  primaryActionTextContainer: {
    flex: 1,
  },
  primaryActionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  primaryActionSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '400',
  },

  // Secondary Actions
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    backgroundColor: '#524f85'
  },
  secondaryActionIcon: {
    fontSize: 24,
  },
  secondaryActionText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },

  // Performance Section
  performanceSection: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  performanceGrid: {
    gap: 16,
  },
  performanceCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(82, 79, 133, 0.1)',
  },
  performanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  performanceCardIcon: {
    fontSize: 24,
  },
  performanceCardValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  performanceCardLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },

  // Moods Section
  moodsSection: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  moodsList: {
    gap: 16,
    marginBottom: 24,
  },
  moodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(82, 79, 133, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(82, 79, 133, 0.1)',
  },
  moodCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moodIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 16,
  },
  moodTextContainer: {
    flex: 1,
  },
  moodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  moodSubtext: {
    fontSize: 12,
    opacity: 0.7,
  },
  moodCardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  moodPercentage: {
    fontSize: 18,
    fontWeight: '700',
  },
  moodBarContainer: {
    width: 60,
  },
  moodBarBackground: {
    height: 4,
    borderRadius: 2,
  },
  moodBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Inspirational Quote
  inspirationalCard: {
    backgroundColor: 'rgba(82, 79, 133, 0.05)',
    borderRadius: 20,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#524f85',
    position: 'relative',
  },
  quoteIcon: {
    fontSize: 48,
    color: 'rgba(82, 79, 133, 0.2)',
    position: 'absolute',
    top: 8,
    left: 16,
    fontWeight: 'bold',
  },
  inspirationalText: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  inspirationalAuthor: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Patients Section
  patientsSection: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  patientsList: {
    gap: 12,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(82, 79, 133, 0.02)',
    borderWidth: 1,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#524f85',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  patientAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  patientDate: {
    fontSize: 13,
    opacity: 0.7,
  },
  patientStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 40,
  },
});