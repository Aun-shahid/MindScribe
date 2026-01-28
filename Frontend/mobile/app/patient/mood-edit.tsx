import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { router, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import api from '../utils/api';

// Mood options
const moods = [
  { value: 'happy', emoji: '😊', label: 'Happy' },
  { value: 'sad', emoji: '😢', label: 'Sad' },
  { value: 'angry', emoji: '😠', label: 'Angry' },
  { value: 'anxious', emoji: '😰', label: 'Anxious' },
  { value: 'peaceful', emoji: '😌', label: 'Peaceful' },
  { value: 'excited', emoji: '🤩', label: 'Excited' },
  { value: 'grateful', emoji: '🙏', label: 'Grateful' },
  { value: 'overwhelmed', emoji: '😵', label: 'Overwhelmed' },
  { value: 'hopeful', emoji: '🌟', label: 'Hopeful' },
  { value: 'stressed', emoji: '😫', label: 'Stressed' },
];

const commonTriggers = [
  'Work',
  'Family',
  'Relationships',
  'Health',
  'Money',
  'Sleep',
  'Social',
  'Weather',
];

interface MoodEntryDetail {
  id: string;
  mood_intensities: { [key: string]: number };
  triggers: string;
  triggers_list: string[];
  activities: string;
  notes: string;
  mood_date: string;
}

export default function MoodEditScreen() {
  const { themeStyle } = useTheme();
  const params = useLocalSearchParams();
  const moodId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [moodEntry, setMoodEntry] = useState<MoodEntryDetail | null>(null);

  // Form state
  const [moodIntensities, setMoodIntensities] = useState<{ [key: string]: number }>(
    Object.fromEntries(moods.map((m) => [m.value, 1]))
  );
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [activities, setActivities] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadMoodEntry();
  }, [moodId]);

  const loadMoodEntry = async () => {
    try {
      setLoading(true);
      const response = await api.get<MoodEntryDetail>(`/patients/mood/${moodId}/`);
      const entry = response.data;
      setMoodEntry(entry);

      // Populate form with existing data
      if (entry.mood_intensities) {
        const intensities = { ...moodIntensities };
        Object.entries(entry.mood_intensities).forEach(([mood, intensity]) => {
          intensities[mood] = intensity as number;
        });
        setMoodIntensities(intensities);
      }

      if (entry.triggers_list && entry.triggers_list.length > 0) {
        setSelectedTriggers(entry.triggers_list);
      } else if (entry.triggers) {
        setSelectedTriggers(entry.triggers.split(',').map((t) => t.trim()).filter(Boolean));
      }

      setActivities(entry.activities || '');
      setNotes(entry.notes || '');
    } catch (error: any) {
      console.error('❌ Error loading mood entry:', error);
      Alert.alert('Error', 'Failed to load mood entry. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const updateMoodIntensity = (moodValue: string, intensity: number) => {
    setMoodIntensities((prev) => ({
      ...prev,
      [moodValue]: intensity,
    }));
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]
    );
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 4) return '#4CAF50';
    if (intensity === 3) return '#FF9800';
    return '#F44336';
  };

  const handleUpdate = async () => {
    // Filter active moods (intensity > 1)
    const activeMoods = Object.entries(moodIntensities)
      .filter(([_, intensity]) => intensity > 1)
      .reduce((acc, [mood, intensity]) => ({ ...acc, [mood]: intensity }), {});

    if (Object.keys(activeMoods).length === 0) {
      Alert.alert('No Moods Selected', 'Please rate at least one mood with intensity 2 or higher.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        mood_intensities: activeMoods,
        triggers_list: selectedTriggers,
        activities: activities.trim(),
        notes: notes.trim(),
      };

      console.log('📤 Updating mood entry:', payload);

      await api.put(`/patients/mood/${moodId}/`, payload);

      Alert.alert('Success', 'Mood entry updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('❌ Error updating mood entry:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail ||
          error.response?.data?.message ||
          'Failed to update mood entry. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeStyle.button} />
          <Text style={[styles.loadingText, { color: themeStyle.label }]}>
            Loading mood entry...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backButton, { color: themeStyle.text }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeStyle.title }]}>Edit Mood Entry</Text>
        </View>

        <Text style={[styles.subtitle, { color: themeStyle.label }]}>
          Update the intensity of each mood you're experiencing
        </Text>

        {/* Mood Intensities */}
        <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
            How intense is each mood?
          </Text>
          <Text style={[styles.helperText, { color: themeStyle.label }]}>
            Slide to rate each mood (1=barely, 5=very intense)
          </Text>

          {moods.map((mood) => {
            const intensity = moodIntensities[mood.value];
            const isActive = intensity > 1;

            return (
              <View
                key={mood.value}
                style={[
                  styles.moodIntensityCard,
                  {
                    backgroundColor: isActive ? themeStyle.background : 'transparent',
                    borderColor: isActive ? themeStyle.progressbarmain : themeStyle.border,
                  },
                ]}
              >
                <View style={styles.moodIntensityHeader}>
                  <View style={styles.moodInfo}>
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text
                      style={[
                        styles.moodName,
                        {
                          color: isActive ? themeStyle.text : themeStyle.label,
                          fontWeight: isActive ? '700' : '500',
                        },
                      ]}
                    >
                      {mood.label}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.intensityBadge,
                      {
                        backgroundColor: isActive
                          ? getIntensityColor(intensity)
                          : themeStyle.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.intensityBadgeText,
                        { color: isActive ? '#fff' : themeStyle.label },
                      ]}
                    >
                      {intensity}
                    </Text>
                  </View>
                </View>

                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={5}
                  step={1}
                  value={intensity}
                  onValueChange={(value) => updateMoodIntensity(mood.value, value)}
                  minimumTrackTintColor={isActive ? themeStyle.progressbarmain : themeStyle.border}
                  maximumTrackTintColor={themeStyle.progressbarside}
                  thumbTintColor={isActive ? themeStyle.button : themeStyle.border}
                />
              </View>
            );
          })}
        </View>

        {/* Triggers */}
        <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
            What triggered these moods?
          </Text>
          <View style={styles.triggersGrid}>
            {commonTriggers.map((trigger) => {
              const isSelected = selectedTriggers.includes(trigger);
              return (
                <TouchableOpacity
                  key={trigger}
                  onPress={() => toggleTrigger(trigger)}
                  style={[
                    styles.triggerChip,
                    {
                      backgroundColor: isSelected
                        ? themeStyle.progressbarmain
                        : themeStyle.background,
                      borderColor: isSelected ? themeStyle.progressbarmain : themeStyle.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.triggerText,
                      {
                        color: isSelected ? themeStyle.lighttext : themeStyle.text,
                      },
                    ]}
                  >
                    {trigger}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Activities */}
        <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Activities Today</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: themeStyle.background,
                color: themeStyle.text,
                borderColor: themeStyle.border,
              },
            ]}
            placeholder="e.g., Yoga, Work meeting, Walk in park..."
            placeholderTextColor={themeStyle.label}
            value={activities}
            onChangeText={setActivities}
            multiline
          />
        </View>

        {/* Notes */}
        <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Additional Notes</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: themeStyle.background,
                color: themeStyle.text,
                borderColor: themeStyle.border,
              },
            ]}
            placeholder="How are you feeling? Any specific thoughts or experiences?"
            placeholderTextColor={themeStyle.label}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Update Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: themeStyle.button },
            submitting && { opacity: 0.6 },
          ]}
          onPress={handleUpdate}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={themeStyle.buttonText} />
          ) : (
            <Text style={[styles.submitButtonText, { color: themeStyle.buttonText }]}>
              💾 Update Mood Entry
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  moodIntensityCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  moodIntensityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moodEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  moodName: {
    fontSize: 16,
  },
  intensityBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityBadgeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  triggersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  triggerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 50,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  submitButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 40,
  },
});
