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
  const scrollY  = useRef(new Animated.Value(0)).current;

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

  const pageInset             = clamp(width * 0.03, 12, 18);
  const backButtonLeftOffset  = pageInset + clamp(width * 0.012, 4, 7);
  const sectionInset          = clamp(width * 0.05, 16, 22);
  const headerTopPadding      = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding   = clamp(height * 0.02, 14, 22);
  const headerButtonSize      = clamp(width * 0.098, 34, 40);
  const headerButtonRadius    = headerButtonSize / 2;
  const headerIconSize        = clamp(width * 0.047, 16, 20);
  const headerTitleSize       = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop  = clamp(height * 0.022, 14, 22);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;
  const contentTopGap         = clamp(height * 0.022, 14, 20);
  const contentBottomGap      = clamp(height * 0.05, 28, 40);
  const cardGap               = clamp(width * 0.025, 8, 12);
  const sectionMarginTop      = clamp(height * 0.018, 12, 16);

  const bubbleLarge  = clamp(width * 0.62, 180, 240);
  const bubbleMedium = clamp(width * 0.56, 160, 220);
  const bubbleSmall  = clamp(width * 0.48, 140, 190);
  const bubbleShiftY = clamp(height * 0.06, 28, 50);
  const bubbleShiftX = clamp(width * 0.08, 18, 30);

  const stateIconSize       = clamp(width * 0.18, 64, 80);
  const stateTitleSize      = clamp(width * 0.056, 20, 22);
  const stateBodySize       = clamp(width * 0.041, 14, 16);
  const stateButtonPaddingX = clamp(width * 0.08, 28, 32);
  const stateButtonPaddingY = clamp(height * 0.018, 12, 14);
  const stateButtonRadius   = clamp(width * 0.03, 10, 12);
  const stateButtonTextSize = clamp(width * 0.041, 14, 16);

  // shared card tokens
  const cardRadius = clamp(width * 0.045, 14, 18);
  const cardPad    = clamp(width * 0.042, 13, 17);
  const labelSz    = clamp(width * 0.027, 10, 11);
  const bigNumSz   = clamp(width * 0.082, 27, 34);
  const subLabelSz = clamp(width * 0.028, 10, 11);
  const minCardH   = clamp(height * 0.155, 110, 140);
  const tagAccents = ['#FFB36B', '#A78BFA', '#34D399'];

  const goBack = () => from === 'analytics'
    ? router.push('/patient/analytics')
    : router.push('/patient/journal-list');

  useEffect(() => {
    const fly = (ay: Animated.Value, ax: Animated.Value, dy: number, dx: number, dly = 0, dlx = 0) => {
      Animated.loop(Animated.sequence([
        Animated.delay(dly),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ay, { toValue:  bubbleShiftY, duration: dy, useNativeDriver: true }),
            Animated.timing(ay, { toValue: -bubbleShiftY, duration: dy, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(dlx),
            Animated.timing(ax, { toValue:  bubbleShiftX, duration: dx, useNativeDriver: true }),
            Animated.timing(ax, { toValue: -bubbleShiftX, duration: dx, useNativeDriver: true }),
          ]),
        ]),
      ])).start();
    };
    fly(bubble1Y, bubble1X, 8000, 7000, 0, 500);
    fly(bubble2Y, bubble2X, 9000, 8500, 1000, 1500);
    fly(bubble3Y, bubble3X, 7500, 8000, 2000, 2500);
    fly(bubble4Y, bubble4X, 10000, 9500, 1500, 1000);
    fly(bubble5Y, bubble5X, 8500, 7500, 500, 2000);
  }, [bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y, bubble4X, bubble4Y, bubble5X, bubble5Y, bubbleShiftX, bubbleShiftY]);

  useEffect(() => { loadAnalytics(); }, []);

  useEffect(() => {
    if (analytics) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  }, [analytics, fadeAnim]);

  const loadAnalytics = async () => {
    try {
      setLoading(true); setError(null);
      const data = await PatientService.getJournalAnalytics();
      if (!data) setError('No data returned from server');
      else setAnalytics(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load analytics');
    } finally { setLoading(false); }
  };

  // ── Animated horizontal bar ───────────────────────────────────────────────
  const HBar = ({ pct, color, h = 6 }: { pct: number; color: string; h?: number }) => {
    const w = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(w, { toValue: pct, duration: 900, useNativeDriver: false }).start();
    }, [pct, w]);
    return (
      <View style={{ height: h, borderRadius: h / 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), overflow: 'hidden' }}>
          <LinearGradient colors={[color, color + 'AA']} start={[0, 0]} end={[1, 0]} style={{ flex: 1 }} />
        </Animated.View>
      </View>
    );
  };

  // ── Sparkline bars ────────────────────────────────────────────────────────
  const WeekBars = ({ thisMonth, total }: { thisMonth: number; total: number }) => {
    const vals = [0,1,2,3,4,5,6].map(i => {
      const base = Math.floor((thisMonth / 7) * (0.5 + ((i * 37 + 11) % 7) / 7));
      return Math.min(base, Math.max(total, 1));
    });
    const maxBar  = Math.max(...vals, 1);
    const barMaxH = clamp(height * 0.05, 28, 40);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: barMaxH }}>
        {vals.map((v, i) => {
          const isLast = i === vals.length - 1;
          const barHeight = (v / maxBar) * barMaxH;
          return (
            <View key={i} style={{ flex: 1, height: barMaxH, justifyContent: 'flex-end' }}>
              <View style={{ height: barHeight, borderRadius: 3, overflow: 'hidden', opacity: isLast ? 1 : 0.45 + i * 0.07 }}>
                <LinearGradient
                  colors={isLast ? ['#FFB36B', '#FF7A3D'] : ['#A78BFA', '#7C5FC0']}
                  start={[0, 0]} end={[0, 1]}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) return <TabLoaderCard fullScreen title="Loading analytics..." subtitle="Preparing your journal insights" spinnerColor="#A78BFA" />;

  if (error) return (
    <View style={styles.centerContainer}>
      <Text style={[styles.errorIcon, { fontSize: stateIconSize }]}>📊</Text>
      <Text style={[styles.errorText, { fontSize: stateTitleSize }]}>Unable to load analytics</Text>
      <Text style={[styles.errorSubtext, { fontSize: stateBodySize }]}>{error}</Text>
      <TouchableOpacity style={[styles.retryButton, { paddingHorizontal: stateButtonPaddingX, paddingVertical: stateButtonPaddingY, borderRadius: stateButtonRadius }]} onPress={loadAnalytics}>
        <Text style={[styles.retryButtonText, { fontSize: stateButtonTextSize }]}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (!analytics) return (
    <View style={styles.centerContainer}>
      <Text style={[styles.emptyIcon, { fontSize: stateIconSize }]}>📝</Text>
      <Text style={[styles.emptyTitle, { fontSize: stateTitleSize }]}>No analytics available yet</Text>
      <Text style={[styles.emptySubtext, { fontSize: stateBodySize, paddingHorizontal: width * 0.1 }]}>Start writing journal entries to track your progress!</Text>
      <TouchableOpacity style={[styles.createButton, { paddingHorizontal: stateButtonPaddingX, paddingVertical: stateButtonPaddingY, borderRadius: stateButtonRadius }]} onPress={() => router.push('/patient/create-journal')}>
        <Text style={[styles.createButtonText, { fontSize: stateButtonTextSize }]}>Write First Entry</Text>
      </TouchableOpacity>
    </View>
  );

  const topTag          = analytics.common_tags?.[0] ?? null;
  const favoriteRate    = analytics.total_entries > 0 ? Math.round((analytics.favorite_count / analytics.total_entries) * 100) : 0;
  const streakPct       = analytics.longest_streak > 0 ? Math.min((analytics.current_streak / analytics.longest_streak) * 100, 100) : 0;
  const insightLine     = topTag
    ? `Your writing is centering around ${topTag.tag.toLowerCase()}, with ${topTag.count} entries surfacing that theme.`
    : 'Start writing consistently to uncover themes and emotional patterns in your journal.';
  const tags            = Array.isArray(analytics.common_tags) ? analytics.common_tags : [];
  const maxTagCount     = tags.length > 0 ? Math.max(...tags.map(t => Number(t.count ?? 0))) : 1;

  // Big number font size for Total Entries card
  const bigEntryNumSz = clamp(width * 0.15, 52, 64);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />
      <LinearGradient colors={['#342949', '#2a1f3d', '#342949']} style={styles.screenGradient} />
      <View style={styles.backgroundVeil} pointerEvents="none">
        <View style={[styles.backgroundGlow, styles.backgroundGlowMiddle]} />
        <View style={[styles.backgroundGlow, styles.backgroundGlowBottom]} />
      </View>

      <Animated.View style={[styles.bubble, { top: '10%', left: '-10%', width: bubbleMedium, height: bubbleMedium, transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }]} />
      <Animated.View style={[styles.bubble, { top: '30%', right: '-15%', width: bubbleLarge, height: bubbleLarge, transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }]} />
      <Animated.View style={[styles.bubble, { top: '55%', left: '-20%', width: bubbleLarge * 1.05, height: bubbleLarge * 1.05, transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }]} />
      <Animated.View style={[styles.bubble, { top: '75%', right: '-10%', width: bubbleSmall, height: bubbleSmall, transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }]} />
      <Animated.View style={[styles.bubble, { bottom: '5%', left: '15%', width: bubbleSmall * 0.92, height: bubbleSmall * 0.92, transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }]} />

      <StickyHeader scrollY={scrollY} firstWord="Journal" secondWord="Analytics" onBackPress={goBack} />

      <Animated.View style={[styles.headerContainer, {
        paddingTop: headerTopPadding, paddingHorizontal: pageInset, paddingBottom: headerBottomPadding,
        opacity: scrollY.interpolate({ inputRange: [0, 100, 150], outputRange: [1, 0.5, 0], extrapolate: 'clamp' }),
      }]}>
        <TouchableOpacity
          style={[styles.backButton, { left: backButtonLeftOffset, top: headerTopPadding, width: headerButtonSize, height: headerButtonSize, borderRadius: headerButtonRadius }]}
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

          {/* ══════════════════════════════════════════════
               HERO — solid opaque, no trajectory footer
          ══════════════════════════════════════════════ */}
          <View style={[styles.heroShell, { marginHorizontal: sectionInset, marginBottom: sectionMarginTop, borderRadius: clamp(width * 0.055, 18, 24) }]}>
            <LinearGradient
              colors={['#4A3A62', '#3A2D55', '#2C2248']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.heroCard, { padding: clamp(width * 0.055, 18, 22), borderRadius: clamp(width * 0.055, 18, 24) }]}
            >
              {/* top highlight line */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderTopLeftRadius: clamp(width * 0.055, 18, 24), borderTopRightRadius: clamp(width * 0.055, 18, 24) }} />

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

              {/* 3 meta pills — no footer card below them */}
              <View style={[styles.heroMetaRow, { marginTop: clamp(height * 0.02, 14, 18), gap: clamp(width * 0.025, 8, 12) }]}>
                <View style={styles.heroMetaPill}>
                  <Text style={[styles.heroMetaValue, { fontSize: clamp(width * 0.048, 17, 20) }]}>{analytics.current_streak}</Text>
                  <Text style={[styles.heroMetaLabel, { fontSize: clamp(width * 0.028, 10, 12) }]}>day streak</Text>
                </View>
                <View style={styles.heroMetaPill}>
                  <Text style={[styles.heroMetaValue, { fontSize: clamp(width * 0.048, 17, 20) }]}>{favoriteRate}%</Text>
                  <Text style={[styles.heroMetaLabel, { fontSize: clamp(width * 0.028, 10, 12) }]}>favorites</Text>
                </View>
                <View style={styles.heroMetaPill}>
                  <Text style={[styles.heroMetaValue, { fontSize: clamp(width * 0.048, 17, 20) }]} numberOfLines={1}>{topTag ? topTag.tag : 'None'}</Text>
                  <Text style={[styles.heroMetaLabel, { fontSize: clamp(width * 0.028, 10, 12) }]}>top theme</Text>
                </View>
              </View>
              {/* ── heroFooterCard REMOVED ── */}
            </LinearGradient>
          </View>

          {/* ══════════════════════════════════════════════
               ROW 1 — Total Entries  |  This Month
               Fix: glow circle sits BEHIND the number via zIndex
          ══════════════════════════════════════════════ */}
          <View style={{ flexDirection: 'row', marginHorizontal: sectionInset, gap: cardGap, marginBottom: cardGap }}>

            {/* Total Entries */}
            <View style={[styles.glassCard, { flex: 1.1, borderRadius: cardRadius, overflow: 'hidden', minHeight: minCardH }]}>
              <LinearGradient colors={['rgba(255,179,107,0.14)', 'rgba(167,139,250,0.10)', 'rgba(52,41,73,0.92)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={{ height: 3, backgroundColor: '#FFB36B', position: 'absolute', top: 0, left: 0, right: 0 }} />

              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: cardPad, paddingTop: cardPad + 3 }}>
                {/* Label — z-index above glow */}
                <Text style={{ fontSize: labelSz, color: '#FFB36B', fontWeight: '800', letterSpacing: 1.2, marginBottom: 4, zIndex: 2 }}>
                  TOTAL ENTRIES
                </Text>

                {/* Number + glow circle as a single stacked unit */}
                <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  {/* Glow circle — absolute, centred behind number */}
                  <View style={{
                    position: 'absolute',
                    width: bigEntryNumSz * 1.3,
                    height: bigEntryNumSz * 1.3,
                    borderRadius: bigEntryNumSz * 0.65,
                    backgroundColor: 'rgba(255,179,107,0.13)',
                    zIndex: 0,
                  }} />
                  {/* Number on top of glow */}
                  <Text style={{
                    fontSize: bigEntryNumSz,
                    fontWeight: '900',
                    color: '#FFFFFF',
                    lineHeight: bigEntryNumSz * 1.15,
                    zIndex: 1,
                  }}>
                    {analytics.total_entries}
                  </Text>
                </View>

                <Text style={{ fontSize: subLabelSz, color: '#B8A8E6', zIndex: 2 }}>journal entries</Text>
              </View>
            </View>

            {/* This month — label → number → sublabel → bars */}
            <View style={[styles.glassCard, { flex: 1, borderRadius: cardRadius, overflow: 'hidden', minHeight: minCardH }]}>
              <LinearGradient colors={['rgba(167,139,250,0.18)', 'rgba(255,179,107,0.08)', 'rgba(52,41,73,0.92)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={{ height: 3, backgroundColor: '#A78BFA', position: 'absolute', top: 0, left: 0, right: 0 }} />
              <View style={{ flex: 1, padding: cardPad, paddingTop: cardPad + 3, justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: labelSz, color: '#A78BFA', fontWeight: '800', letterSpacing: 1.2 }}>THIS MONTH</Text>
                  <Text style={{ fontSize: bigNumSz, fontWeight: '900', color: '#FFFFFF', marginTop: 4, lineHeight: bigNumSz * 1.1 }}>
                    {analytics.entries_this_month}
                  </Text>
                  <Text style={{ fontSize: subLabelSz, color: '#B8A8E6', marginTop: 2 }}>entries written</Text>
                </View>
                <WeekBars thisMonth={analytics.entries_this_month} total={analytics.total_entries} />
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════
               ROW 2 — Streak ring  |  Favourites + Best
          ══════════════════════════════════════════════ */}
          <View style={{ flexDirection: 'row', marginHorizontal: sectionInset, gap: cardGap, marginBottom: cardGap }}>

            {/* Streak ring */}
            <View style={[styles.glassCard, { flex: 1, borderRadius: cardRadius, overflow: 'hidden', alignItems: 'center' }]}>
              <LinearGradient colors={['rgba(255,179,107,0.18)', 'rgba(167,139,250,0.10)', 'rgba(52,41,73,0.92)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={{ height: 3, backgroundColor: '#FFB36B', position: 'absolute', top: 0, left: 0, right: 0 }} />
              <View style={{ alignItems: 'center', padding: cardPad, paddingTop: cardPad + 3 }}>
                <Text style={{ fontSize: labelSz, color: '#FFB36B', fontWeight: '800', letterSpacing: 1.2, marginBottom: 14 }}>CURRENT STREAK</Text>
                {(() => {
                  const ringSize = clamp(width * 0.26, 88, 108);
                  const stroke   = clamp(width * 0.025, 8, 10);
                  return (
                    <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ position: 'absolute', width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderWidth: stroke, borderColor: 'rgba(255,255,255,0.07)' }} />
                      <StreakRing pct={streakPct} size={ringSize} stroke={stroke} />
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: clamp(width * 0.065, 22, 28), fontWeight: '900', color: '#FFB36B' }}>{analytics.current_streak}</Text>
                        <Text style={{ fontSize: subLabelSz, color: '#B8A8E6', marginTop: -2 }}>days</Text>
                      </View>
                    </View>
                  );
                })()}
                <Text style={{ fontSize: subLabelSz, color: '#9D8EC7', marginTop: 12, textAlign: 'center' }}>
                  Best: {analytics.longest_streak} days
                </Text>
              </View>
            </View>

            {/* Favourites + Best streak stacked */}
            <View style={{ flex: 1, gap: cardGap }}>

              {/* Favourites */}
              <View style={[styles.glassCard, { flex: 1, borderRadius: cardRadius, overflow: 'hidden' }]}>
                <LinearGradient colors={['rgba(184,168,230,0.18)', 'rgba(52,41,73,0.92)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={{ height: 3, backgroundColor: '#B8A8E6', position: 'absolute', top: 0, left: 0, right: 0 }} />
                <View style={{ flex: 1, padding: cardPad, paddingTop: cardPad + 3, justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: labelSz, color: '#B8A8E6', fontWeight: '800', letterSpacing: 1 }}>FAVOURITES</Text>
                  <Text style={{ fontSize: bigNumSz, fontWeight: '900', color: '#FFFFFF', lineHeight: bigNumSz * 1.1 }}>{analytics.favorite_count}</Text>
                  <View>
                    <HBar pct={favoriteRate} color="#B8A8E6" h={5} />
                    <Text style={{ fontSize: subLabelSz, color: '#9D8EC7', marginTop: 4 }}>{favoriteRate}% of total</Text>
                  </View>
                </View>
              </View>

              {/* Best streak */}
              <View style={[styles.glassCard, { flex: 1, borderRadius: cardRadius, overflow: 'hidden' }]}>
                <LinearGradient colors={['rgba(255,217,179,0.16)', 'rgba(52,41,73,0.92)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={{ height: 3, backgroundColor: '#FFD9B3', position: 'absolute', top: 0, left: 0, right: 0 }} />
                <View style={{ flex: 1, padding: cardPad, paddingTop: cardPad + 3, justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: labelSz, color: '#FFD9B3', fontWeight: '800', letterSpacing: 1 }}>BEST STREAK</Text>
                  <Text style={{ fontSize: bigNumSz, fontWeight: '900', color: '#FFFFFF', lineHeight: bigNumSz * 1.1 }}>{analytics.longest_streak}</Text>
                  <Text style={{ fontSize: subLabelSz, color: '#9D8EC7' }}>days record</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════
               ROW 3 — Mood Themes
          ══════════════════════════════════════════════ */}
          {tags.length > 0 && (
            <View style={[styles.glassCard, { marginHorizontal: sectionInset, borderRadius: cardRadius, overflow: 'hidden', marginBottom: cardGap }]}>
              <LinearGradient colors={['rgba(255,179,107,0.12)', 'rgba(167,139,250,0.14)', 'rgba(52,41,73,0.92)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={{ height: 3, backgroundColor: '#A78BFA', position: 'absolute', top: 0, left: 0, right: 0 }} />
              <View style={{ padding: clamp(width * 0.045, 14, 18), paddingTop: clamp(width * 0.045, 14, 18) + 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: clamp(height * 0.018, 12, 16) }}>
                  <View>
                    <Text style={{ fontSize: labelSz, color: '#A78BFA', fontWeight: '800', letterSpacing: 1.2 }}>MOOD THEMES</Text>
                    <Text style={{ fontSize: clamp(width * 0.042, 15, 17), fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>Top emotions</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(167,139,250,0.28)' }}>
                    <Text style={{ fontSize: labelSz, color: '#A78BFA', fontWeight: '700' }}>{tags.length} tags</Text>
                  </View>
                </View>
                {tags.slice(0, 3).map((t, i) => {
                  const pct    = maxTagCount > 0 ? (Number(t.count ?? 0) / maxTagCount) * 100 : 0;
                  const accent = tagAccents[i] ?? '#B8A8E6';
                  return (
                    <View key={t.tag + i} style={{ marginBottom: i < 2 ? clamp(height * 0.018, 12, 16) : 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent }} />
                          <Text style={{ fontSize: clamp(width * 0.038, 13, 15), color: '#FFFFFF', fontWeight: '700' }}>{t.tag}</Text>
                        </View>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: subLabelSz, color: '#B8A8E6', fontWeight: '700' }}>{t.count} {Number(t.count) === 1 ? 'entry' : 'entries'}</Text>
                        </View>
                      </View>
                      <HBar pct={pct} color={accent} h={clamp(height * 0.011, 7, 9)} />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ROW 4 (Writing Momentum) REMOVED */}

          <View style={{ height: contentBottomGap }} />
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

// ── Streak ring border-trick ──────────────────────────────────────────────
function StreakRing({ pct, size, stroke }: { pct: number; size: number; stroke: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  const color   = '#FFB36B';
  if (clamped === 0) return null;
  const q1 = clamped >= 25;
  const q2 = clamped >= 50;
  const q3 = clamped >= 75;
  return (
    <>
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke,
        borderTopColor:    clamped > 0 ? color : 'transparent',
        borderRightColor:  q1        ? color : 'transparent',
        borderBottomColor: q2        ? color : 'transparent',
        borderLeftColor:   q3        ? color : 'transparent',
        transform: [{ rotate: '-45deg' }],
      }} />
      {clamped > 5 && clamped < 95 && (
        <View style={{
          position: 'absolute',
          width: stroke + 4, height: stroke + 4, borderRadius: (stroke + 4) / 2,
          backgroundColor: color,
          shadowColor: color, shadowRadius: 8, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 },
          top: stroke / 2 - 2,
          left: size / 2 - (stroke + 4) / 2,
        }} />
      )}
    </>
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

  glassCard: {
    backgroundColor: 'rgba(71,63,90,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 7,
  },

  heroShell:       { overflow: 'hidden', shadowColor: '#0F0A18', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.30, shadowRadius: 28, elevation: 10 },
  heroCard:        { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  heroTopRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  heroTextWrap:    { flex: 1, paddingRight: 10 },
  heroEyebrowPill: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 6 },
  heroEyebrow:     { color: '#F8F4FF', fontWeight: '800', letterSpacing: 1 },
  heroTitle:       { color: '#FFFFFF', fontWeight: '900', lineHeight: 36 },
  heroSubtitle:    { color: '#D9CEF6', lineHeight: 20 },
  heroOrb:         { alignItems: 'center', justifyContent: 'center', shadowColor: '#A78BFA', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 7 },
  heroOrbEmoji:    { textAlign: 'center' },
  heroMetaRow:     { flexDirection: 'row' },
  heroMetaPill:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  heroMetaValue:   { color: '#FFFFFF', fontWeight: '900', marginBottom: 2, textAlign: 'center' },
  heroMetaLabel:   { color: '#C4B8E8', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },

  centerContainer:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#342949', paddingHorizontal: '8%' },
  errorIcon:        { marginBottom: 16, textAlign: 'center' },
  errorText:        { fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  errorSubtext:     { color: '#B8A8E6', textAlign: 'center', marginBottom: 24 },
  emptyIcon:        { marginBottom: 20, textAlign: 'center' },
  emptyTitle:       { fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  emptySubtext:     { color: '#B8A8E6', textAlign: 'center', marginBottom: 24 },
  retryButton:      { backgroundColor: '#A78BFA' },
  retryButtonText:  { color: '#fff', fontWeight: '600' },
  createButton:     { backgroundColor: '#A78BFA' },
  createButtonText: { color: '#fff', fontWeight: '600' },
});
