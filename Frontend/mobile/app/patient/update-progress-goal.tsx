import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, useWindowDimensions } from 'react-native';
import StickyHeader from '../components/StickyHeader';
import Slider from '@react-native-community/slider';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService from '../services/patient.service';
import eventBus from '../utils/eventBus';
import TabLoaderCard from '../components/TabLoaderCard';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

// ── Same card recipe as Dashboard / Goals ─────────────────────────────────────
const CARD_GRADIENT_COLORS = ['rgba(255,179,107,0.11)', 'rgba(167,139,250,0.08)', 'rgba(52,41,73,0.72)'] as const;
const CARD_BG     = '#3F3752';
const CARD_BORDER = 'rgba(255,255,255,0.16)';

export default function UpdateProgressGoal() {
  const { id } = useLocalSearchParams() as { id?: string };
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [loading,      setLoading]      = useState(false);
  const [goalId,       setGoalId]       = useState<string | null>(null);
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [progress,     setProgress]     = useState('0');
  const [newProgress,  setNewProgress]  = useState<number>(0);

  const scrollY = useRef(new Animated.Value(0)).current;

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
  const bubbleShift  = clamp(height * 0.06,  28,  50);

  const contentTopPadding    = headerEstimatedHeight + clamp(height * 0.032, 22, 30);
  const contentBottomPadding = clamp(insets.bottom + height * 0.04, 30, 46);
  const cardPadding          = clamp(width * 0.045, 14, 18);
  const cardRadius           = clamp(width * 0.04,  14, 16);
  const cardGap              = clamp(height * 0.018, 12, 16);
  const sectionTitleSize     = clamp(width * 0.039, 14, 16);
  const summaryTitleSize     = clamp(width * 0.043, 15, 17);
  const bodyTextSize         = clamp(width * 0.033, 12, 13);
  const donutSize            = clamp(width * 0.38, 124, 152);
  const sliderHeight         = clamp(height * 0.055, 34, 42);
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

  // ── Bubble refs ───────────────────────────────────────────────────────────
  const b1y = useRef(new Animated.Value(0)).current; const b1x = useRef(new Animated.Value(0)).current;
  const b2y = useRef(new Animated.Value(0)).current; const b2x = useRef(new Animated.Value(0)).current;
  const b3y = useRef(new Animated.Value(0)).current; const b3x = useRef(new Animated.Value(0)).current;
  const b4y = useRef(new Animated.Value(0)).current; const b4x = useRef(new Animated.Value(0)).current;
  const b5y = useRef(new Animated.Value(0)).current; const b5x = useRef(new Animated.Value(0)).current;

  function getProgressColors(pct: number): [string, string] {
    if (pct >= 100) return ['#10b981', '#059669'];
    if (pct >= 75)  return ['#34d399', '#10b981'];
    if (pct >= 50)  return ['#FFB36B', '#34d399'];
    if (pct >= 25)  return ['#FF8A8A', '#FFB36B'];
    return ['#FF6EA5', '#FF8A8A'];
  }

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
        setProgress(String(g.progress_percentage || 0));
        setNewProgress(Number(g.progress_percentage || 0));
      } catch { Alert.alert('Error', 'Could not load goal'); router.back(); }
      finally { setLoading(false); }
    })();
  }, [id]);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    (async () => {
      try {
        const all = await PatientService.getGoals();
        const g = all.find(x => x.id === id);
        if (g) { setProgress(String(g.progress_percentage || 0)); setNewProgress(Number(g.progress_percentage || 0)); }
      } catch {}
    })();
  }, [id]));

  // ── Bubbles ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const fly = (y: Animated.Value, x: Animated.Value, dY: number, dX: number, delY = 0, delX = 0) => {
      Animated.sequence([Animated.delay(delY), Animated.loop(Animated.sequence([
        Animated.timing(y, { toValue:  bubbleShift, duration: dY / 2, useNativeDriver: true }),
        Animated.timing(y, { toValue: -bubbleShift, duration: dY / 2, useNativeDriver: true }),
      ]))]).start();
      Animated.sequence([Animated.delay(delX), Animated.loop(Animated.sequence([
        Animated.timing(x, { toValue:  bubbleShift, duration: dX / 2, useNativeDriver: true }),
        Animated.timing(x, { toValue: -bubbleShift, duration: dX / 2, useNativeDriver: true }),
      ]))]).start();
    };
    fly(b1y, b1x, 8000, 10000,    0,  500);
    fly(b2y, b2x, 9000,  8500,  500, 1000);
    fly(b3y, b3x, 7500,  9500, 1000,    0);
    fly(b4y, b4x, 8500,  9000, 1500,  800);
    fly(b5y, b5x, 9500,  8000, 2000, 1500);
  }, [b1x, b1y, b2x, b2y, b3x, b3y, b4x, b4y, b5x, b5y, bubbleShift]);

  const submit = async () => {
    if (!goalId) return;
    const pct = Number(newProgress);
    if (isNaN(pct) || pct < 0 || pct > 100) return Alert.alert('Validation', 'Progress must be 0-100');
    try {
      setLoading(true);
      await PatientService.partialUpdateGoal(goalId, { progress_percentage: pct, status: pct >= 100 ? 'completed' : 'in_progress' });
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
      {/* Background */}
      <LinearGradient colors={['#342949', '#2a1f3d', '#342949']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      {/* Bubbles */}
      <View style={styles.bubblesLayer} pointerEvents="none">
        <Animated.View style={[styles.bubble, { top:'10%', left:'-10%', width:bubbleLarge,  height:bubbleLarge,  transform:[{translateY:b1y},{translateX:b1x}] }]} />
        <Animated.View style={[styles.bubble, { top:'30%', right:'-5%', width:bubbleMedium, height:bubbleMedium, transform:[{translateY:b2y},{translateX:b2x}] }]} />
        <Animated.View style={[styles.bubble, { top:'50%', left:'-8%', width:bubbleSmall,   height:bubbleSmall,  transform:[{translateY:b3y},{translateX:b3x}] }]} />
        <Animated.View style={[styles.bubble, { top:'70%', right:'-7%',width:bubbleMedium,  height:bubbleMedium, transform:[{translateY:b4y},{translateX:b4x}] }]} />
        <Animated.View style={[styles.bubble, { bottom:'5%',left:'5%', width:bubbleSmall,   height:bubbleSmall,  transform:[{translateY:b5y},{translateX:b5x}] }]} />
      </View>

      <StickyHeader scrollY={scrollY} firstWord="Update" secondWord="Progress" onBackPress={() => router.push('/patient/goals')} />

      {/* Fading header */}
      <Animated.View style={[styles.headerContainer, {
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
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: sectionInset, paddingTop: contentTopPadding, paddingBottom: contentBottomPadding }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent:{ contentOffset:{ y:scrollY } } }], { useNativeDriver:true })}
        scrollEventThrottle={16}
      >
        {loading ? (
          <View style={{ flex:1, alignItems:'center', justifyContent:'center', minHeight: height * 0.6 }}>
            <TabLoaderCard spinnerColor="#A78BFA" fullScreen={false} />
          </View>
        ) : (
          <>
            {/* ── Goal Summary Card ── */}
            <View style={[styles.card, { borderRadius: cardRadius, marginBottom: cardGap, overflow: 'hidden' }]}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              {/* Pink accent strip */}
              <View style={{ height:3, backgroundColor:'#FF6EA5', position:'absolute', top:0, left:0, right:0 }} />
              <View style={{ padding: cardPadding, paddingTop: cardPadding + 3, flexDirection:'row', alignItems:'flex-start' }}>
                {/* Icon badge */}
                <View style={{ width: clamp(width*0.11,38,46), height: clamp(width*0.11,38,46), borderRadius: clamp(width*0.055,19,23), backgroundColor:'rgba(255,110,165,0.15)', borderWidth:1, borderColor:'rgba(255,110,165,0.35)', alignItems:'center', justifyContent:'center', marginRight: clamp(width*0.03,10,14), marginTop:2 }}>
                  <FontAwesome name="flag" size={clamp(width*0.042,14,17)} color="#FF6EA5" />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={[styles.summaryTitle, { fontSize:summaryTitleSize }]} numberOfLines={2}>{title}</Text>
                  {!!description && (
                    <Text style={[styles.small, { marginTop:5, fontSize:bodyTextSize, lineHeight: Math.round(bodyTextSize*1.45) }]} numberOfLines={2}>{description}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* ── Before / After donuts side by side ── */}
            <View style={[styles.card, { borderRadius: cardRadius, marginBottom: cardGap, overflow:'hidden' }]}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <View style={{ height:3, backgroundColor:'#A78BFA', position:'absolute', top:0, left:0, right:0 }} />
              <View style={{ padding: cardPadding, paddingTop: cardPadding + 3 }}>
                <Text style={[styles.sectionLabel, { fontSize: sectionTitleSize, marginBottom: clamp(height*0.018,12,16) }]}>Progress Overview</Text>
                <View style={{ flexDirection:'row', justifyContent:'space-around', alignItems:'center' }}>
                  {/* Before */}
                  <View style={{ alignItems:'center' }}>
                    <View style={{ width:donutSize * 0.72, height:donutSize * 0.72, alignItems:'center', justifyContent:'center' }}>
                      <Donut percent={oldPct} size={donutSize * 0.72} strokeWidth={10} colors={getProgressColors(oldPct)} />
                      <Text style={{ position:'absolute', fontSize: clamp(width*0.046,15,20), fontWeight:'900', color:'#FFFFFF' }}>{oldPct}%</Text>
                    </View>
                    <Text style={{ color:'#9D8EC7', fontSize:metaSz, fontWeight:'600', marginTop:8, letterSpacing:0.5 }}>BEFORE</Text>
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
                    <View style={{ width:donutSize * 0.72, height:donutSize * 0.72, alignItems:'center', justifyContent:'center' }}>
                      <Donut percent={newProgress} size={donutSize * 0.72} strokeWidth={10} colors={getProgressColors(newProgress)} />
                      <Text style={{ position:'absolute', fontSize: clamp(width*0.046,15,20), fontWeight:'900', color:'#FFFFFF' }}>{newProgress}%</Text>
                    </View>
                    <Text style={{ color:'#9D8EC7', fontSize:metaSz, fontWeight:'600', marginTop:8, letterSpacing:0.5 }}>AFTER</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── Slider + Quick Buttons ── */}
            <View style={[styles.card, { borderRadius: cardRadius, marginBottom: cardGap, overflow:'hidden' }]}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <View style={{ height:3, backgroundColor:'#FFB36B', position:'absolute', top:0, left:0, right:0 }} />
              <View style={{ padding: cardPadding, paddingTop: cardPadding + 3 }}>
                <View style={{ flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between', marginBottom: clamp(height*0.012,8,12) }}>
                  <Text style={[styles.sectionLabel, { fontSize: sectionTitleSize }]}>Set New Progress</Text>
                  <Text style={{ color:'#FFFFFF', fontSize: bigPctSz, fontWeight:'900', lineHeight: bigPctSz * 1.1 }}>
                    {newProgress}<Text style={{ fontSize:metaSz, color:'#9D8EC7', fontWeight:'600' }}>%</Text>
                  </Text>
                </View>

                {/* Thin gradient track bar */}
                <View style={{ marginBottom: clamp(height*0.008,4,6) }}>
                  <View style={{ height: clamp(height*0.008,5,7), borderRadius:4, backgroundColor:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                    {newProgress > 0 && (
                      <LinearGradient
                        colors={getProgressColors(newProgress)}
                        start={[0,0]} end={[1,0]}
                        style={{ height:'100%', width:`${newProgress}%`, borderRadius:4 }}
                      />
                    )}
                  </View>
                </View>

                <Slider
                  style={{ width:'100%', height:sliderHeight, marginTop: clamp(height*0.004,2,4) }}
                  minimumValue={0} maximumValue={100} step={1}
                  value={newProgress}
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="transparent"
                  thumbTintColor="#A78BFA"
                  onValueChange={(v) => setNewProgress(Math.round(v))}
                />

                {/* Divider */}
                <View style={{ height:1, backgroundColor:'rgba(255,255,255,0.08)', marginVertical: clamp(height*0.014,8,12) }} />

                {/* Quick set buttons */}
                <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                  {[0, 25, 50, 75, 100].map((v) => {
                    const isActive  = newProgress === v;
                    const isPassed  = newProgress > v;
                    return (
                      <TouchableOpacity
                        key={v}
                        onPress={() => setNewProgress(v)}
                        style={[
                          styles.quickBtn,
                          { paddingVertical:quickPadY, paddingHorizontal:quickPadX, borderRadius:quickRadius },
                          isPassed  && { backgroundColor:'rgba(167,139,250,0.15)', borderColor:'rgba(167,139,250,0.35)' },
                          isActive  && { backgroundColor:'#A78BFA', borderColor:'#A78BFA' },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.quickBtnText,
                          { fontSize:quickTextSize },
                          isPassed  && { color:'#D4C8FF' },
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
                style={{ flex:1, paddingVertical:footerPadY, borderRadius:footerRadius, alignItems:'center', backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)' }}
                activeOpacity={0.8}
              >
                <Text style={{ color:'#CEC2EE', fontWeight:'700', fontSize:footerTextSize }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={submit} style={{ flex:2 }} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#8B5CF6', '#A78BFA']}
                  start={[0,0]} end={[1,1]}
                  style={{ paddingVertical:footerPadY, borderRadius:footerRadius, alignItems:'center', shadowColor:'#A78BFA', shadowOpacity:0.4, shadowOffset:{width:0,height:6}, shadowRadius:12 }}
                >
                  <Text style={{ color:'#fff', fontWeight:'800', fontSize:footerTextSize }}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
}

// ── Donut component ───────────────────────────────────────────────────────────
function Donut({ percent, size = 100, strokeWidth = 10, colors = ['#60a5fa', '#3b82f6'] }: {
  percent: number; size?: number; strokeWidth?: number; colors?: [string, string];
}) {
  const radius          = (size - strokeWidth) / 2;
  const circumference   = 2 * Math.PI * radius;
  const capped          = Math.max(0, Math.min(100, percent));
  const strokeDashoffset= circumference - (circumference * capped) / 100;
  const gid             = `g-${Math.round(percent)}-${size}`;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgLinearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor={colors[0]} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors[1]} stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>
      {/* Track */}
      <Circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} fill="none" />
      {/* Fill */}
      <Circle cx={size/2} cy={size/2} r={radius} stroke={`url(#${gid})`} strokeWidth={strokeWidth}
        strokeLinecap="round" fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        rotation={-90} originX={size/2} originY={size/2}
      />
    </Svg>
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

  scroll: { flex:1 },

  // ── Card — solid bg to prevent bubble bleed-through on Android APK ──────
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width:0, height:8 },
    shadowRadius: 18,
    elevation: 7,
  },

  sectionLabel: { fontWeight:'800', color:'#FFFFFF', letterSpacing:0.3 },
  summaryTitle: { fontWeight:'800', color:'#FFFFFF' },
  small:        { color:'#B8A8E6' },

  quickBtn:     { backgroundColor:'rgba(255,255,255,0.05)', borderWidth:1, borderColor:'rgba(255,255,255,0.10)', alignItems:'center' },
  quickBtnText: { color:'#8A7FAE', fontWeight:'700' },
});
