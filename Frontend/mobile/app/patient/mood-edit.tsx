import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { router, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import api from '../utils/api';
import { FontAwesome } from '@expo/vector-icons';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';

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

  useEffect(() => {
    loadMoodEntry();
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
      <TabLoaderCard
        fullScreen
        title="Loading mood entry..."
        subtitle="Preparing your mood editor"
        spinnerColor="#8B5CF6"
      />
    );
  }

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

      {/* Sticky Header - Appears on scroll */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Edit Mood"
        secondWord="Entry"
        onBackPress={() => router.back()}
      />

      {/* Animated Header - Fades out on scroll */}
      <Animated.View style={[styles.headerContainer, {
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        })
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          <Text style={styles.headerWhite}>Edit Mood </Text>
          <Text style={styles.headerPurple}>Entry</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >

        <Text style={[styles.subtitle, { color: '#B8A8E6' }]}>
          Update the intensity of each mood you're experiencing
        </Text>

        {/* Mood Intensities */}
        <View style={[styles.card, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>
            How intense is each mood?
          </Text>
          <Text style={[styles.helperText, { color: '#B8A8E6' }]}>
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
                    backgroundColor: isActive ? '#5B5270' : 'transparent',
                    borderColor: isActive ? '#FFB36B' : 'rgba(255,255,255,0.1)',
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
                          color: isActive ? '#FFFFFF' : '#B8A8E6',
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
                          : 'rgba(255,255,255,0.1)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.intensityBadgeText,
                        { color: isActive ? '#fff' : '#B8A8E6' },
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
                  minimumTrackTintColor={isActive ? '#FFB36B' : 'rgba(255,255,255,0.1)'}
                  maximumTrackTintColor="#5B5270"
                  thumbTintColor={isActive ? '#FFB36B' : 'rgba(255,255,255,0.2)'}
                />
              </View>
            );
          })}
        </View>

        {/* Triggers */}
        <View style={[styles.card, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>
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
                        ? '#FFB36B'
                        : '#5B5270',
                      borderColor: isSelected ? '#FFB36B' : 'rgba(255,255,255,0.1)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.triggerText,
                      {
                        color: isSelected ? '#FFFFFF' : '#E5E5E5',
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
        <View style={[styles.card, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Activities Today</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: '#5B5270',
                color: '#FFFFFF',
                borderColor: 'rgba(255,255,255,0.1)',
              },
            ]}
            placeholder="e.g., Yoga, Work meeting, Walk in park..."
            placeholderTextColor="#B8A8E6"
            value={activities}
            onChangeText={setActivities}
            multiline
          />
        </View>

        {/* Notes */}
        <View style={[styles.card, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Additional Notes</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: '#5B5270',
                color: '#FFFFFF',
                borderColor: 'rgba(255,255,255,0.1)',
              },
            ]}
            placeholder="How are you feeling? Any specific thoughts or experiences?"
            placeholderTextColor="#B8A8E6"
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
            { backgroundColor: '#FFB36B' },
            submitting && { opacity: 0.6 },
          ]}
          onPress={handleUpdate}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>
              💾 Update Mood Entry
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
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
    padding: 8,
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
