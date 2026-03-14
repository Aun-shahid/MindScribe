import React, { useEffect, useRef, useState } from 'react';

import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, Animated, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import PatientService from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';

// import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
// import { router } from 'expo-router';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PatientService from '../services/patient.service';
// import { useTheme } from '../contexts/ThemeContext';
// import { BASE_URL } from '../config';


export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const scrollY = useRef(new Animated.Value(0)).current;

  // const websocketRef = useRef<WebSocket | null>(null);


  const load = async () => {
    try {
      setLoading(true);
      const data = await PatientService.getNotifications({});
      const list = Array.isArray(data) ? data : data?.results || data?.notifications || [];
      setNotifications(list);
    } catch (err: any) {
      console.error('[Notifications] load error', err);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    load();

    const connectRealtimeNotifications = async () => {
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

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload?.event !== 'notification.created') {
              return;
            }

            const incoming = payload?.notification || {};
            const dbRecord = incoming?.db_record || {};
            const notificationId = incoming?.id || dbRecord?.id;

            if (notificationId && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                event: 'notification.delivered',
                notification_id: notificationId,
              }));
            }

            const normalized = {
              id: notificationId,
              title: incoming?.title || dbRecord?.title || 'Notification',
              message: incoming?.message || dbRecord?.message || '',
              action_url: incoming?.action_url || dbRecord?.action_url || null,
              is_read: Boolean(dbRecord?.is_read ?? incoming?.read ?? false),
              sent_at: dbRecord?.sent_at || incoming?.createdAt || new Date().toISOString(),
            };

            if (!normalized.id) {
              return;
            }

            setNotifications((prev) => {
              const filtered = prev.filter((item) => item.id !== normalized.id);
              return [normalized, ...filtered];
            });
          } catch (error) {
            console.warn('[Notifications] websocket parse error', error);
          }
        };

        ws.onerror = (error) => {
          console.warn('[Notifications] websocket error', error);
        };
      } catch (error) {
        console.warn('[Notifications] websocket init error', error);
      }
    };

    connectRealtimeNotifications();

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
    };
  }, []);


  const handlePress = async (item: any) => {
    try {
      if (!item.is_read) await PatientService.markNotificationRead(item.id);
    } catch { /* ignore */ }
    if (item.action_url) {
      const route = item.action_url.replace(/^\//, '');
      router.push(`../${route}` as any);
    } else {
      Alert.alert(item.title || 'Notification', item.message || '');
    }
    load();
  };

  const handleMarkAll = async () => {
    try {
      await PatientService.markAllNotificationsRead();
      load();
    } catch {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />

      <LinearGradient
        colors={['#342949', '#2a1f3d', '#342949']}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Sticky header */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Your"
        secondWord="Notifications"
        onBackPress={() => router.back()}
      />

      {/* Animated fading header */}
      <Animated.View style={[styles.headerContainer, {
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        })
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          <Text style={styles.headerWhite}>Your </Text>
          <Text style={styles.headerPurple}>Notifications</Text>
        </Text>
        <TouchableOpacity onPress={handleMarkAll} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </Animated.View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#B8A8E6" />
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
              <Text style={styles.emptySubText}>You're all caught up!</Text>
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
                      name={item.notification_type === 'session' ? 'calendar' : item.notification_type === 'mood' ? 'smile-o' : 'bell'}
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

  // Header
  headerContainer: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 18,
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

  // Content
  container: { paddingHorizontal: 16, paddingTop: 8 },

  // Empty state
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  emptySubText: { fontSize: 14, color: '#B8A8E6' },

  // Cards
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
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#D4CCE8', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A78BFA' },
  cardMessage: { fontSize: 13, color: '#9B92B8', lineHeight: 18 },
  cardTime: { fontSize: 11, color: '#6B6482', marginTop: 6 },
});
