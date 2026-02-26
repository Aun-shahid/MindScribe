import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import StickyHeader from '../components/StickyHeader';
import Slider from '@react-native-community/slider';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import PatientService from '../services/patient.service';
import eventBus from '../utils/eventBus';

export default function UpdateProgressGoal() {
  const { id } = useLocalSearchParams() as { id?: string };
  const [loading, setLoading] = useState(false);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState('0');
  const [newProgress, setNewProgress] = useState<number>(Number(progress || 0));

  // Scroll for sticky header
  const scrollY = useRef(new Animated.Value(0)).current;

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

      <StickyHeader
        scrollY={scrollY}
        firstWord="Update"
        secondWord="Progress"
        onBackPress={() => router.push('/patient/goals')}
      />
      
      <Animated.View style={[styles.headerContainer, {
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        })
      }]}>
        <TouchableOpacity onPress={() => router.push('/patient/goals')} style={styles.backButton}>
          <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          <Text style={styles.headerWhite}>Update </Text>
          <Text style={styles.headerPurple}>Progress</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {loading ? <ActivityIndicator size="large" color="#A78BFA" /> : (
          <>
            <View style={styles.summaryCard}> 
              <View style={[styles.summaryAccent, { backgroundColor: '#FF6EA5' }]} />
              <View style={{ flex: 1, paddingTop: 8 }}>
                <Text style={styles.summaryTitle} numberOfLines={1}>{title}</Text>
                <Text style={[styles.small, { marginTop: 6 }]} numberOfLines={2}>{description}</Text>
              </View>
              <FontAwesome name="star-o" size={22} color="#9F8BC9" style={{ marginLeft: 12 }} />
            </View>

            <View style={styles.chartCard}> 
              <Text style={styles.sectionTitleSmall}>Current Progress</Text>
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
                  <Donut percent={Number(progress || 0)} size={120} strokeWidth={12} />
                    <Text style={{ position: 'absolute', fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>{`${Number(progress || 0)}%`}</Text>
                </View>
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.sectionTitleSmall}>New Progress</Text>
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
                    <Donut percent={newProgress} size={120} strokeWidth={12} colors={getProgressColors(newProgress)} />
                    <Text style={{ position: 'absolute', fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>{`${newProgress}%`}</Text>
                </View>
              </View>

              <View style={{ height: 12 }} />
              <Slider
                style={{ width: '100%', height: 40 }}
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
                  <TouchableOpacity key={v} onPress={() => setNewProgress(v)} style={[styles.quickBtn, newProgress === v && styles.quickBtnActive] }>
                    <Text style={[styles.quickBtnText, newProgress === v && styles.quickBtnTextActive]}>{v}%</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.messageBox}>
                <Text style={styles.messageText}>🎉 Great start! Keep it up!</Text>
              </View>
            </View>
          </>
        )}
      </Animated.ScrollView>
      <View style={styles.footerRow}>
        <TouchableOpacity onPress={() => router.push('/patient/goals')} style={styles.footerCancel}>
          <Text style={styles.footerCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={submit} style={styles.footerSave}>
          <View style={styles.saveBtn}>
            <Text style={styles.saveText}>Save Changes</Text>
          </View>
        </TouchableOpacity>
      </View>
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
    paddingTop: 65,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 65,
    padding: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  small: { fontSize: 12, color: '#B8A8E6' },
  sectionTitleSmall: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  quickBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#5B5270', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  quickBtnActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  quickBtnText: { color: '#B8A8E6', fontWeight: '700' },
  quickBtnTextActive: { color: '#fff' },
  messageBox: { marginTop: 12, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(167, 139, 250, 0.15)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)' },
  messageText: { color: '#B8A8E6', fontWeight: '700' },
  summaryCard: { 
    borderRadius: 14, 
    padding: 14, 
    backgroundColor: '#473F5A', 
    marginBottom: 14, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', 
    flexDirection: 'row', 
    alignItems: 'center', 
    overflow: 'hidden' 
  },
  summaryAccent: { position: 'absolute', left: 0, right: 0, top: 0, height: 6, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  chartCard: { 
    borderRadius: 14, 
    padding: 18, 
    backgroundColor: '#473F5A', 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  footerRow: { position: 'absolute', left: 16, right: 16, bottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerCancel: { flex: 1, marginRight: 8, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#5B5270', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  footerCancelText: { color: '#FFFFFF', fontWeight: '700' },
  footerSave: { flex: 1, marginLeft: 8, alignItems: 'center' },
  saveBtn: { 
    width: '100%',
    paddingVertical: 12, 
    borderRadius: 12, 
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
