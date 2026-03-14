import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator, TouchableOpacity, Alert, Platform, ScrollView, Animated } from 'react-native';
import PatientService from '../services/patient.service';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showJournalPicker, setShowJournalPicker] = useState(false);

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

  const load = async () => {
    try {
      setLoading(true);
      const data = await PatientService.getNotificationPreferences();
      setPrefs(data);
    } catch (err: any) {
      console.error('[NotifySettings] load error', err);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await PatientService.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (err) {
      console.warn('[NotifySettings] unread count error', err);
    }
  }, []);

  useEffect(() => {
    load();
    loadUnreadCount();
  }, [loadUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [loadUnreadCount])
  );

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
                toValue: 50,
                duration: durationY / 2,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValueY, {
                toValue: -50,
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
                toValue: 30,
                duration: durationX / 2,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValueX, {
                toValue: -30,
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

    createFloatingAnimation(bubble1Y, bubble1X, 4000, 3500);
    createFloatingAnimation(bubble2Y, bubble2X, 5000, 4000, 200, 400);
    createFloatingAnimation(bubble3Y, bubble3X, 4500, 3800, 400, 200);
    createFloatingAnimation(bubble4Y, bubble4X, 5500, 4200, 600, 300);
    createFloatingAnimation(bubble5Y, bubble5X, 4800, 4000, 300, 500);
  }, [bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y, bubble4X, bubble4Y, bubble5X, bubble5Y]);

  const save = async () => {
    try {
      await PatientService.updateNotificationPreferences(prefs);
      const scheduleResult = await syncLocalDailyReminders(prefs);
      if (!scheduleResult.ok) {
        Alert.alert('Saved with warning', 'Preferences were saved, but local reminder permissions are disabled. Enable notifications in iPhone Settings to receive reminders.');
        return;
      }

      Alert.alert('Saved', 'Notification preferences updated and daily reminders synced on this device.');
    } catch (err: any) {
      console.error('[NotifySettings] save error', err);
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  if (loading || !prefs) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#342949' }]}>
        <ActivityIndicator size="large" color="#A78BFA" />
      </View>
    );
  }

  const registerForPush = async () => {
    const isExpoGo = Constants.appOwnership === 'expo';
    if (!Device.isDevice || isExpoGo) {
      Alert.alert(
        'Push not available in Expo Go',
        'Use a development build or production app to test push notifications. In Expo Go this toggle stays off.'
      );
      return null;
    }

    Alert.alert(
      'Push Setup Required',
      'Push token registration is not yet implemented in this screen. Add expo-notifications token flow to enable this.'
    );
    return null;
  };

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
              width: 120,
              height: 120,
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
              width: 100,
              height: 100,
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
              width: 90,
              height: 90,
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
              width: 110,
              height: 110,
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
              width: 95,
              height: 95,
              transform: [
                { translateY: bubble5Y },
                { translateX: bubble5X },
              ],
            },
          ]}
        />
      </LinearGradient>

      {/* Header */}
      <View style={styles.headerContainer}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationsButton}
          onPress={() => router.push('./notifications' as any)}
        >
          <FontAwesome name="bell" size={20} color="#FFFFFF" />
          {unreadCount > 0 && (
            <View style={styles.notificationsBadge}>
              <Text style={styles.notificationsBadgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          <Text style={styles.headerWhite}>Notification </Text>
          <Text style={styles.headerPurple}>Settings</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageSubtitle}>Manage your notification preferences</Text>

        {/* Push Notifications Card */}
        <View style={styles.notificationCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <LinearGradient
                colors={['#FF6B9D', '#C44569']}
                style={styles.cardIconGradient}
              >
                <FontAwesome name="bell" size={24} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Push Notifications</Text>
              <Text style={styles.cardStatus}>
                {(prefs.push_enabled ?? !!prefs.push_token) ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <Switch 
              value={prefs.push_enabled ?? !!prefs.push_token}
              onValueChange={async (v: boolean) => {
                // If enabling, register for push token and persist
                if (v) {
                  const token = prefs.push_token || await registerForPush();
                  if (token) {
                    const newPrefs = { ...prefs, push_enabled: true, push_token: token };
                    setPrefs(newPrefs);
                    try {
                      await PatientService.updateNotificationPreferences({ push_token: token, push_enabled: true });
                    } catch (err: any) {
                      console.error('[NotifySettings] save push token error', err);
                      Alert.alert('Error', 'Failed to save push token to server');
                    }
                    return;
                  }
                  // If token not obtained, do not enable
                  setPrefs({ ...prefs, push_enabled: false });
                  return;
                }

                // Disabling: clear push_enabled and optionally remove token on server
                setPrefs({ ...prefs, push_enabled: false });
                try {
                  await PatientService.updateNotificationPreferences({ push_enabled: false });
                } catch (err: any) {
                  console.error('[NotifySettings] disable push error', err);
                }
              }}
              trackColor={{ false: '#5B5270', true: '#FF6B9D' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Mood Check-in Card */}
        <View style={styles.notificationCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <View style={[styles.cardIconGradient, { backgroundColor: '#FFD93D' }]}>
                <Text style={styles.emojiIcon}>😊</Text>
              </View>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Mood Check-in</Text>
            </View>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.settingRowInCard}>
              <Text style={styles.settingLabel}>Daily Reminder</Text>
              <Switch 
                value={!!prefs.mood_reminder_enabled}
                onValueChange={(v) => setPrefs({ ...prefs, mood_reminder_enabled: v })}
                trackColor={{ false: '#5B5270', true: '#FFD93D' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.timePickerRow}>
              <Text style={styles.timeLabel}>Reminder Time</Text>
              <TouchableOpacity 
                style={styles.timeButton} 
                onPress={() => setShowMoodPicker(true)}
              >
                <FontAwesome name="clock-o" size={14} color="#FFD93D" style={{ marginRight: 6 }} />
                <Text style={styles.timeValue}>{prefs.mood_reminder_time || '20:00'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Journal Reminder Card */}
        <View style={styles.notificationCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <View style={[styles.cardIconGradient, { backgroundColor: '#5DADE2' }]}>
                <Text style={styles.emojiIcon}>📓</Text>
              </View>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Journal Reminder</Text>
            </View>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.settingRowInCard}>
              <Text style={styles.settingLabel}>Daily Reminder</Text>
              <Switch 
                value={!!prefs.journal_reminder_enabled}
                onValueChange={(v) => setPrefs({ ...prefs, journal_reminder_enabled: v })}
                trackColor={{ false: '#5B5270', true: '#5DADE2' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.timePickerRow}>
              <Text style={styles.timeLabel}>Reminder Time</Text>
              <TouchableOpacity 
                style={styles.timeButton} 
                onPress={() => setShowJournalPicker(true)}
              >
                <FontAwesome name="clock-o" size={14} color="#5DADE2" style={{ marginRight: 6 }} />
                <Text style={styles.timeValue}>{prefs.journal_reminder_time || '21:00'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Other Reminders Card */}
        <View style={styles.notificationCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <View style={[styles.cardIconGradient, { backgroundColor: '#B8A8E6' }]}>
                <Text style={styles.emojiIcon}>🔔</Text>
              </View>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Other Reminders</Text>
            </View>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.settingRowInCard}>
              <Text style={styles.settingLabel}>Session Reminders</Text>
              <Switch 
                value={!!prefs.session_reminders_enabled}
                onValueChange={(v) => setPrefs({ ...prefs, session_reminders_enabled: v })}
                trackColor={{ false: '#5B5270', true: '#B8A8E6' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingRowInCard}>
              <Text style={styles.settingLabel}>Goal Reminders</Text>
              <Switch 
                value={!!prefs.goal_reminders_enabled}
                onValueChange={(v) => setPrefs({ ...prefs, goal_reminders_enabled: v })}
                trackColor={{ false: '#5B5270', true: '#B8A8E6' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.settingRowInCard}>
              <Text style={styles.settingLabel}>Therapist Messages</Text>
              <Switch 
                value={!!prefs.therapist_messages_enabled}
                onValueChange={(v) => setPrefs({ ...prefs, therapist_messages_enabled: v })}
                trackColor={{ false: '#5B5270', true: '#B8A8E6' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {showMoodPicker && (
          <View style={styles.pickerCard}>
            <DateTimePicker
              value={parseMoodTime(prefs?.mood_reminder_time)}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minuteInterval={1}
              onChange={(e, date) => {
                if (Platform.OS === 'android') {
                  setShowMoodPicker(false);
                  if (e.type === 'dismissed') return;
                }
                if (date) {
                  const hrs = date.getHours().toString().padStart(2, '0');
                  const min = date.getMinutes().toString().padStart(2, '0');
                  setPrefs({ ...prefs, mood_reminder_time: `${hrs}:${min}` });
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.pickerDoneButton} onPress={() => setShowMoodPicker(false)}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showJournalPicker && (
          <View style={styles.pickerCard}>
            <DateTimePicker
              value={parseJournalTime(prefs?.journal_reminder_time)}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minuteInterval={1}
              onChange={(e, date) => {
                if (Platform.OS === 'android') {
                  setShowJournalPicker(false);
                  if (e.type === 'dismissed') return;
                }
                if (date) {
                  const hrs = date.getHours().toString().padStart(2, '0');
                  const min = date.getMinutes().toString().padStart(2, '0');
                  setPrefs({ ...prefs, journal_reminder_time: `${hrs}:${min}` });
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.pickerDoneButton} onPress={() => setShowJournalPicker(false)}>
                <Text style={styles.pickerDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <FontAwesome name="save" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function parseTimeValue(value: string | null | undefined, fallbackHour: number, fallbackMinute: number): Date {
  const now = new Date();
  const parsed = new Date(now);

  if (typeof value !== 'string' || !value.trim()) {
    parsed.setHours(fallbackHour, fallbackMinute, 0, 0);
    return parsed;
  }

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    parsed.setHours(fallbackHour, fallbackMinute, 0, 0);
    return parsed;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    parsed.setHours(fallbackHour, fallbackMinute, 0, 0);
    return parsed;
  }

  parsed.setHours(hours, minutes, 0, 0);
  return parsed;
}

function parseMoodTime(rawTime?: string | null): Date {
  return parseTimeValue(rawTime, 20, 0);
}

function parseJournalTime(rawTime?: string | null): Date {
  return parseTimeValue(rawTime, 21, 0);
}

async function ensureLocalNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

function parseHoursMinutes(rawTime: string | null | undefined, fallbackHour: number, fallbackMinute: number): { hour: number; minute: number } {
  const parsedDate = parseTimeValue(rawTime, fallbackHour, fallbackMinute);
  return {
    hour: parsedDate.getHours(),
    minute: parsedDate.getMinutes(),
  };
}

async function cancelReminderByType(reminderType: 'mood_reminder' | 'journal_reminder'): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const matching = scheduled.filter((item) => {
    const data = item.content.data as Record<string, unknown> | undefined;
    return data?.reminderType === reminderType;
  });

  await Promise.all(matching.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}

async function scheduleDailyReminder(
  reminderType: 'mood_reminder' | 'journal_reminder',
  enabled: boolean,
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<void> {
  await cancelReminderByType(reminderType);

  if (!enabled) {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 200, 250],
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { reminderType },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    },
  });
}

async function syncLocalDailyReminders(prefs: any): Promise<{ ok: boolean }> {
  const hasPermission = await ensureLocalNotificationPermissions();
  if (!hasPermission) {
    return { ok: false };
  }

  const moodTime = parseHoursMinutes(prefs?.mood_reminder_time, 20, 0);
  const journalTime = parseHoursMinutes(prefs?.journal_reminder_time, 21, 0);

  await scheduleDailyReminder(
    'mood_reminder',
    !!prefs?.mood_reminder_enabled,
    moodTime.hour,
    moodTime.minute,
    'Mood Check-in Reminder',
    'How are you feeling right now? Take a quick moment to log your mood.'
  );

  await scheduleDailyReminder(
    'journal_reminder',
    !!prefs?.journal_reminder_enabled,
    journalTime.hour,
    journalTime.minute,
    'Journal Reminder',
    'Take a few minutes to write your journal entry for today.'
  );

  return { ok: true };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#342949',
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
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 10,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 52,
    padding: 8,
    zIndex: 10,
  },
  notificationsButton: {
    position: 'absolute',
    right: 20,
    top: 52,
    padding: 8,
    zIndex: 10,
  },
  notificationsBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#FF6B86',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#342949',
  },
  notificationsBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerWhite: {
    color: '#FFFFFF',
  },
  headerPurple: {
    color: '#B8A8E6',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#473F5A',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderTopWidth: 6,
    borderTopColor: '#A78BFA',
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 12,
    color: '#FFFFFF',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  settingLabel: {
    color: '#B8A8E6',
    fontSize: 14,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
  },
  timeLabel: {
    color: '#B8A8E6',
    fontSize: 14,
    fontWeight: '600',
  },
  timeValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#A78BFA',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pageSubtitle: {
    color: '#B8A8E6',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: -10,
  },
  notificationCard: {
    backgroundColor: '#473F5A',
    borderRadius: 14,
    marginBottom: 16,
    padding: 16,
    borderTopWidth: 4,
    borderTopColor: '#A78BFA',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconContainer: {
    marginRight: 12,
  },
  cardIconGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiIcon: {
    fontSize: 24,
  },
  cardHeaderText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardStatus: {
    fontSize: 12,
    color: '#B8A8E6',
    fontWeight: '600',
  },
  cardContent: {
    marginTop: 8,
  },
  settingRowInCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pickerCard: {
    backgroundColor: '#473F5A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
    marginBottom: 14,
    overflow: 'hidden',
  },
  pickerDoneButton: {
    alignSelf: 'flex-end',
    marginRight: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#A78BFA',
  },
  pickerDoneText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
