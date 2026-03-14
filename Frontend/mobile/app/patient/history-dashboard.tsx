import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';
import { router } from 'expo-router';
import TabLoaderCard from '../components/TabLoaderCard';

const { width } = Dimensions.get('window');

interface MoodEntry {
  id: string;
  mood: string;
  mood_score: number;
  created_at?: string;
}

interface JournalEntry {
  id: string;
  title: string;
  word_count: number;
  created_at?: string;
  tags?: string[];
}

interface ActivityEntry {
  id: string;
  activity_name: string;
  activity_type: string;
  duration_minutes: number;
  mood_impact?: string;
  created_at?: string;
}

interface DashboardStatistics {
  total_entries: {
    mood: number;
    journal: number;
    activities?: number;
  };
  mood_trend: number[];
  average_mood: number;
  streak_days: number;
  weekly_insights?: {
    most_productive_day?: string;
    favorite_activity?: string;
    mood_improvement?: number;
  };
}

interface DashboardData {
  recent_entries: {
    mood: MoodEntry[];
    journal: JournalEntry[];
    activities?: ActivityEntry[];
  };
  statistics: DashboardStatistics;
}

const moodEmojis: { [key: string]: string } = {
  'very_happy': '😊',
  'happy': '😄',
  'neutral': '😐',
  'sad': '😢',
  'very_sad': '😭',
  'anxious': '😰',
  'excited': '🤩',
  'calm': '😌',
  'angry': '😡',
  'content': '😊'
};

const getMoodEmoji = (mood: string, score?: number): string => {
  if (moodEmojis[mood]) {
    return moodEmojis[mood];
  }
  
  // Fallback based on score
  if (score) {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😢';
    return '😭';
  }
  
  return '😐';
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Recently';
  
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
      day: 'numeric'
    });
  }
};

const HistoryDashboard = () => {
  const { themeStyle } = useTheme();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/patients/dashboard/');
      
      // Ensure the response has the expected structure
      const data = response.data;
      if (data && data.recent_entries && data.statistics) {
        setDashboardData(data);
      } else {
        console.warn('⚠️ Invalid dashboard data structure:', data);
        // Set fallback data structure
        setDashboardData({
          recent_entries: {
            mood: [],
            journal: [],
            activities: []
          },
          statistics: {
            total_entries: { mood: 0, journal: 0, activities: 0 },
            mood_trend: [],
            average_mood: 0,
            streak_days: 0
          }
        });
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const renderMoodTrend = () => {
    if (!dashboardData?.statistics.mood_trend || dashboardData.statistics.mood_trend.length === 0) {
      return (
        <View style={styles.trendContainer}>
          <Text style={[styles.trendTitle, { color: themeStyle.text }]}>📈 Mood Trend (Last 7 Days)</Text>
          <View style={styles.noDataContainer}>
            <Text style={[styles.noDataText, { color: themeStyle.label }]}>
              No mood data available yet. Start tracking your mood to see trends!
            </Text>
          </View>
        </View>
      );
    }

    const trend = dashboardData.statistics.mood_trend;
    const maxValue = Math.max(...trend);
    const minValue = Math.min(...trend);
    const range = maxValue - minValue || 1; // Prevent division by zero

    return (
      <View style={styles.trendContainer}>
        <Text style={[styles.trendTitle, { color: themeStyle.text }]}>📈 Mood Trend (Last 7 Days)</Text>
        <View style={styles.chartContainer}>
          {trend.map((value, index) => {
            const height = ((value - minValue) / range) * 80 + 20;
            const color = value >= 7 ? '#10B981' : value >= 5 ? '#F59E0B' : '#EF4444';
            
            return (
              <View key={index} style={styles.chartBar}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: height, 
                      backgroundColor: color,
                      opacity: 0.8 
                    }
                  ]} 
                />
                <Text style={[styles.barLabel, { color: themeStyle.label }]}>
                  {value}
                </Text>
                <Text style={[styles.dayLabel, { color: themeStyle.label }]}>
                  Day {index + 1}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStatisticsCards = () => {
    if (!dashboardData?.statistics) return null;

    const stats = dashboardData.statistics;

    return (
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: themeStyle.background }]}>
          <Text style={styles.statEmoji}>📊</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {stats.total_entries.mood}
          </Text>
          <Text style={[styles.statLabel, { color: themeStyle.label }]}>
            Mood Entries
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: themeStyle.background }]}>
          <Text style={styles.statEmoji}>📝</Text>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>
            {stats.total_entries.journal}
          </Text>
          <Text style={[styles.statLabel, { color: themeStyle.label }]}>
            Journal Entries
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: themeStyle.background }]}>
          <Text style={styles.statEmoji}>😊</Text>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>
            {stats.average_mood.toFixed(1)}
          </Text>
          <Text style={[styles.statLabel, { color: themeStyle.label }]}>
            Avg Mood
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: themeStyle.background }]}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {stats.streak_days}
          </Text>
          <Text style={[styles.statLabel, { color: themeStyle.label }]}>
            Day Streak
          </Text>
        </View>
      </View>
    );
  };

  const renderRecentEntries = () => {
    if (!dashboardData?.recent_entries) return null;

    const { mood, journal, activities } = dashboardData.recent_entries;

    return (
      <View style={styles.recentSection}>
        <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>
          🕒 Recent Activity
        </Text>

        {/* Recent Moods */}
        {mood && Array.isArray(mood) && mood.length > 0 && (
          <View style={[styles.recentCard, { backgroundColor: themeStyle.background }]}>
            <Text style={[styles.recentCardTitle, { color: themeStyle.text }]}>
              😊 Recent Moods
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.moodList}>
                {mood.slice(0, 5).map((entry) => (
                  <View key={entry.id} style={[styles.moodItem, { backgroundColor: themeStyle.dashboardcard }]}>
                    <Text style={styles.moodEmoji}>
                      {getMoodEmoji(entry.mood, entry.mood_score)}
                    </Text>
                    <Text style={[styles.moodScore, { color: themeStyle.text }]}>
                      {entry.mood_score}/10
                    </Text>
                    <Text style={[styles.moodDate, { color: themeStyle.label }]}>
                      {formatDate(entry.created_at)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Recent Journal Entries */}
        {journal && Array.isArray(journal) && journal.length > 0 && (
          <View style={[styles.recentCard, { backgroundColor: themeStyle.background }]}>
            <Text style={[styles.recentCardTitle, { color: themeStyle.text }]}>
              📝 Recent Journal Entries
            </Text>
            {journal.slice(0, 3).map((entry) => (
              <TouchableOpacity 
                key={entry.id} 
                style={[styles.journalItem, { backgroundColor: themeStyle.dashboardcard }]}
                onPress={() => router.push('/patient/journal')}
              >
                <View style={styles.journalHeader}>
                  <Text style={[styles.journalTitle, { color: themeStyle.text }]} numberOfLines={1}>
                    📖 {entry.title}
                  </Text>
                  <Text style={[styles.journalDate, { color: themeStyle.label }]}>
                    {formatDate(entry.created_at)}
                  </Text>
                </View>
                <View style={styles.journalFooter}>
                  <Text style={[styles.wordCount, { color: themeStyle.label }]}>
                    {entry.word_count} words
                  </Text>
                  {entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0 && (
                    <View style={styles.tagContainer}>
                      {entry.tags.slice(0, 2).map((tag, index) => (
                        <Text key={index} style={[styles.tag, { backgroundColor: '#10B981' }]}>
                          {tag}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Activities */}
        {activities && Array.isArray(activities) && activities.length > 0 && (
          <View style={[styles.recentCard, { backgroundColor: themeStyle.background }]}>
            <Text style={[styles.recentCardTitle, { color: themeStyle.text }]}>
              🏃‍♂️ Recent Activities
            </Text>
            {activities.slice(0, 3).map((entry) => (
              <TouchableOpacity 
                key={entry.id} 
                style={[styles.activityItem, { backgroundColor: themeStyle.dashboardcard }]}
                onPress={() => router.push('/patient/activity-tracker')}
              >
                <View style={styles.activityHeader}>
                  <Text style={[styles.activityTitle, { color: themeStyle.text }]} numberOfLines={1}>
                    🏃‍♂️ {entry.activity_name}
                  </Text>
                  <Text style={[styles.activityDuration, { backgroundColor: '#10B981' }]}>
                    {entry.duration_minutes}min
                  </Text>
                </View>
                <View style={styles.activityFooter}>
                  <Text style={[styles.activityType, { color: themeStyle.label }]}>
                    {entry.activity_type}
                  </Text>
                  {entry.mood_impact && typeof entry.mood_impact === 'string' && (
                    <Text style={[
                      styles.moodImpact,
                      { 
                        color: entry.mood_impact.includes('+') ? '#10B981' : 
                               entry.mood_impact.includes('-') ? '#EF4444' : themeStyle.label
                      }
                    ]}>
                      {entry.mood_impact}
                    </Text>
                  )}
                  <Text style={[styles.activityDate, { color: themeStyle.label }]}>
                    {formatDate(entry.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderInsights = () => {
    if (!dashboardData?.statistics.weekly_insights) return null;

    const insights = dashboardData.statistics.weekly_insights;

    return (
      <View style={[styles.insightsCard, { backgroundColor: themeStyle.background }]}>
        <Text style={[styles.insightsTitle, { color: themeStyle.text }]}>
          💡 Weekly Insights
        </Text>
        
        {insights.most_productive_day && (
          <View style={styles.insightItem}>
            <Text style={styles.insightEmoji}>📅</Text>
            <Text style={[styles.insightText, { color: themeStyle.text }]}>
              Most active on <Text style={{ fontWeight: 'bold' }}>{insights.most_productive_day}</Text>
            </Text>
          </View>
        )}

        {insights.favorite_activity && (
          <View style={styles.insightItem}>
            <Text style={styles.insightEmoji}>❤️</Text>
            <Text style={[styles.insightText, { color: themeStyle.text }]}>
              Favorite activity: <Text style={{ fontWeight: 'bold' }}>{insights.favorite_activity}</Text>
            </Text>
          </View>
        )}

        {insights.mood_improvement !== undefined && (
          <View style={styles.insightItem}>
            <Text style={styles.insightEmoji}>📈</Text>
            <Text style={[styles.insightText, { color: themeStyle.text }]}>
              Mood improved by <Text style={{ fontWeight: 'bold', color: '#10B981' }}>
                {insights.mood_improvement > 0 ? '+' : ''}{insights.mood_improvement}%
              </Text> this week
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={[styles.header, { backgroundColor: '#10B981' }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>History Dashboard</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.loadingContainer}>
          <TabLoaderCard spinnerColor="#A78BFA" icon="brain" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={[styles.header, { backgroundColor: '#10B981' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History Dashboard</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <Text style={[styles.refreshText, { opacity: refreshing ? 0.5 : 1 }]}>
            {refreshing ? '⟳' : '↻'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={[styles.welcomeCard, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.welcomeTitle, { color: themeStyle.text }]}>
            Welcome to Your Dashboard! 👋
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: themeStyle.label }]}>
            Here's a comprehensive overview of your mental health journey
          </Text>
        </View>

        {/* Statistics Cards */}
        {renderStatisticsCards()}

        {/* Mood Trend Chart */}
        {renderMoodTrend()}

        {/* Weekly Insights */}
        {renderInsights()}

        {/* Recent Entries */}
        {renderRecentEntries()}

        {/* Quick Actions */}
        <View style={[styles.quickActionsCard, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.quickActionsTitle, { color: themeStyle.text }]}>
            🚀 Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: '#10B981' }]}
              onPress={() => router.push('/patient/journal')}
            >
              <Text style={styles.quickActionEmoji}>📝</Text>
              <Text style={styles.quickActionText}>New Journal</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => router.push('/patient/activity-tracker')}
            >
              <Text style={styles.quickActionEmoji}>🏃‍♂️</Text>
              <Text style={styles.quickActionText}>Log Activity</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => router.push('/patient/mood-tracker')}
            >
              <Text style={styles.quickActionEmoji}>😊</Text>
              <Text style={styles.quickActionText}>Track Mood</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HistoryDashboard;

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
  refreshText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Welcome Section
  welcomeCard: {
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
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Statistics Section
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 44) / 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Mood Trend Section
  trendContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 10,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    borderRadius: 10,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  noDataContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Section Titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  // Recent Entries Section
  recentSection: {
    marginBottom: 20,
  },
  recentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recentCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  // Mood Items
  moodList: {
    flexDirection: 'row',
    gap: 12,
  },
  moodItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  moodScore: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  moodDate: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Journal Items
  journalItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  journalTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  journalDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  journalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  tag: {
    fontSize: 10,
    color: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '500',
  },

  // Activity Items
  activityItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  activityDuration: {
    fontSize: 11,
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: '600',
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  activityType: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  moodImpact: {
    fontSize: 11,
    fontWeight: '600',
  },
  activityDate: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Insights Section
  insightsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightEmoji: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  insightText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  // Quick Actions Section
  quickActionsCard: {
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
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionEmoji: {
    fontSize: 20,
    marginBottom: 6,
  },
  quickActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  bottomSpacer: {
    height: 40,
  },
});
