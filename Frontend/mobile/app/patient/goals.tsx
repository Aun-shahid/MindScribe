import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Modal, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import PatientService, { PatientGoal, CreatePatientGoalData } from '../services/patient.service';

const GoalsScreen: React.FC = () => {
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
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={[styles.badge, item.priority === 'high' ? styles.badgeHigh : item.priority === 'medium' ? styles.badgeMed : styles.badgeLow]}>
            <Text style={styles.badgeText}>{item.priority_display || item.priority}</Text>
          </View>
        </View>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
        </View>
        <View style={styles.row}> 
          <Text style={styles.small}>Progress: {pct}%</Text>
          <Text style={styles.small}>Target: {item.target_date || '—'}</Text>
        </View>
        <View style={styles.rowRight}>
          <View style={styles.smallActionRow}>
            <TouchableOpacity style={[styles.smallBtn, styles.actionBtn]} onPress={() => openUpdateProgress(item)}>
              <Text style={styles.smallBtnText}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn, styles.editBtn]} onPress={() => openEdit(item)}>
              <Text style={styles.smallBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.smallBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
              <Text style={styles.smallBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const activeGoals = goals.filter(g => g.status !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Goals</Text>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}><Text style={styles.addBtnText}>＋</Text></TouchableOpacity>
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
          <Text style={styles.subHeader}>Completed</Text>
          <FlatList
            data={completedGoals}
            keyExtractor={g => g.id}
            renderItem={({ item }) => (
              <View style={[styles.card, styles.completedCard]}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.small}>{item.completed_date ? `Completed: ${item.completed_date}` : 'Completed'}</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  header: { fontSize: 24, fontWeight: '700' },
  addBtn: { backgroundColor: '#2b6cb0', borderRadius: 20, padding: 8, marginTop: 20 },
  addBtnText: { color: '#fff', fontSize: 20 },
  card: { backgroundColor: '#f7f7f8', padding: 12, borderRadius: 8, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  desc: { marginTop: 6, color: '#333' },
  progressBarBackground: { height: 8, backgroundColor: '#e6e6e6', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: '#48bb78' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  rowRight: { alignItems: 'flex-end', marginTop: 8 },
  small: { fontSize: 12, color: '#666' },
  smallBtn: { backgroundColor: '#3182ce', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  smallBtnText: { color: '#fff', fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12 },
  badgeHigh: { backgroundColor: '#e53e3e' },
  badgeMed: { backgroundColor: '#dd6b20' },
  badgeLow: { backgroundColor: '#718096' },
  empty: { textAlign: 'center', marginTop: 40, color: '#666' },
  completedSection: { marginTop: 12 },
  completedCard: { backgroundColor: '#eef2ff' },
  subHeader: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalInner: { width: '92%', backgroundColor: '#fff', borderRadius: 8, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, marginBottom: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { padding: 8, marginRight: 8 },
  saveBtn: { backgroundColor: '#2b6cb0', padding: 8, borderRadius: 6 },
  priorityToggle: { padding: 8, marginLeft: 8, backgroundColor: '#f1f5f9', borderRadius: 6 },
  smallActionRow: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { backgroundColor: '#3182ce', marginLeft: 8 },
  editBtn: { backgroundColor: '#f6ad55', marginLeft: 8 },
  deleteBtn: { backgroundColor: '#e53e3e', marginLeft: 8 },
});
