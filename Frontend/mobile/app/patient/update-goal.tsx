import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated } from 'react-native';
// Slider removed — progress is read-only on Update page per UX
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PatientService, { UpdatePatientGoalData } from '../services/patient.service';
import eventBus from '../utils/eventBus';
import StickyHeader from '../components/StickyHeader';

export default function UpdateGoalPage() {
  const { id } = useLocalSearchParams() as { id?: string };

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium');
  const [targetDate, setTargetDate] = useState('');
  const [progress, setProgress] = useState('0');
  const [goalId, setGoalId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!id) return;
    // load goals and find matching id (service doesn't have single-get)
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
        setPriority((g.priority as any) || 'medium');
        setTargetDate(g.target_date || '');
        setProgress(String(g.progress_percentage || 0));
      } catch (e) {
        console.warn('Load goal failed', e);
        Alert.alert('Error', 'Could not load goal');
        router.back();
      } finally { setLoading(false); }
    })();
  }, [id]);

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
    if (!title.trim()) return Alert.alert('Validation', 'Title is required');
    const payload: UpdatePatientGoalData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      target_date: targetDate || null,
      // progress is intentionally not sent here — progress must be updated via the 'Update' action on the goal card
    };
    try {
      setLoading(true);
      await PatientService.partialUpdateGoal(goalId, payload);
      try { eventBus.emit('refreshGoals'); } catch {}
      router.push('/patient/goals');
    } catch (e) {
      console.warn('Update failed', e);
      Alert.alert('Error', 'Could not update goal');
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

      {/* Sticky Header - Appears on scroll */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Edit"
        secondWord="Goal"
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
          <Text style={styles.headerWhite}>Edit </Text>
          <Text style={styles.headerPurple}>Goal</Text>
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
            <View style={styles.card}>
              <View style={[styles.accent, { backgroundColor: '#FF6EA5' }]} />
              <Text style={styles.cardLabel}>Goal Title</Text>
              <TextInput 
                value={title} 
                onChangeText={setTitle} 
                placeholder="E.g., Daily Meditation Practice" 
                placeholderTextColor="#B8A8E6" 
                style={styles.inputCard} 
              />
            </View>

            <View style={styles.card}>
              <View style={[styles.accent, { backgroundColor: '#06b6d4' }]} />
              <Text style={styles.cardLabel}>Description</Text>
              <TextInput 
                value={description} 
                onChangeText={setDescription} 
                placeholder="Describe your goal and why it matters to you..." 
                placeholderTextColor="#B8A8E6" 
                style={[styles.inputCard, { height: 100 }]} 
                multiline 
              />
            </View>

            <View style={styles.card}>
              <View style={[styles.accent, { backgroundColor: '#8b5cf6' }]} />
              <Text style={styles.cardLabel}>Target Date</Text>
              <TextInput 
                value={targetDate} 
                onChangeText={setTargetDate} 
                placeholder="dd/mm/yyyy" 
                placeholderTextColor="#B8A8E6" 
                style={styles.inputCard} 
              />
            </View>

            <View style={styles.card}>
              <View style={[styles.accent, { backgroundColor: '#ff9f6b' }]} />
              <Text style={styles.cardLabel}>Current Progress</Text>
              <View style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.small}>Progress is maintained at</Text>
                  <Text style={styles.progressPercent}>{progress || '0'}%</Text>
                </View>
                <View style={styles.progressBarBackground}>
                  <LinearGradient colors={[ '#60a5fa', '#3b82f6' ]} start={[0,0]} end={[1,0]} style={[styles.progressBarFill, { width: `${Number(progress || 0)}%` }]} />
                </View>
                <Text style={styles.noteText}>Note: To update progress, use the &ldquo;Update&rdquo; button on the goal card.</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={[styles.accent, { backgroundColor: '#FF6EA5' }]} />
              <Text style={styles.cardLabel}>Priority Level</Text>
              <View style={styles.priorityRow}>
                {(['low','medium','high'] as const).map((p) => (
                  <TouchableOpacity key={p} onPress={() => setPriority(p)} style={[styles.priorityPill, priority === p && styles.priorityPillActive]}>
                    <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity onPress={submit} disabled={loading} style={{ marginTop: 20 }}>
              <View style={styles.saveBtn}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
              </View>
            </TouchableOpacity>
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
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { 
    backgroundColor: '#473F5A', 
    padding: 16, 
    borderRadius: 14, 
    marginBottom: 14,
    marginHorizontal: 0,
    flexDirection: 'column',
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative'
  },
  accent: { position: 'absolute', left: 14, top: 18, width: 4, height: 28, borderRadius: 4 },
  cardLabel: { fontSize: 14, fontWeight: '700', marginLeft: 20, marginBottom: 8, color: '#FFFFFF' },
  inputCard: { 
    borderRadius: 10, 
    padding: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 6, 
    paddingLeft: 12,
    backgroundColor: '#5B5270',
    color: '#FFFFFF'
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  progressPercent: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  progressBarBackground: { height: 10, backgroundColor: '#5B5270', borderRadius: 6, marginTop: 8, overflow: 'hidden' },
  progressBarFill: { height: 10, borderRadius: 6 },
  small: { fontSize: 12, color: '#B8A8E6' },
  noteText: { fontSize: 12, color: '#B8A8E6', marginTop: 8 },
  priorityRow: { flexDirection: 'row', marginTop: 10, marginLeft: 6 },
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
