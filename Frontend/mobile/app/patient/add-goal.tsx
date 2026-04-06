import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, Animated, useWindowDimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService, { CreatePatientGoalData } from '../services/patient.service';
import eventBus from '../utils/eventBus';
import StickyHeader from '../components/StickyHeader';
import { validateMeaningfulTextField } from '../utils/validation';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const GOAL_TITLE_MAX_LENGTH = 100;
const GOAL_DESCRIPTION_MAX_LENGTH = 1200;
const COUNTER_WARNING_RATIO = 0.8;
const GOAL_DESCRIPTION_SOFT_MIN_WORDS = 120;
const GOAL_DESCRIPTION_SOFT_MAX_WORDS = 200;

export default function AddGoalPage() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium');
  const [targetDate, setTargetDate] = useState('');
  const [dateObj, setDateObj] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [progress, setProgress] = useState('0');
  const [loading, setLoading] = useState(false);

  // Bubble animations
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

  // Scroll animation for sticky header
  const scrollY = useRef(new Animated.Value(0)).current;

  const pageInset = clamp(width * 0.03, 12, 18);
  const headerBackOffset = clamp(width * 0.018, 6, 8);
  const headerTopPadding = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding = clamp(height * 0.02, 14, 22);
  const headerButtonSize = clamp(width * 0.098, 34, 40);
  const headerButtonRadius = headerButtonSize / 2;
  const headerIconSize = clamp(width * 0.047, 16, 20);
  const headerTitleSize = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop = clamp(height * 0.022, 14, 22);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;
  const contentTopPadding = headerEstimatedHeight + clamp(height * 0.03, 20, 30);
  const cardPadding = clamp(width * 0.045, 14, 18);
  const cardRadius = clamp(width * 0.042, 13, 16);
  const cardTitleSize = clamp(width * 0.042, 15, 17);
  const cardMetaSize = clamp(width * 0.029, 10, 11);
  const cardSurface = '#3F3752';
  const cardBorder = 'rgba(255,255,255,0.16)';
  const iconBadgeSize = clamp(width * 0.076, 26, 32);
  const iconSize = clamp(width * 0.032, 11, 13);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setTargetDate('');
    setDateObj(null);
    setShowDatePicker(false);
    setProgress('0');
    setLoading(false);
  }, []);

  const titleCharCount = title.length;
  const descriptionCharCount = description.length;
  const descriptionWordCount = description.trim().split(/\s+/).filter(Boolean).length;
  const titleCounterWarn = titleCharCount >= Math.floor(GOAL_TITLE_MAX_LENGTH * COUNTER_WARNING_RATIO);
  const descriptionCounterWarn = descriptionCharCount >= Math.floor(GOAL_DESCRIPTION_MAX_LENGTH * COUNTER_WARNING_RATIO);
  const inSoftWordTarget = descriptionWordCount >= GOAL_DESCRIPTION_SOFT_MIN_WORDS && descriptionWordCount <= GOAL_DESCRIPTION_SOFT_MAX_WORDS;

  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [resetForm])
  );

  const submit = async () => {
    if (titleCharCount > GOAL_TITLE_MAX_LENGTH) {
      return Alert.alert('Validation', `Goal title cannot exceed ${GOAL_TITLE_MAX_LENGTH} characters.`);
    }

    if (descriptionCharCount > GOAL_DESCRIPTION_MAX_LENGTH) {
      return Alert.alert('Validation', `Goal description cannot exceed ${GOAL_DESCRIPTION_MAX_LENGTH} characters.`);
    }

    const titleValidation = validateMeaningfulTextField(title, 'Goal title', 2, false);
    if (!titleValidation.isValid) {
      return Alert.alert('Validation', titleValidation.message || 'Goal title is required');
    }

    const descriptionValidation = validateMeaningfulTextField(description, 'Goal description', 3, false);
    if (!descriptionValidation.isValid) {
      return Alert.alert('Validation', descriptionValidation.message || 'Goal description cannot be empty. Please add a description.');
    }

    const todayStart = getTodayStart();
    if (!dateObj) {
      return Alert.alert('Validation', 'Target date is required. Please select a target date.');
    }

    const selectedDate = new Date(dateObj);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < todayStart) {
      return Alert.alert('Validation', 'Target date cannot be in the past. Please select today or a future date.');
    }

    // ensure target_date sent to API is in YYYY-MM-DD format
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const apiTargetDate = `${yyyy}-${mm}-${dd}`;

    const payload: CreatePatientGoalData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      target_date: apiTargetDate,
      progress_percentage: Number(progress) || 0,
      milestones: undefined,
    };

    try {
      setLoading(true);
      await PatientService.createGoal(payload);
      // notify goals list to refresh
      try { eventBus.emit('refreshGoals'); } catch { /* ignore */ }
      // go back to goals list
      router.push('/patient/goals');
    } catch (e: any) {
      console.warn('Create goal failed', e);
      const apiError = e as { response?: { data?: Record<string, any> } };
      const descriptionError = apiError.response?.data?.description;
      const targetDateError = apiError.response?.data?.target_date;
      if (descriptionError) {
        Alert.alert('Validation', Array.isArray(descriptionError) ? descriptionError[0] : String(descriptionError));
      } else if (targetDateError) {
        Alert.alert('Validation', Array.isArray(targetDateError) ? targetDateError[0] : String(targetDateError));
      } else {
        Alert.alert('Error', 'Could not create goal');
      }
    } finally { setLoading(false); }
  };

  // Bubble animation effect
  useEffect(() => {
    const createFloatingAnimation = (
      animatedValueY: Animated.Value,
      animatedValueX: Animated.Value,
      durationY: number,
      durationX: number,
      delayY: number = 0,
      delayX: number = 0
    ) => {
      const animateY = () => {
        Animated.sequence([
          Animated.delay(delayY),
          Animated.loop(
            Animated.sequence([
              Animated.timing(animatedValueY, {
                toValue: 50,
                duration: durationY / 2,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValueY, {
                toValue: -50,
                duration: durationY / 2,
                useNativeDriver: true,
              }),
            ])
          ),
        ]).start();
      };

      const animateX = () => {
        Animated.sequence([
          Animated.delay(delayX),
          Animated.loop(
            Animated.sequence([
              Animated.timing(animatedValueX, {
                toValue: 50,
                duration: durationX / 2,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValueX, {
                toValue: -50,
                duration: durationX / 2,
                useNativeDriver: true,
              }),
            ])
          ),
        ]).start();
      };

      animateY();
      animateX();
    };

    createFloatingAnimation(bubble1Y, bubble1X, 8000, 10000, 0, 500);
    createFloatingAnimation(bubble2Y, bubble2X, 9000, 8500, 500, 1000);
    createFloatingAnimation(bubble3Y, bubble3X, 7500, 9500, 1000, 0);
    createFloatingAnimation(bubble4Y, bubble4X, 8500, 9000, 1500, 800);
    createFloatingAnimation(bubble5Y, bubble5X, 9500, 8000, 2000, 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    const current = selectedDate || dateObj;
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event?.type === 'dismissed') return;
    }
    if (current) {
      setDateObj(current);
      const dd = String(current.getDate()).padStart(2, '0');
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const yyyy = current.getFullYear();
      setTargetDate(`${dd}/${mm}/${yyyy}`);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#342949', '#2a1f3d', '#342949']}
        style={styles.screenGradient}
      >
        {/* Floating Bubbles */}
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '10%',
              left: '-10%',
              width: 120,
              height: 120,
              transform: [
                { translateY: bubble1Y },
                { translateX: bubble1X },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '30%',
              right: '-5%',
              width: 100,
              height: 100,
              transform: [
                { translateY: bubble2Y },
                { translateX: bubble2X },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '50%',
              left: '-8%',
              width: 90,
              height: 90,
              transform: [
                { translateY: bubble3Y },
                { translateX: bubble3X },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '70%',
              right: '-7%',
              width: 110,
              height: 110,
              transform: [
                { translateY: bubble4Y },
                { translateX: bubble4X },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              bottom: '5%',
              left: '5%',
              width: 95,
              height: 95,
              transform: [
                { translateY: bubble5Y },
                { translateX: bubble5X },
              ],
            },
          ]}
        />
      </LinearGradient>

      {/* Sticky Header - Appears on scroll */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Add"
        secondWord="Goal"
        onBackPress={() => router.push('/patient/goals')}
      />

      <Animated.View
        style={[
          styles.headerContainer,
          {
            paddingTop: headerTopPadding,
            paddingHorizontal: pageInset,
            paddingBottom: headerBottomPadding,
            opacity: scrollY.interpolate({
              inputRange: [0, 100, 150],
              outputRange: [1, 0.5, 0],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.push('/patient/goals')}
          style={[
            styles.backBtnCircle,
            {
              left: pageInset + headerBackOffset,
              top: headerTopPadding,
              width: headerButtonSize,
              height: headerButtonSize,
              borderRadius: headerButtonRadius,
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderColor: 'rgba(255,255,255,0.14)',
            },
          ]}
        >
          <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}>
          <Text style={styles.headerWhite}>Add </Text>
          <Text style={styles.headerPurple}>Goal</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView 
        style={styles.scroll} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: contentTopPadding }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={[styles.card, { borderRadius: cardRadius, backgroundColor: cardSurface, borderColor: cardBorder }]}>
          <View style={[styles.topAccent, { backgroundColor: '#A78BFA' }]} />
          <View style={{ padding: cardPadding }}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBadge, { width: iconBadgeSize, height: iconBadgeSize, borderRadius: iconBadgeSize / 2, backgroundColor: 'rgba(167,139,250,0.18)', borderColor: 'rgba(167,139,250,0.45)' }]}>
                <FontAwesome name="pencil" size={iconSize} color="#C4B0FF" />
              </View>
              <View>
                <Text style={[styles.cardHeaderLabel, { fontSize: cardTitleSize }]}>Goal Title</Text>
                <Text style={[styles.cardHeaderMeta, { fontSize: cardMetaSize }]}>REQUIRED</Text>
              </View>
            </View>
            <View style={styles.underlineInputWrap}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="E.g., Daily Meditation Practice"
                placeholderTextColor="rgba(184,168,230,0.45)"
                style={styles.titleInput}
                maxLength={GOAL_TITLE_MAX_LENGTH}
              />
            </View>
            <View style={styles.counterRowRight}>
              <Text style={[styles.counterText, titleCounterWarn && styles.counterTextWarn]}>
                {titleCharCount}/{GOAL_TITLE_MAX_LENGTH}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { borderRadius: cardRadius, backgroundColor: cardSurface, borderColor: cardBorder }]}>
          <View style={[styles.topAccent, { backgroundColor: '#FFB36B' }]} />
          <View style={{ padding: cardPadding }}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBadge, { width: iconBadgeSize, height: iconBadgeSize, borderRadius: iconBadgeSize / 2, backgroundColor: 'rgba(255,179,107,0.15)', borderColor: 'rgba(255,179,107,0.4)' }]}>
                <FontAwesome name="edit" size={iconSize} color="#FFB36B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardHeaderLabel, { fontSize: cardTitleSize }]}>Description</Text>
                <Text style={[styles.cardHeaderMeta, { fontSize: cardMetaSize, color: '#C9A97E' }]}>Explain your goal clearly</Text>
              </View>
            </View>
            <View style={styles.cardSeparator} />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your goal and why it matters to you..."
              placeholderTextColor="rgba(184,168,230,0.45)"
              style={styles.contentInput}
              multiline
              maxLength={GOAL_DESCRIPTION_MAX_LENGTH}
            />
            <View style={styles.counterRowSplit}>
              <Text style={[styles.softTargetText, inSoftWordTarget ? styles.softTargetTextGood : null]}>
                Soft target: {GOAL_DESCRIPTION_SOFT_MIN_WORDS}-{GOAL_DESCRIPTION_SOFT_MAX_WORDS} words ({descriptionWordCount})
              </Text>
              <Text style={[styles.counterText, descriptionCounterWarn && styles.counterTextWarn]}>
                {descriptionCharCount}/{GOAL_DESCRIPTION_MAX_LENGTH}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { borderRadius: cardRadius, backgroundColor: cardSurface, borderColor: cardBorder }]}>
          <View style={[styles.topAccent, { backgroundColor: '#8B5CF6' }]} />
          <View style={{ padding: cardPadding }}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBadge, { width: iconBadgeSize, height: iconBadgeSize, borderRadius: iconBadgeSize / 2, backgroundColor: 'rgba(139,92,246,0.18)', borderColor: 'rgba(139,92,246,0.45)' }]}>
                <FontAwesome name="calendar" size={iconSize} color="#C4B0FF" />
              </View>
              <View>
                <Text style={[styles.cardHeaderLabel, { fontSize: cardTitleSize }]}>Target Date</Text>
                <Text style={[styles.cardHeaderMeta, { fontSize: cardMetaSize }]}>Required deadline</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
              style={styles.dateTrigger}
            >
              <Text style={{ color: targetDate ? '#FFFFFF' : 'rgba(184,168,230,0.75)', fontWeight: '600' }}>
                {targetDate || 'Select target date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View style={styles.datePickerWrap}>
                <DateTimePicker
                  value={dateObj || getTodayStart()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={onChangeDate}
                  minimumDate={getTodayStart()}
                />
                {Platform.OS === 'ios' && (
                  <View style={styles.dateActionsRow}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.dateActionBtn}>
                      <Text style={styles.dateActionText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} style={[styles.dateActionBtn, styles.dateActionBtnPrimary]}>
                      <Text style={[styles.dateActionText, styles.dateActionTextPrimary]}>Done ✓</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={[styles.card, { borderRadius: cardRadius, backgroundColor: cardSurface, borderColor: cardBorder }]}>
          <View style={[styles.topAccent, { backgroundColor: '#FF9F6B' }]} />
          <View style={{ padding: cardPadding }}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBadge, { width: iconBadgeSize, height: iconBadgeSize, borderRadius: iconBadgeSize / 2, backgroundColor: 'rgba(255,159,107,0.16)', borderColor: 'rgba(255,159,107,0.42)' }]}>
                <FontAwesome name="line-chart" size={iconSize} color="#FFB36B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardHeaderLabel, { fontSize: cardTitleSize }]}>Initial Progress</Text>
                <Text style={[styles.cardHeaderMeta, { fontSize: cardMetaSize }]}>Set your starting point</Text>
              </View>
              <View style={styles.progressPercentPill}>
                <Text style={styles.progressPercent}>{progress || '0'}%</Text>
              </View>
            </View>
            <View style={styles.cardSeparator} />
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={Number(progress)}
              minimumTrackTintColor="#FF6EA5"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#FF6EA5"
              onValueChange={(v) => setProgress(String(Math.round(v)))}
            />
          </View>
        </View>

        <View style={[styles.card, { borderRadius: cardRadius, backgroundColor: cardSurface, borderColor: cardBorder }]}>
          <View style={[styles.topAccent, { backgroundColor: '#FF6EA5' }]} />
          <View style={{ padding: cardPadding }}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBadge, { width: iconBadgeSize, height: iconBadgeSize, borderRadius: iconBadgeSize / 2, backgroundColor: 'rgba(255,110,165,0.15)', borderColor: 'rgba(255,110,165,0.4)' }]}>
                <FontAwesome name="flag" size={iconSize} color="#FF8AB8" />
              </View>
              <View>
                <Text style={[styles.cardHeaderLabel, { fontSize: cardTitleSize }]}>Priority Level</Text>
                <Text style={[styles.cardHeaderMeta, { fontSize: cardMetaSize }]}>Choose urgency</Text>
              </View>
            </View>
            <View style={styles.priorityRow}>
              {(['low','medium','high'] as const).map((p) => (
                <TouchableOpacity key={p} onPress={() => setPriority(p)} style={[styles.priorityPill, priority === p && styles.priorityPillActive]}>
                  <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={submit} disabled={loading} style={{ marginTop: 20 }}>
          <View style={styles.saveBtn}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Add Goal</Text>}
          </View>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#342949' },
  screenGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(133, 130, 180, 0.15)',
    borderRadius: 1000,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 900,
  },
  backBtnCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  headerTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },
  scroll: { flex: 1, zIndex: 2 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { 
    backgroundColor: '#3F3752', 
    padding: 0,
    borderRadius: 14,
    marginBottom: 14,
    marginHorizontal: 0,
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    position: 'relative',
    overflow: 'hidden',
  },
  topAccent: {
    height: 3,
    width: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  cardHeaderLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cardHeaderMeta: {
    color: '#9D8EC7',
    letterSpacing: 1,
    marginTop: 1,
    textTransform: 'uppercase',
  },
  underlineInputWrap: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.22)',
    paddingBottom: 2,
  },
  titleInput: {
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 2,
    height: 42,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  contentInput: {
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 2,
    fontSize: 15,
    minHeight: 100,
    lineHeight: 22,
    letterSpacing: 0.2,
    textAlignVertical: 'top',
  },
  dateTrigger: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#4A4160',
  },
  datePickerWrap: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#5B5270',
  },
  dateActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  dateActionBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dateActionBtnPrimary: {
    backgroundColor: '#A78BFA',
    borderColor: '#A78BFA',
  },
  dateActionText: {
    color: '#E7DDF8',
    fontWeight: '700',
  },
  dateActionTextPrimary: {
    color: '#FFFFFF',
  },
  progressPercentPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  progressPercent: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  counterRowRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  counterRowSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 10,
  },
  counterText: {
    color: '#9D8EC7',
    fontSize: 12,
    fontWeight: '500',
  },
  counterTextWarn: {
    color: '#FFB36B',
    fontWeight: '700',
  },
  softTargetText: {
    color: '#9D8EC7',
    fontSize: 11,
    flex: 1,
  },
  softTargetTextGood: {
    color: '#8DE0B5',
    fontWeight: '700',
  },
  priorityRow: { flexDirection: 'row', marginTop: 4 },
  priorityPill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#5B5270', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  priorityPillActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  priorityText: { color: '#B8A8E6', fontWeight: '700' },
  priorityTextActive: { color: '#fff' },
  saveBtn: { 
    paddingVertical: 12, 
    borderRadius: 14, 
    alignItems: 'center',
    backgroundColor: '#A78BFA'
  },
  saveText: { color: '#fff', fontWeight: '800' },
});
