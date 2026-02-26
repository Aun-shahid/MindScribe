import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, Animated } from 'react-native';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import PatientService, { CreatePatientGoalData } from '../services/patient.service';
import eventBus from '../utils/eventBus';
import StickyHeader from '../components/StickyHeader';
import OriginalHeader from '../components/OriginalHeader';

export default function AddGoalPage() {
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

  const submit = async () => {
    if (!title.trim()) return Alert.alert('Validation', 'Title is required');
    // ensure target_date sent to API is in YYYY-MM-DD format
    let apiTargetDate: string | undefined = undefined;
    if (dateObj) {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      apiTargetDate = `${yyyy}-${mm}-${dd}`;
    } else if (targetDate && targetDate.includes('/')) {
      // if user manually entered dd/mm/yyyy, convert
      const parts = targetDate.split('/');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        apiTargetDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    } else if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      apiTargetDate = targetDate;
    }

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
    } catch (e) {
      console.warn('Create goal failed', e);
      Alert.alert('Error', 'Could not create goal');
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
    if (Platform.OS === 'android') setShowDatePicker(false);
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
        {/* Original Header */}
        <OriginalHeader
          scrollY={scrollY}
          firstWord="Add"
          secondWord="Goal"
          onBackPress={() => router.push('/patient/goals')}
        />

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
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)} 
            activeOpacity={0.8} 
            style={[styles.inputCard, { justifyContent: 'center' }]}
          >
            <Text style={{ color: targetDate ? '#FFFFFF' : '#B8A8E6' }}>
              {targetDate || 'dd/mm/yyyy'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateObj || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={onChangeDate}
            />
          )}
        </View>

        <View style={styles.card}>
          <View style={[styles.accent, { backgroundColor: '#ff9f6b' }]} />
          <Text style={styles.cardLabel}>Initial Progress</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressPercent}>{progress || '0'}%</Text>
          </View>
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
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 26,
    marginBottom: 14,
    marginHorizontal: 0,
    backgroundColor: '#342949',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 52,
    padding: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 20,
    textAlign: 'center',
  },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },
  scroll: { flex: 1, zIndex: 2 },
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
  cardLabel: { fontSize: 14, fontWeight: '700', marginLeft: 14, marginBottom: 8, color: '#FFFFFF' },
  inputCard: { 
    borderRadius: 10, 
    padding: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 6, 
    paddingLeft: 14,
    backgroundColor: '#5B5270',
    color: '#FFFFFF'
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  progressPercent: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
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
