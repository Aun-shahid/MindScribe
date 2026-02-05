import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
// SharedHeader removed per user request; keep local header per-screen
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import api from '../utils/api';
import eventBus from '../utils/eventBus';

// Mood options (matching backend API)
const moods = [
  { value: 'happy', emoji: '😊', label: 'Happy', color: '#FFD700' },
  { value: 'sad', emoji: '😢', label: 'Sad', color: '#6B8CFF' },
  { value: 'angry', emoji: '😠', label: 'Angry', color: '#FF6B6B' },
  { value: 'anxious', emoji: '😰', label: 'Anxious', color: '#FFA500' },
  { value: 'peaceful', emoji: '😌', label: 'Peaceful', color: '#87CEEB' },
  { value: 'excited', emoji: '🤩', label: 'Excited', color: '#FF69B4' },
  { value: 'grateful', emoji: '🙏', label: 'Grateful', color: '#98FB98' },
  { value: 'overwhelmed', emoji: '😵', label: 'Overwhelmed', color: '#DDA0DD' },
  { value: 'hopeful', emoji: '🌟', label: 'Hopeful', color: '#FFE4B5' },
  { value: 'stressed', emoji: '😫', label: 'Stressed', color: '#FF8C00' },
];

// Common triggers
const commonTriggers = [
  'Work/Career',
  'Family',
  'Relationships',
  'Health',
  'Finances',
  'Social',
  'Weather',
  'Sleep',
  'Exercise',
  'Medication',
  'Therapy',
  'Other',
];

// Ordering options (limited to backend-supported fields)
const orderingOptions = [
  { value: '-mood_date', label: 'Newest First' },
  { value: 'mood_date', label: 'Oldest First' },
];

interface MoodIntensities {
  [key: string]: number;
}

interface MoodEntryPayload {
  mood_intensities: MoodIntensities;
  notes: string;
  triggers: string;
  triggers_list: string[];
  activities: string;
  mood_date: string;
}

interface MoodHistoryEntry {
  id: string;
  mood_intensities: MoodIntensities;
  moods_list: string[];
  dominant_mood: string;
  average_intensity: number;
  triggers: string;
  triggers_list: string[];
  notes: string;
  activities: string;
  mood_date?: string;
  created_at: string;
  updated_at: string;
}

export default function MoodTrackerScreen() {
  const { themeStyle } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'weekly'>('entry');

  // Mood intensities state (0-5 for each mood). 0 means not selected.
  const [moodIntensities, setMoodIntensities] = useState<MoodIntensities>(() => {
    const initial: MoodIntensities = {};
    moods.forEach((mood) => {
      initial[mood.value] = 0; // Start all at 0 (unselected)
    });
    return initial;
  });

  // Shared intensity used by the top Mood Intensity control
  const [globalIntensity, setGlobalIntensity] = useState<number>(3);
  // Last selected mood (used to edit intensity for a specific mood)
  const [lastSelectedMood, setLastSelectedMood] = useState<string | null>(null);

  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [activities, setActivities] = useState('');
  const [notes, setNotes] = useState('');
  // Reflective emotional insight fields (merged into today's mood)
  
  const [loading, setLoading] = useState(false);
  const [showContextSection, setShowContextSection] = useState(false);

  // History state
  const [moodHistory, setMoodHistory] = useState<MoodHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [ordering, setOrdering] = useState('-mood_date');
  
  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showOrderingModal, setShowOrderingModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      loadMoodHistory();
    }
    if (activeTab === 'weekly') {
      loadWeeklyTrend();
    }
  }, [activeTab, startDate, endDate, ordering]);

  // Refresh history when screen comes into focus (after edit/delete)
  useFocusEffect(
    React.useCallback(() => {
      if (activeTab === 'history') {
        loadMoodHistory();
      }
      if (activeTab === 'weekly') {
        loadWeeklyTrend();
      }
    }, [activeTab])
  );

  // Weekly trend state and loader (inlined so Weekly tab does not navigate away)
  const [weeklyLoading, setWeeklyLoading] = useState<boolean>(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [weeklyData, setWeeklyData] = useState<any | null>(null);

  const loadWeeklyTrend = async () => {
    try {
      setWeeklyLoading(true);
      setWeeklyError(null);
      const response = await api.get('/patients/mood/weekly-trend/');
      setWeeklyData(response.data);
    } catch (err: any) {
      console.error('[Weekly Trend] Error:', err);
      setWeeklyError(err.response?.data?.detail || 'Failed to load weekly trend');
    } finally {
      setWeeklyLoading(false);
    }
  };

  // Update mood intensity
  const updateMoodIntensity = (moodValue: string, intensity: number) => {
    setMoodIntensities((prev) => ({
      ...prev,
      [moodValue]: intensity,
    }));
  };

  // Note: we no longer apply `globalIntensity` to all selected moods automatically.
  // Changing the slider will only affect the `lastSelectedMood` if set, otherwise it
  // updates the `globalIntensity` used when selecting a new mood.

  // Toggle trigger selection
  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger)
        ? prev.filter((t) => t !== trigger)
        : [...prev, trigger]
    );
  };

  // Load mood history
  const loadMoodHistory = async () => {
    try {
      setHistoryLoading(true);
      const params: any = {
        ordering,
      };

      if (startDate) {
        params.start_date = formatDateForAPI(startDate);
      }
      if (endDate) {
        params.end_date = formatDateForAPI(endDate);
      }
      

      console.log('📥 Fetching mood history with params:', params);
      const response = await api.get<MoodHistoryEntry[]>('/patients/mood/', { params });
      setMoodHistory(response.data);
      
      console.log('✅ Mood history loaded:', response.data.length, 'entries');
      if (response.data.length > 0) {
        console.log('📊 First mood entry sample:', JSON.stringify(response.data[0], null, 2));
      }
    } catch (error: any) {
      console.error('❌ Error loading mood history:', error);
      Alert.alert('Error', 'Failed to load mood history. Please try again.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Submit mood entry
  const handleSubmit = async () => {
    // Filter mood intensities to only include moods with intensity > 1
    const activeMoods: MoodIntensities = {};
    Object.keys(moodIntensities).forEach((mood) => {
      if (moodIntensities[mood] > 1) {
        activeMoods[mood] = moodIntensities[mood];
      }
    });

    // Validate at least one mood is selected
    if (Object.keys(activeMoods).length === 0) {
      Alert.alert('No Mood Selected', 'Please select at least one mood with intensity level 2 or higher.');
      return;
    }

    const payload: MoodEntryPayload = {
      mood_intensities: activeMoods,
      notes: notes.trim(),
      triggers: selectedTriggers.join(', '),
      triggers_list: selectedTriggers,
      activities: activities.trim(),
      mood_date: formatDateForAPI(new Date()),
    };

    try {
      setLoading(true);
      console.log('📤 Submitting mood entry:', payload);

      const response = await api.post('/patients/mood/today/', payload);
      console.log('✅ Mood entry saved:', response.data);

      // notify dashboard to refresh (so Today's Mood updates immediately)
      try {
        eventBus.emit('refreshDashboard');
      } catch (e) {
        console.warn('[mood] failed to emit refreshDashboard', e);
      }

      const moodCount = Object.keys(activeMoods).length;
      Alert.alert(
        'Success! 🎉',
        `Your mood entry with ${moodCount} mood${moodCount > 1 ? 's' : ''} has been recorded for today.`,
        [
          {
            text: 'View History',
            onPress: () => setActiveTab('history'),
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );

      // Reset form
      const resetIntensities: MoodIntensities = {};
      moods.forEach((mood) => {
        resetIntensities[mood.value] = 0;
      });
      setMoodIntensities(resetIntensities);
      setLastSelectedMood(null);
      setSelectedTriggers([]);
      setActivities('');
      setNotes('');
      setShowContextSection(false);
      
    } catch (error: any) {
      console.error('❌ Error submitting mood entry:', error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.mood_intensities?.[0] ||
        error.response?.data?.message ||
        'Failed to save mood entry. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get mood emoji
  const getMoodEmoji = (moodValue: string) => {
    const mood = moods.find((m) => m.value === moodValue);
    return mood ? mood.emoji : '😐';
  };

  // Get mood label
  const getMoodLabel = (moodValue: string) => {
    const mood = moods.find((m) => m.value === moodValue);
    return mood ? mood.label : moodValue;
  };

  // Get intensity color
  const getIntensityColor = (intensity: number) => {
    if (intensity >= 4) return '#4CAF50'; // Green for high
    if (intensity === 3) return '#FF9800'; // Orange for medium
    return '#F44336'; // Red for low
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';

    // Support date-only strings (YYYY-MM-DD) and full ISO timestamps
    let date: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      // Treat as local start of day to avoid timezone shifts
      date = new Date(dateString + 'T00:00:00');
    } else {
      date = new Date(dateString);
    }

    const now = new Date();

    // Compare by calendar day in local time to avoid timezone issues
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((todayLocal.getTime() - localDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Format an exact readable date for display (e.g., "Sunday, Feb 2, 2026")
  const formatExactDate = (dateString?: string) => {
    if (!dateString) return '';
    let date: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      date = new Date(dateString + 'T00:00:00');
    } else {
      date = new Date(dateString);
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format a JS Date to YYYY-MM-DD using local date parts (avoid toISOString timezone shifts)
  const formatDateForAPI = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Clear filters
  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setOrdering('-mood_date');
  };

  return (
    <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: themeStyle.card }]}> 
        <TouchableOpacity onPress={() => router.push('/patient/dashboard')} style={[styles.backBtnCircle, { borderColor: 'rgba(0,0,0,0.06)' }]}> 
          <FontAwesome name="arrow-left" size={16} color={themeStyle.title} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: themeStyle.title }]}>
          <Text style={styles.headerBlue}>Mood </Text>
          <Text style={styles.headerOrange}>Break</Text>
        </Text>

        {/* Analytics icon (top-right) */}
        <TouchableOpacity
          style={[styles.analyticsButton, { backgroundColor: themeStyle.card }]}
          onPress={() => router.push('/patient/mood-analytics-detail')}
        >
          <FontAwesome name="bar-chart" size={18} color={themeStyle.title} />
        </TouchableOpacity>
      </View>

      {/* Menu Bar: New Entry | History | Weekly Trends (single rounded pill) */}
      <View style={[styles.menuBar, { backgroundColor: '#fff' }]}>
        <TouchableOpacity onPress={() => setActiveTab('entry')} style={{ flex: 1 }} activeOpacity={0.9}>
          {activeTab === 'entry' ? (
            <LinearGradient colors={[ '#FF5AA8', '#FFB36B' ]} start={[0,0]} end={[1,0]} style={styles.menuTabGradient}>
              <Text style={styles.menuTabTextActive}>New Entry</Text>
            </LinearGradient>
          ) : (
            <View style={styles.menuTab}>
              <Text style={[styles.menuTabText, { color: themeStyle.text }]}>New Entry</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab('history')} style={{ flex: 1 }} activeOpacity={0.9}>
          {activeTab === 'history' ? (
            <LinearGradient colors={[ '#FF5AA8', '#FFB36B' ]} start={[0,0]} end={[1,0]} style={styles.menuTabGradientActive}>
              <Text style={styles.menuTabTextActive}>History</Text>
            </LinearGradient>
          ) : (
            <View style={styles.menuTab}>
              <Text style={[styles.menuTabText, { color: themeStyle.text }]}>History</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab('weekly')} style={{ flex: 1 }} activeOpacity={0.9}>
          {activeTab === 'weekly' ? (
            <LinearGradient colors={[ '#FF5AA8', '#FFB36B' ]} start={[0,0]} end={[1,0]} style={styles.menuTabGradientActive}>
              <Text style={styles.menuTabTextActive}>Weekly Trend</Text>
            </LinearGradient>
          ) : (
            <View style={styles.menuTab}>
              <Text style={[styles.menuTabText, { color: themeStyle.text }]}>Weekly Trend</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 24 }} />

      {/* Entry Tab Content */}
      {activeTab === 'entry' && (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Mood Intensities Section */}
          <View style={[styles.card, { backgroundColor: '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Select Mood</Text>
            <View style={styles.selectGrid}>
              {moods.map((mood) => {
                const intensity = moodIntensities[mood.value] || 0;
                const isSelected = intensity > 0;
                return (
                  <TouchableOpacity
                    key={mood.value}
                    activeOpacity={0.85}
                    onPress={() => {
                        setMoodIntensities((prev) => {
                          const isSelected = !!(prev[mood.value] && prev[mood.value] > 0);
                          const next = { ...prev };
                          if (isSelected) {
                            next[mood.value] = 0;
                            // deselecting: if this was the active mood, clear it
                            setLastSelectedMood((cur) => (cur === mood.value ? null : cur));
                          } else {
                            next[mood.value] = globalIntensity;
                            // newly selected mood becomes the active mood for intensity edits
                            setLastSelectedMood(mood.value);
                          }
                          return next;
                        });
                      }}
                    style={[
                          styles.moodTile,
                          { backgroundColor: '#fff', borderColor: isSelected ? themeStyle.progressbarmain : themeStyle.border },
                          lastSelectedMood === mood.value && { borderWidth: 2, borderColor: themeStyle.progressbarmain, shadowOpacity: 0.08, elevation: 6 },
                        ]}
                  >
                    <View style={[styles.emojiContainer, isSelected && { shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 4 }]}>
                      <Text style={isSelected ? styles.emojiTextLarge : styles.emojiText}>{mood.emoji}</Text>
                    </View>
                    <Text style={[styles.moodLabel, { color: themeStyle.text }]}>{mood.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Mood Intensity Card (separate) */}
          <View style={[styles.card, { backgroundColor: '#fff', marginTop: 12 }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Mood Intensity</Text>
            <Text style={[styles.helperText, { color: themeStyle.label }]}>How intense is this feeling?</Text>
            <View style={styles.gradientTrackWrapper}>
              <LinearGradient
                colors={[ '#FF7A7A', '#FF9F6B', '#6FD8BE' ]}
                start={[0, 0]}
                end={[1, 0]}
                style={styles.gradientTrack}
              />
              <Slider
                style={[styles.slider, { position: 'absolute', left: 0, right: 0 }]}
                minimumValue={1}
                maximumValue={5}
                step={1}
                value={lastSelectedMood ? (moodIntensities[lastSelectedMood] || globalIntensity) : globalIntensity}
                onValueChange={(value) => {
                  if (lastSelectedMood) {
                    updateMoodIntensity(lastSelectedMood, value);
                  } else {
                    setGlobalIntensity(value);
                  }
                }}
                minimumTrackTintColor={'transparent'}
                maximumTrackTintColor={'transparent'}
                thumbTintColor={themeStyle.button}
              />
            </View>
            <View style={styles.intensityButtonsRow}>
              {[1,2,3,4,5].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => {
                    if (lastSelectedMood) {
                      updateMoodIntensity(lastSelectedMood, n);
                      setGlobalIntensity(n);
                    } else {
                      setGlobalIntensity(n);
                    }
                  }}
                  style={[styles.intensityNumber, (lastSelectedMood ? (moodIntensities[lastSelectedMood] === n) : globalIntensity === n) && { backgroundColor: themeStyle.button }]}
                >
                  <Text style={[styles.intensityNumberText, (lastSelectedMood ? (moodIntensities[lastSelectedMood] === n) : globalIntensity === n) && { color: themeStyle.buttonText }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.sliderCaption, { color: themeStyle.label }]}>Very Low</Text>
            <Text style={[styles.sliderCaptionRight, { color: themeStyle.label }]}>Very High</Text>
          </View>

          {/* Additional Context Section (Collapsible) */}
          {/* Optional information separator */}
          <View style={{ width: '100%', alignItems: 'center', marginVertical: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <View style={{ flex: 1, height: 1, backgroundColor: themeStyle.border }} />
              <Text style={{ marginHorizontal: 12, color: themeStyle.label, fontWeight: '600' }}>Optional information</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: themeStyle.border }} />
            </View>
          </View>

          {/* Triggers */}
          <View style={[styles.card, { backgroundColor: '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>What triggered these moods?</Text>
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
                        backgroundColor: isSelected ? themeStyle.progressbarmain : '#fff',
                        borderColor: isSelected ? themeStyle.progressbarmain : 'rgba(0,0,0,0.04)',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isSelected ? 0.08 : 0.03,
                        shadowRadius: 8,
                        elevation: isSelected ? 4 : 2,
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
          <View style={[styles.card, { backgroundColor: '#fff' }]}>
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
          <View style={[styles.card, { backgroundColor: '#fff' }]}>
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

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: themeStyle.button },
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={themeStyle.buttonText} />
            ) : (
              <Text style={[styles.submitButtonText, { color: themeStyle.buttonText }]}>
                Save Mood Entry
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* Weekly Trend Inline Content */}
      {activeTab === 'weekly' && (
        <ScrollView style={{ flex: 1, backgroundColor: themeStyle.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {weeklyLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeStyle.button} />
              <Text style={[styles.loadingText, { color: themeStyle.label }]}>Loading weekly trend...</Text>
            </View>
          ) : weeklyError ? (
            <View style={[styles.contextToggle, { backgroundColor: themeStyle.card }] }>
              <Text style={[styles.contextToggleText, { color: themeStyle.error }]}>❌ {weeklyError}</Text>
              <TouchableOpacity style={[styles.trendButton, { backgroundColor: themeStyle.button, marginTop: 12 }]} onPress={loadWeeklyTrend}>
                <Text style={styles.trendButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : weeklyData ? (
            <>
              <View style={[styles.card, { backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.04)', borderWidth: 1 }]}>
                <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>Your Weekly Mood Trend</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8 }}>
                  {(() => {
                    const width = Dimensions.get('window').width - 80;
                    const BAR_WIDTH = width / 7;
                    const weekly = weeklyData.weekly_moods || [];
                    const maxIntensity = Math.max(...weekly.map((d: any) => (d.intensity || 1)), 5);
                    return weekly.map((dayData: any, index: number) => {
                      const barHeight = ((dayData.intensity || 0) / maxIntensity) * 140;
                      const emoji = dayData.mood || '';
                      return (
                        <View key={index} style={{ width: BAR_WIDTH, alignItems: 'center' }}>
                          <Text style={{ marginBottom: 6 }}>{dayData.mood ? getMoodEmoji(dayData.mood) : '—'}</Text>
                          <LinearGradient
                            colors={[ '#FF5AA8', '#FFB36B', '#6FD8BE' ]}
                            start={[0,0]}
                            end={[0,1]}
                            style={{ width: BAR_WIDTH - 12, height: Math.max(barHeight, dayData.intensity ? 8 : 0), borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                          >
                            {dayData.intensity > 0 && <Text style={{ color: '#fff', fontWeight: '700' }}>{dayData.intensity}</Text>}
                          </LinearGradient>
                          <Text style={{ marginTop: 8, color: dayData.mood ? themeStyle.text : themeStyle.label }}>{dayData.day}</Text>
                        </View>
                      );
                    });
                  })()}
                </View>
              </View>

              <View style={[styles.card, { backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.04)', borderWidth: 1 }]}>
                <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>Daily Breakdown</Text>
                <View style={{ marginTop: 8 }}>
                  {weeklyData.weekly_moods.map((dayData: any, index: number) => {
                    const containerKey = `weekly-${index}`;
                    return (
                      <View key={containerKey} style={[styles.weeklyListCard, index === weeklyData.weekly_moods.length - 1 && { marginBottom: 0 }]}> 
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <LinearGradient colors={[ '#FF5AA8', '#FFB36B' ]} style={styles.weeklyAvatar}>
                            <Text style={{ fontSize: 20 }}>{dayData.mood ? getMoodEmoji(dayData.mood) : '—'}</Text>
                          </LinearGradient>
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ fontWeight: '700', color: themeStyle.title }}>{`${dayData.day} - ${dayData.mood_label || 'No entry'}`}</Text>
                            <Text style={{ color: themeStyle.label, marginTop: 4 }}>{`${dayData.entry_count || 0} ${dayData.entry_count === 1 ? 'entry' : 'entries'} • Intensity: ${dayData.intensity || 0}/5`}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
      {/* History Tab Content */}
      {activeTab === 'history' && (
        <View style={styles.historyContainer}>
          {/* Filters */}
          <View style={[styles.filtersCard, { backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.06)', borderWidth: 1, marginHorizontal: 20 }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>Filters</Text>

            <Text style={[styles.filterLabel, { color: themeStyle.label }]}>Sort By</Text>
            <TouchableOpacity
              style={[styles.sortSelect, { backgroundColor: themeStyle.background, borderColor: themeStyle.border }]}
              onPress={() => setShowOrderingModal(true)}
            >
              <Text style={[styles.sortSelectText, { color: themeStyle.text }]}>
                {orderingOptions.find((o) => o.value === ordering)?.label || 'Newest First'}
              </Text>
            </TouchableOpacity>

            {/* Mood-type filter removed (backend does not support mood-type filtering for this structure) */}

            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: themeStyle.background, borderColor: themeStyle.border }]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={[styles.dateInputText, { color: themeStyle.text }]}> {startDate ? startDate.toLocaleDateString() : 'dd/mm/yyyy'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: themeStyle.background, borderColor: themeStyle.border }]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={[styles.dateInputText, { color: themeStyle.text }]}> {endDate ? endDate.toLocaleDateString() : 'dd/mm/yyyy'}</Text>
              </TouchableOpacity>
            </View>

            {(startDate || endDate || ordering !== '-created_at') && (
              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: themeStyle.progressbarside }]}
                onPress={clearFilters}
              >
                <Text style={[styles.clearFiltersText, { color: themeStyle.darktext }]}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 16 }} />

          {/* Mood History List */}
          {historyLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeStyle.button} />
              <Text style={[styles.loadingText, { color: themeStyle.label }]}>
                Loading mood history...
              </Text>
            </View>
          ) : moodHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: themeStyle.label }]}>
                No mood entries found
              </Text>
              <Text style={[styles.emptySubtext, { color: themeStyle.label }]}>
                Create your first entry in the "New Entry" tab
              </Text>
            </View>
          ) : (
            <FlatList
              data={moodHistory}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.historyList}
              renderItem={({ item }) => {
                const moodsArray = item.mood_intensities 
                  ? Object.entries(item.mood_intensities).map(([mood, intensity]) => ({
                      mood,
                      intensity,
                      emoji: getMoodEmoji(mood),
                      label: getMoodLabel(mood),
                    }))
                  : [];

                const dominantMood = item.dominant_mood || (moodsArray.length > 0 ? moodsArray[0].mood : '');

                return (
                  <TouchableOpacity
                    style={[styles.historyCard, { backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.04)', borderWidth: 1 }]}
                    onPress={() => router.push(`/patient/mood-detail?id=${item.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <LinearGradient colors={[ '#FF5AA8', '#FFB36B' ]} style={styles.moodAvatar}>
                        <Text style={styles.avatarEmoji}>{getMoodEmoji(dominantMood)}</Text>
                      </LinearGradient>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.historyMood, { color: themeStyle.title }]}>{getMoodLabel(dominantMood)}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                          <FontAwesome name="calendar" size={12} color={themeStyle.label} />
                          <Text style={{ marginLeft: 8, color: themeStyle.label }}>{formatExactDate(item.mood_date || item.created_at)}</Text>
                        </View>
                      </View>

                      <View style={styles.intensityPill}>
                        <Text style={styles.intensityPillText}>Intensity: {item.average_intensity ? item.average_intensity.toFixed(0) : '—'}/5</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}

      {/* Ordering Modal */}
      <Modal
        visible={showOrderingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOrderingModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOrderingModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: themeStyle.card }]}>
            <Text style={[styles.modalTitle, { color: themeStyle.title }]}>Sort By</Text>
            {orderingOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  ordering === option.value && {
                    backgroundColor: themeStyle.progressbarside,
                  },
                ]}
                onPress={() => {
                  setOrdering(option.value);
                  setShowOrderingModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: themeStyle.text },
                    ordering === option.value && { fontWeight: '700' },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Mood-type filter removed */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 26,
  },
  backButtonContainer: {
    marginBottom: 10,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  backBtnCircle: {
    position: 'absolute',
    left: 18,
    top: 52,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 20,
    textAlign: 'center',
  },
  headerBlue: { color: '#524f85' },
  headerOrange: { color: '#FF9F6B' },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginTop: 10,
  },
  menuBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 28,
    paddingVertical: 0,
    paddingHorizontal: 8,
    minHeight: 48,
    marginTop: 10,
    marginHorizontal: 20,
    // pill background shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  menuTab: {
    flex: 1,
    paddingVertical: 0,
    minHeight: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    backgroundColor: 'transparent',
  },
  menuTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  menuTabText: {
    fontSize: 15,
    fontWeight: '700',
  },
  menuTabGradient: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    minHeight: 40,
  },
  menuTabGradientActive: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    minHeight: 40,
  },
  
  menuTabText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 26,
  },
  /* Unified header card styles */
  headerCard: {
    borderRadius: 18,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    position: 'relative',
    // subtle elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },
  headerTitleUnified: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
  },
  analyticsButtonUnified: {
    position: 'absolute',
    right: 18,
    top: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBarUnified: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    backgroundColor: 'transparent',
  },
  menuTabUnified: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: 'transparent',
  },
  menuTabGradientUnified: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  menuTabTextActive: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  analyticsButton: {
    position: 'absolute',
    right: 18,
    top: 52,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  trendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  moodCarouselContainer: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    minHeight: 280,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  moodScroll: {
    paddingVertical: 30,
    paddingHorizontal: 10,
  },
  moodItem: {
    alignItems: 'center',
    marginHorizontal: 15,
    width: 100,
  },
  emojiContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  emojiText: {
    fontSize: 32,
  },
  emojiTextLarge: {
    fontSize: 40,
  },
  moodLabel: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 6,
  },
  moodLabelSelected: {
    fontWeight: '700',
    fontSize: 16,
  },
  sliderCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  selectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    gap: 12,
  },
  moodTile: {
    width: '28%',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  moodLabel: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  intensityButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 10,
  },
  intensityNumber: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
    backgroundColor: 'transparent',
  },
  intensityNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sliderCaption: {
    position: 'absolute',
    left: 18,
    bottom: 8,
    fontSize: 12,
  },
  sliderCaptionRight: {
    position: 'absolute',
    right: 18,
    bottom: 8,
    fontSize: 12,
  },
  gradientTrackWrapper: {
    width: '100%',
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  gradientTrack: {
    width: '100%',
    height: 8,
    borderRadius: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  sliderLabelText: {
    fontSize: 12,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 4,
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
  contextToggle: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contextToggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
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
    borderWidth: 1,
    backgroundColor: '#fff',
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 50,
  },
  textArea: {
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    borderWidth: 1,
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 40,
  },
  historyContainer: {
    flex: 1,
  },
  filtersContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearFiltersButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  historyList: {
    padding: 20,
  },
  historyCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  historyMoodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyEmoji: {
    fontSize: 40,
  },
  historyMood: {
    fontSize: 20,
    fontWeight: '700',
  },
  historyDate: {
    fontSize: 14,
    marginTop: 2,
  },
  intensityBadgeSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityBadgeSmallText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  moodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    gap: 6,
  },
  moodChipEmoji: {
    fontSize: 18,
  },
  moodChipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  moodChipBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodChipBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  weeklyListCard: {
    backgroundColor: '#F6F7FB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  weeklyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  historyTriggers: {
    marginBottom: 12,
  },
  historyTriggersLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  historyTriggersChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyTriggerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  historyTriggerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyNotes: {
    marginTop: 12,
  },
  historyNotesLabel: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '600',
  },
  historyNotesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  /* New styles for redesigned filters and history cards */
  filtersCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  filterLabel: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  sortSelect: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  sortSelectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dateInput: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 14,
  },
  moodAvatar: {
    width: 62,
    height: 62,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  intensityPill: {
    backgroundColor: '#FFDFF4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  intensityPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF5AA8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  modalOptionEmoji: {
    fontSize: 24,
  },
  modalOptionText: {
    fontSize: 16,
  },
  /* Mood filter modal uses existing modal styles */
});
