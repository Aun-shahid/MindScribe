import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Slider from '@react-native-community/slider';
import api from '../utils/api';
import { FontAwesome } from '@expo/vector-icons';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Helpers ────────────────────────────────────────────────────────────────
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

// ─── Data ────────────────────────────────────────────────────────────────────
const moods = [
  { value: 'happy',       emoji: '😊', label: 'Happy',       color: '#FFD700' },
  { value: 'sad',         emoji: '😢', label: 'Sad',         color: '#6B8CFF' },
  { value: 'angry',       emoji: '😠', label: 'Angry',       color: '#FF6B6B' },
  { value: 'anxious',     emoji: '😰', label: 'Anxious',     color: '#FFA500' },
  { value: 'peaceful',    emoji: '😌', label: 'Peaceful',    color: '#87CEEB' },
  { value: 'excited',     emoji: '🤩', label: 'Excited',     color: '#FF69B4' },
  { value: 'grateful',    emoji: '🙏', label: 'Grateful',    color: '#98FB98' },
  { value: 'overwhelmed', emoji: '😵', label: 'Overwhelmed', color: '#DDA0DD' },
  { value: 'hopeful',     emoji: '🌟', label: 'Hopeful',     color: '#FFE4B5' },
  { value: 'stressed',    emoji: '😫', label: 'Stressed',    color: '#FF8C00' },
];

const moodCardThemes: Record<string, { colors: [string, string]; wave: string }> = {
  happy:       { colors: ['#F4C400', '#F5A300'], wave: 'rgba(255,226,120,0.78)' },
  excited:     { colors: ['#D94A9B', '#F04293'], wave: 'rgba(242,152,212,0.6)' },
  grateful:    { colors: ['#08C768', '#3FD481'], wave: 'rgba(145,234,183,0.55)' },
  hopeful:     { colors: ['#F9C61A', '#F4A51C'], wave: 'rgba(255,224,141,0.7)' },
  peaceful:    { colors: ['#6AB8E7', '#169FDF'], wave: 'rgba(144,215,247,0.52)' },
  anxious:     { colors: ['#F58A00', '#F16600'], wave: 'rgba(255,184,137,0.58)' },
  stressed:    { colors: ['#EE5D67', '#F76722'], wave: 'rgba(255,173,142,0.6)' },
  overwhelmed: { colors: ['#A666E6', '#8B39E5'], wave: 'rgba(204,162,246,0.58)' },
  sad:         { colors: ['#4F8FE3', '#2B68DB'], wave: 'rgba(156,191,255,0.56)' },
  angry:       { colors: ['#E31829', '#C80020'], wave: 'rgba(255,166,179,0.55)' },
};

const commonTriggers = [
  'Work', 'Family', 'Relationships', 'Health',
  'Money', 'Sleep', 'Social', 'Weather',
];

// ─── Glassy card constants ────────────────────────────────────────────────────
const CARD_GRADIENT_COLORS = [
  'rgba(255,179,107,0.11)',
  'rgba(167,139,250,0.08)',
  'rgba(52,41,73,0.72)',
] as const;
const CARD_BG     = '#3F3752';
const CARD_BORDER = 'rgba(255,255,255,0.16)';

// ─── Types ───────────────────────────────────────────────────────────────────
interface MoodEntryDetail {
  id: string;
  mood_intensities: { [key: string]: number };
  triggers: string;
  triggers_list: string[];
  activities: string;
  notes: string;
  mood_date: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function MoodEditScreen() {
  const params        = useLocalSearchParams();
  const moodId        = params.id as string;
  const { width, height } = useWindowDimensions();
  const insets        = useSafeAreaInsets();

  // ── Responsive tokens ──────────────────────────────────────────────────────
  const pageInset           = clamp(width * 0.05,  16, 22);
  const headerTopPadding    = insets.top + clamp(height * 0.017, 14, 22);
  const headerButtonSize    = clamp(width * 0.105, 36, 42);
  const headerButtonRadius  = headerButtonSize / 2;
  const headerIconSize      = clamp(width * 0.05,  18, 20);
  const headerTitleSize     = clamp(width * 0.074, 24, 30);
  const headerTitleMarginTop= clamp(height * 0.024, 18, 24);
  const headerBottomPad     = clamp(height * 0.004,  2,  6);
  const headerBottomMargin  = clamp(height * 0.018, 10, 16);
  const contentTopPad       = clamp(height * 0.016, 10, 16);
  const contentBottomPad    = clamp(insets.bottom + height * 0.02, 24, 38);

  // card / section
  const cardRadius          = clamp(width * 0.062, 20, 28);
  const cardPadX            = clamp(width * 0.055, 18, 24);
  const cardPadY            = clamp(height * 0.032, 20, 28);
  const cardBottomGap       = clamp(height * 0.02,  12, 18);
  const sectionTitleSize    = clamp(width * 0.044, 15, 18);
  const helperTextSize      = clamp(width * 0.035, 13, 15);
  const bodyTextSize        = clamp(width * 0.038, 14, 16);

  // mood card (pick-mood row)
  const moodCardMinHeight   = clamp(height * 0.24, 170, 220);
  const moodCardTopPad      = clamp(height * 0.034, 22, 32);
  const moodCardRadius      = clamp(width * 0.07,  22, 30);
  const moodChoiceEmojiSize = clamp(width * 0.17,  58, 72);
  const moodChoiceLabelSize = clamp(width * 0.046, 16, 19);

  // intensity
  const controlRadius       = clamp(width * 0.045, 14, 20);
  const intensityHeroSize   = clamp(width * 0.18,  64, 80);
  const intensityLabelSize  = clamp(width * 0.04,  14, 17);

  // triggers
  const triggerChipRadius   = clamp(width * 0.05,  16, 22);
  const triggerChipPadH     = clamp(width * 0.04,  14, 18);
  const triggerChipPadV     = clamp(height * 0.013,  8, 11);
  const triggerTextSize     = clamp(width * 0.034, 12, 14);

  // inputs
  const inputMinHeight      = clamp(height * 0.07,  48, 60);
  const textAreaMinHeight   = clamp(height * 0.16, 108, 140);
  const inputFontSize       = clamp(width * 0.039, 14, 16);

  // save button
  const saveButtonRadius    = clamp(width * 0.062, 18, 24);
  const saveButtonMinHeight = clamp(height * 0.062, 46, 54);

  // icon badge
  const iconBadgeSize       = clamp(width * 0.076, 26, 32);
  const iconBadgeRadius     = clamp(width * 0.038, 13, 16);
  const iconSize            = clamp(width * 0.032, 11, 13);

  // ── Bubble sizes (relative — matching CreateJournal) ──────────────────────
  const bubbleLarge  = clamp(width * 0.74, 220, 310);
  const bubbleMedium = clamp(width * 0.52, 170, 230);
  const bubbleSmall  = clamp(width * 0.32,  96, 132);

  // ── State ─────────────────────────────────────────────────────────────────
  const [loading,   setLoading]   = useState(true);
  const [submitting,setSubmitting]= useState(false);
  const [moodEntry, setMoodEntry] = useState<MoodEntryDetail | null>(null);

  // which mood card is selected in edit (mirrors "entry" tab UX)
  const [lastSelectedMood, setLastSelectedMood] = useState<string | null>(null);
  const selectedMood      = moods.find((m) => m.value === lastSelectedMood) || null;
  const selectedMoodTheme = selectedMood
    ? moodCardThemes[selectedMood.value] || moodCardThemes.happy
    : null;

  const [moodIntensities, setMoodIntensities] = useState<{ [key: string]: number }>(
    Object.fromEntries(moods.map((m) => [m.value, 1]))
  );
  const [globalIntensity,   setGlobalIntensity]   = useState(3);
  const [selectedTriggers,  setSelectedTriggers]  = useState<string[]>([]);
  const [activities,        setActivities]        = useState('');
  const [notes,             setNotes]             = useState('');

  // ── Animated values ───────────────────────────────────────────────────────
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

  // ── Bubble animations — restarted on every focus ──────────────────────────
  useFocusEffect(
    useCallback(() => {
      // Reset so bubbles don't snap on re-focus
      [bubble1Y, bubble1X, bubble2Y, bubble2X, bubble3Y, bubble3X,
       bubble4Y, bubble4X, bubble5Y, bubble5X].forEach((v) => v.setValue(0));

      const createFloatingAnimation = (
        valueY: Animated.Value,
        valueX: Animated.Value,
        durationY: number,
        durationX: number
      ) => {
        const composite = Animated.parallel([
          Animated.loop(
            Animated.sequence([
              Animated.timing(valueY, { toValue: -50, duration: durationY, useNativeDriver: true }),
              Animated.timing(valueY, { toValue:  50, duration: durationY, useNativeDriver: true }),
            ])
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(valueX, { toValue:  30, duration: durationX, useNativeDriver: true }),
              Animated.timing(valueX, { toValue: -30, duration: durationX, useNativeDriver: true }),
            ])
          ),
        ]);
        composite.start();
        return composite;
      };

      const anims = [
        createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000),
        createFloatingAnimation(bubble2Y, bubble2X, 10000, 8000),
        createFloatingAnimation(bubble3Y, bubble3X, 9000, 7500),
        createFloatingAnimation(bubble4Y, bubble4X, 8500, 7200),
        createFloatingAnimation(bubble5Y, bubble5X, 9500, 8200),
      ];

      return () => { anims.forEach((a) => a.stop()); };
    }, [bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y,
        bubble4X, bubble4Y, bubble5X, bubble5Y])
  );

  // ── Load existing entry ───────────────────────────────────────────────────
  useEffect(() => { loadMoodEntry(); }, [moodId]);

  const loadMoodEntry = async () => {
    try {
      setLoading(true);
      const response = await api.get<MoodEntryDetail>(`/patients/mood/${moodId}/`);
      const entry = response.data;
      setMoodEntry(entry);

      if (entry.mood_intensities) {
        const intensities = Object.fromEntries(moods.map((m) => [m.value, 1]));
        Object.entries(entry.mood_intensities).forEach(([mood, intensity]) => {
          intensities[mood] = intensity as number;
        });
        setMoodIntensities(intensities);

        // Determine the dominant saved mood for the card UI
        const dominant = Object.entries(entry.mood_intensities).reduce(
          (best, [m, v]) => (v > best[1] ? [m, v] : best),
          ['', 0]
        );
        if (dominant[0]) {
          setLastSelectedMood(dominant[0] as string);
          setGlobalIntensity(dominant[1] as number);
        }
      }

      if (entry.triggers_list && entry.triggers_list.length > 0) {
        setSelectedTriggers(entry.triggers_list);
      } else if (entry.triggers) {
        setSelectedTriggers(entry.triggers.split(',').map((t) => t.trim()).filter(Boolean));
      }

      setActivities(entry.activities || '');
      setNotes(entry.notes || '');
    } catch (error: any) {
      console.error('❌ Error loading mood entry:', error);
      Alert.alert('Error', 'Failed to load mood entry. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateMoodIntensity = (moodValue: string, intensity: number) => {
    setMoodIntensities((prev) => ({ ...prev, [moodValue]: intensity }));
  };

  const selectMoodCard = (moodValue: string) => {
    const currentIntensity = moodIntensities[moodValue] > 1
      ? moodIntensities[moodValue]
      : globalIntensity;
    const next: { [k: string]: number } = {};
    moods.forEach((m) => { next[m.value] = m.value === moodValue ? currentIntensity : 1; });
    setMoodIntensities(next);
    setLastSelectedMood(moodValue);
    setGlobalIntensity(currentIntensity);
  };

  const clearSelectedMood = () => {
    const reset: { [k: string]: number } = {};
    moods.forEach((m) => { reset[m.value] = 1; });
    setMoodIntensities(reset);
    setLastSelectedMood(null);
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]
    );
  };

  const getIntensityColor = (value: number) => {
    const palette = ['#FF4D8D', '#FF7A78', '#FFC12D', '#8BDA67', '#22D3AE'];
    return palette[Math.max(0, Math.min(4, value - 1))];
  };

  const handleUpdate = async () => {
    const activeMoods = Object.entries(moodIntensities)
      .filter(([_, v]) => v > 1)
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as { [k: string]: number });

    if (Object.keys(activeMoods).length === 0) {
      Alert.alert('No Moods Selected', 'Please rate at least one mood with intensity 2 or higher.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        mood_intensities: activeMoods,
        triggers_list: selectedTriggers,
        activities: activities.trim(),
        notes: notes.trim(),
      };
      await api.put(`/patients/mood/${moodId}/`, payload);
      Alert.alert('Success', 'Mood entry updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('❌ Error updating mood entry:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail ||
          error.response?.data?.message ||
          'Failed to update mood entry. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <TabLoaderCard
        fullScreen
        title="Loading mood entry..."
        subtitle="Preparing your mood editor"
        spinnerColor="#A78BFA"
      />
    );
  }

  // ─── Shared card wrapper render helper ────────────────────────────────────
  const GlassCard = ({
    children,
    accentColor = '#A78BFA',
    style,
  }: {
    children: React.ReactNode;
    accentColor?: string;
    style?: object;
  }) => (
    <View
      style={[
        {
          backgroundColor: CARD_BG,
          borderWidth: 1,
          borderColor: CARD_BORDER,
          borderRadius: cardRadius,
          overflow: 'hidden',
          marginBottom: cardBottomGap,
          shadowColor: '#120A24',
          shadowOpacity: 0.22,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 18,
          elevation: 7,
        },
        style,
      ]}
    >
      {/* Gradient overlay */}
      <LinearGradient
        colors={CARD_GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: cardRadius, zIndex: -1 }]}
        pointerEvents="none"
      />
      {/* Accent strip */}
      <View style={{ height: 3, backgroundColor: accentColor, width: '100%' }} />
      <View style={{ paddingHorizontal: cardPadX, paddingVertical: cardPadY }}>
        {children}
      </View>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── Background gradient ── */}
      <LinearGradient
        colors={['#342949', '#2A1F3D', '#342949']}
        style={[styles.screenGradient, { height }]}
        pointerEvents="none"
      />

      {/* ── Floating bubbles ── */}
      <View style={styles.floatingBubbles} pointerEvents="none">
        {/* 1 — odd → warm purple */}
        <Animated.View style={[styles.bubble, {
          width: bubbleMedium, height: bubbleMedium,
          top: clamp(height * 0.06, 34, 62),
          right: -clamp(width * 0.12, 36, 56),
          backgroundColor: 'rgba(167,139,250,0.25)',
        }, { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }]} />
        {/* 2 — even → cool light purple/blue */}
        <Animated.View style={[styles.bubble, {
          width: bubbleLarge, height: bubbleLarge,
          top: -clamp(height * 0.12, 80, 120),
          left: -clamp(width * 0.18, 56, 88),
          backgroundColor: 'rgba(184,168,230,0.20)',
        }, { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }]} />
        {/* 3 — odd → warm purple */}
        <Animated.View style={[styles.bubble, {
          width: clamp(width * 0.4, 120, 170),
          height: clamp(width * 0.4, 120, 170),
          bottom: clamp(height * 0.24, 160, 230),
          left: -clamp(width * 0.08, 20, 36),
          backgroundColor: 'rgba(167,139,250,0.22)',
        }, { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }]} />
        {/* 4 — even → cool light purple/blue */}
        <Animated.View style={[styles.bubble, {
          width: clamp(width * 0.48, 150, 200),
          height: clamp(width * 0.48, 150, 200),
          bottom: clamp(height * 0.12, 80, 120),
          right: -clamp(width * 0.14, 42, 70),
          backgroundColor: 'rgba(184,168,230,0.18)',
        }, { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }]} />
        {/* 5 — odd → warm purple */}
        <Animated.View style={[styles.bubble, {
          width: bubbleSmall, height: bubbleSmall,
          top: '40%',
          right: clamp(width * 0.05, 14, 24),
          backgroundColor: 'rgba(167,139,250,0.15)',
        }, { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }]} />
      </View>

      {/* ── Sticky header ── */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Edit Mood"
        secondWord="Entry"
        onBackPress={() => router.replace(`/patient/mood-detail?id=${moodId}`)}
      />

      {/* ── Animated large header ── */}
      <Animated.View style={[styles.headerContainer, {
        paddingTop:       headerTopPadding,
        paddingHorizontal:pageInset,
        paddingBottom:    headerBottomPad,
        marginBottom:     headerBottomMargin,
        opacity: scrollY.interpolate({
          inputRange:  [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        }),
      }]}>
        <TouchableOpacity
          onPress={() => router.replace(`/patient/mood-detail?id=${moodId}`)}
          style={[styles.backButton, {
            left:         pageInset - 5,
            top:          headerTopPadding + clamp(height * 0.003, 2, 5) - 6,
            width:        headerButtonSize,
            height:       headerButtonSize,
            borderRadius: headerButtonRadius,
          }]}
        >
          <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, {
          fontSize:  headerTitleSize,
          marginTop: headerTitleMarginTop + 4,
        }]}>
          <Text style={styles.headerWhite}>Edit Mood </Text>
          <Text style={styles.headerPurple}>Entry</Text>
        </Text>
      </Animated.View>

      {/* ── Scrollable body ── */}
      <Animated.ScrollView
        contentContainerStyle={{
          paddingHorizontal: pageInset,
          paddingTop:        contentTopPad,
          paddingBottom:     contentBottomPad,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* ── Subtitle ── */}
        <Text style={[styles.subtitle, {
          color:      '#B8A8E6',
          fontSize:   helperTextSize,
          marginBottom: clamp(height * 0.022, 14, 20),
        }]}>
          Update the intensity of each mood you're experiencing
        </Text>

        {/* ════════════════════════════════════════════════════════════
            MOOD PICK ROW  (mirrors "New Entry" tab)
        ════════════════════════════════════════════════════════════ */}
        {!selectedMood ? (
          <>
            <Text style={[styles.pickMoodPrompt, {
              fontSize:     clamp(width * 0.05, 17, 21),
              marginBottom: clamp(height * 0.022, 14, 22),
            }]}>
              Which mood are you editing?
            </Text>

            <View style={{ gap: clamp(height * 0.016, 10, 16) }}>
              {moods.map((mood) => {
                const theme = moodCardThemes[mood.value] || moodCardThemes.happy;
                return (
                  <TouchableOpacity
                    key={mood.value}
                    activeOpacity={0.92}
                    onPress={() => selectMoodCard(mood.value)}
                  >
                    <LinearGradient
                      colors={theme.colors}
                      start={[0, 0]}
                      end={[1, 1]}
                      style={[styles.moodChoiceCard, {
                        minHeight:       moodCardMinHeight,
                        borderRadius:    moodCardRadius,
                        paddingTop:      moodCardTopPad,
                        paddingHorizontal: clamp(width * 0.046, 14, 20),
                      }]}
                    >
                      <Text style={[styles.moodChoiceEmoji, { fontSize: moodChoiceEmojiSize }]}>
                        {mood.emoji}
                      </Text>
                      <Text style={[styles.moodChoiceLabel, { fontSize: moodChoiceLabelSize }]}>
                        I'm Feeling {mood.label}
                      </Text>
                      {/* Wave decoration */}
                      <View style={styles.moodChoiceWaveWrap}>
                        <View style={[styles.moodChoiceWave, { backgroundColor: theme.wave }]} />
                        <View style={styles.moodChoiceMiniEmojiRow}>
                          {[0, 1, 2, 3, 4].map((i) => (
                            <View key={i} style={styles.moodChoiceMiniEmojiBubble}>
                              <Text style={styles.moodChoiceMiniEmoji}>{mood.emoji}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {/* ── Change mood row ── */}
            <View style={[styles.selectedMoodHeaderRow, {
              marginBottom: clamp(height * 0.016, 10, 14),
            }]}>
              <TouchableOpacity
                style={[styles.changeMoodButton, {
                  borderRadius:    controlRadius,
                  paddingVertical: clamp(height * 0.015, 10, 14),
                  paddingHorizontal: clamp(width * 0.04, 14, 18),
                }]}
                activeOpacity={0.85}
                onPress={clearSelectedMood}
              >
                <FontAwesome name="arrow-left" size={clamp(width * 0.038, 13, 16)} color="#E6E2F4" />
                <Text style={[styles.changeMoodButtonText, { fontSize: clamp(width * 0.038, 13, 16) }]}>
                  Change Mood
                </Text>
              </TouchableOpacity>

              <LinearGradient
                colors={(selectedMoodTheme || moodCardThemes.happy).colors}
                start={[0, 0]}
                end={[1, 1]}
                style={[styles.selectedMoodPill, {
                  borderRadius:    controlRadius,
                  paddingVertical: clamp(height * 0.012, 8, 11),
                  paddingHorizontal: clamp(width * 0.04, 14, 18),
                  minWidth:        clamp(width * 0.28, 100, 136),
                }]}
              >
                <Text style={[styles.selectedMoodPillEmoji, { fontSize: clamp(width * 0.042, 15, 17) }]}>
                  {selectedMood.emoji}
                </Text>
                <Text style={[styles.selectedMoodPillText, { fontSize: clamp(width * 0.037, 13, 15) }]}>
                  {selectedMood.label}
                </Text>
              </LinearGradient>
            </View>

            {/* ════════════════════════════════════════════════════
                INTENSITY CARD
            ════════════════════════════════════════════════════ */}
            <GlassCard accentColor="#A78BFA">
              <Text style={[styles.sectionTitle, {
                color:        '#FFFFFF',
                fontSize:     sectionTitleSize,
                textAlign:    'center',
                marginBottom: clamp(height * 0.008, 4, 8),
              }]}>
                What's your intensity level?
              </Text>
              <Text style={[styles.helperText, {
                color:        '#9D8EC7',
                fontSize:     helperTextSize,
                textAlign:    'center',
                marginBottom: clamp(height * 0.024, 14, 22),
              }]}>
                How strong is this feeling?
              </Text>

              {/* Hero number */}
              <View style={styles.intensityHeroWrap}>
                <Text style={[styles.intensityHeroNumber, {
                  fontSize: intensityHeroSize,
                  color:    getIntensityColor(
                    moodIntensities[selectedMood.value] || globalIntensity
                  ),
                }]}>
                  {moodIntensities[selectedMood.value] || globalIntensity}
                </Text>
                <Text style={[styles.intensityHeroLabel, {
                  color:    '#EDE7FF',
                  fontSize: intensityLabelSize,
                }]}>
                  {['Very Low', 'Low', 'Moderate', 'High', 'Very High'][
                    (moodIntensities[selectedMood.value] || globalIntensity) - 1
                  ]}
                </Text>
              </View>

              {/* Gradient slider track */}
              <View style={[styles.gradientTrackWrapper, { marginTop: clamp(height * 0.012, 8, 14) }]}>
                <LinearGradient
                  colors={['#FF4D8D', '#FFC12D', '#22D3AE']}
                  start={[0, 0]}
                  end={[1, 0]}
                  style={styles.gradientTrack}
                />
                <Slider
                  style={[styles.slider, { position: 'absolute', left: 0, right: 0 }]}
                  minimumValue={1}
                  maximumValue={5}
                  step={1}
                  value={moodIntensities[selectedMood.value] || globalIntensity}
                  onValueChange={(value) => {
                    updateMoodIntensity(selectedMood.value, value);
                    setGlobalIntensity(value);
                  }}
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="transparent"
                  thumbTintColor="#FFB36B"
                />
              </View>
              <View style={styles.sliderCaptionRow}>
                <Text style={[styles.sliderCaption, { color: '#7D7A96', fontSize: clamp(width * 0.03, 11, 13) }]}>
                  Very Low
                </Text>
                <Text style={[styles.sliderCaption, { color: '#7D7A96', fontSize: clamp(width * 0.03, 11, 13) }]}>
                  Very High
                </Text>
              </View>
            </GlassCard>

            {/* ════════════════════════════════════════════════════
                TRIGGERS CARD
            ════════════════════════════════════════════════════ */}
            <GlassCard accentColor="#FFB36B">
              <Text style={[styles.sectionTitle, {
                color:        '#FFFFFF',
                fontSize:     sectionTitleSize,
                marginBottom: clamp(height * 0.016, 10, 14),
              }]}>
                What triggered these moods?
              </Text>
              <View style={[styles.triggersGrid, { gap: clamp(width * 0.025, 8, 12) }]}>
                {commonTriggers.map((trigger) => {
                  const isSelected = selectedTriggers.includes(trigger);
                  return (
                    <TouchableOpacity
                      key={trigger}
                      onPress={() => toggleTrigger(trigger)}
                      style={[styles.triggerChip, {
                        backgroundColor: isSelected ? '#8B5CF6' : 'rgba(167,139,250,0.10)',
                        borderColor:     isSelected ? '#8B5CF6' : 'rgba(167,139,250,0.45)',
                        borderRadius:    triggerChipRadius,
                        paddingHorizontal: triggerChipPadH,
                        paddingVertical:   triggerChipPadV,
                      }]}
                    >
                      <Text style={[styles.triggerText, {
                        color:    isSelected ? '#FFFFFF' : '#C4B0FF',
                        fontSize: triggerTextSize,
                      }]}>
                        {trigger}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassCard>

            {/* ════════════════════════════════════════════════════
                ACTIVITIES CARD
            ════════════════════════════════════════════════════ */}
            <GlassCard accentColor="#A78BFA" style={{ paddingBottom: 0 }}>
              {/* Icon header row */}
              <View style={[styles.moodCardHeaderRow, {
                marginBottom: clamp(height * 0.018, 12, 16),
              }]}>
                <View style={[styles.moodCardIconBadge, {
                  width:           iconBadgeSize,
                  height:          iconBadgeSize,
                  borderRadius:    iconBadgeRadius,
                  backgroundColor: 'rgba(167,139,250,0.18)',
                  borderColor:     'rgba(167,139,250,0.45)',
                }]}>
                  <FontAwesome name="bicycle" size={iconSize} color="#C4B0FF" />
                </View>
                <View>
                  <Text style={[styles.moodCardHeaderLabel, {
                    fontSize: clamp(width * 0.042, 15, 17),
                    color:    '#FFFFFF',
                  }]}>
                    Activities Today
                  </Text>
                  <Text style={{
                    fontSize:    clamp(width * 0.029, 10, 11),
                    color:       '#9D8EC7',
                    letterSpacing: 1.2,
                    marginTop:   1,
                  }}>
                    OPTIONAL
                  </Text>
                </View>
              </View>
              <View style={styles.moodCardSeparator} />
              <TextInput
                style={[styles.transparentInput, {
                  color:     '#FFFFFF',
                  fontSize:  inputFontSize,
                  minHeight: inputMinHeight,
                  paddingVertical: clamp(height * 0.016, 10, 14),
                }]}
                placeholder="What did you do? (e.g., Meditation, Exercise)"
                placeholderTextColor="rgba(135,120,180,0.55)"
                value={activities}
                onChangeText={setActivities}
                multiline
              />
            </GlassCard>

            {/* ════════════════════════════════════════════════════
                NOTES CARD
            ════════════════════════════════════════════════════ */}
            <GlassCard accentColor="#FFB36B" style={{ paddingBottom: 0 }}>
              <View style={[styles.moodCardHeaderRow, {
                marginBottom: clamp(height * 0.014, 10, 14),
              }]}>
                <View style={[styles.moodCardIconBadge, {
                  width:           iconBadgeSize,
                  height:          iconBadgeSize,
                  borderRadius:    iconBadgeRadius,
                  backgroundColor: 'rgba(255,179,107,0.15)',
                  borderColor:     'rgba(255,179,107,0.40)',
                }]}>
                  <FontAwesome name="edit" size={iconSize} color="#FFB36B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.moodCardHeaderLabel, {
                    fontSize: clamp(width * 0.042, 15, 17),
                    color:    '#FFFFFF',
                  }]}>
                    Additional Notes
                  </Text>
                  <Text style={{
                    fontSize:    clamp(width * 0.029, 10, 11),
                    color:       '#C9A97E',
                    letterSpacing: 0.8,
                    marginTop:   1,
                  }}>
                    Write freely — no rules here
                  </Text>
                </View>
              </View>
              <View style={styles.moodCardSeparator} />
              <TextInput
                style={[styles.transparentInput, {
                  color:          '#FFFFFF',
                  fontSize:       inputFontSize,
                  minHeight:      textAreaMinHeight,
                  paddingVertical: clamp(height * 0.016, 10, 14),
                  lineHeight:     Math.round(inputFontSize * 1.55),
                }]}
                placeholder="Any thoughts or reflections you'd like to add..."
                placeholderTextColor="rgba(135,120,180,0.55)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </GlassCard>

            {/* ════════════════════════════════════════════════════
                SAVE BUTTON
            ════════════════════════════════════════════════════ */}
            <TouchableOpacity
              style={[styles.submitButton, {
                borderRadius: saveButtonRadius,
                opacity:      submitting ? 0.6 : 1,
                overflow:     'hidden',
                marginTop:    clamp(height * 0.01, 6, 12),
              }]}
              onPress={handleUpdate}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={(selectedMoodTheme || moodCardThemes.happy).colors}
                start={[0, 0]}
                end={[1, 1]}
                style={[styles.submitGradient, { minHeight: saveButtonMinHeight, borderRadius: saveButtonRadius }]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.submitInner}>
                    <FontAwesome name="save" size={clamp(width * 0.046, 16, 20)} color="#FFFFFF" />
                    <Text style={[styles.submitButtonText, {
                      fontSize: clamp(width * 0.045, 15, 18),
                    }]}>
                        Update Mood Entry
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: contentBottomPad }} />
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#342949' },

  screenGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
  },
  floatingBubbles: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
  },
  bubble: { position: 'absolute', borderRadius: 9999 },

  headerContainer: {
    paddingTop: 50, paddingHorizontal: 20, paddingBottom: 26, marginBottom: 14,
  },
  backButton: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', marginBottom: 2, textAlign: 'center' },
  headerWhite:  { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },

  subtitle: { lineHeight: 22 },
  pickMoodPrompt: {
    color: '#FFFFFF', fontWeight: '800', textAlign: 'center', marginTop: 4,
  },

  // Mood choice card (pick row)
  moodChoiceCard: {
    overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start', position: 'relative',
  },
  moodChoiceEmoji: { lineHeight: undefined, zIndex: 2 },
  moodChoiceLabel: { marginTop: 8, color: '#FFFFFF', fontWeight: '800', textAlign: 'center', zIndex: 2 },
  moodChoiceWaveWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, justifyContent: 'flex-end',
  },
  moodChoiceWave: {
    position: 'absolute', left: -18, right: -18, bottom: -12, height: 58,
    borderTopLeftRadius: 70, borderTopRightRadius: 90,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    transform: [{ rotate: '-3deg' }],
  },
  moodChoiceMiniEmojiRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center', paddingHorizontal: 26, paddingBottom: 18, zIndex: 2,
  },
  moodChoiceMiniEmojiBubble: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  moodChoiceMiniEmoji: { fontSize: 13 },

  // Selected mood row
  selectedMoodHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  changeMoodButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2F2941', gap: 8,
  },
  changeMoodButtonText: { color: '#E6E2F4', fontWeight: '600' },
  selectedMoodPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  selectedMoodPillEmoji: { marginRight: 6 },
  selectedMoodPillText:  { color: '#FFFFFF', fontWeight: '800' },

  // Intensity
  intensityHeroWrap: { alignItems: 'center', justifyContent: 'center' },
  intensityHeroNumber: { fontWeight: '900', lineHeight: undefined },
  intensityHeroLabel:  { fontWeight: '700', marginTop: -4 },
  gradientTrackWrapper: { width: '100%', height: 28, alignItems: 'center', justifyContent: 'center' },
  gradientTrack: { width: '100%', height: 8, borderRadius: 8 },
  slider: { width: '100%', height: 40 },
  sliderCaptionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  sliderCaption: {},

  // Triggers
  triggersGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  triggerChip:  { borderWidth: 1.5 },
  triggerText:  { fontWeight: '500' },

  // Cards
  sectionTitle: { fontWeight: '700' },
  helperText:   {},
  moodCardHeaderRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moodCardIconBadge:   { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  moodCardHeaderLabel: { fontWeight: '800', letterSpacing: 0.4 },
  moodCardSeparator:   { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 4 },
  transparentInput:    { backgroundColor: 'transparent', color: '#FFFFFF', paddingHorizontal: 2 },

  // Submit
  submitButton:    { width: '100%', alignSelf: 'stretch' },
  submitGradient:  { width: '100%', paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  submitInner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitButtonText:{ color: '#FFFFFF', fontWeight: '700' },
});
