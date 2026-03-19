import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';
import { BASE_URL } from '../config';
import TherapistService from '../services/therapist.service';
import { normalizeNotificationActionUrl } from '../utils/notificationNavigation';

type TherapistNotification = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string | null;
  is_read: boolean;
  sent_at: string;
  category?: 'session' | 'mood' | 'other';
};

const CATEGORY_TABS: { key: 'all' | 'session' | 'mood' | 'other'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'session', label: 'Session' },
  { key: 'mood', label: 'Mood' },
  { key: 'other', label: 'Other' },
];

export default function TherapistNotificationsScreen() {
  const [notifications, setNotifications] = useState<TherapistNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<'all' | 'session' | 'mood' | 'other'>('all');

  const scrollY = useRef(new Animated.Value(0)).current;
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = category === 'all' ? undefined : { category };
      const data = await TherapistService.getTherapistNotifications(params as any);
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);
    } catch (err: any) {
      console.error('[TherapistNotifications] load error', err);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [category]);

  const normalizeIncoming = (payload: any): TherapistNotification | null => {
    const incoming = payload?.notification || {};
    const dbRecord = incoming?.db_record || {};
    const notificationId = incoming?.id || dbRecord?.id;

    if (!notificationId) {
      return null;
    }

    return {
      id: String(notificationId),
      notification_type: incoming?.notification_type || dbRecord?.notification_type || 'general',
      title: incoming?.title || dbRecord?.title || 'Notification',
      message: incoming?.message || dbRecord?.message || '',
      action_url: incoming?.action_url || dbRecord?.action_url || null,
      is_read: Boolean(dbRecord?.is_read ?? incoming?.read ?? false),
      sent_at: dbRecord?.sent_at || incoming?.createdAt || new Date().toISOString(),
      category: dbRecord?.category || 'other',
    };
  };

  const clearRealtimeTimers = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    load();
    shouldReconnectRef.current = true;

    const connectRealtimeNotifications = async (): Promise<void> => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (!token) {
          return;
        }

        const wsBaseUrl = BASE_URL
          .replace(/^http:\/\//i, 'ws://')
          .replace(/^https:\/\//i, 'wss://')
          .replace(/\/$/, '');

        const wsUrl = `${wsBaseUrl}/ws/notifications/?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(wsUrl);
        websocketRef.current = ws;

        ws.onopen = () => {
          reconnectAttemptsRef.current = 0;
          clearRealtimeTimers();
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ event: 'ping' }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload?.event !== 'notification.created') {
              return;
            }

            const normalized = normalizeIncoming(payload);
            if (!normalized) {
              return;
            }

            if (normalized.id && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                event: 'notification.delivered',
                notification_id: normalized.id,
              }));
            }

            setNotifications((prev) => {
              const filtered = prev.filter((item) => item.id !== normalized.id);
              return [normalized, ...filtered];
            });
          } catch (error) {
            console.warn('[TherapistNotifications] websocket parse error', error);
          }
        };

        ws.onerror = (error) => {
          console.warn('[TherapistNotifications] websocket error', error);
        };

        ws.onclose = () => {
          clearRealtimeTimers();
          websocketRef.current = null;

          if (!shouldReconnectRef.current) {
            return;
          }

          reconnectAttemptsRef.current += 1;
          const backoffMs = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectRealtimeNotifications();
          }, backoffMs);
        };
      } catch (error) {
        console.warn('[TherapistNotifications] websocket init error', error);
      }
    };

    connectRealtimeNotifications();

    return () => {
      shouldReconnectRef.current = false;
      clearRealtimeTimers();
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();

      const intervalId = setInterval(() => {
        load();
      }, 30000);

      const appStateSub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          load();
        }
      });

      return () => {
        clearInterval(intervalId);
        appStateSub.remove();
      };
    }, [load])
  );

  const getIconName = (notificationType?: string) => {
    switch (notificationType) {
      case 'session_reminder':
      case 'session_summary':
      case 'session_approved':
      case 'session_cancelled':
        return 'calendar';
      case 'mood_reminder':
        return 'smile-o';
      case 'journal_reminder':
        return 'book';
      case 'goal_reminder':
        return 'flag';
      default:
        return 'bell';
    }
  };

  const handlePress = async (item: TherapistNotification) => {
    try {
      if (!item.is_read) {
        await TherapistService.markTherapistNotificationRead(item.id);
      }
    } catch {
      // ignore
    }

    if (item.action_url) {
      const route = normalizeNotificationActionUrl(item.action_url, 'therapist');
      router.push(route as any);
    } else {
      Alert.alert(item.title || 'Notification', item.message || '');
    }

    load();
  };

  const handleMarkAll = async () => {
    try {
      await TherapistService.markAllTherapistNotificationsRead();
      load();
    } catch {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await TherapistService.deleteTherapistNotification(id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    } catch {
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />

      <LinearGradient
        colors={['#342949', '#2a1f3d', '#342949']}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <StickyHeader
        scrollY={scrollY}
        firstWord="Therapist"
        secondWord="Notifications"
        onBackPress={() => router.back()}
      />

      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: scrollY.interpolate({
              inputRange: [0, 100, 150],
              outputRange: [1, 0.5, 0],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          <Text style={styles.headerWhite}>Therapist </Text>
          <Text style={styles.headerPurple}>Notifications</Text>
        </Text>
        <TouchableOpacity onPress={handleMarkAll} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.tabRow}>
        {CATEGORY_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, category === tab.key && styles.tabButtonActive]}
            onPress={() => setCategory(tab.key)}
          >
            <Text style={[styles.tabText, category === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <TabLoaderCard title="Loading notifications..." subtitle="Syncing latest alerts" spinnerColor="#B8A8E6" />
      ) : (
        <Animated.ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="bell-slash" size={48} color="#B8A8E6" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubText}>You are all caught up!</Text>
            </View>
          ) : (
            notifications.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, !item.is_read && styles.unreadCard]}
                onPress={() => handlePress(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardRow}>
                  <View style={[styles.iconCircle, { backgroundColor: item.is_read ? 'rgba(184,168,230,0.15)' : 'rgba(167,139,250,0.25)' }]}>
                    <FontAwesome
                      name={getIconName(item.notification_type)}
                      size={18}
                      color={item.is_read ? '#B8A8E6' : '#A78BFA'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.cardTitle, !item.is_read && { color: '#FFFFFF', fontWeight: '800' }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!item.is_read && <View style={styles.dot} />}
                    </View>
                    <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
                    <Text style={styles.cardTime}>{new Date(item.sent_at).toLocaleString()}</Text>
                    <View style={styles.actionRow}>
                      <Text style={styles.unreadCountText}>{unreadCount} unread</Text>
                      <TouchableOpacity onPress={() => handleDelete(item.id)}>
                        <Text style={styles.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 40 }} />
        </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#342949' },
  headerContainer: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backButton: { position: 'absolute', left: 20, top: 52, padding: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 20 },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },
  markAllBtn: { position: 'absolute', right: 20, top: 56, padding: 4 },
  markAllText: { color: '#B8A8E6', fontSize: 12, fontWeight: '700' },
  tabRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(167,139,250,0.30)',
  },
  tabText: {
    color: '#B8A8E6',
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  container: { paddingHorizontal: 16, paddingTop: 8 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  emptySubText: { fontSize: 14, color: '#B8A8E6' },
  card: {
    backgroundColor: '#473F5A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  unreadCard: {
    backgroundColor: '#3D3356',
    borderColor: 'rgba(167,139,250,0.3)',
    borderLeftWidth: 4,
    borderLeftColor: '#A78BFA',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#D4CCE8', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A78BFA' },
  cardMessage: { fontSize: 13, color: '#9B92B8', lineHeight: 18 },
  cardTime: { fontSize: 11, color: '#6B6482', marginTop: 6 },
  actionRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadCountText: {
    color: '#B8A8E6',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
  },
});
