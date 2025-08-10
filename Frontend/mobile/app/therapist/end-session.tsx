import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useEndSession } from '../hooks/useTherapist';
import { THERAPIST_MESSAGES } from '../constants/messages';
import { InputCard } from '../components/InputCard';

const EndSession = () => {
  const { themeStyle } = useTheme();
  const { sessionId, patientId } = useLocalSearchParams();

  const {
    loading,
    sessionNotes,
    patientMoodAfter,
    homeworkAssigned,
    nextSessionGoals,
    sessionEffectiveness,
    handleCompleteSession,
    setSessionNotes,
    setPatientMoodAfter,
    setHomeworkAssigned,
    setNextSessionGoals,
    setSessionEffectiveness,
  } = useEndSession({ sessionId, patientId });


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={[styles.header, { backgroundColor: themeStyle.logoutButton }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{THERAPIST_MESSAGES.END_SESSION_TITLE}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <InputCard
          title={THERAPIST_MESSAGES.END_SESSION_NOTES_TITLE}
          value={sessionNotes}
          onChangeText={setSessionNotes}
          placeholder={THERAPIST_MESSAGES.END_SESSION_NOTES_PLACEHOLDER}
          themeStyle={themeStyle}
          multiline
          numberOfLines={4}
        />

        <InputCard
          title={THERAPIST_MESSAGES.END_SESSION_MOOD_TITLE}
          value={patientMoodAfter}
          onChangeText={setPatientMoodAfter}
          placeholder={THERAPIST_MESSAGES.END_SESSION_MOOD_PLACEHOLDER}
          themeStyle={themeStyle}
          keyboardType="numeric"
          maxLength={2}
        />

        <InputCard
          title={THERAPIST_MESSAGES.END_SESSION_HOMEWORK_TITLE}
          value={homeworkAssigned}
          onChangeText={setHomeworkAssigned}
          placeholder={THERAPIST_MESSAGES.END_SESSION_HOMEWORK_PLACEHOLDER}
          themeStyle={themeStyle}
          multiline
          numberOfLines={3}
        />

        <InputCard
          title={THERAPIST_MESSAGES.END_SESSION_GOALS_TITLE}
          value={nextSessionGoals}
          onChangeText={setNextSessionGoals}
          placeholder={THERAPIST_MESSAGES.END_SESSION_GOALS_PLACEHOLDER}
          themeStyle={themeStyle}
          multiline
          numberOfLines={3}
        />

        <InputCard
          title={THERAPIST_MESSAGES.END_SESSION_EFFECTIVENESS_TITLE}
          value={sessionEffectiveness}
          onChangeText={setSessionEffectiveness}
          placeholder={THERAPIST_MESSAGES.END_SESSION_EFFECTIVENESS_PLACEHOLDER}
          themeStyle={themeStyle}
          keyboardType="numeric"
          maxLength={2}
        />

        <TouchableOpacity
          style={[styles.completeButton, { opacity: loading ? 0.7 : 1 }, {backgroundColor: themeStyle.button }]}
          onPress={handleCompleteSession}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.completeButtonText}>{THERAPIST_MESSAGES.END_SESSION_COMPLETE_BUTTON}</Text>
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
