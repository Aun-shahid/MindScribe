import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated, useWindowDimensions, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService, { UpdatePatientGoalData } from '../services/patient.service';
import eventBus from '../utils/eventBus';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';
import { validateMeaningfulTextField } from '../utils/validation';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

// ── Same card recipe as Dashboard / Goals ─────────────────────────────────────
const CARD_GRADIENT_COLORS = ['rgba(255,179,107,0.11)', 'rgba(167,139,250,0.08)', 'rgba(52,41,73,0.72)'] as const;
const CARD_BG     = '#3F3752';
const CARD_BORDER = 'rgba(255,255,255,0.16)';

const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDisplayDate = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatApiDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseApiDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function UpdateGoalPage() {
  const { id } = useLocalSearchParams() as { id?: string };
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [loading,     setLoading]     = useState(false);
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [priority,    setPriority]    = useState<'low'|'medium'|'high'>('medium');
  const [targetDate,  setTargetDate]  = useState('');
  const [dateObj,     setDateObj]     = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [progress,    setProgress]    = useState('0');
  const [goalId,      setGoalId]      = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Bubble refs ───────────────────────────────────────────────────────────
  const b1y = useRef(new Animated.Value(0)).current; const b1x = useRef(new Animated.Value(0)).current;
  const b2y = useRef(new Animated.Value(0)).current; const b2x = useRef(new Animated.Value(0)).current;
  const b3y = useRef(new Animated.Value(0)).current; const b3x = useRef(new Animated.Value(0)).current;
  const b4y = useRef(new Animated.Value(0)).current; const b4x = useRef(new Animated.Value(0)).current;
  const b5y = useRef(new Animated.Value(0)).current; const b5x = useRef(new Animated.Value(0)).current;

  // ── Responsive tokens ─────────────────────────────────────────────────────
  const pageInset             = clamp(width * 0.03, 12, 18);
  const headerBackOffset      = clamp(width * 0.018, 6, 8);
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

  const contentTopPadding    = headerEstimatedHeight + clamp(height * 0.02, 12, 18);
  const contentBottomPadding = clamp(insets.bottom + height * 0.04, 26, 42);
  const cardPadding          = clamp(width * 0.042, 14, 18);
  const cardRadius           = clamp(width * 0.04,  14, 16);
  const cardGap              = clamp(height * 0.016, 10, 14);
  const labelSize            = clamp(width * 0.038, 14, 16);
  const inputSize            = clamp(width * 0.039, 14, 16);
  const descInputHeight      = clamp(height * 0.14,  92, 126);
  const progressTextSize     = clamp(width * 0.049,  17, 20);
  const noteTextSize         = clamp(width * 0.033,  12, 13);
  const progressBarHeight    = clamp(height * 0.013,   8, 10);
  const priorityPadY         = clamp(height * 0.011,   7,  9);
  const priorityTextSize     = clamp(width * 0.036,   13, 14);
  const savePadY             = clamp(height * 0.018,  12, 16);
  const saveRadius           = clamp(width * 0.038,   13, 16);
  const saveTextSize         = clamp(width * 0.04,    14, 16);
  const iconBadgeSz          = clamp(width * 0.076,   26, 32);
  const iconBadgeR           = iconBadgeSz / 2;
  const iconSz               = clamp(width * 0.032,   11, 13);

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
        setPriority((g.priority as any) || 'medium');
        const parsedTargetDate = parseApiDate(g.target_date);
        setDateObj(parsedTargetDate);
        setTargetDate(parsedTargetDate ? formatDisplayDate(parsedTargetDate) : '');
        setProgress(String(g.progress_percentage || 0));
      } catch { Alert.alert('Error', 'Could not load goal'); router.back(); }
      finally { setLoading(false); }
    })();
  }, [id]);

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

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event?.type === 'dismissed' || !selectedDate) return;
    }

    if (selectedDate) {
      setDateObj(selectedDate);
      setTargetDate(formatDisplayDate(selectedDate));
    }
  };

  const submit = async () => {
    if (!goalId) return;

    const titleValidation = validateMeaningfulTextField(title, 'Goal title', 2, false);
    if (!titleValidation.isValid) {
      return Alert.alert('Validation', titleValidation.message || 'Goal title is required');
    }

    const descriptionValidation = validateMeaningfulTextField(description, 'Goal description', 3, false);
    if (!descriptionValidation.isValid) {
      return Alert.alert('Validation', descriptionValidation.message || 'Goal description cannot be empty. Please add a description.');
    }

    const todayStart = getTodayStart();
    if (!dateObj) {
      return Alert.alert('Validation', 'Target date is required. Please select a target date.');
    }

    const selectedDate = new Date(dateObj);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < todayStart) {
      return Alert.alert('Validation', 'Target date cannot be in the past. Please select today or a future date.');
    }

    const payload: UpdatePatientGoalData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      target_date: formatApiDate(selectedDate),
    };
    try {
      setLoading(true);
      await PatientService.partialUpdateGoal(goalId, payload);
      try { eventBus.emit('refreshGoals'); } catch {}
      router.push('/patient/goals');
    } catch (e: any) {
      const descriptionError = e?.response?.data?.description;
      const targetDateError = e?.response?.data?.target_date;
      if (descriptionError) {
        Alert.alert('Validation', Array.isArray(descriptionError) ? descriptionError[0] : String(descriptionError));
      } else if (targetDateError) {
        Alert.alert('Validation', Array.isArray(targetDateError) ? targetDateError[0] : String(targetDateError));
      } else {
        Alert.alert('Error', 'Could not update goal');
      }
    }
    finally { setLoading(false); }
  };

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

      <StickyHeader scrollY={scrollY} firstWord="Edit" secondWord="Goal" onBackPress={() => router.push('/patient/goals')} />

      {/* Fading header */}
      <Animated.View style={[styles.headerContainer, {
        paddingTop: headerTopPadding, paddingHorizontal: pageInset, paddingBottom: headerBottomPadding,
        opacity: scrollY.interpolate({ inputRange:[0,100,150], outputRange:[1,0.5,0], extrapolate:'clamp' }),
      }]}>
        <TouchableOpacity
          onPress={() => router.push('/patient/goals')}
          style={[styles.backBtnCircle, { left:pageInset + headerBackOffset, top:headerTopPadding, width:headerButtonSize, height:headerButtonSize, borderRadius:headerButtonRadius }]}
        >
          <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize:headerTitleSize, marginTop:headerTitleMarginTop }]}>
          <Text style={styles.headerWhite}>Edit </Text>
          <Text style={styles.headerPurple}>Goal</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal:sectionInset, paddingTop:contentTopPadding, paddingBottom:contentBottomPadding }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent:{ contentOffset:{ y:scrollY } } }], { useNativeDriver:true })}
        scrollEventThrottle={16}
      >
        {/* ── Centered spinner ── */}
        {loading ? (
          <View style={{ flex:1, alignItems:'center', justifyContent:'center', minHeight: height * 0.6 }}>
            <TabLoaderCard spinnerColor="#A78BFA" fullScreen={false} />
          </View>
        ) : (
          <>
            {/* ── Title card ── */}
            <View style={[styles.card, { borderRadius:cardRadius, marginBottom:cardGap, overflow:'hidden' }]}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <View style={{ height:3, backgroundColor:'#FF6EA5', position:'absolute', top:0, left:0, right:0 }} />
              <View style={{ padding:cardPadding, paddingTop:cardPadding+3 }}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.iconBadge, { width:iconBadgeSz, height:iconBadgeSz, borderRadius:iconBadgeR, backgroundColor:'rgba(255,110,165,0.16)', borderColor:'rgba(255,110,165,0.42)' }]}>
                    <FontAwesome name="pencil" size={iconSz} color="#FFC4DE" />
                  </View>
                  <View>
                    <Text style={[styles.cardLabel, { fontSize:labelSize }]}>Goal Title</Text>
                    <Text style={{ fontSize:clamp(width*0.028,10,11), color:'#9D8EC7', letterSpacing:1.2, marginTop:1 }}>REQUIRED</Text>
                  </View>
                </View>
                <View style={{ borderBottomWidth:1.5, borderBottomColor:'rgba(255,110,165,0.45)', paddingBottom:4 }}>
                  <TextInput
                    value={title} onChangeText={setTitle}
                    placeholder="E.g., Daily Meditation Practice"
                    placeholderTextColor="rgba(184,168,230,0.45)"
                    style={{ color:'#FFFFFF', fontSize:inputSize, fontWeight:'600', paddingVertical:clamp(height*0.009,6,9), paddingHorizontal:2, backgroundColor:'transparent', height:clamp(height*0.056,38,46) }}
                  />
                </View>
              </View>
            </View>

            {/* ── Description card ── */}
            <View style={[styles.card, { borderRadius:cardRadius, marginBottom:cardGap, overflow:'hidden' }]}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <View style={{ height:3, backgroundColor:'#06b6d4', position:'absolute', top:0, left:0, right:0 }} />
              <View style={{ padding:cardPadding, paddingTop:cardPadding+3 }}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.iconBadge, { width:iconBadgeSz, height:iconBadgeSz, borderRadius:iconBadgeR, backgroundColor:'rgba(6,182,212,0.16)', borderColor:'rgba(6,182,212,0.42)' }]}>
                    <FontAwesome name="align-left" size={iconSz} color="#8DE8F8" />
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={[styles.cardLabel, { fontSize:labelSize }]}>Description</Text>
                    <Text style={{ fontSize:clamp(width*0.028,10,11), color:'#9D8EC7', letterSpacing:0.8, marginTop:1 }}>Explain your goal clearly</Text>
                  </View>
                </View>
                <View style={{ height:1, backgroundColor:'rgba(255,255,255,0.08)', marginBottom:4 }} />
                <TextInput
                  value={description} onChangeText={setDescription}
                  placeholder="Describe your goal and why it matters to you..."
                  placeholderTextColor="rgba(184,168,230,0.45)"
                  multiline numberOfLines={4} textAlignVertical="top"
                  style={{ color:'#FFFFFF', fontSize:clamp(width*0.039,14,16), paddingVertical:clamp(height*0.016,10,14), paddingHorizontal:2, backgroundColor:'transparent', minHeight:descInputHeight, lineHeight:clamp(width*0.039,14,16)*1.55 }}
                />
              </View>
            </View>

            {/* ── Target date card ── */}
            <View style={[styles.card, { borderRadius:cardRadius, marginBottom:cardGap, overflow:'hidden' }]}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <View style={{ height:3, backgroundColor:'#8b5cf6', position:'absolute', top:0, left:0, right:0 }} />
              <View style={{ padding:cardPadding, paddingTop:cardPadding+3 }}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.iconBadge, { width:iconBadgeSz, height:iconBadgeSz, borderRadius:iconBadgeR, backgroundColor:'rgba(139,92,246,0.16)', borderColor:'rgba(139,92,246,0.42)' }]}>
                    <FontAwesome name="calendar" size={iconSz} color="#D6C3FF" />
                  </View>
                  <View>
                    <Text style={[styles.cardLabel, { fontSize:labelSize }]}>Target Date</Text>
                    <Text style={{ fontSize:clamp(width*0.028,10,11), color:'#9D8EC7', letterSpacing:1.2, marginTop:1 }}>REQUIRED</Text>
                  </View>
                </View>
                <View style={{ borderBottomWidth:1.5, borderBottomColor:'rgba(139,92,246,0.45)', paddingBottom:4 }}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                    style={styles.dateTrigger}
                  >
                    <Text style={{ color: targetDate ? '#FFFFFF' : 'rgba(184,168,230,0.75)', fontWeight: '600' }}>
                      {targetDate || 'Select target date'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <View style={styles.datePickerWrap}>
                      <DateTimePicker
                        value={dateObj || getTodayStart()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                        onChange={onChangeDate}
                        minimumDate={getTodayStart()}
                      />
                      {Platform.OS === 'ios' && (
                        <View style={styles.dateActionsRow}>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.dateActionBtn}>
                            <Text style={styles.dateActionText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)} style={[styles.dateActionBtn, styles.dateActionBtnPrimary]}>
                            <Text style={[styles.dateActionText, styles.dateActionTextPrimary]}>Done ✓</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* ── Current progress (read-only) card ── */}
            <View style={[styles.card, { borderRadius:cardRadius, marginBottom:cardGap, overflow:'hidden' }]}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <View style={{ height:3, backgroundColor:'#ff9f6b', position:'absolute', top:0, left:0, right:0 }} />
              <View style={{ padding:cardPadding, paddingTop:cardPadding+3 }}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.iconBadge, { width:iconBadgeSz, height:iconBadgeSz, borderRadius:iconBadgeR, backgroundColor:'rgba(255,159,107,0.16)', borderColor:'rgba(255,159,107,0.42)' }]}>
                    <FontAwesome name="line-chart" size={iconSz} color="#FFD0B6" />
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={[styles.cardLabel, { fontSize:labelSize }]}>Current Progress</Text>
                    <Text style={{ fontSize:clamp(width*0.028,10,11), color:'#C9A97E', letterSpacing:0.8, marginTop:1 }}>READ-ONLY</Text>
                  </View>
                </View>

                <View style={{ flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between', marginBottom:8 }}>
                  <Text style={{ color:'#9D8EC7', fontSize:noteTextSize, fontWeight:'600', letterSpacing:0.6 }}>PROGRESS</Text>
                  <Text style={{ color:'#FFFFFF', fontSize:progressTextSize, fontWeight:'900', lineHeight:progressTextSize*1.1 }}>
                    {Number(progress||0)}<Text style={{ fontSize:noteTextSize, color:'#9D8EC7', fontWeight:'600' }}>%</Text>
                  </Text>
                </View>

                <View style={{ height:progressBarHeight, borderRadius:progressBarHeight/2, backgroundColor:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                  {Number(progress||0) > 0 && (
                    <LinearGradient colors={['#FFB36B','#ff9f6b']} start={[0,0]} end={[1,0]}
                      style={{ height:'100%', width:`${Number(progress||0)}%`, borderRadius:progressBarHeight/2 }} />
                  )}
                </View>

                <Text style={[styles.noteText, { fontSize:noteTextSize, marginTop:clamp(height*0.01,6,8) }]}>
                  Use the &ldquo;Update&rdquo; button on the goal card to change progress.
                </Text>
              </View>
            </View>

            {/* ── Priority card ── */}
            <View style={[styles.card, { borderRadius:cardRadius, marginBottom:cardGap, overflow:'hidden' }]}>
              <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <View style={{ height:3, backgroundColor:'#FF6EA5', position:'absolute', top:0, left:0, right:0 }} />
              <View style={{ padding:cardPadding, paddingTop:cardPadding+3 }}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.iconBadge, { width:iconBadgeSz, height:iconBadgeSz, borderRadius:iconBadgeR, backgroundColor:'rgba(255,110,165,0.16)', borderColor:'rgba(255,110,165,0.42)' }]}>
                    <FontAwesome name="flag" size={iconSz} color="#FFC4DE" />
                  </View>
                  <View>
                    <Text style={[styles.cardLabel, { fontSize:labelSize }]}>Priority Level</Text>
                    <Text style={{ fontSize:clamp(width*0.028,10,11), color:'#9D8EC7', letterSpacing:1.2, marginTop:1 }}>CHOOSE URGENCY</Text>
                  </View>
                </View>
                <View style={{ flexDirection:'row', marginTop:clamp(height*0.012,8,10), gap:clamp(width*0.025,8,10) }}>
                  {(['low','medium','high'] as const).map((p) => {
                    const isActive = priority === p;
                    const colors: Record<string,[string,string]> = { low:['rgba(52,211,153,0.14)','rgba(52,211,153,0.35)'], medium:['rgba(255,179,107,0.14)','rgba(255,179,107,0.35)'], high:['rgba(255,107,107,0.14)','rgba(255,107,107,0.35)'] };
                    const activeColors: Record<string,string> = { low:'#34D399', medium:'#FFB36B', high:'#FF6B6B' };
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setPriority(p)}
                        style={{
                          flex:1, paddingVertical:priorityPadY, borderRadius:clamp(width*0.05,16,20),
                          alignItems:'center',
                          backgroundColor: isActive ? activeColors[p] : colors[p][0],
                          borderWidth:1,
                          borderColor: isActive ? activeColors[p] : colors[p][1],
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: isActive ? '#fff' : activeColors[p], fontSize:priorityTextSize, fontWeight:'800' }}>
                          {p.charAt(0).toUpperCase()+p.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ── Save button ── */}
            <TouchableOpacity onPress={submit} disabled={loading} style={{ marginTop:clamp(height*0.018,12,16) }} activeOpacity={0.85}>
              <LinearGradient
                colors={['#8B5CF6','#A78BFA']}
                start={[0,0]} end={[1,1]}
                style={[styles.saveBtn, { paddingVertical:savePadY, borderRadius:saveRadius }]}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[styles.saveText, { fontSize:saveTextSize }]}>Save Changes</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </Animated.ScrollView>
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
  scroll: { flex:1 },

  // ── Card — solid bg prevents bubble bleed-through on Android APK ──
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

  cardHeaderRow: { flexDirection:'row', alignItems:'center', marginBottom:clamp(12,12,16), gap:10 },
  iconBadge:     { alignItems:'center', justifyContent:'center', borderWidth:1 },
  cardLabel:     { fontWeight:'800', color:'#FFFFFF', letterSpacing:0.3 },
  noteText:      { color:'#9D8EC7', fontStyle:'italic' },
  dateTrigger: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#4A4160',
  },
  datePickerWrap: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#5B5270',
  },
  dateActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  dateActionBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dateActionBtnPrimary: {
    backgroundColor: '#A78BFA',
    borderColor: '#A78BFA',
  },
  dateActionText: {
    color: '#E7DDF8',
    fontWeight: '700',
  },
  dateActionTextPrimary: {
    color: '#FFFFFF',
  },

  saveBtn:  { width:'100%', alignItems:'center', justifyContent:'center', shadowColor:'#1F103D', shadowOpacity:0.24, shadowOffset:{width:0,height:8}, shadowRadius:16, elevation:6 },
  saveText: { color:'#fff', fontWeight:'800' },
});
