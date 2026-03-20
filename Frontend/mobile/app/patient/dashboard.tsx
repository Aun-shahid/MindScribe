import { useEffect, useState, useCallback, useRef } from 'react';
import {
  AppState,
  Platform,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
  Animated,
  Easing,
  Modal,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import TabLoaderCard from '../components/TabLoaderCard';
import PatientService, { DashboardData } from '../services/patient.service';

const screenHeight = Dimensions.get('window').height;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const CARD_GRADIENT_COLORS = ['rgba(255,179,107,0.11)', 'rgba(167,139,250,0.08)', 'rgba(52,41,73,0.72)'] as const;
const CARD_BG = '#3F3752';
const CARD_BORDER = 'rgba(255,255,255,0.16)';

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊', sad: '😢', angry: '😠', anxious: '😰',
  peaceful: '😌', excited: '🤩', grateful: '🙏',
  overwhelmed: '😵', hopeful: '🌟', stressed: '😫',
};

export default function Dashboard() {
  const { user, profileLoading, fetchProfile } = useAuthContext();
  const { themeStyle } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const today = new Date();
  const todayLabel = `${today.toLocaleDateString('en-US', { weekday: 'short' })}, ${today.toLocaleDateString('en-US', { day: '2-digit' })} ${today.toLocaleDateString('en-US', { month: 'short' })} ${today.getFullYear()}`;

  const pageInset              = clamp(width * 0.04, 11, 16);
  const lowerCardInset         = clamp(pageInset + 2, 13, 18);
  const dashboardCardSideInset = clamp(lowerCardInset + 6, 19, 24);
  const cardRowContainerInset  = Math.max(0, dashboardCardSideInset - 6);

  // FIX: insets.top already includes the status bar on both iOS and Android.
  // Old code added StatusBar.currentHeight to wrapper AND insets.top to the header = doubled on Android.
  // Now: wrapper has NO paddingTop; header uses insets.top only.
  const headerTopPadding       = insets.top + clamp(height * 0.005, 2, 5);

  const dateFontSize           = clamp(width * 0.034, 12, 14);
  const dateIconSize           = clamp(width * 0.038, 14, 16);
  const notifCircleSize        = clamp(width * 0.12, 44, 50);
  const notifIconSize          = clamp(width * 0.043, 16, 18);
  const notifBadgeMinW         = clamp(width * 0.045, 16, 18);
  const notifBadgeH            = clamp(width * 0.045, 16, 18);
  const titleFontSize          = clamp(width * 0.074, 25, 31);
  const titleLineHeight        = Math.round(titleFontSize * 1.12);
  const statIconSize           = clamp(width * 0.051, 18, 20);
  const statBubbleSize         = clamp(width * 0.09, 32, 36);
  const statLabelSize          = clamp(width * 0.03, 11, 12);
  const statNumberSize         = clamp(width * 0.041, 15, 18);
  const graphCardInset         = dashboardCardSideInset;
  const graphCardPadding       = clamp(width * 0.045, 16, 18);
  const graphTitleSize         = clamp(width * 0.041, 15, 17);
  const graphSubtitleSize      = clamp(width * 0.03, 11, 12);
  const graphIconBubbleSize    = clamp(width * 0.09, 32, 36);
  const graphIconSize          = clamp(width * 0.046, 17, 19);
  const quickSectionInset      = cardRowContainerInset;
  const quickHeaderInset       = clamp(quickSectionInset + 6, 18, 24);
  const quickTitleSize         = clamp(width * 0.041, 15, 17);
  const quickActionCardHeight  = clamp(height * 0.14, 94, 112);
  const quickActionIconSize    = clamp(width * 0.09, 32, 36);
  const quickActionGlyphSize   = clamp(width * 0.056, 20, 22);
  const quickActionTextSize    = clamp(width * 0.032, 12, 13);

  const bubbleLarge  = clamp(width * 0.74, 220, 320);
  const bubbleMedium = clamp(width * 0.56, 170, 260);
  const bubbleSmall  = clamp(width * 0.34, 110, 160);

  const [dashboardData, setDashboardData]         = useState<DashboardData | null>(null);
  const [loading, setLoading]                     = useState<boolean>(true);
  const [refreshing, setRefreshing]               = useState<boolean>(false);
  const [error, setError]                         = useState<string | null>(null);
  const [unreadCount, setUnreadCount]             = useState<number>(0);
  const [groupedSessions, setGroupedSessions]     = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading]     = useState<boolean>(false);
  const [sessionsModalVisible, setSessionsModalVisible] = useState<boolean>(false);
  const [selectedSession, setSelectedSession]     = useState<any>(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState<boolean>(false);
  const [connectModalVisible, setConnectModalVisible]   = useState<boolean>(false);
  const [therapistPin, setTherapistPin]           = useState<string>('');
  const [connectMessage, setConnectMessage]       = useState<string>('');
  const [sessionsCount, setSessionsCount]         = useState<number | null>(null);
  const [weeklyTrendFallback]                     = useState<any[] | null>(null);
  const [weeklyTrendData]                         = useState<any[] | null>(null);
  const [tooltipIndex, setTooltipIndex]           = useState<number | null>(null);
  const [tooltipVisible, setTooltipVisible]       = useState(false);

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
  const bubbleAnimationsRef = useRef<Animated.CompositeAnimation[]>([]);

  // Chart line-draw animation: drives an Animated width from 0 → chartWidth over 3 s
  const chartRevealAnim = useRef(new Animated.Value(0)).current;

  const stopBubbleAnimations = useCallback(() => {
    bubbleAnimationsRef.current.forEach((a) => a.stop());
    bubbleAnimationsRef.current = [];
  }, []);

  const startBubbleAnimations = useCallback(() => {
    stopBubbleAnimations();
    [bubble1Y,bubble1X,bubble2Y,bubble2X,bubble3Y,bubble3X,bubble4Y,bubble4X,bubble5Y,bubble5X]
      .forEach((v) => v.setValue(0));
    const fly = (yV: Animated.Value, xV: Animated.Value, dY: number, dX: number, delY = 0, delX = 0) =>
      Animated.loop(Animated.parallel([
        Animated.sequence([Animated.delay(delY), Animated.timing(yV,{toValue:50,duration:dY,useNativeDriver:true}), Animated.timing(yV,{toValue:-50,duration:dY,useNativeDriver:true})]),
        Animated.sequence([Animated.delay(delX), Animated.timing(xV,{toValue:30,duration:dX,useNativeDriver:true}), Animated.timing(xV,{toValue:-30,duration:dX,useNativeDriver:true})]),
      ]));
    const anims = [
      fly(bubble1Y,bubble1X,8000,7000,0,500),
      fly(bubble2Y,bubble2X,9000,8500,1000,1500),
      fly(bubble3Y,bubble3X,10000,9000,500,0),
      fly(bubble4Y,bubble4X,8500,10000,1500,1000),
      fly(bubble5Y,bubble5X,9500,8000,0,2000),
    ];
    bubbleAnimationsRef.current = anims;
    anims.forEach((a) => a.start());
  }, [bubble1X,bubble1Y,bubble2X,bubble2Y,bubble3X,bubble3Y,bubble4X,bubble4Y,bubble5X,bubble5Y,stopBubbleAnimations]);

  useFocusEffect(useCallback(() => {
    startBubbleAnimations();
    return () => stopBubbleAnimations();
  }, [startBubbleAnimations, stopBubbleAnimations]));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') startBubbleAnimations(); else stopBubbleAnimations();
    });
    return () => { sub.remove(); stopBubbleAnimations(); };
  }, [startBubbleAnimations, stopBubbleAnimations]);

  // Trigger chart draw animation whenever mood trend data arrives
  useEffect(() => {
    const weekly = dashboardData?.mood_trend ?? (dashboardData as any)?.weekly_moods ?? weeklyTrendData ?? [];
    if (Array.isArray(weekly) && weekly.length > 0) {
      chartRevealAnim.setValue(0);
      Animated.timing(chartRevealAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false, // drives layout width - cannot use native driver
      }).start();
    }
  }, [dashboardData, chartRevealAnim, weeklyTrendData]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await PatientService.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (e) { console.warn('[Dashboard] unread count error', e); }
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null); setLoading(true);
      const data = await PatientService.getDashboardData();
      setDashboardData(data);
      try {
        const sessData: any = await PatientService.getMySessions('upcoming', 1, 0);
        const total = typeof sessData === 'object' ? sessData.total_count ?? (Array.isArray(sessData.sessions) ? sessData.sessions.length : null) : null;
        setSessionsCount(total ?? null);
      } catch (e) { setSessionsCount(null); }
      await loadUnreadCount();
    } catch (err: any) {
      const respData = err?.response?.data;
      let msg = 'Failed to load dashboard data';
      if (typeof respData === 'string' && respData.trim().startsWith('<')) msg = 'Server error (500) — backend returned HTML.';
      else msg = respData?.detail || respData?.error || respData?.message || err?.message || msg;
      setError(String(msg));
    } finally { setLoading(false); setRefreshing(false); }
  }, [loadUnreadCount]);

  useEffect(() => { fetchProfile(); loadDashboardData(); }, [fetchProfile, loadDashboardData]);
  useFocusEffect(useCallback(() => { loadUnreadCount(); }, [loadUnreadCount]));
  const onRefresh = () => { setRefreshing(true); loadDashboardData(); };

  if (profileLoading || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#342949' }]}>
        <TabLoaderCard title="Loading Dashboard" subtitle="Preparing your insights and sessions..." spinnerColor="#A78BFA" fullScreen />
      </View>
    );
  }
  if (!user) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themeStyle.background }]}>
        <Text style={[styles.errorText, { color: themeStyle.error }]}>⚠️ Failed to load profile. Try logging in again.</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: themeStyle.logoutButton }]} onPress={() => router.push('../auth/login')}>
          <Text style={[styles.btnlabel, { color: themeStyle.logoutText }]}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCardPress = (screen: string) => { try { router.push(screen as any); } catch { router.push('./profile'); } };
  const closeConnectModal  = () => setConnectModalVisible(false);
  const closeSessionsModal = () => { setSessionsModalVisible(false); setSelectedSession(null); };

  const handleConnect = async () => {
    if (!therapistPin || therapistPin.trim().length === 0) { Alert.alert('Enter PIN', 'Please enter the therapist PIN'); return; }
    try {
      await PatientService.connectTherapist(therapistPin.trim(), connectMessage.trim());
      Alert.alert('Request Sent', 'Connection request created. Your therapist must approve it.');
      closeConnectModal(); loadDashboardData();
    } catch (err: any) {
      const respData = err?.response?.data;
      if (respData?.detail === 'You are already connected to this therapist.') {
        await fetchProfile(); await loadDashboardData(); closeConnectModal();
        Alert.alert('Connected', 'You are already connected to this therapist.'); return;
      }
      Alert.alert('Error', String(respData || err?.message || 'Failed to send connection request'));
    }
  };

  const loadSessions = async (filter: 'upcoming' | 'past' = 'upcoming') => {
    try {
      setSessionsLoading(true);
      const data = await PatientService.getMySessions(filter, 50, 0);
      const sessions = Array.isArray(data) ? data : (data?.sessions || []);
      const flatSessions: any[] = Array.isArray(sessions) ? sessions : [...(sessions.upcoming||[]), ...(sessions.past||[])];
      const groups: Record<string,any[]> = {};
      flatSessions.forEach((s:any) => { const k = s.therapist?.id ? String(s.therapist.id) : 'no'; if(!groups[k]) groups[k]=[]; groups[k].push(s); });
      setGroupedSessions(Object.keys(groups).map((k) => ({ therapist: groups[k][0]?.therapist||null, sessions: groups[k] })));
    } catch { setGroupedSessions([]); } finally { setSessionsLoading(false); }
  };

  const viewSessionDetail = async (sessionId: string) => {
    try { setSessionDetailLoading(true); const res = await PatientService.getSession(sessionId); setSelectedSession(res?.session||res); }
    catch { Alert.alert('Error','Failed to load session details'); } finally { setSessionDetailLoading(false); }
  };

  const formatMoodLabel = (raw: string|undefined|null) => {
    if (!raw) return '—';
    try {
      const stripped = raw.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[^\w\s\-])/gu,'').trim();
      if (!stripped) return '—';
      const first = stripped.split('\n')[0].split(' ')[0];
      return first.length > 12 ? first.substring(0,11)+'…' : first;
    } catch { return raw; }
  };

  const formatMoodName = (raw: string|undefined|null) => {
    if (!raw) return 'Mood';
    try {
      const stripped = raw.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[^\w\s\-])/gu,'').trim();
      if (!stripped) return 'Mood';
      return stripped.split(' ').filter(Boolean).map((w)=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
    } catch { return String(raw); }
  };

  return (
    <View style={styles.wrapper}>
      <LinearGradient colors={['#342949','#2A1F3D','#342949']} start={[0,0]} end={[0,1]}
        style={[styles.screenGradient,{height:screenHeight}]} pointerEvents="none" />

      <View style={styles.floatingBubbles} pointerEvents="none">
        <Animated.View style={[styles.bubble,{width:bubbleMedium,height:bubbleMedium,top:'10%',left:'-10%',backgroundColor:'rgba(167,139,250,0.15)',transform:[{translateY:bubble1Y},{translateX:bubble1X}]}]}/>
        <Animated.View style={[styles.bubble,{width:bubbleLarge,height:bubbleLarge,top:'25%',right:'-15%',backgroundColor:'rgba(184,168,230,0.18)',transform:[{translateY:bubble2Y},{translateX:bubble2X}]}]}/>
        <Animated.View style={[styles.bubble,{width:bubbleMedium,height:bubbleMedium,top:'50%',left:'10%',backgroundColor:'rgba(167,139,250,0.13)',transform:[{translateY:bubble3Y},{translateX:bubble3X}]}]}/>
        <Animated.View style={[styles.bubble,{width:bubbleLarge*0.78,height:bubbleLarge*0.78,bottom:'15%',right:'5%',backgroundColor:'rgba(184,168,230,0.22)',transform:[{translateY:bubble4Y},{translateX:bubble4X}]}]}/>
        <Animated.View style={[styles.bubble,{width:bubbleSmall,height:bubbleSmall,bottom:'30%',left:'-5%',backgroundColor:'rgba(167,139,250,0.19)',transform:[{translateY:bubble5Y},{translateX:bubble5X}]}]}/>
      </View>

      <FlatList
        data={[]}
        style={[styles.contentAboveGradient,{backgroundColor:'transparent'}]}
        contentContainerStyle={{backgroundColor:'transparent'}}
        ListHeaderComponent={() => (
          <>
            {/* HEADER */}
            <View style={[styles.header,{paddingTop:headerTopPadding}]}>
              <View style={[styles.headerMetaRow,{marginHorizontal:dashboardCardSideInset}]}>
                <View style={[styles.dateBadge,{gap:clamp(width*0.02,6,8)}]}>
                  <MaterialIcons name="calendar-today" size={dateIconSize} color="rgba(255,255,255,0.72)"/>
                  <Text style={[styles.dateBadgeText,{fontSize:dateFontSize}]}>{todayLabel}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.notificationCircle,{width:notifCircleSize,height:notifCircleSize,borderRadius:notifCircleSize/2}]}
                  onPress={() => router.push('./notifications' as any)}>
                  <View style={{position:'relative'}}>
                    <FontAwesome name="bell" size={notifIconSize} color="#FFFFFF"/>
                    {unreadCount > 0 && (
                      <View style={[styles.notificationBadge,{minWidth:notifBadgeMinW,height:notifBadgeH,borderRadius:notifBadgeH/2}]}>
                        <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              <View style={[styles.headerIdentityRow,{marginTop:clamp(height*0.012,10,14)}]}>
                <Text style={[styles.headerTitleLarge,{fontSize:titleFontSize,lineHeight:titleLineHeight}]} numberOfLines={2}>
                  <Text style={styles.headerTitleWhite}>Hi, </Text>
                  <Text style={styles.headerTitlePurple}>{user.first_name}!</Text>
                </Text>
              </View>

              <View style={[styles.headerStatsRowNew,{marginTop:clamp(height*0.02,18,24),marginHorizontal:cardRowContainerInset}]}>
                {[
                  {label:'Sessions',value:String(sessionsCount??(dashboardData?.upcoming_sessions?.length??0)),iconBg:'#FFE8EC',iconColor:'#FF6B86',icon:'monitor-heart' as const},
                  {label:'Mood',value:formatMoodLabel(dashboardData?.mood_today?.mood_display||dashboardData?.mood_today?.mood),iconBg:'#FFF1E3',iconColor:'#FFB36B',icon:'favorite' as const},
                  {label:'Goals',value:String(dashboardData?.active_goals_count??0),iconBg:'#E9FAF5',iconColor:'#6FD8BE',icon:'flag' as const},
                ].map((stat,i) => (
                  <View key={i} style={[styles.topStatCard,{minHeight:clamp(height*0.13,90,110)}]}>
                    <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill,{borderRadius:16}]} pointerEvents="none"/>
                    <View style={[styles.topStatIcon,{width:statBubbleSize,height:statBubbleSize,borderRadius:statBubbleSize/2,backgroundColor:stat.iconBg}]}>
                      <MaterialIcons name={stat.icon} size={statIconSize} color={stat.iconColor}/>
                    </View>
                    <Text style={[styles.topStatLabel, {fontSize:statLabelSize}]}>{stat.label}</Text>
                    <Text style={[styles.topStatNumber,{fontSize:statNumberSize}]}>{stat.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* DAILY INSPIRATION */}
            {dashboardData?.daily_inspiration && (
              <View style={[styles.glassCard,{marginHorizontal:dashboardCardSideInset,marginBottom:clamp(height*0.025,16,22),padding:clamp(width*0.05,16,20)}]}>
                <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill,{borderRadius:16}]} pointerEvents="none"/>
                <Text style={[styles.inspirationTitle,{fontSize:clamp(width*0.046,16,19)}]}>💡 Daily Inspiration</Text>
                <Text style={[styles.quote,{fontSize:clamp(width*0.038,14,16)}]}>{`"${dashboardData.daily_inspiration.quote}"`}</Text>
                <Text style={[styles.author,{fontSize:clamp(width*0.033,12,14)}]}>— {dashboardData.daily_inspiration.author}</Text>
                {dashboardData.daily_inspiration.reflection_prompt && (
                  <Text style={[styles.reflection,{fontSize:clamp(width*0.033,12,14)}]}>🤔 {dashboardData.daily_inspiration.reflection_prompt}</Text>
                )}
              </View>
            )}

            {/* WEEKLY MOOD CHART */}
            {(() => {
              const weekly: any[] = dashboardData?.mood_trend??(dashboardData as any)?.weekly_moods??weeklyTrendData??weeklyTrendFallback??[];
              const labels = Array.isArray(weekly)?weekly.map((d:any)=>{if(d.date){try{return new Date(d.date).toLocaleDateString(undefined,{weekday:'short'});}catch{return d.day||d.date||'';}}return d.day||'';}):[];
              const moods  = Array.isArray(weekly)?weekly.map((d:any)=>d.mood_label||d.mood||''):[];
              const values = Array.isArray(weekly)?weekly.map((d:any)=>Math.max(0,Math.round(d.intensity??d.avg_intensity??0))):[];
              const moodEmojis = moods.map((m:string)=>MOOD_EMOJIS[(m||'').toLowerCase()]||'😐');
              const hasTrend   = values.some((v:number)=>v>0);

              if (!weekly||weekly.length===0) {
                return (
                  <View style={[styles.glassCard,{marginHorizontal:graphCardInset,marginBottom:clamp(height*0.025,16,22),padding:graphCardPadding}]}>
                    <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill,{borderRadius:16}]} pointerEvents="none"/>
                    <Text style={[styles.graphTitle,{fontSize:graphTitleSize}]}>This Week's Mood</Text>
                    <View style={{height:80,alignItems:'center',justifyContent:'center'}}>
                      <Text style={{color:'#B8A8E6'}}>No mood data yet</Text>
                    </View>
                  </View>
                );
              }

              const chartWidth           = Math.min(width-(graphCardInset*2)-(graphCardPadding*2),604);
              const chartHorizontalInset = clamp(width*0.02,8,12);
              const plotWidth            = Math.max(220,chartWidth-(chartHorizontalInset*2));
              const chartLeftNudge       = clamp(width*0.01,3,6)*8;
              const chartData            = {labels:labels.length>0?labels:[''],datasets:[{data:values.length>0?values:[0]}]};
              const chartConfig = {
                backgroundGradientFrom:'transparent',backgroundGradientFromOpacity:0,
                backgroundGradientTo:'transparent',backgroundGradientToOpacity:0,
                decimalPlaces:0,color:()=>'url(#lineGradient)',labelColor:()=>'#B8A8E6',style:{borderRadius:12},
              };

              return (
                <View style={[styles.glassCard,{marginHorizontal:graphCardInset,marginBottom:clamp(height*0.025,16,22)}]}>
                  <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill,{borderRadius:16}]} pointerEvents="none"/>
                  <View style={{padding:graphCardPadding}}>
                    <View style={styles.graphHeaderRow}>
                      <View>
                        <Text style={[styles.graphTitle,{fontSize:graphTitleSize}]}>This Week's Mood</Text>
                        <Text style={[styles.graphSubtitle,{fontSize:graphSubtitleSize}]}>Your emotional journey</Text>
                      </View>
                      <TouchableOpacity onPress={() => router.push('./mood?tab=weekly' as any)}>
                        <LinearGradient colors={['#FF7A7A','#FFB36B']} style={[styles.graphIconBubble,{width:graphIconBubbleSize,height:graphIconBubbleSize,borderRadius:graphIconBubbleSize/2}]}>
                          <MaterialIcons name="trending-up" size={graphIconSize} color="#fff"/>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>

                    {typeof LineChart === 'function' && (
                      <View style={styles.graphChartWrapper} onTouchStart={() => setTooltipVisible(false)}>
                        <View style={{position:'relative',alignItems:'center'}}>
                          {/* LINE DRAW ANIMATION: clip the chart with an animated growing width */}
                          <View style={{width:chartWidth,overflow:'hidden'}}>
                            <Animated.View style={{
                              width: chartRevealAnim.interpolate({
                                inputRange:[0,1],
                                outputRange:[0, chartWidth + chartLeftNudge + chartHorizontalInset],
                              }),
                              overflow:'hidden',
                            }}>
                              <View style={{paddingHorizontal:chartHorizontalInset,borderRadius:12,overflow:'hidden'}}>
                                <LineChart
                                  data={chartData}
                                  width={plotWidth}
                                  height={190}
                                  fromZero bezier withDots
                                  chartConfig={{
                                    ...chartConfig,
                                    propsForDots:{r:'4.5',strokeWidth:'2',stroke:'#FF7A7A',fill:'#FFFFFF'},
                                    propsForBackgroundLines:{stroke:'rgba(255,255,255,0.08)'},
                                    decimalPlaces:0,
                                  }}
                                  style={{borderRadius:14,marginVertical:4,marginLeft:-chartLeftNudge}}
                                  withInnerLines withShadow={false} withVerticalLines={false} withHorizontalLabels={false}
                                  formatYLabel={() => ''}
                                  onDataPointClick={(data) => {
                                    if (!hasTrend||data.index>=values.length||data.index<0||!values[data.index]||values[data.index]<=0) { setTooltipVisible(false); return; }
                                    setTooltipIndex(data.index); setTooltipVisible(true);
                                  }}
                                  decorator={() => (
                                    <Defs>
                                      <SvgLinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                                        <Stop offset="0%" stopColor="#FF8A5B" stopOpacity="1"/>
                                        <Stop offset="100%" stopColor="#6FD8BE" stopOpacity="1"/>
                                      </SvgLinearGradient>
                                    </Defs>
                                  )}
                                />
                              </View>
                            </Animated.View>
                          </View>

                          {hasTrend && tooltipVisible && tooltipIndex!==null && tooltipIndex>=0 && tooltipIndex<values.length && values[tooltipIndex]>0 && (
                            <View style={[styles.tooltip,{
                              left:chartHorizontalInset-chartLeftNudge+((plotWidth/Math.max(1,(values.length-1)))*tooltipIndex)+((width-chartWidth)/2)-46,
                              top:6,
                            }]}>
                              <View style={styles.tooltipEmojiBubble}>
                                <Text style={styles.tooltipEmojiText}>{moodEmojis[tooltipIndex]||'😐'}</Text>
                              </View>
                              <Text style={styles.tooltipMoodText}>{formatMoodName(moods[tooltipIndex]||'')}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })()}

            {/* QUICK ACTIONS — 3 cards, single row */}
            <View style={[styles.quickActionsSection,{marginHorizontal:quickSectionInset,marginTop:clamp(height*0.016,12,16)}]}>
              <View style={[styles.quickActionsHeader,{marginHorizontal:quickHeaderInset-quickSectionInset}]}>
                <View style={{ flexDirection:'row', alignItems:'baseline', justifyContent:'space-between' }}>
                  <Text style={[styles.quickActionsTitle,{color:'#FFFFFF',fontSize:quickTitleSize}]}>Quick Actions</Text>
                  <TouchableOpacity onPress={() => router.push('./actions' as any)} activeOpacity={0.7}>
                    <Text style={{ color:'#9D8EC7', fontSize:clamp(width*0.028,10,11), fontWeight:'600' }}>More in Actions tab →</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ color:'#7A6E9A', fontSize:clamp(width*0.03,11,12), marginTop:3 }}>Shortcuts to your most-used features</Text>
              </View>
              <View style={styles.quickActionsGrid}>
                <View style={styles.quickActionsRow}>
                  {[
                    {route:'./connect-with-therapist?from=dashboard',iconBg:'#FFE7EF',icon:<FontAwesome  name="comment"   size={quickActionGlyphSize} color="#FF6B86"/>,label:'Connect with Therapist'},
                    {route:'./mood?from=dashboard',                  iconBg:'#FFF1E3',icon:<MaterialIcons name="local-cafe" size={quickActionGlyphSize} color="#FF9F6B"/>,label:'Take a Mood Break'},
                    {route:'./sessions?from=dashboard',              iconBg:'#EEE9FF',icon:<FontAwesome  name="calendar"  size={quickActionGlyphSize} color="#8B7BFF"/>,label:'View Sessions'},
                  ].map((item,i) => (
                    <TouchableOpacity key={i} style={[styles.quickActionCard,{minHeight:quickActionCardHeight}]} onPress={() => handleCardPress(item.route)} activeOpacity={0.8}>
                      <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill,{borderRadius:16}]} pointerEvents="none"/>
                      <View style={[styles.quickActionIconWrap,{width:quickActionIconSize,height:quickActionIconSize,borderRadius:quickActionIconSize/2,backgroundColor:item.iconBg}]}>
                        {item.icon}
                      </View>
                      <Text style={[styles.quickActionText,{fontSize:quickActionTextSize}]} numberOfLines={2}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {error && (
              <View style={[styles.errorBanner,{backgroundColor:'#fee',marginHorizontal:dashboardCardSideInset}]}>
                <Text style={[styles.errorText,{color:'#c00'}]}>⚠️ {error}</Text>
              </View>
            )}

            {/* RECENT JOURNALS */}
            {dashboardData?.recent_journal_entries && dashboardData.recent_journal_entries.length > 0 && (
              <View style={[styles.recentSection,{marginTop:clamp(height*0.032,22,30)}]}>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:clamp(height*0.016,10,14),marginHorizontal:dashboardCardSideInset}}>
                  <Text style={[styles.quickActionsTitle,{color:'#FFFFFF',fontSize:quickTitleSize}]}>Recent Journals</Text>
                  <TouchableOpacity onPress={() => router.push('./journal-list' as any)}>
                    <Text style={{color:'#B8A8E6',fontWeight:'600',fontSize:clamp(width*0.034,12,14)}}>View All</Text>
                  </TouchableOpacity>
                </View>
                {dashboardData.recent_journal_entries.slice(0,2).map((entry) => (
                  <TouchableOpacity key={entry.id} style={[styles.glassCard,{marginHorizontal:dashboardCardSideInset,marginBottom:clamp(height*0.018,12,16)}]}
                    onPress={() => router.push(`./journal-detail?id=${entry.id}` as any)} activeOpacity={0.8}>
                    <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill,{borderRadius:16}]} pointerEvents="none"/>
                    <View style={{padding:clamp(width*0.045,14,18),flexDirection:'row',alignItems:'center'}}>
                      <LinearGradient colors={["#FFB6B6","#FF9F6B"]} start={[0,0]} end={[1,1]} style={styles.journalIconCircle}>
                        <FontAwesome name="book" size={clamp(width*0.045,16,19)} color="#fff"/>
                      </LinearGradient>
                      <View style={{flex:1,marginLeft:clamp(width*0.03,10,13)}}>
                        <Text style={[styles.journalTitle,{fontSize:clamp(width*0.038,14,16)}]} numberOfLines={1}>{entry.title}</Text>
                        <View style={{flexDirection:'row',alignItems:'center',marginTop:4}}>
                          <FontAwesome name="calendar" size={clamp(width*0.028,10,12)} color="#B8A8E6"/>
                          <Text style={[styles.journalDate,{marginLeft:5,fontSize:clamp(width*0.03,11,13)}]}>
                            {new Date(entry.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
                          </Text>
                        </View>
                        <Text style={[styles.journalContent,{fontSize:clamp(width*0.033,12,14),marginTop:4}]} numberOfLines={1} ellipsizeMode="tail">{entry.content}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{height:clamp(height*0.04,28,40)}}/>
          </>
        )}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={null}
        ListEmptyComponent={null}
      />

      {/* MODALS — unchanged */}
      <Modal visible={connectModalVisible} animationType="slide" onRequestClose={closeConnectModal}>
        <SafeAreaView style={[styles.modalWrapper,{backgroundColor:themeStyle.background}]}>
          <ScrollView contentContainerStyle={styles.modalContainer}>
            <Text style={[styles.modalTitle,{color:themeStyle.title}]}>Connect with Your Therapist</Text>
            <Text style={[styles.modalHint,{color:themeStyle.label}]}>Scan the QR code provided by your therapist or enter the code manually.</Text>
            <View style={styles.cameraPlaceholder}><Text style={{color:themeStyle.label}}>Enter the code manually below</Text></View>
            <View style={styles.orDivider}><Text style={{color:themeStyle.label}}>OR ENTER MANUALLY</Text></View>
            <Text style={[styles.inputLabel,{color:themeStyle.label}]}>Therapist Code</Text>
            <TextInput value={therapistPin} onChangeText={setTherapistPin} placeholder="Enter the code from your therapist" placeholderTextColor={themeStyle.label} style={[styles.textInput,{borderColor:'#6b6b80',color:themeStyle.text}]}/>
            <Text style={[styles.inputLabel,{color:themeStyle.label}]}>Message (optional)</Text>
            <TextInput value={connectMessage} onChangeText={setConnectMessage} placeholder="Add a short message for your therapist" placeholderTextColor={themeStyle.label} style={[styles.textInput,{borderColor:'#6b6b80',color:themeStyle.text}]}/>
            <TouchableOpacity style={[styles.btn,{backgroundColor:'#7b61ff'}]} onPress={handleConnect}><Text style={styles.btnlabel}>Connect to Therapist</Text></TouchableOpacity>
            <TouchableOpacity style={{marginTop:12}} onPress={closeConnectModal}><Text style={{color:themeStyle.label}}>Skip for now</Text></TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={sessionsModalVisible} animationType="slide" onRequestClose={closeSessionsModal}>
        <SafeAreaView style={[styles.modalWrapper,{backgroundColor:themeStyle.background}]}>
          <View style={styles.modalContainer}>
            <Text style={[styles.modalTitle,{color:themeStyle.title}]}>Your Sessions</Text>
            <View style={{flexDirection:'row',marginBottom:12}}>
              <TouchableOpacity onPress={() => loadSessions('upcoming')} style={{marginRight:12}}><Text style={{color:themeStyle.text}}>Upcoming</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => loadSessions('past')}><Text style={{color:themeStyle.text}}>Past</Text></TouchableOpacity>
            </View>
            {sessionsLoading ? <TabLoaderCard spinnerColor={themeStyle.text} icon="brain"/> : (
              <ScrollView>
                {groupedSessions.length===0 && <Text style={{color:themeStyle.label,marginVertical:8}}>No sessions found.</Text>}
                {groupedSessions.map((group:any,gidx:number) => (
                  <View key={`group-${gidx}`} style={{marginBottom:16}}>
                    <View style={[styles.glassCard,{padding:12,marginBottom:8}]}>
                      <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill,{borderRadius:16}]} pointerEvents="none"/>
                      <Text style={[styles.cardTitle,{color:'#FFFFFF'}]}>{group.therapist?group.therapist.full_name:'Other Sessions'}</Text>
                      {group.therapist?.specialization && <Text style={{color:'#B8A8E6',fontSize:13}}>{group.therapist.specialization}</Text>}
                    </View>
                    {group.sessions.map((item:any) => (
                      <View key={item.id} style={[styles.glassCard,{padding:14,marginBottom:8}]}>
                        <LinearGradient colors={CARD_GRADIENT_COLORS} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill,{borderRadius:16}]} pointerEvents="none"/>
                        <Text style={[styles.cardTitle,{color:'#FFFFFF'}]}>{item.session_number?`Session #${item.session_number}`:'Session'}</Text>
                        <Text style={{color:'#B8A8E6',fontSize:13}}>{new Date(item.scheduled_date).toLocaleString()}</Text>
                        <Text style={{color:'#B8A8E6',fontSize:13}}>{item.status}</Text>
                        <View style={{flexDirection:'row',justifyContent:'flex-end',marginTop:10}}>
                          <TouchableOpacity style={{backgroundColor:'#6b6b80',paddingVertical:8,paddingHorizontal:12,borderRadius:8}} onPress={() => viewSessionDetail(item.id)}>
                            <Text style={{color:'#fff',fontWeight:'600'}}>See details</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.btn,{backgroundColor:'#6b6b80'}]} onPress={closeSessionsModal}><Text style={styles.btnlabel}>Close</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={!!selectedSession} animationType="slide" onRequestClose={() => setSelectedSession(null)}>
        <SafeAreaView style={[styles.modalWrapper,{backgroundColor:themeStyle.background}]}>
          <ScrollView contentContainerStyle={styles.modalContainer}>
            <Text style={[styles.modalTitle,{color:themeStyle.title}]}>Session Details</Text>
            {sessionDetailLoading?<TabLoaderCard spinnerColor={themeStyle.text} icon="brain"/>:selectedSession?(
              <View>
                <Text style={{color:themeStyle.label,marginBottom:8}}>Date:</Text>
                <Text style={{color:themeStyle.text,marginBottom:12}}>{new Date(selectedSession.scheduled_date).toLocaleString()}</Text>
                <Text style={{color:themeStyle.label,marginBottom:8}}>Summary:</Text>
                <Text style={{color:themeStyle.text,marginBottom:12}}>{selectedSession.session_summary||'No summary available.'}</Text>
                <Text style={{color:themeStyle.label,marginBottom:8}}>Goals:</Text>
                <Text style={{color:themeStyle.text,marginBottom:12}}>{selectedSession.patient_goals||'N/A'}</Text>
                <Text style={{color:themeStyle.label,marginBottom:8}}>Homework:</Text>
                <Text style={{color:themeStyle.text,marginBottom:12}}>{selectedSession.homework_assigned||'N/A'}</Text>
                <Text style={{color:themeStyle.label,marginBottom:8}}>Next Session Goals:</Text>
                <Text style={{color:themeStyle.text,marginBottom:12}}>{selectedSession.next_session_goals||'N/A'}</Text>
                <TouchableOpacity style={[styles.btn,{backgroundColor:'#6b6b80'}]} onPress={() => setSelectedSession(null)}><Text style={styles.btnlabel}>Close</Text></TouchableOpacity>
              </View>
            ):null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // FIX: No paddingTop — safe-area is handled via insets.top inside the header
  wrapper:              { flex: 1, backgroundColor: '#342949' },
  screenGradient:       { position: 'absolute', top: 0, left: 0, right: 0, width: '100%', zIndex: 0 },
  floatingBubbles:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' },
  bubble:               { position: 'absolute', borderRadius: 9999 },
  contentAboveGradient: { zIndex: 1 },
  header:               { marginBottom: 12, paddingBottom: 18, backgroundColor: 'transparent' },
  headerMetaRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBadge:            { flexDirection: 'row', alignItems: 'center', flexShrink: 1, paddingVertical: 4 },
  dateBadgeText:        { color: 'rgba(255,255,255,0.72)', fontWeight: '600' },
  notificationCircle:   { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 12 },
  notificationBadge:    { position: 'absolute', right: -8, top: -8, backgroundColor: '#F39C43', paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  notificationBadgeText:{ color: '#fff', fontSize: 10, fontWeight: '700' },
  headerIdentityRow:    { alignItems: 'center' },
  headerTitleLarge:     { fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  headerTitleWhite:     { color: '#FFFFFF' },
  headerTitlePurple:    { color: '#B8A8E6' },
  headerStatsRowNew:    { flexDirection: 'row', justifyContent: 'space-between' },
  glassCard: {
    borderRadius: 16, overflow: 'hidden', backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: CARD_BORDER,
    shadowColor: '#120A24', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 6,
  },
  topStatCard: {
    flex: 1, marginHorizontal: 6, paddingVertical: 16, paddingHorizontal: 12,
    borderRadius: 16, alignItems: 'flex-start', justifyContent: 'center', overflow: 'hidden',
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER,
    shadowColor: '#120A24', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 6,
  },
  topStatIcon:          { alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  topStatNumber:        { fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  topStatLabel:         { color: '#B8A8E6' },
  inspirationTitle:     { fontWeight: '700', marginBottom: 12, color: '#FFFFFF' },
  quote:                { fontStyle: 'italic', marginBottom: 8, lineHeight: 22, color: '#E5DCF9' },
  author:               { textAlign: 'right', marginBottom: 10, color: '#B8A8E6' },
  reflection:           { lineHeight: 20, color: '#CEC2EE' },
  graphHeaderRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  graphTitle:           { fontWeight: '700', color: '#FFFFFF' },
  graphSubtitle:        { color: '#9D8EC7', marginTop: 2 },
  graphIconBubble:      { alignItems: 'center', justifyContent: 'center' },
  graphChartWrapper:    { alignItems: 'center' },
  quickActionsSection:  { marginBottom: 6, backgroundColor: 'transparent' },
  quickActionsHeader:   { marginBottom: 10 },
  quickActionsTitle:    { fontWeight: '700' },
  quickActionsGrid:     { flexDirection: 'column' },
  quickActionsRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  quickActionCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 18, marginHorizontal: 6,
    borderRadius: 16, paddingHorizontal: 8, overflow: 'hidden', backgroundColor: CARD_BG,
    borderWidth: 1, borderColor: CARD_BORDER,
    shadowColor: '#120A24', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 6,
  },
  quickActionIconWrap:  { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickActionText:      { color: '#FFFFFF', fontWeight: '600', textAlign: 'center', lineHeight: 16, maxWidth: 100 },
  recentSection:        { marginBottom: 8 },
  journalIconCircle:    { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  journalTitle:         { fontWeight: '700', color: '#FFFFFF', flex: 1 },
  journalDate:          { color: '#B8A8E6' },
  journalContent:       { lineHeight: 18, color: '#CEC2EE' },
  tooltip:              { position: 'absolute', backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, alignItems: 'center', minWidth: 92, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4 },
  tooltipEmojiBubble:   { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFE8EC', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tooltipEmojiText:     { fontSize: 16 },
  tooltipMoodText:      { fontSize: 12, fontWeight: '700', color: '#4B4A78' },
  errorBanner:          { padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText:            { fontSize: 16, textAlign: 'center' },
  errorContainer:       { flex: 1, justifyContent: 'center', padding: 24 },
  loadingContainer:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btn:                  { width: 200, borderRadius: 50, paddingVertical: 12, alignItems: 'center', marginTop: 30 },
  btnlabel:             { color: 'white', fontSize: 22, fontWeight: '600' },
  modalWrapper:         { flex: 1 },
  modalContainer:       { padding: 20 },
  modalTitle:           { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  modalHint:            { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  cameraPlaceholder:    { height: 180, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#777', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  orDivider:            { marginTop: 12, marginBottom: 12, alignItems: 'center' },
  inputLabel:           { fontSize: 14, marginTop: 8, marginBottom: 6 },
  textInput:            { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 },
  cardTitle:            { fontSize: 16, fontWeight: '600', marginBottom: 4 },
});
