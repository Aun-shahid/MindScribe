import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService from '../services/patient.service';
import eventBus from '../utils/eventBus';
import type { CreateJournalEntryData, JournalPrompt } from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

const getInitialFormData = (): CreateJournalEntryData => ({
  title: '',
  content: '',
  mood_tags_list: [],
  is_private: true,
  is_favorite: false,
  entry_date: new Date().toISOString().split('T')[0],
});

// ─── Constants ────────────────────────────────────────────────────────────────
const MOOD_TAGS = [
  'Happy', 'Grateful', 'Anxious', 'Calm', 'Excited',
  'Sad', 'Hopeful', 'Stressed', 'Peaceful', 'Overwhelmed',
];

const MOOD_TAG_COLORS: Record<string, string> = {
  Happy: '#F7B731',     Grateful: '#2ECC71', Anxious: '#F39C12',
  Calm: '#3498DB',      Excited: '#E84393',  Sad: '#5D6DFA',
  Hopeful: '#9B59B6',   Stressed: '#E74C3C', Peaceful: '#1ABC9C',
  Overwhelmed: '#8E44AD',
};

// ─── Standard card system ─────────────────────────────────────────────────────
const C = {
  bg:           '#342949',
  bgMid:        '#2A1F3D',
  surface:      '#3F3752',
  surfaceMuted: '#4A4160',
  border:       'rgba(255,255,255,0.16)',
  borderAccent: 'rgba(167,139,250,0.35)',
  purple:       '#A78BFA',
  purpleDim:    'rgba(167,139,250,0.18)',
  orange:       '#FFB36B',
  orangeDim:    'rgba(255,179,107,0.15)',
  white:        '#FFFFFF',
  text:         '#EDE8FA',
  textMuted:    '#9D8EC7',
  textFaint:    '#B8A8E6',
  gold:         '#FFD54F',
} as const;

const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)',
  'rgba(167,139,250,0.08)',
  'rgba(52,41,73,0.72)',
];

// ─────────────────────────────────────────────────────────────────────────────
export default function CreateJournal() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [submitting,    setSubmitting]    = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [todayPrompt,   setTodayPrompt]   = useState<JournalPrompt | null>(null);
  const [promptError,   setPromptError]   = useState<'none' | 'no_prompts' | 'error'>('none');
  const [formData,      setFormData]      = useState<CreateJournalEntryData>(getInitialFormData());

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY  = useRef(new Animated.Value(0)).current;

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

  // ── Responsive tokens ──────────────────────────────────────────────────────
  const pi          = clamp(width * 0.048,  16, 24);
  const si          = clamp(width * 0.04,   14, 20);   // scroll inset
  const hTop        = insets.top + clamp(height * 0.014, 10, 18);
  const hBtnSz      = clamp(width * 0.098,  34, 40);
  const hBtnR       = hBtnSz / 2;
  const hIcon       = clamp(width * 0.047,  16, 20);
  const hTitleSz    = clamp(width * 0.075,  26, 32);
  const hMTop       = clamp(height * 0.022, 14, 22);
  const hPadBot     = clamp(height * 0.02,  14, 22);
  const hEst        = hTop + hMTop + hTitleSz + 8 + hPadBot;

  // bubbles
  const bLarge  = clamp(width * 0.74, 220, 320);
  const bMedium = clamp(width * 0.56, 170, 260);
  const bSmall  = clamp(width * 0.34, 110, 160);

  // layout
  const contTopPad  = hEst + clamp(height * 0.034, 22, 34);
  const contBotPad  = clamp(height * 0.05,   30, 46);
  const sGap        = clamp(height * 0.028,  18, 24);
  const cPad        = clamp(width * 0.045,   14, 18);
  const cR          = clamp(width * 0.042,   13, 16);

  // typography
  const cTitleSz    = clamp(width * 0.042,  15, 17);
  const cSubSz      = clamp(width * 0.034,  12, 14);
  const titleInSz   = clamp(width * 0.042,  15, 17);
  const bodyInSz    = clamp(width * 0.039,  14, 16);
  const bodyLH      = Math.round(bodyInSz * 1.45);
  const bodyMinH    = clamp(height * 0.24,  160, 220);
  const wordCntSz   = clamp(width * 0.033,  12, 13);
  const promptTSz   = clamp(width * 0.048,  17, 20);
  const promptBSz   = clamp(width * 0.039,  14, 16);
  const promptBLH   = Math.round(promptBSz * 1.5);
  const promptCPad  = clamp(width * 0.05,   16, 22);
  const promptR     = clamp(width * 0.045,  14, 18);
  const pillPadY    = clamp(height * 0.01,    6,  9);
  const pillPadX    = clamp(width * 0.033,   11, 14);
  const pillR       = clamp(width * 0.04,    14, 18);
  const pillTxtSz   = clamp(width * 0.035,   12, 14);
  const swLblSz     = clamp(width * 0.04,    14, 16);
  const swSubSz     = clamp(width * 0.031,   11, 12);
  const swW         = clamp(width * 0.13,    46, 52);
  const swH         = clamp(height * 0.04,   26, 30);
  const swR         = swH / 2;
  const swThumbSz   = clamp(height * 0.034,  22, 26);
  const iconBadgeSz = clamp(width * 0.076,   26, 32);
  const iconBadgeR  = clamp(width * 0.038,   13, 16);
  const iconSz      = clamp(width * 0.032,   11, 13);
  const submitPadY  = clamp(height * 0.016,  12, 15);
  const submitR     = clamp(width * 0.045,   14, 18);
  const submitTxtSz = clamp(width * 0.043,   15, 18);
  const submitIconSz= clamp(width * 0.046,   16, 19);

  // ── Bubble animations — restart on every focus ────────────────────────────
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

  // ── Init on focus ─────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      setFormData(getInitialFormData());
      loadTodayPrompt();
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      return () => {};
    }, [fadeAnim])
  );

  // ── Prompt load ───────────────────────────────────────────────────────────
  const loadTodayPrompt = async () => {
    setLoadingPrompt(true);
    try {
      const prompt = await PatientService.getTodayPrompt();
      setTodayPrompt(prompt);
      setPromptError('none');
      setFormData((prev) => ({ ...prev, prompt: prompt.prompt }));
    } catch (err: any) {
      if (err.response?.status === 404) {
        setPromptError('no_prompts');
      } else {
        console.error('[CreateJournal] Error loading prompt:', err);
        setPromptError('error');
      }
    } finally {
      setLoadingPrompt(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleMoodTag = (tag: string) => {
    setFormData((prev) => {
      const current = prev.mood_tags_list || [];
      return {
        ...prev,
        mood_tags_list: current.includes(tag)
          ? current.filter((t) => t !== tag)
          : [...current, tag],
      };
    });
  };

  const handleSubmit = async (retryCount = 0) => {
    if (!formData.title.trim()) {
      Alert.alert('Required Field', 'Please add a title to your journal entry');
      return;
    }
    if (!formData.content.trim()) {
      Alert.alert('Required Field', 'Please write some content');
      return;
    }
    setSubmitting(true);
    try {
      await PatientService.createJournalEntry(formData);
      eventBus.emit('journalUpdated');
      eventBus.emit('refreshDashboard');
      Alert.alert('Success', 'Journal entry saved successfully!', [
        { text: 'OK', onPress: () => router.push('./journal-list') },
      ]);
    } catch (err: any) {
      console.error('[Journal] Error creating:', err);
      const isNetworkError = !err.response && err.request;
      const isServerError  = err.response?.status >= 500;
      if (isNetworkError && retryCount < 1) {
        setSubmitting(false);
        setTimeout(() => handleSubmit(retryCount + 1), 1500);
        return;
      }
      let msg = 'Failed to save journal entry.';
      if (isNetworkError)              msg = 'Unable to connect. Please check your connection.';
      else if (isServerError)          msg = 'Server error. Please try again later.';
      else if (err.response?.data?.message) msg = err.response.data.message;
      Alert.alert('Failed to Save', msg, [
        { text: 'Try Again', onPress: () => handleSubmit(0) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const wordCount = formData.content.trim().split(/\s+/).filter((w) => w).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>

      {/* Background gradient */}
      <LinearGradient
        colors={[C.bg, C.bgMid, C.bg]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Ambient glow blobs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[s.glow, {
          width: bLarge * 1.1, height: bLarge * 1.1,
          top: -bLarge * 0.3, right: -bLarge * 0.3,
          backgroundColor: 'rgba(167,139,250,0.06)',
        }]} />
        <View style={[s.glow, {
          width: bMedium, height: bMedium,
          bottom: '18%', left: -bMedium * 0.35,
          backgroundColor: 'rgba(255,179,107,0.05)',
        }]} />
      </View>

      {/* Floating bubbles — odd=warm purple, even=cool light purple */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* 1 — odd */}
        <Animated.View style={[s.bubble, {
          width: bMedium, height: bMedium,
          top: '10%', left: '-10%',
          backgroundColor: 'rgba(167,139,250,0.15)',
        }, { transform: [{ translateY: b1y }, { translateX: b1x }] }]} />
        {/* 2 — even */}
        <Animated.View style={[s.bubble, {
          width: bLarge, height: bLarge,
          top: '25%', right: '-15%',
          backgroundColor: 'rgba(184,168,230,0.18)',
        }, { transform: [{ translateY: b2y }, { translateX: b2x }] }]} />
        {/* 3 — odd */}
        <Animated.View style={[s.bubble, {
          width: bMedium, height: bMedium,
          top: '50%', left: '10%',
          backgroundColor: 'rgba(167,139,250,0.13)',
        }, { transform: [{ translateY: b3y }, { translateX: b3x }] }]} />
        {/* 4 — even */}
        <Animated.View style={[s.bubble, {
          width: bLarge * 0.78, height: bLarge * 0.78,
          bottom: '15%', right: '5%',
          backgroundColor: 'rgba(184,168,230,0.22)',
        }, { transform: [{ translateY: b4y }, { translateX: b4x }] }]} />
        {/* 5 — odd */}
        <Animated.View style={[s.bubble, {
          width: bSmall, height: bSmall,
          bottom: '30%', left: '-5%',
          backgroundColor: 'rgba(167,139,250,0.19)',
        }, { transform: [{ translateY: b5y }, { translateX: b5x }] }]} />
      </View>

      {/* Sticky header */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="New"
        secondWord="Journal"
        onBackPress={() => router.back()}
      />

      {/* Fading large header */}
      <Animated.View style={[s.headerContainer, {
        paddingTop: hTop,
        paddingHorizontal: pi,
        paddingBottom: hPadBot,
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        }),
      }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.backBtnCircle, { left: pi, top: hTop, width: hBtnSz, height: hBtnSz, borderRadius: hBtnR }]}
        >
          <FontAwesome name="chevron-left" size={hIcon} color={C.white} />
        </TouchableOpacity>

        {/* Centred heading + gradient underline */}
        <View style={{ alignItems: 'center', marginTop: hMTop }}>
          <Text style={{ fontSize: hTitleSz, fontWeight: '800', textAlign: 'center' }}>
            <Text style={{ color: C.white }}>New </Text>
            <Text style={{ color: C.purple }}>Journal</Text>
          </Text>
          <LinearGradient
            colors={['transparent', C.purple, C.orange, 'transparent']}
            start={[0, 0]} end={[1, 0]}
            style={{
              height: 2,
              width: clamp(width * 0.3, 96, 130),
              borderRadius: 2,
              marginTop: clamp(height * 0.007, 5, 7),
            }}
          />
        </View>
      </Animated.View>

      {/* Scrollable form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: si,
            paddingTop: contTopPad,
            paddingBottom: contBotPad,
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* ══════════════════════════════════════════════
                TODAY'S PROMPT
            ══════════════════════════════════════════════ */}
            {loadingPrompt ? (
              <View style={[s.card, {
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 12, padding: promptCPad, borderRadius: promptR,
                backgroundColor: C.surface, borderColor: C.border,
                marginBottom: sGap,
              }]}>
                <LinearGradient colors={CARD_GRAD} start={{x:0,y:0}} end={{x:1,y:1}}
                  style={[StyleSheet.absoluteFill, { borderRadius: promptR, zIndex: -1 }]} pointerEvents="none" />
                <ActivityIndicator size="small" color={C.purple} />
                <Text style={{ color: C.textFaint, fontSize: cSubSz }}>
                  Loading today's prompt…
                </Text>
              </View>
            ) : todayPrompt ? (
              <View style={{ marginBottom: sGap }}>
                {/* Category badge */}
                <View style={{ marginBottom: clamp(height * 0.015, 10, 12) }}>
                  <View style={{
                    alignSelf: 'flex-start',
                    backgroundColor: 'rgba(200,255,230,0.92)',
                    paddingVertical: clamp(height * 0.008, 5, 7),
                    paddingHorizontal: clamp(width * 0.03, 10, 12),
                    borderRadius: pillR,
                  }}>
                    <Text style={{ color: '#1A5C35', fontSize: pillTxtSz, fontWeight: '700' }}>
                      ✨ {todayPrompt.category_display}
                    </Text>
                  </View>
                </View>

                {/* Prompt card */}
                <View style={[s.card, {
                  padding: promptCPad, borderRadius: promptR,
                  backgroundColor: C.surface, borderColor: C.border,
                  overflow: 'hidden',
                }]}>
                  <LinearGradient colors={CARD_GRAD} start={{x:0,y:0}} end={{x:1,y:1}}
                    style={[StyleSheet.absoluteFill, { borderRadius: promptR, zIndex: -1 }]} pointerEvents="none" />
                  {/* Purple accent strip */}
                  <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: 3, backgroundColor: C.purple,
                    borderTopLeftRadius: promptR, borderTopRightRadius: promptR,
                  }} />
                  <View style={{ marginTop: clamp(height * 0.01, 6, 10) }}>
                    <Text style={{ fontSize: clamp(width * 0.09, 30, 34), textAlign: 'center', marginBottom: clamp(height * 0.015, 10, 12) }}>
                      💭
                    </Text>
                    <Text style={{ color: C.white, fontSize: promptTSz, fontWeight: '700', lineHeight: Math.round(promptTSz * 1.45), textAlign: 'center', marginBottom: 8 }}>
                      {todayPrompt.prompt}
                    </Text>
                    {todayPrompt.description && (
                      <Text style={{ color: C.textFaint, fontSize: cSubSz, lineHeight: Math.round(cSubSz * 1.45), textAlign: 'center', fontStyle: 'italic' }}>
                        {todayPrompt.description}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ) : promptError === 'error' ? (
              <View style={[s.card, {
                padding: promptCPad, borderRadius: promptR,
                backgroundColor: C.surfaceMuted, borderColor: C.border,
                marginBottom: sGap, overflow: 'hidden',
              }]}>
                <LinearGradient colors={CARD_GRAD} start={{x:0,y:0}} end={{x:1,y:1}}
                  style={[StyleSheet.absoluteFill, { borderRadius: promptR, zIndex: -1 }]} pointerEvents="none" />
                <Text style={{ fontSize: clamp(width * 0.09, 30, 34), textAlign: 'center', marginBottom: clamp(height * 0.015, 10, 12) }}>📝</Text>
                <Text style={{ color: C.text, fontSize: promptBSz, lineHeight: promptBLH, textAlign: 'center', fontStyle: 'italic' }}>
                  Unable to load today's prompt, but you can still write freely!
                </Text>
              </View>
            ) : null}

            {/* ══════════════════════════════════════════════
                TITLE CARD
            ══════════════════════════════════════════════ */}
            <View style={[s.card, {
              padding: 0, overflow: 'hidden',
              borderRadius: cR, backgroundColor: C.surface,
              borderColor: C.border, marginBottom: sGap,
            }]}>
              <LinearGradient colors={CARD_GRAD} start={{x:0,y:0}} end={{x:1,y:1}}
                style={[StyleSheet.absoluteFill, { borderRadius: cR, zIndex: -1 }]} pointerEvents="none" />
              {/* Purple accent strip */}
              <View style={{ height: 3, backgroundColor: C.purple, borderTopLeftRadius: cR, borderTopRightRadius: cR }} />

              <View style={{ padding: cPad }}>
                {/* Header row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: clamp(height * 0.018, 12, 16) }}>
                  <LinearGradient
                    colors={[`${C.purple}30`, `${C.purple}10`]}
                    style={[s.iconBadge, { width: iconBadgeSz, height: iconBadgeSz, borderRadius: iconBadgeR, borderColor: `${C.purple}50` }]}
                  >
                    <FontAwesome name="pencil" size={iconSz} color="#C4B0FF" />
                  </LinearGradient>
                  <View>
                    <Text style={{ color: C.white, fontSize: cTitleSz, fontWeight: '800', letterSpacing: 0.5 }}>
                      Entry Title
                    </Text>
                    <Text style={{ color: C.textMuted, fontSize: clamp(width * 0.029, 10, 11), letterSpacing: 1.2, marginTop: 1 }}>
                      REQUIRED
                    </Text>
                  </View>
                </View>

                {/* Underline input */}
                <View style={{ borderBottomWidth: 1.5, borderBottomColor: `${C.purple}70`, paddingBottom: 4 }}>
                  <TextInput
                    style={{
                      backgroundColor: 'transparent', color: C.white,
                      paddingVertical: clamp(height * 0.009, 6, 8),
                      paddingHorizontal: 2,
                      height: clamp(height * 0.056, 38, 44),
                      fontSize: titleInSz, fontWeight: '700', letterSpacing: 0.3,
                    }}
                    placeholder="Give your entry a title..."
                    placeholderTextColor="rgba(184,168,230,0.45)"
                    value={formData.title}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
                  />
                </View>
              </View>
            </View>

            {/* ══════════════════════════════════════════════
                CONTENT CARD
            ══════════════════════════════════════════════ */}
            <View style={[s.card, {
              padding: 0, overflow: 'hidden',
              borderRadius: cR, backgroundColor: C.surface,
              borderColor: C.border, marginBottom: sGap,
            }]}>
              <LinearGradient colors={CARD_GRAD} start={{x:0,y:0}} end={{x:1,y:1}}
                style={[StyleSheet.absoluteFill, { borderRadius: cR, zIndex: -1 }]} pointerEvents="none" />
              {/* Orange accent strip */}
              <View style={{ height: 3, backgroundColor: C.orange, borderTopLeftRadius: cR, borderTopRightRadius: cR }} />

              <View style={{ padding: cPad }}>
                {/* Header row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: clamp(height * 0.014, 10, 14) }}>
                  <LinearGradient
                    colors={[`${C.orange}30`, `${C.orange}10`]}
                    style={[s.iconBadge, { width: iconBadgeSz, height: iconBadgeSz, borderRadius: iconBadgeR, borderColor: `${C.orange}50` }]}
                  >
                    <FontAwesome name="edit" size={iconSz} color={C.orange} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.white, fontSize: cTitleSz, fontWeight: '800', letterSpacing: 0.4 }}>
                      What's on your mind?
                    </Text>
                    <Text style={{ color: '#C9A97E', fontSize: clamp(width * 0.029, 10, 11), letterSpacing: 0.8, marginTop: 1 }}>
                      Write freely — no rules here
                    </Text>
                  </View>
                </View>

                {/* Separator */}
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 4 }} />

                {/* Text area */}
                <TextInput
                  style={{
                    backgroundColor: 'transparent', color: C.white,
                    paddingVertical: clamp(height * 0.016, 10, 14),
                    paddingHorizontal: 2,
                    fontSize: bodyInSz, minHeight: bodyMinH,
                    lineHeight: bodyLH, letterSpacing: 0.2,
                  }}
                  placeholder="Start writing... Express yourself freely."
                  placeholderTextColor="rgba(184,168,230,0.45)"
                  value={formData.content}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, content: text }))}
                  multiline
                  numberOfLines={12}
                  textAlignVertical="top"
                />

                {/* Word count footer */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  marginTop: 8, paddingTop: 8,
                  borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
                }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.orange, opacity: 0.7 }} />
                  <Text style={{ color: C.textMuted, fontSize: wordCntSz, fontStyle: 'italic' }}>
                    {wordCount} words
                  </Text>
                </View>
              </View>
            </View>

            {/* ══════════════════════════════════════════════
                TAGS CARD
            ══════════════════════════════════════════════ */}
            <View style={[s.card, {
              padding: cPad, overflow: 'hidden',
              borderRadius: cR, backgroundColor: C.surface,
              borderColor: C.border, marginBottom: sGap,
            }]}>
              <LinearGradient colors={CARD_GRAD} start={{x:0,y:0}} end={{x:1,y:1}}
                style={[StyleSheet.absoluteFill, { borderRadius: cR, zIndex: -1 }]} pointerEvents="none" />
              {/* Accent strip — absolute */}
              <View style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: 3, backgroundColor: C.purple,
                borderTopLeftRadius: cR, borderTopRightRadius: cR,
              }} />

              <View style={{ marginTop: clamp(height * 0.008, 4, 8) }}>
                <Text style={{ color: C.white, fontSize: cTitleSz, fontWeight: '700', marginBottom: clamp(height * 0.008, 5, 7) }}>
                  🎨 Tags{' '}
                  <Text style={{ color: C.textMuted, fontWeight: '500' }}>(Optional)</Text>
                </Text>
                <Text style={{ color: C.textFaint, fontSize: cSubSz, marginBottom: clamp(height * 0.015, 10, 12) }}>
                  Select tags that describe your current state
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: clamp(width * 0.025, 8, 10) }}>
                  {MOOD_TAGS.map((tag) => {
                    const isSelected = formData.mood_tags_list?.includes(tag);
                    const tagColor   = MOOD_TAG_COLORS[tag] || C.textFaint;
                    return (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => toggleMoodTag(tag)}
                        style={{
                          paddingVertical: pillPadY, paddingHorizontal: pillPadX,
                          borderRadius: pillR, borderWidth: 1,
                          borderColor: tagColor,
                          backgroundColor: isSelected ? tagColor : `${tagColor}24`,
                        }}
                      >
                        <Text style={{ color: C.white, fontSize: pillTxtSz, fontWeight: '600' }}>
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ══════════════════════════════════════════════
                FAVOURITE TOGGLE CARD
            ══════════════════════════════════════════════ */}
            <View style={[s.card, {
              padding: cPad, overflow: 'hidden',
              borderRadius: cR, backgroundColor: C.surface,
              borderColor: C.border, marginBottom: sGap,
            }]}>
              <LinearGradient colors={CARD_GRAD} start={{x:0,y:0}} end={{x:1,y:1}}
                style={[StyleSheet.absoluteFill, { borderRadius: cR, zIndex: -1 }]} pointerEvents="none" />
              <View style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: 3, backgroundColor: C.orange,
                borderTopLeftRadius: cR, borderTopRightRadius: cR,
              }} />

              <TouchableOpacity
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: clamp(height * 0.016, 10, 14),
                  marginTop: clamp(height * 0.008, 4, 8),
                }}
                onPress={() => setFormData((prev) => ({ ...prev, is_favorite: !prev.is_favorite }))}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: clamp(width * 0.086, 30, 36), height: clamp(width * 0.086, 30, 36),
                    borderRadius: clamp(width * 0.043, 15, 18),
                    backgroundColor: 'rgba(255,196,92,0.18)',
                    borderWidth: 1, borderColor: 'rgba(255,196,92,0.45)',
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: clamp(width * 0.028, 10, 13),
                  }}>
                    <Text style={{ fontSize: clamp(width * 0.048, 16, 20) }}>⭐</Text>
                  </View>
                  <View>
                    <Text style={{ color: C.white, fontSize: swLblSz, fontWeight: '700' }}>
                      Mark as Favourite
                    </Text>
                    <Text style={{ color: '#CEC2EE', fontSize: swSubSz, marginTop: 2 }}>
                      Pin this journal for quick access
                    </Text>
                  </View>
                </View>

                {/* Toggle */}
                <View style={{
                  width: swW, height: swH, borderRadius: swR, padding: 2,
                  borderWidth: 1,
                  borderColor: formData.is_favorite ? '#FFD27A' : 'rgba(255,255,255,0.24)',
                  backgroundColor: formData.is_favorite ? '#F5A623' : '#8E87A8',
                }}>
                  <View style={{
                    width: swThumbSz, height: swThumbSz,
                    borderRadius: swThumbSz / 2, backgroundColor: C.white,
                    transform: [{ translateX: formData.is_favorite ? clamp(width * 0.055, 20, 24) : 2 }],
                    shadowColor: '#000', shadowOpacity: 0.2,
                    shadowOffset: { width: 0, height: 2 }, shadowRadius: 2, elevation: 2,
                  }} />
                </View>
              </TouchableOpacity>
            </View>

            {/* ══════════════════════════════════════════════
                SAVE BUTTON
            ══════════════════════════════════════════════ */}
            <TouchableOpacity
              onPress={() => handleSubmit(0)}
              disabled={submitting}
              activeOpacity={0.9}
              style={[{
                borderRadius: submitR, overflow: 'hidden',
                marginTop: clamp(height * 0.02, 12, 18),
                opacity: submitting ? 0.6 : 1,
              }]}
            >
              <LinearGradient
                colors={['#8B5CF6', '#A78BFA']}
                start={[0, 0]} end={[1, 1]}
                style={{
                  width: '100%',
                  minHeight: clamp(height * 0.064, 48, 56),
                  borderRadius: submitR,
                  alignItems: 'center', justifyContent: 'center',
                  paddingVertical: submitPadY,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: clamp(width * 0.024, 8, 10) }}>
                  <FontAwesome name={submitting ? 'spinner' : 'save'} size={submitIconSz} color={C.white} />
                  <Text style={{ color: C.white, fontSize: submitTxtSz, fontWeight: '700' }}>
                    {submitting ? '✨ Saving...' : 'Save Journal Entry'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  glow:      { position: 'absolute', borderRadius: 9999 },
  bubble:    { position: 'absolute', borderRadius: 9999 },

  headerContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900,
  },
  backBtnCircle: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000', shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1,
  },

  card: {
    elevation: 7,
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    borderWidth: 1,
  },
  iconBadge: {
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
});
