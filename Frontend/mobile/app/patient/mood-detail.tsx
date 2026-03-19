import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import api from '../utils/api';
import { FontAwesome } from '@expo/vector-icons';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

const moods = [
  { value: 'sad',         emoji: '😢', label: 'Sad',         color: '#6B8CFF' },
  { value: 'anxious',     emoji: '😰', label: 'Anxious',     color: '#8B9FFF' },
  { value: 'angry',       emoji: '😠', label: 'Angry',       color: '#FF8B8B' },
  { value: 'stressed',    emoji: '😫', label: 'Stressed',    color: '#FFA8A8' },
  { value: 'overwhelmed', emoji: '😵', label: 'Overwhelmed', color: '#FFB8B8' },
  { value: 'peaceful',    emoji: '😌', label: 'Peaceful',    color: '#A8E0FF' },
  { value: 'happy',       emoji: '😊', label: 'Happy',       color: '#C5DFFF' },
  { value: 'excited',     emoji: '🤩', label: 'Excited',     color: '#FFE0A8' },
  { value: 'grateful',    emoji: '🙏', label: 'Grateful',    color: '#D8FFB8' },
  { value: 'hopeful',     emoji: '🌟', label: 'Hopeful',     color: '#FFFFA8' },
];

interface MoodEntryDetail {
  id: string;
  mood_intensities: { [key: string]: number };
  dominant_mood?: string;
  dominant_moods?: string[];
  average_intensity?: number;
  moods_list?: string[];
  triggers: string;
  triggers_list: string[];
  activities?: string;
  notes: string;
  mood_date?: string;
  created_at: string;
  updated_at: string;
}

// ─── Shared glass card constants ──────────────────────────────────────────────
const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)',
  'rgba(167,139,250,0.08)',
  'rgba(52,41,73,0.72)',
];
const CARD_BG     = '#3F3752';
const CARD_BORDER = 'rgba(255,255,255,0.16)';

export default function MoodDetailScreen() {
  const params = useLocalSearchParams();
  const moodId = params.id as string;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ── Responsive tokens ──────────────────────────────────────────────────────
  const pi          = clamp(width * 0.05,   16, 22);
  const hTop        = insets.top + clamp(height * 0.017, 14, 22);
  const hBtnSz      = clamp(width * 0.105,  36, 42);
  const hBtnR       = hBtnSz / 2;
  const hIconSz     = clamp(width * 0.05,   18, 20);
  const hTitleSz    = clamp(width * 0.074,  24, 30);
  const hMTop       = clamp(height * 0.024, 18, 24);
  const hBotPad     = clamp(height * 0.004,  2,  6);
  const hBotMargin  = clamp(height * 0.018, 10, 16);
  const contTopPad  = clamp(height * 0.016, 10, 16);
  const contBotPad  = clamp(insets.bottom + height * 0.02, 24, 38);

  const cR          = clamp(width * 0.05,   14, 20);
  const cPad        = clamp(width * 0.05,   16, 22);
  const cGap        = clamp(height * 0.022, 14, 20);

  // bubble sizes
  const bLarge  = clamp(width * 0.74, 220, 310);
  const bMedium = clamp(width * 0.52, 170, 230);
  const bSmall  = clamp(width * 0.32,  96, 132);

  // hero
  const heroEmojiSz  = clamp(width * 0.22,  72, 96);
  const heroLabelSz  = clamp(width * 0.088, 28, 40);
  const heroDateSz   = clamp(width * 0.034, 12, 14);
  const heroScoreSz  = clamp(width * 0.038, 13, 15);

  // intensity rail
  const railPillW    = clamp(width * 0.28,  96, 120);
  const railPillH    = clamp(height * 0.14, 96, 120);
  const railEmojiSz  = clamp(width * 0.1,   34, 44);
  const railLabelSz  = clamp(width * 0.032, 11, 13);
  const railValSz    = clamp(width * 0.034, 12, 14);

  // section
  const secTitleSz   = clamp(width * 0.038, 13, 15);
  const bodyTxtSz    = clamp(width * 0.038, 14, 16);
  const bodyLH       = Math.round(bodyTxtSz * 1.6);
  const chipPadH     = clamp(width * 0.036, 12, 16);
  const chipPadV     = clamp(height * 0.011,  7,  9);
  const chipR        = clamp(width * 0.05,   16, 22);
  const chipTxtSz    = clamp(width * 0.032,  11, 13);

  // action buttons
  const actR         = clamp(width * 0.045, 14, 18);
  const actPad       = clamp(height * 0.02,  14, 18);
  const actTxtSz     = clamp(width * 0.042,  14, 16);

  const [moodEntry, setMoodEntry] = useState<MoodEntryDetail | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  // bubble refs
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

  const loadMoodDetail = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const response = await api.get<MoodEntryDetail>(`/patients/mood/${moodId}/`);
      setMoodEntry(response.data);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to load mood entry details.';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }, [moodId]);

  useEffect(() => { loadMoodDetail(); }, [loadMoodDetail]);

  // ── Bubble animations ──────────────────────────────────────────────────────
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
        c.start(); return c;
      };
      const anims = [
        fly(b1y, b1x, 8000, 7000), fly(b2y, b2x, 10000, 8000),
        fly(b3y, b3x, 9000, 7500), fly(b4y, b4x, 8500, 7200),
        fly(b5y, b5x, 9500, 8200),
      ];
      return () => anims.forEach((a) => a.stop());
    }, [])
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getMoodEmoji = (v: string) => moods.find((m) => m.value === v)?.emoji ?? '😐';
  const getMoodLabel = (v: string) => moods.find((m) => m.value === v)?.label ?? v;
  const getMoodColor = (v: string) => moods.find((m) => m.value === v)?.color ?? '#A8B5FF';
  const getIntensityColor = (i: number) => i >= 4 ? '#4CAF50' : i === 3 ? '#FF9800' : '#F44336';

  const formatDate = (s: string) => new Date(s).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const handleDelete = () => {
    Alert.alert('Delete Mood Entry', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/patients/mood/${moodId}/`);
            router.back();
            setTimeout(() => Alert.alert('Success', 'Mood entry deleted successfully.'), 100);
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.detail || 'Failed to delete mood entry.');
          }
        },
      },
    ]);
  };

  // ── Shared background ─────────────────────────────────────────────────────
  const Bg = () => (
    <>
      <LinearGradient
        colors={['#342949', '#2A1F3D', '#342949']}
        style={[s.fill, { height }]}
        pointerEvents="none"
      />
      <View style={s.fill} pointerEvents="none">
        {/* 1 odd */}
        <Animated.View style={[s.bubble, { width: bMedium, height: bMedium,
          top: clamp(height*0.06,34,62), right: -clamp(width*0.12,36,56),
          backgroundColor: 'rgba(167,139,250,0.25)' },
          { transform: [{ translateY: b1y },{ translateX: b1x }] }]} />
        {/* 2 even */}
        <Animated.View style={[s.bubble, { width: bLarge, height: bLarge,
          top: -clamp(height*0.12,80,120), left: -clamp(width*0.18,56,88),
          backgroundColor: 'rgba(184,168,230,0.20)' },
          { transform: [{ translateY: b2y },{ translateX: b2x }] }]} />
        {/* 3 odd */}
        <Animated.View style={[s.bubble, { width: clamp(width*0.4,120,170), height: clamp(width*0.4,120,170),
          bottom: clamp(height*0.24,160,230), left: -clamp(width*0.08,20,36),
          backgroundColor: 'rgba(167,139,250,0.22)' },
          { transform: [{ translateY: b3y },{ translateX: b3x }] }]} />
        {/* 4 even */}
        <Animated.View style={[s.bubble, { width: clamp(width*0.48,150,200), height: clamp(width*0.48,150,200),
          bottom: clamp(height*0.12,80,120), right: -clamp(width*0.14,42,70),
          backgroundColor: 'rgba(184,168,230,0.18)' },
          { transform: [{ translateY: b4y },{ translateX: b4x }] }]} />
        {/* 5 odd */}
        <Animated.View style={[s.bubble, { width: bSmall, height: bSmall,
          top: '40%', right: clamp(width*0.05,14,24),
          backgroundColor: 'rgba(167,139,250,0.15)' },
          { transform: [{ translateY: b5y },{ translateX: b5x }] }]} />
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: '#342949' }]}>
        <Bg />
        <TabLoaderCard fullScreen title="Loading mood details..." subtitle="Gathering your entry insights" spinnerColor="#A78BFA" />
      </View>
    );
  }

  if (error || !moodEntry) {
    return (
      <View style={[s.container, { backgroundColor: '#342949' }]}>
        <Bg />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: clamp(width*0.1,28,44) }}>
          <Text style={{ color: '#EF4444', fontSize: clamp(width*0.048,16,20), fontWeight: '600', marginBottom: 20, textAlign: 'center' }}>
            {error || 'Mood entry not found'}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#FFB36B', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const dominantMoods = moodEntry.dominant_moods || [];
  const dominantMood  = moodEntry.dominant_mood || (dominantMoods.length > 0 ? dominantMoods[0] : '');
  const tieLabel      = dominantMoods.length > 1
    ? `Tied: ${dominantMoods.map(getMoodLabel).join(' & ')}`
    : null;
  const moodColor  = getMoodColor(dominantMood);
  const moodsArray = moodEntry.mood_intensities
    ? Object.entries(moodEntry.mood_intensities)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([mood, intensity]) => ({
          mood, intensity: intensity as number,
          emoji: getMoodEmoji(mood), label: getMoodLabel(mood), color: getMoodColor(mood),
        }))
    : [];

  const triggerList = moodEntry.triggers_list?.length > 0
    ? moodEntry.triggers_list
    : moodEntry.triggers
    ? moodEntry.triggers.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: '#342949' }]}>
      <Bg />

      <StickyHeader
        scrollY={scrollY}
        firstWord="Mood"
        secondWord="Details"
        onBackPress={() => router.push('/patient/mood?tab=history')}
      />

      {/* Fading large header — unchanged */}
      <Animated.View style={[s.headerContainer, {
        paddingTop: hTop, paddingHorizontal: pi,
        paddingBottom: hBotPad, marginBottom: hBotMargin,
        opacity: scrollY.interpolate({ inputRange: [0,100,150], outputRange: [1,0.5,0], extrapolate: 'clamp' }),
      }]}>
        <TouchableOpacity
          onPress={() => router.push('/patient/mood?tab=history')}
          style={[s.backButton, {
            left: pi - 5,
            top: hTop + clamp(height*0.003,2,5) - 6,
            width: hBtnSz, height: hBtnSz, borderRadius: hBtnR,
          }]}
        >
          <FontAwesome name="chevron-left" size={hIconSz} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { fontSize: hTitleSz, marginTop: hMTop + 4 }]}>
          <Text style={{ color: '#FFFFFF' }}>Mood </Text>
          <Text style={{ color: '#B8A8E6' }}>Details</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{ paddingHorizontal: pi, paddingTop: contTopPad, paddingBottom: contBotPad }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >

        {/* ════════════════════════════════════════════════════════
            HERO — full-bleed mood showcase, not a plain card
        ════════════════════════════════════════════════════════ */}
        <View style={[s.card, {
          borderRadius: cR, overflow: 'hidden',
          backgroundColor: CARD_BG, borderColor: CARD_BORDER,
          marginBottom: cGap,
        }]}>
          {/* Deep mood-coloured gradient — this card IS the colour */}
          <LinearGradient
            colors={[`${moodColor}55`, `${moodColor}22`, 'rgba(52,41,73,0.90)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Dual accent strip */}
          <View style={{ flexDirection: 'row', height: 3 }}>
            <View style={{ flex: 1, backgroundColor: '#A78BFA' }} />
            <View style={{ flex: 1, backgroundColor: '#FFB36B' }} />
          </View>

          <View style={{ padding: cPad, alignItems: 'center', paddingTop: clamp(height*0.038, 26, 36) }}>
            {/* Giant emoji — no circle, just floats */}
            <Text style={{ fontSize: heroEmojiSz, marginBottom: clamp(height*0.016, 10, 16) }}>
              {getMoodEmoji(dominantMood)}
            </Text>

            {/* Dominant mood label */}
            <Text style={{ color: '#FFFFFF', fontSize: heroLabelSz, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6, textAlign: 'center' }}>
              {getMoodLabel(dominantMood)}
            </Text>
            {tieLabel && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 }}>
                <Text style={{ color: '#CEC2EE', fontSize: clamp(width*0.03, 11, 13), fontWeight: '600' }}>{tieLabel}</Text>
              </View>
            )}

            {/* Date */}
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: heroDateSz, marginBottom: clamp(height*0.028, 18, 26) }}>
              {formatDate(moodEntry.created_at)}
            </Text>

            {/* Average intensity bar — sits inside hero */}
            {moodEntry.average_intensity && (
              <View style={{ width: '100%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: clamp(width*0.028,9,11), fontWeight: '700', letterSpacing: 1.4 }}>
                    AVERAGE INTENSITY
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: heroScoreSz, fontWeight: '800' }}>
                    {moodEntry.average_intensity.toFixed(1)}
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontWeight: '500' }}>/5</Text>
                  </Text>
                </View>
                {/* Gradient bar */}
                <View style={{ height: clamp(height*0.012, 8, 11), backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden' }}>
                  <LinearGradient
                    colors={['#A78BFA', '#FFB36B']}
                    start={[0,0]} end={[1,0]}
                    style={{ height: '100%', width: `${Math.min((moodEntry.average_intensity / 5) * 100, 100)}%`, borderRadius: 8 }}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════
            MOOD INTENSITIES — horizontal scrolling pill rail
            (no grid boxes — flows naturally, sorted by intensity)
        ════════════════════════════════════════════════════════ */}
        {moodsArray.length > 0 && (
          <View style={{ marginBottom: cGap }}>
            {/* Section label — floating above, not inside a card */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: clamp(height*0.012, 8, 12), paddingHorizontal: 2 }}>
              <View style={{ width: 3, height: clamp(height*0.022, 14, 18), backgroundColor: '#A78BFA', borderRadius: 2 }} />
              <Text style={{ color: '#B8A8E6', fontSize: secTitleSz, fontWeight: '700', letterSpacing: 0.8 }}>
                MOOD BREAKDOWN
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: clamp(width*0.03, 10, 14) }}>
              {moodsArray.map(({ mood, intensity, emoji, label, color }) => (
                <View key={mood} style={[s.card, {
                  width: railPillW, height: railPillH,
                  borderRadius: cR, overflow: 'hidden',
                  backgroundColor: CARD_BG, borderColor: CARD_BORDER,
                  alignItems: 'center', justifyContent: 'center',
                }]}>
                  <LinearGradient colors={CARD_GRAD} start={{x:0,y:0}} end={{x:1,y:1}}
                    style={StyleSheet.absoluteFill} pointerEvents="none" />
                  {/* Colour-coded top strip per mood */}
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: getIntensityColor(intensity) }} />

                  <Text style={{ fontSize: railEmojiSz }}>{emoji}</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: railLabelSz, fontWeight: '700', marginTop: 6, textAlign: 'center' }}>
                    {label}
                  </Text>
                  {/* Intensity dot row */}
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
                    {[1,2,3,4,5].map((dot) => (
                      <View key={dot} style={{
                        width: clamp(width*0.022, 7, 9), height: clamp(width*0.022, 7, 9),
                        borderRadius: 5,
                        backgroundColor: dot <= intensity
                          ? getIntensityColor(intensity)
                          : 'rgba(255,255,255,0.12)',
                      }} />
                    ))}
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: railValSz - 1, marginTop: 5 }}>
                    {intensity}/5
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════
            CONTEXT CARD — triggers + activities + notes
            All in ONE card with internal section dividers
            so they feel unified, not like a form dump
        ════════════════════════════════════════════════════════ */}
        {(triggerList.length > 0 || moodEntry.activities || moodEntry.notes) && (
          <View style={[s.card, {
            borderRadius: cR, overflow: 'hidden',
            backgroundColor: CARD_BG, borderColor: CARD_BORDER,
            marginBottom: cGap,
          }]}>
            <LinearGradient colors={CARD_GRAD} start={{x:0,y:0}} end={{x:1,y:1}}
              style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={{ height: 3, backgroundColor: '#FFB36B' }} />

            <View style={{ padding: cPad, gap: clamp(height*0.024, 16, 22) }}>

              {/* Triggers */}
              {triggerList.length > 0 && (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: clamp(height*0.014, 10, 14) }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,179,107,0.18)', borderWidth: 1, borderColor: 'rgba(255,179,107,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13 }}>🎯</Text>
                    </View>
                    <Text style={{ color: '#FFB36B', fontSize: secTitleSz, fontWeight: '700', letterSpacing: 0.5 }}>
                      Triggers
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: clamp(width*0.022, 7, 10) }}>
                    {triggerList.map((trigger, i) => (
                      <View key={i} style={{
                        backgroundColor: 'rgba(255,179,107,0.10)',
                        borderWidth: 1, borderColor: 'rgba(255,179,107,0.30)',
                        borderRadius: chipR,
                        paddingHorizontal: chipPadH, paddingVertical: chipPadV,
                      }}>
                        <Text style={{ color: '#FFB36B', fontSize: chipTxtSz, fontWeight: '600' }}>{trigger}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Divider between sections */}
              {triggerList.length > 0 && (moodEntry.activities || moodEntry.notes) && (
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
              )}

              {/* Activities */}
              {moodEntry.activities && (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: clamp(height*0.012, 8, 12) }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(167,139,250,0.18)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13 }}>🏃</Text>
                    </View>
                    <Text style={{ color: '#A78BFA', fontSize: secTitleSz, fontWeight: '700', letterSpacing: 0.5 }}>
                      Activities
                    </Text>
                  </View>
                  <Text style={{ color: '#CEC2EE', fontSize: bodyTxtSz, lineHeight: bodyLH }}>
                    {moodEntry.activities}
                  </Text>
                </View>
              )}

              {moodEntry.activities && moodEntry.notes && (
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
              )}

              {/* Notes */}
              {moodEntry.notes && (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: clamp(height*0.012, 8, 12) }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(167,139,250,0.18)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 13 }}>📝</Text>
                    </View>
                    <Text style={{ color: '#A78BFA', fontSize: secTitleSz, fontWeight: '700', letterSpacing: 0.5 }}>
                      Notes
                    </Text>
                  </View>
                  {/* Large opening quote */}
                  <Text style={{ color: '#A78BFA', fontSize: clamp(width*0.16,52,72), lineHeight: clamp(width*0.1,34,48), fontWeight: '900', opacity: 0.2, marginBottom: -clamp(height*0.01,6,10), marginLeft: -2 }}>
                    "
                  </Text>
                  <Text style={{ color: '#CEC2EE', fontSize: bodyTxtSz, lineHeight: bodyLH }}>
                    {moodEntry.notes}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════
            ACTION BUTTONS — edit left, delete right
            Edit gets gradient, delete stays outlined danger
        ════════════════════════════════════════════════════════ */}
        <View style={{ flexDirection: 'row', gap: clamp(width*0.03, 10, 14), marginTop: clamp(height*0.012, 8, 12) }}>

          {/* Edit — gradient fill */}
          <TouchableOpacity
            style={{ flex: 1, borderRadius: actR, overflow: 'hidden' }}
            onPress={() => router.push(`/patient/mood-edit?id=${moodId}`)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#A78BFA', '#7C5CE0']}
              start={[0,0]} end={[1,1]}
              style={{ paddingVertical: actPad, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
            >
              <FontAwesome name="pencil" size={clamp(width*0.038, 13, 15)} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: actTxtSz, fontWeight: '700' }}>Edit Entry</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Delete — outlined danger */}
          <TouchableOpacity
            style={{
              flex: 1, borderRadius: actR,
              paddingVertical: actPad,
              backgroundColor: 'rgba(239,68,68,0.08)',
              borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.35)',
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
            }}
            onPress={handleDelete}
            activeOpacity={0.85}
          >
            <FontAwesome name="trash" size={clamp(width*0.038, 13, 15)} color="#EF4444" />
            <Text style={{ color: '#EF4444', fontSize: actTxtSz, fontWeight: '700' }}>Delete</Text>
          </TouchableOpacity>

        </View>

        <View style={{ height: contBotPad }} />
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:     { flex: 1 },
  fill:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bubble:        { position: 'absolute', borderRadius: 9999 },

  headerContainer: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 26, marginBottom: 14 },
  backButton:    {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  headerTitle:   { fontSize: 26, fontWeight: '800', marginBottom: 10, marginTop: 20, textAlign: 'center' },

  card: {
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 7,
    borderWidth: 1,
  },
});
