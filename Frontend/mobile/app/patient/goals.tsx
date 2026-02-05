import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
// import { router } from 'expo-router';
// import { useTheme } from '../contexts/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { LinearGradient } from 'expo-linear-gradient';
import PatientService, { PatientGoal, CreatePatientGoalData } from '../services/patient.service';

// Helper: convert hex color to rgba string with alpha for RN styles
const hexWithAlpha = (hex: string, alpha: number) => {
  try {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h;
    const intVal = parseInt(full, 16);
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (e) {
    return hex; // fallback
  }
};

const formatDate = (d?: string | null) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString();
  } catch (e) { return d; }
};

const GoalsScreen: React.FC = () => {
  // const { themeStyle } = useTheme();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState<PatientGoal[]>([]);
  const [createVisible, setCreateVisible] = useState(false);
  const [updateVisible, setUpdateVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<PatientGoal | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium');
  const [targetDate, setTargetDate] = useState('');
  const [progress, setProgress] = useState<string>('0');

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await PatientService.getGoals();
      setGoals(data || []);
    } catch (e) {
      console.warn('Failed to load goals', e);
      Alert.alert('Error', 'Could not load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGoals(); }, []);

  const openCreate = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setTargetDate('');
    setProgress('0');
    setCreateVisible(true);
  };

  const submitCreate = async () => {
    if (!title.trim()) return Alert.alert('Validation', 'Title is required');
    const payload: CreatePatientGoalData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      target_date: targetDate || undefined,
      progress_percentage: Number(progress) || 0,
      milestones: undefined,
    };
    try {
      setLoading(true);
      await PatientService.createGoal(payload);
      setCreateVisible(false);
      await loadGoals();
    } catch (e) {
      console.warn('Create goal failed', e);
      Alert.alert('Error', 'Could not create goal');
    } finally { setLoading(false); }
  };

  const openUpdateProgress = (goal: PatientGoal) => {
    setSelectedGoal(goal);
    setProgress(String(goal.progress_percentage || 0));
    setUpdateVisible(true);
  };

  // Edit goal
  const [editVisible, setEditVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PatientGoal | null>(null);

  const openEdit = (goal: PatientGoal) => {
    setEditingGoal(goal);
    setTitle(goal.title || '');
    setDescription(goal.description || '');
    setPriority((goal.priority as 'low'|'medium'|'high') || 'medium');
    setTargetDate(goal.target_date || '');
    setProgress(String(goal.progress_percentage || 0));
    setEditVisible(true);
  };

  const submitEdit = async () => {
    if (!editingGoal) return;
    if (!title.trim()) return Alert.alert('Validation', 'Title is required');
    try {
      setLoading(true);
      await PatientService.partialUpdateGoal(editingGoal.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        target_date: targetDate || null,
        progress_percentage: Number(progress) || 0,
      });
      setEditVisible(false);
      setEditingGoal(null);
      await loadGoals();
    } catch (e) {
      console.warn('Edit goal failed', e);
      Alert.alert('Error', 'Could not update goal');
    } finally { setLoading(false); }
  };

  const handleDelete = (goal: PatientGoal) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          setLoading(true);
          await PatientService.deleteGoal(goal.id);
          await loadGoals();
        } catch (e) {
          console.warn('Delete failed', e);
          Alert.alert('Error', 'Could not delete goal');
        } finally { setLoading(false); }
      }}
    ]);
  };

  const submitUpdateProgress = async () => {
    if (!selectedGoal) return;
    const pct = Number(progress);
    if (isNaN(pct) || pct < 0 || pct > 100) return Alert.alert('Validation', 'Progress must be 0-100');
    try {
      setLoading(true);
      await PatientService.partialUpdateGoal(selectedGoal.id, { progress_percentage: pct, status: pct >= 100 ? 'completed' : 'in_progress' });
      setUpdateVisible(false);
      setSelectedGoal(null);
      await loadGoals();
    } catch (e) {
      console.warn('Update progress failed', e);
      Alert.alert('Error', 'Could not update progress');
    } finally { setLoading(false); }
  };

  const renderGoal = ({ item }: { item: PatientGoal }) => {
    const pct = item.progress_percentage || 0;
    const accent = item.priority === 'high' ? '#FF6B6B' : item.priority === 'medium' ? '#FF9F6B' : '#34D399';
    return (
      <View style={[styles.card, { borderTopColor: accent }]}> 
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={[styles.badgePill, { backgroundColor: hexWithAlpha(accent, 0.12), borderColor: accent }]}>
            <Text style={[styles.badgePillText, { color: accent }]}>{item.priority_display || item.priority}</Text>
          </View>
        </View>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}

        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressPercent}>{pct}%</Text>
        </View>

        <View style={styles.progressBarBackground}>
          <LinearGradient colors={[accent, '#60a5fa']} start={[0,0]} end={[1,0]} style={[styles.progressBarFill, { width: `${pct}%` }]} />
        </View>

        <View style={styles.targetPillRow}>
          <View style={styles.targetPill}><FontAwesome name="calendar" size={14} color="#06b6d4" style={{ marginRight: 8 }} /><Text style={styles.targetPillText}>Target: {item.target_date || '—'}</Text></View>
        </View>

        <View style={styles.actionRowContainer}>
          <TouchableOpacity style={[styles.actionWrapper]} onPress={() => openUpdateProgress(item)} activeOpacity={0.9}>
            <LinearGradient colors={[ '#ff6ea5', '#ff9f6b' ]} start={[0,0]} end={[1,0]} style={styles.actionGradient}>
              <FontAwesome5 name="chart-line" size={14} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.actionText}>Update</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionWrapper]} onPress={() => openEdit(item)} activeOpacity={0.9}>
            <View style={[styles.editButton]}> 
              <FontAwesome name="pencil" size={14} color="#1e3a8a" style={{ marginRight: 8 }} />
              <Text style={[styles.editText]}>Edit</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionWrapper]} onPress={() => handleDelete(item)} activeOpacity={0.9}>
            <View style={[styles.deleteButton]}> 
              <FontAwesome name="trash" size={14} color="#dc2626" style={{ marginRight: 8 }} />
              <Text style={[styles.deleteText]}>Delete</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const activeGoals = goals.filter(g => g.status !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <View style={styles.container}> 
      <View style={styles.headerRow}>
        <Text style={styles.header}>My Goals</Text>
      </View>

      <View style={styles.ctaWrap}> 
        <TouchableOpacity onPress={openCreate} activeOpacity={0.9}>
          <LinearGradient colors={[ '#FF6EA5', '#FFB870', '#2BD3B6' ]} start={[0,0]} end={[1,0]} style={styles.ctaButton}>
            <Text style={styles.ctaText}>+ Add New Goal</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={{ height: 14 }} />

      <View style={styles.sectionHeader}> 
        <LinearGradient colors={[ '#FF6EA5', '#FFB870', '#2BD3B6' ]} start={[0,0]} end={[0,1]} style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>Active Goals ({activeGoals.length})</Text>
      </View>

      {loading ? <ActivityIndicator size="large" /> : (
        <FlatList
          data={activeGoals}
          keyExtractor={g => g.id}
          renderItem={renderGoal}
          ListEmptyComponent={<Text style={styles.empty}>No active goals. Tap + to add one.</Text>}
        />
      )}

      {completedGoals.length > 0 && (
        <View style={styles.completedSection}>
          <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Completed Goals ({completedGoals.length})</Text>
            </View>

          <FlatList
            data={completedGoals}
            keyExtractor={g => g.id}
            renderItem={({ item }) => (
              <View style={styles.completedCardWrapper}>
                <View style={[styles.completedCardInner, { borderTopWidth: 6, borderTopColor: '#10B981' }]}>
                    <View style={styles.completedCardContent}>
                      <View style={styles.completedIconWrap}>
                        <View style={styles.completedIconCircle}><FontAwesome5 name="bullseye" size={18} color="#fff" /></View>
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.title}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                          <View style={styles.completedBadge}><FontAwesome name="check" size={12} color="#065f46" style={{ marginRight: 6 }} /><Text style={styles.completedBadgeText}>Completed</Text></View>
                          <Text style={[styles.small, { marginLeft: 12, color: '#6b7280' }]}>{formatDate(item.completed_date || item.updated_at)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
              </View>
            )}
          />
        </View>
      )}

      {/* Create Modal */}
      <Modal visible={createVisible} animationType="slide" transparent={Platform.OS === 'ios' ? true : false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalInner}>
            <Text style={styles.modalTitle}>Create Goal</Text>
            <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />
            <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={[styles.input, {height:80}]} multiline />
            <TextInput placeholder="Target Date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} style={styles.input} />
            <View style={styles.row}> 
              <TextInput style={[styles.input, {flex:1}]} value={progress} onChangeText={setProgress} keyboardType="numeric" placeholder="Initial progress %" />
              <TouchableOpacity onPress={() => setPriority(p => p === 'low' ? 'medium' : p === 'medium' ? 'high' : 'low')} style={styles.priorityToggle}><Text>{priority}</Text></TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCreateVisible(false)} style={styles.cancelBtn}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitCreate} style={styles.saveBtn}><Text style={{color:'#fff'}}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editVisible} animationType="slide" transparent={Platform.OS === 'ios' ? true : false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalInner}>
            <Text style={styles.modalTitle}>Edit Goal</Text>
            <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />
            <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={[styles.input, {height:80}]} multiline />
            <TextInput placeholder="Target Date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} style={styles.input} />
            <View style={styles.row}>
              <TextInput style={[styles.input, {flex:1}]} value={progress} onChangeText={setProgress} keyboardType="numeric" placeholder="Progress %" />
              <TouchableOpacity onPress={() => setPriority(p => p === 'low' ? 'medium' : p === 'medium' ? 'high' : 'low')} style={styles.priorityToggle}><Text>{priority}</Text></TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setEditVisible(false); setEditingGoal(null); }} style={styles.cancelBtn}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitEdit} style={styles.saveBtn}><Text style={{color:'#fff'}}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Progress Modal */}
      <Modal visible={updateVisible} animationType="slide" transparent={Platform.OS === 'ios' ? true : false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalInner}>
            <Text style={styles.modalTitle}>Update Progress</Text>
            <Text style={styles.small}>{selectedGoal?.title}</Text>
            <TextInput value={progress} onChangeText={setProgress} keyboardType="numeric" style={styles.input} placeholder="Progress % (0-100)" />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setUpdateVisible(false); setSelectedGoal(null); }} style={styles.cancelBtn}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitUpdateProgress} style={styles.saveBtn}><Text style={{color:'#fff'}}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GoalsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  headerRow: { alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  header: { fontSize: 20, fontWeight: '800', color: '#524f85' },
  ctaWrap: { paddingHorizontal: 6, marginBottom: 12 },
  
  ctaButton: { paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
  sectionAccent: { width: 4, height: 22, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginLeft: 8 },
  targetPillRow: { marginTop: 10 },
  targetPill: { backgroundColor: '#E6FFFA', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  targetPillText: { color: '#0ea5a0', fontWeight: '600' },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  progressLabel: { color: '#6b7280', fontWeight: '600' },
  progressPercent: { color: '#374151', fontWeight: '800' },
  actionRowContainer: { flexDirection: 'row', marginTop: 14, justifyContent: 'space-between' },
  actionWrapper: { flex: 1, marginHorizontal: 6 },
  actionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#1e3a8a' },
  editText: { color: '#1e3a8a', fontWeight: '800', fontSize: 13 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#fecaca' },
  deleteText: { color: '#dc2626', fontWeight: '800', fontSize: 13 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 14, marginBottom: 14, borderTopWidth: 6, borderTopColor: '#60a5fa', shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  desc: { marginTop: 8, color: '#6b7280' },
  progressBarBackground: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 6, marginTop: 12, overflow: 'hidden' },
  progressBarFill: { height: 10, borderRadius: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  rowRight: { alignItems: 'flex-end', marginTop: 8 },
  small: { fontSize: 12, color: '#64748b' },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginLeft: 8 },
  smallBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  badgePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  badgePillText: { fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, color: '#9ca3af' },
  completedSection: { marginTop: 20 },
  completedCardWrapper: { marginBottom: 12 },
  completedCardInner: { backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 2 },
  completedCardContent: { flexDirection: 'row', alignItems: 'center' },
  completedIconWrap: { marginLeft: 0 },
  completedIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  completedBadge: { backgroundColor: '#ECFDF5', borderColor: '#10B981', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  completedBadgeText: { color: '#065f46', fontWeight: '700', fontSize: 13 },
  
  
  
  /* removed duplicate left-border style to match mock */
  completedCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 2 },
  completedCardWrapper: { marginBottom: 12 },
  subHeader: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#374151' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalInner: { width: '92%', backgroundColor: '#fff', borderRadius: 8, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, marginBottom: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { padding: 8, marginRight: 8 },
  saveBtn: { backgroundColor: '#10b981', padding: 8, borderRadius: 6 },
  priorityToggle: { padding: 8, marginLeft: 8, backgroundColor: '#f1f5f9', borderRadius: 6 },
  smallActionRow: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { marginLeft: 8 },
  editBtn: { marginLeft: 8 },
  deleteBtn: { marginLeft: 8 },
});
