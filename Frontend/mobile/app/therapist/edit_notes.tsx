
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity, 
  TextInput,
  SafeAreaView,
  StyleSheet
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSessionDetail } from '../hooks/useTherapist';
import { useTheme } from '../contexts/ThemeContext';
import { SessionNotes } from '../types/therapist';

export default function EditSessionNotes() {
  const params = useLocalSearchParams();
  const { themeStyle } = useTheme();
  
  // Extract parameters with proper type handling
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const patientName = Array.isArray(params.patientName) ? params.patientName[0] : params.patientName;
  const patientId = Array.isArray(params.patientId) ? params.patientId[0] : params.patientId;

  console.log('EditSessionNotes params:', { sessionId, patientName, patientId });

  const { session, loading, error, updateNotes } = useSessionDetail(sessionId);

  // Form state
  const [sessionNotes, setSessionNotes] = useState('');
  const [patientMoodBefore, setPatientMoodBefore] = useState('');
  const [patientMoodAfter, setPatientMoodAfter] = useState('');
  const [homeworkAssigned, setHomeworkAssigned] = useState('');
  const [nextSessionGoals, setNextSessionGoals] = useState('');
  const [sessionEffectiveness, setSessionEffectiveness] = useState('');
  const [therapistObservations, setTherapistObservations] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize form with existing data when session loads
  useEffect(() => {
    if (session) {
      setSessionNotes(session.session_notes || '');
      setPatientMoodBefore(session.patient_mood_before?.toString() || '');
      setPatientMoodAfter(session.patient_mood_after?.toString() || '');
      setHomeworkAssigned(session.homework_assigned || '');
      setNextSessionGoals(session.next_session_goals || '');
      setSessionEffectiveness(session.session_effectiveness?.toString() || '');
      setTherapistObservations(session.therapist_observations || '');
    }
  }, [session]);

  const handleBack = () => {
    router.back();
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate required fields
      if (!sessionNotes.trim()) {
        Alert.alert('Validation Error', 'Session notes are required.');
        return;
      }

      // Validate mood ratings
      const moodBeforeValue = parseInt(patientMoodBefore);
      if (patientMoodBefore && (isNaN(moodBeforeValue) || moodBeforeValue < 1 || moodBeforeValue > 10)) {
        Alert.alert('Validation Error', 'Patient mood before must be a number between 1 and 10.');
        return;
      }

      const moodAfterValue = parseInt(patientMoodAfter);
      if (patientMoodAfter && (isNaN(moodAfterValue) || moodAfterValue < 1 || moodAfterValue > 10)) {
        Alert.alert('Validation Error', 'Patient mood after must be a number between 1 and 10.');
        return;
      }

      // Validate effectiveness rating
      const effectivenessValue = parseInt(sessionEffectiveness);
      if (sessionEffectiveness && (isNaN(effectivenessValue) || effectivenessValue < 1 || effectivenessValue > 10)) {
        Alert.alert('Validation Error', 'Session effectiveness must be a number between 1 and 10.');
        return;
      }

      // Prepare update data according to the API endpoint specification
      const updateData: SessionNotes = {};
      
      // Only include fields that have values
      if (sessionNotes.trim()) {
        updateData.session_notes = sessionNotes.trim();
      }
      if (patientMoodBefore) {
        updateData.patient_mood_before = parseInt(patientMoodBefore);
      }
      if (patientMoodAfter) {
        updateData.patient_mood_after = parseInt(patientMoodAfter);
      }
      if (homeworkAssigned.trim()) {
        updateData.homework_assigned = homeworkAssigned.trim();
      }
      if (nextSessionGoals.trim()) {
        updateData.next_session_goals = nextSessionGoals.trim();
      }
      if (sessionEffectiveness) {
        updateData.session_effectiveness = parseInt(sessionEffectiveness);
      }
      if (therapistObservations.trim()) {
        updateData.therapist_observations = therapistObservations.trim();
      }

      console.log('Updating session notes with data:', updateData);

      await updateNotes(updateData);

      Alert.alert('Success', 'Session notes updated successfully.', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]);

    } catch (error: any) {
      console.error('Failed to update session notes:', error);
      Alert.alert('Error', error.message || 'Failed to update session notes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={[styles.header, { backgroundColor: '#524f85' }]}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Session Notes</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeStyle.text} />
          <Text style={[styles.loadingText, { color: themeStyle.text }]}>Loading session details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={[styles.header, { backgroundColor: '#524f85' }]}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Session Notes</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeStyle.text }]}>
            {error?.message || 'Session not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={[styles.header, { backgroundColor: '#524f85' }]}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Session Notes</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          style={[styles.saveHeaderButton, saving && styles.disabledButton]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveHeaderButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Session Header */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.patientName, { color: themeStyle.text }]}>{patientName || 'Unknown Patient'}</Text>
            <Text style={[styles.sessionNumber, { color: themeStyle.label }]}>Session #{session.session_number || 1}</Text>
          </View>
        </View>

        {/* Session Notes */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Session Notes *</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput, { 
              backgroundColor: themeStyle.background, 
              color: themeStyle.text,
              borderColor: themeStyle.label 
            }]}
            value={sessionNotes}
            onChangeText={setSessionNotes}
            placeholder="Enter session notes..."
            placeholderTextColor={themeStyle.label}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Patient Mood Before Session */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Patient Mood Before Session</Text>
          <Text style={[styles.fieldDescription, { color: themeStyle.label }]}>Rate from 1 (very low) to 10 (very high)</Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: themeStyle.background, 
              color: themeStyle.text,
              borderColor: themeStyle.label 
            }]}
            value={patientMoodBefore}
            onChangeText={setPatientMoodBefore}
            placeholder="Enter mood rating (1-10)"
            placeholderTextColor={themeStyle.label}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>

        {/* Patient Mood After Session */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Patient Mood After Session</Text>
          <Text style={[styles.fieldDescription, { color: themeStyle.label }]}>Rate from 1 (very low) to 10 (very high)</Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: themeStyle.background, 
              color: themeStyle.text,
              borderColor: themeStyle.label 
            }]}
            value={patientMoodAfter}
            onChangeText={setPatientMoodAfter}
            placeholder="Enter mood rating (1-10)"
            placeholderTextColor={themeStyle.label}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>

        {/* Therapist Observations */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Therapist Observations</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput, { 
              backgroundColor: themeStyle.background, 
              color: themeStyle.text,
              borderColor: themeStyle.label 
            }]}
            value={therapistObservations}
            onChangeText={setTherapistObservations}
            placeholder="Enter your observations about the patient's behavior, engagement, progress, etc..."
            placeholderTextColor={themeStyle.label}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Homework Assigned */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Homework Assigned</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput, { 
              backgroundColor: themeStyle.background, 
              color: themeStyle.text,
              borderColor: themeStyle.label 
            }]}
            value={homeworkAssigned}
            onChangeText={setHomeworkAssigned}
            placeholder="Enter homework or tasks assigned to patient..."
            placeholderTextColor={themeStyle.label}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Next Session Goals */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Next Session Goals</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput, { 
              backgroundColor: themeStyle.background, 
              color: themeStyle.text,
              borderColor: themeStyle.label 
            }]}
            value={nextSessionGoals}
            onChangeText={setNextSessionGoals}
            placeholder="Enter goals for the next session..."
            placeholderTextColor={themeStyle.label}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Session Effectiveness */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Session Effectiveness</Text>
          <Text style={[styles.fieldDescription, { color: themeStyle.label }]}>Rate from 1 (not effective) to 10 (very effective)</Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: themeStyle.background, 
              color: themeStyle.text,
              borderColor: themeStyle.label 
            }]}
            value={sessionEffectiveness}
            onChangeText={setSessionEffectiveness}
            placeholder="Enter effectiveness rating (1-10)"
            placeholderTextColor={themeStyle.label}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>

        {/* Save Button */}
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, saving && styles.disabledButton]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
  saveHeaderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  saveHeaderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
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
  headerContent: {
    alignItems: 'center',
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sessionNumber: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  fieldDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  multilineInput: {
    minHeight: 120,
  },
  saveButton: {
    backgroundColor: '#524f85',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 20,
  },
});