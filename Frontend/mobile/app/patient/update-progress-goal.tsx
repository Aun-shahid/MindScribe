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

export default function UpdateProgressGoal() {
  const { id } = useLocalSearchParams() as { id?: string };
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState('0');
  const [newProgress, setNewProgress] = useState<number>(Number(progress || 0));

  // Scroll for sticky header
  const scrollY = useRef(new Animated.Value(0)).current;

  const pageInset = clamp(width * 0.03, 12, 18);
  const sectionInset = clamp(width * 0.04, 14, 20);
  const headerTopPadding = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding = clamp(height * 0.02, 14, 22);
  const headerButtonSize = clamp(width * 0.098, 34, 40);
  const headerButtonRadius = headerButtonSize / 2;
  const headerIconSize = clamp(width * 0.047, 16, 20);
  const headerTitleSize = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop = clamp(height * 0.022, 14, 22);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;

  const bubbleLarge = clamp(width * 0.34, 100, 140);
  const bubbleMedium = clamp(width * 0.29, 90, 120);
  const bubbleSmall = clamp(width * 0.26, 82, 108);
  const bubbleShift = clamp(height * 0.06, 28, 50);

  const contentTopPadding = headerEstimatedHeight + clamp(height * 0.032, 22, 30);
  const contentBottomPadding = clamp(insets.bottom + height * 0.04, 30, 46);
  const cardPadding = clamp(width * 0.045, 14, 18);
  const cardRadius = clamp(width * 0.04, 14, 16);
  const cardGap = clamp(height * 0.018, 12, 16);
  const sectionTitleSize = clamp(width * 0.039, 14, 16);
  const summaryTitleSize = clamp(width * 0.043, 15, 17);
  const bodyTextSize = clamp(width * 0.033, 12, 13);
  const donutSize = clamp(width * 0.32, 108, 132);
  const sliderHeight = clamp(height * 0.055, 34, 42);
  const quickPadY = clamp(height * 0.011, 7, 9);
  const quickPadX = clamp(width * 0.032, 11, 14);
  const quickRadius = clamp(width * 0.03, 10, 12);
  const quickTextSize = clamp(width * 0.033, 12, 13);
  const footerGap = clamp(width * 0.02, 6, 8);
  const footerPadY = clamp(height * 0.018, 12, 15);
  const footerRadius = clamp(width * 0.038, 13, 16);
  const footerTextSize = clamp(width * 0.038, 14, 16);

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

  function getProgressColors(pct: number) {
    // Return a two-color gradient based on pct
    if (pct >= 100) return ['#10b981', '#059669']; // solid green-ish gradient
    if (pct >= 75) return ['#34d399', '#10b981']; // green
    if (pct >= 50) return ['#FFB36B', '#34d399']; // orange -> green
    if (pct >= 25) return ['#FF8A8A', '#FFB36B']; // pink -> orange
    return ['#FF6EA5', '#FF8A8A']; // red/pink gradient for low progress
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const all = await PatientService.getGoals();
        const g = all.find(x => x.id === id);
        if (!g) {
          Alert.alert('Not found', 'Could not find the selected goal');
          router.back();
          return;
        }
        setGoalId(g.id);
        setTitle(g.title || '');
        setDescription(g.description || '');
        setProgress(String(g.progress_percentage || 0));
        setNewProgress(Number(g.progress_percentage || 0));
      } catch (e) {
        console.warn('Load goal failed', e);
        Alert.alert('Error', 'Could not load goal');
        router.back();
      } finally { setLoading(false); }
    })();
  }, [id]);

  // Refetch goal data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      (async () => {
        try {
          const all = await PatientService.getGoals();
          const g = all.find(x => x.id === id);
          if (g) {
            setProgress(String(g.progress_percentage || 0));
            setNewProgress(Number(g.progress_percentage || 0));
          }
        } catch (e) {
          console.warn('Refetch goal failed', e);
        }
      })();
    }, [id])
  );

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
                toValue: bubbleShift,
                duration: durationY / 2,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValueY, {
                toValue: -bubbleShift,
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
                toValue: bubbleShift,
                duration: durationX / 2,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValueX, {
                toValue: -bubbleShift,
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
  }, [bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y, bubble4X, bubble4Y, bubble5X, bubble5Y, bubbleShift]);

  const submit = async () => {
    if (!goalId) return;
    const pct = Number(newProgress);
    if (isNaN(pct) || pct < 0 || pct > 100) return Alert.alert('Validation', 'Progress must be 0-100');
    try {
      setLoading(true);
      await PatientService.partialUpdateGoal(goalId, { progress_percentage: pct, status: pct >= 100 ? 'completed' : 'in_progress' });
      // Update local progress state to reflect the saved value
      setProgress(String(pct));
      try { eventBus.emit('refreshGoals'); } catch {}
      router.push('/patient/goals');
    } catch (e) {
      console.warn('Update progress failed', e);
      Alert.alert('Error', 'Could not update progress');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#342949', '#2a1f3d', '#342949']}
        style={styles.screenGradient}
      >
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '10%',
              left: '-10%',
              width: bubbleLarge,
              height: bubbleLarge,
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
              width: bubbleMedium,
              height: bubbleMedium,
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
              width: bubbleSmall,
              height: bubbleSmall,
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
              width: bubbleMedium,
              height: bubbleMedium,
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
              width: bubbleSmall,
              height: bubbleSmall,
              transform: [
                { translateY: bubble5Y },
                { translateX: bubble5X },
              ],
            },
          ]}
        />
      </LinearGradient>

      <StickyHeader
        scrollY={scrollY}
        firstWord="Update"
        secondWord="Progress"
        onBackPress={() => router.push('/patient/goals')}
      />
      
      <Animated.View style={[styles.headerContainer, {
        paddingTop: headerTopPadding,
        paddingHorizontal: pageInset,
        paddingBottom: headerBottomPadding,
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        })
      }]}>
        <TouchableOpacity
          onPress={() => router.push('/patient/goals')}
          style={[
            styles.backBtnCircle,
            {
              left: pageInset,
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
          <Text style={styles.headerWhite}>Update </Text>
          <Text style={styles.headerPurple}>Progress</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView 
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: sectionInset, paddingTop: contentTopPadding, paddingBottom: contentBottomPadding }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {loading ? <TabLoaderCard spinnerColor="#A78BFA" fullScreen={false} /> : (
          <>
            <View style={[styles.summaryCard, { borderRadius: cardRadius, padding: cardPadding, marginBottom: cardGap }]}> 
              <View style={[styles.summaryAccent, { backgroundColor: '#FF6EA5' }]} />
              <View style={{ flex: 1, paddingTop: 8 }}>
                <Text style={[styles.summaryTitle, { fontSize: summaryTitleSize }]} numberOfLines={1}>{title}</Text>
                <Text style={[styles.small, { marginTop: 6, fontSize: bodyTextSize }]} numberOfLines={2}>{description}</Text>
              </View>
              <FontAwesome name="star-o" size={clamp(width * 0.06, 20, 24)} color="#9F8BC9" style={{ marginLeft: 12 }} />
            </View>

            <View style={[styles.chartCard, { borderRadius: cardRadius, padding: cardPadding, marginBottom: cardGap }]}> 
              <Text style={[styles.sectionTitleSmall, { fontSize: sectionTitleSize }]}>Current Progress</Text>
              <View style={{ alignItems: 'center', marginTop: clamp(height * 0.016, 10, 12) }}>
                <View style={{ width: donutSize, height: donutSize, alignItems: 'center', justifyContent: 'center' }}>
                  <Donut percent={Number(progress || 0)} size={donutSize} strokeWidth={12} />
                    <Text style={{ position: 'absolute', fontSize: clamp(width * 0.052, 18, 22), fontWeight: '800', color: '#FFFFFF' }}>{`${Number(progress || 0)}%`}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.chartCard, { borderRadius: cardRadius, padding: cardPadding, marginBottom: cardGap }]}>
              <Text style={[styles.sectionTitleSmall, { fontSize: sectionTitleSize }]}>New Progress</Text>
              <View style={{ alignItems: 'center', marginTop: clamp(height * 0.016, 10, 12) }}>
                <View style={{ width: donutSize, height: donutSize, alignItems: 'center', justifyContent: 'center' }}>
                    <Donut percent={newProgress} size={donutSize} strokeWidth={12} colors={getProgressColors(newProgress)} />
                    <Text style={{ position: 'absolute', fontSize: clamp(width * 0.052, 18, 22), fontWeight: '800', color: '#FFFFFF' }}>{`${newProgress}%`}</Text>
                </View>
              </View>

              <View style={{ height: clamp(height * 0.014, 8, 12) }} />
              <Slider
                style={{ width: '100%', height: sliderHeight }}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={newProgress}
                minimumTrackTintColor="#FF6EA5"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#FF6EA5"
                onValueChange={(v) => setNewProgress(Math.round(v))}
              />

              <View style={styles.quickRow}>
                {[0,25,50,75,100].map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setNewProgress(v)}
                    style={[
                      styles.quickBtn,
                      { paddingVertical: quickPadY, paddingHorizontal: quickPadX, borderRadius: quickRadius },
                      newProgress >= v && styles.quickBtnReached,
                      newProgress === v && styles.quickBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickBtnText,
                        { fontSize: quickTextSize },
                        newProgress >= v && styles.quickBtnTextReached,
                        newProgress === v && styles.quickBtnTextActive,
                      ]}
                    >
                      {v}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

            </View>

            <View style={[styles.footerRow, { marginTop: clamp(height * 0.024, 16, 22) }]}> 
              <TouchableOpacity onPress={() => router.push('/patient/goals')} style={[styles.footerCancel, { marginRight: footerGap, paddingVertical: footerPadY, borderRadius: footerRadius }]}>
                <Text style={[styles.footerCancelText, { fontSize: footerTextSize }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submit} style={[styles.footerSave, { marginLeft: footerGap }]}> 
                <View style={[styles.saveBtn, { paddingVertical: footerPadY, borderRadius: footerRadius }]}>
                  <Text style={[styles.saveText, { fontSize: footerTextSize }]}>Save Changes</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 0, paddingBottom: 0 },
  small: { color: '#B8A8E6' },
  sectionTitleSmall: { fontWeight: '800', color: '#FFFFFF' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  quickBtn: { backgroundColor: '#5B5270', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  quickBtnReached: { backgroundColor: 'rgba(167, 139, 250, 0.22)', borderColor: 'rgba(167, 139, 250, 0.5)' },
  quickBtnActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  quickBtnText: { color: '#B8A8E6', fontWeight: '700' },
  quickBtnTextReached: { color: '#E5DBFF' },
  quickBtnTextActive: { color: '#fff' },
  summaryCard: { 
    borderRadius: 14,
    backgroundColor: '#473F5A', 
    marginBottom: 14,
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', 
    flexDirection: 'row', 
    alignItems: 'center', 
    overflow: 'hidden' 
  },
  summaryAccent: { position: 'absolute', left: 0, right: 0, top: 0, height: 6, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  summaryTitle: { fontWeight: '800', color: '#FFFFFF' },
  chartCard: { 
    borderRadius: 14,
    backgroundColor: '#473F5A', 
    marginBottom: 16,
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerCancel: { flex: 1, alignItems: 'center', backgroundColor: '#5B5270', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  footerCancelText: { color: '#FFFFFF', fontWeight: '700' },
  footerSave: { flex: 1, alignItems: 'center' },
  saveBtn: { 
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#A78BFA'
  },
  saveText: { color: '#fff', fontWeight: '800' },
});

// Donut component
function Donut({ percent, size = 100, strokeWidth = 10, colors = ['#60a5fa', '#3b82f6'] }: { percent: number; size?: number; strokeWidth?: number; colors?: string[] }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const capped = Math.max(0, Math.min(100, percent));
  const strokeDashoffset = circumference - (circumference * capped) / 100;
  const gid = `grad-${Math.round(percent)}-${size}-${strokeWidth}`;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgLinearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={colors[0]} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors[1] || colors[0]} stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>
      <Circle cx={size/2} cy={size/2} r={radius} stroke="#5B5270" strokeWidth={strokeWidth} fill="none" />
      <Circle cx={size/2} cy={size/2} r={radius} stroke={`url(#${gid})`} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={strokeDashoffset} rotation={-90} originX={size/2} originY={size/2} />
      <TextSvg x={size/2} y={size/2} percent={percent} />
    </Svg>
  );
}

function TextSvg({ x, y, percent }: { x: number; y: number; percent: number }) {
  // react-native-svg Text requires import; to avoid adding complexity we'll overlay using absolute view
  return null;
}
