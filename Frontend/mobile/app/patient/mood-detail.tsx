import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../utils/api';

// Mood options with emojis
const moods = [
  { value: 'sad', emoji: '😢', label: 'Sad', color: '#6B8CFF' },
  { value: 'anxious', emoji: '😰', label: 'Anxious', color: '#8B9FFF' },
  { value: 'angry', emoji: '😠', label: 'Angry', color: '#FF8B8B' },
  { value: 'stressed', emoji: '😫', label: 'Stressed', color: '#FFA8A8' },
  { value: 'overwhelmed', emoji: '😵', label: 'Overwhelmed', color: '#FFB8B8' },
  { value: 'peaceful', emoji: '😌', label: 'Peaceful', color: '#A8E0FF' },
  { value: 'happy', emoji: '😊', label: 'Happy', color: '#C5DFFF' },
  { value: 'excited', emoji: '🤩', label: 'Excited', color: '#FFE0A8' },
  { value: 'grateful', emoji: '🙏', label: 'Grateful', color: '#D8FFB8' },
  { value: 'hopeful', emoji: '🌟', label: 'Hopeful', color: '#FFFFA8' },
];

interface MoodEntryDetail {
  id: string;
  mood_intensities: { [key: string]: number };
  dominant_mood?: string;
  average_intensity?: number;
  moods_list?: string[];
  triggers: string;
  triggers_list: string[];
  activities?: string;
  notes: string;
  mood_date?: string;
  created_at: string;
  updated_at: string;
}

export default function MoodDetailScreen() {
  const { themeStyle } = useTheme();
  const params = useLocalSearchParams();
  const moodId = params.id as string;

  const [moodEntry, setMoodEntry] = useState<MoodEntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMoodDetail();
  }, [moodId]);

  const loadMoodDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📥 Fetching mood detail for ID:', moodId);

      const response = await api.get<MoodEntryDetail>(`/patients/mood/${moodId}/`);
      console.log('✅ Mood detail loaded:', JSON.stringify(response.data, null, 2));
      setMoodEntry(response.data);
    } catch (err: any) {
      console.error('❌ Error loading mood detail:', err);
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to load mood entry details. Please try again.';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (moodValue: string) => {
    const mood = moods.find((m) => m.value === moodValue);
    return mood ? mood.emoji : '😐';
  };

  const getMoodLabel = (moodValue: string) => {
    const mood = moods.find((m) => m.value === moodValue);
    return mood ? mood.label : moodValue;
  };

  const getMoodColor = (moodValue: string) => {
    const mood = moods.find((m) => m.value === moodValue);
    return mood ? mood.color : '#A8B5FF';
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 4) return '#4CAF50'; // Green for high
    if (intensity === 3) return '#FF9800'; // Orange for medium
    return '#F44336'; // Red for low
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Mood Entry',
      'Are you sure you want to delete this mood entry? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/patients/mood/${moodId}/`);
              // Navigate back immediately so the history refreshes via useFocusEffect
              router.back();
              // Show success message after navigation
              setTimeout(() => {
                Alert.alert('Success', 'Mood entry deleted successfully.');
              }, 100);
            } catch (err: any) {
              console.error('❌ Error deleting mood entry:', err);
              Alert.alert(
                'Error',
                err.response?.data?.detail || 'Failed to delete mood entry. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeStyle.button} />
          <Text style={[styles.loadingText, { color: themeStyle.label }]}>
            Loading mood details...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !moodEntry) {
    return (
      <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeStyle.error }]}>
            {error || 'Mood entry not found'}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeStyle.button }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.buttonText, { color: themeStyle.buttonText }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const dominantMood = moodEntry.dominant_mood || '';
  const moodColor = getMoodColor(dominantMood);
  const moodsArray = moodEntry.mood_intensities
    ? Object.entries(moodEntry.mood_intensities).map(([mood, intensity]) => ({
        mood,
        intensity,
        emoji: getMoodEmoji(mood),
        label: getMoodLabel(mood),
        color: getMoodColor(mood),
      }))
    : [];

  return (
    <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backButton, { color: themeStyle.text }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeStyle.title }]}>Mood Details</Text>
        </View>

        {/* Main Mood Display */}
        <View style={[styles.moodCard, { backgroundColor: themeStyle.card }]}>
          <View
            style={[
              styles.moodEmojiContainer,
              { backgroundColor: moodColor, shadowColor: moodColor },
            ]}
          >
            <Text style={styles.moodEmoji}>{getMoodEmoji(dominantMood)}</Text>
          </View>
          <Text style={[styles.moodLabel, { color: themeStyle.title }]}>
            {getMoodLabel(dominantMood)}
          </Text>
          <Text style={[styles.moodDate, { color: themeStyle.label }]}>
            {formatDate(moodEntry.created_at)}
          </Text>
          {moodEntry.average_intensity && (
            <View style={[styles.moodScoreBadge, { backgroundColor: getIntensityColor(moodEntry.average_intensity) }]}>
              <Text style={[styles.moodScoreText, { color: '#fff' }]}>
                Average Intensity: {moodEntry.average_intensity.toFixed(1)}/5
              </Text>
            </View>
          )}
        </View>

        {/* All Mood Intensities */}
        {moodsArray.length > 0 && (
          <View style={[styles.statsCard, { backgroundColor: themeStyle.card }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>Mood Intensities</Text>
            <View style={styles.moodIntensitiesGrid}>
              {moodsArray.map(({ mood, intensity, emoji, label }) => (
                <View
                  key={mood}
                  style={[
                    styles.intensityBox,
                    { 
                      backgroundColor: themeStyle.background,
                      borderColor: getIntensityColor(intensity),
                      borderWidth: 2,
                    },
                  ]}
                >
                  <Text style={styles.intensityEmoji}>{emoji}</Text>
                  <Text style={[styles.intensityLabel, { color: themeStyle.text }]}>
                    {label}
                  </Text>
                  <View
                    style={[
                      styles.intensityBadge,
                      { backgroundColor: getIntensityColor(intensity) },
                    ]}
                  >
                    <Text style={styles.intensityValue}>{intensity}/5</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Triggers */}
        {((moodEntry.triggers_list && moodEntry.triggers_list.length > 0) || moodEntry.triggers) && (
          <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>🎯 Triggers</Text>
            <View style={styles.triggersContainer}>
              {(moodEntry.triggers_list && moodEntry.triggers_list.length > 0
                ? moodEntry.triggers_list
                : moodEntry.triggers
                ? moodEntry.triggers.split(',').map((t) => t.trim()).filter(Boolean)
                : []
              ).map((trigger, index) => (
                <View
                  key={index}
                  style={[
                    styles.triggerChip,
                    { backgroundColor: themeStyle.progressbarside, borderColor: themeStyle.progressbarmain },
                  ]}
                >
                  <Text style={[styles.triggerText, { color: themeStyle.darktext }]}>
                    {trigger}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activities */}
        {moodEntry.activities && (
          <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>🏃 Activities</Text>
            <Text style={[styles.notesText, { color: themeStyle.text }]}>
              {moodEntry.activities}
            </Text>
          </View>
        )}

        {/* Notes */}
        {moodEntry.notes && (
          <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>📝 Notes</Text>
            <Text style={[styles.notesText, { color: themeStyle.text }]}>{moodEntry.notes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: themeStyle.progressbarmain }]}
            onPress={() => router.push(`/patient/mood-edit?id=${moodId}`)}
          >
            <Text style={[styles.editButtonText, { color: themeStyle.lighttext }]}>✏️ Edit Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: themeStyle.error }]}
            onPress={handleDelete}
          >
            <Text style={[styles.deleteButtonText, { color: '#fff' }]}>🗑️ Delete Entry</Text>
          </TouchableOpacity>
        </View>

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
    marginBottom: 30,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  moodCard: {
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  moodEmojiContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  moodEmoji: {
    fontSize: 64,
  },
  moodLabel: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  moodDate: {
    fontSize: 14,
    marginBottom: 15,
  },
  moodScoreBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  moodScoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 15,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  moodIntensitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  intensityBox: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  intensityEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  intensityLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  intensityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  intensityValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  triggersContainer: {
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
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 100,
  },
  infoValue: {
    fontSize: 16,
    flex: 1,
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  editButton: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  editButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 40,
  },
});
