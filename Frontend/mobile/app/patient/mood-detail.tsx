import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../utils/api';
import { FontAwesome } from '@expo/vector-icons';

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
  dominant_moods?: string[];
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

  // Bubble animations
  const bubble1Y = useRef(new Animated.Value(0)).current;
  const bubble1X = useRef(new Animated.Value(0)).current;
  const bubble2Y = useRef(new Animated.Value(0)).current;
  const bubble2X = useRef(new Animated.Value(0)).current;
  const bubble3Y = useRef(new Animated.Value(0)).current;
  const bubble3X = useRef(new Animated.Value(0)).current;
  const bubble4Y = useRef(new Animated.Value(0)).current;
  const bubble4X = useRef(new Animated.Value(0)).current;
  const bubble5Y = useRef(new Animated.Value(0)).current;
  const bubble5X = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadMoodDetail();
  }, [moodId]);

  useEffect(() => {
    const screenHeight = Dimensions.get('window').height;
    const createFloatingAnimation = (
      animValueY: Animated.Value,
      animValueX: Animated.Value,
      durationY: number,
      durationX: number,
      delayY: number
    ) => {
      const animY = Animated.loop(
        Animated.sequence([
          Animated.timing(animValueY, {
            toValue: -50,
            duration: durationY,
            useNativeDriver: true,
          }),
          Animated.timing(animValueY, {
            toValue: 50,
            duration: durationY,
            useNativeDriver: true,
          }),
        ])
      );
      const animX = Animated.loop(
        Animated.sequence([
          Animated.timing(animValueX, {
            toValue: 30,
            duration: durationX,
            useNativeDriver: true,
          }),
          Animated.timing(animValueX, {
            toValue: -30,
            duration: durationX,
            useNativeDriver: true,
          }),
        ])
      );
      Animated.parallel([animY, animX]).start();
      return { animY, animX };
    };

    const anim1 = createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000, 0);
    const anim2 = createFloatingAnimation(bubble2Y, bubble2X, 10000, 8000, 1000);
    const anim3 = createFloatingAnimation(bubble3Y, bubble3X, 9000, 7500, 500);
    const anim4 = createFloatingAnimation(bubble4Y, bubble4X, 8500, 7200, 800);
    const anim5 = createFloatingAnimation(bubble5Y, bubble5X, 9500, 8200, 300);
  }, []);

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
      <View style={[styles.container, { backgroundColor: '#342949' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={[styles.loadingText, { color: '#FFFFFF' }]}>
            Loading mood details...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !moodEntry) {
    return (
      <View style={[styles.container, { backgroundColor: '#342949' }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#EF4444' }]}>
            {error || 'Mood entry not found'}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#FFB36B' }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const dominantMoods = moodEntry.dominant_moods || [];
  const dominantMood = moodEntry.dominant_mood || (dominantMoods.length > 0 ? dominantMoods[0] : '');
  const tieLabel = dominantMoods.length > 1
    ? `Tie: ${dominantMoods.map((m) => getMoodLabel(m)).join(', ')}`
    : null;
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
    <View style={[styles.container, { backgroundColor: '#342949' }]}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#342949', '#2A1F3D', '#342949']}
        style={styles.screenGradient}
      />
      {/* Floating Bubbles */}
      <View style={styles.floatingBubbles} pointerEvents="none">
        <Animated.View style={[
          styles.bubble,
          { width: 200, height: 200, top: 50, right: -50, backgroundColor: 'rgba(133, 130, 180, 0.25)' },
          { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 280, height: 280, top: -100, left: -80, backgroundColor: 'rgba(133, 130, 180, 0.2)' },
          { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 150, height: 150, bottom: 200, left: -30, backgroundColor: 'rgba(133, 130, 180, 0.22)' },
          { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 180, height: 180, bottom: 100, right: -60, backgroundColor: 'rgba(133, 130, 180, 0.18)' },
          { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 120, height: 120, top: '40%', right: 20, backgroundColor: 'rgba(133, 130, 180, 0.15)' },
          { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }
        ]} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/patient/mood')} style={styles.backButton}>
            <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            <Text style={styles.headerBlue}>Mood </Text>
            <Text style={styles.headerOrange}>Details</Text>
          </Text>
        </View>

        {/* Main Mood Display */}
        <View style={[styles.moodCard, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
          <View
            style={[
              styles.moodEmojiContainer,
              { backgroundColor: moodColor, shadowColor: moodColor },
            ]}
          >
            <Text style={styles.moodEmoji}>{getMoodEmoji(dominantMood)}</Text>
          </View>
          <Text style={[styles.moodLabel, { color: '#FFFFFF' }]}>
            {getMoodLabel(dominantMood)}
          </Text>
          {tieLabel && (
            <Text style={[styles.moodDate, { color: '#B8A8E6' }]}>{tieLabel}</Text>
          )}
          <Text style={[styles.moodDate, { color: '#B8A8E6' }]}>
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
          <View style={[styles.statsCard, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Mood Intensities</Text>
            <View style={styles.moodIntensitiesGrid}>
              {moodsArray.map(({ mood, intensity, emoji, label }) => (
                <View
                  key={mood}
                  style={[
                    styles.intensityBox,
                    { 
                      backgroundColor: '#5B5270',
                      borderColor: getIntensityColor(intensity),
                      borderWidth: 2,
                    },
                  ]}
                >
                  <Text style={styles.intensityEmoji}>{emoji}</Text>
                  <Text style={[styles.intensityLabel, { color: '#FFFFFF' }]}>
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
          <View style={[styles.card, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>🎯 Triggers</Text>
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
                    { backgroundColor: '#5B5270', borderColor: 'rgba(255,255,255,0.1)' },
                  ]}
                >
                  <Text style={[styles.triggerText, { color: '#FFFFFF' }]}>
                    {trigger}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activities */}
        {moodEntry.activities && (
          <View style={[styles.card, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>🏃 Activities</Text>
            <Text style={[styles.notesText, { color: '#E5E5E5' }]}>
              {moodEntry.activities}
            </Text>
          </View>
        )}

        {/* Notes */}
        {moodEntry.notes && (
          <View style={[styles.card, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>📝 Notes</Text>
            <Text style={[styles.notesText, { color: '#E5E5E5' }]}>{moodEntry.notes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: '#FFB36B' }]}
            onPress={() => router.push(`/patient/mood-edit?id=${moodId}`)}
          >
            <Text style={[styles.editButtonText, { color: '#FFFFFF' }]}>✏️ Edit Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: '#EF4444' }]}
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
    paddingTop: 60,
  },
  screenGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingBubbles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 1,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  backBtnCircle: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    zIndex: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerBlue: {
    color: '#FFFFFF',
  },
  headerOrange: {
    color: '#B8A8E6',
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
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
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
