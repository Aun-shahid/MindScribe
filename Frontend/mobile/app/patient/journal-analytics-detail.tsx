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
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import PatientService, { JournalAnalytics } from '../services/patient.service';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2; // 2 columns with padding

export default function JournalAnalyticsScreen() {
  const router = useRouter();
  const { themeStyle } = useTheme();
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
    if (!analytics) return 0;
    const longest = Number(analytics.longest_streak ?? 0);
    const current = Number(analytics.current_streak ?? 0);
    if (!Number.isFinite(longest) || longest === 0) return 0;
    return (current / longest) * 100;
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
      <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}> 
        <View style={[styles.statIconBubble, { backgroundColor: color }]}> 
          <Text style={styles.statIcon}>{icon}</Text>
        </View>
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
        <View style={styles.streakHeaderRow}>
          <View style={styles.streakLeft}>
            <View style={[styles.statIconBubble, { backgroundColor: '#FFF4EE' }]}>
              <Text style={{ fontSize: 18 }}>🔥</Text>
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.streakTitle}>Current Streak</Text>
              <Text style={styles.streakSubtitle}>Keep it going! 🔥</Text>
            </View>
          </View>

          <View style={styles.streakRight}>
            <Text style={styles.streakNumber}>{analytics.current_streak}</Text>
            <Text style={styles.streakDays}>days</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Progress to longest streak</Text>
          <Text style={styles.progressFraction}>{analytics.current_streak} / {analytics.longest_streak} days</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: animatedWidth,
                overflow: 'hidden',
                backgroundColor: 'transparent',
              },
            ]}
          >
            <LinearGradient
              colors={['#FF6A00', '#16A34A']}
              start={[0, 0]}
              end={[1, 0]}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>
      </View>
    );
  };

  const TagAnalytics = () => {
    const tags = (analytics && Array.isArray(analytics.common_tags)) ? analytics.common_tags : [];
    if (tags.length === 0) {
      return (
        <View style={styles.tagsContainer}>
          <Text style={styles.sectionTitle}>Most Common Tags</Text>
          <Text style={styles.mostCommonSubtitle}>Your frequent emotions</Text>
          <Text style={styles.emptyText}>No tags yet. Start tagging your entries!</Text>
        </View>
      );
    }

    const maxCount = Math.max(...tags.map(t => Number(t.count ?? 0)));

    const getTagGradient = (tag: string) => {
      const lower = tag.toLowerCase();
      if (lower.includes('stress') || lower.includes('stressed') || lower.includes('angry')) return ['#ff7a66', '#ffb199'];
      if (lower.includes('sad')) return ['#60a5fa', '#a5b4fc'];
      if (lower.includes('anx') || lower.includes('anxious')) return ['#ff9f43', '#ff7a18'];
      if (lower.includes('happy') || lower.includes('joy')) return ['#86efac', '#4ade80'];
      return ['#dbeafe', '#bfdbfe'];
    };

    const TagRow = ({ tagData, index }: { tagData: any; index: number }) => {
      const count = Number(tagData.count ?? 0);
      const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
      const widthAnim = new Animated.Value(0);

      useEffect(() => {
        Animated.timing(widthAnim, {
          toValue: percent,
          duration: 900,
          delay: index * 120,
          useNativeDriver: false,
        }).start();
      }, []);

      const animatedWidth = widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
      const gradient = getTagGradient(tagData.tag);

      return (
        <View style={styles.tagRow} key={tagData.tag + index}>
          <Text style={styles.rank}>#{index + 1}</Text>

          <View style={styles.tagInfo}>
            <Text style={styles.tagName}>{tagData.tag}</Text>
            <View style={styles.tagBarBackground}>
              <Animated.View style={[styles.tagBarFill, { width: animatedWidth, overflow: 'hidden' }]}>
                <LinearGradient colors={gradient} start={[0,0]} end={[1,0]} style={{ flex: 1 }} />
              </Animated.View>
            </View>
          </View>

          <View style={styles.entryPill}>
            <Text style={styles.entryPillText}>{count} {count === 1 ? 'entry' : 'entries'}</Text>
          </View>
        </View>
      );
    };

    return (
      <View style={styles.mostCommonCard}>
        <Text style={styles.mostCommonTitle}>Most Common Tags</Text>
        <Text style={styles.mostCommonSubtitle}>Your frequent emotions</Text>

        {tags.slice(0, 3).map((t, i) => (
          <TagRow tagData={t} index={i} key={t.tag + i} />
        ))}
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

  // If analytics hasn't loaded (null), show empty state. If analytics exists
  // but counts are zero, still render the analytics page so the stat cards
  // (showing 0) are visible per design.
  if (!analytics) {
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
        <View style={[styles.headerContainer, { backgroundColor: themeStyle.card }]}>
          <TouchableOpacity onPress={() => router.push('/patient/journal-list')} style={[styles.backBtnCircle, { borderColor: 'rgba(0,0,0,0.06)' }]}>
            <FontAwesome name="arrow-left" size={16} color={themeStyle.title} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: themeStyle.title }]}> 
            <Text style={styles.headerBlue}>Journal </Text>
            <Text style={styles.headerOrange}>Analytics</Text>
          </Text>

          {/* no right icon per design */}
        </View>
        {/* Debug info removed for production; re-enable if needed during development. */}

        {/* Stats Cards Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="📚"
            label="Total Entries"
            value={analytics.total_entries}
            color="#FEE8F2"
            delay={0}
          />
          <StatCard
            icon="📅"
            label="This Month"
            value={analytics.entries_this_month}
            color="#FFF2E6"
            delay={100}
          />

          <StatCard
            icon="⭐"
            label="Favorites"
            value={analytics.favorite_count}
            color="#FEF9C3"
            delay={200}
          />
          <StatCard
            icon="🏆"
            label="Longest Streak (days)"
            value={analytics.longest_streak}
            color="#E6FCFF"
            delay={300}
          />
        </View>
        {/* Streak visualization and tag analytics (were defined but not rendered) */}
        <StreakVisualization />
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
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    marginBottom: 12,
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
    marginBottom: 6,
    marginTop: 18,
    textAlign: 'center',
  },
  headerBlue: { color: '#524f85' },
  headerOrange: { color: '#FF9F6B' },
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
    paddingHorizontal: 24,
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: CARD_WIDTH,
    padding: 18,
    borderRadius: 18,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    backgroundColor: '#fff',
  },
  statIcon: {
    fontSize: 20,
    color: '#fff',
  },
  statValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'left',
  },
  statIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  streakContainer: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
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
  streakHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  streakRight: {
    alignItems: 'flex-end',
    width: 80,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#38384a',
  },
  streakSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  streakDays: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  progressFraction: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressPercentage: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  tagsContainer: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  tagText: {
    color: '#1e293b',
    fontWeight: '600',
  },
  tagCount: {
    fontSize: 12,
    color: '#475569',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  barLabel: {
    width: 90,
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    height: 10,
    borderRadius: 8,
    minWidth: 2,
  },
  barValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    minWidth: 36,
    textAlign: 'right',
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
  mostCommonCard: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  mostCommonTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#171717',
    marginBottom: 4,
  },
  mostCommonSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rank: {
    width: 28,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '700',
  },
  tagInfo: {
    flex: 1,
    marginRight: 12,
  },
  tagName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
    marginBottom: 8,
  },
  entryPill: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryPillText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '700',
  },
  tagBarBackground: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tagBarFill: {
    height: '100%',
    borderRadius: 8,
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
  debugBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#fff6f6',
    borderWidth: 1,
    borderColor: '#ffe4e6',
  },
  debugText: {
    fontSize: 12,
    color: '#7f1d1d',
    marginBottom: 4,
  },
});
