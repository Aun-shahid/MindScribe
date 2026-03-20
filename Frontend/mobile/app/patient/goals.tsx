import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, Alert, Platform, Animated, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService, { PatientGoal, CreatePatientGoalData } from '../services/patient.service';
import { validateTextField } from '../utils/validation';
import eventBus from '../utils/eventBus';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

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
  } catch {
    return hex; // fallback
  }
};

const formatDate = (d?: string | null) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString();
  } catch { return d; }
};

const GoalsScreen: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState<PatientGoal[]>([]);
  const [createVisible, setCreateVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [expandedGoalIds, setExpandedGoalIds] = useState<string[]>([]);

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
  const headerBackOffset = clamp(width * 0.018, 6, 8);
  const listInset = clamp(width * 0.04, 14, 20);
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

  const menuBarPadding = clamp(width * 0.008, 2, 4);
  const menuTabVerticalPadding = clamp(height * 0.012, 8, 10);
  const menuTabHorizontalPadding = clamp(width * 0.022, 8, 12);
  const menuTabTextSize = clamp(width * 0.033, 12, 13);
  const menuBarBottomSpace = clamp(height * 0.028, 18, 24);

  const listTopPadding = headerEstimatedHeight + clamp(height * 0.014, 8, 12);
  const listBottomPadding = clamp(insets.bottom + height * 0.03, 28, 44);

  const cardPadding = clamp(width * 0.042, 14, 18);
  const cardRadius = clamp(width * 0.04, 14, 16);
  const cardSpacing = clamp(height * 0.016, 10, 14);
  const goalTitleSize = clamp(width * 0.043, 15, 17);
  const goalBodySize = clamp(width * 0.036, 13, 15);
  const metaTextSize = clamp(width * 0.033, 12, 13);
  const progressBarHeight = clamp(height * 0.013, 8, 10);
  const pillRadius = clamp(width * 0.03, 10, 12);
  const pillPaddingY = clamp(height * 0.01, 7, 9);
  const pillPaddingX = clamp(width * 0.03, 10, 12);
  const badgeRadius = clamp(width * 0.04, 14, 16);
  const badgePaddingY = clamp(height * 0.008, 5, 7);
  const badgePaddingX = clamp(width * 0.026, 9, 11);
  const actionGap = clamp(width * 0.02, 6, 8);
  const actionPadY = clamp(height * 0.012, 8, 10);
  const actionTextSize = clamp(width * 0.033, 12, 13);
  const iconSize = clamp(width * 0.037, 13, 15);
  const summaryArrowSize = clamp(width * 0.04, 14, 16);

  const modalWidth = clamp(width * 0.92, 320, 420);
  const modalRadius = clamp(width * 0.04, 14, 18);
  const modalPadding = clamp(width * 0.045, 14, 18);
  const inputPad = clamp(width * 0.03, 10, 12);
  const inputRadius = clamp(width * 0.028, 10, 12);
  const largeInputHeight = clamp(height * 0.12, 76, 92);

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

  useEffect(() => {
    const handler = () => { loadGoals(); };
    // Use eventBus.subscribe which returns an unsubscribe function
    let unsub: (() => void) | null = null;
    try {
      unsub = eventBus.subscribe('refreshGoals', handler);
    } catch {
      // fall back: no-op
    }
    return () => { try { if (unsub) unsub(); } catch {} };
  }, []);

  const submitCreate = async () => {
    const titleValidation = validateTextField(title, 'Title', 2);
    if (!titleValidation.isValid) {
      Alert.alert('Invalid Title', titleValidation.message || 'Title is required');
      return;
    }
    const descValidation = validateTextField(description, 'Description', 5);
    if (!descValidation.isValid) {
      Alert.alert('Invalid Description', descValidation.message || 'Description is required');
      return;
    }
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

  const submitEdit = async () => {
    if (!editingGoal) return;
    const titleValidation = validateTextField(title, 'Title', 2);
    if (!titleValidation.isValid) {
      Alert.alert('Invalid Title', titleValidation.message || 'Title is required');
      return;
    }
    const descValidation = validateTextField(description, 'Description', 5);
    if (!descValidation.isValid) {
      Alert.alert('Invalid Description', descValidation.message || 'Description is required');
      return;
    }
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

  const toggleGoalExpanded = (goalId: string) => {
    setExpandedGoalIds((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    );
  };

  const renderGoal = ({ item }: { item: PatientGoal }) => {
    const pct = item.progress_percentage || 0;
    const accent = item.priority === 'high' ? '#FF6B6B' : item.priority === 'medium' ? '#FF9F6B' : '#34D399';
    const isExpanded = expandedGoalIds.includes(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => toggleGoalExpanded(item.id)}
        style={[styles.card, { borderTopColor: '#A78BFA', padding: cardPadding, borderRadius: cardRadius, marginBottom: cardSpacing, marginHorizontal: listInset }]}
      >
        <LinearGradient
          colors={['rgba(255,179,107,0.28)', 'rgba(167,139,250,0.20)', 'rgba(52,41,73,0.96)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
        />
        <View style={[styles.cardHeader, { alignItems: 'flex-start' }]}> 
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.title, { fontSize: goalTitleSize }]}>{item.title}</Text>
          </View>
          <View style={styles.summaryHeaderRight}>
            <View style={[styles.badgePill, { backgroundColor: hexWithAlpha(accent, 0.12), borderColor: accent, paddingHorizontal: badgePaddingX, paddingVertical: badgePaddingY, borderRadius: badgeRadius }]}> 
              <Text style={[styles.badgePillText, { color: accent, fontSize: metaTextSize }]}>{item.priority_display || item.priority}</Text>
            </View>
            <FontAwesome name={isExpanded ? 'chevron-up' : 'chevron-down'} size={summaryArrowSize} color="#CFC3EE" />
          </View>
        </View>

        <View style={[styles.progressLabelRow, { marginTop: clamp(height * 0.015, 10, 12) }]}>
          <Text style={[styles.progressLabel, { fontSize: metaTextSize }]}>Progress</Text>
          <Text style={[styles.progressPercent, { fontSize: metaTextSize + 1 }]}>{pct}%</Text>
        </View>

        <View style={[styles.progressBarBackground, { height: progressBarHeight, borderRadius: progressBarHeight / 2 }]}>
          <LinearGradient colors={[accent, '#60a5fa']} start={[0,0]} end={[1,0]} style={[styles.progressBarFill, { width: `${pct}%`, height: progressBarHeight, borderRadius: progressBarHeight / 2 }]} />
        </View>

        {isExpanded ? (
          <>
            {item.description ? <Text style={[styles.desc, { fontSize: goalBodySize, lineHeight: Math.round(goalBodySize * 1.45) }]}>{item.description}</Text> : null}

            <View style={styles.targetPillRow}>
              <View style={[styles.targetPill, { paddingVertical: pillPaddingY, paddingHorizontal: pillPaddingX, borderRadius: pillRadius }]}><FontAwesome name="calendar" size={iconSize - 1} color="#FFB36B" style={{ marginRight: 8 }} /><Text style={[styles.targetPillText, { fontSize: metaTextSize }]}>Target: {item.target_date || '—'}</Text></View>
            </View>

            <View style={[styles.actionRowContainer, { gap: actionGap }]}> 
              <TouchableOpacity style={[styles.actionWrapper]} onPress={() => openUpdateProgress(item)} activeOpacity={0.9}>
                <View style={[styles.actionGradient, { paddingVertical: actionPadY, borderRadius: pillRadius }]}> 
                  <FontAwesome5 name="chart-line" size={iconSize} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={[styles.actionText, { fontSize: actionTextSize }]}>Update</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionWrapper]} onPress={() => router.push(`/patient/update-goal?id=${item.id}`)} activeOpacity={0.9}>
                <View style={[styles.editButton, { paddingVertical: actionPadY, borderRadius: pillRadius }]}> 
                  <FontAwesome name="pencil" size={iconSize} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={[styles.editText, { fontSize: actionTextSize }]}>Edit</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionWrapper]} onPress={() => handleDelete(item)} activeOpacity={0.9}>
                <View style={[styles.deleteButton, { paddingVertical: actionPadY, borderRadius: pillRadius }]}> 
                  <FontAwesome name="trash" size={iconSize} color="#dc2626" style={{ marginRight: 8 }} />
                  <Text style={[styles.deleteText, { fontSize: actionTextSize }]}>Delete</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderCompletedGoal = ({ item }: { item: PatientGoal }) => {
    const isExpanded = expandedGoalIds.includes(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => toggleGoalExpanded(item.id)}
        style={[styles.completedCardWrapper, { marginHorizontal: listInset, marginBottom: cardSpacing }]}
      >
        <View style={[styles.completedCardInner, { borderTopWidth: 6, borderTopColor: '#A78BFA', borderRadius: cardRadius, padding: cardPadding }]}> 
          <LinearGradient
            colors={['rgba(255,179,107,0.28)', 'rgba(167,139,250,0.20)', 'rgba(52,41,73,0.96)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
          />
          <View style={[styles.cardHeader, { alignItems: 'flex-start' }]}> 
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.title, { fontSize: goalTitleSize }]}>{item.title}</Text>
            </View>
            <View style={styles.summaryHeaderRight}> 
              <View style={[styles.completedBadge, { paddingHorizontal: badgePaddingX - 1, paddingVertical: badgePaddingY - 1, borderRadius: badgeRadius }]}> 
                <FontAwesome name="check" size={iconSize - 2} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={[styles.completedBadgeText, { fontSize: actionTextSize }]}>Completed</Text>
              </View>
              <FontAwesome name={isExpanded ? 'chevron-up' : 'chevron-down'} size={summaryArrowSize} color="#CFC3EE" />
            </View>
          </View>

          <View style={[styles.progressLabelRow, { marginTop: clamp(height * 0.015, 10, 12) }]}>
            <Text style={[styles.progressLabel, { fontSize: metaTextSize }]}>Progress</Text>
            <Text style={[styles.progressPercent, { fontSize: metaTextSize + 1 }]}>100%</Text>
          </View>

          <View style={[styles.progressBarBackground, { height: progressBarHeight, borderRadius: progressBarHeight / 2 }]}>
            <LinearGradient colors={['#10B981', '#34D399']} start={[0,0]} end={[1,0]} style={[styles.progressBarFill, { width: '100%', height: progressBarHeight, borderRadius: progressBarHeight / 2 }]} />
          </View>

          {isExpanded ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: clamp(height * 0.012, 8, 10), flexWrap: 'wrap' }}>
              <FontAwesome name="calendar" size={iconSize - 1} color="#B8A8E6" />
              <Text style={[styles.small, { marginLeft: 8, color: '#B8A8E6', fontSize: metaTextSize }]}>{formatDate(item.completed_date || item.updated_at)}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabBar = () => (
    <View style={[styles.menuBarContainer, styles.menuBarInline, { marginHorizontal: listInset, marginBottom: menuBarBottomSpace, padding: menuBarPadding }]}> 
      <TouchableOpacity onPress={() => setActiveTab('active')} style={styles.menuTabButton} activeOpacity={0.8}>
        {activeTab === 'active' ? (
          <LinearGradient
            colors={['#FF5AA8', '#FFB36B']}
            start={[0, 0]}
            end={[1, 0]}
            style={[styles.menuTabActive, { paddingVertical: menuTabVerticalPadding, paddingHorizontal: menuTabHorizontalPadding }]}
          >
            <Text style={[styles.menuTabActiveText, { fontSize: menuTabTextSize }]}>Active</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.menuTabInactive, { paddingVertical: menuTabVerticalPadding, paddingHorizontal: menuTabHorizontalPadding }]}>
            <Text style={[styles.menuTabInactiveText, { fontSize: menuTabTextSize }]}>Active</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setActiveTab('completed')} style={styles.menuTabButton} activeOpacity={0.8}>
        {activeTab === 'completed' ? (
          <LinearGradient
            colors={['#FF5AA8', '#FFB36B']}
            start={[0, 0]}
            end={[1, 0]}
            style={[styles.menuTabActive, { paddingVertical: menuTabVerticalPadding, paddingHorizontal: menuTabHorizontalPadding }]}
          >
            <Text style={[styles.menuTabActiveText, { fontSize: menuTabTextSize }]}>Completed</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.menuTabInactive, { paddingVertical: menuTabVerticalPadding, paddingHorizontal: menuTabHorizontalPadding }]}>
            <Text style={[styles.menuTabInactiveText, { fontSize: menuTabTextSize }]}>Completed</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const activeGoals = goals.filter(g => g.status !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const visibleGoals = activeTab === 'active' ? activeGoals : completedGoals;

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
        firstWord="My"
        secondWord="Goals"
        onBackPress={() => router.push('/patient/dashboard')}
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
          onPress={() => router.push('/patient/dashboard')}
          style={[
            styles.backBtnCircle,
            {
              left: pageInset + headerBackOffset,
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

        <TouchableOpacity
          onPress={() => router.push('/patient/add-goal')}
          style={[
            styles.headerActionCircle,
            {
              right: pageInset,
              top: headerTopPadding,
              width: headerButtonSize,
              height: headerButtonSize,
              borderRadius: headerButtonRadius,
              backgroundColor: '#A78BFA',
              borderColor: 'rgba(255,255,255,0.14)',
            },
          ]}
        >
          <FontAwesome name="plus" size={headerIconSize - 1} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}> 
          <Text style={styles.headerWhite}>My </Text>
          <Text style={styles.headerPurple}>Goals</Text>
        </Text>

      </Animated.View>

      {loading ? (
        <View style={[styles.loaderWrap, { paddingTop: listTopPadding }]}> 
          <TabLoaderCard spinnerColor="#A78BFA" fullScreen={false} />
        </View>
      ) : (
        <Animated.FlatList
          data={visibleGoals}
          keyExtractor={g => g.id}
          renderItem={activeTab === 'active' ? renderGoal : renderCompletedGoal}
          contentContainerStyle={{ paddingTop: listTopPadding, paddingBottom: listBottomPadding }}
          ListHeaderComponent={
            <>
              {renderTabBar()}
            </>
          }
          extraData={activeTab}
          ListEmptyComponent={<Text style={[styles.empty, { paddingHorizontal: listInset, fontSize: metaTextSize }]}>{activeTab === 'active' ? 'No active goals. Tap + to add one.' : 'No completed goals yet.'}</Text>}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
      )}

      {/* Create Modal */}
      <Modal visible={createVisible} animationType="slide" transparent={Platform.OS === 'ios' ? true : false}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalInner, { width: modalWidth, borderRadius: modalRadius, padding: modalPadding }]}>
            <Text style={styles.modalTitle}>Create Goal</Text>
            <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={[styles.input, { padding: inputPad, borderRadius: inputRadius }]} placeholderTextColor="#B8A8E6" />
            <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={[styles.input, { height: largeInputHeight, padding: inputPad, borderRadius: inputRadius }]} multiline placeholderTextColor="#B8A8E6" />
            <TextInput placeholder="Target Date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} style={[styles.input, { padding: inputPad, borderRadius: inputRadius }]} placeholderTextColor="#B8A8E6" />
            <View style={styles.row}> 
              <TextInput style={[styles.input, { flex:1, padding: inputPad, borderRadius: inputRadius }]} value={progress} onChangeText={setProgress} keyboardType="numeric" placeholder="Initial progress %" placeholderTextColor="#B8A8E6" />
              <TouchableOpacity onPress={() => setPriority(p => p === 'low' ? 'medium' : p === 'medium' ? 'high' : 'low')} style={[styles.priorityToggle, { padding: inputPad, borderRadius: inputRadius }]}><Text style={{ color: '#FFFFFF' }}>{priority}</Text></TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCreateVisible(false)} style={styles.cancelBtn}><Text style={{ color: '#B8A8E6' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitCreate} style={[styles.saveBtn, { padding: inputPad, borderRadius: inputRadius }]}><Text style={{color:'#fff'}}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editVisible} animationType="slide" transparent={Platform.OS === 'ios' ? true : false}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalInner, { width: modalWidth, borderRadius: modalRadius, padding: modalPadding }]}>
            <Text style={styles.modalTitle}>Edit Goal</Text>
            <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={[styles.input, { padding: inputPad, borderRadius: inputRadius }]} placeholderTextColor="#B8A8E6" />
            <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={[styles.input, { height: largeInputHeight, padding: inputPad, borderRadius: inputRadius }]} multiline placeholderTextColor="#B8A8E6" />
            <TextInput placeholder="Target Date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} style={[styles.input, { padding: inputPad, borderRadius: inputRadius }]} placeholderTextColor="#B8A8E6" />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex:1, padding: inputPad, borderRadius: inputRadius }]} value={progress} onChangeText={setProgress} keyboardType="numeric" placeholder="Progress %" placeholderTextColor="#B8A8E6" />
              <TouchableOpacity onPress={() => setPriority(p => p === 'low' ? 'medium' : p === 'medium' ? 'high' : 'low')} style={[styles.priorityToggle, { padding: inputPad, borderRadius: inputRadius }]}><Text style={{ color: '#FFFFFF' }}>{priority}</Text></TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setEditVisible(false); setEditingGoal(null); }} style={styles.cancelBtn}><Text style={{ color: '#B8A8E6' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitEdit} style={[styles.saveBtn, { padding: inputPad, borderRadius: inputRadius }]}><Text style={{color:'#fff'}}>Save</Text></TouchableOpacity>
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
  headerActionCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  headerTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },
  ctaWrap: { marginBottom: 12 },
  
  ctaButton: { 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#A78BFA' 
  },
  ctaText: { color: '#fff', fontWeight: '800' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
  menuBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A4458',
    borderRadius: 25,
    padding: 4,
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuBarInline: {
    marginBottom: 10,
  },
  menuTabButton: {
    flex: 1,
  },
  menuTabActive: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTabInactive: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  menuTabActiveText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuTabInactiveText: {
    fontWeight: '600',
    color: '#A0A0A0',
  },
  sectionAccent: { width: 4, height: 22, borderRadius: 4 },
  sectionTitle: { fontWeight: '800', color: '#FFFFFF', marginLeft: 8 },
  targetPillRow: { marginTop: 10 },
  targetPill: { 
    backgroundColor: '#5B5270', 
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
  actionWrapper: { flex: 1 },
  actionGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: 10, 
    backgroundColor: '#A78BFA' 
  },
  actionText: { color: '#fff', fontWeight: '800' },
  editButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: 10, 
    backgroundColor: '#5B5270', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  editText: { color: '#FFFFFF', fontWeight: '800' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#fecaca' },
  deleteText: { color: '#dc2626', fontWeight: '800' },
  card: { 
    backgroundColor: '#473F5A', 
    borderRadius: 14, 
    borderTopWidth: 6, 
    borderTopColor: '#60a5fa', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { fontWeight: '700', color: '#FFFFFF' },
  desc: { marginTop: 8, color: '#B8A8E6' },
  progressBarBackground: { backgroundColor: '#5B5270', borderRadius: 6, marginTop: 12, overflow: 'hidden' },
  progressBarFill: { borderRadius: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  rowRight: { alignItems: 'flex-end', marginTop: 8 },
  small: { fontSize: 12, color: '#B8A8E6' },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginLeft: 8 },
  smallBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  badgePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  badgePillText: { fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, color: '#B8A8E6', paddingHorizontal: 16 },
  completedSection: { marginTop: 20 },
  completedCardWrapper: { marginBottom: 12 },
  completedCardInner: { 
    backgroundColor: '#473F5A', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  completedCardContent: { flexDirection: 'row', alignItems: 'center' },
  completedIconWrap: { marginLeft: 0 },
  completedIconCircle: { backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
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
  modalInner: { backgroundColor: '#473F5A' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#FFFFFF' },
  input: { 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', 
    marginBottom: 8, 
    backgroundColor: '#5B5270', 
    color: '#FFFFFF' 
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { padding: 8, marginRight: 8, color: '#B8A8E6' },
  saveBtn: { backgroundColor: '#A78BFA' },
  priorityToggle: { marginLeft: 8, backgroundColor: '#5B5270', color: '#FFFFFF' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  smallActionRow: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { marginLeft: 8 },
  editBtn: { marginLeft: 8 },
  deleteBtn: { marginLeft: 8 },
});
