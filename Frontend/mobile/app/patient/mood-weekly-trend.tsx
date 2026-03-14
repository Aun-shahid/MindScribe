import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';
import TabLoaderCard from '../components/TabLoaderCard';

const { width } = Dimensions.get('window');
const BAR_WIDTH = (width - 80) / 7;
const SCREEN_PURPLE = '#342949';

interface DayMoodData {
  day: string;
  date: string;
  mood: string | null;
  mood_label: string;
  intensity: number;
  avg_intensity: number;
  all_moods: string[];
  entry_count: number;
  triggers: string[];
  mood_breakdown?: Record<string, { avg_intensity: number; frequency: number }>;
}

interface WeeklyTrendData {
  weekly_moods: DayMoodData[];
  pattern_insight: string;
}

const MOOD_COLORS: Record<string, string> = {
  happy: '#FFD700',
  sad: '#6B8CFF',
  angry: '#FF6B6B',
  anxious: '#FFA500',
  peaceful: '#87CEEB',
  excited: '#FF69B4',
  grateful: '#98FB98',
  overwhelmed: '#DDA0DD',
  hopeful: '#FFE4B5',
  stressed: '#FF8C00',
};

const MOOD_EMOJIS: Record<string, string> = {
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

export default function MoodWeeklyTrend() {
  const { themeStyle } = useTheme();
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<WeeklyTrendData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeeklyTrend();
  }, []);

  // Refresh when screen comes into focus (after edit/delete from mood detail page)
  useFocusEffect(
    React.useCallback(() => {
      loadWeeklyTrend();
    }, [])
  );

  const loadWeeklyTrend = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<WeeklyTrendData>('/patients/mood/weekly-trend/');
      setTrendData(response.data);
    } catch (err: any) {
      console.error('[Weekly Trend] Error:', err);
      setError(err.response?.data?.detail || 'Failed to load weekly trend');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: SCREEN_PURPLE }]}>
        <TabLoaderCard spinnerColor={themeStyle.button} icon="brain" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: SCREEN_PURPLE }]}>
        <Text style={[styles.errorText, { color: themeStyle.error }]}>❌ {error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: themeStyle.button }]}
          onPress={loadWeeklyTrend}
        >
          <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!trendData) {
    return null;
  }

  const maxIntensity = Math.max(
    ...trendData.weekly_moods.map((d) => d.intensity || 1),
    5
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: SCREEN_PURPLE }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: themeStyle.button }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeStyle.title }]}>Weekly Mood Trend</Text>
        <Text style={[styles.subtitle, { color: themeStyle.label }]}>
          Your mood patterns this week
        </Text>
      </View>

      {/* Pattern Insight Card */}
      <View style={[styles.insightCard, { backgroundColor: themeStyle.card, borderColor: themeStyle.border }]}>
        <Text style={[styles.insightTitle, { color: themeStyle.title }]}>💡 Pattern Insight</Text>
        <Text style={[styles.insightText, { color: themeStyle.text }]}>
          {trendData.pattern_insight}
        </Text>
      </View>

      {/* How it Works Info */}
      <View style={[styles.infoCard, { backgroundColor: themeStyle.card, borderColor: themeStyle.border }]}>
        <Text style={[styles.infoTitle, { color: themeStyle.title }]}>📊 How Dominant Mood is Calculated</Text>
        <Text style={[styles.infoText, { color: themeStyle.text }]}>
          When you log multiple moods in a day, the system calculates your <Text style={{ fontWeight: '600' }}>dominant mood</Text> using:
        </Text>
        <Text style={[styles.infoFormula, { color: themeStyle.text }]}>
          • <Text style={{ fontWeight: '700' }}>Weighted Score</Text> = Intensity × Frequency
        </Text>
        <Text style={[styles.infoExample, { color: themeStyle.label }]}>
          Example: If you logged "Happy" 3 times at intensity 4, and "Stressed" 2 times at intensity 5, 
          Happy wins with score 12 vs Stressed with score 10.
        </Text>
      </View>

      {/* Weekly Mood Graph */}
      <View style={[styles.graphCard, { backgroundColor: themeStyle.card, borderColor: themeStyle.border }]}>
        <Text style={[styles.graphTitle, { color: themeStyle.title }]}>This Week's Mood</Text>
        
        <View style={styles.graphContainer}>
          {/* Y-axis labels */}
          <View style={styles.yAxisLabels}>
            {[5, 4, 3, 2, 1, 0].map((level) => (
              <Text key={level} style={[styles.yAxisLabel, { color: themeStyle.label }]}>
                {level}
              </Text>
            ))}
          </View>

          {/* Bar Chart */}
          <View style={styles.barsContainer}>
            {/* Grid lines */}
            <View style={styles.gridLines}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.gridLine,
                    { backgroundColor: themeStyle.border, opacity: 0.3 },
                  ]}
                />
              ))}
            </View>

            {/* Bars */}
            <View style={styles.bars}>
              {trendData.weekly_moods.map((dayData, index) => {
                const barHeight = (dayData.intensity / maxIntensity) * 150;
                const moodColor = dayData.mood
                  ? MOOD_COLORS[dayData.mood] || themeStyle.button
                  : themeStyle.border;
                const emoji = dayData.mood ? MOOD_EMOJIS[dayData.mood] || '😐' : '—';

                return (
                  <View key={index} style={styles.barContainer}>
                    {/* Emoji above bar */}
                    {dayData.mood && (
                      <Text style={styles.barEmoji}>{emoji}</Text>
                    )}
                    
                    {/* Bar */}
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(barHeight, dayData.mood ? 10 : 0),
                          backgroundColor: moodColor,
                          opacity: dayData.mood ? 1 : 0.3,
                        },
                      ]}
                    >
                      {dayData.intensity > 0 && (
                        <Text style={styles.intensityLabel}>{dayData.intensity}</Text>
                      )}
                    </View>

                    {/* Day label */}
                    <Text
                      style={[
                        styles.dayLabel,
                        { color: dayData.mood ? themeStyle.text : themeStyle.label },
                      ]}
                    >
                      {dayData.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Daily Breakdown */}
      <View style={[styles.breakdownCard, { backgroundColor: themeStyle.card, borderColor: themeStyle.border }]}>
        <Text style={[styles.breakdownTitle, { color: themeStyle.title }]}>Daily Breakdown</Text>
        
        {trendData.weekly_moods.map((dayData, index) => (
          <View
            key={index}
            style={[
              styles.dayRow,
              { borderBottomColor: themeStyle.border },
              index === trendData.weekly_moods.length - 1 && styles.lastDayRow,
            ]}
          >
            <View style={styles.dayInfo}>
              <Text style={[styles.dayName, { color: themeStyle.text }]}>
                {dayData.day}
              </Text>
              <Text style={[styles.dayDate, { color: themeStyle.label }]}>
                {new Date(dayData.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>

            {dayData.mood ? (
              <View style={styles.dayMoodInfo}>
                <View style={styles.moodLabelContainer}>
                  <Text style={styles.moodEmoji}>
                    {MOOD_EMOJIS[dayData.mood] || '😐'}
                  </Text>
                  <Text style={[styles.moodLabel, { color: themeStyle.text }]}>
                    {dayData.mood_label}
                  </Text>
                </View>
                <Text style={[styles.intensityText, { color: themeStyle.label }]}>
                  Intensity: {dayData.intensity}/5
                </Text>
                {dayData.entry_count > 1 && (
                  <Text style={[styles.entryCount, { color: themeStyle.label }]}>
                    {dayData.entry_count} entries
                  </Text>
                )}
                {dayData.triggers.length > 0 && (
                  <Text style={[styles.triggersText, { color: themeStyle.label }]} numberOfLines={1}>
                    Triggers: {dayData.triggers.join(', ')}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={[styles.noEntryText, { color: themeStyle.label }]}>
                No entry
              </Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  insightCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  infoFormula: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    marginLeft: 8,
  },
  infoExample: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    marginLeft: 8,
    marginTop: 4,
  },
  graphCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  graphTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  graphContainer: {
    flexDirection: 'row',
  },
  yAxisLabels: {
    width: 24,
    justifyContent: 'space-between',
    height: 170,
    paddingVertical: 10,
  },
  yAxisLabel: {
    fontSize: 12,
    textAlign: 'right',
  },
  barsContainer: {
    flex: 1,
    marginLeft: 8,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    height: 150,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    width: '100%',
  },
  bars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 170,
    paddingBottom: 20,
  },
  barContainer: {
    width: BAR_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  bar: {
    width: BAR_WIDTH - 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 0,
  },
  intensityLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dayLabel: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  breakdownCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  lastDayRow: {
    borderBottomWidth: 0,
  },
  dayInfo: {
    flex: 0,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayDate: {
    fontSize: 13,
    marginTop: 2,
  },
  dayMoodInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  moodLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  intensityText: {
    fontSize: 13,
  },
  entryCount: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  triggersText: {
    fontSize: 12,
    marginTop: 2,
    maxWidth: 200,
  },
  noEntryText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
