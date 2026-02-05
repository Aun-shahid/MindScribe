import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Switch, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import PatientService from '../services/patient.service';
import { useTheme } from '../contexts/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Device from 'expo-device';

export default function NotificationSettings() {
  const { themeStyle } = useTheme();
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showJournalPicker, setShowJournalPicker] = useState(false);

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
    return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={themeStyle.text} />;
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
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}> 
      <View style={styles.container}>
        <Text style={[styles.title, { color: themeStyle.title }]}>Notification Settings</Text>

        <SettingRow
          label="Push Notifications"
          value={prefs.push_enabled ?? !!prefs.push_token}
          onToggle={async (v: boolean) => {
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
          themeStyle={themeStyle}
        />

        <View style={[styles.section, { borderColor: themeStyle.border }]}> 
          <Text style={[styles.sectionTitle, { color: themeStyle.label }]}>Mood Check-in</Text>
          <SettingRow label="Daily Reminder" value={prefs.mood_reminder_enabled} onToggle={(v) => setPrefs({ ...prefs, mood_reminder_enabled: v })} themeStyle={themeStyle} />
          <TouchableOpacity style={styles.timeRow} onPress={() => setShowMoodPicker(true)}>
            <Text style={{ color: themeStyle.text }}>Reminder Time</Text>
            <Text style={{ color: themeStyle.label }}>{prefs.mood_reminder_time || '20:00'}</Text>
          </TouchableOpacity>
          {showMoodPicker && (
            <DateTimePicker value={new Date()} mode="time" display="spinner" onChange={(e, d) => { setShowMoodPicker(false); /* time saving omitted for brevity, server expects HH:MM */ }} />
          )}
        </View>

        <View style={[styles.section, { borderColor: themeStyle.border }]}> 
          <Text style={[styles.sectionTitle, { color: themeStyle.label }]}>Journal Reminder</Text>
          <SettingRow label="Daily Reminder" value={prefs.journal_reminder_enabled} onToggle={(v) => setPrefs({ ...prefs, journal_reminder_enabled: v })} themeStyle={themeStyle} />
          <TouchableOpacity style={styles.timeRow} onPress={() => setShowJournalPicker(true)}>
            <Text style={{ color: themeStyle.text }}>Reminder Time</Text>
            <Text style={{ color: themeStyle.label }}>{prefs.journal_reminder_time || '21:00'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { borderColor: themeStyle.border }]}> 
          <Text style={[styles.sectionTitle, { color: themeStyle.label }]}>Other Reminders</Text>
          <SettingRow label="Session Reminders" value={prefs.session_reminders_enabled} onToggle={(v) => setPrefs({ ...prefs, session_reminders_enabled: v })} themeStyle={themeStyle} />
          <SettingRow label="Goal Reminders" value={prefs.goal_reminders_enabled} onToggle={(v) => setPrefs({ ...prefs, goal_reminders_enabled: v })} themeStyle={themeStyle} />
          <SettingRow label="Therapist Messages" value={prefs.therapist_messages_enabled} onToggle={(v) => setPrefs({ ...prefs, therapist_messages_enabled: v })} themeStyle={themeStyle} />
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: themeStyle.primary }]} onPress={save}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Save Preferences</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SettingRow({ label, value, onToggle, themeStyle }: any) {
  return (
    <View style={styles.settingRow}>
      <Text style={{ color: themeStyle.text }}>{label}</Text>
      <Switch value={!!value} onValueChange={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { padding: 18 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  section: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  saveBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
});
