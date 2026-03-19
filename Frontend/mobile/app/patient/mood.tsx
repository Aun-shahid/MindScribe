import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  useWindowDimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import Slider from '@react-native-community/slider';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../utils/api';
import eventBus from '../utils/eventBus';

const moods = [
  { value: 'happy', emoji: '😊', label: 'Happy', color: '#FFD700' },
  { value: 'sad', emoji: '😢', label: 'Sad', color: '#6B8CFF' },
  { value: 'angry', emoji: '😠', label: 'Angry', color: '#FF6B6B' },
  { value: 'anxious', emoji: '😰', label: 'Anxious', color: '#FFA500' },
  { value: 'peaceful', emoji: '😌', label: 'Peaceful', color: '#87CEEB' },
  { value: 'excited', emoji: '🤩', label: 'Excited', color: '#FF69B4' },
  { value: 'grateful', emoji: '🙏', label: 'Grateful', color: '#98FB98' },
  { value: 'overwhelmed', emoji: '😵', label: 'Overwhelmed', color: '#DDA0DD' },
  { value: 'hopeful', emoji: '🌟', label: 'Hopeful', color: '#FFE4B5' },
  { value: 'stressed', emoji: '😫', label: 'Stressed', color: '#FF8C00' },
];

const moodCardThemes: Record<string, { colors: [string, string]; wave: string }> = {
  happy: { colors: ['#F4C400', '#F5A300'], wave: 'rgba(255, 226, 120, 0.78)' },
  excited: { colors: ['#D94A9B', '#F04293'], wave: 'rgba(242, 152, 212, 0.6)' },
  grateful: { colors: ['#08C768', '#3FD481'], wave: 'rgba(145, 234, 183, 0.55)' },
  hopeful: { colors: ['#F9C61A', '#F4A51C'], wave: 'rgba(255, 224, 141, 0.7)' },
  peaceful: { colors: ['#6AB8E7', '#169FDF'], wave: 'rgba(144, 215, 247, 0.52)' },
  anxious: { colors: ['#F58A00', '#F16600'], wave: 'rgba(255, 184, 137, 0.58)' },
  stressed: { colors: ['#EE5D67', '#F76722'], wave: 'rgba(255, 173, 142, 0.6)' },
  overwhelmed: { colors: ['#A666E6', '#8B39E5'], wave: 'rgba(204, 162, 246, 0.58)' },
  sad: { colors: ['#4F8FE3', '#2B68DB'], wave: 'rgba(156, 191, 255, 0.56)' },
  angry: { colors: ['#E31829', '#C80020'], wave: 'rgba(255, 166, 179, 0.55)' },
};

const commonTriggers = [
  'Work/Career', 'Family', 'Health', 'Relationships', 'Finances',
  'Social', 'Weather', 'Sleep', 'Exercise', 'Medication', 'Therapy', 'Other',
];

const orderingOptions = [
  { value: '-mood_date', label: 'Newest First' },
  { value: 'mood_date', label: 'Oldest First' },
];

const CARD_GRADIENT_COLORS = ['rgba(255,179,107,0.11)', 'rgba(167,139,250,0.08)', 'rgba(52,41,73,0.72)'] as const;
const CARD_BG = '#3F3752';
const CARD_BORDER = 'rgba(255,255,255,0.16)';

interface MoodIntensities { [key: string]: number; }
interface MoodEntryPayload {
  mood_intensities: MoodIntensities;
  notes: string; triggers: string; triggers_list: string[];
  activities: string; mood_date: string;
}
interface MoodHistoryEntry {
  id: string; mood_intensities: MoodIntensities; moods_list: string[];
  dominant_mood: string; dominant_moods?: string[]; average_intensity: number;
  triggers: string; triggers_list: string[]; notes: string;
  activities: string; mood_date?: string; created_at: string; updated_at: string;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export default function MoodTrackerScreen() {
  const { tab } = useLocalSearchParams();
  const { themeStyle } = useTheme();
  const scrollRef = useRef<any>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const pageInset = clamp(width * 0.05, 16, 22);
  const headerTopPadding = insets.top + clamp(height * 0.017, 14, 22);
  const headerButtonSize = clamp(width * 0.105, 36, 42);
  const headerButtonRadius = headerButtonSize / 2;
  const headerIconSize = clamp(width * 0.05, 18, 20);
  const headerTitleSize = clamp(width * 0.074, 24, 30);
  const headerTitleMarginTop = clamp(height * 0.024, 18, 24);
  const menuBarPadding = clamp(width * 0.008, 2, 4);
  const menuTabVerticalPadding = clamp(height * 0.012, 8, 10);
  const menuTabHorizontalPadding = clamp(width * 0.022, 8, 12);
  const menuTabTextSize = clamp(width * 0.033, 12, 13);
  const weeklyTabTextSize = clamp(width * 0.029, 10.5, 11.5);
  const contentTopPadding = clamp(height * 0.016, 10, 16);
  const contentBottomPadding = clamp(insets.bottom + height * 0.02, 24, 38);
  const entryBottomPadding = clamp(insets.bottom + height * 0.006, 8, 14);
  const tabLoaderViewportMinHeight = Math.max(
    height - (headerTopPadding + headerTitleSize + headerTitleMarginTop + contentTopPadding + contentBottomPadding + clamp(height * 0.2, 110, 150)),
    clamp(height * 0.5, 320, 460)
  );
  const historyCardPadding = clamp(width * 0.036, 12, 16);
  const historyTitleSize = clamp(width * 0.039, 14, 16);
  const historyMetaSize = clamp(width * 0.032, 12, 13);
  const moodCardRadius = clamp(width * 0.07, 22, 30);
  const moodCardMinHeight = clamp(height * 0.24, 170, 220);
  const moodCardTopPad = clamp(height * 0.034, 22, 32);
  const detailCardRadius = clamp(width * 0.062, 20, 28);
  const detailCardPadX = clamp(width * 0.055, 18, 24);
  const detailCardPadY = clamp(height * 0.032, 20, 28);
  const controlRadius = clamp(width * 0.045, 14, 20);
  const inputMinHeight = clamp(height * 0.07, 48, 60);
  const textAreaMinHeight = clamp(height * 0.16, 108, 140);
  const saveButtonRadius = clamp(width * 0.062, 18, 24);
  const saveButtonMinHeight = clamp(height * 0.062, 46, 54);

  const bubbleLarge = clamp(width * 0.74, 220, 320);
  const bubbleMedium = clamp(width * 0.56, 170, 260);
  const bubbleSmall = clamp(width * 0.34, 110, 160);

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

  const scrollY = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'weekly'>(
    tab === 'weekly' ? 'weekly' : tab === 'history' ? 'history' : 'entry'
  );

  const [moodIntensities, setMoodIntensities] = useState<MoodIntensities>(() => {
    const initial: MoodIntensities = {};
    moods.forEach((mood) => { initial[mood.value] = 0; });
    return initial;
  });

  const [globalIntensity, setGlobalIntensity] = useState<number>(3);
  const [lastSelectedMood, setLastSelectedMood] = useState<string | null>(null);
  const selectedMood = moods.find((mood) => mood.value === lastSelectedMood) || null;
  const selectedMoodTheme = selectedMood ? moodCardThemes[selectedMood.value] || moodCardThemes.happy : null;
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [activities, setActivities] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [moodHistory, setMoodHistory] = useState<MoodHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [ordering, setOrdering] = useState('-mood_date');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const hasActiveHistoryFilters = !!startDate || !!endDate || ordering !== '-mood_date';
  const isFirstTabRender = useRef(true);
  const [weeklyLoading, setWeeklyLoading] = useState<boolean>(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [weeklyData, setWeeklyData] = useState<any | null>(null);

  useEffect(() => {
    if (isFirstTabRender.current) { isFirstTabRender.current = false; }
  }, [activeTab]);

  useEffect(() => {
    const createFloatingAnimation = (
      valueY: Animated.Value, valueX: Animated.Value,
      durationY: number, durationX: number, delayY = 0, delayX = 0
    ) => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.delay(delayY),
            Animated.timing(valueY, { toValue: 50, duration: durationY, useNativeDriver: true }),
            Animated.timing(valueY, { toValue: -50, duration: durationY, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(delayX),
            Animated.timing(valueX, { toValue: 30, duration: durationX, useNativeDriver: true }),
            Animated.timing(valueX, { toValue: -30, duration: durationX, useNativeDriver: true }),
          ]),
        ])
      ).start();
    };
    createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000, 0, 500);
    createFloatingAnimation(bubble2Y, bubble2X, 9000, 8500, 1000, 1500);
    createFloatingAnimation(bubble3Y, bubble3X, 10000, 9000, 500, 0);
    createFloatingAnimation(bubble4Y, bubble4X, 8500, 10000, 1500, 1000);
    createFloatingAnimation(bubble5Y, bubble5X, 9500, 8000, 0, 2000);
  }, [bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y, bubble4X, bubble4Y, bubble5X, bubble5Y]);

  const loadWeeklyTrend = useCallback(async () => {
    try {
      setWeeklyLoading(true); setWeeklyError(null);
      const response = await api.get('/patients/mood/weekly-trend/');
      setWeeklyData(response.data);
    } catch (err: any) {
      setWeeklyError(err.response?.data?.detail || 'Failed to load weekly trend');
    } finally { setWeeklyLoading(false); }
  }, []);

  const updateMoodIntensity = (moodValue: string, intensity: number) => {
    setMoodIntensities((prev) => ({ ...prev, [moodValue]: intensity }));
  };

  const selectSingleMood = (moodValue: string) => {
    const selectedIntensity = moodIntensities[moodValue] > 0 ? moodIntensities[moodValue] : globalIntensity;
    const nextIntensities: MoodIntensities = {};
    moods.forEach((mood) => { nextIntensities[mood.value] = mood.value === moodValue ? selectedIntensity : 0; });
    setMoodIntensities(nextIntensities);
    setLastSelectedMood(moodValue);
    setGlobalIntensity(selectedIntensity);
    requestAnimationFrame(() => { scrollRef.current?.scrollTo?.({ y: 0, animated: true }); });
  };

  const clearSelectedMood = () => {
    const resetIntensities: MoodIntensities = {};
    moods.forEach((mood) => { resetIntensities[mood.value] = 0; });
    setMoodIntensities(resetIntensities);
    setLastSelectedMood(null);
    requestAnimationFrame(() => { scrollRef.current?.scrollTo?.({ y: 0, animated: true }); });
  };

  const handleBackPress = () => {
    if (selectedMood) { clearSelectedMood(); } else { router.back(); }
  };

  const getIntensityColor = (value: number) => {
    const palette = ['#FF4D8D', '#FF7A78', '#FFC12D', '#8BDA67', '#22D3AE'];
    return palette[Math.max(0, Math.min(4, value - 1))];
  };

  // ── Menu bar — rendered ONCE outside all tabs (never remounts on tab switch) ──
  const renderMenuBar = () => (
    <View style={[styles.menuBarContainer, styles.menuBarInline, { padding: menuBarPadding }]}>
      {(['entry', 'history', 'weekly'] as const).map((t) => {
        const label = t === 'entry' ? 'New Entry' : t === 'history' ? 'History' : 'Weekly Trend';
        const isWide = t === 'weekly';
        return (
          <TouchableOpacity
            key={t}
            onPress={() => setActiveTab(t)}
            style={[styles.menuTabButton, isWide && styles.menuTabButtonWide]}
            activeOpacity={0.8}
          >
            {activeTab === t ? (
              <LinearGradient
                colors={['#FF5AA8', '#FFB36B']}
                start={[0, 0]} end={[1, 0]}
                style={[styles.menuTabActive, { paddingVertical: menuTabVerticalPadding, paddingHorizontal: menuTabHorizontalPadding }]}
              >
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={isWide ? 0.8 : 0.9}
                  style={[styles.menuTabActiveText, isWide && styles.menuTabWideText, { fontSize: isWide ? weeklyTabTextSize : menuTabTextSize }]}>
                  {label}
                </Text>
              </LinearGradient>
            ) : (
              <View style={[styles.menuTabInactive, { paddingVertical: menuTabVerticalPadding, paddingHorizontal: menuTabHorizontalPadding }]}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={isWide ? 0.8 : 0.9}
                  style={[styles.menuTabInactiveText, isWide && styles.menuTabWideText, { fontSize: isWide ? weeklyTabTextSize : menuTabTextSize }]}>
                  {label}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderHistoryFilterBar = () => (
    <View style={styles.historyFilterRow}>
      <TouchableOpacity style={styles.historyFilterTrigger} activeOpacity={0.85} onPress={() => setShowFiltersModal(true)}>
        <Text style={styles.historyFilterTriggerText}>Filters</Text>
        <FontAwesome name="chevron-down" size={12} color="#D6CFF0" />
      </TouchableOpacity>
      {hasActiveHistoryFilters && (
        <TouchableOpacity style={styles.historyFilterClearIcon} activeOpacity={0.85} onPress={clearFilters}>
          <FontAwesome name="times" size={12} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );

  // renderTabLoader no longer includes the menu bar
  const renderTabLoader = (title: string, subtitle: string, showHistoryFilters = false) => (
    <View style={[styles.tabLoaderScreen, { paddingHorizontal: pageInset, paddingTop: contentTopPadding, paddingBottom: contentBottomPadding }]}>
      {showHistoryFilters ? renderHistoryFilterBar() : null}
      {showHistoryFilters ? <View style={{ height: 12 }} /> : null}
      <View style={[styles.tabLoaderViewport, { minHeight: tabLoaderViewportMinHeight }]}>
        <TabLoaderCard title={title} subtitle={subtitle} spinnerColor="#A78BFA" />
      </View>
    </View>
  );

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) => prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]);
  };

  const loadMoodHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const params: any = { ordering };
      if (startDate) params.start_date = formatDateForAPI(startDate);
      if (endDate) params.end_date = formatDateForAPI(endDate);
      const response = await api.get<MoodHistoryEntry[]>('/patients/mood/', { params });
      setMoodHistory(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load mood history. Please try again.');
    } finally { setHistoryLoading(false); }
  }, [endDate, ordering, startDate]);

  useEffect(() => {
    if (activeTab === 'history') loadMoodHistory();
    if (activeTab === 'weekly') loadWeeklyTrend();
  }, [activeTab, loadMoodHistory, loadWeeklyTrend]);

  useFocusEffect(useCallback(() => {
    if (activeTab === 'history') loadMoodHistory();
    if (activeTab === 'weekly') loadWeeklyTrend();
  }, [activeTab, loadMoodHistory, loadWeeklyTrend]));

  const handleSubmit = async () => {
    const activeMoods: MoodIntensities = {};
    Object.keys(moodIntensities).forEach((mood) => {
      if (moodIntensities[mood] > 1) activeMoods[mood] = moodIntensities[mood];
    });
    if (Object.keys(activeMoods).length === 0) {
      Alert.alert('No Mood Selected', 'Please select at least one mood with intensity level 2 or higher.');
      return;
    }
    const payload: MoodEntryPayload = {
      mood_intensities: activeMoods, notes: notes.trim(),
      triggers: selectedTriggers.join(', '), triggers_list: selectedTriggers,
      activities: activities.trim(), mood_date: formatDateForAPI(new Date()),
    };
    try {
      setLoading(true);
      await api.post('/patients/mood/today/', payload);
      try { eventBus.emit('refreshDashboard'); } catch (e) {}
      const moodCount = Object.keys(activeMoods).length;
      Alert.alert('Success! 🎉', `Your mood entry with ${moodCount} mood${moodCount > 1 ? 's' : ''} has been recorded for today.`, [
        { text: 'View History', onPress: () => setActiveTab('history') },
        { text: 'OK', style: 'cancel' },
      ]);
      const resetIntensities: MoodIntensities = {};
      moods.forEach((mood) => { resetIntensities[mood.value] = 0; });
      setMoodIntensities(resetIntensities);
      setLastSelectedMood(null); setSelectedTriggers([]); setActivities(''); setNotes('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.mood_intensities?.[0] || error.response?.data?.message || 'Failed to save mood entry. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally { setLoading(false); }
  };

  const getMoodEmoji = (moodValue: string) => moods.find((m) => m.value === moodValue)?.emoji || '😐';
  const getMoodLabel = (moodValue: string) => moods.find((m) => m.value === moodValue)?.label || moodValue;

  const formatExactDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? new Date(dateString + 'T00:00:00') : new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateForAPI = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const clearFilters = () => { setStartDate(null); setEndDate(null); setOrdering('-mood_date'); };

  return (
    <View style={[styles.container, { backgroundColor: '#342949' }]}>
      <LinearGradient
        colors={['#342949', '#2A1F3D', '#342949']}
        start={[0, 0]} end={[0, 1]}
        style={[styles.screenGradient, { height }]}
        pointerEvents="none"
      />

      <View style={styles.floatingBubbles} pointerEvents="none">
        <Animated.View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium, top: '10%', left: '-10%', backgroundColor: 'rgba(167,139,250,0.15)' }, { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleLarge, height: bubbleLarge, top: '25%', right: '-15%', backgroundColor: 'rgba(184,168,230,0.18)' }, { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium, top: '50%', left: '10%', backgroundColor: 'rgba(167,139,250,0.13)' }, { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleLarge * 0.78, height: bubbleLarge * 0.78, bottom: '15%', right: '5%', backgroundColor: 'rgba(184,168,230,0.22)' }, { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleSmall, height: bubbleSmall, bottom: '30%', left: '-5%', backgroundColor: 'rgba(167,139,250,0.19)' }, { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }]} />
      </View>

      <StickyHeader scrollY={scrollY} firstWord="Mood" secondWord="Break" />

      {/* Animated fading header */}
      <Animated.View style={[styles.headerContainer, {
        paddingTop: headerTopPadding,
        paddingHorizontal: pageInset,
        paddingBottom: clamp(height * 0.004, 2, 6),
        opacity: scrollY.interpolate({ inputRange: [0, 100, 150], outputRange: [1, 0.5, 0], extrapolate: 'clamp' }),
      }]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.backButton, { left: pageInset, top: headerTopPadding + clamp(height * 0.003, 2, 5), width: headerButtonSize, height: headerButtonSize, borderRadius: headerButtonRadius }]}
        >
          <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}>
          <Text style={styles.headerWhite}>Mood </Text>
          <Text style={styles.headerPurple}>Break</Text>
        </Text>
        <TouchableOpacity
          style={[styles.analyticsButton, { right: pageInset, top: headerTopPadding + clamp(height * 0.003, 2, 5), width: headerButtonSize, height: headerButtonSize, borderRadius: headerButtonRadius }]}
          onPress={() => router.push('/patient/mood-analytics-detail')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome name="bar-chart" size={headerIconSize} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* ── MENU BAR — rendered ONCE here, never inside any tab ── */}
      <View style={[styles.menuBarWrapper, { paddingHorizontal: pageInset }]}>
        {renderMenuBar()}
      </View>

      {/* ── ENTRY TAB ── */}
      {activeTab === 'entry' && (
        <Animated.ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pageInset, paddingTop: contentTopPadding, paddingBottom: entryBottomPadding }]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
        >
          {!selectedMood ? (
            <>
              <Text style={styles.entryPromptTitle}>How are you feeling today?</Text>
              <View style={styles.moodCardsList}>
                {moods.map((mood) => {
                  const theme = moodCardThemes[mood.value] || moodCardThemes.happy;
                  return (
                    <TouchableOpacity key={mood.value} activeOpacity={0.92} style={styles.moodCardPressable} onPress={() => selectSingleMood(mood.value)}>
                      <LinearGradient
                        colors={theme.colors} start={[0, 0]} end={[1, 1]}
                        style={[styles.moodChoiceCard, { minHeight: moodCardMinHeight, borderRadius: moodCardRadius, paddingTop: moodCardTopPad, paddingHorizontal: clamp(width * 0.046, 14, 20) }]}
                      >
                        <Text style={styles.moodChoiceEmoji}>{mood.emoji}</Text>
                        <Text style={styles.moodChoiceLabel}>I&apos;m Feeling {mood.label}</Text>
                        <View style={styles.moodChoiceWaveWrap}>
                          <View style={[styles.moodChoiceWave, { backgroundColor: theme.wave }]} />
                          <View style={styles.moodChoiceMiniEmojiRow}>
                            {[0, 1, 2, 3, 4].map((index) => (
                              <View key={`${mood.value}-${index}`} style={styles.moodChoiceMiniEmojiBubble}>
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
              <View style={styles.selectedMoodHeaderRow}>
                <TouchableOpacity
                  style={[styles.changeMoodButton, { borderRadius: controlRadius, paddingVertical: clamp(height * 0.015, 10, 14), paddingHorizontal: clamp(width * 0.04, 14, 18) }]}
                  activeOpacity={0.85} onPress={clearSelectedMood}
                >
                  <FontAwesome name="arrow-left" size={15} color="#E6E2F4" />
                  <Text style={styles.changeMoodButtonText}>Change Mood</Text>
                </TouchableOpacity>
                <LinearGradient
                  colors={(selectedMoodTheme || moodCardThemes.happy).colors} start={[0, 0]} end={[1, 1]}
                  style={[styles.selectedMoodPill, { borderRadius: controlRadius, paddingVertical: clamp(height * 0.012, 8, 11), paddingHorizontal: clamp(width * 0.04, 14, 18), minWidth: clamp(width * 0.28, 100, 136) }]}
                >
                  <Text style={[styles.selectedMoodPillEmoji, { fontSize: clamp(width * 0.04, 14, 16) }]}>{selectedMood.emoji}</Text>
                  <Text style={[styles.selectedMoodPillText, { fontSize: clamp(width * 0.035, 13, 15) }]}>{selectedMood.label}</Text>
                </LinearGradient>
              </View>

              <View style={[styles.card, styles.enhancedDetailCard, { backgroundColor: '#2D2740', borderRadius: detailCardRadius, paddingHorizontal: detailCardPadX, paddingVertical: detailCardPadY }]}>
                <Text style={[styles.enhancedSectionTitle, { color: '#FFFFFF' }]}>What&apos;s your intensity level?</Text>
                <Text style={[styles.helperText, styles.enhancedHelperText, { color: '#8FA2C7' }]}>How strong is this feeling?</Text>
                <View style={styles.intensityHeroWrap}>
                  <Text style={[styles.intensityHeroNumber, { color: getIntensityColor(moodIntensities[selectedMood.value] || globalIntensity) }]}>
                    {moodIntensities[selectedMood.value] || globalIntensity}
                  </Text>
                  <Text style={styles.intensityHeroLabel}>
                    {['Very Low', 'Low', 'Moderate', 'High', 'Very High'][(moodIntensities[selectedMood.value] || globalIntensity) - 1]}
                  </Text>
                </View>
                <View style={styles.gradientTrackWrapper}>
                  <LinearGradient colors={['#FF4D8D', '#FFC12D', '#22D3AE']} start={[0, 0]} end={[1, 0]} style={styles.gradientTrack} />
                  <Slider
                    style={[styles.slider, { position: 'absolute', left: 0, right: 0 }]}
                    minimumValue={1} maximumValue={5} step={1}
                    value={moodIntensities[selectedMood.value] || globalIntensity}
                    onValueChange={(value) => { updateMoodIntensity(selectedMood.value, value); setGlobalIntensity(value); }}
                    minimumTrackTintColor={'transparent'} maximumTrackTintColor={'transparent'} thumbTintColor={themeStyle.button}
                  />
                </View>
                <Text style={[styles.sliderCaption, { color: '#7D7A96' }]}>Very Low</Text>
                <Text style={[styles.sliderCaptionRight, { color: '#7D7A96' }]}>Very High</Text>
              </View>

              <View style={[styles.card, styles.enhancedDetailCard, { backgroundColor: '#2D2740', borderRadius: detailCardRadius, paddingHorizontal: detailCardPadX, paddingVertical: detailCardPadY }]}>
                <Text style={[styles.enhancedSectionTitle, { color: '#FFFFFF' }]}>What triggered this mood?</Text>
                <View style={styles.triggersGrid}>
                  {commonTriggers.map((trigger) => {
                    const isSelected = selectedTriggers.includes(trigger);
                    return (
                      <TouchableOpacity key={trigger} onPress={() => toggleTrigger(trigger)}
                        style={[styles.triggerChip, styles.enhancedTriggerChip, isSelected && styles.enhancedTriggerChipSelected]}>
                        <Text style={[styles.triggerText, styles.enhancedTriggerText, isSelected && styles.enhancedTriggerTextSelected]}>{trigger}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.card, styles.enhancedDetailCard, { backgroundColor: '#2D2740', borderRadius: detailCardRadius, paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }]}>
                <View style={{ height: 3, backgroundColor: '#A78BFA', width: '100%' }} />
                <View style={{ paddingHorizontal: detailCardPadX, paddingVertical: detailCardPadY }}>
                  <View style={[styles.moodCardHeaderRow, { marginBottom: clamp(height * 0.018, 12, 16) }]}>
                    <View style={[styles.moodCardIconBadge, { width: clamp(width * 0.076, 26, 32), height: clamp(width * 0.076, 26, 32), borderRadius: clamp(width * 0.038, 13, 16), backgroundColor: 'rgba(167,139,250,0.18)', borderColor: 'rgba(167,139,250,0.45)' }]}>
                      <FontAwesome name="bicycle" size={clamp(width * 0.032, 11, 13)} color="#C4B0FF" />
                    </View>
                    <View>
                      <Text style={[styles.moodCardHeaderLabel, { fontSize: clamp(width * 0.042, 15, 17), color: '#FFFFFF' }]}>Activities</Text>
                      <Text style={{ fontSize: clamp(width * 0.029, 10, 11), color: '#9D8EC7', letterSpacing: 1.2, marginTop: 1 }}>OPTIONAL</Text>
                    </View>
                  </View>
                  <View style={styles.moodCardSeparator} />
                  <TextInput
                    style={[styles.textInput, { color: '#FFFFFF', backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 2, paddingVertical: clamp(height * 0.016, 10, 14), fontSize: clamp(width * 0.039, 14, 16), minHeight: inputMinHeight }]}
                    placeholder="What did you do? (e.g., Meditation, Exercise)"
                    placeholderTextColor="rgba(135,120,180,0.55)"
                    value={activities} onChangeText={setActivities} multiline
                  />
                </View>
              </View>

              <View style={[styles.card, styles.enhancedDetailCard, { backgroundColor: '#2D2740', borderRadius: detailCardRadius, paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden' }]}>
                <View style={{ height: 3, backgroundColor: '#FFB36B', width: '100%' }} />
                <View style={{ paddingHorizontal: detailCardPadX, paddingVertical: detailCardPadY }}>
                  <View style={[styles.moodCardHeaderRow, { marginBottom: clamp(height * 0.014, 10, 14) }]}>
                    <View style={[styles.moodCardIconBadge, { width: clamp(width * 0.076, 26, 32), height: clamp(width * 0.076, 26, 32), borderRadius: clamp(width * 0.038, 13, 16), backgroundColor: 'rgba(255,179,107,0.15)', borderColor: 'rgba(255,179,107,0.4)' }]}>
                      <FontAwesome name="edit" size={clamp(width * 0.032, 11, 13)} color="#FFB36B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.moodCardHeaderLabel, { fontSize: clamp(width * 0.042, 15, 17), color: '#FFFFFF' }]}>Additional Notes</Text>
                      <Text style={{ fontSize: clamp(width * 0.029, 10, 11), color: '#C9A97E', letterSpacing: 0.8, marginTop: 1 }}>Write freely — no rules here</Text>
                    </View>
                  </View>
                  <View style={styles.moodCardSeparator} />
                  <TextInput
                    style={[styles.textArea, { color: '#FFFFFF', backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 2, paddingVertical: clamp(height * 0.016, 10, 14), fontSize: clamp(width * 0.039, 14, 16), minHeight: textAreaMinHeight, lineHeight: Math.round(clamp(width * 0.039, 14, 16) * 1.55) }]}
                    placeholder="Any thoughts or reflections you'd like to add..."
                    placeholderTextColor="rgba(135,120,180,0.55)"
                    value={notes} onChangeText={setNotes} multiline numberOfLines={4} textAlignVertical="top"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, styles.enhancedSubmitButton, { borderRadius: saveButtonRadius, width: '100%' }, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit} disabled={loading}
              >
                <LinearGradient
                  colors={(selectedMoodTheme || moodCardThemes.happy).colors} start={[0, 0]} end={[1, 1]}
                  style={[styles.enhancedSubmitGradient, { minHeight: saveButtonMinHeight, borderRadius: saveButtonRadius }]}
                >
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                    <View style={styles.enhancedSubmitInner}>
                      <FontAwesome name="save" size={18} color="#FFFFFF" />
                      <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>Save Mood Entry</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </Animated.ScrollView>
      )}

      {/* ── WEEKLY TAB ── */}
      {activeTab === 'weekly' && (
        <Animated.ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={{ paddingHorizontal: pageInset, paddingTop: contentTopPadding, paddingBottom: contentBottomPadding }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
        >
          {weeklyLoading ? renderTabLoader('Loading Weekly Trend', 'Building your mood graph...') : weeklyError ? (
            <View style={styles.glassCard}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
              <View style={{ padding: 16 }}>
                <Text style={[styles.contextToggleText, { color: '#FF6B6B' }]}>❌ {weeklyError}</Text>
                <TouchableOpacity style={[styles.trendButton, { backgroundColor: '#FFB36B', marginTop: 12 }]} onPress={loadWeeklyTrend}>
                  <Text style={[styles.trendButtonText, { color: '#FFFFFF' }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : weeklyData ? (
            <>
              <View style={[styles.glassCard, { marginBottom: 14 }]}>
                <LinearGradient colors={CARD_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
                <View style={{ padding: 16 }}>
                  <Text style={[styles.sectionTitle, { color: '#FFFFFF', marginBottom: 2 }]}>Your Weekly Mood Trend</Text>
                  <Text style={{ color: '#B7AEDA', fontSize: 12, marginBottom: 10 }}>Intensity by day</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 6 }}>
                    {(() => {
                      const chartWidth = Math.max(width - (pageInset * 2) - 42, 238);
                      const BAR_WIDTH = chartWidth / 7;
                      const weekly = weeklyData.weekly_moods || [];
                      const maxIntensity = Math.max(...weekly.map((d: any) => (d.intensity || 1)), 5);
                      return weekly.map((dayData: any, index: number) => {
                        const barHeight = ((dayData.intensity || 0) / maxIntensity) * 118;
                        const moodKey = (dayData.mood || '') as string;
                        const hasMoodEntry = Boolean(dayData.mood);
                        const barColors = (moodCardThemes[moodKey]?.colors || ['#6D5DD3', '#7A6ED8']) as [string, string];
                        return (
                          <View key={index} style={{ width: BAR_WIDTH, alignItems: 'center' }}>
                            {hasMoodEntry ? (
                              <Text style={{ marginBottom: 6, fontSize: 15 }}>{getMoodEmoji(dayData.mood)}</Text>
                            ) : (
                              <View style={styles.weeklyChartEmptyBadge}><FontAwesome name="calendar-o" size={11} color="#CBBEF0" /></View>
                            )}
                            <View style={{ width: BAR_WIDTH - 10, height: 126, borderRadius: 12, backgroundColor: hasMoodEntry ? 'rgba(255,255,255,0.07)' : 'rgba(203,190,240,0.08)', justifyContent: hasMoodEntry ? 'flex-end' : 'center', alignItems: 'center', paddingBottom: 4, borderWidth: hasMoodEntry ? 0 : 1, borderColor: hasMoodEntry ? 'transparent' : 'rgba(203,190,240,0.16)' }}>
                              {hasMoodEntry ? (
                                <LinearGradient colors={barColors} start={[0, 0]} end={[0, 1]} style={{ width: BAR_WIDTH - 16, height: Math.max(barHeight, dayData.intensity ? 8 : 0), borderRadius: 9, justifyContent: 'center', alignItems: 'center' }}>
                                  {dayData.intensity > 0 && <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>{dayData.intensity}</Text>}
                                </LinearGradient>
                              ) : (
                                <View style={styles.weeklyChartEmptyTrack}><View style={styles.weeklyChartEmptyDot} /></View>
                              )}
                            </View>
                            <Text style={{ marginTop: 8, color: dayData.mood ? '#EDE8FA' : '#9F95C7', fontSize: 11, fontWeight: '600' }}>{dayData.day}</Text>
                          </View>
                        );
                      });
                    })()}
                  </View>
                </View>
              </View>
              <View style={[styles.glassCard, { marginBottom: 14 }]}>
                <LinearGradient colors={CARD_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
                <View style={{ padding: 16 }}>
                  <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Daily Breakdown</Text>
                  <View style={{ marginTop: 6 }}>
                    {weeklyData.weekly_moods.map((dayData: any, index: number) => {
                      const moodKey = (dayData.mood || '') as string;
                      const hasMoodEntry = Boolean(dayData.mood);
                      const avatarColors = (moodCardThemes[moodKey]?.colors || ['#6D5DD3', '#7A6ED8']) as [string, string];
                      return (
                        <View key={`weekly-${index}`} style={[styles.weeklyListCard, index === weeklyData.weekly_moods.length - 1 && { marginBottom: 0 }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            {hasMoodEntry ? (
                              <LinearGradient colors={avatarColors} start={[0, 0]} end={[1, 1]} style={styles.weeklyAvatar}>
                                <Text style={{ fontSize: 18 }}>{getMoodEmoji(dayData.mood)}</Text>
                              </LinearGradient>
                            ) : (
                              <View style={styles.weeklyAvatarEmpty}><FontAwesome name="calendar-o" size={18} color="#CBBEF0" /></View>
                            )}
                            <View style={{ marginLeft: 10, flex: 1 }}>
                              <Text style={{ fontWeight: '700', color: '#FFFFFF', fontSize: 15 }}>{`${dayData.day} - ${dayData.mood_label || 'No check-in logged'}`}</Text>
                              <Text style={{ color: hasMoodEntry ? '#B8A8E6' : '#CBBEF0', marginTop: 4, fontSize: 13 }}>
                                {hasMoodEntry ? `${dayData.entry_count || 0} ${dayData.entry_count === 1 ? 'entry' : 'entries'} • Intensity: ${dayData.intensity || 0}/5` : 'No mood entry recorded for this day'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </Animated.ScrollView>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <View style={styles.historyContainer}>
          {historyLoading ? renderTabLoader('Loading Mood History', 'Gathering your recent entries...') : moodHistory.length === 0 ? (
            <ScrollView contentContainerStyle={{ paddingHorizontal: pageInset, paddingTop: contentTopPadding, paddingBottom: contentBottomPadding }}>
              {renderHistoryFilterBar()}
              <View style={{ height: 12 }} />
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: '#FFFFFF' }]}>No mood entries found</Text>
                <Text style={[styles.emptySubtext, { color: '#B8A8E6' }]}>Create your first entry in the &quot;New Entry&quot; tab</Text>
              </View>
            </ScrollView>
          ) : (
            <Animated.FlatList
              data={moodHistory}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.historyList, { paddingHorizontal: pageInset, paddingTop: contentTopPadding, paddingBottom: contentBottomPadding }]}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
              scrollEventThrottle={16}
              ListHeaderComponent={
                <>
                  {renderHistoryFilterBar()}
                  <View style={{ height: 12 }} />
                </>
              }
              renderItem={({ item }) => {
                const moodsArray = item.mood_intensities
                  ? Object.entries(item.mood_intensities).map(([mood, intensity]) => ({ mood, intensity, emoji: getMoodEmoji(mood), label: getMoodLabel(mood) }))
                  : [];
                const dominantMoods = item.dominant_moods || [];
                const dominantMood = item.dominant_mood || (dominantMoods.length > 0 ? dominantMoods[0] : (moodsArray.length > 0 ? moodsArray[0].mood : ''));
                const tieLabel = dominantMoods.length > 1 ? `Tie: ${dominantMoods.map((m) => getMoodLabel(m)).join(', ')}` : null;
                return (
                  <TouchableOpacity
                    style={[styles.glassCard, { marginBottom: clamp(height * 0.012, 8, 12) }]}
                    onPress={() => router.push(`/patient/mood-detail?id=${item.id}`)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={CARD_GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
                    <View style={{ padding: historyCardPadding, flexDirection: 'row', alignItems: 'center' }}>
                      <LinearGradient
                        colors={(moodCardThemes[dominantMood]?.colors || moodCardThemes.happy.colors) as [string, string]}
                        start={[0, 0]} end={[1, 1]}
                        style={styles.moodAvatar}
                      >
                        <Text style={styles.avatarEmoji}>{getMoodEmoji(dominantMood)}</Text>
                      </LinearGradient>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.historyMood, { color: '#FFFFFF', fontSize: historyTitleSize }]}>{getMoodLabel(dominantMood)}</Text>
                        {tieLabel && <Text style={{ color: '#B8A8E6', fontSize: historyMetaSize, marginTop: 2 }}>{tieLabel}</Text>}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <FontAwesome name="calendar" size={11} color="#B8A8E6" />
                          <Text style={{ marginLeft: 6, color: '#B8A8E6', fontSize: historyMetaSize }}>{formatExactDate(item.mood_date || item.created_at)}</Text>
                        </View>
                      </View>
                      <View style={[styles.intensityPill, { backgroundColor: 'rgba(91,82,112,0.8)' }]}>
                        <Text style={[styles.intensityPillText, { color: '#FFFFFF' }]}>Intensity: {item.average_intensity ? item.average_intensity.toFixed(0) : '—'}/5</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {showStartDatePicker && (
        <DateTimePicker value={startDate || new Date()} mode="date" display="default"
          onChange={(event, selectedDate) => { setShowStartDatePicker(false); if (selectedDate) setStartDate(selectedDate); }} />
      )}
      {showEndDatePicker && (
        <DateTimePicker value={endDate || new Date()} mode="date" display="default"
          onChange={(event, selectedDate) => { setShowEndDatePicker(false); if (selectedDate) setEndDate(selectedDate); }} />
      )}

      <Modal visible={showFiltersModal} transparent animationType="fade" onRequestClose={() => setShowFiltersModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFiltersModal(false)}>
          <View style={[styles.modalContent, styles.filtersModalContent, { backgroundColor: '#473F5A' }]}>
            <View style={styles.filtersModalHeader}>
              <Text style={[styles.modalTitle, { color: '#FFFFFF', marginBottom: 0 }]}>Filters</Text>
              <TouchableOpacity style={styles.filtersModalClose} onPress={() => setShowFiltersModal(false)}>
                <FontAwesome name="times" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.filterLabel, { color: '#B8A8E6' }]}>Sort By</Text>
            {orderingOptions.map((option) => (
              <TouchableOpacity key={option.value} style={[styles.modalOption, ordering === option.value && { backgroundColor: '#5B5270' }]} onPress={() => setOrdering(option.value)}>
                <Text style={[styles.modalOptionText, { color: '#FFFFFF' }, ordering === option.value && { fontWeight: '700' }]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={[styles.dateRow, { marginTop: 10 }]}>
              <TouchableOpacity style={[styles.dateInput, { backgroundColor: '#5B5270', borderColor: 'rgba(255,255,255,0.1)' }]} onPress={() => setShowStartDatePicker(true)}>
                <Text style={[styles.dateInputText, { color: '#FFFFFF' }]}>{startDate ? startDate.toLocaleDateString() : 'Start date'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dateInput, { backgroundColor: '#5B5270', borderColor: 'rgba(255,255,255,0.1)' }]} onPress={() => setShowEndDatePicker(true)}>
                <Text style={[styles.dateInputText, { color: '#FFFFFF' }]}>{endDate ? endDate.toLocaleDateString() : 'End date'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filtersModalFooter}>
              {hasActiveHistoryFilters && (
                <TouchableOpacity style={[styles.clearFiltersButton, styles.filtersModalClear]} onPress={clearFilters}>
                  <Text style={[styles.clearFiltersText, { color: '#FFFFFF' }]}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.filtersModalApply} onPress={() => setShowFiltersModal(false)}>
                <Text style={styles.filtersModalApplyText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 0, overflow: 'hidden' },
  floatingBubbles: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' },
  bubble: { position: 'absolute', borderRadius: 9999 },
  glassCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, shadowColor: '#120A24', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 6 },
  headerContainer: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 26, marginBottom: 14 },
  backButton: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  headerTitle: { fontSize: 26, fontWeight: '800', marginBottom: 2, marginTop: 20, textAlign: 'center' },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },
  analyticsButton: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  // ── Menu bar sits here once, above all tabs, never remounts ──
  menuBarWrapper: { zIndex: 10 },
  menuBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A4458', borderRadius: 25, padding: 4, zIndex: 1001, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  menuBarInline: { marginBottom: 18 },
  menuBarInlineCompact: { marginBottom: 10 },
  menuTabButton: { flex: 1 },
  menuTabButtonWide: { flex: 1.18 },
  menuTabActive: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  menuTabInactive: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  menuTabActiveText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  menuTabInactiveText: { fontSize: 14, fontWeight: '600', color: '#A0A0A0' },
  menuTabWideText: { flexShrink: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 80, paddingBottom: 30, backgroundColor: 'transparent', zIndex: 1 },
  entryPromptTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 4, marginBottom: 22 },
  moodCardsList: { gap: 16 },
  moodCardPressable: { width: '100%' },
  moodChoiceCard: { minHeight: 184, borderRadius: 26, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 26, paddingHorizontal: 18, position: 'relative' },
  moodChoiceEmoji: { fontSize: 68, lineHeight: 76, zIndex: 2 },
  moodChoiceLabel: { marginTop: 8, color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center', zIndex: 2 },
  moodChoiceWaveWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, justifyContent: 'flex-end' },
  moodChoiceWave: { position: 'absolute', left: -18, right: -18, bottom: -12, height: 58, borderTopLeftRadius: 70, borderTopRightRadius: 90, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, transform: [{ rotate: '-3deg' }] },
  moodChoiceMiniEmojiRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 26, paddingBottom: 18, zIndex: 2 },
  moodChoiceMiniEmojiBubble: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' },
  moodChoiceMiniEmoji: { fontSize: 13 },
  selectedMoodHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 12 },
  changeMoodButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2F2941', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, gap: 10 },
  changeMoodButtonText: { color: '#E6E2F4', fontSize: 15, fontWeight: '600' },
  selectedMoodPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 18, minWidth: 122, justifyContent: 'center' },
  selectedMoodPillEmoji: { fontSize: 20, marginRight: 8 },
  selectedMoodPillText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  enhancedDetailCard: { borderRadius: 24, paddingHorizontal: 22, paddingVertical: 26, marginTop: 0, marginBottom: 16 },
  enhancedSectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  helperText: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  enhancedHelperText: { textAlign: 'center', marginBottom: 22, fontSize: 14 },
  moodCardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moodCardIconBadge: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  moodCardHeaderLabel: { fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4 },
  moodCardSeparator: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 4 },
  intensityHeroWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  intensityHeroNumber: { color: '#FFC107', fontSize: 72, lineHeight: 78, fontWeight: '900' },
  intensityHeroLabel: { color: '#EDE7FF', fontSize: 16, fontWeight: '700', marginTop: -4 },
  gradientTrackWrapper: { width: '100%', height: 28, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  gradientTrack: { width: '100%', height: 8, borderRadius: 8 },
  slider: { width: '100%', height: 40 },
  sliderCaption: { position: 'absolute', left: 18, bottom: 8, fontSize: 12 },
  sliderCaptionRight: { position: 'absolute', right: 18, bottom: 8, fontSize: 12 },
  triggersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  triggerChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.04)' },
  triggerText: { fontSize: 14, fontWeight: '500' },
  enhancedTriggerChip: { backgroundColor: 'rgba(167,139,250,0.08)', borderColor: 'rgba(167,139,250,0.5)', borderWidth: 1.5, shadowOpacity: 0, elevation: 0 },
  enhancedTriggerChipSelected: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  enhancedTriggerText: { color: '#C4B0FF' },
  enhancedTriggerTextSelected: { color: '#FFFFFF' },
  textInput: { borderRadius: 12, padding: 15, fontSize: 15, borderWidth: 1, minHeight: 50 },
  textArea: { borderRadius: 12, padding: 15, fontSize: 15, borderWidth: 1, minHeight: 120 },
  submitButton: { borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 18, fontWeight: '700' },
  enhancedSubmitButton: { borderRadius: 22, paddingVertical: 0, marginTop: 8, overflow: 'hidden', alignSelf: 'stretch', width: '100%' },
  enhancedSubmitGradient: { width: '100%', paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  enhancedSubmitInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  contextToggleText: { fontSize: 16, fontWeight: '600' },
  trendButton: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
  trendButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  weeklyListCard: { backgroundColor: 'rgba(91,82,112,0.5)', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  weeklyAvatar: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  weeklyAvatarEmpty: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(203,190,240,0.12)', borderWidth: 1, borderColor: 'rgba(203,190,240,0.24)' },
  weeklyChartEmptyBadge: { width: 22, height: 22, borderRadius: 11, marginBottom: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(203,190,240,0.12)', borderWidth: 1, borderColor: 'rgba(203,190,240,0.2)' },
  weeklyChartEmptyTrack: { width: 8, height: 64, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(203,190,240,0.08)' },
  weeklyChartEmptyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBBEF0', opacity: 0.75 },
  historyContainer: { flex: 1, backgroundColor: 'transparent' },
  historyList: { padding: 20, backgroundColor: 'transparent' },
  historyMood: { fontSize: 17, fontWeight: '700' },
  moodAvatar: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 22 },
  intensityPill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  intensityPillText: { fontSize: 11, fontWeight: '700' },
  historyFilterRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 10, gap: 8 },
  historyFilterTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3E3653', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12 },
  historyFilterTriggerText: { color: '#EDE8FA', fontSize: 13, fontWeight: '700' },
  historyFilterClearIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5484D' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtext: { fontSize: 14, textAlign: 'center' },
  tabLoaderScreen: { flex: 1 },
  tabLoaderViewport: { width: '100%', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', borderRadius: 20, padding: 20, maxHeight: '70%' },
  filtersModalContent: { width: '88%', maxHeight: '78%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filtersModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  filtersModalClose: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  filtersModalFooter: { marginTop: 14, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 },
  filtersModalClear: { backgroundColor: '#E5484D', marginTop: 0, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, minHeight: 36 },
  filtersModalApply: { backgroundColor: '#6D5DD3', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, minHeight: 36, justifyContent: 'center' },
  filtersModalApplyText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 15, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderRadius: 12, marginBottom: 8, gap: 12 },
  modalOptionText: { fontSize: 16 },
  filterLabel: { fontSize: 14, marginBottom: 8, fontWeight: '600' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 10 },
  dateInput: { flex: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, marginRight: 8, alignItems: 'center' },
  dateInputText: { fontSize: 14 },
  clearFiltersButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  clearFiltersText: { fontSize: 14, fontWeight: '700' },
});
