import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput
} from 'react-native';
import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EndSession = () => {
  const { themeStyle } = useTheme();
  const { sessionId, patientId } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [patientMoodAfter, setPatientMoodAfter] = useState('7');
  const [homeworkAssigned, setHomeworkAssigned] = useState('');
  const [nextSessionGoals, setNextSessionGoals] = useState('');
  const [sessionEffectiveness, setSessionEffectiveness] = useState('8');
  

  const handleCompleteSession = async () => {
  if (!sessionId) {
    Alert.alert('Error', 'No session ID found');
    return;
  }

  // Add validation for required fields
  if (!sessionNotes.trim()) {
    Alert.alert('Error', 'Please enter session notes before completing.');
    return;
  }

  // Validate numeric inputs
  const moodAfter = parseInt(patientMoodAfter);
  const effectiveness = parseInt(sessionEffectiveness);

  if (isNaN(moodAfter) || moodAfter < 1 || moodAfter > 10) {
    Alert.alert('Error', 'Patient mood must be a number between 1 and 10');
    return;
  }

  if (isNaN(effectiveness) || effectiveness < 1 || effectiveness > 10) {
    Alert.alert('Error', 'Session effectiveness must be a number between 1 and 10');
    return;
  }

  const payload = {
    session_notes: sessionNotes.trim(),
    patient_mood_after: parseInt(patientMoodAfter) || 7,
    homework_assigned: homeworkAssigned.trim(),
    next_session_goals: nextSessionGoals.trim(),
    session_effectiveness: parseInt(sessionEffectiveness) || 8
  };

  try {
    setLoading(true);
    
    // Check if we have authentication token
    const token = await AsyncStorage.getItem('access_token');
    console.log('📤 Auth token exists:', !!token);
    console.log('📤 Auth token (first 20 chars):', token ? token.substring(0, 20) + '...' : 'No token');
    
    console.log('📤 Sending data:', payload);
    console.log('📤 Sending data to sessionId:', sessionId);
    console.log('📤 Request URL:', `${api.defaults.baseURL}therapy_sessions/sessions/${sessionId}/end/`);
    console.log('📤 Base URL check:', api.defaults.baseURL);
    console.log('📤 Full URL being called:', `${api.defaults.baseURL}therapy_sessions/sessions/${sessionId}/end/`);
    

    const response = await api.post(
      `/therapy_sessions/sessions/${sessionId}/end/`,
      payload
    );

    console.log('✅ Session ended:', response.data);

    // ✅ Clear form fields after successful post
    setSessionNotes('');
    setPatientMoodAfter('7');
    setHomeworkAssigned('');
    setNextSessionGoals('');
    setSessionEffectiveness('8');

    Alert.alert('Success', 'Session successfully completed.', [
      {
        text: 'OK',
        onPress: () => router.push('./patients'),
      }
    ]);
  } catch (error: any) {
    console.error('❌ Failed to complete session:', error);
    console.error('❌ Error details:', {
      message: error.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      url: error?.config?.url,
      method: error?.config?.method,
      baseURL: error?.config?.baseURL,
      timeout: error?.config?.timeout
    });
    
    // Enhanced error logging
    if (error.response) {
      console.error('📄 Error status:', error.response.status);
      console.error('📄 Error data:', error.response.data);
      console.error('📄 Error headers:', error.response.headers);
    } else if (error.request) {
      console.error('📄 No response received:', error.request);
    } else {
      console.error('📄 Request setup error:', error.message);
    }
    const status = error?.response?.status;
    const data = error?.response?.data;

    let message = 'An error occurred while completing the session.';
    
    if (status === 400) {
      // Better handling for 400 errors
      if (data?.detail) {
        message = `Validation Error: ${data.detail}`;
      } else if (data?.error) {
        message = `Error: ${data.error}`;
      } else if (typeof data === 'string') {
        message = `Error: ${data}`;
      } else if (data?.non_field_errors) {
        message = `Validation Error: ${data.non_field_errors.join(', ')}`;
      } else {
        message = `Bad Request: Please check your input data. Session ID: ${sessionId}`;
      }
    } else if (status === 404) message = 'Session not found.';
    else if (status === 403) message = 'Permission denied.';

    Alert.alert('Error', message);
  } finally {
    setLoading(false);
  }
};


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={[styles.header, { backgroundColor: themeStyle.logoutButton }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>End Session</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Session Notes</Text>
          <TextInput
            style={[styles.textArea, {
              backgroundColor: themeStyle.background,
              color: themeStyle.text,
              borderColor: themeStyle.border
            }]}
            placeholder="E.g. Covered anxiety management, patient was more open"
            placeholderTextColor={themeStyle.label}
            value={sessionNotes}
            onChangeText={setSessionNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Patient Mood After (1-10)</Text>
          <TextInput
            style={[styles.textInput, {
              backgroundColor: themeStyle.background,
              color: themeStyle.text,
              borderColor: themeStyle.border
            }]}
            placeholder="e.g. 8"
            placeholderTextColor={themeStyle.label}
            value={patientMoodAfter}
            onChangeText={setPatientMoodAfter}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Homework Assigned</Text>
          <TextInput
            style={[styles.textArea, {
              backgroundColor: themeStyle.background,
              color: themeStyle.text,
              borderColor: themeStyle.border
            }]}
            placeholder="e.g. Practice mindfulness daily"
            placeholderTextColor={themeStyle.label}
            value={homeworkAssigned}
            onChangeText={setHomeworkAssigned}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Next Session Goals</Text>
          <TextInput
            style={[styles.textArea, {
              backgroundColor: themeStyle.background,
              color: themeStyle.text,
              borderColor: themeStyle.border
            }]}
            placeholder="e.g. Explore root of social anxiety"
            placeholderTextColor={themeStyle.label}
            value={nextSessionGoals}
            onChangeText={setNextSessionGoals}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Session Effectiveness (1-10)</Text>
          <TextInput
            style={[styles.textInput, {
              backgroundColor: themeStyle.background,
              color: themeStyle.text,
              borderColor: themeStyle.border
            }]}
            placeholder="e.g. 9"
            placeholderTextColor={themeStyle.label}
            value={sessionEffectiveness}
            onChangeText={setSessionEffectiveness}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>

        <TouchableOpacity
          style={[styles.completeButton, { opacity: loading ? 0.7 : 1 }, {backgroundColor: themeStyle.button }]}
          onPress={handleCompleteSession}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.completeButtonText}>Complete Session</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default EndSession;

// Keep your styles below as they are or customize them if needed
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 48,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  completeButton: {
    backgroundColor: '#00B894',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 32,
  },
});
