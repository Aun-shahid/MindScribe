import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated, useWindowDimensions } from 'react-native';
// Slider removed — progress is read-only on Update page per UX
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService, { UpdatePatientGoalData } from '../services/patient.service';
import eventBus from '../utils/eventBus';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export default function UpdateGoalPage() {
  const { id } = useLocalSearchParams() as { id?: string };
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

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

  const contentTopPadding = headerEstimatedHeight + clamp(height * 0.02, 12, 18);
  const contentBottomPadding = clamp(insets.bottom + height * 0.04, 26, 42);
  const cardPadding = clamp(width * 0.042, 14, 18);
  const cardRadius = clamp(width * 0.04, 14, 16);
  const cardGap = clamp(height * 0.016, 10, 14);
  const labelSize = clamp(width * 0.038, 14, 16);
  const inputSize = clamp(width * 0.039, 14, 16);
  const descInputHeight = clamp(height * 0.14, 92, 126);
  const progressTextSize = clamp(width * 0.049, 17, 20);
  const noteTextSize = clamp(width * 0.033, 12, 13);
  const progressBarHeight = clamp(height * 0.013, 8, 10);
  const priorityPadY = clamp(height * 0.011, 7, 9);
  const priorityPadX = clamp(width * 0.038, 14, 18);
  const priorityTextSize = clamp(width * 0.036, 13, 14);
  const savePadY = clamp(height * 0.018, 12, 16);
  const saveRadius = clamp(width * 0.038, 13, 16);
  const saveTextSize = clamp(width * 0.04, 14, 16);

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

      {/* Sticky Header - Appears on scroll */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Edit"
        secondWord="Goal"
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
          <Text style={styles.headerWhite}>Edit </Text>
          <Text style={styles.headerPurple}>Goal</Text>
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
            <View style={[styles.card, { padding: cardPadding, borderRadius: cardRadius, marginBottom: cardGap }]}>
              <View style={[styles.cardTopStrip, { backgroundColor: '#FF6EA5' }]} />
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBadge, { backgroundColor: 'rgba(255,110,165,0.16)', borderColor: 'rgba(255,110,165,0.42)' }]}>
                  <FontAwesome name="pencil" size={labelSize - 2} color="#FFC4DE" />
                </View>
                <Text style={[styles.cardLabel, { fontSize: labelSize }]}>Goal Title</Text>
              </View>
              <TextInput 
                value={title} 
                onChangeText={setTitle} 
                placeholder="E.g., Daily Meditation Practice" 
                placeholderTextColor="#B8A8E6" 
                style={[styles.inputCard, { fontSize: inputSize, borderRadius: cardRadius - 4, padding: clamp(width * 0.03, 10, 12), marginTop: clamp(height * 0.008, 5, 7) }]} 
              />
            </View>

            <View style={[styles.card, { padding: cardPadding, borderRadius: cardRadius, marginBottom: cardGap }]}>
              <View style={[styles.cardTopStrip, { backgroundColor: '#06b6d4' }]} />
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBadge, { backgroundColor: 'rgba(6,182,212,0.16)', borderColor: 'rgba(6,182,212,0.42)' }]}>
                  <FontAwesome name="align-left" size={labelSize - 2} color="#8DE8F8" />
                </View>
                <Text style={[styles.cardLabel, { fontSize: labelSize }]}>Description</Text>
              </View>
              <TextInput 
                value={description} 
                onChangeText={setDescription} 
                placeholder="Describe your goal and why it matters to you..." 
                placeholderTextColor="#B8A8E6" 
                style={[styles.inputCard, { fontSize: inputSize, borderRadius: cardRadius - 4, padding: clamp(width * 0.03, 10, 12), marginTop: clamp(height * 0.008, 5, 7), minHeight: descInputHeight }]} 
                multiline 
              />
            </View>

            <View style={[styles.card, { padding: cardPadding, borderRadius: cardRadius, marginBottom: cardGap }]}>
              <View style={[styles.cardTopStrip, { backgroundColor: '#8b5cf6' }]} />
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBadge, { backgroundColor: 'rgba(139,92,246,0.16)', borderColor: 'rgba(139,92,246,0.42)' }]}>
                  <FontAwesome name="calendar" size={labelSize - 2} color="#D6C3FF" />
                </View>
                <Text style={[styles.cardLabel, { fontSize: labelSize }]}>Target Date</Text>
              </View>
              <TextInput 
                value={targetDate} 
                onChangeText={setTargetDate} 
                placeholder="dd/mm/yyyy" 
                placeholderTextColor="#B8A8E6" 
                style={[styles.inputCard, { fontSize: inputSize, borderRadius: cardRadius - 4, padding: clamp(width * 0.03, 10, 12), marginTop: clamp(height * 0.008, 5, 7) }]} 
              />
            </View>

            <View style={[styles.card, { padding: cardPadding, borderRadius: cardRadius, marginBottom: cardGap }]}>
              <View style={[styles.cardTopStrip, { backgroundColor: '#ff9f6b' }]} />
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBadge, { backgroundColor: 'rgba(255,159,107,0.16)', borderColor: 'rgba(255,159,107,0.42)' }]}>
                  <FontAwesome name="line-chart" size={labelSize - 2} color="#FFD0B6" />
                </View>
                <Text style={[styles.cardLabel, { fontSize: labelSize }]}>Current Progress</Text>
              </View>
              <View style={{ marginTop: clamp(height * 0.008, 5, 7) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.small, { fontSize: noteTextSize }]}>Progress is maintained at</Text>
                  <Text style={[styles.progressPercent, { fontSize: progressTextSize }]}>{progress || '0'}%</Text>
                </View>
                <View style={[styles.progressBarBackground, { height: progressBarHeight, borderRadius: progressBarHeight / 2 }]}>
                  <LinearGradient colors={[ '#60a5fa', '#3b82f6' ]} start={[0,0]} end={[1,0]} style={[styles.progressBarFill, { width: `${Number(progress || 0)}%`, height: progressBarHeight, borderRadius: progressBarHeight / 2 }]} />
                </View>
                <Text style={[styles.noteText, { fontSize: noteTextSize, marginTop: clamp(height * 0.01, 6, 8) }]}>Note: To update progress, use the &ldquo;Update&rdquo; button on the goal card.</Text>
              </View>
            </View>

            <View style={[styles.card, { padding: cardPadding, borderRadius: cardRadius, marginBottom: cardGap }]}>
              <View style={[styles.cardTopStrip, { backgroundColor: '#FF6EA5' }]} />
              <View style={styles.cardHeaderRow}>
                <View style={[styles.cardIconBadge, { backgroundColor: 'rgba(255,110,165,0.16)', borderColor: 'rgba(255,110,165,0.42)' }]}>
                  <FontAwesome name="flag" size={labelSize - 2} color="#FFC4DE" />
                </View>
                <Text style={[styles.cardLabel, { fontSize: labelSize }]}>Priority Level</Text>
              </View>
              <View style={[styles.priorityRow, { marginTop: clamp(height * 0.012, 8, 10) }]}>
                {(['low','medium','high'] as const).map((p) => (
                  <TouchableOpacity key={p} onPress={() => setPriority(p)} style={[styles.priorityPill, { paddingVertical: priorityPadY, paddingHorizontal: priorityPadX, borderRadius: clamp(width * 0.05, 16, 20), marginRight: clamp(width * 0.025, 8, 10) }, priority === p && styles.priorityPillActive]}>
                    <Text style={[styles.priorityText, { fontSize: priorityTextSize }, priority === p && styles.priorityTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity onPress={submit} disabled={loading} style={{ marginTop: clamp(height * 0.018, 12, 16) }}>
              <LinearGradient
                colors={['#8B5CF6', '#A78BFA']}
                start={[0, 0]}
                end={[1, 1]}
                style={[styles.saveBtn, { paddingVertical: savePadY, borderRadius: saveRadius }]}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.saveText, { fontSize: saveTextSize }]}>Save Changes</Text>}
              </LinearGradient>
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
  card: { 
    backgroundColor: '#3F3752', 
    borderRadius: 14, 
    marginBottom: 12,
    marginHorizontal: 0,
    flexDirection: 'column',
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 7,
  },
  cardTopStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 10,
  },
  cardLabel: { fontWeight: '800', marginBottom: 0, color: '#FFFFFF', letterSpacing: 0.2 },
  inputCard: { 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.16)',
    marginTop: 6,
    backgroundColor: '#564E6B',
    color: '#FFFFFF'
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  progressPercent: { fontWeight: '800', color: '#FFFFFF' },
  progressBarBackground: { backgroundColor: '#5B5270', borderRadius: 6, marginTop: 8, overflow: 'hidden' },
  progressBarFill: { borderRadius: 6 },
  small: { color: '#B8A8E6' },
  noteText: { color: '#B8A8E6' },
  priorityRow: { flexDirection: 'row', marginTop: 10, marginLeft: 6 },
  priorityPill: { backgroundColor: '#5B5270', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  priorityPillActive: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  priorityText: { color: '#B8A8E6', fontWeight: '700' },
  priorityTextActive: { color: '#fff' },
  saveBtn: { 
    borderRadius: 14, 
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F103D',
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  saveText: { color: '#fff', fontWeight: '800' },
});
