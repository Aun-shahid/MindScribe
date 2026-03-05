import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator, TouchableOpacity, Alert, Platform, ScrollView, Animated } from 'react-native';
import PatientService from '../services/patient.service';
import { useTheme } from '../contexts/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function NotificationSettings() {
  const { themeStyle } = useTheme();
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { load(); }, []);

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
  }, []);

  const save = async () => {
    try {
      await PatientService.updateNotificationPreferences(prefs);
      Alert.alert('Saved', 'Notification preferences updated');
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
    // expo-notifications is not available in Expo Go (SDK 53+).
    // Inform the user to use a dev/build client or a standalone app to enable push.
    Alert.alert(
      'Push not available in Expo Go',
      'Push notifications are not supported in Expo Go. Build a development client or a standalone app to enable push notifications.'
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
          <DateTimePicker
            value={parseMoodTime()}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(e, date) => {
              setShowMoodPicker(false);
              if (Platform.OS === 'android' && e.type === 'dismissed') return;
              if (date) {
                const hrs = date.getHours().toString().padStart(2, '0');
                const min = date.getMinutes().toString().padStart(2, '0');
                setPrefs({ ...prefs, mood_reminder_time: `${hrs}:${min}` });
              }
            }}
          />
        )}

        {showJournalPicker && (
          <DateTimePicker
            value={parseJournalTime()}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(e, date) => {
              setShowJournalPicker(false);
              if (Platform.OS === 'android' && e.type === 'dismissed') return;
              if (date) {
                const hrs = date.getHours().toString().padStart(2, '0');
                const min = date.getMinutes().toString().padStart(2, '0');
                setPrefs({ ...prefs, journal_reminder_time: `${hrs}:${min}` });
              }
            }}
          />
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <FontAwesome name="save" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>Save Preferences</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SettingRow({ label, value, onToggle, themeStyle }: any) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch 
        value={!!value} 
        onValueChange={onToggle}
        trackColor={{ false: '#5B5270', true: '#A78BFA' }}
        thumbColor={value ? '#FFFFFF' : '#B8A8E6'}
      />
    </View>
  );
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
});
