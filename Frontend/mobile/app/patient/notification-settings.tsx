import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Switch, ActivityIndicator,
  TouchableOpacity, Alert, Platform, Animated,
  Modal, useWindowDimensions, StatusBar,
} from 'react-native';
import PatientService from '../services/patient.service';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';

const PUSH_TOKEN_STORAGE_KEY = 'mindscribe_push_token';
const PUSH_ENABLED_STORAGE_KEY = 'mindscribe_push_enabled';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true,
    shouldPlaySound: true, shouldSetBadge: false,
  }),
});

// ─── Constants ────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)', 'rgba(167,139,250,0.08)', 'rgba(52,41,73,0.72)',
];
const CARD_BG     = '#3F3752';
const CARD_BORDER = 'rgba(255,255,255,0.16)';

// ─── Time parser ──────────────────────────────────────────────────────────────
function parseTimeValue(value: string | null | undefined, fh: number, fm: number): Date {
  const d = new Date();
  if (typeof value !== 'string' || !value.trim()) { d.setHours(fh, fm, 0, 0); return d; }
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) { d.setHours(fh, fm, 0, 0); return d; }
  const h = Number(m[1]), mn = Number(m[2]);
  if (isNaN(h) || isNaN(mn) || h > 23 || mn > 59) { d.setHours(fh, fm, 0, 0); return d; }
  d.setHours(h, mn, 0, 0); return d;
}

// ─── Build payload ────────────────────────────────────────────────────────────
// Only fields that exist in the backend NotificationPreference model.
// - goal_reminder_time: does NOT exist — goals fire based on PatientGoal.target_date proximity
// - therapist_messages_enabled: removed — disabled in backend
function buildPayload(prefs: any) {
  return {
    session_reminders_enabled:  !!prefs?.session_reminders_enabled,
    session_reminder_time:       prefs?.session_reminder_time ?? 24,
    session_summary_enabled:    !!prefs?.session_summary_enabled,
    session_approved_enabled:   !!prefs?.session_approved_enabled,
    session_cancelled_enabled:  !!prefs?.session_cancelled_enabled,
    goal_reminders_enabled:     !!prefs?.goal_reminders_enabled,
    mood_reminder_enabled:      !!prefs?.mood_reminder_enabled,
    mood_reminder_time:          prefs?.mood_reminder_time,
    journal_reminder_enabled:   !!prefs?.journal_reminder_enabled,
    journal_reminder_time:       prefs?.journal_reminder_time,
  };
}

// ─── Push helpers ─────────────────────────────────────────────────────────────
function getDevicePlatform(): 'ios' | 'android' | 'unknown' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'unknown';
}

// ─── Local device reminder helpers (mood + journal only) ─────────────────────
// Goal reminders are entirely server-driven (fires when goal.target_date within 3 days).
// Session reminders are entirely server-driven (fires based on session.scheduled_date).
// Only mood and journal are also scheduled locally for offline/fallback support.
async function ensurePermissions(): Promise<boolean> {
  const c = await Notifications.getPermissionsAsync();
  if (c.granted || c.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  const r = await Notifications.requestPermissionsAsync();
  return r.granted || r.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function cancelReminder(t: 'mood_reminder' | 'journal_reminder') {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all.filter(i => (i.content.data as any)?.reminderType === t)
      .map(i => Notifications.cancelScheduledNotificationAsync(i.identifier))
  );
}

async function scheduleReminder(
  type: 'mood_reminder' | 'journal_reminder',
  enabled: boolean, hour: number, minute: number, title: string, body: string,
) {
  await cancelReminder(type);
  if (!enabled) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders', importance: Notifications.AndroidImportance.HIGH,
      sound: 'default', vibrationPattern: [0, 250, 200, 250],
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true, data: { reminderType: type } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour, minute,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    },
  });
}

async function syncReminders(prefs: any): Promise<{ ok: boolean }> {
  const hasPerm = await ensurePermissions();
  console.log('[Reminders] permissions granted:', hasPerm);
  if (!hasPerm) return { ok: false };

  // Explicit coercion — handles backend returning 1/0/"true"/"false"/null
  const moodOn    = prefs?.mood_reminder_enabled    === true || prefs?.mood_reminder_enabled    === 1 || prefs?.mood_reminder_enabled    === 'true';
  const journalOn = prefs?.journal_reminder_enabled === true || prefs?.journal_reminder_enabled === 1 || prefs?.journal_reminder_enabled === 'true';

  const md = parseTimeValue(prefs?.mood_reminder_time,    20, 0);
  const jd = parseTimeValue(prefs?.journal_reminder_time, 21, 0);

  console.log('[Reminders] mood:', moodOn, `${md.getHours()}:${String(md.getMinutes()).padStart(2,'0')}`);
  console.log('[Reminders] journal:', journalOn, `${jd.getHours()}:${String(jd.getMinutes()).padStart(2,'0')}`);

  await scheduleReminder('mood_reminder',    moodOn,    md.getHours(), md.getMinutes(),
    'Mood Check-in Reminder', 'How are you feeling? Take a moment to log your mood.');
  await scheduleReminder('journal_reminder', journalOn, jd.getHours(), jd.getMinutes(),
    'Journal Reminder', 'Take a few minutes to write your journal entry for today.');

  return { ok: true };
}

// ─── Session Hours Modal ──────────────────────────────────────────────────────
const HOUR_OPTIONS = [
  { value: 1,  label: '1 hour',  icon: 'clock-fast',        desc: 'Last minute' },
  { value: 2,  label: '2 hours', icon: 'clock-outline',     desc: 'Short notice' },
  { value: 6,  label: '6 hours', icon: 'clock-time-six',    desc: 'Same day' },
  { value: 12, label: '12 hrs',  icon: 'clock-time-twelve', desc: 'Half day' },
  { value: 24, label: '1 day',   icon: 'calendar-today',    desc: 'Day before' },
  { value: 48, label: '2 days',  icon: 'calendar-clock',    desc: 'Two days' },
];

function SessionModal({ visible, current, onSelect, onClose, width }: {
  visible: boolean; current: number; onSelect: (v: number) => void;
  onClose: () => void; width: number;
}) {
  const spinAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(HOUR_OPTIONS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 10000, useNativeDriver: true })).start();
    } else { spinAnim.setValue(0); }
  }, [visible, spinAnim]);

  const spin  = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const cardW = clamp(width * 0.37, 120, 155);

  const handlePick = (val: number, i: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[i], { toValue: 0.88, duration: 90,  useNativeDriver: true }),
      Animated.timing(scaleAnims[i], { toValue: 1,    duration: 160, useNativeDriver: true }),
    ]).start(() => { onSelect(val); onClose(); });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={ms.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[ms.sheet, { width: clamp(width * 0.88, 300, 380) }]}>
          <LinearGradient colors={['#2A1F3D', '#1E1630', '#2A1F3D']} style={StyleSheet.absoluteFill} />
          <View style={ms.clockWrap}>
            <Animated.View style={[ms.spinRing, { transform: [{ rotate: spin }] }]}>
              <LinearGradient colors={['#A78BFA', '#FFB36B', '#A78BFA']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ms.spinGradient} />
            </Animated.View>
            <View style={ms.clockInner}>
              <MaterialCommunityIcons name="clock-outline" size={26} color="#A78BFA" />
            </View>
          </View>
          <Text style={ms.title}>Remind Me Before</Text>
          <Text style={ms.subtitle}>How early should we notify you?</Text>
          <View style={ms.grid}>
            {HOUR_OPTIONS.map((opt, i) => {
              const active = current === opt.value;
              return (
                <Animated.View key={opt.value} style={{ transform: [{ scale: scaleAnims[i] }] }}>
                  <TouchableOpacity
                    style={[ms.optCard, { width: cardW }, active && ms.optCardActive]}
                    onPress={() => handlePick(opt.value, i)} activeOpacity={0.8}
                  >
                    {active && (
                      <LinearGradient colors={['rgba(167,139,250,0.28)', 'rgba(255,179,107,0.16)']}
                        style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                    )}
                    <MaterialCommunityIcons name={opt.icon as any} size={22}
                      color={active ? '#A78BFA' : '#6B6482'} style={{ marginBottom: 5 }} />
                    <Text style={[ms.optLabel, active && ms.optLabelActive]}>{opt.label}</Text>
                    <Text style={ms.optDesc}>{opt.desc}</Text>
                    {active && (
                      <View style={ms.checkBadge}>
                        <FontAwesome name="check" size={8} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
          <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
            <Text style={ms.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(10,6,20,0.84)', justifyContent: 'center', alignItems: 'center' },
  sheet:         { borderRadius: 24, overflow: 'hidden', padding: 22, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  clockWrap:     { alignSelf: 'center', width: 64, height: 64, marginBottom: 14, alignItems: 'center', justifyContent: 'center' },
  spinRing:      { position: 'absolute', width: 64, height: 64, borderRadius: 32 },
  spinGradient:  { width: 64, height: 64, borderRadius: 32 },
  clockInner:    { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1E1630', alignItems: 'center', justifyContent: 'center' },
  title:         { color: '#FFFFFF', fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 3 },
  subtitle:      { color: '#7B6FA0', fontSize: 12, textAlign: 'center', marginBottom: 18 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'center' },
  optCard:       { borderRadius: 14, padding: 13, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 2 },
  optCardActive: { borderColor: '#A78BFA' },
  optLabel:      { color: '#CEC2EE', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  optLabelActive:{ color: '#FFFFFF' },
  optDesc:       { color: '#6B6482', fontSize: 10, marginTop: 2, textAlign: 'center' },
  checkBadge:    { position: 'absolute', top: 7, right: 7, width: 15, height: 15, borderRadius: 8, backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center' },
  cancelBtn:     { marginTop: 18, alignSelf: 'center', paddingVertical: 9, paddingHorizontal: 30, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)' },
  cancelText:    { color: '#9D8EC7', fontWeight: '700', fontSize: 13 },
});

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({ label, hint, value, onChange, accent = '#A78BFA', isLast = false }: {
  label: string; hint?: string; value: boolean;
  onChange: (v: boolean) => void; accent?: string; isLast?: boolean;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const handle = (v: boolean) => {
    Animated.sequence([
      Animated.timing(pulse, { toValue: 0.96, duration: 70,  useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 110, useNativeDriver: true }),
    ]).start();
    onChange(v);
  };
  return (
    <Animated.View style={[tr.row, isLast && { borderBottomWidth: 0 }, { transform: [{ scale: pulse }] }]}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={tr.label}>{label}</Text>
        {!!hint && <Text style={tr.hint}>{hint}</Text>}
      </View>
      <Switch value={value} onValueChange={handle}
        trackColor={{ false: '#3A3256', true: accent }}
        thumbColor={value ? '#FFFFFF' : '#6B6482'}
        ios_backgroundColor="#3A3256"
      />
    </Animated.View>
  );
}
const tr = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  label: { color: '#CEC2EE', fontSize: 14, fontWeight: '600' },
  hint:  { color: '#6B6482', fontSize: 11, marginTop: 3, lineHeight: 15 },
});

// ─── Glass Card ───────────────────────────────────────────────────────────────
function GlassCard({ children, accent = '#A78BFA' }: { children: React.ReactNode; accent?: string }) {
  return (
    <View style={[gc.card, { borderTopColor: accent }]}>
      <LinearGradient colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} pointerEvents="none" />
      {children}
    </View>
  );
}
const gc = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG, borderRadius: 16, marginBottom: 16,
    padding: 18, borderTopWidth: 3, overflow: 'hidden',
    borderWidth: 1, borderColor: CARD_BORDER,
    shadowColor: '#120A24', shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 7,
  },
});

// ─── Card Header ─────────────────────────────────────────────────────────────
function CardHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
      <View style={ch.iconBg}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ch.title}>{title}</Text>
        {!!subtitle && <Text style={ch.sub}>{subtitle}</Text>}
      </View>
    </View>
  );
}
const ch = StyleSheet.create({
  iconBg: { width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title:  { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  sub:    { color: '#7B6FA0', fontSize: 11, marginTop: 2 },
});

// ─── Time Row ─────────────────────────────────────────────────────────────────
function TimeRow({ label, time, accent, disabled, onPress }: {
  label: string; time: string; accent: string; disabled?: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[tmr.row, disabled && { opacity: 0.4 }]}
      onPress={disabled ? undefined : onPress} activeOpacity={0.7}
    >
      <Text style={tmr.label}>{label}</Text>
      <View style={[tmr.pill, { borderColor: `${accent}55` }]}>
        <FontAwesome name="clock-o" size={12} color={accent} style={{ marginRight: 5 }} />
        <Text style={[tmr.val, { color: accent }]}>{time}</Text>
        <FontAwesome name="chevron-right" size={9} color="#6B6482" style={{ marginLeft: 5 }} />
      </View>
    </TouchableOpacity>
  );
}
const tmr = StyleSheet.create({
  row:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, marginTop: 2 },
  label:{ color: '#CEC2EE', fontSize: 14, fontWeight: '600' },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  val:  { fontSize: 13, fontWeight: '800' },
});

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function NotificationSettings() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ── Responsive tokens ──────────────────────────────────────────────────────
  const pi         = clamp(width * 0.05,   16, 22);
  const hTop       = insets.top + clamp(height * 0.017, 14, 22);
  const hBtnSz     = clamp(width * 0.105,  36, 42);
  const hBtnR      = hBtnSz / 2;
  const hIconSz    = clamp(width * 0.05,   18, 20);
  const hTitleSz   = clamp(width * 0.074,  24, 30);
  const hMTop      = clamp(height * 0.024, 18, 24);
  const hBotPad    = clamp(height * 0.004,  2,  6);
  const hBotMargin = clamp(height * 0.018, 10, 16);
  const hEst       = hTop + hMTop + 4 + hTitleSz * 1.25 + hBotPad + hBotMargin + 8;
  const contTopPad = hEst + clamp(height * 0.018, 12, 18);
  const contBotPad = clamp(insets.bottom + height * 0.02, 24, 38);
  const subtitleSz = clamp(width * 0.034,  12, 14);
  const subtitleMB = clamp(height * 0.022, 14, 22);

  const bLarge  = clamp(width * 0.74, 220, 310);
  const bMedium = clamp(width * 0.52, 170, 230);
  const bSmall  = clamp(width * 0.32,  96, 132);

  // ── State ──────────────────────────────────────────────────────────────────
  const [prefs,             setPrefs]             = useState<any>(null);
  const [loading,           setLoading]           = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [showMoodPicker,    setShowMoodPicker]    = useState(false);
  const [showJournalPicker, setShowJournalPicker] = useState(false);
  const [showSessionModal,  setShowSessionModal]  = useState(false);
  const [pushEnabled,         setPushEnabled]         = useState(false);
  const [registeredPushToken, setRegisteredPushToken] = useState<string | null>(null);

  const scrollY   = useRef(new Animated.Value(0)).current;
  const saveScale = useRef(new Animated.Value(1)).current;

  const b1y = useRef(new Animated.Value(0)).current; const b1x = useRef(new Animated.Value(0)).current;
  const b2y = useRef(new Animated.Value(0)).current; const b2x = useRef(new Animated.Value(0)).current;
  const b3y = useRef(new Animated.Value(0)).current; const b3x = useRef(new Animated.Value(0)).current;
  const b4y = useRef(new Animated.Value(0)).current; const b4x = useRef(new Animated.Value(0)).current;
  const b5y = useRef(new Animated.Value(0)).current; const b5x = useRef(new Animated.Value(0)).current;

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const data = await PatientService.getNotificationPreferences();
      setPrefs(data);
    } catch {
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── EAS push token registration ───────────────────────────────────────────
  const registerForPush = useCallback(async (
    options: { silent?: boolean; requestPermissions?: boolean } = {}
  ): Promise<string | null> => {
    const { silent = false, requestPermissions = true } = options;
    const isExpoGo = Constants.appOwnership === 'expo';
    if (!Device.isDevice || isExpoGo) {
      if (!silent) Alert.alert('Push not available in Expo Go', 'Use a development build or production app to test push notifications.');
      return null;
    }
    try {
      const current = await Notifications.getPermissionsAsync();
      let granted = current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      if (!granted && requestPermissions) {
        const requested = await Notifications.requestPermissionsAsync();
        granted = requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      }
      if (!granted) {
        if (!silent) Alert.alert('Permission Required', 'Enable notifications in device settings to receive push alerts.');
        return null;
      }
      const projectId =
        (Constants.expoConfig as any)?.extra?.eas?.projectId ||
        (Constants as any)?.easConfig?.projectId;
      if (!projectId) {
        if (!silent) Alert.alert('Push setup missing', 'Expo project ID is missing. Configure EAS project ID to enable push notifications.');
        return null;
      }
      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      return tokenResponse?.data ?? null;
    } catch (error) {
      console.error('[NotifySettings] registerForPush error', error);
      if (!silent) Alert.alert('Push setup failed', 'Unable to register this device for push notifications.');
      return null;
    }
  }, []);

  // ── Load prefs on mount ────────────────────────────────────────────────────
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // ── Bootstrap push token silently on mount ────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = await registerForPush({ silent: true, requestPermissions: false });
        if (!token) { setPushEnabled(false); setRegisteredPushToken(null); return; }
        await PatientService.registerDevicePushToken({
          push_token: token, platform: getDevicePlatform(), device_id: token,
        });
        setRegisteredPushToken(token);
        setPushEnabled(true);
      } catch (error) {
        console.warn('[NotifySettings] bootstrap push registration skipped', error);
        setPushEnabled(false); setRegisteredPushToken(null);
      }
    })();
  }, [registerForPush]);

  // ── Bubbles ───────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      [b1y,b1x,b2y,b2x,b3y,b3x,b4y,b4x,b5y,b5x].forEach(v => v.setValue(0));
      const fly = (y: Animated.Value, x: Animated.Value, dY: number, dX: number) => {
        const c = Animated.parallel([
          Animated.loop(Animated.sequence([
            Animated.timing(y, { toValue: -50, duration: dY, useNativeDriver: true }),
            Animated.timing(y, { toValue:  50, duration: dY, useNativeDriver: true }),
          ])),
          Animated.loop(Animated.sequence([
            Animated.timing(x, { toValue:  30, duration: dX, useNativeDriver: true }),
            Animated.timing(x, { toValue: -30, duration: dX, useNativeDriver: true }),
          ])),
        ]);
        c.start(); return c;
      };
      const anims = [
        fly(b1y, b1x, 8000, 7000), fly(b2y, b2x, 10000, 8000),
        fly(b3y, b3x, 9000, 7500), fly(b4y, b4x, 8500, 7200),
        fly(b5y, b5x, 9500, 8200),
      ];
      return () => anims.forEach(a => a.stop());
    }, [b1x, b1y, b2x, b2y, b3x, b3y, b4x, b4y, b5x, b5y])
  );

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    Animated.sequence([
      Animated.timing(saveScale, { toValue: 0.94, duration: 80,  useNativeDriver: true }),
      Animated.timing(saveScale, { toValue: 1,    duration: 160, useNativeDriver: true }),
    ]).start();
    try {
      setSaving(true);
      await PatientService.updateNotificationPreferences(buildPayload(prefs));
      const result = await syncReminders(prefs);
      await loadPreferences();
      if (!result.ok) {
        Alert.alert('Saved with warning', 'Preferences saved, but device notification permissions are disabled. Enable them in phone Settings.');
        return;
      }
      Alert.alert('Saved', 'Notification preferences updated and refreshed.');
    } catch {
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading || !prefs) {
    return (
      <View style={{ flex: 1, backgroundColor: '#342949', justifyContent: 'center', alignItems: 'center' }}>
        <LinearGradient colors={['#342949', '#2A1F3D', '#342949']} style={StyleSheet.absoluteFill} />
        <TabLoaderCard
          title="Loading Notification Settings"
          subtitle="Preparing your reminder preferences..."
          spinnerColor="#A78BFA"
          icon="brain"
          fullScreen
          showText
        />
      </View>
    );
  }

  const currentHoursLabel = HOUR_OPTIONS.find(o => o.value === prefs.session_reminder_time)?.label ?? `${prefs.session_reminder_time}h`;

  return (
    <View style={{ flex: 1, backgroundColor: '#342949' }}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />

      <LinearGradient colors={['#342949', '#2A1F3D', '#342949']} style={[StyleSheet.absoluteFill, { height }]} pointerEvents="none" />

      {/* Ambient glow blobs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position:'absolute', borderRadius:9999, width:bLarge*1.1, height:bLarge*1.1, top:-bLarge*0.3, right:-bLarge*0.3, backgroundColor:'rgba(167,139,250,0.06)' }} />
        <View style={{ position:'absolute', borderRadius:9999, width:bMedium, height:bMedium, bottom:'18%', left:-bMedium*0.35, backgroundColor:'rgba(255,179,107,0.05)' }} />
      </View>

      {/* Floating bubbles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={{ position:'absolute', borderRadius:9999, width:bMedium, height:bMedium, top:clamp(height*0.06,34,62), right:-clamp(width*0.12,36,56), backgroundColor:'rgba(167,139,250,0.25)', transform:[{translateY:b1y},{translateX:b1x}] }} />
        <Animated.View style={{ position:'absolute', borderRadius:9999, width:bLarge, height:bLarge, top:-clamp(height*0.12,80,120), left:-clamp(width*0.18,56,88), backgroundColor:'rgba(184,168,230,0.20)', transform:[{translateY:b2y},{translateX:b2x}] }} />
        <Animated.View style={{ position:'absolute', borderRadius:9999, width:clamp(width*0.4,120,170), height:clamp(width*0.4,120,170), bottom:clamp(height*0.24,160,230), left:-clamp(width*0.08,20,36), backgroundColor:'rgba(167,139,250,0.22)', transform:[{translateY:b3y},{translateX:b3x}] }} />
        <Animated.View style={{ position:'absolute', borderRadius:9999, width:clamp(width*0.48,150,200), height:clamp(width*0.48,150,200), bottom:clamp(height*0.12,80,120), right:-clamp(width*0.14,42,70), backgroundColor:'rgba(184,168,230,0.18)', transform:[{translateY:b4y},{translateX:b4x}] }} />
        <Animated.View style={{ position:'absolute', borderRadius:9999, width:bSmall, height:bSmall, top:'40%', right:clamp(width*0.05,14,24), backgroundColor:'rgba(167,139,250,0.15)', transform:[{translateY:b5y},{translateX:b5x}] }} />
      </View>

      <StickyHeader scrollY={scrollY} firstWord="Notification" secondWord="Settings" onBackPress={() => router.push('/patient/profile')} />

      {/* Fading large header */}
      <Animated.View style={{
        position:'absolute', top:0, left:0, right:0, zIndex:900,
        paddingTop:hTop, paddingHorizontal:pi, paddingBottom:hBotPad,
        opacity: scrollY.interpolate({ inputRange:[0,100,150], outputRange:[1,0.5,0], extrapolate:'clamp' }),
      }}>
        <TouchableOpacity
          onPress={() => router.push('/patient/profile')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            position:'absolute', left:pi, top:hTop+clamp(height*0.003,2,5)-6,
            width:hBtnSz, height:hBtnSz, borderRadius:hBtnR,
            alignItems:'center', justifyContent:'center',
            backgroundColor:'rgba(255,255,255,0.08)', borderWidth:1, borderColor:'rgba(255,255,255,0.14)',
            zIndex:1000,
          }}
        >
          <FontAwesome name="chevron-left" size={hIconSz} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={{ fontSize:hTitleSz, fontWeight:'800', textAlign:'center', marginTop:hMTop+18 }}>
          <Text style={{ color:'#FFFFFF' }}>Notification </Text>
          <Text style={{ color:'#B8A8E6' }}>Settings</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{ paddingHorizontal:pi, paddingTop:contTopPad, paddingBottom:contBotPad }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent:{ contentOffset:{ y:scrollY } } }], { useNativeDriver:true })}
        scrollEventThrottle={16}
      >
        <Text style={{ color:'#7B6FA0', fontSize:subtitleSz, textAlign:'center', marginBottom:subtitleMB }}>
          Customise when and how you receive reminders
        </Text>

        {/* ── Push Notifications card ── */}
        <GlassCard accent="#FF6B9D">
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <View style={{ flexDirection:'row', alignItems:'center', flex:1 }}>
              <View style={[ch.iconBg, { backgroundColor:'rgba(255,107,157,0.12)', borderColor:'rgba(255,107,157,0.3)' }]}>
                <FontAwesome name="bell" size={20} color="#FF6B9D" />
              </View>
              <View style={{ flex:1 }}>
                <Text style={ch.title}>Push Notifications</Text>
                <Text style={ch.sub}>{pushEnabled ? 'Enabled on this device' : 'Disabled'}</Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={async (v: boolean) => {
                if (v) {
                  setPushEnabled(true);
                  await AsyncStorage.setItem(PUSH_ENABLED_STORAGE_KEY, 'true');

                  const token = await registerForPush();
                  if (!token) {
                    Alert.alert(
                      'Enabled',
                      'Notifications stay enabled. If device token registration is delayed, background push may start after a short while.'
                    );
                    return;
                  }

                  try {
                    await PatientService.registerDevicePushToken({
                      push_token: token, platform: getDevicePlatform(), device_id: token,
                    });
                    setRegisteredPushToken(token);
                    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
                    Alert.alert('Enabled', 'Push notifications are enabled for this device.');
                  } catch (error) {
                    console.warn('[NotifySettings] register push token failed', error);
                    setRegisteredPushToken(token);
                    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
                    Alert.alert(
                      'Enabled with warning',
                      'Notifications are enabled, but server sync is pending. It will retry automatically.'
                    );
                  }
                  setPushEnabled(false); setRegisteredPushToken(null); return;
                }
                try {
                  await PatientService.unregisterDevicePushToken(
                    registeredPushToken ? { push_token: registeredPushToken } : undefined
                  );
                } catch (err) {
                  console.warn('[NotifySettings] unregister push token failed', err);
                }
                setPushEnabled(false); setRegisteredPushToken(null);
              }}
              trackColor={{ false:'#3A3256', true:'#FF6B9D' }}
              thumbColor={pushEnabled ? '#FFFFFF' : '#6B6482'}
              ios_backgroundColor="#3A3256"
            />
          </View>
        </GlassCard>

        {/* ── Mood Check-in ── */}
        <GlassCard accent="#FFD93D">
          <CardHeader emoji="😊" title="Mood Check-in" subtitle="Daily emotional wellness prompt" />
          <ToggleRow
            label="Daily Reminder"
            hint="Get nudged to log how you're feeling each day"
            value={!!prefs.mood_reminder_enabled}
            onChange={v => setPrefs({ ...prefs, mood_reminder_enabled: v })}
            accent="#FFD93D"
          />
          <TimeRow
            label="Reminder Time"
            time={prefs.mood_reminder_time || '20:00'}
            accent="#FFD93D"
            disabled={!prefs.mood_reminder_enabled}
            onPress={() => setShowMoodPicker(true)}
          />
        </GlassCard>

        {showMoodPicker && (
          <View style={pk.card}>
            <DateTimePicker
              value={parseTimeValue(prefs?.mood_reminder_time, 20, 0)}
              mode="time" is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minuteInterval={1}
              onChange={(e, date) => {
                if (Platform.OS === 'android') { setShowMoodPicker(false); if (e.type === 'dismissed') return; }
                if (date) setPrefs({ ...prefs, mood_reminder_time: `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}` });
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={pk.done} onPress={() => setShowMoodPicker(false)}>
                <Text style={pk.doneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Journal Reminder ── */}
        <GlassCard accent="#5DADE2">
          <CardHeader emoji="📓" title="Journal Reminder" subtitle="Daily reflection prompt" />
          <ToggleRow
            label="Daily Reminder"
            hint="A gentle nudge to write your daily journal entry"
            value={!!prefs.journal_reminder_enabled}
            onChange={v => setPrefs({ ...prefs, journal_reminder_enabled: v })}
            accent="#5DADE2"
          />
          <TimeRow
            label="Reminder Time"
            time={prefs.journal_reminder_time || '21:00'}
            accent="#5DADE2"
            disabled={!prefs.journal_reminder_enabled}
            onPress={() => setShowJournalPicker(true)}
          />
        </GlassCard>

        {showJournalPicker && (
          <View style={pk.card}>
            <DateTimePicker
              value={parseTimeValue(prefs?.journal_reminder_time, 21, 0)}
              mode="time" is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minuteInterval={1}
              onChange={(e, date) => {
                if (Platform.OS === 'android') { setShowJournalPicker(false); if (e.type === 'dismissed') return; }
                if (date) setPrefs({ ...prefs, journal_reminder_time: `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}` });
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={pk.done} onPress={() => setShowJournalPicker(false)}>
                <Text style={pk.doneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Session Reminders ── */}
        <GlassCard accent="#A78BFA">
          <CardHeader emoji="🗓️" title="Session Reminders" subtitle="Therapy appointment alerts" />

          <ToggleRow
            label="Session Reminders"
            hint="Get notified before your upcoming therapy sessions"
            value={!!prefs.session_reminders_enabled}
            onChange={v => setPrefs({ ...prefs, session_reminders_enabled: v })}
            accent="#A78BFA"
          />

          {/* Hours-before picker */}
          <TouchableOpacity
            style={[st.triggerRow, !prefs.session_reminders_enabled && { opacity: 0.38 }]}
            onPress={() => prefs.session_reminders_enabled && setShowSessionModal(true)}
            activeOpacity={0.75}
          >
            <View style={{ flex: 1 }}>
              <Text style={st.triggerLabel}>Remind me before</Text>
              <Text style={st.triggerHint}>Tap to change notification timing</Text>
            </View>
            <View style={st.triggerPill}>
              <MaterialCommunityIcons name="clock-outline" size={13} color="#A78BFA" style={{ marginRight: 5 }} />
              <Text style={st.triggerVal}>{currentHoursLabel}</Text>
              <MaterialCommunityIcons name="chevron-right" size={14} color="#7B6FA0" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          {/* Session event sub-toggles */}
          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10 }}>
            <Text style={{ color:'#7B6FA0', fontSize:10, fontWeight:'700', marginBottom:8, letterSpacing:1, textTransform:'uppercase' }}>
              Session Events
            </Text>
            <ToggleRow
              label="Session Rescheduled"
              hint="When a session is rescheduled or moved to a new time"
              value={!!prefs.session_approved_enabled}
              onChange={v => setPrefs({ ...prefs, session_approved_enabled: v })}
              accent="#A78BFA"
            />
            <ToggleRow
              label="Session Cancelled"
              hint="When a session is cancelled"
              value={!!prefs.session_cancelled_enabled}
              onChange={v => setPrefs({ ...prefs, session_cancelled_enabled: v })}
              accent="#A78BFA"
            />
            <ToggleRow
              label="Session Summary"
              hint="When your therapist shares session notes"
              value={!!prefs.session_summary_enabled}
              onChange={v => setPrefs({ ...prefs, session_summary_enabled: v })}
              accent="#A78BFA"
              isLast
            />
          </View>
        </GlassCard>

        {/* Save button */}
        <Animated.View style={{ transform:[{ scale:saveScale }], marginTop:4, marginBottom:8 }}>
          <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85}>
            <LinearGradient
              colors={saving ? ['#4A4160','#4A4160'] : ['#A78BFA','#7C5CBF']}
              start={{ x:0, y:0 }} end={{ x:1, y:0 }}
              style={sv.btn}
            >
              {saving
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <>
                    <FontAwesome name="check-circle" size={16} color="#FFFFFF" style={{ marginRight:9 }} />
                    <Text style={sv.text}>Save Preferences</Text>
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.ScrollView>

      <SessionModal
        visible={showSessionModal}
        current={prefs.session_reminder_time ?? 24}
        onSelect={v => setPrefs({ ...prefs, session_reminder_time: v })}
        onClose={() => setShowSessionModal(false)}
        width={width}
      />
    </View>
  );
}

const st = StyleSheet.create({
  triggerRow:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:13, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.05)' },
  triggerLabel: { color:'#CEC2EE', fontSize:14, fontWeight:'600' },
  triggerHint:  { color:'#6B6482', fontSize:11, marginTop:3 },
  triggerPill:  { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(167,139,250,0.12)', paddingHorizontal:13, paddingVertical:8, borderRadius:12, borderWidth:1, borderColor:'rgba(167,139,250,0.3)' },
  triggerVal:   { color:'#A78BFA', fontSize:13, fontWeight:'800' },
});

const pk = StyleSheet.create({
  card:     { backgroundColor:CARD_BG, borderRadius:16, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', marginTop:8, marginBottom:14, overflow:'hidden' },
  done:     { alignSelf:'flex-end', margin:12, paddingHorizontal:18, paddingVertical:8, borderRadius:12, backgroundColor:'#A78BFA' },
  doneText: { color:'#FFFFFF', fontWeight:'800', fontSize:13 },
});

const sv = StyleSheet.create({
  btn:  { paddingVertical:15, borderRadius:16, alignItems:'center', justifyContent:'center', flexDirection:'row', shadowColor:'#A78BFA', shadowOpacity:0.3, shadowOffset:{ width:0, height:5 }, shadowRadius:12, elevation:5 },
  text: { color:'#FFFFFF', fontSize:15, fontWeight:'800', letterSpacing:0.2 },
});
