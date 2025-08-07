import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions
} from 'react-native';
import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const activityTypes = [
  { label: 'Exercise', emoji: '🏃‍♂️', value: 'exercise' },
  { label: 'Meditation', emoji: '🧘‍♀️', value: 'meditation' },
  { label: 'Social', emoji: '👥', value: 'social' },
  { label: 'Work', emoji: '💼', value: 'work' },
  { label: 'Hobby', emoji: '🎨', value: 'hobby' },
  { label: 'Study', emoji: '📚', value: 'study' },
  { label: 'Rest', emoji: '😴', value: 'rest' },
  { label: 'Outdoor', emoji: '🌳', value: 'outdoor' },
  { label: 'Creative', emoji: '✨', value: 'creative' },
  { label: 'Music', emoji: '🎵', value: 'music' },
  { label: 'Reading', emoji: '📖', value: 'reading' },
  { label: 'Cooking', emoji: '👩‍🍳', value: 'cooking' }
];

const intensityLevels = [
  { level: 1, label: 'Very Light', emoji: '😌' },
  { level: 2, label: 'Light', emoji: '🙂' },
  { level: 3, label: 'Light-Moderate', emoji: '😊' },
  { level: 4, label: 'Moderate', emoji: '😄' },
  { level: 5, label: 'Moderate-High', emoji: '😃' },
  { level: 6, label: 'High', emoji: '🤩' },
  { level: 7, label: 'Very High', emoji: '😤' },
  { level: 8, label: 'Intense', emoji: '💪' },
  { level: 9, label: 'Very Intense', emoji: '🔥' },
  { level: 10, label: 'Maximum', emoji: '⚡' }
];

interface ActivityEntry {
  activity_type: string;
  activity_name: string;
  description?: string;
  duration_minutes: number;
  intensity: number;
  mood_before: number;
  mood_after: number;
  energy_before: number;
  energy_after: number;
  location?: string;
  with_others: boolean;
  notes?: string;
}

interface ActivityEntryResponse {
  id: string;
  activity_type: string;
  activity_name: string;
  description: string;
  duration_minutes: number;
  intensity: number;
  mood_before: number;
  mood_after: number;
  mood_impact: string;
  energy_before: number;
  energy_after: number;
  energy_impact: string;
  location: string;
  with_others: boolean;
  notes: string;
  activity_date: string;
  created_at: string;
}

const ActivityTracker = () => {
  const { themeStyle } = useTheme();

  const [selectedActivityType, setSelectedActivityType] = useState<string>('');
  const [activityName, setActivityName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [intensity, setIntensity] = useState(5);
  const [moodBefore, setMoodBefore] = useState('5');
  const [moodAfter, setMoodAfter] = useState('7');
  const [energyBefore, setEnergyBefore] = useState('5');
  const [energyAfter, setEnergyAfter] = useState('7');
  const [location, setLocation] = useState('');
  const [withOthers, setWithOthers] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [activityHistory, setActivityHistory] = useState<ActivityEntryResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  const fetchActivityHistory = async (activityType?: string) => {
    try {
      setHistoryLoading(true);
      let endpoint = 'history/activities/?limit=10';
      
      if (activityType && activityType !== 'all') {
        endpoint += `&activity_type=${activityType}`;
      }
      
      const response = await api.get(endpoint);
      setActivityHistory(response.data);
      setHistoryLoaded(true);
    } catch (error) {
      console.error('❌ Error fetching activity history:', error);
      Alert.alert('Error', 'Failed to load activity history. Please try again.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFilterChange = (filterType: string) => {
    setHistoryFilter(filterType);
    setHistoryLoaded(false);
    fetchActivityHistory(filterType);
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
    if (!showHistory && !historyLoaded) {
      fetchActivityHistory(historyFilter);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatActivityDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getActivityTypeEmoji = (activityType: string) => {
    const type = activityTypes.find(t => t.value === activityType);
    return type?.emoji || '🏃‍♂️';
  };

  const validateInputs = () => {
    if (!selectedActivityType) {
      Alert.alert('Validation Error', 'Please select an activity type.');
      return false;
    }
    
    if (!activityName.trim()) {
      Alert.alert('Validation Error', 'Please enter an activity name.');
      return false;
    }
    
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum < 1) {
      Alert.alert('Validation Error', 'Duration must be at least 1 minute.');
      return false;
    }
    
    const beforeMood = parseInt(moodBefore);
    const afterMood = parseInt(moodAfter);
    const beforeEnergy = parseInt(energyBefore);
    const afterEnergy = parseInt(energyAfter);
    
    if (isNaN(beforeMood) || beforeMood < 1 || beforeMood > 10) {
      Alert.alert('Validation Error', 'Mood Before must be between 1 and 10.');
      return false;
    }
    
    if (isNaN(afterMood) || afterMood < 1 || afterMood > 10) {
      Alert.alert('Validation Error', 'Mood After must be between 1 and 10.');
      return false;
    }
    
    if (isNaN(beforeEnergy) || beforeEnergy < 1 || beforeEnergy > 10) {
      Alert.alert('Validation Error', 'Energy Before must be between 1 and 10.');
      return false;
    }
    
    if (isNaN(afterEnergy) || afterEnergy < 1 || afterEnergy > 10) {
      Alert.alert('Validation Error', 'Energy After must be between 1 and 10.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;

    const payload: ActivityEntry = {
      activity_type: selectedActivityType,
      activity_name: activityName.trim(),
      description: description.trim() || undefined,
      duration_minutes: parseInt(duration),
      intensity: intensity,
      mood_before: parseInt(moodBefore),
      mood_after: parseInt(moodAfter),
      energy_before: parseInt(energyBefore),
      energy_after: parseInt(energyAfter),
      location: location.trim() || undefined,
      with_others: withOthers,
      notes: notes.trim() || undefined,
    };

    try {
      setLoading(true);
      const response = await api.post('history/activities/', payload);
      console.log('✅ Activity entry saved:', response.data);
      
      const moodImprovement = payload.mood_after - payload.mood_before;
      const energyImprovement = payload.energy_after - payload.energy_before;
      
      const improvementText = [];
      if (moodImprovement > 0) {
        improvementText.push(`Your mood improved by ${moodImprovement} points! 😊`);
      } else if (moodImprovement < 0) {
        improvementText.push(`Your mood shifted by ${moodImprovement} points. That's okay! 💙`);
      } else {
        improvementText.push(`Your mood stayed consistent. 😌`);
      }
      
      if (energyImprovement > 0) {
        improvementText.push(`Your energy increased by ${energyImprovement} points! ⚡`);
      } else if (energyImprovement < 0) {
        improvementText.push(`Your energy decreased by ${Math.abs(energyImprovement)} points. Rest is important too! 😴`);
      } else {
        improvementText.push(`Your energy level stayed the same. 🔋`);
      }
        
      Alert.alert(
        'Activity Logged! 🎉', 
        `"${payload.activity_name}" has been recorded.\n\n${improvementText.join('\n')}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
      
      // Reset form
      setSelectedActivityType('');
      setActivityName('');
      setDescription('');
      setDuration('30');
      setIntensity(5);
      setMoodBefore('5');
      setMoodAfter('7');
      setEnergyBefore('5');
      setEnergyAfter('7');
      setLocation('');
      setWithOthers(false);
      setNotes('');
      
      // Refresh history if it was loaded
      if (historyLoaded) {
        setHistoryLoaded(false);
        fetchActivityHistory(historyFilter);
      }
    } catch (error: any) {
      console.error('❌ Error saving activity:', error);
      const errorMessage = error.response?.data?.detail || 'Something went wrong while saving your activity.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedActivityEmoji = () => {
    const selected = activityTypes.find(type => type.value === selectedActivityType);
    return selected?.emoji || '🏃‍♂️';
  };

  const getIntensityLabel = (level: number) => {
    const intensity = intensityLevels.find(i => i.level === level);
    return intensity ? `${intensity.emoji} ${intensity.label}` : `Level ${level}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={[styles.header, { backgroundColor: '#10B981' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Tracker</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>🏃‍♂️ Activity Type</Text>
          <View style={styles.activityTypeContainer}>
            {activityTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.activityTypeTag,
                  { borderColor: themeStyle.border },
                  selectedActivityType === type.value && styles.selectedActivityTypeTag
                ]}
                onPress={() => setSelectedActivityType(type.value)}
              >
                <Text style={styles.activityTypeEmoji}>{type.emoji}</Text>
                <Text
                  style={[
                    styles.activityTypeLabel,
                    {
                      color: selectedActivityType === type.value ? 'white' : themeStyle.text
                    }
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
            {getSelectedActivityEmoji()} Activity Details
          </Text>
          
          <Text style={[styles.label, { color: themeStyle.text }]}>Activity Name *</Text>
          <TextInput
            style={[styles.textInput, {
              backgroundColor: themeStyle.background,
              color: themeStyle.text,
              borderColor: themeStyle.border
            }]}
            placeholder="e.g. Morning Run, Yoga Session, Coffee with Friends"
            placeholderTextColor={themeStyle.label}
            value={activityName}
            onChangeText={setActivityName}
          />

          <Text style={[styles.label, { color: themeStyle.text }]}>Description (Optional)</Text>
          <TextInput
            style={[styles.textInput, {
              backgroundColor: themeStyle.background,
              color: themeStyle.text,
              borderColor: themeStyle.border
            }]}
            placeholder="Brief description of the activity"
            placeholderTextColor={themeStyle.label}
            value={description}
            onChangeText={setDescription}
          />

          <View style={styles.rowInputs}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeStyle.text }]}>Duration (min)</Text>
              <TextInput
                style={[styles.smallInput, {
                  backgroundColor: themeStyle.background,
                  color: themeStyle.text,
                  borderColor: themeStyle.border
                }]}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholder="30"
                placeholderTextColor={themeStyle.label}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeStyle.text }]}>Location (Optional)</Text>
              <TextInput
                style={[styles.smallInput, {
                  backgroundColor: themeStyle.background,
                  color: themeStyle.text,
                  borderColor: themeStyle.border
                }]}
                value={location}
                onChangeText={setLocation}
                placeholder="Home, Gym, Park"
                placeholderTextColor={themeStyle.label}
              />
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>💪 Intensity Level</Text>
          <Text style={[styles.subtitle, { color: themeStyle.label }]}>
            How intense was this activity? (1 = Very Light, 10 = Maximum)
          </Text>
          
          <View style={styles.intensityContainer}>
            <View style={styles.intensitySlider}>
              {intensityLevels.map((level) => (
                <TouchableOpacity
                  key={level.level}
                  style={[
                    styles.intensityButton,
                    { backgroundColor: intensity >= level.level ? '#10B981' : themeStyle.background },
                    { borderColor: themeStyle.border }
                  ]}
                  onPress={() => setIntensity(level.level)}
                >
                  <Text style={[
                    styles.intensityButtonText,
                    { color: intensity >= level.level ? 'white' : themeStyle.text }
                  ]}>
                    {level.level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.intensityLabel, { color: themeStyle.text }]}>
              {getIntensityLabel(intensity)}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>😊 Mood & Energy Impact</Text>
          <Text style={[styles.subtitle, { color: themeStyle.label }]}>
            Rate your mood and energy before and after the activity (1-10)
          </Text>
          
          <View style={styles.impactGrid}>
            <View style={styles.impactRow}>
              <View style={styles.impactGroup}>
                <Text style={[styles.impactLabel, { color: themeStyle.text }]}>😔 Mood Before</Text>
                <View style={[styles.impactInputContainer, { backgroundColor: themeStyle.background, borderColor: themeStyle.border }]}>
                  <TextInput
                    style={[styles.impactInput, { color: themeStyle.text }]}
                    value={moodBefore}
                    onChangeText={setMoodBefore}
                    keyboardType="numeric"
                    maxLength={2}
                    textAlign="center"
                  />
                </View>
              </View>

              <View style={styles.impactGroup}>
                <Text style={[styles.impactLabel, { color: themeStyle.text }]}>😊 Mood After</Text>
                <View style={[styles.impactInputContainer, { backgroundColor: themeStyle.background, borderColor: themeStyle.border }]}>
                  <TextInput
                    style={[styles.impactInput, { color: themeStyle.text }]}
                    value={moodAfter}
                    onChangeText={setMoodAfter}
                    keyboardType="numeric"
                    maxLength={2}
                    textAlign="center"
                  />
                </View>
              </View>
            </View>

            <View style={styles.impactRow}>
              <View style={styles.impactGroup}>
                <Text style={[styles.impactLabel, { color: themeStyle.text }]}>🔋 Energy Before</Text>
                <View style={[styles.impactInputContainer, { backgroundColor: themeStyle.background, borderColor: themeStyle.border }]}>
                  <TextInput
                    style={[styles.impactInput, { color: themeStyle.text }]}
                    value={energyBefore}
                    onChangeText={setEnergyBefore}
                    keyboardType="numeric"
                    maxLength={2}
                    textAlign="center"
                  />
                </View>
              </View>

              <View style={styles.impactGroup}>
                <Text style={[styles.impactLabel, { color: themeStyle.text }]}>⚡ Energy After</Text>
                <View style={[styles.impactInputContainer, { backgroundColor: themeStyle.background, borderColor: themeStyle.border }]}>
                  <TextInput
                    style={[styles.impactInput, { color: themeStyle.text }]}
                    value={energyAfter}
                    onChangeText={setEnergyAfter}
                    keyboardType="numeric"
                    maxLength={2}
                    textAlign="center"
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>👥 Social & Notes</Text>
          
          <TouchableOpacity
            style={[styles.checkboxContainer, { borderColor: themeStyle.border }]}
            onPress={() => setWithOthers(!withOthers)}
          >
            <View style={[
              styles.checkbox,
              { borderColor: themeStyle.border },
              withOthers && { backgroundColor: '#10B981', borderColor: '#10B981' }
            ]}>
              {withOthers && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkboxLabel, { color: themeStyle.text }]}>
              I did this activity with others
            </Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: themeStyle.text }]}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textArea, {
              backgroundColor: themeStyle.background,
              color: themeStyle.text,
              borderColor: themeStyle.border
            }]}
            placeholder="How did you feel? Any insights or observations?"
            placeholderTextColor={themeStyle.label}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.completeButton, 
            { 
              opacity: loading ? 0.7 : 1,
              backgroundColor: loading ? '#9CA3AF' : '#10B981'
            }
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.loadingText}>Saving Activity...</Text>
            </View>
          ) : (
            <Text style={styles.completeButtonText}>📊 Log Activity</Text>
          )}
        </TouchableOpacity>

        {/* Activity History Section */}
        <View style={[styles.historySection, { backgroundColor: themeStyle.dashboardcard }]}>
          <TouchableOpacity
            style={styles.historyHeader}
            onPress={toggleHistory}
          >
            <View style={styles.historyHeaderContent}>
              <Text style={[styles.historyTitle, { color: themeStyle.text }]}>
                📊 Activity History
              </Text>
              <Text style={[styles.historySubtitle, { color: themeStyle.label }]}>
                {showHistory ? 'Tap to hide' : 'View your recent activities and their impact'}
              </Text>
            </View>
            <Text style={[styles.expandIcon, { color: themeStyle.text }]}>
              {showHistory ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showHistory && (
            <View style={styles.historyContent}>
              {/* Filter Section */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: themeStyle.text }]}>Filter by Activity Type:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      { borderColor: themeStyle.border },
                      historyFilter === 'all' && styles.selectedFilterButton
                    ]}
                    onPress={() => handleFilterChange('all')}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      { color: historyFilter === 'all' ? 'white' : themeStyle.text }
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  
                  {activityTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.filterButton,
                        { borderColor: themeStyle.border },
                        historyFilter === type.value && styles.selectedFilterButton
                      ]}
                      onPress={() => handleFilterChange(type.value)}
                    >
                      <Text style={styles.filterEmoji}>{type.emoji}</Text>
                      <Text style={[
                        styles.filterButtonText,
                        { color: historyFilter === type.value ? 'white' : themeStyle.text }
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {historyLoading ? (
                <View style={styles.historyLoadingContainer}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={[styles.historyLoadingText, { color: themeStyle.label }]}>
                    Loading your activities...
                  </Text>
                </View>
              ) : activityHistory.length > 0 ? (
                <View style={styles.historyList}>
                  {/* History Summary */}
                  <View style={[styles.historySummary, { backgroundColor: themeStyle.background }]}>
                    <Text style={[styles.historySummaryTitle, { color: themeStyle.text }]}>
                      📈 Quick Stats
                    </Text>
                    <View style={styles.historySummaryGrid}>
                      <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                          {activityHistory.length}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: themeStyle.label }]}>
                          Activities
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                          {Math.round(activityHistory.reduce((sum, activity) => sum + activity.duration_minutes, 0) / activityHistory.length) || 0}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: themeStyle.label }]}>
                          Avg Duration
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                          {(activityHistory.filter(activity => (activity.mood_after || 0) > (activity.mood_before || 0)).length / activityHistory.length * 100).toFixed(0)}%
                        </Text>
                        <Text style={[styles.summaryLabel, { color: themeStyle.label }]}>
                          Mood Boost
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                          {activityHistory.reduce((sum, activity) => sum + activity.duration_minutes, 0)}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: themeStyle.label }]}>
                          Total Mins
                        </Text>
                      </View>
                    </View>
                  </View>

                  {activityHistory.map((activity) => (
                    <View key={activity.id} style={[styles.historyCard, { backgroundColor: themeStyle.background }]}>
                      <View style={styles.historyCardHeader}>
                        <View style={styles.historyCardTitle}>
                          <Text style={styles.activityHistoryEmoji}>
                            {getActivityTypeEmoji(activity.activity_type)}
                          </Text>
                          <Text style={[styles.historyActivityTitle, { color: themeStyle.text }]}>
                            {activity.activity_name}
                          </Text>
                          <Text style={[styles.activityDuration, { color: themeStyle.label }]}>
                            {activity.duration_minutes}min
                          </Text>
                        </View>
                        <View style={styles.historyDateContainer}>
                          <Text style={[styles.historyActivityDate, { color: themeStyle.text }]}>
                            {formatActivityDate(activity.activity_date || activity.created_at)}
                          </Text>
                          <Text style={[styles.historyDate, { color: themeStyle.label }]}>
                            {formatDate(activity.created_at)}
                          </Text>
                        </View>
                      </View>

                      {activity.description && (
                        <Text style={[styles.historyDescription, { color: themeStyle.text }]} numberOfLines={1}>
                          {activity.description}
                        </Text>
                      )}

                      <View style={styles.historyCardFooter}>
                        <View style={styles.historyImpactRow}>
                          <View style={styles.impactSection}>
                            <Text style={[styles.impactSectionTitle, { color: themeStyle.text }]}>😊 Mood Impact</Text>
                            <View style={styles.impactIndicators}>
                              <View style={styles.impactItem}>
                                <Text style={styles.historyImpactLabel}>Before</Text>
                                <Text style={[styles.impactValue, { color: themeStyle.text }]}>
                                  {activity.mood_before}
                                </Text>
                              </View>
                              <Text style={[styles.impactArrow, { color: themeStyle.label }]}>→</Text>
                              <View style={styles.impactItem}>
                                <Text style={styles.historyImpactLabel}>After</Text>
                                <Text style={[styles.impactValue, { color: themeStyle.text }]}>
                                  {activity.mood_after}
                                </Text>
                              </View>
                              <Text style={[
                                styles.impactChange,
                                { 
                                  color: activity.mood_impact?.includes?.('+') ? '#10B981' : 
                                         activity.mood_impact?.includes?.('-') ? '#EF4444' : themeStyle.label
                                }
                              ]}>
                                {activity.mood_impact || 'No change'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.impactSection}>
                            <Text style={[styles.impactSectionTitle, { color: themeStyle.text }]}>⚡ Energy Impact</Text>
                            <View style={styles.impactIndicators}>
                              <View style={styles.impactItem}>
                                <Text style={styles.historyImpactLabel}>Before</Text>
                                <Text style={[styles.impactValue, { color: themeStyle.text }]}>
                                  {activity.energy_before}
                                </Text>
                              </View>
                              <Text style={[styles.impactArrow, { color: themeStyle.label }]}>→</Text>
                              <View style={styles.impactItem}>
                                <Text style={styles.historyImpactLabel}>After</Text>
                                <Text style={[styles.impactValue, { color: themeStyle.text }]}>
                                  {activity.energy_after}
                                </Text>
                              </View>
                              <Text style={[
                                styles.impactChange,
                                { 
                                  color: activity.energy_impact?.includes?.('+') ? '#10B981' : 
                                         activity.energy_impact?.includes?.('-') ? '#EF4444' : themeStyle.label
                                }
                              ]}>
                                {activity.energy_impact || 'No change'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.activityDetails}>
                          <View style={styles.detailItem}>
                            <Text style={[styles.detailLabel, { color: themeStyle.label }]}>Intensity:</Text>
                            <Text style={[styles.detailValue, { color: themeStyle.text }]}>
                              {getIntensityLabel(activity.intensity)}
                            </Text>
                          </View>
                          
                          {activity.location && (
                            <View style={styles.detailItem}>
                              <Text style={[styles.detailLabel, { color: themeStyle.label }]}>Location:</Text>
                              <Text style={[styles.detailValue, { color: themeStyle.text }]}>
                                📍 {activity.location}
                              </Text>
                            </View>
                          )}
                          
                          {activity.with_others && (
                            <View style={styles.detailItem}>
                              <Text style={[styles.detailValue, { color: themeStyle.text }]}>
                                👥 With others
                              </Text>
                            </View>
                          )}
                        </View>

                        {activity.notes && (
                          <View style={styles.notesSection}>
                            <Text style={[styles.notesLabel, { color: themeStyle.label }]}>Notes:</Text>
                            <Text style={[styles.notesText, { color: themeStyle.text }]} numberOfLines={2}>
                              {activity.notes}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyHistory}>
                  <Text style={[styles.emptyHistoryText, { color: themeStyle.label }]}>
                    📊 No activities logged yet.{'\n'}Start tracking your activities to see their impact!
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ActivityTracker;

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
    backgroundColor: '#10B981',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  smallInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  activityTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  activityTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 2,
    marginBottom: 8,
    minWidth: width * 0.25,
    justifyContent: 'center',
  },
  selectedActivityTypeTag: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  activityTypeEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  activityTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  intensityContainer: {
    marginTop: 8,
  },
  intensitySlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  intensityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  intensityLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  impactGrid: {
    gap: 16,
  },
  impactRow: {
    flexDirection: 'row',
    gap: 16,
  },
  impactGroup: {
    flex: 1,
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  impactInputContainer: {
    borderWidth: 2,
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  impactInput: {
    fontSize: 18,
    fontWeight: 'bold',
    width: '100%',
    height: '100%',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    flex: 1,
  },
  completeButton: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
  
  // History Section Styles
  historySection: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  historyHeaderContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  historySubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  expandIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  historyLoadingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  historyList: {
    gap: 16,
  },
  historyCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyCardHeader: {
    marginBottom: 12,
  },
  historyCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  activityHistoryEmoji: {
    fontSize: 18,
  },
  historyActivityTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  activityDuration: {
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: '#10B981',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  historyDateContainer: {
    alignItems: 'flex-end',
  },
  historyActivityDate: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  historyDescription: {
    fontSize: 14,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  historyCardFooter: {
    gap: 16,
  },
  historyImpactRow: {
    gap: 16,
  },
  impactSection: {
    marginBottom: 12,
  },
  impactSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  impactIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  impactItem: {
    alignItems: 'center',
    gap: 2,
  },
  historyImpactLabel: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  impactArrow: {
    fontSize: 12,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  impactChange: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  activityDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyHistory: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Filter Section Styles
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterScrollView: {
    flexGrow: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  selectedFilterButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Summary Section Styles
  historySummary: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  historySummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  historySummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
});
