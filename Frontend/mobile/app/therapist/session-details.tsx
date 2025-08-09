import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';

type Session = {
  id: string;
  session_number?: number;
  session_type: string;
  status: string;
  scheduled_date?: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  duration_minutes?: number;
  actual_duration_minutes?: number | null;
  location?: string;
  is_online?: boolean;
  session_notes?: string;
  patient_goals?: string;
  homework_assigned?: string;
  next_session_goals?: string;
  patient_mood_before?: number | null;
  patient_mood_after?: number | null;
  mood_improvement?: number | null;
  session_effectiveness?: number | null;
  created_at?: string;
  updated_at?: string;
  // Additional fields that might come from API
  date?: string;
  time?: string;
  duration?: number;
  notes?: string;
};

type PatientWithSessions = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  last_session: any;
  next_session: any;
  total_sessions: string;
  created_at: string;
};

const SessionDetails = () => {
  const { themeStyle } = useTheme();
  const { patientId, patientName } = useLocalSearchParams();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [patient, setPatient] = useState<PatientWithSessions | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (patientId) {
      fetchPatientSessions();
    }
  }, [patientId]);

  const fetchPatientSessions = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching sessions for patient:', patientId);

      // Try to get sessions directly first (this might be the better approach)
      try {
        const sessionsResponse = await api.get(`/therapy_sessions/sessions/?patient=${patientId}`);
        if (sessionsResponse.data && Array.isArray(sessionsResponse.data)) {
          console.log('✅ Found sessions directly:', sessionsResponse.data);
          setSessions(sessionsResponse.data);
          return;
        }
      } catch (directSessionError) {
        console.log('📝 Direct session fetch failed, trying patient data approach');
      }

      // Fallback: Use the working endpoint from patients.tsx
      const response = await api.get('/therapy_sessions/patients/');
      
      if (response.data && Array.isArray(response.data)) {
        // Find the specific patient
        const foundPatient = response.data.find((p: PatientWithSessions) => p.id === patientId);
        
        if (foundPatient) {
          console.log('✅ Found patient:', foundPatient.full_name);
          console.log('📊 Patient sessions data:', {
            last_session: foundPatient.last_session,
            next_session: foundPatient.next_session,
            total_sessions: foundPatient.total_sessions
          });
          
          setPatient(foundPatient);
          
          // Extract sessions from patient data
          const extractedSessions: Session[] = [];
          
          // Check if last_session contains session data
          if (foundPatient.last_session) {
            let lastSessionData;
            
            if (typeof foundPatient.last_session === 'string') {
              try {
                lastSessionData = JSON.parse(foundPatient.last_session);
              } catch {
                // If it's a string but not JSON, create a mock session
                lastSessionData = {
                  id: `last-${foundPatient.id}`,
                  session_notes: foundPatient.last_session,
                  session_type: 'individual',
                  status: 'completed'
                };
              }
            } else {
              lastSessionData = foundPatient.last_session;
            }
            
            if (lastSessionData) {
              extractedSessions.push({
                id: lastSessionData.id || `last-${foundPatient.id}`,
                session_number: lastSessionData.session_number || 1,
                session_type: lastSessionData.session_type || 'individual',
                status: lastSessionData.status || 'completed',
                scheduled_date: lastSessionData.scheduled_date || lastSessionData.date,
                location: lastSessionData.location || 'Office',
                is_online: lastSessionData.is_online || false,
                session_notes: lastSessionData.session_notes || lastSessionData.notes,
                patient_goals: lastSessionData.patient_goals,
                homework_assigned: lastSessionData.homework_assigned,
                next_session_goals: lastSessionData.next_session_goals,
                patient_mood_before: lastSessionData.patient_mood_before,
                patient_mood_after: lastSessionData.patient_mood_after,
                mood_improvement: lastSessionData.mood_improvement,
                session_effectiveness: lastSessionData.session_effectiveness,
                actual_duration_minutes: lastSessionData.actual_duration_minutes || lastSessionData.duration,
                created_at: lastSessionData.created_at,
                updated_at: lastSessionData.updated_at
              });
            }
          }
          
          // Check if next_session contains session data
          if (foundPatient.next_session) {
            let nextSessionData;
            
            if (typeof foundPatient.next_session === 'string') {
              try {
                nextSessionData = JSON.parse(foundPatient.next_session);
              } catch {
                nextSessionData = {
                  id: `next-${foundPatient.id}`,
                  session_notes: foundPatient.next_session,
                  session_type: 'individual',
                  status: 'scheduled'
                };
              }
            } else {
              nextSessionData = foundPatient.next_session;
            }
            
            if (nextSessionData) {
              extractedSessions.push({
                id: nextSessionData.id || `next-${foundPatient.id}`,
                session_number: nextSessionData.session_number || 2,
                session_type: nextSessionData.session_type || 'individual',
                status: nextSessionData.status || 'scheduled',
                scheduled_date: nextSessionData.scheduled_date || nextSessionData.date,
                location: nextSessionData.location || 'Office',
                is_online: nextSessionData.is_online || false,
                session_notes: nextSessionData.session_notes || nextSessionData.notes,
                patient_goals: nextSessionData.patient_goals,
                homework_assigned: nextSessionData.homework_assigned,
                next_session_goals: nextSessionData.next_session_goals,
                patient_mood_before: nextSessionData.patient_mood_before,
                patient_mood_after: nextSessionData.patient_mood_after,
                mood_improvement: nextSessionData.mood_improvement,
                session_effectiveness: nextSessionData.session_effectiveness,
                actual_duration_minutes: nextSessionData.actual_duration_minutes || nextSessionData.duration,
                created_at: nextSessionData.created_at,
                updated_at: nextSessionData.updated_at
              });
            }
          }
          
          console.log('📋 Extracted sessions:', extractedSessions);
          setSessions(extractedSessions);
          
        } else {
          console.log('❌ Patient not found');
          setSessions([]);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch patient sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPatientSessions();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#34C759';
      case 'in_progress':
        return '#FF9500';
      case 'scheduled':
        return '#007AFF';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date not available';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleSessionPress = (session: Session) => {
    console.log('📋 Opening session details for:', session.id);
    console.log('📋 Session data being passed:', session);
    
    // Always navigate to session-detail-view, passing the session ID
    router.push({
      pathname: './session-detail-view',
      params: {
        sessionId: session.id,
        patientName: patientName || patient?.full_name,
        patientId: patientId
      }
    });
  };

  const renderSessionCard = (session: Session, index: number) => {
    const statusColor = getStatusColor(session.status || '');
    const hasNotes = session.session_notes && session.session_notes.trim().length > 0;
    const hasGoals = session.patient_goals && session.patient_goals.trim().length > 0;
    
    return (
      <TouchableOpacity
        key={session.id}
        style={[styles.sessionCard, { backgroundColor: themeStyle.dashboardcard }]}
        onPress={() => handleSessionPress(session)}
      >
        {/* Session Header */}
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Text style={[styles.sessionTitle, { color: themeStyle.text }]}>
              Session #{session.session_number || index + 1}
            </Text>
            <Text style={[styles.sessionType, { color: themeStyle.label }]}>
              {session.session_type || 'Individual'} • {session.is_online ? 'Online' : (session.location || 'In-person')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{session.status || 'Unknown'}</Text>
          </View>
        </View>

        {/* Session Details */}
        <View style={styles.sessionDetails}>
          <Text style={[styles.sessionDate, { color: themeStyle.text }]}>
            📅 {formatDate(session.scheduled_date || session.created_at)}
          </Text>
          
          {session.actual_duration_minutes && session.actual_duration_minutes > 0 && (
            <Text style={[styles.sessionDuration, { color: themeStyle.label }]}>
              ⏱️ Duration: {session.actual_duration_minutes} minutes
            </Text>
          )}

          {hasGoals && (
            <Text style={[styles.sessionGoals, { color: themeStyle.label }]} numberOfLines={2}>
              🎯 Goals: {session.patient_goals}
            </Text>
          )}

          {hasNotes && (
            <Text style={[styles.sessionNotes, { color: themeStyle.label }]} numberOfLines={2}>
              📝 Notes: {session.session_notes}
            </Text>
          )}

          {/* Mood Indicators */}
          {(session.patient_mood_before || session.patient_mood_after) && (
            <View style={styles.moodRow}>
              {session.patient_mood_before && (
                <Text style={[styles.moodIndicator, { color: themeStyle.label }]}>
                  😔 Before: {session.patient_mood_before}/10
                </Text>
              )}
              {session.patient_mood_after && (
                <Text style={[styles.moodIndicator, { color: themeStyle.label }]}>
                  😊 After: {session.patient_mood_after}/10
                </Text>
              )}
              {session.mood_improvement !== null && session.mood_improvement !== undefined && (
                <Text style={[
                  styles.moodImprovement,
                  { color: session.mood_improvement >= 0 ? '#34C759' : '#FF3B30' }
                ]}>
                  {session.mood_improvement >= 0 ? '📈' : '📉'} {session.mood_improvement > 0 ? '+' : ''}{session.mood_improvement}
                </Text>
              )}
            </View>
          )}

          {/* Session Effectiveness */}
          {session.session_effectiveness && (
            <Text style={[styles.effectivenessText, { color: themeStyle.label }]}>
              ⭐ Effectiveness: {session.session_effectiveness}/10
            </Text>
          )}
        </View>

        {/* Tap Indicator */}
        <View style={styles.tapIndicator}>
          <Text style={[styles.tapText, { color: themeStyle.label }]}>
            {session.id && !session.id.startsWith('last-') && !session.id.startsWith('next-') 
              ? 'Tap to view full details →' 
              : 'Tap for options →'
            }
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#00B894' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session History</Text>
        <TouchableOpacity onPress={() => router.push({
          pathname: './start-session',
          params: { patientId: patientId }
        })}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Patient Info */}
      <View style={[styles.patientInfo, { backgroundColor: themeStyle.dashboardcard }]}>
        <Text style={[styles.patientName, { color: themeStyle.text }]}>
          👤 {patientName || patient?.full_name || 'Patient'}
        </Text>
        <Text style={[styles.sessionsCount, { color: themeStyle.label }]}>
          Total Sessions: {patient?.total_sessions || sessions.length}
        </Text>
      </View>

      {/* Sessions List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeStyle.text} />
          <Text style={[styles.loadingText, { color: themeStyle.text }]}>
            Loading sessions...
          </Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={[styles.emptyTitle, { color: themeStyle.text }]}>
            No Sessions Found
          </Text>
          <Text style={[styles.emptySubtitle, { color: themeStyle.label }]}>
            This patient doesnt have session data available yet.
          </Text>
          <TouchableOpacity 
            style={[styles.createButton, { backgroundColor: '#007AFF' }]}
            onPress={() => router.push({
              pathname: './start-session',
              params: { patientId: patientId }
            })}
          >
            <Text style={styles.createButtonText}>Create First Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.sessionsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#00B894']}
              tintColor={themeStyle.text}
            />
          }
        >
          {sessions.map((session, index) => renderSessionCard(session, index))}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default SessionDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  backText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  addText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  patientInfo: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sessionsCount: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  sessionDetails: {
    gap: 6,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  sessionDuration: {
    fontSize: 14,
  },
  sessionGoals: {
    fontSize: 14,
    lineHeight: 18,
  },
  sessionNotes: {
    fontSize: 14,
    lineHeight: 18,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  moodIndicator: {
    fontSize: 14,
  },
  moodImprovement: {
    fontSize: 14,
    fontWeight: '600',
  },
  effectivenessText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tapIndicator: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  tapText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 20,
  },
});