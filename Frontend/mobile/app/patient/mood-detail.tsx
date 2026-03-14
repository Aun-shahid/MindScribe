import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../utils/api';
import { FontAwesome } from '@expo/vector-icons';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

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
  const params = useLocalSearchParams();
  const moodId = params.id as string;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const pageInset = clamp(width * 0.05, 16, 22);
  const headerTopPadding = insets.top + clamp(height * 0.017, 14, 22);
  const headerButtonSize = clamp(width * 0.105, 36, 42);
  const headerButtonRadius = headerButtonSize / 2;
  const headerIconSize = clamp(width * 0.05, 18, 20);
  const headerTitleSize = clamp(width * 0.074, 24, 30);
  const headerTitleMarginTop = clamp(height * 0.024, 18, 24);
  const headerBottomPadding = clamp(height * 0.004, 2, 6);
  const headerBottomMargin = clamp(height * 0.018, 10, 16);
  const contentTopPadding = clamp(height * 0.016, 10, 16);
  const contentBottomPadding = clamp(insets.bottom + height * 0.02, 24, 38);

  const cardRadius = clamp(width * 0.05, 14, 20);
  const cardPadding = clamp(width * 0.05, 16, 22);
  const cardBottomGap = clamp(height * 0.02, 12, 18);
  const sectionTitleSize = clamp(width * 0.046, 16, 20);
  const sectionTitleBottomGap = clamp(height * 0.014, 10, 14);
  const bodyTextSize = clamp(width * 0.038, 14, 16);

  const moodCircleSize = clamp(width * 0.3, 104, 132);
  const moodEmojiSize = clamp(width * 0.16, 52, 68);
  const moodLabelSize = clamp(width * 0.084, 28, 36);
  const moodDateSize = clamp(width * 0.036, 13, 15);
  const moodScoreTextSize = clamp(width * 0.039, 14, 16);

  const intensityGridGap = clamp(width * 0.03, 10, 14);
  const intensityBoxRadius = clamp(width * 0.042, 14, 18);
  const intensityBoxPadY = clamp(height * 0.02, 14, 20);
  const intensityBoxPadX = clamp(width * 0.034, 10, 14);
  const intensityEmojiSize = clamp(width * 0.09, 30, 38);
  const intensityLabelSize = clamp(width * 0.036, 13, 15);
  const intensityValueSize = clamp(width * 0.036, 13, 15);

  const triggerGap = clamp(width * 0.025, 8, 12);
  const triggerChipRadius = clamp(width * 0.05, 16, 22);
  const triggerChipPadH = clamp(width * 0.04, 14, 18);
  const triggerChipPadV = clamp(height * 0.013, 8, 11);
  const triggerTextSize = clamp(width * 0.032, 11, 13);

  const actionGap = clamp(width * 0.03, 10, 14);
  const actionButtonRadius = clamp(width * 0.045, 14, 18);
  const actionButtonPad = clamp(height * 0.02, 12, 16);
  const actionTextSize = clamp(width * 0.041, 14, 16);

  const errorPadding = clamp(width * 0.1, 28, 44);
  const errorTextSize = clamp(width * 0.048, 16, 20);
  const backActionRadius = clamp(width * 0.03, 10, 14);
  const backActionPadH = clamp(width * 0.06, 20, 30);
  const backActionPadV = clamp(height * 0.015, 10, 14);
  const backActionTextSize = clamp(width * 0.041, 14, 17);

  const [moodEntry, setMoodEntry] = useState<MoodEntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scroll animation for sticky header
  const scrollY = useRef(new Animated.Value(0)).current;

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

  const loadMoodDetail = useCallback(async () => {
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
  }, [moodId]);

  useEffect(() => {
    loadMoodDetail();
  }, [loadMoodDetail]);

  useEffect(() => {
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

    createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000, 0);
    createFloatingAnimation(bubble2Y, bubble2X, 10000, 8000, 1000);
    createFloatingAnimation(bubble3Y, bubble3X, 9000, 7500, 500);
    createFloatingAnimation(bubble4Y, bubble4X, 8500, 7200, 800);
    createFloatingAnimation(bubble5Y, bubble5X, 9500, 8200, 300);
  }, [bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y, bubble4X, bubble4Y, bubble5X, bubble5Y]);

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
      <TabLoaderCard
        fullScreen
        title="Loading mood details..."
        subtitle="Gathering your entry insights"
        spinnerColor="#8B5CF6"
      />
    );
  }

  if (error || !moodEntry) {
    return (
      <View style={[styles.container, { backgroundColor: '#342949' }]}>
        <View style={[styles.errorContainer, { padding: errorPadding }]}>
          <Text style={[styles.errorText, { color: '#EF4444', fontSize: errorTextSize }]}>
            {error || 'Mood entry not found'}
          </Text>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: '#FFB36B',
                borderRadius: backActionRadius,
                paddingHorizontal: backActionPadH,
                paddingVertical: backActionPadV,
              },
            ]}
            onPress={() => router.back()}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF', fontSize: backActionTextSize }]}>Go Back</Text>
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
        style={[styles.screenGradient, { height }]}
      />
      {/* Floating Bubbles */}
      <View style={styles.floatingBubbles} pointerEvents="none">
        <Animated.View style={[
          styles.bubble,
          {
            width: clamp(width * 0.52, 170, 230),
            height: clamp(width * 0.52, 170, 230),
            top: clamp(height * 0.06, 34, 62),
            right: -clamp(width * 0.12, 36, 56),
            backgroundColor: 'rgba(133, 130, 180, 0.25)',
          },
          { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          {
            width: clamp(width * 0.74, 220, 310),
            height: clamp(width * 0.74, 220, 310),
            top: -clamp(height * 0.12, 80, 120),
            left: -clamp(width * 0.18, 56, 88),
            backgroundColor: 'rgba(133, 130, 180, 0.2)',
          },
          { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          {
            width: clamp(width * 0.4, 120, 170),
            height: clamp(width * 0.4, 120, 170),
            bottom: clamp(height * 0.24, 160, 230),
            left: -clamp(width * 0.08, 20, 36),
            backgroundColor: 'rgba(133, 130, 180, 0.22)',
          },
          { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          {
            width: clamp(width * 0.48, 150, 200),
            height: clamp(width * 0.48, 150, 200),
            bottom: clamp(height * 0.12, 80, 120),
            right: -clamp(width * 0.14, 42, 70),
            backgroundColor: 'rgba(133, 130, 180, 0.18)',
          },
          { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          {
            width: clamp(width * 0.32, 96, 132),
            height: clamp(width * 0.32, 96, 132),
            top: '40%',
            right: clamp(width * 0.05, 14, 24),
            backgroundColor: 'rgba(133, 130, 180, 0.15)',
          },
          { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }
        ]} />
      </View>

      {/* Sticky Header - Appears on scroll */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Mood"
        secondWord="Details"
        onBackPress={() => router.push('/patient/mood')}
      />

      {/* Animated Header - Fades out on scroll */}
      <Animated.View style={[styles.headerContainer, {
        paddingTop: headerTopPadding,
        paddingHorizontal: pageInset,
        paddingBottom: headerBottomPadding,
        marginBottom: headerBottomMargin,
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        })
      }]}>
        <TouchableOpacity
          onPress={() => router.push('/patient/mood')}
          style={[
            styles.backButton,
            {
              left: pageInset - 5,
              top: headerTopPadding + clamp(height * 0.003, 2, 5) - 6,
              width: headerButtonSize,
              height: headerButtonSize,
              borderRadius: headerButtonRadius,
            },
          ]}
        >
          <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop + 4 }]}> 
          <Text style={styles.headerWhite}>Mood </Text>
          <Text style={styles.headerPurple}>Details</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: pageInset,
            paddingTop: contentTopPadding,
            paddingBottom: contentBottomPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >

        {/* Main Mood Display */}
        <View
          style={[
            styles.moodCard,
            {
              backgroundColor: '#473F5A',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              borderRadius: cardRadius,
              padding: cardPadding,
              marginBottom: cardBottomGap,
            },
          ]}
        >
          <View
            style={[
              styles.moodEmojiContainer,
              {
                backgroundColor: moodColor,
                shadowColor: moodColor,
                width: moodCircleSize,
                height: moodCircleSize,
                borderRadius: moodCircleSize / 2,
                marginBottom: clamp(height * 0.022, 14, 22),
              },
            ]}
          >
            <Text style={[styles.moodEmoji, { fontSize: moodEmojiSize }]}>{getMoodEmoji(dominantMood)}</Text>
          </View>
          <Text style={[styles.moodLabel, { color: '#FFFFFF', fontSize: moodLabelSize }]}>
            {getMoodLabel(dominantMood)}
          </Text>
          {tieLabel && (
            <Text style={[styles.moodDate, { color: '#B8A8E6', fontSize: moodDateSize }]}>{tieLabel}</Text>
          )}
          <Text style={[styles.moodDate, { color: '#B8A8E6', fontSize: moodDateSize }]}>
            {formatDate(moodEntry.created_at)}
          </Text>
          {moodEntry.average_intensity && (
            <View
              style={[
                styles.moodScoreBadge,
                {
                  backgroundColor: getIntensityColor(moodEntry.average_intensity),
                  paddingHorizontal: clamp(width * 0.05, 16, 22),
                  paddingVertical: clamp(height * 0.014, 8, 12),
                  borderRadius: clamp(width * 0.05, 16, 22),
                },
              ]}
            >
              <Text style={[styles.moodScoreText, { color: '#fff', fontSize: moodScoreTextSize }]}>
                Average Intensity: {moodEntry.average_intensity.toFixed(1)}/5
              </Text>
            </View>
          )}
        </View>

        {/* All Mood Intensities */}
        {moodsArray.length > 0 && (
          <View
            style={[
              styles.statsCard,
              {
                backgroundColor: '#473F5A',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderRadius: cardRadius,
                padding: cardPadding,
                marginBottom: cardBottomGap,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: '#FFFFFF', fontSize: sectionTitleSize, marginBottom: sectionTitleBottomGap }]}>Mood Intensities</Text>
            <View style={[styles.moodIntensitiesGrid, { gap: intensityGridGap }]}>
              {moodsArray.map(({ mood, intensity, emoji, label }) => (
                <View
                  key={mood}
                  style={[
                    styles.intensityBox,
                    {
                      backgroundColor: '#5B5270',
                      borderColor: getIntensityColor(intensity),
                      borderWidth: 2,
                      borderRadius: intensityBoxRadius,
                      paddingVertical: intensityBoxPadY,
                      paddingHorizontal: intensityBoxPadX,
                    },
                  ]}
                >
                  <Text style={[styles.intensityEmoji, { fontSize: intensityEmojiSize }]}>{emoji}</Text>
                  <Text style={[styles.intensityLabel, { color: '#FFFFFF', fontSize: intensityLabelSize }]}>
                    {label}
                  </Text>
                  <View
                    style={[
                      styles.intensityBadge,
                      {
                        backgroundColor: getIntensityColor(intensity),
                        paddingHorizontal: clamp(width * 0.03, 10, 14),
                        paddingVertical: clamp(height * 0.008, 5, 7),
                        borderRadius: clamp(width * 0.032, 10, 13),
                      },
                    ]}
                  >
                    <Text style={[styles.intensityValue, { fontSize: intensityValueSize }]}>{intensity}/5</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Triggers */}
        {((moodEntry.triggers_list && moodEntry.triggers_list.length > 0) || moodEntry.triggers) && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: '#473F5A',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderRadius: cardRadius,
                padding: cardPadding,
                marginBottom: cardBottomGap,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: '#FFFFFF', fontSize: sectionTitleSize, marginBottom: sectionTitleBottomGap }]}>🎯 Triggers</Text>
            <View style={[styles.triggersContainer, { gap: triggerGap }]}>
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
                    {
                      backgroundColor: '#5B5270',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: triggerChipRadius,
                      paddingHorizontal: triggerChipPadH,
                      paddingVertical: triggerChipPadV,
                    },
                  ]}
                >
                  <Text style={[styles.triggerText, { color: '#FFFFFF', fontSize: triggerTextSize }]}>
                    {trigger}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activities */}
        {moodEntry.activities && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: '#473F5A',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderRadius: cardRadius,
                padding: cardPadding,
                marginBottom: cardBottomGap,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: '#FFFFFF', fontSize: sectionTitleSize, marginBottom: sectionTitleBottomGap }]}>🏃 Activities</Text>
            <Text style={[styles.notesText, { color: '#E5E5E5', fontSize: bodyTextSize, lineHeight: clamp(width * 0.06, 20, 26) }]}>
              {moodEntry.activities}
            </Text>
          </View>
        )}

        {/* Notes */}
        {moodEntry.notes && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: '#473F5A',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderRadius: cardRadius,
                padding: cardPadding,
                marginBottom: cardBottomGap,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: '#FFFFFF', fontSize: sectionTitleSize, marginBottom: sectionTitleBottomGap }]}>📝 Notes</Text>
            <Text style={[styles.notesText, { color: '#E5E5E5', fontSize: bodyTextSize, lineHeight: clamp(width * 0.06, 20, 26) }]}>{moodEntry.notes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={[styles.actionButtons, { gap: actionGap, marginTop: clamp(height * 0.013, 8, 12) }]}>
          <TouchableOpacity
            style={[
              styles.editButton,
              {
                backgroundColor: '#FFB36B',
                borderRadius: actionButtonRadius,
                padding: actionButtonPad,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.18)',
              },
            ]}
            onPress={() => router.push(`/patient/mood-edit?id=${moodId}`)}
          >
            <Text style={[styles.editButtonText, { color: '#FFFFFF', fontSize: actionTextSize }]}>Edit Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              {
                backgroundColor: '#EF4444',
                borderRadius: actionButtonRadius,
                padding: actionButtonPad,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.16)',
              },
            ]}
            onPress={handleDelete}
          >
            <Text style={[styles.deleteButtonText, { color: '#fff', fontSize: actionTextSize }]}>Delete Entry</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: contentBottomPadding }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 80,
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
  headerContainer: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 26,
    marginBottom: 14,
    marginHorizontal: 0,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 20,
    textAlign: 'center',
  },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 40,
  },
});
