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
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import api from '../utils/api';

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

// Ordering options
const orderingOptions = [
  { value: '-created_at', label: 'Newest First' },
  { value: 'created_at', label: 'Oldest First' },
  { value: '-mood_score', label: 'Highest Mood Score' },
  { value: 'mood_score', label: 'Lowest Mood Score' },
  { value: '-energy_level', label: 'Highest Energy' },
  { value: 'energy_level', label: 'Lowest Energy' },
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
  created_at: string;
  updated_at: string;
}

export default function MoodTrackerScreen() {
  const { themeStyle } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry');

  // Mood intensities state (1-5 for each mood)
  const [moodIntensities, setMoodIntensities] = useState<MoodIntensities>(() => {
    const initial: MoodIntensities = {};
    moods.forEach((mood) => {
      initial[mood.value] = 1; // Start all at 1 (minimum)
    });
    return initial;
  });

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
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('');
  const [ordering, setOrdering] = useState('-created_at');
  
  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showOrderingModal, setShowOrderingModal] = useState(false);
  const [showMoodFilterModal, setShowMoodFilterModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      loadMoodHistory();
    }
  }, [activeTab, startDate, endDate, ordering]);

  // Refresh history when screen comes into focus (after edit/delete)
  useFocusEffect(
    React.useCallback(() => {
      if (activeTab === 'history') {
        loadMoodHistory();
      }
    }, [activeTab])
  );

  // Update mood intensity
  const updateMoodIntensity = (moodValue: string, intensity: number) => {
    setMoodIntensities((prev) => ({
      ...prev,
      [moodValue]: intensity,
    }));
  };

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
        params.start_date = startDate.toISOString().split('T')[0];
      }
      if (endDate) {
        params.end_date = endDate.toISOString().split('T')[0];
      }
      // Note: Mood filtering removed as backend doesn't support it with mood_intensities structure

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
      mood_date: new Date().toISOString().split('T')[0],
    };

    try {
      setLoading(true);
      console.log('📤 Submitting mood entry:', payload);

      const response = await api.post('/patients/mood/', payload);
      console.log('✅ Mood entry saved:', response.data);

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
        resetIntensities[mood.value] = 1;
      });
      setMoodIntensities(resetIntensities);
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
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Clear filters
  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setOrdering('-created_at');
  };

  return (
    <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: themeStyle.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonContainer}>
          <Text style={[styles.backButton, { color: themeStyle.text }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeStyle.title }]}>Today's Mood</Text>

        {/* Tab Switcher */}
        <View style={[styles.tabContainer, { backgroundColor: themeStyle.background }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'entry' && [styles.activeTab, { backgroundColor: themeStyle.button }],
            ]}
            onPress={() => setActiveTab('entry')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'entry' ? themeStyle.buttonText : themeStyle.text,
                },
              ]}
            >
              New Entry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'history' && [styles.activeTab, { backgroundColor: themeStyle.button }],
            ]}
            onPress={() => setActiveTab('history')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'history' ? themeStyle.buttonText : themeStyle.text,
                },
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* View Weekly Trend Button */}
        <TouchableOpacity
          style={[styles.trendButton, { backgroundColor: themeStyle.button, shadowColor: '#000' }]}
          onPress={() => router.push('./mood-weekly-trend')}
        >
          <Text style={styles.trendButtonText}>
            📊 View Weekly Trend
          </Text>
        </TouchableOpacity>
      </View>

      {/* Entry Tab Content */}
      {activeTab === 'entry' && (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.subtitle, { color: themeStyle.label }]}>
            Rate the intensity of each mood you're experiencing (1-5 scale)
          </Text>

          {/* Mood Intensities Section */}
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

          {/* Additional Context Section (Collapsible) */}
          <TouchableOpacity
            style={[styles.contextToggle, { backgroundColor: themeStyle.card }]}
            onPress={() => setShowContextSection(!showContextSection)}
          >
            <Text style={[styles.contextToggleText, { color: themeStyle.text }]}>
              {showContextSection ? '▼' : '▶'} Additional Context (Optional)
            </Text>
          </TouchableOpacity>

          {showContextSection && (
            <>
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
                <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
                  Activities Today
                </Text>
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
                <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
                  Additional Notes
                </Text>
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

              
            </>
          )}

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

      {/* History Tab Content */}
      {activeTab === 'history' && (
        <View style={styles.historyContainer}>
          {/* Filters */}
          <View style={[styles.filtersContainer, { backgroundColor: themeStyle.card }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Filters</Text>

            {/* Date Range */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterButton, { backgroundColor: themeStyle.background, borderColor: themeStyle.border }]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={[styles.filterButtonText, { color: themeStyle.text }]}>
                  {startDate ? `From: ${startDate.toLocaleDateString()}` : 'Start Date 📅'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterButton, { backgroundColor: themeStyle.background, borderColor: themeStyle.border }]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={[styles.filterButtonText, { color: themeStyle.text }]}>
                  {endDate ? `To: ${endDate.toLocaleDateString()}` : 'End Date 📅'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Ordering */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterButton, { backgroundColor: themeStyle.background, borderColor: themeStyle.border }]}
                onPress={() => setShowOrderingModal(true)}
              >
                <Text style={[styles.filterButtonText, { color: themeStyle.text }]}>
                  {orderingOptions.find((o) => o.value === ordering)?.label || 'Sort By'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Clear Filters */}
            {(startDate || endDate || ordering !== '-created_at') && (
              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: themeStyle.progressbarside }]}
                onPress={clearFilters}
              >
                <Text style={[styles.clearFiltersText, { color: themeStyle.darktext }]}>
                  Clear Filters
                </Text>
              </TouchableOpacity>
            )}
          </View>

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
                    style={[styles.historyCard, { backgroundColor: themeStyle.card }]}
                    onPress={() => router.push(`/patient/mood-detail?id=${item.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.historyHeader}>
                      <View style={styles.historyMoodContainer}>
                        <Text style={styles.historyEmoji}>{getMoodEmoji(dominantMood)}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.historyMood, { color: themeStyle.title }]}>
                            {getMoodLabel(dominantMood)}
                          </Text>
                          <Text style={[styles.historyDate, { color: themeStyle.label }]}>
                            {formatDate(item.created_at)}
                          </Text>
                        </View>
                      </View>
                      {item.average_intensity && (
                        <View style={[styles.intensityBadgeSmall, { backgroundColor: getIntensityColor(item.average_intensity) }]}>
                          <Text style={styles.intensityBadgeSmallText}>
                            {item.average_intensity.toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Display all mood intensities */}
                    {moodsArray.length > 0 && (
                      <View style={styles.moodsContainer}>
                        {moodsArray.map(({ mood, intensity, emoji, label }) => (
                          <View
                            key={mood}
                            style={[
                              styles.moodChip,
                              { backgroundColor: themeStyle.background, borderColor: getIntensityColor(intensity) },
                            ]}
                          >
                            <Text style={styles.moodChipEmoji}>{emoji}</Text>
                            <Text style={[styles.moodChipLabel, { color: themeStyle.text }]}>
                              {label}
                            </Text>
                            <View style={[styles.moodChipBadge, { backgroundColor: getIntensityColor(intensity) }]}>
                              <Text style={styles.moodChipBadgeText}>{intensity}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {item.triggers_list && item.triggers_list.length > 0 && (
                      <View style={styles.historyTriggers}>
                        <Text style={[styles.historyTriggersLabel, { color: themeStyle.label }]}>
                          Triggers:
                        </Text>
                        <View style={styles.historyTriggersChips}>
                          {item.triggers_list.map((trigger, index) => (
                            <View
                              key={index}
                              style={[
                                styles.historyTriggerChip,
                                { backgroundColor: themeStyle.progressbarside },
                              ]}
                            >
                              <Text
                                style={[styles.historyTriggerText, { color: themeStyle.darktext }]}
                              >
                                {trigger}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {item.notes && (
                      <View style={styles.historyNotes}>
                        <Text style={[styles.historyNotesLabel, { color: themeStyle.label }]}>
                          Notes:
                        </Text>
                        <Text style={[styles.historyNotesText, { color: themeStyle.text }]}>
                          {item.notes}
                        </Text>
                      </View>
                    )}

                    
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
    paddingBottom: 15,
  },
  backButtonContainer: {
    marginBottom: 10,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
  },
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emojiText: {
    fontSize: 40,
  },
  emojiTextLarge: {
    fontSize: 48,
  },
  moodLabel: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
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
    borderWidth: 1.5,
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
});
