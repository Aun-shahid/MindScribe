import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Animated, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import PatientService from '../services/patient.service';
import StarRating from '../components/StarRating';
import StickyHeader from '../components/StickyHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)',
  'rgba(167,139,250,0.08)',
  'rgba(52,41,73,0.72)',
];

export default function RelaxationSessionScreen() {
  const { contentId, contentTitle, contentCategory, durationListened } = useLocalSearchParams();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [moodBefore, setMoodBefore] = useState<number>(3);
  const [moodAfter, setMoodAfter]   = useState<number>(4);
  const [rating, setRating]         = useState<number>(4);
  const [notes, setNotes]           = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

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
  const scrollY = useRef(new Animated.Value(0)).current;

  const pageInset              = clamp(width * 0.03, 12, 18);
  const headerBackOffset       = clamp(width * 0.018, 6, 8);
  const headerTopPadding       = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding    = clamp(height * 0.02, 14, 22);
  const headerButtonSize       = clamp(width * 0.098, 34, 40);
  const headerButtonRadius     = headerButtonSize / 2;
  const headerIconSize         = clamp(width * 0.047, 16, 20);
  const headerTitleSize        = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop   = clamp(height * 0.022, 14, 22);
  const headerEstimatedHeight  = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;

  const bubbleLarge  = clamp(width * 0.74, 220, 310);
  const bubbleMedium = clamp(width * 0.52, 170, 230);
  const bubbleSmall  = clamp(width * 0.32,  96, 132);

  const contentTopPadding      = headerEstimatedHeight + clamp(height * 0.018, 12, 20);
  const contentBottomPadding   = clamp(insets.bottom + height * 0.035, 34, 52);
  const contentGap             = clamp(height * 0.02, 14, 22);
  const cardRadius             = clamp(width * 0.05, 16, 22);
  const cardPadding            = clamp(width * 0.05, 16, 22);
  const sessionTitleSize       = clamp(width * 0.065, 22, 30);
  const summaryTextSize        = clamp(width * 0.036, 13, 15);
  const pillTextSize           = clamp(width * 0.033, 12, 13);
  const pillPadX               = clamp(width * 0.03, 10, 14);
  const pillPadY               = clamp(height * 0.008, 5, 8);
  const sectionTitleSize       = clamp(width * 0.046, 16, 20);
  const sectionSubSize         = clamp(width * 0.034, 12, 14);
  const sectionTitleBottom     = clamp(height * 0.007, 4, 7);
  const sectionSubBottom       = clamp(height * 0.018, 12, 18);
  const formSectionBottom      = clamp(height * 0.034, 22, 30);
  const dividerBottom          = clamp(height * 0.03, 20, 26);
  const titleBottom            = clamp(height * 0.012, 8, 12);
  const summaryCopyBottom      = clamp(height * 0.024, 14, 18);
  const summaryCopyLineHeight  = clamp(height * 0.028, 20, 24);
  const summaryEyebrowSize     = clamp(width * 0.03, 11, 13);
  const summaryEyebrowLetterSpacing = clamp(width * 0.0028, 0.9, 1.2);
  const summaryEyebrowBottom   = clamp(height * 0.014, 8, 12);
  const metaGap                = clamp(width * 0.026, 8, 12);
  const starShellPadY          = clamp(height * 0.012, 8, 12);
  const starShellRadius        = clamp(width * 0.04, 14, 18);
  const moodNumBottom          = clamp(height * 0.006, 3, 5);
  const textAreaSize           = clamp(width * 0.038, 14, 16);
  const skipPadY               = clamp(height * 0.01, 6, 10);
  const buttonShadowY          = clamp(height * 0.005, 3, 5);
  const buttonShadowRadius     = clamp(width * 0.02, 6, 10);
  const headerShadowRadius     = clamp(width * 0.018, 5, 7);
  const backShadowY            = clamp(height * 0.003, 1, 3);
  const activeMoodShadowY      = clamp(height * 0.008, 4, 7);
  const activeMoodShadowRadius = clamp(width * 0.032, 10, 14);
  const moodGap                = clamp(width * 0.018, 6, 10);
  const moodPadY               = clamp(height * 0.018, 12, 18);
  const moodNumberSize         = clamp(width * 0.052, 18, 24);
  const moodLabelSize          = clamp(width * 0.026, 9, 11);
  const textareaMinHeight      = clamp(height * 0.14, 96, 132);
  const textareaPad            = clamp(width * 0.04, 12, 16);
  const buttonRadius           = clamp(width * 0.07, 22, 28);
  const buttonPadY             = clamp(height * 0.018, 12, 18);
  const buttonTextSize         = clamp(width * 0.043, 15, 19);

  const listenedSeconds = Number(durationListened) || 0;
  const listenedLabel = listenedSeconds > 0
    ? `${Math.floor(listenedSeconds / 60)}m ${String(listenedSeconds % 60).padStart(2, '0')}s listened`
    : 'Session completed';

  const moodScale = [
    { value: 1, label: 'Low' },
    { value: 2, label: 'Heavy' },
    { value: 3, label: 'Steady' },
    { value: 4, label: 'Calm' },
    { value: 5, label: 'Light' },
  ];

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
    }, [b1x,b1y,b2x,b2y,b3x,b3y,b4x,b4y,b5x,b5y])
  );

  const handleCompleteSession = async () => {
    if (!contentId) {
      Alert.alert('Error', 'Missing session information');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        content: String(contentId),
        duration_listened_seconds: Number(durationListened) || 0,
        completed: true,
        rating: rating ?? null,
        mood_before: moodBefore != null ? String(moodBefore) : null,
        mood_after:  moodAfter  != null ? String(moodAfter)  : null,
        notes: (notes && notes.trim().length > 0) ? notes.trim() : null,
      };
      await PatientService.createRelaxationSession(payload);
      Alert.alert('Session saved', 'Your relaxation session has been recorded successfully');
      router.push('/patient/actions');
    } catch (err: any) {
      const serverDetail = err?.response?.data?.detail || err?.response?.data || err?.message;
      Alert.alert('Error', String(serverDetail || 'Failed to save session'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Session Rating',
      'Are you sure you want to skip rating this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: () => router.push('/patient/actions') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#342949', '#2A1F3D', '#342949']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Bubbles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[styles.bubble, {
          width: bubbleMedium, height: bubbleMedium,
          top: clamp(height * 0.06, 34, 62),
          right: -clamp(width * 0.12, 36, 56),
          backgroundColor: 'rgba(167,139,250,0.25)',
          transform: [{ translateY: b1y }, { translateX: b1x }],
        }]} />
        <Animated.View style={[styles.bubble, {
          width: bubbleLarge, height: bubbleLarge,
          top: -clamp(height * 0.12, 80, 120),
          left: -clamp(width * 0.18, 56, 88),
          backgroundColor: 'rgba(184,168,230,0.20)',
          transform: [{ translateY: b2y }, { translateX: b2x }],
        }]} />
        <Animated.View style={[styles.bubble, {
          width: clamp(width * 0.4, 120, 170), height: clamp(width * 0.4, 120, 170),
          bottom: clamp(height * 0.24, 160, 230),
          left: -clamp(width * 0.08, 20, 36),
          backgroundColor: 'rgba(167,139,250,0.22)',
          transform: [{ translateY: b3y }, { translateX: b3x }],
        }]} />
        <Animated.View style={[styles.bubble, {
          width: clamp(width * 0.48, 150, 200), height: clamp(width * 0.48, 150, 200),
          bottom: clamp(height * 0.12, 80, 120),
          right: -clamp(width * 0.14, 42, 70),
          backgroundColor: 'rgba(184,168,230,0.18)',
          transform: [{ translateY: b4y }, { translateX: b4x }],
        }]} />
        <Animated.View style={[styles.bubble, {
          width: bubbleSmall, height: bubbleSmall,
          top: '40%',
          right: clamp(width * 0.05, 14, 24),
          backgroundColor: 'rgba(167,139,250,0.15)',
          transform: [{ translateY: b5y }, { translateX: b5x }],
        }]} />
      </View>

      {/* ── Both back buttons now go to /patient/actions ── */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Session"
        secondWord="Reflection"
        onBackPress={() => router.push('/patient/actions')}
      />

      <Animated.View style={[styles.headerContainer, {
        paddingTop: headerTopPadding,
        paddingHorizontal: pageInset,
        paddingBottom: headerBottomPadding,
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        }),
      }]}>
        <TouchableOpacity
          onPress={() => router.push('/patient/actions')}
          style={[
            styles.backBtnCircle,
            {
              left: pageInset + headerBackOffset,
              top: headerTopPadding,
              width: headerButtonSize,
              height: headerButtonSize,
              borderRadius: headerButtonRadius,
              shadowOffset: { width: 0, height: backShadowY },
              shadowRadius: headerShadowRadius,
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderColor: 'rgba(255,255,255,0.14)',
            },
          ]}
        >
          <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}>
          <Text style={styles.headerWhite}>Session </Text>
          <Text style={styles.headerPurple}>Reflection</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, {
          paddingTop: contentTopPadding,
          paddingBottom: contentBottomPadding,
          paddingHorizontal: pageInset,
        }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Summary Card */}
        <View style={[styles.summaryCard, {
          borderRadius: cardRadius,
          padding: cardPadding,
          marginBottom: contentGap,
        }]}>
          <LinearGradient
            colors={CARD_GRAD}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: cardRadius }]}
            pointerEvents="none"
          />
          <View style={{ flexDirection: 'row', height: 3, position: 'absolute', top: 0, left: 0, right: 0 }}>
            <View style={{ flex: 1, backgroundColor: '#A78BFA', borderTopLeftRadius: cardRadius }} />
            <View style={{ flex: 1, backgroundColor: '#FFB36B', borderTopRightRadius: cardRadius }} />
          </View>

          <Text style={[styles.summaryEyebrow, {
            fontSize: summaryEyebrowSize,
            letterSpacing: summaryEyebrowLetterSpacing,
            marginBottom: summaryEyebrowBottom,
            marginTop: 10,
          }]}>
            Relaxation completed
          </Text>
          <Text style={[styles.sessionTitle, { fontSize: sessionTitleSize, marginBottom: titleBottom }]}>
            {contentTitle}
          </Text>
          <Text style={[styles.summaryCopy, {
            fontSize: summaryTextSize,
            lineHeight: summaryCopyLineHeight,
            marginBottom: summaryCopyBottom,
          }]}>
            Capture how this session shifted your mood and how it felt in the moment.
          </Text>
          <View style={[styles.metaRow, { gap: metaGap }]}>
            <View style={[styles.metaPill, { paddingHorizontal: pillPadX, paddingVertical: pillPadY, borderRadius: cardRadius }]}>
              <Text style={[styles.metaPillText, { fontSize: pillTextSize }]}>{contentCategory}</Text>
            </View>
            <View style={[styles.metaPill, styles.metaPillAccent, { paddingHorizontal: pillPadX, paddingVertical: pillPadY, borderRadius: cardRadius }]}>
              <Text style={[styles.metaPillText, { fontSize: pillTextSize }]}>{listenedLabel}</Text>
            </View>
          </View>
        </View>

        {/* Form Card */}
        <View style={[styles.formCard, { borderRadius: cardRadius, padding: cardPadding }]}>
          <LinearGradient
            colors={CARD_GRAD}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: cardRadius }]}
            pointerEvents="none"
          />
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 3, backgroundColor: '#A78BFA',
            borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius,
          }} />

          {/* Mood Before */}
          <View style={[styles.formSection, { marginBottom: formSectionBottom, marginTop: 10 }]}>
            <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize, marginBottom: sectionTitleBottom }]}>Mood Before</Text>
            <Text style={[styles.sectionSubtitle, { fontSize: sectionSubSize, marginBottom: sectionSubBottom }]}>How were you feeling before you started listening?</Text>
            <View style={[styles.moodButtons, { gap: moodGap }]}>
              {moodScale.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setMoodBefore(item.value)}
                  style={[
                    styles.moodButton,
                    { paddingVertical: moodPadY, borderRadius: cardRadius - 4 },
                    moodBefore === item.value && styles.moodButtonActive,
                    moodBefore === item.value && { shadowOffset: { width: 0, height: activeMoodShadowY }, shadowRadius: activeMoodShadowRadius },
                  ]}
                  activeOpacity={0.82}
                >
                  <Text style={[
                    styles.moodButtonText,
                    { fontSize: moodNumberSize, marginBottom: moodNumBottom },
                    moodBefore === item.value && styles.moodButtonTextActive,
                  ]}>{item.value}</Text>
                  <Text style={[
                    styles.moodLabel,
                    { fontSize: moodLabelSize },
                    moodBefore === item.value && styles.moodLabelActive,
                  ]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.sectionDivider, { marginBottom: dividerBottom }]} />

          {/* Mood After */}
          <View style={[styles.formSection, { marginBottom: formSectionBottom }]}>
            <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize, marginBottom: sectionTitleBottom }]}>Mood After</Text>
            <Text style={[styles.sectionSubtitle, { fontSize: sectionSubSize, marginBottom: sectionSubBottom }]}>Where did the session leave you emotionally?</Text>
            <View style={[styles.moodButtons, { gap: moodGap }]}>
              {moodScale.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setMoodAfter(item.value)}
                  style={[
                    styles.moodButton,
                    { paddingVertical: moodPadY, borderRadius: cardRadius - 4 },
                    moodAfter === item.value && styles.moodButtonActive,
                    moodAfter === item.value && { shadowOffset: { width: 0, height: activeMoodShadowY }, shadowRadius: activeMoodShadowRadius },
                  ]}
                  activeOpacity={0.82}
                >
                  <Text style={[
                    styles.moodButtonText,
                    { fontSize: moodNumberSize, marginBottom: moodNumBottom },
                    moodAfter === item.value && styles.moodButtonTextActive,
                  ]}>{item.value}</Text>
                  <Text style={[
                    styles.moodLabel,
                    { fontSize: moodLabelSize },
                    moodAfter === item.value && styles.moodLabelActive,
                  ]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.sectionDivider, { marginBottom: dividerBottom }]} />

          {/* Session Rating */}
          <View style={[styles.formSection, { marginBottom: formSectionBottom }]}>
            <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize, marginBottom: sectionTitleBottom }]}>Session Rating</Text>
            <Text style={[styles.sectionSubtitle, { fontSize: sectionSubSize, marginBottom: sectionSubBottom }]}>Give this experience a quick quality check.</Text>
            <View style={[styles.starShell, { paddingVertical: starShellPadY, borderRadius: starShellRadius }]}>
              <StarRating value={rating} onChange={setRating} />
            </View>
          </View>

          <View style={[styles.sectionDivider, { marginBottom: dividerBottom }]} />

          {/* Reflection Notes */}
          <View style={[styles.formSection, { marginBottom: formSectionBottom }]}>
            <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize, marginBottom: sectionTitleBottom }]}>Reflection Notes</Text>
            <Text style={[styles.sectionSubtitle, { fontSize: sectionSubSize, marginBottom: sectionSubBottom }]}>Optional, but helpful if something stood out during the session.</Text>
            <TextInput
              multiline
              numberOfLines={5}
              value={notes}
              onChangeText={setNotes}
              placeholder="Write a few words about what shifted, what helped, or what you want to remember."
              placeholderTextColor="rgba(255,255,255,0.38)"
              style={[styles.textArea, {
                minHeight: textareaMinHeight,
                padding: textareaPad,
                borderRadius: cardRadius - 2,
                fontSize: textAreaSize,
              }]}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.completeBtn,
              {
                paddingVertical: buttonPadY,
                borderRadius: buttonRadius,
                shadowOffset: { width: 0, height: buttonShadowY },
                shadowRadius: buttonShadowRadius,
              },
              submitting && styles.completeBtnDisabled,
            ]}
            onPress={handleCompleteSession}
            disabled={submitting}
            activeOpacity={0.88}
          >
            <Text style={[styles.completeBtnText, { fontSize: buttonTextSize }]}>
              {submitting ? 'Saving...' : 'Complete Session'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.skipBtn, { marginTop: clamp(height * 0.014, 10, 14), paddingVertical: skipPadY }]}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text style={[styles.skipBtnText, { fontSize: sectionSubSize + 1 }]}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bubble: { position: 'absolute', borderRadius: 1000 },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900 },
  backBtnCircle: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.03, elevation: 1,
  },
  headerTitle:  { fontWeight: '800', textAlign: 'center' },
  headerWhite:  { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },
  scrollView: { flex: 1, zIndex: 2 },
  content:    { width: '100%' },
  summaryCard: {
    overflow: 'hidden',
    backgroundColor: '#3F3752',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 7,
  },
  summaryEyebrow: {
    color: '#D8B4FE',
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  sessionTitle: { fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  summaryCopy:  { color: 'rgba(255,255,255,0.72)', textAlign: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  metaPill: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  metaPillAccent: {
    backgroundColor: 'rgba(139,92,246,0.14)',
    borderColor: 'rgba(192,132,252,0.28)',
  },
  metaPillText: { color: '#FFFFFF', fontWeight: '600' },
  formCard: {
    overflow: 'hidden',
    backgroundColor: '#3F3752',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 7,
  },
  formSection:     {},
  sectionDivider:  { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  sectionTitle:    { fontWeight: 'bold', color: '#FFFFFF' },
  sectionSubtitle: { color: 'rgba(255,255,255,0.7)' },
  moodButtons:     { flexDirection: 'row', justifyContent: 'space-between' },
  moodButton: {
    flex: 1,
    backgroundColor: 'rgba(27,19,42,0.82)',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  moodButtonActive: {
    backgroundColor: 'rgba(124,58,237,0.84)',
    borderColor: '#C4B5FD',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.18,
    elevation: 3,
  },
  moodButtonText:       { fontWeight: 'bold', color: 'rgba(255,255,255,0.5)' },
  moodButtonTextActive: { color: '#FFFFFF' },
  moodLabel:            { color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  moodLabelActive:      { color: 'rgba(255,255,255,0.8)' },
  starShell: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  textArea: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    color: '#FFFFFF',
    textAlignVertical: 'top',
    backgroundColor: 'rgba(27,19,42,0.82)',
  },
  completeBtn: {
    width: '100%',
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    elevation: 6,
  },
  completeBtnDisabled: { opacity: 0.6 },
  completeBtnText:     { color: '#FFFFFF', fontWeight: 'bold' },
  skipBtn:             { alignItems: 'center' },
  skipBtnText:         { color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
});