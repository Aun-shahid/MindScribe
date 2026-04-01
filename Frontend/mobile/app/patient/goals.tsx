import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, Alert, Platform, Animated, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService, { PatientGoal } from '../services/patient.service';
import { validateTextField } from '../utils/validation';
import eventBus from '../utils/eventBus';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const CARD_GRADIENT_COLORS = ['rgba(255,179,107,0.11)', 'rgba(167,139,250,0.08)', 'rgba(52,41,73,0.72)'] as const;
const CARD_BG     = '#3F3752';
const CARD_BORDER = 'rgba(255,255,255,0.16)';

const PRIORITY_COLORS: Record<string, string> = {
  high:   '#FF6B6B',
  medium: '#FFB36B',
  low:    '#34D399',
};

const hexWithAlpha = (hex: string, alpha: number) => {
  try {
    const h    = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h;
    const int  = parseInt(full, 16);
    return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
  } catch { return hex; }
};

const formatDate = (d?: string | null) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
};

const GoalsScreen: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ from?: string }>();
  const fromRaw = params.from;
  const fromParam = Array.isArray(fromRaw) ? fromRaw[0] : fromRaw;
  const fromRef = useRef(fromParam);
  useFocusEffect(useCallback(() => { if (fromParam) fromRef.current = fromParam; }, [fromParam]));
  const goBack = () => {
    if (fromRef.current === 'actions') {
      router.push('./actions' as any);
    } else {
      router.push('/patient/dashboard' as any);
    }
  };

  const [loading,         setLoading]         = useState(false);
  const [goals,           setGoals]           = useState<PatientGoal[]>([]);
  const [activeTab,       setActiveTab]       = useState<'active' | 'completed'>('active');
  const [expandedGoalIds, setExpandedGoalIds] = useState<string[]>([]);

  const b1y = useRef(new Animated.Value(0)).current; const b1x = useRef(new Animated.Value(0)).current;
  const b2y = useRef(new Animated.Value(0)).current; const b2x = useRef(new Animated.Value(0)).current;
  const b3y = useRef(new Animated.Value(0)).current; const b3x = useRef(new Animated.Value(0)).current;
  const b4y = useRef(new Animated.Value(0)).current; const b4x = useRef(new Animated.Value(0)).current;
  const b5y = useRef(new Animated.Value(0)).current; const b5x = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const pi        = clamp(width * 0.045, 14, 20);
  const listInset = clamp(width * 0.04,  14, 20);
  const hTop      = insets.top + clamp(height * 0.014, 10, 18);
  const hBotPad   = clamp(height * 0.02,  14, 22);
  const hBtnSz    = clamp(width * 0.098,  34, 40);
  const hBtnR     = hBtnSz / 2;
  const hIconSz   = clamp(width * 0.047,  16, 20);
  const hTitleSz  = clamp(width * 0.072,  24, 30);
  const hMTop     = clamp(height * 0.022, 14, 22);
  const hEst      = hTop + hMTop + hTitleSz * 1.3 + hBotPad;

  const bubbleLarge  = clamp(width * 0.34, 100, 140);
  const bubbleMedium = clamp(width * 0.29,  90, 120);
  const bubbleSmall  = clamp(width * 0.26,  82, 108);
  const bubbleShift  = clamp(height * 0.06,  28,  50);

  const menuBarPadding  = clamp(width * 0.008,  2,  4);
  const menuTabPadV     = clamp(height * 0.012,  8, 10);
  const menuTabPadH     = clamp(width * 0.022,   8, 12);
  const menuTabTxtSz    = clamp(width * 0.033,  12, 13);
  const menuBarBotSpace = clamp(height * 0.028, 18, 24);

  const listTopPad = hEst + clamp(height * 0.014, 8, 12);
  const listBotPad = clamp(insets.bottom + height * 0.03, 28, 44);

  const cardPad     = clamp(width * 0.045, 14, 18);
  const cardRadius  = clamp(width * 0.04,  14, 16);
  const cardSpacing = clamp(height * 0.016, 10, 14);

  const titleSz    = clamp(width * 0.043, 15, 17);
  const bodyTxtSz  = clamp(width * 0.036, 13, 15);
  const metaTxtSz  = clamp(width * 0.032, 11, 13);
  const pctSz      = clamp(width * 0.052, 18, 22);
  const barH       = clamp(height * 0.009,  6,  8);
  const chipRadius = clamp(width * 0.055,  18, 22);
  const actionPadY = clamp(height * 0.012,  8, 10);
  const actionTxtSz= clamp(width * 0.033,  12, 13);
  const iconSz     = clamp(width * 0.037,  13, 15);
  const arrowSz    = clamp(width * 0.038,  13, 15);

  const modalWidth   = clamp(width * 0.92, 320, 420);
  const modalRadius  = clamp(width * 0.04,  14, 18);
  const modalPadding = clamp(width * 0.045, 14, 18);
  const inputPad     = clamp(width * 0.03,  10, 12);
  const inputRadius  = clamp(width * 0.028, 10, 12);
  const largeInputH  = clamp(height * 0.12,  76, 92);

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [priority,    setPriority]    = useState<'low'|'medium'|'high'>('medium');
  const [targetDate,  setTargetDate]  = useState('');
  const [progress,    setProgress]    = useState<string>('0');
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible,   setEditVisible]   = useState(false);
  const [editingGoal,   setEditingGoal]   = useState<PatientGoal | null>(null);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await PatientService.getGoals();
      setGoals(data || []);
    } catch (e) {
      console.warn('Failed to load goals', e);
      Alert.alert('Error', 'Could not load goals');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadGoals(); }, []);

  useFocusEffect(
    useCallback(() => {
      [b1y,b1x,b2y,b2x,b3y,b3x,b4y,b4x,b5y,b5x].forEach(v => v.setValue(0));
      const fly = (y: Animated.Value, x: Animated.Value, dY: number, dX: number, delY = 0, delX = 0) => {
        const c = Animated.parallel([
          Animated.sequence([Animated.delay(delY), Animated.loop(Animated.sequence([
            Animated.timing(y, { toValue:  bubbleShift, duration: dY / 2, useNativeDriver: true }),
            Animated.timing(y, { toValue: -bubbleShift, duration: dY / 2, useNativeDriver: true }),
          ]))]),
          Animated.sequence([Animated.delay(delX), Animated.loop(Animated.sequence([
            Animated.timing(x, { toValue:  bubbleShift, duration: dX / 2, useNativeDriver: true }),
            Animated.timing(x, { toValue: -bubbleShift, duration: dX / 2, useNativeDriver: true }),
          ]))]),
        ]);
        c.start(); return c;
      };
      const anims = [
        fly(b1y, b1x, 8000, 10000,    0,  500),
        fly(b2y, b2x, 9000,  8500,  500, 1000),
        fly(b3y, b3x, 7500,  9500, 1000,    0),
        fly(b4y, b4x, 8500,  9000, 1500,  800),
        fly(b5y, b5x, 9500,  8000, 2000, 1500),
      ];
      return () => anims.forEach(a => a.stop());
    }, [bubbleShift])
  );

  useEffect(() => {
    let unsub: (() => void) | null = null;
    try { unsub = eventBus.subscribe('refreshGoals', loadGoals); } catch {}
    return () => { try { if (unsub) unsub(); } catch {} };
  }, []);

  const submitCreate = async () => {
    const tv = validateTextField(title, 'Title', 2);
    if (!tv.isValid) { Alert.alert('Invalid Title', tv.message || 'Title is required'); return; }
    const dv = validateTextField(description, 'Description', 5);
    if (!dv.isValid) { Alert.alert('Invalid Description', dv.message || 'Description is required'); return; }
    try {
      setLoading(true);
      await PatientService.createGoal({ title: title.trim(), description: description.trim(), priority, target_date: targetDate || undefined, progress_percentage: Number(progress) || 0, milestones: undefined });
      setCreateVisible(false);
      await loadGoals();
    } catch { Alert.alert('Error', 'Could not create goal'); }
    finally { setLoading(false); }
  };

  const submitEdit = async () => {
    if (!editingGoal) return;
    const tv = validateTextField(title, 'Title', 2);
    if (!tv.isValid) { Alert.alert('Invalid Title', tv.message || 'Title is required'); return; }
    const dv = validateTextField(description, 'Description', 5);
    if (!dv.isValid) { Alert.alert('Invalid Description', dv.message || 'Description is required'); return; }
    try {
      setLoading(true);
      await PatientService.partialUpdateGoal(editingGoal.id, { title: title.trim(), description: description.trim(), priority, target_date: targetDate || null, progress_percentage: Number(progress) || 0 });
      setEditVisible(false); setEditingGoal(null);
      await loadGoals();
    } catch { Alert.alert('Error', 'Could not update goal'); }
    finally { setLoading(false); }
  };

  const handleDelete = (goal: PatientGoal) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { setLoading(true); await PatientService.deleteGoal(goal.id); await loadGoals(); }
        catch { Alert.alert('Error', 'Could not delete goal'); }
        finally { setLoading(false); }
      }},
    ]);
  };

  const toggleExpanded = (id: string) =>
    setExpandedGoalIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Active goal card (unchanged) ──────────────────────────────────────────
  const renderGoal = ({ item }: { item: PatientGoal }) => {
    const pct        = item.progress_percentage || 0;
    const accent     = PRIORITY_COLORS[item.priority] ?? '#A78BFA';
    const isExpanded = expandedGoalIds.includes(item.id);
    const accentFaint= hexWithAlpha(accent, 0.12);
    const accentMid  = hexWithAlpha(accent, 0.35);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => toggleExpanded(item.id)}
        style={[styles.card, { borderRadius: cardRadius, marginBottom: cardSpacing, marginHorizontal: listInset, overflow: 'hidden' }]}
      >
        <LinearGradient
          colors={CARD_GRADIENT_COLORS}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
          pointerEvents="none"
        />
        <View style={{ height: 3, backgroundColor: accent, position: 'absolute', top: 0, left: 0, right: 0 }} />

        <View style={{ padding: cardPad, paddingTop: cardPad + 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: clamp(height * 0.014, 8, 12) }}>
            <Text style={[styles.cardTitle, { fontSize: titleSz, flex: 1, paddingRight: 10 }]} numberOfLines={2}>
              {item.title}
            </Text>
            <FontAwesome name={isExpanded ? 'chevron-up' : 'chevron-down'} size={arrowSz} color="#CFC3EE" style={{ marginTop: 3 }} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: clamp(height * 0.018, 12, 16) }}>
            <View style={[styles.chip, { backgroundColor: accentFaint, borderColor: accentMid, borderRadius: chipRadius }]}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent, marginRight: 5 }} />
              <Text style={[styles.chipText, { color: accent, fontSize: metaTxtSz }]}>
                {(item.priority_display || item.priority).charAt(0).toUpperCase() + (item.priority_display || item.priority).slice(1).toLowerCase()}
              </Text>
            </View>
            {item.target_date ? (
              <View style={[styles.chip, { backgroundColor: 'rgba(255,179,107,0.10)', borderColor: 'rgba(255,179,107,0.30)', borderRadius: chipRadius }]}>
                <FontAwesome name="calendar-o" size={metaTxtSz - 1} color="#FFB36B" style={{ marginRight: 5 }} />
                <Text style={[styles.chipText, { color: '#FFB36B', fontSize: metaTxtSz }]}>{item.target_date}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ marginBottom: isExpanded ? clamp(height * 0.018, 12, 16) : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#9D8EC7', fontSize: metaTxtSz, fontWeight: '600', letterSpacing: 0.6 }}>PROGRESS</Text>
              <Text style={{ color: '#FFFFFF', fontSize: pctSz, fontWeight: '900', lineHeight: pctSz * 1.1 }}>{pct}<Text style={{ fontSize: metaTxtSz + 1, color: '#9D8EC7', fontWeight: '600' }}>%</Text></Text>
            </View>
            <View style={[styles.trackBg, { height: barH, borderRadius: barH / 2 }]}>
              {pct > 0 && (
                <LinearGradient
                  colors={[accent, hexWithAlpha(accent, 0.55)]}
                  start={[0, 0]} end={[1, 0]}
                  style={[styles.trackFill, { width: `${pct}%`, height: barH, borderRadius: barH / 2 }]}
                />
              )}
              {pct > 0 && pct < 100 && (
                <View style={[styles.trackDot, {
                  left: `${pct}%`,
                  width: barH + 4, height: barH + 4, borderRadius: (barH + 4) / 2,
                  backgroundColor: accent,
                  marginTop: -(barH + 4 - barH) / 2,
                  shadowColor: accent,
                }]} />
              )}
            </View>
          </View>

          {isExpanded && (
            <>
              {!!item.description && (
                <Text style={[styles.desc, { fontSize: bodyTxtSz, lineHeight: Math.round(bodyTxtSz * 1.5), marginBottom: clamp(height * 0.018, 12, 16) }]}>
                  {item.description}
                </Text>
              )}
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: clamp(height * 0.016, 10, 14) }} />
              <View style={{ flexDirection: 'row', gap: clamp(width * 0.02, 6, 8) }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { flex: 1, paddingVertical: actionPadY, borderRadius: clamp(width * 0.03, 10, 12), backgroundColor: '#A78BFA' }]}
                  onPress={() => router.push(`/patient/update-progress-goal?id=${item.id}`)}
                  activeOpacity={0.85}
                >
                  <FontAwesome5 name="chart-line" size={iconSz} color="#fff" />
                  <Text style={[styles.actionTxt, { fontSize: actionTxtSz, color: '#fff' }]}>Update</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { flex: 1, paddingVertical: actionPadY, borderRadius: clamp(width * 0.03, 10, 12), backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }]}
                  onPress={() => router.push(`/patient/update-goal?id=${item.id}`)}
                  activeOpacity={0.85}
                >
                  <FontAwesome name="pencil" size={iconSz} color="#E2D9F3" />
                  <Text style={[styles.actionTxt, { fontSize: actionTxtSz, color: '#E2D9F3' }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { paddingVertical: actionPadY, paddingHorizontal: clamp(width * 0.03, 10, 14), borderRadius: clamp(width * 0.03, 10, 12), backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.28)' }]}
                  onPress={() => handleDelete(item)}
                  activeOpacity={0.85}
                >
                  <FontAwesome name="trash" size={iconSz} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Completed goal card — static, no dropdown ─────────────────────────────
  const renderCompletedGoal = ({ item }: { item: PatientGoal }) => (
    <View
      style={[styles.card, { borderRadius: cardRadius, marginBottom: cardSpacing, marginHorizontal: listInset, overflow: 'hidden' }]}
    >
      <LinearGradient
        colors={CARD_GRADIENT_COLORS}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: cardRadius }]}
        pointerEvents="none"
      />
      <View style={{ height: 3, backgroundColor: '#10B981', position: 'absolute', top: 0, left: 0, right: 0 }} />

      <View style={{ padding: cardPad, paddingTop: cardPad + 3 }}>
        {/* Title only — no chevron */}
        <Text style={[styles.cardTitle, { fontSize: titleSz, marginBottom: clamp(height * 0.014, 8, 12) }]} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Completed badge + date */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: clamp(height * 0.018, 12, 16) }}>
          <View style={[styles.chip, { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.35)', borderRadius: chipRadius }]}>
            <FontAwesome name="check-circle" size={metaTxtSz} color="#10B981" style={{ marginRight: 5 }} />
            <Text style={[styles.chipText, { color: '#10B981', fontSize: metaTxtSz }]}>Completed</Text>
          </View>
          {(item.completed_date || item.updated_at) && (
            <Text style={{ color: '#7A6E9A', fontSize: metaTxtSz - 1, marginLeft: 10 }}>
              {formatDate(item.completed_date || item.updated_at)}
            </Text>
          )}
        </View>

        {/* 100% progress bar */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#9D8EC7', fontSize: metaTxtSz, fontWeight: '600', letterSpacing: 0.6 }}>PROGRESS</Text>
            <Text style={{ color: '#10B981', fontSize: pctSz, fontWeight: '900', lineHeight: pctSz * 1.1 }}>
              100<Text style={{ fontSize: metaTxtSz + 1, color: '#9D8EC7', fontWeight: '600' }}>%</Text>
            </Text>
          </View>
          <View style={[styles.trackBg, { height: barH, borderRadius: barH / 2 }]}>
            <LinearGradient
              colors={['#10B981', '#10B98170']}
              start={[0, 0]} end={[1, 0]}
              style={[styles.trackFill, { width: '100%', height: barH, borderRadius: barH / 2 }]}
            />
          </View>
        </View>
      </View>
    </View>
  );

  // ── Tab bar ───────────────────────────────────────────────────────────────
  const renderTabBar = () => (
    <View style={[styles.menuBar, { marginHorizontal: listInset, marginBottom: menuBarBotSpace, padding: menuBarPadding }]}>
      {(['active', 'completed'] as const).map(tab => (
        <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.menuTabBtn} activeOpacity={0.8}>
          {activeTab === tab ? (
            <LinearGradient colors={['#FF5AA8', '#FFB36B']} start={[0,0]} end={[1,0]}
              style={[styles.menuTabActive, { paddingVertical: menuTabPadV, paddingHorizontal: menuTabPadH }]}>
              <Text style={[styles.menuTabActiveTxt, { fontSize: menuTabTxtSz }]}>{tab === 'active' ? 'Active' : 'Completed'}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.menuTabInactive, { paddingVertical: menuTabPadV, paddingHorizontal: menuTabPadH }]}>
              <Text style={[styles.menuTabInactiveTxt, { fontSize: menuTabTxtSz }]}>{tab === 'active' ? 'Active' : 'Completed'}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const activeGoals    = goals.filter(g => g.status !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const visibleGoals   = activeTab === 'active' ? activeGoals : completedGoals;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#342949', '#2a1f3d', '#342949']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={styles.bubblesLayer} pointerEvents="none">
        <Animated.View style={[styles.bubble, { top:'10%', left:'-10%', width:bubbleLarge,  height:bubbleLarge,  transform:[{translateY:b1y},{translateX:b1x}] }]} />
        <Animated.View style={[styles.bubble, { top:'30%', right:'-5%', width:bubbleMedium, height:bubbleMedium, transform:[{translateY:b2y},{translateX:b2x}] }]} />
        <Animated.View style={[styles.bubble, { top:'50%', left:'-8%', width:bubbleSmall,   height:bubbleSmall,  transform:[{translateY:b3y},{translateX:b3x}] }]} />
        <Animated.View style={[styles.bubble, { top:'70%', right:'-7%',width:bubbleMedium,  height:bubbleMedium, transform:[{translateY:b4y},{translateX:b4x}] }]} />
        <Animated.View style={[styles.bubble, { bottom:'5%',left:'5%', width:bubbleSmall,   height:bubbleSmall,  transform:[{translateY:b5y},{translateX:b5x}] }]} />
      </View>

      <StickyHeader scrollY={scrollY} firstWord="My" secondWord="Goals" onBackPress={goBack} />

      <Animated.View style={[styles.headerContainer, {
        paddingTop: hTop, paddingHorizontal: pi, paddingBottom: hBotPad,
        opacity: scrollY.interpolate({ inputRange:[0,100,150], outputRange:[1,0.5,0], extrapolate:'clamp' }),
      }]}>
        <TouchableOpacity
          onPress={goBack}
          hitSlop={{ top:12, bottom:12, left:12, right:12 }}
          style={[styles.absBtn, { left:pi, top:hTop, width:hBtnSz, height:hBtnSz, borderRadius:hBtnR, backgroundColor:'rgba(255,255,255,0.08)', borderColor:'rgba(255,255,255,0.14)' }]}
        >
          <FontAwesome name="chevron-left" size={hIconSz} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/patient/add-goal')}
          hitSlop={{ top:12, bottom:12, left:12, right:12 }}
          style={[styles.absBtn, { right: pi * 1.5, top:hTop, width:hBtnSz, height:hBtnSz, borderRadius:hBtnR, backgroundColor:'#A78BFA', borderColor:'rgba(255,255,255,0.14)' }]}
        >
          <FontAwesome name="plus" size={hIconSz - 1} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={{ fontSize:hTitleSz, fontWeight:'800', textAlign:'center', marginTop:hMTop }}>
          <Text style={{ color:'#FFFFFF' }}>My </Text>
          <Text style={{ color:'#B8A8E6' }}>Goals</Text>
        </Text>
      </Animated.View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <TabLoaderCard spinnerColor="#A78BFA" fullScreen={false} />
        </View>
      ) : (
        <Animated.FlatList
          data={visibleGoals}
          keyExtractor={g => g.id}
          renderItem={activeTab === 'active' ? renderGoal : renderCompletedGoal}
          contentContainerStyle={{ paddingTop: listTopPad, paddingBottom: listBotPad }}
          ListHeaderComponent={renderTabBar()}
          extraData={activeTab}
          ListEmptyComponent={
            <Text style={[styles.empty, { paddingHorizontal: listInset, fontSize: metaTxtSz }]}>
              {activeTab === 'active' ? 'No active goals. Tap + to add one.' : 'No completed goals yet.'}
            </Text>
          }
          onScroll={Animated.event([{ nativeEvent:{ contentOffset:{ y:scrollY } } }], { useNativeDriver:true })}
          scrollEventThrottle={16}
        />
      )}

      {/* Create Modal */}
      <Modal visible={createVisible} animationType="slide" transparent={Platform.OS === 'ios'}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalInner, { width:modalWidth, borderRadius:modalRadius, padding:modalPadding }]}>
            <Text style={styles.modalTitle}>Create Goal</Text>
            <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={[styles.input, { padding:inputPad, borderRadius:inputRadius }]} placeholderTextColor="#B8A8E6" />
            <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={[styles.input, { height:largeInputH, padding:inputPad, borderRadius:inputRadius }]} multiline placeholderTextColor="#B8A8E6" />
            <TextInput placeholder="Target Date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} style={[styles.input, { padding:inputPad, borderRadius:inputRadius }]} placeholderTextColor="#B8A8E6" />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex:1, padding:inputPad, borderRadius:inputRadius }]} value={progress} onChangeText={setProgress} keyboardType="numeric" placeholder="Initial progress %" placeholderTextColor="#B8A8E6" />
              <TouchableOpacity onPress={() => setPriority(p => p==='low'?'medium':p==='medium'?'high':'low')} style={[styles.priorityToggle, { padding:inputPad, borderRadius:inputRadius }]}>
                <Text style={{ color:'#FFFFFF' }}>{priority}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCreateVisible(false)} style={styles.cancelBtn}><Text style={{ color:'#B8A8E6' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitCreate} style={[styles.saveBtn, { padding:inputPad, borderRadius:inputRadius }]}><Text style={{ color:'#fff' }}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editVisible} animationType="slide" transparent={Platform.OS === 'ios'}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalInner, { width:modalWidth, borderRadius:modalRadius, padding:modalPadding }]}>
            <Text style={styles.modalTitle}>Edit Goal</Text>
            <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={[styles.input, { padding:inputPad, borderRadius:inputRadius }]} placeholderTextColor="#B8A8E6" />
            <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={[styles.input, { height:largeInputH, padding:inputPad, borderRadius:inputRadius }]} multiline placeholderTextColor="#B8A8E6" />
            <TextInput placeholder="Target Date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} style={[styles.input, { padding:inputPad, borderRadius:inputRadius }]} placeholderTextColor="#B8A8E6" />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex:1, padding:inputPad, borderRadius:inputRadius }]} value={progress} onChangeText={setProgress} keyboardType="numeric" placeholder="Progress %" placeholderTextColor="#B8A8E6" />
              <TouchableOpacity onPress={() => setPriority(p => p==='low'?'medium':p==='medium'?'high':'low')} style={[styles.priorityToggle, { padding:inputPad, borderRadius:inputRadius }]}>
                <Text style={{ color:'#FFFFFF' }}>{priority}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setEditVisible(false); setEditingGoal(null); }} style={styles.cancelBtn}><Text style={{ color:'#B8A8E6' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitEdit} style={[styles.saveBtn, { padding:inputPad, borderRadius:inputRadius }]}><Text style={{ color:'#fff' }}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GoalsScreen;

const styles = StyleSheet.create({
  container:    { flex:1, backgroundColor:'#342949' },
  bubblesLayer: { position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:0 },
  bubble:       { position:'absolute', backgroundColor:'rgba(133,130,180,0.15)', borderRadius:1000 },

  headerContainer: { position:'absolute', top:0, left:0, right:0, zIndex:900 },
  absBtn: {
    position:'absolute',
    alignItems:'center', justifyContent:'center',
    borderWidth:1,
    shadowColor:'#000', shadowOpacity:0.03,
    shadowOffset:{ width:0, height:2 }, shadowRadius:6,
    elevation:1, zIndex:1000,
  },

  loaderWrap: { flex:1, alignItems:'center', justifyContent:'center' },

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

  cardTitle: { fontWeight: '700', color: '#FFFFFF' },
  desc:      { color: '#B8A8E6' },

  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  chipText: { fontWeight: '700' },

  trackBg:   { backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'visible', position: 'relative' },
  trackFill: {},
  trackDot: {
    position: 'absolute',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
    marginLeft: -5,
    top: 0,
  },

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionTxt: { fontWeight: '700' },

  menuBar:          { flexDirection:'row', alignItems:'center', backgroundColor:'#4A4458', borderRadius:25, zIndex:1001 },
  menuTabBtn:       { flex:1 },
  menuTabActive:    { borderRadius:22, alignItems:'center', justifyContent:'center' },
  menuTabInactive:  { borderRadius:22, alignItems:'center', justifyContent:'center' },
  menuTabActiveTxt: { fontWeight:'600', color:'#FFFFFF' },
  menuTabInactiveTxt:{ fontWeight:'600', color:'#A0A0A0' },

  empty: { textAlign:'center', marginTop:40, color:'#B8A8E6' },

  modalContainer: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.3)' },
  modalInner:     { backgroundColor:'#473F5A' },
  modalTitle:     { fontSize:18, fontWeight:'700', marginBottom:8, color:'#FFFFFF' },
  input:          { borderWidth:1, borderColor:'rgba(255,255,255,0.1)', marginBottom:8, backgroundColor:'#5B5270', color:'#FFFFFF' },
  modalActions:   { flexDirection:'row', justifyContent:'flex-end', marginTop:8 },
  cancelBtn:      { padding:8, marginRight:8 },
  saveBtn:        { backgroundColor:'#A78BFA' },
  priorityToggle: { marginLeft:8, backgroundColor:'#5B5270' },
  row:            { flexDirection:'row', justifyContent:'space-between', marginTop:8 },
});
