import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import PatientService from '../services/patient.service';
import { router } from 'expo-router';

const EMOTIONS = ['joy','sadness','anger','fear','anxiety','love','guilt','shame','pride','hope','gratitude','confusion'];

export default function EmotionalInsightsPage(){
  const { themeStyle } = useTheme();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [filterEmotion, setFilterEmotion] = useState<string | null>(null);
  const [filterResolved, setFilterResolved] = useState<'all'|'true'|'false'>('all');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({ primary_emotion: 'anxiety', intensity: 5, what_happened: '', body_sensations:'', thoughts:'', behaviors:'', insights_learned:'', coping_strategies:'', is_resolved:false, helpfulness_rating: null });
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const loadList = async () => {
    try{
      setLoading(true);
      const params: any = {};
      if(filterEmotion) params.emotion = filterEmotion;
      if(filterResolved !== 'all') params.resolved = filterResolved;
      const data = await PatientService.getEmotionalInsights({ emotion: params.emotion, resolved: params.resolved === 'true' ? true : undefined });
      setItems(data || []);
    }catch(e){
      console.error('[EmotionalInsights] list error', e);
      Alert.alert('Error', 'Failed to load emotional insights');
    }finally{ setLoading(false); }
  }

  const loadAnalytics = async () => {
    try{
      setAnalyticsLoading(true);
      const res = await PatientService.getEmotionalInsightsAnalytics();
      setAnalytics(res);
    }catch(e){
      console.error('[EmotionalInsights] analytics error', e);
    }finally{ setAnalyticsLoading(false); }
  }

  useEffect(()=>{ loadList(); loadAnalytics(); },[]);

  const onCreate = async () => {
    // basic validation
    if(!form.what_happened || form.what_happened.trim().length < 3){ Alert.alert('Validation', 'Please describe what happened'); return; }
    try{
      setCreating(true);
      await PatientService.createEmotionalInsight(form);
      setForm({ primary_emotion: 'anxiety', intensity: 5, what_happened: '', body_sensations:'', thoughts:'', behaviors:'', insights_learned:'', coping_strategies:'', is_resolved:false, helpfulness_rating: null });
      await loadList();
      await loadAnalytics();
      Alert.alert('Saved', 'Emotional insight recorded');
    }catch(e){
      console.error('[EmotionalInsights] create error', e);
      Alert.alert('Error', 'Failed to save');
    }finally{ setCreating(false); }
  }

  const onDelete = async (id: string) => {
    Alert.alert('Delete', 'Delete this entry?', [ { text: 'Cancel', style:'cancel' }, { text:'Delete', style:'destructive', onPress: async ()=>{
      try{ await PatientService.deleteEmotionalInsight(id); await loadList(); await loadAnalytics(); }catch(e){ Alert.alert('Error','Delete failed'); }
    }}]);
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: themeStyle.dashboardcard || '#fff' }]} onPress={() => router.push(`./emotional-insights/${item.id}` as any)}>
      <View style={{flexDirection:'row', justifyContent:'space-between'}}>
        <Text style={[styles.cardTitle, { color: themeStyle.title }]}>{item.emotion_display || item.primary_emotion} · Intensity {item.intensity}</Text>
        <Text style={{ color: themeStyle.label }}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text numberOfLines={3} style={{ color: themeStyle.text, marginTop:8 }}>{item.what_happened}</Text>
      <View style={{flexDirection:'row', marginTop:10, justifyContent:'flex-end'}}>
        <TouchableOpacity onPress={()=>router.push(`./emotional-insights/${item.id}` as any)} style={{ marginRight:12 }}><Text style={{ color:'#2b6cb0' }}>View</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>onDelete(item.id)}><Text style={{ color:'#b94a4a' }}>Delete</Text></TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const HeaderComponent = () => (
    <>
      <Text style={[styles.title, { color: themeStyle.title }]}>Emotional Insights</Text>

      <View style={styles.filterRow}>
        <Text style={{ color: themeStyle.label, marginBottom:6 }}>Filter by emotion</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:8 }}>
          {EMOTIONS.map(e=> (
            <TouchableOpacity key={e} onPress={()=>{ setFilterEmotion(filterEmotion===e?null:e); setTimeout(loadList,0); }} style={{ padding:8, marginRight:8, backgroundColor: filterEmotion===e? '#6b4cff':'transparent', borderRadius:8 }}>
              <Text style={{ color: filterEmotion===e? '#fff': themeStyle.text }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection:'row', alignItems:'center', marginTop:6 }}>
          <TouchableOpacity onPress={()=>{ setFilterResolved('all'); setTimeout(loadList,0); }} style={{ marginRight:12 }}><Text style={{ color: filterResolved==='all'? '#6b4cff': themeStyle.text }}>All</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>{ setFilterResolved('true'); setTimeout(loadList,0); }} style={{ marginRight:12 }}><Text style={{ color: filterResolved==='true'? '#6b4cff': themeStyle.text }}>Resolved</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>{ setFilterResolved('false'); setTimeout(loadList,0); }}><Text style={{ color: filterResolved==='false'? '#6b4cff': themeStyle.text }}>Unresolved</Text></TouchableOpacity>
        </View>
      </View>

      <View style={{ marginTop: 12, marginBottom: 18 }}>
        <Text style={{ color: themeStyle.label, marginBottom:6 }}>Add new insight</Text>
        <View style={[styles.formRow, { backgroundColor: themeStyle.dashboardcard || '#fff' }]}>
          <Text style={{ color: themeStyle.label }}>Emotion</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical:6 }}>
            {EMOTIONS.map(e=> (
              <TouchableOpacity key={e} onPress={()=>setForm({...form, primary_emotion: e})} style={{ padding:8, marginRight:8, backgroundColor: form.primary_emotion===e? '#6b4cff':'transparent', borderRadius:8 }}>
                <Text style={{ color: form.primary_emotion===e? '#fff': themeStyle.text }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={{ color: themeStyle.label, marginTop:6 }}>Intensity (1-10)</Text>
          <TextInput
            value={String(form.intensity)}
            onChangeText={(t)=>{
              const v = Math.max(1, Math.min(10, Number(t.replace(/[^0-9]/g,'')) || 1));
              setForm({...form, intensity: v});
            }}
            keyboardType='numeric'
            style={[styles.input, { color: themeStyle.text }]}
            placeholder='e.g., 7'
          />

          <Text style={{ color: themeStyle.label, marginTop:6 }}>Why do you think this happened?</Text>
          <TextInput value={form.what_happened} onChangeText={(t)=>setForm({...form, what_happened: t})} placeholder='Reflect on the event — be specific about context and triggers' style={[styles.textarea, { color: themeStyle.text }]} multiline />

          <Text style={{ color: themeStyle.label, marginTop:6 }}>What did you notice in your body?</Text>
          <TextInput value={form.body_sensations} onChangeText={(t)=>setForm({...form, body_sensations: t})} placeholder='Physical sensations (tension, breath, heart rate, etc.)' style={[styles.textarea, { color: themeStyle.text }]} multiline />

          <Text style={{ color: themeStyle.label, marginTop:6 }}>What were your thoughts at the time?</Text>
          <TextInput value={form.thoughts} onChangeText={(t)=>setForm({...form, thoughts: t})} placeholder='Immediate thoughts or interpretations' style={[styles.textarea, { color: themeStyle.text }]} multiline />

          <Text style={{ color: themeStyle.label, marginTop:6 }}>How did you respond / what did you do?</Text>
          <TextInput value={form.behaviors} onChangeText={(t)=>setForm({...form, behaviors: t})} placeholder='Actions, reactions, coping attempts' style={[styles.textarea, { color: themeStyle.text }]} multiline />

          <Text style={{ color: themeStyle.label, marginTop:6 }}>What did you learn from this?</Text>
          <TextInput value={form.insights_learned} onChangeText={(t)=>setForm({...form, insights_learned: t})} placeholder='Any realizations or new perspectives' style={[styles.textarea, { color: themeStyle.text }]} multiline />

          <Text style={{ color: themeStyle.label, marginTop:6 }}>Coping strategies used (comma separated)</Text>
          <TextInput value={form.coping_strategies} onChangeText={(t)=>setForm({...form, coping_strategies: t})} placeholder='e.g., breathing, contacting friend, walk' style={[styles.input, { color: themeStyle.text }]} />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop:10, justifyContent:'space-between' }}>
            <View>
              <Text style={{ color: themeStyle.label }}>Resolved?</Text>
              <TouchableOpacity onPress={()=>setForm({...form, is_resolved: !form.is_resolved})} style={{ marginTop:6, padding:8, borderRadius:8, backgroundColor: form.is_resolved ? '#e6ffed' : 'transparent', borderWidth: 1, borderColor: form.is_resolved ? '#34c759' : '#ddd' }}>
                <Text style={{ color: form.is_resolved ? '#2e7d32' : themeStyle.text }}>{form.is_resolved ? 'Yes — Resolved' : 'No — Still Processing'}</Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text style={{ color: themeStyle.label }}>Helpfulness (1-5)</Text>
              <View style={{ flexDirection:'row', marginTop:6 }}>
                {[1,2,3,4,5].map((n)=> (
                  <TouchableOpacity key={n} onPress={()=>setForm({...form, helpfulness_rating: n})} style={{ padding:8, marginRight:6, borderRadius:8, backgroundColor: form.helpfulness_rating===n ? '#ffd54f' : 'transparent', borderWidth:1, borderColor: '#ddd' }}>
                    <Text style={{ color: themeStyle.text }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={onCreate} style={[styles.btn, { backgroundColor: '#6b4cff', marginTop:14 }]}>
            {creating ? <ActivityIndicator color='#fff' /> : <Text style={{ color:'#fff', fontWeight:'600' }}>Save Insight</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>Analytics</Text>
        {analyticsLoading ? <ActivityIndicator /> : analytics ? (
          <View style={[styles.formRow, { backgroundColor: themeStyle.dashboardcard || '#fff' }]}>
            <Text style={{ color: themeStyle.label }}>Total insights: <Text style={{ color: themeStyle.text }}>{analytics.total_insights}</Text></Text>
            <Text style={{ color: themeStyle.label }}>Resolved: <Text style={{ color: themeStyle.text }}>{analytics.resolved_count}</Text></Text>
            <Text style={{ color: themeStyle.label }}>Most explored: <Text style={{ color: themeStyle.text }}>{analytics.most_explored_emotion}</Text></Text>
            <Text style={{ color: themeStyle.label }}>Top strategies: <Text style={{ color: themeStyle.text }}>{(analytics.top_coping_strategies || []).join(', ')}</Text></Text>
          </View>
        ) : <Text style={{ color: themeStyle.label }}>No analytics available</Text>}
      </View>

      <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>Your Entries</Text>
    </>
  );

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={i=>i.id}
        contentContainerStyle={styles.container}
        ListHeaderComponent={HeaderComponent}
        ListEmptyComponent={loading ? <ActivityIndicator /> : <Text style={{ color: themeStyle.label }}>No entries</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex:1 },
  container: { padding: 16, paddingBottom: 100 },
  title: { fontSize:22, fontWeight:'700', marginBottom:12 },
  filterRow: { marginBottom: 8 },
  formRow: { padding:12, borderRadius:12 },
  input: { borderWidth:1, borderColor:'#ddd', padding:8, borderRadius:8, marginTop:6, marginBottom:6 },
  textarea: { borderWidth:1, borderColor:'#ddd', padding:8, borderRadius:8, minHeight:80, textAlignVertical:'top', marginTop:6 },
  btn: { padding:12, borderRadius:12, alignItems:'center' },
  sectionTitle: { fontSize:18, fontWeight:'700', marginBottom:8 },
  card: { padding:12, borderRadius:12, marginBottom:10 },
  cardTitle: { fontSize:16, fontWeight:'600' }
});
