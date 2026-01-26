import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import PatientService, { JournalAnalytics } from '../services/patient.service';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2; // 2 columns with padding

export default function JournalAnalyticsScreen() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<JournalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (analytics) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [analytics]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PatientService.getJournalAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.response?.data?.detail || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getStreakPercentage = () => {
    if (!analytics || analytics.longest_streak === 0) return 0;
    return (analytics.current_streak / analytics.longest_streak) * 100;
  };

  const StatCard = ({ 
    icon, 
    label, 
    value, 
    color,
    delay = 0,
  }: { 
    icon: string; 
    label: string; 
    value: number; 
    color: string;
    delay?: number;
  }) => {
    const scaleAnim = new Animated.Value(0);

    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }, []);

    return (
      <Animated.View style={[
        styles.statCard,
        { 
          backgroundColor: color,
          transform: [{ scale: scaleAnim }],
        }
      ]}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </Animated.View>
    );
  };

  const StreakVisualization = () => {
    if (!analytics) return null;

    const percentage = getStreakPercentage();
    const progressAnim = new Animated.Value(0);

    useEffect(() => {
      Animated.timing(progressAnim, {
        toValue: percentage,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }, [percentage]);

    const animatedWidth = progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.streakContainer}>
        <Text style={styles.sectionTitle}>📊 Streak Progress</Text>
        
        <View style={styles.streakInfo}>
          <View style={styles.streakInfoItem}>
            <Text style={styles.streakLabel}>Current Streak</Text>
            <Text style={styles.streakValue}>{analytics.current_streak} days</Text>
          </View>
          <View style={styles.streakInfoItem}>
            <Text style={styles.streakLabel}>Longest Streak</Text>
            <Text style={styles.streakValue}>{analytics.longest_streak} days</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <Animated.View 
            style={[
              styles.progressBarFill,
              { 
                width: animatedWidth,
                backgroundColor: percentage >= 80 ? '#4ade80' : percentage >= 50 ? '#fbbf24' : '#f87171',
              }
            ]} 
          />
        </View>
        <Text style={styles.progressPercentage}>
          {percentage.toFixed(0)}% of your longest streak
        </Text>
      </View>
    );
  };

  const TagAnalytics = () => {
    if (!analytics || analytics.common_tags.length === 0) {
      return (
        <View style={styles.tagsContainer}>
          <Text style={styles.sectionTitle}>🏷️ Common Tags</Text>
          <Text style={styles.emptyText}>No tags yet. Start tagging your entries!</Text>
        </View>
      );
    }

    const maxCount = Math.max(...analytics.common_tags.map(t => t.count));

    const getTagColor = (tag: string) => {
      const lowerTag = tag.toLowerCase();
      
      // Positive emotions - green shades
      if (['happy', 'joy', 'grateful', 'excited', 'hopeful', 'peaceful', 'love', 'proud', 'motivated'].some(word => lowerTag.includes(word))) {
        return '#86efac';
      }
      
      // Negative emotions - red shades
      if (['sad', 'angry', 'anxious', 'stressed', 'worried', 'frustrated', 'depressed', 'fear', 'upset'].some(word => lowerTag.includes(word))) {
        return '#fca5a5';
      }
      
      // Neutral - yellow/blue shades
      return '#bfdbfe';
    };

    return (
      <View style={styles.tagsContainer}>
        <Text style={styles.sectionTitle}>🏷️ Common Tags</Text>
        
        {/* Tag Cloud View */}
        <View style={styles.tagCloud}>
          {analytics.common_tags.map((tagData, index) => {
            const fontSize = 14 + (tagData.count / maxCount) * 12;
            const delay = index * 100;
            const scaleAnim = new Animated.Value(0);

            useEffect(() => {
              Animated.spring(scaleAnim, {
                toValue: 1,
                delay,
                useNativeDriver: true,
              }).start();
            }, []);

            return (
              <Animated.View 
                key={index}
                style={[
                  styles.tagBubble,
                  { 
                    backgroundColor: getTagColor(tagData.tag),
                    transform: [{ scale: scaleAnim }],
                  }
                ]}
              >
                <Text style={[styles.tagText, { fontSize }]}>
                  {tagData.tag}
                </Text>
                <Text style={styles.tagCount}>({tagData.count})</Text>
              </Animated.View>
            );
          })}
        </View>

        {/* Bar Chart View */}
        <View style={styles.barChart}>
          {analytics.common_tags.slice(0, 5).map((tagData, index) => {
            const barWidth = (tagData.count / maxCount) * 100;
            const widthAnim = new Animated.Value(0);

            useEffect(() => {
              Animated.timing(widthAnim, {
                toValue: barWidth,
                duration: 800,
                delay: index * 100,
                useNativeDriver: false,
              }).start();
            }, []);

            const animatedBarWidth = widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            });

            return (
              <View key={index} style={styles.barRow}>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {tagData.tag}
                </Text>
                <View style={styles.barContainer}>
                  <Animated.View 
                    style={[
                      styles.bar,
                      { 
                        width: animatedBarWidth,
                        backgroundColor: getTagColor(tagData.tag),
                      }
                    ]}
                  />
                  <Text style={styles.barValue}>{tagData.count}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>📊</Text>
        <Text style={styles.errorText}>No analytics available yet</Text>
        <Text style={styles.errorSubtext}>Start journaling to see your insights!</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadAnalytics}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!analytics || analytics.total_entries === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>No analytics available yet</Text>
        <Text style={styles.emptySubtext}>
          Start writing journal entries to track your progress!
        </Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push('/patient/create-journal')}
        >
          <Text style={styles.createButtonText}>Write First Entry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Journal Analytics</Text>
          <Text style={styles.subtitle}>Track your journaling journey</Text>
        </View>

        {/* Stats Cards Grid */}
        <View style={styles.statsGrid}>
          <StatCard 
            icon="📚" 
            label="Total Entries" 
            value={analytics.total_entries} 
            color="#dbeafe"
            delay={0}
          />
          <StatCard 
            icon="📅" 
            label="This Month" 
            value={analytics.entries_this_month} 
            color="#e9d5ff"
            delay={100}
          />
          <StatCard 
            icon="🔥" 
            label="Current Streak" 
            value={analytics.current_streak} 
            color="#fed7aa"
            delay={200}
          />
          <StatCard 
            icon="🏆" 
            label="Longest Streak" 
            value={analytics.longest_streak} 
            color="#fecaca"
            delay={300}
          />
          <StatCard 
            icon="⭐" 
            label="Favorites" 
            value={analytics.favorite_count} 
            color="#fef08a"
            delay={400}
          />
        </View>

        {/* Streak Visualization */}
        <StreakVisualization />

        {/* Tag Analytics */}
        <TagAnalytics />

        {/* Footer Spacing */}
        <View style={{ height: 40 }} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: CARD_WIDTH,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  streakContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  streakInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  streakInfoItem: {
    alignItems: 'center',
  },
  streakLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  progressPercentage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  tagsContainer: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  tagBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  tagText: {
    color: '#1e293b',
    fontWeight: '600',
  },
  tagCount: {
    fontSize: 12,
    color: '#475569',
  },
  barChart: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    width: 80,
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    height: 24,
    borderRadius: 4,
    minWidth: 2,
  },
  barValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    minWidth: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
