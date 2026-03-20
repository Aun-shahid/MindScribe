import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService, { JournalAnalytics } from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export default function JournalAnalyticsScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState<JournalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const scrollY = useRef(new Animated.Value(0)).current;

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

  const pageInset = clamp(width * 0.03, 12, 18);
  const sectionInset = clamp(width * 0.05, 16, 22);
  const headerTopPadding = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding = clamp(height * 0.02, 14, 22);
  const headerButtonSize = clamp(width * 0.098, 34, 40);
  const headerButtonRadius = headerButtonSize / 2;
  const headerIconSize = clamp(width * 0.047, 16, 20);
  const headerTitleSize = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop = clamp(height * 0.022, 14, 22);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;
  const contentTopGap = clamp(height * 0.022, 14, 20);
  const contentBottomGap = clamp(height * 0.05, 28, 40);

  const bubbleLarge = clamp(width * 0.62, 180, 240);
  const bubbleMedium = clamp(width * 0.56, 160, 220);
  const bubbleSmall = clamp(width * 0.48, 140, 190);
  const bubbleShiftY = clamp(height * 0.06, 28, 50);
  const bubbleShiftX = clamp(width * 0.08, 18, 30);

  const statsGap = clamp(width * 0.025, 8, 12);
  const cardWidth = (width - (sectionInset * 2) - statsGap) / 2;
  const statCardPadding = clamp(width * 0.042, 14, 18);
  const statCardRadius = clamp(width * 0.045, 14, 18);
  const iconBubbleSize = clamp(width * 0.11, 38, 44);
  const iconBubbleRadius = clamp(width * 0.03, 10, 12);
  const statIconSize = clamp(width * 0.052, 18, 20);
  const statValueSize = clamp(width * 0.077, 26, 30);
  const statLabelSize = clamp(width * 0.033, 12, 13);

  const sectionMarginTop = clamp(height * 0.015, 10, 12);
  const sectionPadding = clamp(width * 0.045, 16, 18);
  const sectionRadius = clamp(width * 0.04, 14, 16);
  const sectionTitleSize = clamp(width * 0.046, 16, 18);
  const sectionSubtitleSize = clamp(width * 0.033, 12, 13);
  const streakNumberSize = clamp(width * 0.072, 24, 28);
  const streakDaysSize = clamp(width * 0.031, 11, 12);
  const progressBarHeight = clamp(height * 0.018, 12, 14);
  const rankSize = clamp(width * 0.036, 13, 14);
  const tagNameSize = clamp(width * 0.041, 15, 16);
  const entryPillPaddingX = clamp(width * 0.026, 9, 10);
  const entryPillPaddingY = clamp(height * 0.008, 5, 6);
  const entryPillRadius = clamp(width * 0.03, 10, 12);
  const entryPillTextSize = clamp(width * 0.031, 11, 12);
  const tagBarHeight = clamp(height * 0.013, 9, 10);

  const stateIconSize = clamp(width * 0.18, 64, 80);
  const stateTitleSize = clamp(width * 0.056, 20, 22);
  const stateBodySize = clamp(width * 0.041, 14, 16);
  const stateButtonPaddingX = clamp(width * 0.08, 28, 32);
  const stateButtonPaddingY = clamp(height * 0.018, 12, 14);
  const stateButtonRadius = clamp(width * 0.03, 10, 12);
  const stateButtonTextSize = clamp(width * 0.041, 14, 16);

  // ── Navigation — always to journal-list ──────────────────────────────────
  const goBack = () => from === 'analytics'
    ? router.push('/patient/analytics')
    : router.push('/patient/journal-list');

  useEffect(() => {
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
              Animated.timing(animValueY, { toValue: bubbleShiftY, duration: durationY, useNativeDriver: true }),
              Animated.timing(animValueY, { toValue: -bubbleShiftY, duration: durationY, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.delay(delayX),
              Animated.timing(animValueX, { toValue: bubbleShiftX, duration: durationX, useNativeDriver: true }),
              Animated.timing(animValueX, { toValue: -bubbleShiftX, duration: durationX, useNativeDriver: true }),
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
  }, [bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y, bubble4X, bubble4Y, bubble5X, bubble5Y, bubbleShiftX, bubbleShiftY]);

  useEffect(() => { loadAnalytics(); }, []);

  useEffect(() => {
    if (analytics) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  }, [analytics, fadeAnim]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PatientService.getJournalAnalytics();
      if (!data) {
        setError('No data returned from server');
      } else {
        setAnalytics(data);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load analytics');
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
    icon, label, value, color, delay = 0,
  }: { icon: string; label: string; value: number; color: string; delay?: number }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.spring(scaleAnim, { toValue: 1, delay, useNativeDriver: true, tension: 50, friction: 7 }).start();
    }, [delay, scaleAnim]);

    return (
      <Animated.View style={[styles.statCard, { width: cardWidth, padding: statCardPadding, borderRadius: statCardRadius, transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={['rgba(255,179,107,0.14)', 'rgba(167,139,250,0.10)', 'rgba(52,41,73,0.92)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.cardSurfaceOverlay}
        />
        <View style={[styles.statIconBubble, { backgroundColor: color, width: iconBubbleSize, height: iconBubbleSize, borderRadius: iconBubbleRadius }]}>
          <Text style={[styles.statIcon, { fontSize: statIconSize }]}>{icon}</Text>
        </View>
        <Text style={[styles.statKicker, { fontSize: clamp(width * 0.027, 10, 11) }]}>{label.toUpperCase()}</Text>
        <Text style={[styles.statValue, { fontSize: statValueSize, marginTop: clamp(height * 0.014, 10, 12) }]}>{value}</Text>
        <Text style={[styles.statLabel, { fontSize: statLabelSize }]}>{label}</Text>
      </Animated.View>
    );
  };

  const StreakVisualization = () => {
    const percentage = getStreakPercentage();
    const progressAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      if (analytics) {
        Animated.timing(progressAnim, { toValue: percentage, duration: 1000, useNativeDriver: false }).start();
      }
    }, [percentage, progressAnim]);
    if (!analytics) return null;
    const animatedWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

    return (
      <View style={[styles.streakContainer, { marginHorizontal: sectionInset, marginTop: sectionMarginTop, padding: sectionPadding, borderRadius: sectionRadius }]}>
        <LinearGradient
          colors={['rgba(255,179,107,0.18)', 'rgba(167,139,250,0.12)', 'rgba(52,41,73,0.90)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.streakOverlay}
        />
        <View style={styles.streakHeaderRow}>
          <View style={styles.streakLeft}>
            <View style={[styles.statIconBubble, { backgroundColor: '#FFB36B', width: iconBubbleSize, height: iconBubbleSize, borderRadius: iconBubbleRadius }]}>
              <Text style={{ fontSize: statIconSize * 0.95 }}>🔥</Text>
            </View>
            <View style={{ marginLeft: clamp(width * 0.03, 10, 12) }}>
              <Text style={[styles.streakTitle, { fontSize: clamp(width * 0.041, 14, 16) }]}>Current Streak</Text>
              <Text style={[styles.streakSubtitle, { fontSize: sectionSubtitleSize, marginTop: clamp(height * 0.004, 3, 4) }]}>Keep it going! 🔥</Text>
            </View>
          </View>
          <View style={[styles.streakRight, { width: clamp(width * 0.2, 70, 80) }]}>
            <Text style={[styles.streakNumber, { fontSize: streakNumberSize }]}>{analytics.current_streak}</Text>
            <Text style={[styles.streakDays, { fontSize: streakDaysSize }]}>days</Text>
          </View>
        </View>
        <View style={[styles.progressRow, { marginTop: sectionMarginTop, marginBottom: clamp(height * 0.008, 5, 6) }]}>
          <Text style={[styles.progressLabel, { fontSize: sectionSubtitleSize }]}>Progress to longest streak</Text>
          <Text style={[styles.progressFraction, { fontSize: sectionSubtitleSize }]}>{analytics.current_streak} / {analytics.longest_streak} days</Text>
        </View>
        <View style={[styles.progressBarContainer, { height: progressBarHeight, borderRadius: progressBarHeight / 2, marginBottom: clamp(height * 0.01, 6, 8) }]}>
          <Animated.View style={[styles.progressBarFill, { width: animatedWidth, overflow: 'hidden', backgroundColor: 'transparent' }]}>
            <LinearGradient colors={['#FF6A00', '#16A34A']} start={[0,0]} end={[1,0]} style={{ flex: 1 }} />
          </Animated.View>
        </View>
      </View>
    );
  };

  const TagAnalytics = () => {
    const tags = (analytics && Array.isArray(analytics.common_tags)) ? analytics.common_tags : [];
    if (tags.length === 0) {
      return (
        <View style={[styles.tagsContainer, { marginHorizontal: sectionInset, marginTop: sectionMarginTop, padding: sectionPadding, borderRadius: sectionRadius }]}>
          <LinearGradient
            colors={['rgba(255,179,107,0.18)', 'rgba(167,139,250,0.12)', 'rgba(52,41,73,0.90)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.cardSurfaceOverlay}
          />
          <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize, marginBottom: clamp(height * 0.015, 10, 12) }]}>Most Common Tags</Text>
          <Text style={[styles.mostCommonSubtitle, { fontSize: sectionSubtitleSize }]}>Your frequent emotions</Text>
          <Text style={[styles.emptyText, { fontSize: stateBodySize * 0.9 }]}>No tags yet. Start tagging your entries!</Text>
        </View>
      );
    }

    const maxCount = Math.max(...tags.map((t) => Number(t.count ?? 0)));

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
        Animated.timing(widthAnim, { toValue: percent, duration: 900, delay: index * 120, useNativeDriver: false }).start();
      }, [index, percent, widthAnim]);
      const animatedWidth = widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
      const gradient = getTagGradient(tagData.tag);

      return (
        <View style={[styles.tagRowCard, { marginBottom: sectionMarginTop, borderRadius: clamp(width * 0.038, 12, 14), paddingHorizontal: clamp(width * 0.032, 11, 14), paddingVertical: clamp(height * 0.012, 8, 10) }]} key={tagData.tag + index}>
          <Text style={[styles.rank, { width: clamp(width * 0.08, 24, 28), fontSize: rankSize }]}>#{index + 1}</Text>
          <View style={styles.tagInfo}>
            <Text style={[styles.tagName, { fontSize: tagNameSize, marginBottom: clamp(height * 0.01, 6, 8) }]}>{tagData.tag}</Text>
            <View style={[styles.tagBarBackground, { height: tagBarHeight, borderRadius: tagBarHeight / 2 }]}>
              <Animated.View style={[styles.tagBarFill, { width: animatedWidth, overflow: 'hidden' }]}>
                <LinearGradient colors={gradient} start={[0,0]} end={[1,0]} style={{ flex: 1 }} />
              </Animated.View>
            </View>
          </View>
          <View style={[styles.entryPill, { paddingHorizontal: entryPillPaddingX, paddingVertical: entryPillPaddingY, borderRadius: entryPillRadius, minWidth: clamp(width * 0.15, 52, 56) }]}>
            <Text style={[styles.entryPillText, { fontSize: entryPillTextSize }]}>{count} {count === 1 ? 'entry' : 'entries'}</Text>
          </View>
        </View>
      );
    };

    return (
      <View style={[styles.mostCommonCard, { marginHorizontal: sectionInset, marginTop: sectionMarginTop, padding: sectionPadding, borderRadius: sectionRadius }]}>
        <LinearGradient
          colors={['rgba(255,179,107,0.18)', 'rgba(167,139,250,0.12)', 'rgba(52,41,73,0.90)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.cardSurfaceOverlay}
        />
        <Text style={[styles.mostCommonTitle, { fontSize: sectionTitleSize }]}>Most Common Tags</Text>
        <Text style={[styles.mostCommonSubtitle, { fontSize: sectionSubtitleSize, marginBottom: clamp(height * 0.015, 10, 12) }]}>Your frequent emotions</Text>
        {tags.slice(0, 3).map((t, i) => (
          <TagRow tagData={t} index={i} key={t.tag + i} />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <TabLoaderCard fullScreen title="Loading analytics..." subtitle="Preparing your journal insights" spinnerColor="#A78BFA" />
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.errorIcon, { fontSize: stateIconSize, marginBottom: clamp(height * 0.02, 14, 16) }]}>📊</Text>
        <Text style={[styles.errorText, { fontSize: stateTitleSize }]}>Unable to load analytics</Text>
        <Text style={[styles.errorSubtext, { fontSize: stateBodySize }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { paddingHorizontal: stateButtonPaddingX, paddingVertical: stateButtonPaddingY, borderRadius: stateButtonRadius }]} onPress={loadAnalytics}>
          <Text style={[styles.retryButtonText, { fontSize: stateButtonTextSize }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.emptyIcon, { fontSize: stateIconSize, marginBottom: clamp(height * 0.025, 16, 20) }]}>📝</Text>
        <Text style={[styles.emptyTitle, { fontSize: stateTitleSize }]}>No analytics available yet</Text>
        <Text style={[styles.emptySubtext, { fontSize: stateBodySize, paddingHorizontal: width * 0.1 }]}>Start writing journal entries to track your progress!</Text>
        <TouchableOpacity style={[styles.createButton, { paddingHorizontal: stateButtonPaddingX, paddingVertical: stateButtonPaddingY, borderRadius: stateButtonRadius }]} onPress={() => router.push('/patient/create-journal')}>
          <Text style={[styles.createButtonText, { fontSize: stateButtonTextSize }]}>Write First Entry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const topTag = analytics.common_tags?.[0] ?? null;
  const favoriteRate = analytics.total_entries > 0
    ? Math.round((analytics.favorite_count / analytics.total_entries) * 100)
    : 0;
  const monthlyMomentum = analytics.entries_this_month >= Math.max(analytics.total_entries * 0.45, 4)
    ? 'Strong momentum'
    : analytics.entries_this_month > 0
      ? 'Building rhythm'
      : 'Start a new streak';
  const insightLine = topTag
    ? `Your writing is centering around ${topTag.tag.toLowerCase()}, with ${topTag.count} entries surfacing that theme.`
    : 'Start writing consistently to uncover themes and emotional patterns in your journal.';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />

      <LinearGradient colors={['#342949', '#2a1f3d', '#342949']} style={styles.screenGradient} />
      <View style={styles.backgroundVeil} pointerEvents="none">
        <View style={[styles.backgroundGlow, styles.backgroundGlowMiddle]} />
        <View style={[styles.backgroundGlow, styles.backgroundGlowBottom]} />
      </View>

      {/* Floating bubbles */}
      <Animated.View style={[styles.bubble, { top: '10%', left: '-10%', width: bubbleMedium, height: bubbleMedium, transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }]} />
      <Animated.View style={[styles.bubble, { top: '30%', right: '-15%', width: bubbleLarge, height: bubbleLarge, transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }]} />
      <Animated.View style={[styles.bubble, { top: '55%', left: '-20%', width: bubbleLarge * 1.05, height: bubbleLarge * 1.05, transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }]} />
      <Animated.View style={[styles.bubble, { top: '75%', right: '-10%', width: bubbleSmall, height: bubbleSmall, transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }]} />
      <Animated.View style={[styles.bubble, { bottom: '5%', left: '15%', width: bubbleSmall * 0.92, height: bubbleSmall * 0.92, transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }]} />

      {/* ── Sticky header — routes to journal-list ── */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Journal"
        secondWord="Analytics"
        onBackPress={goBack}
      />

      <Animated.View
        style={[styles.headerContainer, {
          paddingTop: headerTopPadding,
          paddingHorizontal: pageInset,
          paddingBottom: headerBottomPadding,
          opacity: scrollY.interpolate({ inputRange: [0, 100, 150], outputRange: [1, 0.5, 0], extrapolate: 'clamp' }),
        }]}
      >
        {/* ── Back button — routes to journal-list ── */}
        <TouchableOpacity
          style={[styles.backButton, {
            left: pageInset, top: headerTopPadding,
            width: headerButtonSize, height: headerButtonSize, borderRadius: headerButtonRadius,
          }]}
          onPress={goBack}
        >
          <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}>
          <Text style={styles.headerWhite}>Journal </Text>
          <Text style={styles.headerPurple}>Analytics</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerEstimatedHeight + contentTopGap, paddingBottom: contentBottomGap }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Hero card */}
          <View style={[styles.heroShell, { marginHorizontal: sectionInset, marginBottom: clamp(height * 0.024, 16, 20), borderRadius: clamp(width * 0.055, 18, 24) }]}>
            <LinearGradient
              colors={['rgba(255,179,107,0.28)', 'rgba(167,139,250,0.20)', 'rgba(52,41,73,0.96)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.heroCard, { padding: clamp(width * 0.055, 18, 22), borderRadius: clamp(width * 0.055, 18, 24) }]}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroTextWrap}>
                  <View style={styles.heroEyebrowPill}>
                    <Text style={[styles.heroEyebrow, { fontSize: clamp(width * 0.028, 10, 12) }]}>JOURNAL INSIGHTS</Text>
                  </View>
                  <Text style={[styles.heroTitle, { fontSize: clamp(width * 0.07, 24, 30), marginTop: clamp(height * 0.014, 8, 12) }]}>Your writing rhythm is taking shape</Text>
                  <Text style={[styles.heroSubtitle, { fontSize: clamp(width * 0.035, 12, 14), marginTop: clamp(height * 0.008, 5, 8) }]}>{insightLine}</Text>
                </View>
                <LinearGradient
                  colors={['#FFB36B', '#A78BFA']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.heroOrb, { width: clamp(width * 0.24, 82, 104), height: clamp(width * 0.24, 82, 104), borderRadius: clamp(width * 0.12, 41, 52) }]}
                >
                  <Text style={[styles.heroOrbEmoji, { fontSize: clamp(width * 0.11, 38, 48) }]}>📝</Text>
                </LinearGradient>
              </View>

              <View style={[styles.heroMetaRow, { marginTop: clamp(height * 0.02, 14, 18), gap: statsGap }]}>
                <View style={styles.heroMetaPill}>
                  <Text style={[styles.heroMetaValue, { fontSize: clamp(width * 0.048, 17, 20) }]}>{analytics.current_streak}</Text>
                  <Text style={[styles.heroMetaLabel, { fontSize: clamp(width * 0.028, 10, 12) }]}>day streak</Text>
                </View>
                <View style={styles.heroMetaPill}>
                  <Text style={[styles.heroMetaValue, { fontSize: clamp(width * 0.048, 17, 20) }]}>{favoriteRate}%</Text>
                  <Text style={[styles.heroMetaLabel, { fontSize: clamp(width * 0.028, 10, 12) }]}>favorites</Text>
                </View>
                <View style={styles.heroMetaPill}>
                  <Text style={[styles.heroMetaValue, { fontSize: clamp(width * 0.048, 17, 20) }]}>{topTag ? topTag.tag : 'New'}</Text>
                  <Text style={[styles.heroMetaLabel, { fontSize: clamp(width * 0.028, 10, 12) }]}>top theme</Text>
                </View>
              </View>

              <View style={[styles.heroFooterCard, { marginTop: clamp(height * 0.018, 12, 16) }]}>
                <Text style={[styles.heroFooterLabel, { fontSize: clamp(width * 0.028, 10, 12) }]}>CURRENT TRAJECTORY</Text>
                <Text style={[styles.heroFooterText, { fontSize: clamp(width * 0.038, 14, 16), marginTop: 4 }]}>{monthlyMomentum}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Stat cards grid */}
          <View style={[styles.statsGrid, { paddingHorizontal: sectionInset, gap: statsGap, marginBottom: clamp(height * 0.024, 16, 20) }]}>
            <StatCard icon="📚" label="Total Entries"        value={analytics.total_entries}       color="#FFB36B" delay={0}   />
            <StatCard icon="📅" label="This Month"           value={analytics.entries_this_month}  color="#A78BFA" delay={100} />
            <StatCard icon="⭐" label="Favorites"            value={analytics.favorite_count}      color="#B8A8E6" delay={200} />
            <StatCard icon="🏆" label="Longest Streak (days)" value={analytics.longest_streak}     color="#FFD9B3" delay={300} />
          </View>

          <StreakVisualization />
          <TagAnalytics />

          <View style={{ height: contentBottomGap }} />
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#342949' },
  backgroundVeil:       { ...StyleSheet.absoluteFillObject },
  backgroundGlow:       { position: 'absolute', borderRadius: 999, opacity: 0.24 },
  backgroundGlowMiddle: { width: 180, height: 180, top: '34%', left: -70, backgroundColor: '#A78BFA' },
  backgroundGlowBottom: { width: 220, height: 220, bottom: -90, right: -90, backgroundColor: '#B8A8E6' },
  screenGradient:       { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  bubble:               { position: 'absolute', borderRadius: 1000, backgroundColor: 'rgba(133, 130, 180, 0.12)' },
  headerContainer:      { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900 },
  backButton:           { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  headerTitle:          { fontWeight: '800', textAlign: 'center' },
  headerWhite:          { color: '#FFFFFF' },
  headerPurple:         { color: '#B8A8E6' },
  heroShell:            { overflow: 'hidden', shadowColor: '#0F0A18', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 26, elevation: 8 },
  heroCard:             { borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  heroTopRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  heroTextWrap:         { flex: 1, paddingRight: 10 },
  heroEyebrowPill:      { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 6 },
  heroEyebrow:          { color: '#F8F4FF', fontWeight: '800', letterSpacing: 1 },
  heroTitle:            { color: '#FFFFFF', fontWeight: '900', lineHeight: 36 },
  heroSubtitle:         { color: '#E6DFFC', lineHeight: 20 },
  heroOrb:              { alignItems: 'center', justifyContent: 'center', shadowColor: '#A78BFA', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 7 },
  heroOrbEmoji:         { textAlign: 'center' },
  heroMetaRow:          { flexDirection: 'row' },
  heroMetaPill:         { flex: 1, backgroundColor: 'rgba(23, 17, 35, 0.24)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  heroMetaValue:        { color: '#FFFFFF', fontWeight: '900', marginBottom: 2, textAlign: 'center' },
  heroMetaLabel:        { color: '#D9D1F0', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  heroFooterCard:       { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  heroFooterLabel:      { color: '#BFB4DD', fontWeight: '800', letterSpacing: 0.8 },
  heroFooterText:       { color: '#FFFFFF', fontWeight: '800' },
  centerContainer:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#342949', paddingHorizontal: '8%' },
  statsGrid:            { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard:             { alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 5, backgroundColor: 'rgba(71,63,90,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  cardSurfaceOverlay:   { ...StyleSheet.absoluteFillObject },
  statIcon:             { color: '#fff' },
  statKicker:           { color: '#B7ABDA', fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
  statValue:            { fontWeight: '800', color: '#FFFFFF', marginBottom: 6, marginLeft: 2 },
  statLabel:            { color: '#B8A8E6', textAlign: 'left' },
  statIconBubble:       { alignItems: 'center', justifyContent: 'center', marginBottom: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  streakContainer:      { marginHorizontal: 0, marginTop: 0, backgroundColor: 'rgba(71,63,90,0.94)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  streakOverlay:        { ...StyleSheet.absoluteFillObject },
  sectionTitle:         { fontWeight: '700', color: '#FFFFFF' },
  streakHeaderRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakLeft:           { flexDirection: 'row', alignItems: 'center', flex: 1 },
  streakRight:          { alignItems: 'flex-end', width: 80 },
  streakTitle:          { fontWeight: '700', color: '#FFFFFF' },
  streakSubtitle:       { color: '#B8A8E6' },
  streakNumber:         { fontWeight: '800', color: '#FFB36B' },
  streakDays:           { color: '#B8A8E6' },
  progressRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel:        { color: '#B8A8E6' },
  progressFraction:     { color: '#FFFFFF', fontWeight: '700' },
  progressBarContainer: { backgroundColor: 'rgba(255,255,255,0.09)', overflow: 'hidden' },
  progressBarFill:      { height: '100%' },
  tagsContainer:        { marginHorizontal: 0, marginTop: 0, backgroundColor: 'rgba(71,63,90,0.94)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  mostCommonCard:       { marginHorizontal: 0, marginTop: 0, backgroundColor: 'rgba(71,63,90,0.94)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  mostCommonTitle:      { fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  mostCommonSubtitle:   { color: '#B8A8E6', marginBottom: 12 },
  tagRowCard:           { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  rank:                 { color: '#FFB36B', fontWeight: '700' },
  tagInfo:              { flex: 1, marginRight: 12 },
  tagName:              { color: '#FFFFFF', fontWeight: '700' },
  entryPill:            { backgroundColor: 'rgba(167,139,250,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.28)' },
  entryPillText:        { color: '#FFFFFF', fontWeight: '700' },
  tagBarBackground:     { backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  tagBarFill:           { height: '100%' },
  errorIcon:            {},
  errorText:            { fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  errorSubtext:         { color: '#B8A8E6', textAlign: 'center', marginBottom: 24 },
  emptyIcon:            {},
  emptyTitle:           { fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  emptySubtext:         { color: '#B8A8E6', textAlign: 'center', marginBottom: 24 },
  emptyText:            { color: '#B8A8E6', textAlign: 'center', fontStyle: 'italic' },
  retryButton:          { backgroundColor: '#A78BFA' },
  retryButtonText:      { color: '#fff', fontWeight: '600' },
  createButton:         { backgroundColor: '#A78BFA' },
  createButtonText:     { color: '#fff', fontWeight: '600' },
});
