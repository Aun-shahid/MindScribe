import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import PatientService, { JournalAnalytics } from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import OriginalHeader from '../components/OriginalHeader';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2; // 2 columns with padding

export default function JournalAnalyticsScreen() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<JournalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Scroll animation for sticky header
  const scrollY = useRef(new Animated.Value(0)).current;

  // Floating bubble animations
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
    // Animate bubbles
    const createFloatingAnimation = (
      animValueY: Animated.Value,
      animValueX: Animated.Value,
      durationY: number,
      durationX: number,
      delayY: number = 0,
      delayX: number = 0
    ) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayY),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(animValueY, {
                toValue: 50,
                duration: durationY,
                useNativeDriver: true,
              }),
              Animated.timing(animValueY, {
                toValue: -50,
                duration: durationY,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.delay(delayX),
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
            ]),
          ]),
        ])
      ).start();
    };

    createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000, 0, 500);
    createFloatingAnimation(bubble2Y, bubble2X, 9000, 8500, 1000, 1500);
    createFloatingAnimation(bubble3Y, bubble3X, 7500, 8000, 2000, 2500);
    createFloatingAnimation(bubble4Y, bubble4X, 10000, 9500, 1500, 1000);
    createFloatingAnimation(bubble5Y, bubble5X, 8500, 7500, 500, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (analytics) {
      console.log('🎬 Starting fade-in animation');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        console.log('✨ Fade-in animation complete');
      });
    }
  }, [analytics, fadeAnim]);

  const loadAnalytics = async () => {
    try {
      console.log('🔍 Loading journal analytics...');
      setLoading(true);
      setError(null);
      const data = await PatientService.getJournalAnalytics();
      console.log('✅ Analytics data received:', JSON.stringify(data, null, 2));
      
      if (!data) {
        console.warn('⚠️ Analytics data is null/undefined');
        setError('No data returned from server');
      } else {
        setAnalytics(data);
        console.log('✅ Analytics state updated successfully');
      }
    } catch (err: any) {
      console.error('❌ Error loading analytics:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.detail || err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      console.log('🏁 Loading complete');
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
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }, [delay, scaleAnim]);

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
    const percentage = getStreakPercentage();
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (analytics) {
        Animated.timing(progressAnim, {
          toValue: percentage,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }
    }, [percentage, progressAnim]);

    if (!analytics) return null;

    const animatedWidth = progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.streakContainer}>
        <View style={styles.streakHeaderRow}>
          <View style={styles.streakLeft}>
            <View style={[styles.statIconBubble, { backgroundColor: '#FFB36B' }]}>
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

    const getTagGradient = (tag: string): [string, string] => {
      const lower = tag.toLowerCase();
      if (lower.includes('stress') || lower.includes('stressed') || lower.includes('angry')) return ['#FFB36B', '#FFD9B3'];
      if (lower.includes('sad')) return ['#A78BFA', '#C4B5FD'];
      if (lower.includes('anx') || lower.includes('anxious')) return ['#FFB36B', '#FFC98E'];
      if (lower.includes('happy') || lower.includes('joy')) return ['#86efac', '#4ade80'];
      return ['#B8A8E6', '#D4C9F0'];
    };

    const TagRow = ({ tagData, index }: { tagData: any; index: number }) => {
      const count = Number(tagData.count ?? 0);
      const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
      const widthAnim = useRef(new Animated.Value(0)).current;

      useEffect(() => {
        Animated.timing(widthAnim, {
          toValue: percent,
          duration: 900,
          delay: index * 120,
          useNativeDriver: false,
        }).start();
      }, [index, percent, widthAnim]);

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
    console.log('⏳ Rendering loading state');
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFB36B" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (error) {
    console.log('❌ Rendering error state:', error);
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>📊</Text>
        <Text style={styles.errorText}>Unable to load analytics</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
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
    console.log('📭 Rendering empty state (analytics is null)');
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

  console.log('🎨 Rendering analytics content with data:', {
    total_entries: analytics.total_entries,
    entries_this_month: analytics.entries_this_month,
    favorite_count: analytics.favorite_count,
    current_streak: analytics.current_streak,
    longest_streak: analytics.longest_streak,
    tags_count: analytics.common_tags?.length || 0
  });

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient colors={['#342949', '#2a1f3d', '#342949']} style={styles.screenGradient} />
      
      {/* Floating bubbles */}
      <Animated.View
        style={[
          styles.bubble,
          {
            top: '10%',
            left: '-10%',
            width: 180,
            height: 180,
            transform: [{ translateY: bubble1Y }, { translateX: bubble1X }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bubble,
          {
            top: '30%',
            right: '-15%',
            width: 200,
            height: 200,
            transform: [{ translateY: bubble2Y }, { translateX: bubble2X }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bubble,
          {
            top: '55%',
            left: '-20%',
            width: 220,
            height: 220,
            transform: [{ translateY: bubble3Y }, { translateX: bubble3X }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bubble,
          {
            top: '75%',
            right: '-10%',
            width: 170,
            height: 170,
            transform: [{ translateY: bubble4Y }, { translateX: bubble4X }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bubble,
          {
            bottom: '5%',
            left: '15%',
            width: 160,
            height: 160,
            transform: [{ translateY: bubble5Y }, { translateX: bubble5X }],
          },
        ]}
      />

      {/* Sticky Header - Appears on scroll */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Journal"
        secondWord="Analytics"
        onBackPress={() => router.back()}
      />

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 40 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Original Header */}
          <OriginalHeader
            scrollY={scrollY}
            firstWord="Journal"
            secondWord="Analytics"
            onBackPress={() => router.back()}
          />
          {/* Debug info removed for production; re-enable if needed during development. */}

          {/* Stats Cards Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="📚"
              label="Total Entries"
              value={analytics.total_entries}
              color="#FFB36B"
              delay={0}
            />
            <StatCard
              icon="📅"
              label="This Month"
              value={analytics.entries_this_month}
              color="#A78BFA"
              delay={100}
            />
            <StatCard
              icon="⭐"
              label="Favorites"
              value={analytics.favorite_count}
              color="#B8A8E6"
              delay={200}
            />
            <StatCard
              icon="🏆"
              label="Longest Streak (days)"
              value={analytics.longest_streak}
              color="#FFD9B3"
              delay={300}
            />
          </View>
        {/* Streak visualization and tag analytics (were defined but not rendered) */}
        <StreakVisualization />
        <TagAnalytics />

        {/* Footer Spacing */}
        <View style={{ height: 40 }} />
      </Animated.View>
    </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#342949',
  },
  screenGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(133, 130, 180, 0.15)',
  },
  headerContainer: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#342949',
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
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 18,
    textAlign: 'center',
  },
  headerBlue: { color: '#FFFFFF' },
  headerOrange: { color: '#B8A8E6' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#342949',
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#B8A8E6',
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
    backgroundColor: '#473F5A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statIcon: {
    fontSize: 20,
    color: '#fff',
  },
  statValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#B8A8E6',
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
    backgroundColor: '#473F5A',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#B8A8E6',
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },
  streakSubtitle: {
    fontSize: 13,
    color: '#B8A8E6',
    marginTop: 4,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFB36B',
  },
  streakDays: {
    fontSize: 12,
    color: '#B8A8E6',
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
    color: '#B8A8E6',
  },
  progressFraction: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 14,
    backgroundColor: '#5B5270',
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
    color: '#B8A8E6',
    textAlign: 'center',
  },
  tagsContainer: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 18,
    backgroundColor: '#473F5A',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tagCount: {
    fontSize: 12,
    color: '#B8A8E6',
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
    color: '#B8A8E6',
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
    color: '#FFFFFF',
    minWidth: 36,
    textAlign: 'right',
  },
  barChart: {
    gap: 12,
  },
  mostCommonCard: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 18,
    backgroundColor: '#473F5A',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mostCommonTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  mostCommonSubtitle: {
    fontSize: 13,
    color: '#B8A8E6',
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
    color: '#B8A8E6',
    fontWeight: '700',
  },
  tagInfo: {
    flex: 1,
    marginRight: 12,
  },
  tagName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 8,
  },
  entryPill: {
    backgroundColor: '#5B5270',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryPillText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tagBarBackground: {
    height: 10,
    backgroundColor: '#5B5270',
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
    color: '#B8A8E6',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#B8A8E6',
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
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#B8A8E6',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#B8A8E6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: '#A78BFA',
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
    backgroundColor: '#A78BFA',
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
    backgroundColor: '#473F5A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  debugText: {
    fontSize: 12,
    color: '#B8A8E6',
    marginBottom: 4,
  },
});
