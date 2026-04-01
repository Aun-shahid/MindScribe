import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabLoaderCard from '../components/TabLoaderCard';
import StickyHeader from '../components/StickyHeader';
import api from '../utils/api';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const moodEmojis: { [key: string]: string } = {
  happy: '😊', sad: '😢', angry: '😠', anxious: '😰', peaceful: '😌',
  excited: '🤩', grateful: '🙏', overwhelmed: '😵', hopeful: '🌟', stressed: '😫',
};

const moodLabels: { [key: string]: string } = {
  happy: 'Happy', sad: 'Sad', angry: 'Angry', anxious: 'Anxious', peaceful: 'Peaceful',
  excited: 'Excited', grateful: 'Grateful', overwhelmed: 'Overwhelmed', hopeful: 'Hopeful', stressed: 'Stressed',
};

const moodColorMap: { [key: string]: [string, string] } = {
  happy:       ['#FFD54F', '#FFC107'],
  sad:         ['#64B5F6', '#4FC3F7'],
  angry:       ['#FF8A80', '#FF5252'],
  anxious:     ['#CE93D8', '#AB47BC'],
  peaceful:    ['#81D4FA', '#4FC3F7'],
  excited:     ['#FFAB91', '#FF7043'],
  grateful:    ['#AED581', '#9CCC65'],
  overwhelmed: ['#B39DDB', '#9575CD'],
  hopeful:     ['#A5D6A7', '#7CB342'],
  stressed:    ['#E57373', '#EF5350'],
};

interface MoodAnalytics {
  average_intensity: number;
  most_common_mood: string;
  mood_distribution: { [key: string]: number };
  weekly_trend: { date: string; average_intensity: number }[];
  monthly_comparison: { [key: string]: any };
  common_triggers: string[];
}

export default function MoodAnalyticsDetail() {
  const { themeStyle } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ── Read where we came from ───────────────────────────────────────────────
  const { from } = useLocalSearchParams<{ from?: string }>();

  const [loading,         setLoading]         = useState(true);
  const [analytics,       setAnalytics]       = useState<MoodAnalytics | null>(null);
  const [selectedDays,    setSelectedDays]    = useState(30);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const screenBackground = '#342949';
  const isCompactLayout  = width < 390;

  const b1y = useRef(new Animated.Value(0)).current;
  const b1x = useRef(new Animated.Value(0)).current;
  const b2y = useRef(new Animated.Value(0)).current;
  const b2x = useRef(new Animated.Value(0)).current;
  const b3y = useRef(new Animated.Value(0)).current;
  const b3x = useRef(new Animated.Value(0)).current;
  const b4y = useRef(new Animated.Value(0)).current;
  const b4x = useRef(new Animated.Value(0)).current;
  const b5y = useRef(new Animated.Value(0)).current;
  const b5x = useRef(new Animated.Value(0)).current;

  const pageInset     = clamp(width * 0.05,   16, 22);
  const hTop          = insets.top + clamp(height * 0.017, 14, 22);
  const hBtnSz        = clamp(width * 0.105,  36, 42);
  const hBtnR         = hBtnSz / 2;
  const hIconSz       = clamp(width * 0.05,   18, 20);
  const hTitleSz      = clamp(width * 0.074,  24, 30);
  const hMTop         = clamp(height * 0.024, 18, 24);
  const hBotPad       = clamp(height * 0.004,  2,  6);
  const hEst          = hTop + hMTop + hTitleSz + hBotPad;
  const hFadeDist     = clamp(height * 0.022, 14, 20);
  const contTopPad    = clamp(height * 0.016, 10, 16);
  const cR            = clamp(width * 0.05,   14, 20);
  const cPad          = clamp(width * 0.05,   16, 22);
  const cGap          = clamp(height * 0.02,  12, 18);
  const secTitleSz    = clamp(width * 0.043,  15, 18);
  const secTitleBotGap= clamp(height * 0.015, 10, 14);
  const bodyTxtSz     = clamp(width * 0.036,  13, 15);
  const metricValSz   = clamp(width * 0.07,   24, 30);
  const domEmojiSz    = clamp(width * 0.12,   42, 56);
  const domCircleSz   = clamp(width * 0.26,   90, 110);
  const triggerChipR  = clamp(width * 0.05,   16, 22);
  const triggerTxtSz  = clamp(width * 0.034,  12, 14);
  const botPad        = clamp(insets.bottom + height * 0.02, 24, 38);
  const emptyPad      = clamp(width * 0.1,    28, 44);
  const emptyEmojiSz  = clamp(width * 0.17,   52, 72);
  const emptyTxtSz    = clamp(width * 0.052,  18, 22);
  const emptySubSz    = clamp(width * 0.041,  14, 17);
  const emptyEmojiGap = clamp(height * 0.02,  12, 18);
  const emptyTxtGap   = clamp(height * 0.01,   6, 10);
  const emptySubGap   = clamp(height * 0.03,  18, 28);
  const actBtnR       = clamp(width * 0.03,   10, 14);
  const actBtnPadH    = clamp(width * 0.06,   20, 30);
  const actBtnPadV    = clamp(height * 0.015, 10, 14);
  const actBtnTxtSz   = clamp(width * 0.041,  14, 17);
  const metricsGap    = clamp(width * 0.03,   10, 14);
  const distListGap   = clamp(height * 0.02,  12, 18);
  const distItemGap   = clamp(height * 0.012,  6, 10);
  const distEmojiSz   = clamp(width * 0.065,  22, 28);
  const distBarH      = clamp(height * 0.01,   6, 10);
  const distBarR      = distBarH / 2;
  const triggerGap    = clamp(width * 0.025,   8, 12);
  const infoGap       = clamp(width * 0.03,   10, 14);
  const infoEmojiSz   = clamp(width * 0.065,  22, 28);
  const filtPadV      = clamp(height * 0.012,  8, 10);
  const filtPadH      = clamp(width * 0.03,   10, 14);
  const filtR         = clamp(width * 0.04,   12, 16);
  const filtTxtSz     = clamp(width * 0.033,  12, 14);
  const filtChevSz    = clamp(width * 0.03,   11, 13);
  const modalTitleSz  = clamp(width * 0.05,   18, 22);
  const modalOptPadY  = clamp(height * 0.018, 12, 16);
  const modalOptPadX  = clamp(width * 0.04,   14, 18);
  const modalOptR     = clamp(width * 0.033,  10, 14);
  const modalOptTxtSz = clamp(width * 0.039,  14, 17);

  const bLarge  = clamp(width * 0.74, 220, 310);
  const bMedium = clamp(width * 0.52, 170, 230);
  const bSmall  = clamp(width * 0.32,  96, 132);

  const dayOptions = [7, 14, 30, 60];

  useFocusEffect(
    useCallback(() => {
      [b1y,b1x,b2y,b2x,b3y,b3x,b4y,b4x,b5y,b5x].forEach((v) => v.setValue(0));
      const fly = (y: Animated.Value, x: Animated.Value, dY: number, dX: number) => {
        const c = Animated.parallel([
          Animated.loop(Animated.sequence([
            Animated.timing(y, { toValue: -50, duration: dY, useNativeDriver: true }),
            Animated.timing(y, { toValue:  50, duration: dY, useNativeDriver: true }),
          ])),
          Animated.loop(Animated.sequence([
            Animated.timing(x, { toValue:  30, duration: dX, useNativeDriver: true }),
            Animated.timing(x, { toValue: -30, duration: dX, useNativeDriver: true }),
          ])),
        ]);
        c.start();
        return c;
      };
      const anims = [
        fly(b1y, b1x, 8000,  7000),
        fly(b2y, b2x, 10000, 8000),
        fly(b3y, b3x, 9000,  7500),
        fly(b4y, b4x, 8500,  7200),
        fly(b5y, b5x, 9500,  8200),
      ];
      return () => anims.forEach((a) => a.stop());
    }, [])
  );

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<MoodAnalytics>('/patients/mood/analytics/', {
        params: { days: selectedDays },
      });
      setAnalytics(response.data);
    } catch (error: any) {
      console.error('❌ Error loading mood analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDays]);

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
      return () => {};
    }, [loadAnalytics])
  );

  // ── Smart back — analytics hub or mood page depending on origin ───────────
  const goBack = () => {
    if (from === 'analytics') {
      router.push('/patient/analytics');
    } else {
      router.push('/patient/mood');
    }
  };

  const getMoodEmoji = (mood: string) => moodEmojis[mood] || '😐';
  const getMoodLabel = (mood: string) => moodLabels[mood] || mood;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: screenBackground }]}>
        <StatusBar barStyle="light-content" backgroundColor={screenBackground} />
        <TabLoaderCard title="Loading Analytics" subtitle="Preparing your mood insights..." spinnerColor="#A78BFA" fullScreen />
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={[styles.container, { backgroundColor: screenBackground }]}>
        <StatusBar barStyle="light-content" backgroundColor={screenBackground} />
        <LinearGradient colors={[screenBackground, '#2A1F3D', screenBackground]} style={styles.bgGradient} pointerEvents="none" />
        <View style={[styles.emptyContainer, { padding: emptyPad }]}>
          <Text style={{ fontSize: emptyEmojiSz, marginBottom: emptyEmojiGap }}>📊</Text>
          <Text style={{ color: themeStyle.text, fontSize: emptyTxtSz, fontWeight: '600', marginBottom: emptyTxtGap }}>No mood data available</Text>
          <Text style={{ color: themeStyle.label, fontSize: emptySubSz, textAlign: 'center', marginBottom: emptySubGap }}>Start tracking your moods to see analytics</Text>
          <TouchableOpacity style={{ backgroundColor: themeStyle.button, borderRadius: actBtnR, paddingHorizontal: actBtnPadH, paddingVertical: actBtnPadV }} onPress={goBack}>
            <Text style={{ color: themeStyle.buttonText, fontSize: actBtnTxtSz, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalEntries  = Object.values(analytics.mood_distribution).reduce((s, c) => s + c, 0);
  const topMood       = analytics.most_common_mood;
  const topMoodColors = moodColorMap[topMood] || ['#A78BFA', '#6D5DD3'];
  const intensityPct  = Math.min((analytics.average_intensity / 10) * 100, 100);
  const sortedDist    = Object.entries(analytics.mood_distribution).sort(([, a], [, b]) => b - a);
  const trendPoints   = analytics.weekly_trend.slice(-14);

  return (
    <View style={[styles.container, { backgroundColor: screenBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={screenBackground} />

      <LinearGradient colors={[screenBackground, '#2A1F3D', screenBackground]} style={styles.bgGradient} pointerEvents="none" />

      {/* Ambient glow blobs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.glow, { width: bLarge * 1.1, height: bLarge * 1.1, top: -bLarge * 0.3, right: -bLarge * 0.3, backgroundColor: 'rgba(167,139,250,0.06)' }]} />
        <View style={[styles.glow, { width: bMedium, height: bMedium, bottom: '18%', left: -bMedium * 0.35, backgroundColor: 'rgba(255,179,107,0.05)' }]} />
      </View>

      {/* Floating bubbles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[styles.bubble, { width: bMedium, height: bMedium, top: clamp(height * 0.06, 34, 62), right: -clamp(width * 0.12, 36, 56), backgroundColor: 'rgba(167,139,250,0.25)', transform: [{ translateY: b1y }, { translateX: b1x }] }]} />
        <Animated.View style={[styles.bubble, { width: bLarge, height: bLarge, top: -clamp(height * 0.12, 80, 120), left: -clamp(width * 0.18, 56, 88), backgroundColor: 'rgba(184,168,230,0.20)', transform: [{ translateY: b2y }, { translateX: b2x }] }]} />
        <Animated.View style={[styles.bubble, { width: clamp(width * 0.4, 120, 170), height: clamp(width * 0.4, 120, 170), bottom: clamp(height * 0.24, 160, 230), left: -clamp(width * 0.08, 20, 36), backgroundColor: 'rgba(167,139,250,0.22)', transform: [{ translateY: b3y }, { translateX: b3x }] }]} />
        <Animated.View style={[styles.bubble, { width: clamp(width * 0.48, 150, 200), height: clamp(width * 0.48, 150, 200), bottom: clamp(height * 0.12, 80, 120), right: -clamp(width * 0.14, 42, 70), backgroundColor: 'rgba(184,168,230,0.18)', transform: [{ translateY: b4y }, { translateX: b4x }] }]} />
        <Animated.View style={[styles.bubble, { width: bSmall, height: bSmall, top: '40%', right: clamp(width * 0.05, 14, 24), backgroundColor: 'rgba(167,139,250,0.15)', transform: [{ translateY: b5y }, { translateX: b5x }] }]} />
      </View>

      {/* Sticky header — smart back */}
      <StickyHeader scrollY={scrollY} firstWord="Mood" secondWord="Analytics" onBackPress={goBack} />

      {/* Fading large header */}
      <Animated.View style={[styles.headerContainer, {
        paddingTop: hTop,
        paddingHorizontal: pageInset,
        paddingBottom: hBotPad,
        opacity: scrollY.interpolate({ inputRange: [0, hFadeDist * 0.45, hFadeDist], outputRange: [1, 0, 0], extrapolate: 'clamp' }),
        transform: [{ translateY: scrollY.interpolate({ inputRange: [0, hFadeDist], outputRange: [0, -10], extrapolate: 'clamp' }) }],
      }]}>
        <TouchableOpacity
          style={[styles.backButton, { left: pageInset - 6, top: hTop + clamp(height * 0.003, 2, 5) - 6, width: hBtnSz, height: hBtnSz, borderRadius: hBtnR }]}
          onPress={goBack}
        >
          <FontAwesome name="chevron-left" size={hIconSz} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginTop: hMTop + 4 }}>
          <Text style={{ fontSize: hTitleSz, fontWeight: '800', textAlign: 'center' }}>
            <Text style={{ color: '#FFFFFF' }}>Mood </Text>
            <Text style={{ color: '#B8A8E6' }}>Analytics</Text>
          </Text>
          {/* ── underline gradient removed ── */}
        </View>
      </Animated.View>

      {/* Scrollable content */}
      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContent, {
          paddingHorizontal: pageInset,
          paddingTop: hEst + contTopPad + clamp(height * 0.016, 10, 16),
          paddingBottom: botPad,
        }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Time period pill */}
        <View style={[styles.timePeriodRow, { marginBottom: cGap }]}>
          <TouchableOpacity
            style={[styles.timePeriodTrigger, { paddingVertical: filtPadV, paddingHorizontal: filtPadH, borderRadius: filtR }]}
            activeOpacity={0.85}
            onPress={() => setShowPeriodModal(true)}
          >
            <FontAwesome name="calendar" size={filtChevSz} color="#B8A8E6" style={{ marginRight: 6 }} />
            <Text style={[styles.timePeriodTriggerText, { fontSize: filtTxtSz }]}>Last {selectedDays} days</Text>
            <FontAwesome name="chevron-down" size={filtChevSz} color="#B8A8E6" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* Hero summary card */}
        <View style={{ borderRadius: cR, overflow: 'hidden', marginBottom: cGap }}>
          <LinearGradient colors={[topMoodColors[0] + '33', topMoodColors[1] + '22', '#342949']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: cR }}>
            <View style={[styles.heroCard, { padding: cPad, borderRadius: cR }]}>
              <View style={[styles.heroTopRow, isCompactLayout && styles.heroTopRowCompact]}>
                <LinearGradient colors={topMoodColors} style={[styles.heroBadge, { width: isCompactLayout ? domCircleSz * 0.86 : domCircleSz, height: isCompactLayout ? domCircleSz * 0.86 : domCircleSz, borderRadius: isCompactLayout ? (domCircleSz * 0.86) / 2 : domCircleSz / 2, marginBottom: isCompactLayout ? clamp(height * 0.012, 8, 12) : 0 }]}>
                  <Text style={{ fontSize: domEmojiSz }}>{getMoodEmoji(topMood)}</Text>
                </LinearGradient>
                <View style={[styles.heroTextBlock, isCompactLayout && styles.heroTextBlockCompact]}>
                  <Text style={[styles.heroLabel, { fontSize: clamp(width * 0.031, 11, 13) }]}>DOMINANT MOOD</Text>
                  <Text style={[styles.heroMoodName, { fontSize: clamp(width * 0.064, 22, 28) }]}>{getMoodLabel(topMood)}</Text>
                  <Text style={[styles.heroSubLabel, { fontSize: clamp(width * 0.033, 12, 14) }]}>{analytics.mood_distribution[topMood] ?? 0}× recorded this period</Text>
                </View>
              </View>

              <View style={{ marginTop: clamp(height * 0.022, 14, 20) }}>
                <View style={styles.intensityLabelRow}>
                  <Text style={[styles.intensityLabel, { fontSize: clamp(width * 0.031, 11, 13) }]}>AVERAGE INTENSITY</Text>
                  <Text style={[styles.intensityValue, { fontSize: clamp(width * 0.045, 16, 20) }]}>
                    {analytics.average_intensity.toFixed(1)}
                    <Text style={{ fontSize: clamp(width * 0.028, 10, 12), color: '#B8A8E6' }}>/10</Text>
                  </Text>
                </View>
                <View style={[styles.intensityTrack, { borderRadius: clamp(height * 0.006, 4, 6), height: clamp(height * 0.012, 8, 11) }]}>
                  <LinearGradient colors={topMoodColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.intensityFill, { width: `${intensityPct}%`, borderRadius: clamp(height * 0.006, 4, 6) }]} />
                </View>
              </View>

              <View style={[styles.heroStatsRow, { marginTop: clamp(height * 0.022, 14, 20), gap: metricsGap }]}>
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { fontSize: metricValSz }]}>{totalEntries}</Text>
                  <Text style={[styles.heroStatLabel, { fontSize: clamp(width * 0.029, 10, 12) }]}>{'TOTAL\nENTRIES'}</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { fontSize: metricValSz }]}>{Object.keys(analytics.mood_distribution).length}</Text>
                  <Text style={[styles.heroStatLabel, { fontSize: clamp(width * 0.029, 10, 12) }]}>{'MOODS\nTRACKED'}</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatValue, { fontSize: metricValSz }]}>{selectedDays}</Text>
                  <Text style={[styles.heroStatLabel, { fontSize: clamp(width * 0.029, 10, 12) }]}>{'DAY\nPERIOD'}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Mood Distribution */}
        {sortedDist.length > 0 && (
          <View style={[styles.card, { backgroundColor: '#2C2344', borderRadius: cR, padding: cPad, marginBottom: cGap }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: '#FFFFFF', fontSize: secTitleSz }]}>Mood Breakdown</Text>
              <View style={[styles.sectionBadge, { borderRadius: clamp(width * 0.03, 10, 14) }]}>
                <Text style={[styles.sectionBadgeText, { fontSize: clamp(width * 0.028, 10, 12) }]}>{sortedDist.length} moods</Text>
              </View>
            </View>
            <View style={{ gap: distListGap, marginTop: secTitleBotGap }}>
              {sortedDist.map(([mood, count], idx) => {
                const pct    = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
                const colors = moodColorMap[mood] || ['#A78BFA', '#6D5DD3'];
                const isTop  = idx === 0;
                return (
                  <View key={mood}>
                    <View style={[styles.distributionHeader, { marginBottom: distItemGap }]}>
                      <View style={styles.distributionMoodInfo}>
                        <View style={[styles.distEmojiCircle, { width: clamp(width * 0.094, 34, 40), height: clamp(width * 0.094, 34, 40), borderRadius: clamp(width * 0.047, 17, 20), backgroundColor: colors[0] + '28', borderColor: colors[0] + '55' }]}>
                          <Text style={{ fontSize: distEmojiSz }}>{getMoodEmoji(mood)}</Text>
                        </View>
                        <View>
                          <Text style={[styles.distributionLabel, { color: '#FFFFFF', fontSize: bodyTxtSz }]}>{getMoodLabel(mood)}</Text>
                          {isTop && <Text style={[styles.topBadgeText, { fontSize: clamp(width * 0.026, 9, 11) }]}>TOP MOOD</Text>}
                        </View>
                      </View>
                      <View style={styles.distCountBlock}>
                        <Text style={[styles.distributionCount, { color: '#FFFFFF', fontSize: clamp(width * 0.04, 14, 16) }]}>{pct.toFixed(0)}%</Text>
                        <Text style={[styles.distCountSub, { fontSize: clamp(width * 0.028, 10, 12) }]}>{count}×</Text>
                      </View>
                    </View>
                    <View style={[styles.distributionBarBackground, { backgroundColor: '#3E3258', height: distBarH, borderRadius: distBarR }]}>
                      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.distributionBar, { width: `${pct}%`, borderRadius: distBarR }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Weekly Trend Sparkline */}
        {trendPoints.length > 0 && (() => {
          const vals     = trendPoints.map((d) => d.average_intensity);
          const maxVal   = Math.max(...vals, 1);
          const sparkGap = clamp(width * 0.016, 5, 8);
          const innerW   = width - pageInset * 2 - cPad * 2;
          const barW     = Math.max((innerW - sparkGap * Math.max(trendPoints.length - 1, 0)) / trendPoints.length, clamp(width * 0.028, 12, 20));
          const barMaxH  = clamp(height * 0.14, 80, 120);
          return (
            <View style={[styles.card, { backgroundColor: '#2C2344', borderRadius: cR, padding: cPad, marginBottom: cGap }]}>
              <Text style={[styles.sectionTitle, { color: '#FFFFFF', fontSize: secTitleSz, marginBottom: secTitleBotGap }]}>Weekly Trend</Text>
              <View style={[styles.sparklineRow, { height: barMaxH + clamp(height * 0.04, 26, 34), gap: sparkGap }]}>
                {trendPoints.map((point, i) => {
                  const barH    = Math.max((point.average_intensity / maxVal) * barMaxH, clamp(height * 0.006, 4, 6));
                  const dateStr = new Date(point.date).toLocaleDateString('en', { weekday: 'short' });
                  return (
                    <View key={i} style={[styles.sparkBarWrap, { width: barW }]}>
                      <LinearGradient colors={['#A78BFA', '#6D5DD3']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.sparkBar, { height: barH, borderRadius: clamp(barW * 0.3, 3, 6) }]} />
                      <Text style={[styles.sparkLabel, { fontSize: clamp(width * 0.022, 8, 10) }]} numberOfLines={1}>{dateStr}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* Common Triggers */}
        {analytics.common_triggers.length > 0 && (
          <View style={[styles.card, { backgroundColor: '#2C2344', borderRadius: cR, padding: cPad, marginBottom: cGap }]}>
            <Text style={[styles.sectionTitle, { color: '#FFFFFF', fontSize: secTitleSz, marginBottom: secTitleBotGap }]}>Common Triggers</Text>
            <View style={[styles.triggersContainer, { gap: triggerGap }]}>
              {analytics.common_triggers.map((trigger, index) => (
                <LinearGradient
                  key={index}
                  colors={['rgba(167,139,250,0.18)', 'rgba(109,93,211,0.10)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.triggerChip, { borderRadius: triggerChipR, paddingHorizontal: clamp(width * 0.04, 14, 18), paddingVertical: clamp(height * 0.012, 8, 10), borderColor: 'rgba(167,139,250,0.35)' }]}
                >
                  <Text style={[styles.triggerText, { color: '#E8DFFF', fontSize: triggerTxtSz }]}>{trigger}</Text>
                </LinearGradient>
              ))}
            </View>
          </View>
        )}

        {/* Insight footer */}
        <LinearGradient
          colors={['rgba(167,139,250,0.12)', 'rgba(109,93,211,0.06)']}
          style={[styles.infoCard, { borderRadius: cR, marginBottom: cGap, padding: clamp(width * 0.045, 16, 20), borderColor: 'rgba(167,139,250,0.2)', gap: infoGap }]}
        >
          <Text style={{ fontSize: infoEmojiSz, marginTop: 1 }}>💜</Text>
          <Text style={[styles.infoText, { color: '#CFC7EF', fontSize: bodyTxtSz, lineHeight: clamp(width * 0.05, 18, 22) }]}>
            Track consistently for deeper patterns. Your emotional data is private and helps personalise your therapy.
          </Text>
        </LinearGradient>

        <View style={{ height: botPad }} />
      </Animated.ScrollView>

      {/* Time period modal */}
      <Modal visible={showPeriodModal} transparent animationType="fade" onRequestClose={() => setShowPeriodModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPeriodModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: '#473F5A' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: '#FFFFFF', fontWeight: '700', fontSize: modalTitleSz }]}>Time Period</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowPeriodModal(false)}>
                <FontAwesome name="times" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {dayOptions.map((days) => (
              <TouchableOpacity
                key={days}
                style={[styles.modalOption, { paddingVertical: modalOptPadY, paddingHorizontal: modalOptPadX, borderRadius: modalOptR, backgroundColor: selectedDays === days ? '#5B5270' : 'transparent' }]}
                onPress={() => { setSelectedDays(days); setShowPeriodModal(false); }}
              >
                <Text style={[styles.modalOptionText, { color: '#FFFFFF', fontSize: modalOptTxtSz }]}>Last {days} days</Text>
                {selectedDays === days && <FontAwesome name="check" size={14} color="#FFB36B" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  bgGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  glow:       { position: 'absolute', borderRadius: 9999 },
  bubble:     { position: 'absolute', borderRadius: 9999 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  timePeriodRow:         { width: '100%', alignItems: 'flex-end' },
  timePeriodTrigger:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(167,139,250,0.15)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' },
  timePeriodTriggerText: { color: '#D6CFF0', fontWeight: '700' },
  heroCard:             { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  heroTopRow:           { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroTopRowCompact:    { flexDirection: 'column', alignItems: 'flex-start', gap: 0 },
  heroBadge:            { alignItems: 'center', justifyContent: 'center', shadowColor: '#A78BFA', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  heroTextBlock:        { flex: 1 },
  heroTextBlockCompact: { width: '100%' },
  heroLabel:            { color: '#9080B4', fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  heroMoodName:         { color: '#FFFFFF', fontWeight: '800', marginBottom: 4 },
  heroSubLabel:         { color: '#B8A8E6' },
  intensityLabelRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  intensityLabel:       { color: '#9080B4', fontWeight: '700', letterSpacing: 0.8 },
  intensityValue:       { color: '#FFFFFF', fontWeight: '800' },
  intensityTrack:       { backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  intensityFill:        { height: '100%' },
  heroStatsRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  heroStat:             { flex: 1, alignItems: 'center' },
  heroStatValue:        { color: '#FFFFFF', fontWeight: '800', marginBottom: 4 },
  heroStatLabel:        { color: '#7A6E9A', fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  heroStatDivider:      { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },
  card:                 { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  sectionHeaderRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:         { fontSize: 16, fontWeight: '700' },
  sectionBadge:         { backgroundColor: 'rgba(167,139,250,0.18)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', paddingHorizontal: 10, paddingVertical: 3 },
  sectionBadgeText:     { color: '#B8A8E6', fontWeight: '700' },
  distributionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  distributionMoodInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distEmojiCircle:      { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  distributionLabel:    { fontWeight: '600' },
  topBadgeText:         { color: '#FFB36B', fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
  distCountBlock:       { alignItems: 'flex-end' },
  distributionCount:    { fontWeight: '700' },
  distCountSub:         { color: '#7A6E9A', fontWeight: '600', marginTop: 1 },
  distributionBarBackground: { overflow: 'hidden' },
  distributionBar:      { height: '100%' },
  sparklineRow:         { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sparkBarWrap:         { alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  sparkBar:             { width: '100%', marginBottom: 5 },
  sparkLabel:           { color: '#7A6E9A', fontWeight: '600' },
  triggersContainer:    { flexDirection: 'row', flexWrap: 'wrap' },
  triggerChip:          { borderWidth: 1 },
  triggerText:          { fontWeight: '600' },
  infoCard:             { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1 },
  infoText:             { flex: 1 },
  emptyContainer:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent:         { width: '88%', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeaderRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalCloseButton:     { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  modalTitle:           {},
  modalOption:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalOptionText:      { fontWeight: '600' },
});