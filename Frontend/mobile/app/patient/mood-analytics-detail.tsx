import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import api from '../utils/api';

const { width } = Dimensions.get('window');

// Mood emoji mapping
const moodEmojis: { [key: string]: string } = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  anxious: '😰',
  peaceful: '😌',
  excited: '🤩',
  grateful: '🙏',
  overwhelmed: '😵',
  hopeful: '🌟',
  stressed: '😫',
};

const moodLabels: { [key: string]: string } = {
  happy: 'Happy',
  sad: 'Sad',
  angry: 'Angry',
  anxious: 'Anxious',
  peaceful: 'Peaceful',
  excited: 'Excited',
  grateful: 'Grateful',
  overwhelmed: 'Overwhelmed',
  hopeful: 'Hopeful',
  stressed: 'Stressed',
};

const moodColorMap: { [key: string]: string[] } = {
  happy: ['#FFD54F', '#FFC107'],
  sad: ['#64B5F6', '#4FC3F7'],
  angry: ['#FF8A80', '#FF5252'],
  anxious: ['#CE93D8', '#AB47BC'],
  peaceful: ['#81D4FA', '#4FC3F7'],
  excited: ['#FFAB91', '#FF7043'],
  grateful: ['#AED581', '#9CCC65'],
  overwhelmed: ['#B39DDB', '#9575CD'],
  hopeful: ['#A5D6A7', '#7CB342'],
  stressed: ['#E57373', '#EF5350'],
};

interface MoodAnalytics {
  average_intensity: number;
  most_common_mood: string;
  mood_distribution: { [key: string]: number };
  weekly_trend: Array<{ date: string; average_intensity: number }>;
  monthly_comparison: { [key: string]: any };
  common_triggers: string[];
}

export default function MoodAnalyticsDetail() {
  const { themeStyle } = useTheme();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<MoodAnalytics | null>(null);
  const [selectedDays, setSelectedDays] = useState(30);

  const dayOptions = [7, 14, 30, 60];

  useEffect(() => {
    loadAnalytics();
  }, [selectedDays]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching mood analytics for', selectedDays, 'days');
      const response = await api.get<MoodAnalytics>('/patients/mood/analytics/', {
        params: { days: selectedDays },
      });
      setAnalytics(response.data);
      console.log('✅ Analytics loaded:', response.data);
    } catch (error: any) {
      console.error('❌ Error loading mood analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (mood: string) => moodEmojis[mood] || '😐';
  const getMoodLabel = (mood: string) => moodLabels[mood] || mood;

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 4) return '#4CAF50';
    if (intensity >= 3) return '#FF9800';
    return '#F44336';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeStyle.button} />
          <Text style={[styles.loadingText, { color: themeStyle.label }]}>
            Loading analytics...
          </Text>
        </View>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={[styles.emptyText, { color: themeStyle.text }]}>
            No mood data available
          </Text>
          <Text style={[styles.emptySubtext, { color: themeStyle.label }]}>
            Start tracking your moods to see analytics
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeStyle.button }]}
            onPress={() => router.push('/patient/mood')}
          >
            <Text style={[styles.buttonText, { color: themeStyle.buttonText }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate total entries
  const totalEntries = Object.values(analytics.mood_distribution).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <View style={[styles.container, { backgroundColor: '#342949' }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header (restored simple header, no grey band) */}
        <View style={[styles.headerRow, { paddingTop: 12, backgroundColor: 'transparent' }]}>
          <TouchableOpacity
            style={[styles.backButton]}
            onPress={() => router.back()}
          >
            <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitleLarge}>
            <Text style={styles.headerBlue}>Mood </Text>
            <Text style={styles.headerOrange}>Analytics</Text>
          </Text>
        </View>

        {/* Time Period Selector */}
        <View
          style={[
            styles.card,
            { backgroundColor: '#473F5A' },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Time Period</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.periodButtons}>
              {dayOptions.map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.periodButton,
                    {
                      backgroundColor:
                        selectedDays === days ? '#FFB36B' : '#5B5270',
                      borderColor: selectedDays === days ? '#FFB36B' : 'rgba(255,255,255,0.1)',
                    },
                  ]}
                  onPress={() => setSelectedDays(days)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      {
                        color: selectedDays === days ? '#FFFFFF' : '#E5E5E5',
                      },
                    ]}
                  >
                    {days} days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Key Metrics */}
        <View
          style={[
            styles.card,
            { backgroundColor: '#473F5A' },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Key Metrics</Text>
            <View style={styles.metricsGrid}>
            <View style={[styles.metricBox, { backgroundColor: '#5B5270' }]}>
                  <FontAwesome name="bar-chart" size={28} color="#FFB36B" style={{ marginBottom: 8 }} />
              <Text style={[styles.metricValue, { color: '#FFFFFF' }]}>
                {totalEntries}
              </Text>
              <Text style={[styles.metricLabel, { color: '#B8A8E6' }]}>Total Entries</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: '#5B5270' }]}>
              <FontAwesome name="star" size={28} color="#FFB36B" style={{ marginBottom: 8 }} />
              <Text style={[styles.metricValue, { color: '#FFFFFF' }]}>
                {analytics.average_intensity.toFixed(1)}
              </Text>
              <Text style={[styles.metricLabel, { color: '#B8A8E6' }]}>
                Avg Intensity
              </Text>
            </View>
          </View>
        </View>

        {/* Most Common Mood */}
        {analytics.most_common_mood && (
          <View
            style={[
              styles.card,
              { backgroundColor: '#473F5A' },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>
              Most Common Mood
            </Text>
            <View style={styles.dominantMoodContainer}>
              <View
                style={[
                  styles.dominantMoodCircle,
                  { backgroundColor: '#5B5270' },
                ]}
              >
                <Text style={styles.dominantMoodEmoji}>
                  {getMoodEmoji(analytics.most_common_mood)}
                </Text>
              </View>
              <Text style={[styles.dominantMoodLabel, { color: '#FFFFFF' }]}>
                {getMoodLabel(analytics.most_common_mood)}
              </Text>
              <Text style={[styles.dominantMoodCount, { color: '#B8A8E6' }]}>
                {analytics.mood_distribution[analytics.most_common_mood]} times
              </Text>
            </View>
          </View>
        )}

        {/* Mood Distribution */}
        {Object.keys(analytics.mood_distribution).length > 0 && (
          <View
            style={[
              styles.card,
              { backgroundColor: '#473F5A' },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>
              Mood Distribution
            </Text>
            <View style={styles.distributionList}>
              {Object.entries(analytics.mood_distribution)
                .sort(([, a], [, b]) => b - a)
                .map(([mood, count]) => {
                  const percentage = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
                  return (
                    <View key={mood} style={styles.distributionItem}>
                      <View style={styles.distributionHeader}>
                        <View style={styles.distributionMoodInfo}>
                          <Text style={styles.distributionEmoji}>{getMoodEmoji(mood)}</Text>
                          <Text style={[styles.distributionLabel, { color: '#FFFFFF' }]}>
                            {getMoodLabel(mood)}
                          </Text>
                        </View>
                        <Text style={[styles.distributionCount, { color: '#FFFFFF' }]}>
                          {count} ({percentage.toFixed(0)}%)
                        </Text>
                      </View>
                      <View
                        style={[styles.distributionBarBackground, { backgroundColor: '#5B5270' }]}
                      >
                        <LinearGradient
                          colors={moodColorMap[mood] || [themeStyle.progressbarmain, themeStyle.progressbarside]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.distributionBar, { width: `${percentage}%` }]}
                        />
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        )}

        {/* Weekly Trend removed for this page per UI uniformity request */}

        {/* Common Triggers */}
        {analytics.common_triggers.length > 0 && (
          <View
            style={[
              styles.card,
              { backgroundColor: '#473F5A' },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>
              🎯 Common Triggers
            </Text>
            <View style={styles.triggersContainer}>
              {analytics.common_triggers.map((trigger, index) => (
                <View
                  key={index}
                  style={[
                    styles.triggerChip,
                    {
                      backgroundColor: '#5B5270',
                      borderColor: '#FFB36B',
                    },
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

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: '#5B5270' }]}>
          <Text style={styles.infoEmoji}>💡</Text>
          <Text style={[styles.infoText, { color: '#FFFFFF' }]}>
            These insights are based on your mood entries over the selected time period. Track
            consistently for more accurate patterns!
          </Text>
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
    paddingTop: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0, minHeight: 64, position: 'relative' },
  /* headerContainer removed to restore original look */
  backButton: { position: 'absolute', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 },
  headerTitleLarge: { fontSize: 26, fontWeight: '800', marginLeft: 0, color: '#524f85', marginTop: 20, marginBottom: 10, textAlign: 'center' },
  headerBlue: { color: '#FFFFFF' },
  headerOrange: { color: '#B8A8E6' },
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
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 2,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  metricEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  dominantMoodContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  dominantMoodCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dominantMoodEmoji: {
    fontSize: 48,
  },
  dominantMoodLabel: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  dominantMoodCount: {
    fontSize: 16,
  },
  distributionList: {
    gap: 16,
  },
  distributionItem: {
    gap: 8,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distributionMoodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distributionEmoji: {
    fontSize: 24,
  },
  distributionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  distributionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  distributionBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    borderRadius: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: 20,
  },
  trendBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  trendBarFill: {
    width: '100%',
    minHeight: 40,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 6,
  },
  trendValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  trendLabel: {
    fontSize: 10,
    marginTop: 6,
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
    borderWidth: 2,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoEmoji: {
    fontSize: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  /* analyticsButton not used in simple header */
  bottomPadding: {
    height: 40,
  },
});
