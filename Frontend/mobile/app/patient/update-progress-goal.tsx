import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  PanResponder, useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing as ReanimatedEasing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Animated as RNAnimated } from 'react-native';
import StickyHeader from '../components/StickyHeader';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService from '../services/patient.service';
import eventBus from '../utils/eventBus';
import TabLoaderCard from '../components/TabLoaderCard';

// Make SVG Circle animatable via Reanimated — identical to dashboard chart pattern
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const CARD_GRADIENT_COLORS = ['rgba(255,179,107,0.11)', 'rgba(167,139,250,0.08)', 'rgba(52,41,73,0.72)'] as const;
const CARD_BG     = '#3F3752';
const CARD_BORDER = 'rgba(255,255,255,0.16)';

function getProgressColors(pct: number): [string, string] {
  if (pct >= 100) return ['#10b981', '#059669'];
  if (pct >= 75)  return ['#34d399', '#10b981'];
  if (pct >= 50)  return ['#FFB36B', '#34d399'];
  if (pct >= 25)  return ['#FF8A8A', '#FFB36B'];
  return ['#FF6EA5', '#FF8A8A'];
}

// ── Animated donut — Reanimated useAnimatedProps, UI thread, APK safe ─────────
function AnimatedDonut({
  percent,
  size = 100,
  strokeWidth = 10,
  colors = ['#60a5fa', '#3b82f6'],
  animProgress,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  colors?: [string, string];
  animProgress: ReturnType<typeof useSharedValue<number>>;
}) {
  const radius        = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const capped        = Math.max(0, Math.min(100, percent));
  const gid           = `g-${Math.round(percent)}-${Math.round(size)}`;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (circumference * capped * animProgress.value) / 100,
  }));

  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgLinearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor={colors[0]} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors[1]} stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} fill="none" />
      <AnimatedCircle
        cx={size/2} cy={size/2} r={radius}
        stroke={`url(#${gid})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={animatedProps}
        rotation={-90}
        originX={size/2}
        originY={size/2}
      />
    </Svg>
  );
}

// ── Bubble helper — same as dashboard ─────────────────────────────────────────
function useBubbleAnim() {
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  return { y, x };
}

export default function UpdateProgressGoal() {
  const { id } = useLocalSearchParams() as { id?: string };
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [loading,     setLoading]     = useState(false);
  const [goalId,      setGoalId]      = useState<string | null>(null);
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [progress,    setProgress]    = useState('0');
  const [newProgress, setNewProgress] = useState<number>(0);

  // Plain RN Animated for scrollY (useNativeDriver:true for header opacity)
  const scrollY = useRef(new RNAnimated.Value(0)).current;

  // ── Donut animation shared values ─────────────────────────────────────────
  const beforeAnim = useSharedValue(0);
  const afterAnim  = useSharedValue(0);

  const triggerBeforeAnim = useCallback(() => {
    beforeAnim.value = 0;
    beforeAnim.value = withTiming(1, { duration: 1800, easing: ReanimatedEasing.out(ReanimatedEasing.quad) });
  }, [beforeAnim]);

  // After donut re-draws every time newProgress changes
  useEffect(() => {
    afterAnim.value = 0;
    afterAnim.value = withTiming(1, { duration: 900, easing: ReanimatedEasing.out(ReanimatedEasing.quad) });
  }, [newProgress]);

  // ── Responsive tokens ─────────────────────────────────────────────────────
  const pageInset             = clamp(width * 0.03, 12, 18);
  const sectionInset          = clamp(width * 0.04, 14, 20);
  const headerTopPadding      = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding   = clamp(height * 0.02, 14, 22);
  const headerButtonSize      = clamp(width * 0.098, 34, 40);
  const headerButtonRadius    = headerButtonSize / 2;
  const headerIconSize        = clamp(width * 0.047, 16, 20);
  const headerTitleSize       = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop  = clamp(height * 0.022, 14, 22);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;

  const bubbleLarge  = clamp(width * 0.34, 100, 140);
  const bubbleMedium = clamp(width * 0.29,  90, 120);
  const bubbleSmall  = clamp(width * 0.26,  82, 108);

  const contentTopPadding    = headerEstimatedHeight + clamp(height * 0.032, 22, 30);
  const contentBottomPadding = clamp(insets.bottom + height * 0.04, 30, 46);
  const cardPadding          = clamp(width * 0.045, 14, 18);
  const cardRadius           = clamp(width * 0.04,  14, 16);
  const cardGap              = clamp(height * 0.018, 12, 16);
  const sectionTitleSize     = clamp(width * 0.039, 14, 16);
  const summaryTitleSize     = clamp(width * 0.043, 15, 17);
  const bodyTextSize         = clamp(width * 0.033, 12, 13);
  const donutSize            = clamp(width * 0.38, 124, 152);
  const quickPadY            = clamp(height * 0.011, 7,  9);
  const quickPadX            = clamp(width * 0.032,  11, 14);
  const quickRadius          = clamp(width * 0.03,   10, 12);
  const quickTextSize        = clamp(width * 0.033,  12, 13);
  const footerGap            = clamp(width * 0.02,    6,  8);
  const footerPadY           = clamp(height * 0.018, 12, 15);
  const footerRadius         = clamp(width * 0.038,  13, 16);
  const footerTextSize       = clamp(width * 0.038,  14, 16);
  const bigPctSz             = clamp(width * 0.065,  22, 28);
  const metaSz               = clamp(width * 0.032,  11, 13);
  const sliderTrackH         = clamp(height * 0.009,  6,  8);
  const sliderThumbSz        = clamp(width * 0.082,  30, 38); // big, comfortable to grab

  // ── Reanimated bubbles — identical to dashboard ───────────────────────────
  const b1 = useBubbleAnim();
  const b2 = useBubbleAnim();
  const b3 = useBubbleAnim();
  const b4 = useBubbleAnim();
  const b5 = useBubbleAnim();

  const b1Style = useAnimatedStyle(() => ({ transform: [{ translateY: b1.y.value }, { translateX: b1.x.value }] }));
  const b2Style = useAnimatedStyle(() => ({ transform: [{ translateY: b2.y.value }, { translateX: b2.x.value }] }));
  const b3Style = useAnimatedStyle(() => ({ transform: [{ translateY: b3.y.value }, { translateX: b3.x.value }] }));
  const b4Style = useAnimatedStyle(() => ({ transform: [{ translateY: b4.y.value }, { translateX: b4.x.value }] }));
  const b5Style = useAnimatedStyle(() => ({ transform: [{ translateY: b5.y.value }, { translateX: b5.x.value }] }));

  const startBubble = useCallback((
    sv: { y: ReturnType<typeof useSharedValue<number>>; x: ReturnType<typeof useSharedValue<number>> },
    dY: number, dX: number, delayY = 0, delayX = 0,
  ) => {
    sv.y.value = 0; sv.x.value = 0;
    sv.y.value = withDelay(delayY, withRepeat(withSequence(
      withTiming(50,  { duration: dY, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
      withTiming(-50, { duration: dY, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
    ), -1, true));
    sv.x.value = withDelay(delayX, withRepeat(withSequence(
      withTiming(30,  { duration: dX, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
      withTiming(-30, { duration: dX, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
    ), -1, true));
  }, []);

  const stopBubbles = useCallback(() => {
    [b1, b2, b3, b4, b5].forEach(({ y, x }) => { cancelAnimation(y); cancelAnimation(x); });
  }, [b1, b2, b3, b4, b5]);

  const startBubbles = useCallback(() => {
    startBubble(b1, 8000, 7000,    0,  500);
    startBubble(b2, 9000, 8500,  500, 1000);
    startBubble(b3, 7500, 9500, 1000,    0);
    startBubble(b4, 8500, 9000, 1500,  800);
    startBubble(b5, 9500, 8000, 2000, 1500);
  }, [b1, b2, b3, b4, b5, startBubble]);

  useFocusEffect(useCallback(() => {
    startBubbles();
    return () => stopBubbles();
  }, [startBubbles, stopBubbles]));

  // ── Custom PanResponder slider — no external library ──────────────────────
  const trackWidthRef   = useRef(0);
  const newProgressRef  = useRef(newProgress);
  const startProgressRef = useRef(0);

  useEffect(() => { newProgressRef.current = newProgress; }, [newProgress]);

  const sliderPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        startProgressRef.current = newProgressRef.current;
      },
      onPanResponderMove: (_, gs) => {
        if (trackWidthRef.current <= 0) return;
        const deltaPct = (gs.dx / trackWidthRef.current) * 100;
        const next = Math.round(clamp(startProgressRef.current + deltaPct, 0, 100));
        setNewProgress(next);
      },
    }),
  ).current;

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const all = await PatientService.getGoals();
        const g = all.find(x => x.id === id);
        if (!g) { Alert.alert('Not found', 'Could not find the selected goal'); router.back(); return; }
        setGoalId(g.id);
        setTitle(g.title || '');
        setDescription(g.description || '');
        const pct = Number(g.progress_percentage || 0);
        setProgress(String(pct));
        setNewProgress(pct);
        triggerBeforeAnim();
      } catch { Alert.alert('Error', 'Could not load goal'); router.back(); }
      finally { setLoading(false); }
    })();
  }, [id, triggerBeforeAnim]);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    (async () => {
      try {
        const all = await PatientService.getGoals();
        const g = all.find(x => x.id === id);
        if (g) {
          const pct = Number(g.progress_percentage || 0);
          setProgress(String(pct));
          setNewProgress(pct);
          triggerBeforeAnim();
        }
      } catch {}
    })();
  }, [id, triggerBeforeAnim]));

  const submit = async () => {
    if (!goalId) return;
    const pct = Number(newProgress);
    if (isNaN(pct) || pct < 0 || pct > 100) return Alert.alert('Validation', 'Progress must be 0–100');
    try {
      setLoading(true);
      await PatientService.partialUpdateGoal(goalId, {
        progress_percentage: pct,
        status: pct >= 100 ? 'completed' : 'in_progress',
      });
      setProgress(String(pct));
      try { eventBus.emit('refreshGoals'); } catch {}
      router.push('/patient/goals');
    } catch { Alert.alert('Error', 'Could not update progress'); }
    finally { setLoading(false); }
  };

  const oldPct = Number(progress || 0);
  const delta  = newProgress - oldPct;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#342949', '#2a1f3d', '#342949']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      {/* Bubbles — Reanimated, same as dashboard */}
      <View style={styles.bubblesLayer} pointerEvents="none">
        <Animated.View style={[styles.bubble, { top:'10%', left:'-10%', width:bubbleLarge,  height:bubbleLarge  }, b1Style]} />
        <Animated.View style={[styles.bubble, { top:'30%', right:'-5%', width:bubbleMedium, height:bubbleMedium }, b2Style]} />
        <Animated.View style={[styles.bubble, { top:'50%', left:'-8%', width:bubbleSmall,   height:bubbleSmall  }, b3Style]} />
        <Animated.View style={[styles.bubble, { top:'70%', right:'-7%',width:bubbleMedium,  height:bubbleMedium }, b4Style]} />
        <Animated.View style={[styles.bubble, { bottom:'5%',left:'5%', width:bubbleSmall,   height:bubbleSmall  }, b5Style]} />
      </View>

      <StickyHeader scrollY={scrollY} firstWord="Update" secondWord="Progress" onBackPress={() => router.push('/patient/goals')} />

      {/* Fading large header */}
      <RNAnimated.View style={[styles.headerContainer, {
        paddingTop: headerTopPadding, paddingHorizontal: pageInset, paddingBottom: headerBottomPadding,
        opacity: scrollY.interpolate({ inputRange:[0,100,150], outputRange:[1,0.5,0], extrapolate:'clamp' }),
      }]}>
        <TouchableOpacity
          onPress={() => router.push('/patient/goals')}
          style={[styles.backBtnCircle, { left:pageInset, top:headerTopPadding, width:headerButtonSize, height:headerButtonSize, borderRadius:headerButtonRadius }]}
        >
          <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize:headerTitleSize, marginTop:headerTitleMarginTop }]}>
          <Text style={styles.headerWhite}>Update </Text>
          <Text style={styles.headerPurple}>Progress</Text>
        </Text>
      </RNAnimated.View>

      <RNAnimated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: sectionInset, paddingTop: contentTopPadding, paddingBottom: contentBottomPadding }}
        showsVerticalScrollIndicator={false}
        onScroll={RNAnimated.event([{ nativeEvent:{ contentOffset:{ y:scrollY } } }], { useNativeDriver:true })}
        scrollEventThrottle={16}
      >
        {loading ? (
          <View style={{ flex:1, alignItems:'center', justifyContent:'center', minHeight: height * 0.6 }}>
            <TabLoaderCard spinnerColor="#A78BFA" fullScreen={false} />
          </View>
        ) : (
          <>
            {/* ── Goal Summary Card ── */}
            <View style={[styles.card, { borderRadius: cardRadius, marginBottom: cardGap, overflow:'hidden' }]}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <View style={{ height:3, backgroundColor:'#FF6EA5', position:'absolute', top:0, left:0, right:0 }} />
              <View style={{ padding: cardPadding, paddingTop: cardPadding + 3, flexDirection:'row', alignItems:'flex-start' }}>
                <View style={{ width: clamp(width*0.11,38,46), height: clamp(width*0.11,38,46), borderRadius: clamp(width*0.055,19,23), backgroundColor:'rgba(255,110,165,0.15)', borderWidth:1, borderColor:'rgba(255,110,165,0.35)', alignItems:'center', justifyContent:'center', marginRight: clamp(width*0.03,10,14), marginTop:2 }}>
                  <FontAwesome name="flag" size={clamp(width*0.042,14,17)} color="#FF6EA5" />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={[styles.summaryTitle, { fontSize: summaryTitleSize }]} numberOfLines={2}>{title}</Text>
                  {!!description && (
                    <Text style={[styles.small, { marginTop:5, fontSize: bodyTextSize, lineHeight: Math.round(bodyTextSize*1.45) }]} numberOfLines={2}>{description}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* ── Progress Overview — animated donuts ── */}
            <View style={[styles.card, { borderRadius: cardRadius, marginBottom: cardGap, overflow:'hidden' }]}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <View style={{ height:3, backgroundColor:'#A78BFA', position:'absolute', top:0, left:0, right:0 }} />
              <View style={{ padding: cardPadding, paddingTop: cardPadding + 3 }}>
                <Text style={[styles.sectionLabel, { fontSize: sectionTitleSize, marginBottom: clamp(height*0.018,12,16) }]}>
                  Progress Overview
                </Text>
                <View style={{ flexDirection:'row', justifyContent:'space-around', alignItems:'center' }}>

                  {/* Before */}
                  <View style={{ alignItems:'center' }}>
                    <View style={{ width: donutSize * 0.72, height: donutSize * 0.72, alignItems:'center', justifyContent:'center' }}>
                      <AnimatedDonut percent={oldPct} size={donutSize * 0.72} strokeWidth={10} colors={getProgressColors(oldPct)} animProgress={beforeAnim} />
                      <Text style={{ position:'absolute', fontSize: clamp(width*0.046,15,20), fontWeight:'900', color:'#FFFFFF' }}>{oldPct}%</Text>
                    </View>
                    <Text style={{ color:'#9D8EC7', fontSize: metaSz, fontWeight:'600', marginTop:8, letterSpacing:0.5 }}>BEFORE</Text>
                  </View>

                  {/* Arrow + delta */}
                  <View style={{ alignItems:'center', gap:6 }}>
                    <FontAwesome name="arrow-right" size={clamp(width*0.055,18,22)} color={delta > 0 ? '#34D399' : delta < 0 ? '#FF6B6B' : '#7A6E9A'} />
                    {delta !== 0 && (
                      <Text style={{ fontSize: metaSz, fontWeight:'800', color: delta > 0 ? '#34D399' : '#FF6B6B' }}>
                        {delta > 0 ? '+' : ''}{delta}%
                      </Text>
                    )}
                  </View>

                  {/* After */}
                  <View style={{ alignItems:'center' }}>
                    <View style={{ width: donutSize * 0.72, height: donutSize * 0.72, alignItems:'center', justifyContent:'center' }}>
                      <AnimatedDonut percent={newProgress} size={donutSize * 0.72} strokeWidth={10} colors={getProgressColors(newProgress)} animProgress={afterAnim} />
                      <Text style={{ position:'absolute', fontSize: clamp(width*0.046,15,20), fontWeight:'900', color:'#FFFFFF' }}>{newProgress}%</Text>
                    </View>
                    <Text style={{ color:'#9D8EC7', fontSize: metaSz, fontWeight:'600', marginTop:8, letterSpacing:0.5 }}>AFTER</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── Slider Card — custom PanResponder, no external lib ── */}
            <View style={[styles.card, { borderRadius: cardRadius, marginBottom: cardGap, overflow:'hidden' }]}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <View style={{ height:3, backgroundColor:'#FFB36B', position:'absolute', top:0, left:0, right:0 }} />
              <View style={{ padding: cardPadding, paddingTop: cardPadding + 3 }}>

                <View style={{ flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between', marginBottom: clamp(height*0.018,12,16) }}>
                  <Text style={[styles.sectionLabel, { fontSize: sectionTitleSize }]}>Set New Progress</Text>
                  <Text style={{ color:'#FFFFFF', fontSize: bigPctSz, fontWeight:'900', lineHeight: bigPctSz * 1.1 }}>
                    {newProgress}<Text style={{ fontSize: metaSz, color:'#9D8EC7', fontWeight:'600' }}>%</Text>
                  </Text>
                </View>

                {/*
                 * Custom slider: PanResponder on the outer View measures dx against
                 * the track width captured via onLayout. The thumb is a big purple
                 * circle with a white border — easy to grab on a physical device.
                 * No @react-native-community/slider needed.
                 */}
                <View
                  onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
                  {...sliderPan.panHandlers}
                  style={{ paddingVertical: sliderThumbSz / 2 }} // tall hit area
                >
                  {/* Track */}
                  <View style={{ height: sliderTrackH, borderRadius: sliderTrackH / 2, backgroundColor:'rgba(255,255,255,0.10)', overflow:'hidden' }}>
                    {newProgress > 0 && (
                      <LinearGradient
                        colors={getProgressColors(newProgress)}
                        start={[0,0]} end={[1,0]}
                        style={{ height:'100%', width:`${newProgress}%`, borderRadius: sliderTrackH / 2 }}
                      />
                    )}
                  </View>

                  {/* Thumb — positioned relative to track, large & comfortable */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: sliderThumbSz / 2 - sliderThumbSz / 2, // centred on track vertically
                      left: `${newProgress}%` as any,
                      marginLeft: -sliderThumbSz / 2,
                      width: sliderThumbSz,
                      height: sliderThumbSz,
                      borderRadius: sliderThumbSz / 2,
                      backgroundColor: '#A78BFA',
                      borderWidth: 3,
                      borderColor: '#FFFFFF',
                      shadowColor: '#A78BFA',
                      shadowOpacity: 0.6,
                      shadowOffset: { width:0, height:4 },
                      shadowRadius: 8,
                      elevation: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Grip lines */}
                    <View style={{ width: sliderThumbSz * 0.38, height: 1.5, backgroundColor:'rgba(255,255,255,0.75)', borderRadius:1, marginBottom:3 }} />
                    <View style={{ width: sliderThumbSz * 0.38, height: 1.5, backgroundColor:'rgba(255,255,255,0.75)', borderRadius:1 }} />
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height:1, backgroundColor:'rgba(255,255,255,0.08)', marginVertical: clamp(height*0.018,12,16) }} />

                {/* Quick set buttons */}
                <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                  {[0, 25, 50, 75, 100].map((v) => {
                    const isActive = newProgress === v;
                    const isPassed = newProgress > v;
                    return (
                      <TouchableOpacity
                        key={v}
                        onPress={() => setNewProgress(v)}
                        style={[
                          styles.quickBtn,
                          { paddingVertical: quickPadY, paddingHorizontal: quickPadX, borderRadius: quickRadius },
                          isPassed && { backgroundColor:'rgba(167,139,250,0.15)', borderColor:'rgba(167,139,250,0.35)' },
                          isActive  && { backgroundColor:'#A78BFA', borderColor:'#A78BFA' },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.quickBtnText,
                          { fontSize: quickTextSize },
                          isPassed && { color:'#D4C8FF' },
                          isActive  && { color:'#fff' },
                        ]}>
                          {v}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ── Footer buttons ── */}
            <View style={{ flexDirection:'row', gap: footerGap, marginTop: clamp(height*0.024,16,22) }}>
              <TouchableOpacity
                onPress={() => router.push('/patient/goals')}
                style={{ flex:1, paddingVertical: footerPadY, borderRadius: footerRadius, alignItems:'center', backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)' }}
                activeOpacity={0.8}
              >
                <Text style={{ color:'#CEC2EE', fontWeight:'700', fontSize: footerTextSize }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={submit} style={{ flex:2 }} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#8B5CF6', '#A78BFA']}
                  start={[0,0]} end={[1,1]}
                  style={{ paddingVertical: footerPadY, borderRadius: footerRadius, alignItems:'center', shadowColor:'#A78BFA', shadowOpacity:0.4, shadowOffset:{width:0,height:6}, shadowRadius:12 }}
                >
                  <Text style={{ color:'#fff', fontWeight:'800', fontSize: footerTextSize }}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}
      </RNAnimated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex:1, backgroundColor:'#342949' },
  bubblesLayer: { position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:0 },
  bubble:       { position:'absolute', backgroundColor:'rgba(133,130,180,0.15)', borderRadius:1000 },
  headerContainer: { position:'absolute', top:0, left:0, right:0, zIndex:900 },
  backBtnCircle: {
    position:'absolute', alignItems:'center', justifyContent:'center',
    borderWidth:1, backgroundColor:'rgba(255,255,255,0.08)', borderColor:'rgba(255,255,255,0.14)',
    shadowColor:'#000', shadowOpacity:0.03, shadowOffset:{ width:0, height:2 }, shadowRadius:6, elevation:1,
  },
  headerTitle:  { fontWeight:'800', textAlign:'center' },
  headerWhite:  { color:'#FFFFFF' },
  headerPurple: { color:'#B8A8E6' },
  scroll:       { flex:1 },
  card: {
    backgroundColor: CARD_BG, borderWidth:1, borderColor: CARD_BORDER,
    shadowColor:'#120A24', shadowOpacity:0.22, shadowOffset:{ width:0, height:8 }, shadowRadius:18, elevation:7,
  },
  sectionLabel: { fontWeight:'800', color:'#FFFFFF', letterSpacing:0.3 },
  summaryTitle: { fontWeight:'800', color:'#FFFFFF' },
  small:        { color:'#B8A8E6' },
  quickBtn:     { backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:'rgba(255,255,255,0.10)', alignItems:'center' },
  quickBtnText: { color:'#8A7FAE', fontWeight:'700' },
});
