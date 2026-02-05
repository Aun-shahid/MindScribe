import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import PatientService from '../services/patient.service';
import { router } from 'expo-router';

const ACTIVITY_TYPES = [
  'exercise','meditation','social','work','hobby','therapy','rest','outdoor','creative','music','reading','cooking','study','other'
];

export default function LogActivity() {
  const { themeStyle } = useTheme();
  const [activityType, setActivityType] = useState<string>('exercise');
  const [activityName, setActivityName] = useState<string>('');
  const [duration, setDuration] = useState<string>('30');
  const [intensity, setIntensity] = useState<string>('5');
  const [moodBefore, setMoodBefore] = useState<string>('3');
  const [moodAfter, setMoodAfter] = useState<string>('4');
  const [energyBefore, setEnergyBefore] = useState<string>('3');
  const [energyAfter, setEnergyAfter] = useState<string>('4');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    if (!activityName || activityName.trim().length === 0) {
      Alert.alert('Validation', 'Please enter activity name');
      return;
    }

    const payload = {
      activity_type: activityType,
      activity_name: activityName,
      description: notes,
      duration_minutes: Number(duration) || null,
      intensity: Number(intensity) || null,
      mood_before: Number(moodBefore) || null,
      mood_after: Number(moodAfter) || null,
      energy_before: Number(energyBefore) || null,
      energy_after: Number(energyAfter) || null,
      activity_date: date.toISOString(),
    };

    try {
      setSaving(true);
      await PatientService.createActivity(payload);
      Alert.alert('Saved', 'Activity logged');
      router.back();
    } catch (err) {
      console.error('[LogActivity] save error', err);
      Alert.alert('Error', 'Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}> 
      <View style={styles.container}>
        <Text style={[styles.title, { color: themeStyle.title }]}>Log Activity</Text>

        <View style={[styles.field, { backgroundColor: themeStyle.dashboardcard || '#fff' }]}>
          <Text style={{ color: themeStyle.label }}>Activity Type</Text>
          <TouchableOpacity style={styles.select} onPress={() => Alert.alert('Select', 'Use the picker below (quick select)') }>
            <Text>{activityType}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {ACTIVITY_TYPES.map((t) => (
              <TouchableOpacity key={t} style={[styles.typeBtn, activityType === t ? { borderColor: themeStyle.primary, borderWidth: 2 } : {}]} onPress={() => setActivityType(t)}>
                <Text style={{ color: themeStyle.text }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.field, { backgroundColor: themeStyle.dashboardcard || '#fff' }]}>
          <Text style={{ color: themeStyle.label }}>Activity Name</Text>
          <TextInput value={activityName} onChangeText={setActivityName} placeholder="What did you do?" style={[styles.input, { color: themeStyle.text }]} />
        </View>

        <View style={[styles.row, { marginTop: 8 }]}> 
          <View style={[styles.fieldHalf, { backgroundColor: themeStyle.dashboardcard || '#fff' }]}>
            <Text style={{ color: themeStyle.label }}>Duration (min)</Text>
            <TextInput keyboardType="numeric" value={duration} onChangeText={setDuration} style={[styles.input, { color: themeStyle.text }]} />
          </View>
          <View style={[styles.fieldHalf, { backgroundColor: themeStyle.dashboardcard || '#fff' }]}>
            <Text style={{ color: themeStyle.label }}>Intensity (1-10)</Text>
            <TextInput keyboardType="numeric" value={intensity} onChangeText={setIntensity} style={[styles.input, { color: themeStyle.text }]} />
          </View>
        </View>

        <View style={[styles.field, { backgroundColor: themeStyle.dashboardcard || '#fff' }]}>
          <Text style={{ color: themeStyle.label }}>Mood</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ color: themeStyle.label }}>Before</Text>
              <TextInput keyboardType="numeric" value={moodBefore} onChangeText={setMoodBefore} style={[styles.input, { color: themeStyle.text }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: themeStyle.label }}>After</Text>
              <TextInput keyboardType="numeric" value={moodAfter} onChangeText={setMoodAfter} style={[styles.input, { color: themeStyle.text }]} />
            </View>
          </View>
        </View>

        <View style={[styles.field, { backgroundColor: themeStyle.dashboardcard || '#fff' }]}>
          <Text style={{ color: themeStyle.label }}>Energy</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ color: themeStyle.label }}>Before</Text>
              <TextInput keyboardType="numeric" value={energyBefore} onChangeText={setEnergyBefore} style={[styles.input, { color: themeStyle.text }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: themeStyle.label }}>After</Text>
              <TextInput keyboardType="numeric" value={energyAfter} onChangeText={setEnergyAfter} style={[styles.input, { color: themeStyle.text }]} />
            </View>
          </View>
        </View>

        <View style={[styles.field, { backgroundColor: themeStyle.dashboardcard || '#fff' }]}>
          <Text style={{ color: themeStyle.label }}>Notes (optional)</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Any additional thoughts..." style={[styles.input, { color: themeStyle.text, height: 80 }]} multiline />
        </View>

        <View style={{ marginTop: 12 }}>
          <TouchableOpacity style={[styles.dateBtn, { backgroundColor: themeStyle.dashboardcard || '#fff' }]} onPress={() => setShowPicker(true)}>
            <Text style={{ color: themeStyle.text }}>Date: {date.toLocaleString()}</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker value={date} mode="datetime" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(e, d) => { setShowPicker(false); if (d) setDate(d); }} />
          )}
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: themeStyle.primary }]} onPress={onSubmit} disabled={saving}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Saving...' : 'Log Activity'}</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  field: { padding: 12, borderRadius: 12, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e6e6e6', borderRadius: 8, padding: 10, marginTop: 6 },
  select: { padding: 12, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: '#eee' },
  typeBtn: { padding: 8, borderRadius: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  fieldHalf: { flex: 1, padding: 12, borderRadius: 12, marginBottom: 12, marginRight: 8 },
  dateBtn: { padding: 12, borderRadius: 8 },
  saveBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
});
