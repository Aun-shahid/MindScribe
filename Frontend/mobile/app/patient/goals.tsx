import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, StyleSheet, ActivityIndicator, Alert, Platform, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PatientService, { PatientGoal, CreatePatientGoalData } from '../services/patient.service';
import eventBus from '../utils/eventBus';
import StickyHeader from '../components/StickyHeader';

// Helper: convert hex color to rgba string with alpha for RN styles
const hexWithAlpha = (hex: string, alpha: number) => {
  try {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h;
    const intVal = parseInt(full, 16);
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (e) {
    return hex; // fallback
  }
};

const formatDate = (d?: string | null) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString();
  } catch (e) { return d; }
};

const GoalsScreen: React.FC = () => {
  const { themeStyle } = useTheme();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState<PatientGoal[]>([]);
  const [createVisible, setCreateVisible] = useState(false);

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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium');
  const [targetDate, setTargetDate] = useState('');
  const [progress, setProgress] = useState<string>('0');

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await PatientService.getGoals();
      setGoals(data || []);
    } catch (e) {
      console.warn('Failed to load goals', e);
      Alert.alert('Error', 'Could not load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGoals(); }, []);

  // Bubble animation effect
  /* eslint-disable react-hooks/exhaustive-deps */
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
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const handler = () => { loadGoals(); };
    // Use eventBus.subscribe which returns an unsubscribe function
    let unsub: (() => void) | null = null;
    try {
      unsub = eventBus.subscribe('refreshGoals', handler);
    } catch (e) {
      // fall back: no-op
    }
    return () => { try { if (unsub) unsub(); } catch (e) {} };
  }, []);

  const openCreate = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setTargetDate('');
    setProgress('0');
    setCreateVisible(true);
  };

  const submitCreate = async () => {
    if (!title.trim()) return Alert.alert('Validation', 'Title is required');
    const payload: CreatePatientGoalData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      target_date: targetDate || undefined,
      progress_percentage: Number(progress) || 0,
      milestones: undefined,
    };
    try {
      setLoading(true);
      await PatientService.createGoal(payload);
      setCreateVisible(false);
      await loadGoals();
    } catch (e) {
      console.warn('Create goal failed', e);
      Alert.alert('Error', 'Could not create goal');
    } finally { setLoading(false); }
  };

  const openUpdateProgress = (goal: PatientGoal) => {
    router.push(`/patient/update-progress-goal?id=${goal.id}`);
  };

  // Edit goal
  const [editVisible, setEditVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PatientGoal | null>(null);

  const openEdit = (goal: PatientGoal) => {
    setEditingGoal(goal);
    setTitle(goal.title || '');
    setDescription(goal.description || '');
    setPriority((goal.priority as 'low'|'medium'|'high') || 'medium');
    setTargetDate(goal.target_date || '');
    setProgress(String(goal.progress_percentage || 0));
    setEditVisible(true);
  };

  const submitEdit = async () => {
    if (!editingGoal) return;
    if (!title.trim()) return Alert.alert('Validation', 'Title is required');
    try {
      setLoading(true);
      await PatientService.partialUpdateGoal(editingGoal.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        target_date: targetDate || null,
        progress_percentage: Number(progress) || 0,
      });
      setEditVisible(false);
      setEditingGoal(null);
      await loadGoals();
    } catch (e) {
      console.warn('Edit goal failed', e);
      Alert.alert('Error', 'Could not update goal');
    } finally { setLoading(false); }
  };

  const handleDelete = (goal: PatientGoal) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          setLoading(true);
          await PatientService.deleteGoal(goal.id);
          await loadGoals();
        } catch (e) {
          console.warn('Delete failed', e);
          Alert.alert('Error', 'Could not delete goal');
        } finally { setLoading(false); }
      }}
    ]);
  };

  // Progress updates are handled on the dedicated Update Progress page.

  const renderGoal = ({ item }: { item: PatientGoal }) => {
    const pct = item.progress_percentage || 0;
    const accent = item.priority === 'high' ? '#FF6B6B' : item.priority === 'medium' ? '#FF9F6B' : '#34D399';
    return (
      <View style={[styles.card, { borderTopColor: accent }]}> 
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={[styles.badgePill, { backgroundColor: hexWithAlpha(accent, 0.12), borderColor: accent }]}>
            <Text style={[styles.badgePillText, { color: accent }]}>{item.priority_display || item.priority}</Text>
          </View>
        </View>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressPercent}>{pct}%</Text>
        </View>

        <View style={styles.progressBarBackground}>
          <LinearGradient colors={[accent, '#60a5fa']} start={[0,0]} end={[1,0]} style={[styles.progressBarFill, { width: `${pct}%` }]} />
        </View>

        <View style={styles.targetPillRow}>
          <View style={styles.targetPill}><FontAwesome name="calendar" size={14} color="#FFB36B" style={{ marginRight: 8 }} /><Text style={styles.targetPillText}>Target: {item.target_date || '—'}</Text></View>
        </View>

        <View style={styles.actionRowContainer}>
          <TouchableOpacity style={[styles.actionWrapper]} onPress={() => openUpdateProgress(item)} activeOpacity={0.9}>
            <View style={styles.actionGradient}>
              <FontAwesome5 name="chart-line" size={14} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.actionText}>Update</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionWrapper]} onPress={() => router.push(`/patient/update-goal?id=${item.id}`)} activeOpacity={0.9}>
            <View style={[styles.editButton]}> 
              <FontAwesome name="pencil" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={[styles.editText]}>Edit</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionWrapper]} onPress={() => handleDelete(item)} activeOpacity={0.9}>
            <View style={[styles.deleteButton]}> 
              <FontAwesome name="trash" size={14} color="#dc2626" style={{ marginRight: 8 }} />
              <Text style={[styles.deleteText]}>Delete</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const activeGoals = goals.filter(g => g.status !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');

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
        firstWord="My"
        secondWord="Goals"
        onBackPress={() => router.push('/patient/dashboard')}
      />

      <Animated.View style={[styles.headerContainer, {
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        })
      }]}> 
        <TouchableOpacity onPress={() => router.push('/patient/dashboard')} style={styles.backButton}>
          <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}> 
          <Text style={styles.headerWhite}>My </Text>
          <Text style={styles.headerPurple}>Goals</Text>
        </Text>

      </Animated.View>

      <View style={styles.ctaWrap}> 
        <TouchableOpacity onPress={() => router.push('/patient/add-goal')} activeOpacity={0.9}>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>+ Add New Goal</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ height: 14 }} />

      <View style={styles.sectionHeader}> 
        <Text style={styles.sectionTitle}>Active Goals ({activeGoals.length})</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color="#FFB36B" /> : (
        <Animated.FlatList
          data={activeGoals}
          keyExtractor={g => g.id}
          renderItem={renderGoal}
          ListEmptyComponent={<Text style={styles.empty}>No active goals. Tap + to add one.</Text>}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
      )}

      {completedGoals.length > 0 && (
        <View style={styles.completedSection}>
          <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Completed Goals ({completedGoals.length})</Text>
            </View>

          <FlatList
            data={completedGoals}
            keyExtractor={g => g.id}
            renderItem={({ item }) => (
              <View style={styles.completedCardWrapper}>
                <View style={[styles.completedCardInner, { borderTopWidth: 6, borderTopColor: '#10B981' }]}>
                    <View style={styles.completedCardContent}>
                      <View style={styles.completedIconWrap}>
                        <View style={styles.completedIconCircle}><FontAwesome5 name="bullseye" size={18} color="#fff" /></View>
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.title}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                          <View style={styles.completedBadge}><FontAwesome name="check" size={12} color="#10B981" style={{ marginRight: 6 }} /><Text style={styles.completedBadgeText}>Completed</Text></View>
                          <Text style={[styles.small, { marginLeft: 12, color: '#B8A8E6' }]}>{formatDate(item.completed_date || item.updated_at)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
              </View>
            )}
          />
        </View>
      )}

      {/* Create Modal */}
      <Modal visible={createVisible} animationType="slide" transparent={Platform.OS === 'ios' ? true : false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalInner}>
            <Text style={styles.modalTitle}>Create Goal</Text>
            <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor="#B8A8E6" />
            <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={[styles.input, {height:80}]} multiline placeholderTextColor="#B8A8E6" />
            <TextInput placeholder="Target Date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} style={styles.input} placeholderTextColor="#B8A8E6" />
            <View style={styles.row}> 
              <TextInput style={[styles.input, {flex:1}]} value={progress} onChangeText={setProgress} keyboardType="numeric" placeholder="Initial progress %" placeholderTextColor="#B8A8E6" />
              <TouchableOpacity onPress={() => setPriority(p => p === 'low' ? 'medium' : p === 'medium' ? 'high' : 'low')} style={styles.priorityToggle}><Text style={{ color: '#FFFFFF' }}>{priority}</Text></TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCreateVisible(false)} style={styles.cancelBtn}><Text style={{ color: '#B8A8E6' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitCreate} style={styles.saveBtn}><Text style={{color:'#fff'}}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editVisible} animationType="slide" transparent={Platform.OS === 'ios' ? true : false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalInner}>
            <Text style={styles.modalTitle}>Edit Goal</Text>
            <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor="#B8A8E6" />
            <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={[styles.input, {height:80}]} multiline placeholderTextColor="#B8A8E6" />
            <TextInput placeholder="Target Date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} style={styles.input} placeholderTextColor="#B8A8E6" />
            <View style={styles.row}>
              <TextInput style={[styles.input, {flex:1}]} value={progress} onChangeText={setProgress} keyboardType="numeric" placeholder="Progress %" placeholderTextColor="#B8A8E6" />
              <TouchableOpacity onPress={() => setPriority(p => p === 'low' ? 'medium' : p === 'medium' ? 'high' : 'low')} style={styles.priorityToggle}><Text style={{ color: '#FFFFFF' }}>{priority}</Text></TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setEditVisible(false); setEditingGoal(null); }} style={styles.cancelBtn}><Text style={{ color: '#B8A8E6' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitEdit} style={styles.saveBtn}><Text style={{color:'#fff'}}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Progress moved to dedicated page: /patient/update-progress-goal */}
    </View>
  );
};

export default GoalsScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingVertical: 16, 
    backgroundColor: '#342949' 
  },
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
  ctaWrap: { paddingHorizontal: 22, marginBottom: 12 },
  
  ctaButton: { 
    paddingVertical: 12, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#A78BFA' 
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 8, paddingHorizontal: 20 },
  sectionAccent: { width: 4, height: 22, borderRadius: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginLeft: 8 },
  targetPillRow: { marginTop: 10 },
  targetPill: { 
    backgroundColor: '#5B5270', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 10, 
    alignSelf: 'flex-start', 
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  targetPillText: { color: '#FFB36B', fontWeight: '600' },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  progressLabel: { color: '#B8A8E6', fontWeight: '600' },
  progressPercent: { color: '#FFFFFF', fontWeight: '800' },
  actionRowContainer: { flexDirection: 'row', marginTop: 14, justifyContent: 'space-between' },
  actionWrapper: { flex: 1, marginHorizontal: 6 },
  actionGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    borderRadius: 10, 
    backgroundColor: '#A78BFA' 
  },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  editButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    borderRadius: 10, 
    backgroundColor: '#5B5270', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  editText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#fecaca' },
  deleteText: { color: '#dc2626', fontWeight: '800', fontSize: 13 },
  card: { 
    backgroundColor: '#473F5A', 
    padding: 16, 
    borderRadius: 14, 
    marginBottom: 14,
    marginHorizontal: 16,
    borderTopWidth: 6, 
    borderTopColor: '#60a5fa', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  desc: { marginTop: 8, color: '#B8A8E6' },
  progressBarBackground: { height: 10, backgroundColor: '#5B5270', borderRadius: 6, marginTop: 12, overflow: 'hidden' },
  progressBarFill: { height: 10, borderRadius: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  rowRight: { alignItems: 'flex-end', marginTop: 8 },
  small: { fontSize: 12, color: '#B8A8E6' },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginLeft: 8 },
  smallBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  badgePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  badgePillText: { fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, color: '#B8A8E6', paddingHorizontal: 16 },
  completedSection: { marginTop: 20 },
  completedCardWrapper: { marginBottom: 12, marginHorizontal: 16 },
  completedCardInner: { 
    backgroundColor: '#473F5A', 
    borderRadius: 12, 
    padding: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  completedCardContent: { flexDirection: 'row', alignItems: 'center' },
  completedIconWrap: { marginLeft: 0 },
  completedIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  completedBadge: { 
    backgroundColor: '#5B5270', 
    borderColor: '#10B981', 
    borderWidth: 1, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  completedBadgeText: { color: '#10B981', fontWeight: '700', fontSize: 13 },
  
  /* removed duplicate left-border style to match mock */
  completedCard: { backgroundColor: '#473F5A', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  subHeader: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#FFFFFF' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalInner: { width: '92%', backgroundColor: '#473F5A', borderRadius: 8, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#FFFFFF' },
  input: { 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 6, 
    padding: 8, 
    marginBottom: 8, 
    backgroundColor: '#5B5270', 
    color: '#FFFFFF' 
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { padding: 8, marginRight: 8, color: '#B8A8E6' },
  saveBtn: { backgroundColor: '#A78BFA', padding: 8, borderRadius: 6 },
  priorityToggle: { padding: 8, marginLeft: 8, backgroundColor: '#5B5270', borderRadius: 6, color: '#FFFFFF' },
  smallActionRow: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { marginLeft: 8 },
  editBtn: { marginLeft: 8 },
  deleteBtn: { marginLeft: 8 },
});
