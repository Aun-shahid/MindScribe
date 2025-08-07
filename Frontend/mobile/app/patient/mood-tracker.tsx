import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
// Note: Install @react-native-community/slider or use a built-in alternative
// import Slider from '@react-native-community/slider';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';
import { router } from 'expo-router';

const moods = [
  { value: 'very_sad', label: '😢 Very Sad' },
  { value: 'sad', label: '😔 Sad' },
  { value: 'neutral', label: '😐 Neutral' },
  { value: 'happy', label: '😊 Happy' },
  { value: 'very_happy', label: '😄 Very Happy' }
];

const triggers = [
  { value: 'work', label: 'Work/Career' },
  { value: 'family', label: 'Family' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'health', label: 'Health' },
  { value: 'finances', label: 'Finances' },
  { value: 'social', label: 'Social' },
  { value: 'weather', label: 'Weather' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'medication', label: 'Medication' },
  { value: 'therapy', label: 'Therapy' },
  { value: 'other', label: 'Other' }
];

// TypeScript interface for the mood entry request
interface MoodEntry {
  mood: string;
  mood_score: number;
  energy_level: number;
  anxiety_level: number;
  triggers_list: string[];
  notes: string;
}

// TypeScript interface for the API response
interface MoodEntryResponse {
  id?: string;
  mood: string;
  mood_score: number;
  energy_level: number;
  sleep_quality?: number;
  anxiety_level: number;
  stress_level?: number;
  triggers_list: string[];
  location?: string;
  weather?: string;
  notes: string;
  coping_strategies_used?: string;
  created_at?: string;
  updated_at?: string;
}

// TypeScript interface for mood history
interface MoodHistoryEntry {
  id: string;
  mood: string;
  mood_score: number;
  energy_level: number;
  sleep_quality?: number;
  anxiety_level: number;
  stress_level?: number;
  triggers: string;
  triggers_list: string[];
  location?: string;
  weather?: string;
  notes: string;
  coping_strategies_used?: string;
  created_at: string;
  updated_at: string;
}

const MoodTracker = () => {
  const { themeStyle } = useTheme();

  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [moodScore, setMoodScore] = useState<number>(5);
  const [energyLevel, setEnergyLevel] = useState<number>(5);
  const [anxietyLevel, setAnxietyLevel] = useState<number>(3);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Mood history states
  const [moodHistory, setMoodHistory] = useState<MoodHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const toggleMood = (moodValue: string) => {
    setSelectedMoods(prev =>
      prev.includes(moodValue) ? prev.filter(m => m !== moodValue) : [...prev, moodValue]
    );
  };

  const toggleTrigger = (triggerValue: string) => {
    setSelectedTriggers(prev =>
      prev.includes(triggerValue) ? prev.filter(t => t !== triggerValue) : [...prev, triggerValue]
    );
  };

  // Fetch mood history
  const fetchMoodHistory = async () => {
    try {
      setHistoryLoading(true);
      console.log('📥 Fetching mood history...');
      
      const response = await api.get<MoodHistoryEntry[]>('/history/mood/', {
        params: {
          limit: 10 // Get last 10 entries
        }
      });
      
      console.log('📋 Mood history received:', response.data);
      setMoodHistory(response.data);
    } catch (error) {
      console.error('❌ Error fetching mood history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Format mood name for display
  const formatMoodName = (mood: string) => {
    return mood.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async () => {
    if (selectedMoods.length === 0) {
      Alert.alert('Error', 'Please select at least one mood.');
      return;
    }

    const payload: MoodEntry = {
      mood: selectedMoods[0], // Use the first selected mood
      mood_score: moodScore,
      energy_level: energyLevel,
      anxiety_level: anxietyLevel,
      triggers_list: selectedTriggers,
      notes: notes.trim(),
    };

    try {
      setLoading(true);
      console.log('📤 Submitting mood entry:', payload);
      console.log('📡 API endpoint: /history/mood/');

      const res = await api.post<MoodEntryResponse>('/history/mood/', payload);
      console.log('✅ Mood entry saved:', res.data);

      // Use the response data to show confirmation
      const savedEntry = res.data;
      
      // Format the mood name nicely
      const formatMoodName = (mood: string) => {
        return mood.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      };
      
      let confirmationMessage = `Your mood entry has been saved successfully!\n\n`;
      confirmationMessage += `Mood: ${formatMoodName(savedEntry.mood)}\n`;
      confirmationMessage += `Mood Score: ${savedEntry.mood_score}/10\n`;
      confirmationMessage += `Energy Level: ${savedEntry.energy_level}/10\n`;
      confirmationMessage += `Anxiety Level: ${savedEntry.anxiety_level}/10\n`;
      confirmationMessage += `Triggers: ${savedEntry.triggers_list}\n`;
      
      if (savedEntry.triggers_list?.length > 0) {
        confirmationMessage += `Triggers: ${savedEntry.triggers_list.join(', ')}\n`;
      }
      
      if (savedEntry.notes && savedEntry.notes.trim()) {
        confirmationMessage += `Notes: ${savedEntry.notes}\n`;
      }
      
      Alert.alert('Success!', confirmationMessage, [
        { text: 'OK', onPress: () => {
          // Refresh history after successful save
          if (showHistory) {
            fetchMoodHistory();
          }
          router.back();
        }}
      ]);
    } catch (err: any) {
      console.error('❌ Error saving mood:', err?.response?.data || err);
      console.error('❌ Full error:', err);
      
      let errorMessage = 'Failed to save mood. Please try again.';
      
      if (err?.response?.status === 404) {
        errorMessage = 'API endpoint not found. Please check if the backend is running.';
      } else if (err?.response?.status === 400) {
        const errors = err?.response?.data;
        if (typeof errors === 'object' && errors !== null) {
          errorMessage = Object.entries(errors)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
        } else {
          errorMessage = errors || 'Bad request. Please check your input.';
        }
      } else if (err?.response?.status === 500) {
        errorMessage = 'Server error. The database table may not exist. Please contact support.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#00B894' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mood Tracker</Text>
        <View style={{ width: 40 }} /> {/* Placeholder for symmetry */}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: themeStyle.text }]}>How are you feeling right now?</Text>

        <View style={styles.grid}>
          {moods.map(moodItem => (
            <TouchableOpacity
              key={moodItem.value}
              style={[
                styles.moodButton,
                selectedMoods.includes(moodItem.value) && styles.moodButtonSelected
              ]}
              onPress={() => toggleMood(moodItem.value)}
            >
              <Text style={[
                styles.moodText,
                selectedMoods.includes(moodItem.value) && styles.moodTextSelected
              ]}>
                {moodItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Mood Score (1-10)</Text>
        
        {/* Mood Score Slider */}
        <View style={styles.sliderContainer}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
            <TouchableOpacity
              key={value}
              style={[
                styles.sliderButton,
                moodScore === value && styles.sliderButtonSelected
              ]}
              onPress={() => setMoodScore(value)}
            >
              <Text style={[
                styles.sliderButtonText,
                moodScore === value && styles.sliderButtonTextSelected
              ]}>
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={[styles.sliderValue, { color: themeStyle.text }]}>Mood Score: {moodScore}/10</Text>

        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Energy Level (1-10)</Text>
        
        {/* Energy Level Slider */}
        <View style={styles.sliderContainer}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
            <TouchableOpacity
              key={value}
              style={[
                styles.sliderButton,
                energyLevel === value && styles.sliderButtonSelected
              ]}
              onPress={() => setEnergyLevel(value)}
            >
              <Text style={[
                styles.sliderButtonText,
                energyLevel === value && styles.sliderButtonTextSelected
              ]}>
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={[styles.sliderValue, { color: themeStyle.text }]}>Energy Level: {energyLevel}/10</Text>

        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Anxiety Level (1-10)</Text>
        
        {/* Anxiety Level Slider */}
        <View style={styles.sliderContainer}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
            <TouchableOpacity
              key={value}
              style={[
                styles.sliderButton,
                anxietyLevel === value && styles.sliderButtonSelected
              ]}
              onPress={() => setAnxietyLevel(value)}
            >
              <Text style={[
                styles.sliderButtonText,
                anxietyLevel === value && styles.sliderButtonTextSelected
              ]}>
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={[styles.sliderValue, { color: themeStyle.text }]}>Anxiety Level: {anxietyLevel}/10</Text>

        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>What might be influencing this mood?</Text>
        <View style={styles.triggerGrid}>
          {triggers.map(triggerItem => (
            <TouchableOpacity
              key={triggerItem.value}
              style={[
                styles.triggerButton,
                selectedTriggers.includes(triggerItem.value) && styles.triggerButtonSelected
              ]}
              onPress={() => toggleTrigger(triggerItem.value)}
            >
              <Text style={[
                styles.triggerText,
                selectedTriggers.includes(triggerItem.value) && styles.triggerTextSelected
              ]}>
                {triggerItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Notes (Optional)</Text>
        <TextInput
          style={[styles.textArea, {
            backgroundColor: themeStyle.background,
            color: themeStyle.text,
            borderColor: themeStyle.border
          }]}
          placeholder="Add any notes..."
          placeholderTextColor={themeStyle.label}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity
          style={[styles.submitButton, { opacity: loading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Saving...' : 'Save Mood Entry'}
          </Text>
        </TouchableOpacity>

        {/* Mood History Section */}
        <View style={styles.historySection}>
          <TouchableOpacity
            style={styles.historyToggle}
            onPress={() => {
              setShowHistory(!showHistory);
              if (!showHistory && moodHistory.length === 0) {
                fetchMoodHistory();
              }
            }}
          >
            <Text style={[styles.historyToggleText, { color: themeStyle.text }]}>
              📊 Mood History {showHistory ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {showHistory && (
            <View style={styles.historyContainer}>
              {historyLoading ? (
                <View style={styles.historyLoading}>
                  <Text style={[styles.loadingText, { color: themeStyle.label }]}>
                    Loading your mood history...
                  </Text>
                </View>
              ) : moodHistory.length === 0 ? (
                <Text style={[styles.noHistoryText, { color: themeStyle.label }]}>
                  No mood entries yet. Your first entry will appear here!
                </Text>
              ) : (
                moodHistory.map((entry) => (
                  <View key={entry.id} style={[styles.historyCard, { backgroundColor: themeStyle.dashboardcard || '#ffffff' }]}>
                    <View style={styles.historyHeader}>
                      <Text style={[styles.historyMood, { color: themeStyle.text }]}>
                        {formatMoodName(entry.mood)}
                      </Text>
                      <Text style={[styles.historyDate, { color: themeStyle.label }]}>
                        {formatDate(entry.created_at)}
                      </Text>
                    </View>
                    
                    <View style={styles.historyScores}>
                      <Text style={[styles.historyScore, { color: themeStyle.text }]}>
                        Mood: {entry.mood_score}/10
                      </Text>
                      <Text style={[styles.historyScore, { color: themeStyle.text }]}>
                        Energy: {entry.energy_level}/10
                      </Text>
                      <Text style={[styles.historyScore, { color: themeStyle.text }]}>
                        Anxiety: {entry.anxiety_level}/10
                      </Text>
                    </View>
                    
                    {entry.triggers_list.length > 0 && (
                      <Text style={[styles.historyTriggers, { color: themeStyle.label }]}>
                        Triggers: {entry.triggers_list.join(', ')}
                      </Text>
                    )}
                    
                    {entry.notes && (
                      <Text style={[styles.historyNotes, { color: themeStyle.text }]}>
                        "{entry.notes}"
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default MoodTracker;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between'
  },
  backText: {
    fontSize: 24,
    color: '#fff'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionTitle: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  moodButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    margin: 5,
  },
  moodButtonSelected: {
    backgroundColor: '#00B894',
  },
  moodText: {
    color: '#333',
    fontWeight: 'bold',
  },
  moodTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  sliderValue: {
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 4,
  },
  sliderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  sliderButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  sliderButtonSelected: {
    backgroundColor: '#00B894',
  },
  sliderButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  sliderButtonTextSelected: {
    color: 'white',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  triggerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  triggerButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 5,
  },
  triggerButtonSelected: {
    backgroundColor: '#00B894',
  },
  triggerText: {
    color: '#333',
    fontWeight: 'bold',
  },
  triggerTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: '#00B894',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  historySection: {
    marginTop: 30,
  },
  historyToggle: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  historyToggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyContainer: {
    gap: 10,
  },
  historyLoading: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  noHistoryText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    padding: 20,
  },
  historyCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyMood: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 12,
  },
  historyScores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyScore: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyTriggers: {
    fontSize: 12,
    marginBottom: 4,
  },
  historyNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
