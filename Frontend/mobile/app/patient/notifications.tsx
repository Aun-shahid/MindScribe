import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PatientService from '../services/patient.service';
import { useTheme } from '../contexts/ThemeContext';
import { BASE_URL } from '../config';

export default function NotificationsScreen() {
  const { themeStyle } = useTheme();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const websocketRef = useRef<WebSocket | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await PatientService.getNotifications({});
      // API may return object with results or direct list
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
    } catch (err) {
      // ignore
    }
    // deep link handling: if action_url present, navigate
    if (item.action_url) {
      // remove leading slash
      const route = item.action_url.replace(/^\//, '');
      router.push(`../${route}` as any);
    } else {
      // show preview
      Alert.alert(item.title || 'Notification', item.message || '');
    }
    load();
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, !item.is_read ? styles.unread : null, { backgroundColor: themeStyle.dashboardcard || '#fff' }]} onPress={() => handlePress(item)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[styles.title, { color: themeStyle.title }]}>{item.title}</Text>
        {!item.is_read && <View style={styles.dot} />}
      </View>
      <Text style={[styles.message, { color: themeStyle.text }]} numberOfLines={2}>{item.message}</Text>
      <Text style={[styles.time, { color: themeStyle.label }]}>{new Date(item.sent_at).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  const handleMarkAll = async () => {
    try {
      await PatientService.markAllNotificationsRead();
      load();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: themeStyle.title }]}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAll}><Text style={{ color: themeStyle.primary }}>Mark all as read</Text></TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={themeStyle.text} />
      ) : (
        <FlatList data={notifications} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={{ padding: 16 }} ItemSeparatorComponent={() => <View style={{ height: 8 }} />} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', padding: 16 },
  card: { padding: 14, borderRadius: 12, elevation: 1 },
  unread: { borderLeftWidth: 4, borderLeftColor: '#7b61ff' },
  title: { fontSize: 16, fontWeight: '700' },
  message: { marginTop: 6, fontSize: 14 },
  time: { marginTop: 8, fontSize: 12, color: '#888' },
  dot: { width: 10, height: 10, borderRadius: 6, backgroundColor: '#7b61ff' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
});
