import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
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

  const dayOptions = [7, 14, 30, 60, 90];

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
            onPress={() => router.back()}
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
    <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backButton, { color: themeStyle.text }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeStyle.title }]}>
            😊 Mood Analytics
          </Text>
        </View>

        {/* Time Period Selector */}
        <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Time Period</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.periodButtons}>
              {dayOptions.map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.periodButton,
                    {
                      backgroundColor:
                        selectedDays === days ? themeStyle.progressbarmain : themeStyle.background,
                      borderColor: selectedDays === days ? themeStyle.progressbarmain : themeStyle.border,
                    },
                  ]}
                  onPress={() => setSelectedDays(days)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      {
                        color: selectedDays === days ? themeStyle.lighttext : themeStyle.text,
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
        <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricBox, { backgroundColor: themeStyle.background }]}>
              <Text style={styles.metricEmoji}>📊</Text>
              <Text style={[styles.metricValue, { color: themeStyle.text }]}>
                {totalEntries}
              </Text>
              <Text style={[styles.metricLabel, { color: themeStyle.label }]}>Total Entries</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: themeStyle.background }]}>
              <Text style={styles.metricEmoji}>⭐</Text>
              <Text style={[styles.metricValue, { color: themeStyle.text }]}>
                {analytics.average_intensity.toFixed(1)}
              </Text>
              <Text style={[styles.metricLabel, { color: themeStyle.label }]}>
                Avg Intensity
              </Text>
            </View>
          </View>
        </View>

        {/* Most Common Mood */}
        {analytics.most_common_mood && (
          <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
              Most Common Mood
            </Text>
            <View style={styles.dominantMoodContainer}>
              <View
                style={[
                  styles.dominantMoodCircle,
                  { backgroundColor: themeStyle.progressbarside },
                ]}
              >
                <Text style={styles.dominantMoodEmoji}>
                  {getMoodEmoji(analytics.most_common_mood)}
                </Text>
              </View>
              <Text style={[styles.dominantMoodLabel, { color: themeStyle.text }]}>
                {getMoodLabel(analytics.most_common_mood)}
              </Text>
              <Text style={[styles.dominantMoodCount, { color: themeStyle.label }]}>
                {analytics.mood_distribution[analytics.most_common_mood]} times
              </Text>
            </View>
          </View>
        )}

        {/* Mood Distribution */}
        {Object.keys(analytics.mood_distribution).length > 0 && (
          <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
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
                          <Text style={[styles.distributionLabel, { color: themeStyle.text }]}>
                            {getMoodLabel(mood)}
                          </Text>
                        </View>
                        <Text style={[styles.distributionCount, { color: themeStyle.text }]}>
                          {count} ({percentage.toFixed(0)}%)
                        </Text>
                      </View>
                      <View
                        style={[styles.distributionBarBackground, { backgroundColor: themeStyle.background }]}
                      >
                        <View
                          style={[
                            styles.distributionBar,
                            {
                              width: `${percentage}%`,
                              backgroundColor: themeStyle.progressbarmain,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        )}

        {/* Weekly Trend */}
        {analytics.weekly_trend.length > 0 && (
          <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
              Weekly Intensity Trend
            </Text>
            <View style={styles.trendContainer}>
              {analytics.weekly_trend.map((day, index) => {
                const maxIntensity = Math.max(
                  ...analytics.weekly_trend.map((d) => d.average_intensity)
                );
                const heightPercentage =
                  maxIntensity > 0 ? (day.average_intensity / maxIntensity) * 100 : 0;
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <View key={index} style={styles.trendBar}>
                    <View
                      style={[
                        styles.trendBarFill,
                        {
                          height: `${heightPercentage}%`,
                          backgroundColor: getIntensityColor(day.average_intensity),
                        },
                      ]}
                    >
                      <Text style={styles.trendValue}>{day.average_intensity.toFixed(1)}</Text>
                    </View>
                    <Text style={[styles.trendLabel, { color: themeStyle.label }]}>
                      {dayName}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Common Triggers */}
        {analytics.common_triggers.length > 0 && (
          <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
              🎯 Common Triggers
            </Text>
            <View style={styles.triggersContainer}>
              {analytics.common_triggers.map((trigger, index) => (
                <View
                  key={index}
                  style={[
                    styles.triggerChip,
                    {
                      backgroundColor: themeStyle.progressbarside,
                      borderColor: themeStyle.progressbarmain,
                    },
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

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: themeStyle.progressbarside }]}>
          <Text style={styles.infoEmoji}>💡</Text>
          <Text style={[styles.infoText, { color: themeStyle.darktext }]}>
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  periodButtonText: {
    fontSize: 14,
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
  bottomPadding: {
    height: 40,
  },
});
