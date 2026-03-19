import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState, View, Text, StyleSheet, TouchableOpacity,
  Alert, Animated, StatusBar, Modal, ScrollView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';
import { BASE_URL } from '../config';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)', 'rgba(167,139,250,0.08)', 'rgba(52,41,73,0.72)',
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFull(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// icon + accent colour per notification type
const TYPE_CONFIG: Record<string, { icon: string; color: string; dim: string }> = {
  session_reminder: { icon: 'calendar',  color: '#A78BFA', dim: 'rgba(167,139,250,0.15)' },
  session_summary:  { icon: 'file-text-o', color: '#A78BFA', dim: 'rgba(167,139,250,0.15)' },
  session_approved: { icon: 'check-circle', color: '#4CAF50', dim: 'rgba(76,175,80,0.15)' },
  session_cancelled:{ icon: 'times-circle', color: '#EF4444', dim: 'rgba(239,68,68,0.15)' },
  mood_reminder:    { icon: 'smile-o',    color: '#FFD93D', dim: 'rgba(255,217,61,0.15)' },
  journal_reminder: { icon: 'book',       color: '#5DADE2', dim: 'rgba(93,173,226,0.15)' },
  goal_reminder:    { icon: 'flag',       color: '#FFB36B', dim: 'rgba(255,179,107,0.15)' },
  therapist_message:{ icon: 'comment',    color: '#FF6B9D', dim: 'rgba(255,107,157,0.15)' },
};
const DEFAULT_TYPE = { icon: 'bell', color: '#B8A8E6', dim: 'rgba(184,168,230,0.15)' };

function getTypeConfig(t?: string) {
  return (t && TYPE_CONFIG[t]) || DEFAULT_TYPE;
}

// ─── Detail Bottom Sheet ──────────────────────────────────────────────────────
function DetailSheet({
  item, onClose, onMarkRead, onDelete,
}: {
  item: any | null;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(height)).current;
  const fadeOv = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (item) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(fadeOv, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: height, duration: 260, useNativeDriver: true }),
        Animated.timing(fadeOv, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [item]);

  if (!item) return null;

  const cfg = getTypeConfig(item.notification_type);
  const sheetH = clamp(height * 0.56, 360, 520);
  const cPad   = clamp(width * 0.055, 18, 26);

  return (
    <Modal transparent visible={!!item} animationType="none" onRequestClose={onClose}>
      {/* Dimmed overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,6,20,0.72)' }, { opacity: fadeOv }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Slide-up sheet */}
      <Animated.View style={[ds.sheet, {
        height: sheetH,
        paddingBottom: insets.bottom + 12,
        transform: [{ translateY: slideY }],
      }]}>
        <LinearGradient
          colors={['#2C2248', '#241C3E', '#1E1630']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        {/* Accent top bar matching type colour */}
        <View style={[ds.topBar, { backgroundColor: cfg.color }]} />

        {/* Drag handle */}
        <View style={ds.handle} />

        <ScrollView contentContainerStyle={{ padding: cPad, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
          {/* Icon + type row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <View style={[ds.iconCircle, { backgroundColor: cfg.dim, borderColor: `${cfg.color}40` }]}>
              <FontAwesome name={cfg.icon as any} size={clamp(width * 0.055, 18, 24)} color={cfg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ds.typeLabel, { color: cfg.color }]}>
                {(item.notification_type || 'notification').replace(/_/g, ' ').toUpperCase()}
              </Text>
              <Text style={ds.timeText}>{formatFull(item.sent_at)}</Text>
            </View>
            {!item.is_read && (
              <View style={[ds.unreadDot, { backgroundColor: cfg.color }]} />
            )}
          </View>

          {/* Title */}
          <Text style={ds.title}>{item.title}</Text>

          {/* Divider */}
          <View style={ds.divider} />

          {/* Message body */}
          <Text style={ds.body}>{item.message || 'No additional details.'}</Text>
        </ScrollView>

        {/* Action buttons */}
        <View style={[ds.actions, { paddingHorizontal: cPad }]}>
          {!item.is_read && (
            <TouchableOpacity
              style={ds.markBtn}
              onPress={() => { onMarkRead(item.id); onClose(); }}
              activeOpacity={0.8}
            >
              <FontAwesome name="check" size={13} color="#FFFFFF" style={{ marginRight: 7 }} />
              <Text style={ds.markBtnText}>Mark as read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={ds.deleteBtn}
            onPress={() => {
              onClose();
              setTimeout(() => {
                Alert.alert('Delete', 'Remove this notification?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
                ]);
              }, 300);
            }}
            activeOpacity={0.8}
          >
            <FontAwesome name="trash-o" size={13} color="#EF4444" style={{ marginRight: 7 }} />
            <Text style={ds.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const ds = StyleSheet.create({
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
    borderBottomWidth: 0,
  },
  topBar:    { height: 3, width: '100%' },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  iconCircle:{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  typeLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  timeText:  { color: '#6B6482', fontSize: 11, marginTop: 2 },
  unreadDot: { width: 9, height: 9, borderRadius: 5 },
  title:     { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 12, lineHeight: 25 },
  divider:   { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 10 },
  body:      { color: '#B8A8E6', fontSize: 14, lineHeight: 22 },
  actions:   { flexDirection: 'column', gap: 9, paddingTop: 4 },
  markBtn:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#A78BFA', borderRadius: 12,
    paddingVertical: 13,
  },
  markBtnText:  { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  deleteBtn:    {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12, paddingVertical: 13,
  },
  deleteBtnText:{ color: '#EF4444', fontWeight: '700', fontSize: 14 },
});

// ─── Notification Card ────────────────────────────────────────────────────────
function NotifCard({
  item, onPress, width,
}: { item: any; onPress: () => void; width: number }) {
  const cfg   = getTypeConfig(item.notification_type);
  const cPad  = clamp(width * 0.042, 13, 17);
  const iconSz = clamp(width * 0.046, 15, 19);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        nc.card,
        !item.is_read && nc.unread,
        { padding: cPad },
      ]}
    >
      {/* Left accent for unread */}
      {!item.is_read && (
        <View style={[nc.accentBar, { backgroundColor: cfg.color }]} />
      )}

      <LinearGradient
        colors={CARD_GRAD}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
        pointerEvents="none"
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: clamp(width * 0.033, 10, 14) }}>
        {/* Icon badge */}
        <View style={[nc.iconBadge, {
          backgroundColor: item.is_read ? 'rgba(184,168,230,0.10)' : cfg.dim,
          borderColor: item.is_read ? 'rgba(184,168,230,0.15)' : `${cfg.color}40`,
          width: clamp(width * 0.1, 34, 42),
          height: clamp(width * 0.1, 34, 42),
          borderRadius: clamp(width * 0.032, 10, 13),
        }]}>
          <FontAwesome
            name={cfg.icon as any}
            size={iconSz}
            color={item.is_read ? '#7B6FA0' : cfg.color}
          />
        </View>

        {/* Text block */}
        <View style={{ flex: 1 }}>
          {/* Title + time */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <Text
              style={[nc.title, { fontSize: clamp(width * 0.037, 13, 15) },
                !item.is_read && { color: '#FFFFFF', fontWeight: '700' }
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={[nc.time, { fontSize: clamp(width * 0.028, 9, 11) }]}>
              {timeAgo(item.sent_at)}
            </Text>
          </View>

          {/* Message preview */}
          <Text style={[nc.preview, { fontSize: clamp(width * 0.032, 11, 13) }]} numberOfLines={1}>
            {item.message}
          </Text>
        </View>

        {/* Unread dot */}
        {!item.is_read && (
          <View style={[nc.dot, { backgroundColor: cfg.color }]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const nc = StyleSheet.create({
  card: {
    backgroundColor: '#3F3752',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    shadowColor: '#120A24',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10, elevation: 4,
  },
  unread: {
    backgroundColor: '#3D3356',
    borderColor: 'rgba(167,139,250,0.22)',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent', // handled by accentBar
  },
  accentBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, borderTopLeftRadius: 14, borderBottomLeftRadius: 14,
  },
  iconBadge: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:     { color: '#CEC2EE', fontWeight: '600', flex: 1, marginRight: 8 },
  time:      { color: '#6B6482', fontWeight: '500' },
  preview:   { color: '#7B6FA0' },
  dot:       { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [selected,      setSelected]      = useState<any | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const websocketRef           = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef   = useRef(0);
  const shouldReconnectRef     = useRef(true);

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
  const contTopPad = hEst + clamp(height * 0.016, 10, 16);
  const contBotPad = clamp(insets.bottom + height * 0.02, 24, 38);

  // ── Data loading ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await PatientService.getNotifications({});
      const list = Array.isArray(data) ? data : (data as any)?.results ?? [];
      setNotifications(list);
      setUnreadCount(list.filter((n: any) => !n.is_read).length);
    } catch (err: any) {
      console.error('[Notifications] load error', err);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const normalizeNotification = (payload: any) => {
    const incoming = payload?.notification || {};
    const dbRecord = incoming?.db_record || {};
    const notificationId = incoming?.id || dbRecord?.id;
    if (!notificationId) return null;
    return {
      id: notificationId,
      notification_type: incoming?.notification_type || dbRecord?.notification_type || 'general',
      title: incoming?.title || dbRecord?.title || 'Notification',
      message: incoming?.message || dbRecord?.message || '',
      action_url: incoming?.action_url || dbRecord?.action_url || null,
      is_read: Boolean(dbRecord?.is_read ?? incoming?.read ?? false),
      sent_at: dbRecord?.sent_at || dbRecord?.createdAt || incoming?.createdAt || new Date().toISOString(),
    };
  };

  const clearRealtimeTimers = () => {
    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
    if (pingIntervalRef.current)     { clearInterval(pingIntervalRef.current);    pingIntervalRef.current = null; }
  };

  useEffect(() => {
    load();
    shouldReconnectRef.current = true;

    const connectWS = async (): Promise<void> => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) return;
        const wsBaseUrl = BASE_URL
          .replace(/^http:\/\//i, 'ws://')
          .replace(/^https:\/\//i, 'wss://')
          .replace(/\/$/, '');
        const ws = new WebSocket(`${wsBaseUrl}/ws/notifications/?token=${encodeURIComponent(token)}`);
        websocketRef.current = ws;

        ws.onopen = () => {
          reconnectAttemptsRef.current = 0;
          clearRealtimeTimers();
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event: 'ping' }));
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload?.event === 'notification.created') {
              const n = normalizeNotification(payload);
              if (!n) return;
              if (n.id && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ event: 'notification.delivered', notification_id: n.id }));
              }
              setNotifications((prev) => {
                const filtered = prev.filter((item) => item.id !== n.id);
                return [n, ...filtered];
              });
              setUnreadCount((c) => c + 1);
            }
          } catch (error) {
            console.warn('[Notifications] ws parse error', error);
          }
        };

        ws.onerror = (error) => console.warn('[Notifications] ws error', error);
        ws.onclose = () => {
          clearRealtimeTimers();
          websocketRef.current = null;
          if (!shouldReconnectRef.current) return;
          reconnectAttemptsRef.current += 1;
          const backoffMs = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(connectWS, backoffMs);
        };
      } catch (error) {
        console.warn('[Notifications] ws init error', error);
      }
    };

    connectWS();
    return () => {
      shouldReconnectRef.current = false;
      clearRealtimeTimers();
      if (websocketRef.current) { websocketRef.current.close(); websocketRef.current = null; }
    };
  }, [load]);

  // ── Poll + focus refresh ──────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      load();
      const intervalId   = setInterval(load, 30000);
      const appStateSub  = AppState.addEventListener('change', (state) => { if (state === 'active') load(); });
      return () => { clearInterval(intervalId); appStateSub.remove(); };
    }, [load])
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleMarkRead = async (id: string) => {
    try {
      await PatientService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAll = async () => {
    try {
      await PatientService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await PatientService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const handleCardPress = async (item: any) => {
    setSelected(item);
    // silently mark as read when opened
    if (!item.is_read) {
      handleMarkRead(item.id);
    }
  };

  // ── Group by date ─────────────────────────────────────────────────────────
  const grouped: { label: string; items: any[] }[] = [];
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  notifications.forEach((n) => {
    const d = new Date(n.sent_at); d.setHours(0,0,0,0);
    const label = d.getTime() === today.getTime()
      ? 'Today'
      : d.getTime() === yesterday.getTime()
      ? 'Yesterday'
      : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const grp = grouped.find((g) => g.label === label);
    if (grp) grp.items.push(n);
    else grouped.push({ label, items: [n] });
  });

  const labelSz = clamp(width * 0.029, 10, 12);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#342949' }}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />

      {/* Background */}
      <LinearGradient
        colors={['#342949', '#2A1F3D', '#342949']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Sticky header */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Your"
        secondWord="Notifications"
        onBackPress={() => router.back()}
      />

      {/* Fading large header */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900,
        paddingTop: hTop, paddingHorizontal: pi, paddingBottom: hBotPad,
        opacity: scrollY.interpolate({ inputRange: [0, 100, 150], outputRange: [1, 0.5, 0], extrapolate: 'clamp' }),
      }}>
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: 'absolute', left: pi - 5, top: hTop + clamp(height * 0.003, 2, 5) - 6,
            width: hBtnSz, height: hBtnSz, borderRadius: hBtnR,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
          }}
        >
          <FontAwesome name="chevron-left" size={hIconSz} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Centred heading with unread badge */}
        <View style={{ alignItems: 'center', marginTop: hMTop + 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: hTitleSz, fontWeight: '800' }}>
              <Text style={{ color: '#FFFFFF' }}>Your </Text>
              <Text style={{ color: '#B8A8E6' }}>Notifications</Text>
            </Text>
            {unreadCount > 0 && (
              <View style={{
                backgroundColor: '#A78BFA',
                borderRadius: 10, minWidth: 20, height: 20,
                paddingHorizontal: 5,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Mark all read pill — top right */}
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAll}
            style={{
              position: 'absolute',
              right: pi + 8, top: hTop + clamp(height * 0.003, 2, 5) - 6,
              height: hBtnSz, paddingHorizontal: clamp(width * 0.03, 10, 14),
              borderRadius: hBtnR,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(167,139,250,0.14)',
              borderWidth: 1, borderColor: 'rgba(167,139,250,0.28)',
            }}
          >
            <Text style={{ color: '#A78BFA', fontSize: clamp(width * 0.028, 10, 12), fontWeight: '700' }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, paddingTop: contTopPad }}>
          <TabLoaderCard
            title="Loading notifications..."
            subtitle="Checking for your latest updates"
            spinnerColor="#B8A8E6"
          />
        </View>
      ) : (
        <Animated.ScrollView
          contentContainerStyle={{
            paddingHorizontal: pi,
            paddingTop: contTopPad,
            paddingBottom: contBotPad,
          }}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {notifications.length === 0 ? (
            /* Empty state */
            <View style={{ alignItems: 'center', marginTop: clamp(height * 0.12, 60, 100) }}>
              <View style={{
                width: clamp(width * 0.2, 64, 80), height: clamp(width * 0.2, 64, 80),
                borderRadius: clamp(width * 0.1, 32, 40),
                backgroundColor: 'rgba(184,168,230,0.10)',
                borderWidth: 1, borderColor: 'rgba(184,168,230,0.18)',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: clamp(height * 0.022, 14, 20),
              }}>
                <FontAwesome name="bell-slash" size={clamp(width * 0.1, 32, 40)} color="#4A4160" />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: clamp(width * 0.048, 16, 20), fontWeight: '700', marginBottom: 8 }}>
                All caught up
              </Text>
              <Text style={{ color: '#6B6482', fontSize: clamp(width * 0.035, 12, 14), textAlign: 'center' }}>
                No notifications yet.{'\n'}We&apos;ll let you know when something happens.
              </Text>
            </View>
          ) : (
            grouped.map((group) => (
              <View key={group.label} style={{ marginBottom: clamp(height * 0.018, 12, 18) }}>
                {/* Date group label */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: clamp(height * 0.012, 8, 12), gap: 8 }}>
                  <View style={{ width: 3, height: clamp(height * 0.018, 12, 15), backgroundColor: 'rgba(167,139,250,0.4)', borderRadius: 2 }} />
                  <Text style={{ color: '#7B6FA0', fontSize: labelSz, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    {group.label}
                  </Text>
                </View>

                {group.items.map((item) => (
                  <NotifCard
                    key={item.id}
                    item={item}
                    width={width}
                    onPress={() => handleCardPress(item)}
                  />
                ))}
              </View>
            ))
          )}
        </Animated.ScrollView>
      )}

      {/* Detail bottom sheet */}
      <DetailSheet
        item={selected}
        onClose={() => setSelected(null)}
        onMarkRead={handleMarkRead}
        onDelete={handleDelete}
      />
    </View>
  );
}
