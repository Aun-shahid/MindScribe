








import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';

type SessionDetail = {
  id: string;
  patient: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    patient_id: string;
  };
  therapist: {
    id: string;
    full_name: string;
    email: string;
    specialization: string;
  };
  session_number: number;
  session_type: string;
  status: string;
  location: string;
  is_online: boolean;
  scheduled_date: string;
  actual_duration_minutes: number;
  // Only the fields you want to display
  session_notes: string;
  patient_goals: string;
  homework_assigned: string;
  next_session_goals: string;
  patient_mood_before: number | null;
  patient_mood_after: number | null;
  mood_improvement: number | null;
  therapist_observations: string | null;
  session_effectiveness: number | null;
};

const SessionDetailView = () => {
  const { themeStyle } = useTheme();
  const { sessionId, patientName } = useLocalSearchParams();

  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetail();
    }
  }, [sessionId]);

  const fetchSessionDetail = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching details for session:', sessionId);
      console.log('🔍 Session ID type:', typeof sessionId);
      console.log('🔍 Session ID value:', sessionId);

      // Validate session ID format
      if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
        throw new Error('Invalid session ID');
      }

      const response = await api.get(`/therapy_sessions/sessions/${sessionId}/`);
      const sessionData = response.data;

      console.log('✅ Fetched session detail:', sessionData);
      setSessionDetail(sessionData);
    } catch (error: any) {
      console.error('❌ Failed to fetch session detail:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error headers:', error.response?.headers);
      
      let errorMessage = 'Failed to load session details';
      if (error.message === 'Invalid session ID') {
        errorMessage = 'Invalid session ID provided';
      } else if (error.response?.status === 404) {
        errorMessage = 'Session not found';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view this session';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      Alert.alert('Error', `${errorMessage}\n\nSession ID: ${sessionId}`, [
        {
          text: 'Go Back',
          onPress: () => router.back()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
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

  const handleEditNotes = () => {
    router.push({
      pathname: './session-notes-edit',
      params: {
        sessionId: sessionId,
        existingNotes: sessionDetail?.session_notes || '',
        existingMood: sessionDetail?.patient_mood_after?.toString() || '7'
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={[styles.header, { backgroundColor: '#00B894' }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Session Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeStyle.text} />
          <Text style={[styles.loadingText, { color: themeStyle.text }]}>
            Loading session details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!sessionDetail) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={[styles.header, { backgroundColor: '#00B894' }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Session Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>❌</Text>
          <Text style={[styles.emptyTitle, { color: themeStyle.text }]}>
            Session Not Found
          </Text>
          <Text style={[styles.emptySubtitle, { color: themeStyle.label }]}>
            The requested session could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = getStatusColor(sessionDetail.status);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#00B894' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session #{sessionDetail.session_number}</Text>
        <TouchableOpacity onPress={handleEditNotes}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Session Overview */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: themeStyle.text }]}>Session Overview</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{sessionDetail.status}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: themeStyle.label }]}>Patient:</Text>
            <Text style={[styles.detailValue, { color: themeStyle.text }]}>
              {sessionDetail.patient.full_name}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: themeStyle.label }]}>Type:</Text>
            <Text style={[styles.detailValue, { color: themeStyle.text }]}>
              {sessionDetail.session_type} • {sessionDetail.is_online ? 'Online' : sessionDetail.location}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: themeStyle.label }]}>Scheduled:</Text>
            <Text style={[styles.detailValue, { color: themeStyle.text }]}>
              {formatDate(sessionDetail.scheduled_date)}
            </Text>
          </View>
          
          {sessionDetail.actual_duration_minutes && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: themeStyle.label }]}>Duration:</Text>
              <Text style={[styles.detailValue, { color: themeStyle.text }]}>
                {sessionDetail.actual_duration_minutes} minutes
              </Text>
            </View>
          )}
        </View>

        {/* Session Goals */}
        {sessionDetail.patient_goals && (
          <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.cardTitle, { color: themeStyle.text }]}>🎯 Session Goals</Text>
            <Text style={[styles.contentText, { color: themeStyle.text }]}>
              {sessionDetail.patient_goals}
            </Text>
          </View>
        )}

        {/* Session Notes */}
        {sessionDetail.session_notes && (
          <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.cardTitle, { color: themeStyle.text }]}>📝 Session Notes</Text>
            <Text style={[styles.contentText, { color: themeStyle.text }]}>
              {sessionDetail.session_notes}
            </Text>
          </View>
        )}

        {/* Therapist Observations */}
        {sessionDetail.therapist_observations && (
          <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.cardTitle, { color: themeStyle.text }]}>👁️ Therapist Observations</Text>
            <Text style={[styles.contentText, { color: themeStyle.text }]}>
              {sessionDetail.therapist_observations}
            </Text>
          </View>
        )}

        {/* Mood Analysis */}
        {(sessionDetail.patient_mood_before || sessionDetail.patient_mood_after || sessionDetail.mood_improvement !== null) && (
          <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.cardTitle, { color: themeStyle.text }]}>😊 Mood Analysis</Text>
            
            <View style={styles.moodContainer}>
              {sessionDetail.patient_mood_before && (
                <View style={styles.moodItem}>
                  <Text style={[styles.moodLabel, { color: themeStyle.label }]}>Before Session:</Text>
                  <Text style={[styles.moodValue, { color: themeStyle.text }]}>
                    {sessionDetail.patient_mood_before}/10
                  </Text>
                </View>
              )}
              
              {sessionDetail.patient_mood_after && (
                <View style={styles.moodItem}>
                  <Text style={[styles.moodLabel, { color: themeStyle.label }]}>After Session:</Text>
                  <Text style={[styles.moodValue, { color: themeStyle.text }]}>
                    {sessionDetail.patient_mood_after}/10
                  </Text>
                </View>
              )}
              
              {sessionDetail.mood_improvement !== null && (
                <View style={styles.moodItem}>
                  <Text style={[styles.moodLabel, { color: themeStyle.label }]}>Improvement:</Text>
                  <Text style={[
                    styles.moodValue,
                    { color: sessionDetail.mood_improvement >= 0 ? '#34C759' : '#FF3B30' }
                  ]}>
                    {sessionDetail.mood_improvement > 0 ? '+' : ''}{sessionDetail.mood_improvement}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Homework & Next Steps */}
        {(sessionDetail.homework_assigned || sessionDetail.next_session_goals) && (
          <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.cardTitle, { color: themeStyle.text }]}>📚 Homework & Next Steps</Text>
            
            {sessionDetail.homework_assigned && (
              <View style={styles.assignmentItem}>
                <Text style={[styles.assignmentLabel, { color: themeStyle.label }]}>Homework Assigned:</Text>
                <Text style={[styles.contentText, { color: themeStyle.text }]}>
                  {sessionDetail.homework_assigned}
                </Text>
              </View>
            )}
            
            {sessionDetail.next_session_goals && (
              <View style={styles.assignmentItem}>
                <Text style={[styles.assignmentLabel, { color: themeStyle.label }]}>Next Session Goals:</Text>
                <Text style={[styles.contentText, { color: themeStyle.text }]}>
                  {sessionDetail.next_session_goals}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Session Effectiveness */}
        {sessionDetail.session_effectiveness && (
          <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.cardTitle, { color: themeStyle.text }]}>⭐ Session Effectiveness</Text>
            
            <View style={styles.effectivenessContainer}>
              <View style={styles.effectivenessItem}>
                <Text style={[styles.effectivenessLabel, { color: themeStyle.label }]}>
                  Therapist Rating:
                </Text>
                <Text style={[styles.effectivenessValue, { color: themeStyle.text }]}>
                  {sessionDetail.session_effectiveness}/10
                </Text>
              </View>
              
              {/* Visual rating bar */}
              <View style={styles.ratingBarContainer}>
                <View style={styles.ratingBarBackground}>
                  <View style={[
                    styles.ratingBarFill,
                    { 
                      width: `${(sessionDetail.session_effectiveness / 10) * 100}%`,
                      backgroundColor: sessionDetail.session_effectiveness >= 8 ? '#34C759' : 
                                     sessionDetail.session_effectiveness >= 6 ? '#FF9500' : '#FF3B30'
                    }
                  ]} />
                </View>
                <Text style={[styles.ratingDescription, { color: themeStyle.label }]}>
                  {sessionDetail.session_effectiveness >= 8 ? 'Highly Effective' :
                   sessionDetail.session_effectiveness >= 6 ? 'Moderately Effective' : 'Needs Improvement'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SessionDetailView;

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
  editText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  moodContainer: {
    gap: 12,
  },
  moodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  moodValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  assignmentItem: {
    marginBottom: 16,
  },
  assignmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  effectivenessContainer: {
    gap: 12,
  },
  effectivenessItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  effectivenessLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  effectivenessValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  ratingBarContainer: {
    gap: 8,
  },
  ratingBarBackground: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  ratingDescription: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 20,
  },
});