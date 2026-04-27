// import React, { useEffect, useState } from 'react';
// import { SafeAreaView, View, Text, TouchableOpacity, FlatList, StyleSheet, RefreshControl } from 'react-native';
// import { useTheme } from '../contexts/ThemeContext';
// import PatientService from '../services/patient.service';
// import { router } from 'expo-router';
// import TabLoaderCard from '../components/TabLoaderCard';

// export default function Activities() {
//   const { themeStyle } = useTheme();
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [activities, setActivities] = useState<any[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   const load = async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       const data = await PatientService.getActivities();
//       setActivities(data || []);
//     } catch (err) {
//       console.error('[Activities] load error', err);
//       setError('Failed to load activities');
//       setActivities([]);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => { load(); }, []);

//   const onRefresh = () => {
//     setRefreshing(true);
//     load();
//   };

//   const renderItem = ({ item }: { item: any }) => (
//     <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard || '#fff' }]}>
//       <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
//         <View>
//           <Text style={[styles.type, { color: themeStyle.title }]}>{item.activity_type}</Text>
//           <Text style={[styles.title, { color: themeStyle.title }]}>{item.activity_name}</Text>
//           <Text style={[styles.date, { color: themeStyle.label }]}>{new Date(item.activity_date).toLocaleString()}</Text>
//         </View>
//         <View style={{ alignItems: 'flex-end' }}>
//           {item.duration_minutes ? <Text style={{ color: themeStyle.label }}>{item.duration_minutes} min</Text> : null}
//         </View>
//       </View>

//       <View style={styles.row}>
//         <Text style={{ color: themeStyle.label }}>Mood</Text>
//         <Text style={{ color: themeStyle.text }}>{item.mood_before ?? '-'} → {item.mood_after ?? '-'}</Text>
//       </View>
//       <View style={styles.row}>
//         <Text style={{ color: themeStyle.label }}>Energy</Text>
//         <Text style={{ color: themeStyle.text }}>{item.energy_before ?? '-'} → {item.energy_after ?? '-'}</Text>
//       </View>
//     </View>
//   );

//   try {
//     return (
//       <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}> 
//         <View style={styles.headerRow}>
//           <Text style={[styles.headerTitle, { color: themeStyle.title }]}>Activities</Text>
//           <TouchableOpacity style={[styles.addBtn, { backgroundColor: themeStyle.primary }]} onPress={() => router.push('./log-activity' as any)}>
//             <Text style={{ color: '#fff', fontWeight: '700' }}>+ Log Activity</Text>
//           </TouchableOpacity>
//         </View>

//         {loading ? (
//           <TabLoaderCard
//             title="Loading activities..."
//             subtitle="Fetching your recent activity logs"
//             spinnerColor={themeStyle.text}
//           />
//         ) : error ? (
//           <View style={{ padding: 16 }}>
//             <Text style={{ color: themeStyle.label, marginBottom: 12 }}>{error}</Text>
//             <TouchableOpacity style={[styles.addBtn, { backgroundColor: themeStyle.primary }]} onPress={() => { setError(null); load(); }}>
//               <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
//             </TouchableOpacity>
//           </View>
//         ) : (
//           <FlatList
//             data={activities}
//             keyExtractor={(item) => item.id}
//             renderItem={renderItem}
//             refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//             contentContainerStyle={{ padding: 16 }}
//             ListEmptyComponent={() => (
//               <View style={{ padding: 16 }}>
//                 <Text style={{ color: themeStyle.label }}>No activities logged yet.</Text>
//               </View>
//             )}
//           />
//         )}
//       </SafeAreaView>
//     );
//   } catch (e) {
//     console.error('[Activities] render error', e);
//     return (
//       <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}> 
//         <View style={styles.headerRow}>
//           <Text style={[styles.headerTitle, { color: themeStyle.title }]}>Activities</Text>
//           <TouchableOpacity style={[styles.addBtn, { backgroundColor: themeStyle.primary }]} onPress={() => router.push('./log-activity' as any)}>
//             <Text style={{ color: '#fff', fontWeight: '700' }}>+ Log Activity</Text>
//           </TouchableOpacity>
//         </View>
//         <View style={{ padding: 16 }}>
//           <Text style={{ color: themeStyle.label }}>An unexpected error occurred.</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }
// }

// const styles = StyleSheet.create({
//   wrapper: { flex: 1 },
//   headerRow: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   headerTitle: { fontSize: 22, fontWeight: '700' },
//   addBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
//   card: { borderRadius: 12, padding: 14, marginBottom: 12, elevation: 1 },
//   type: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
//   title: { fontSize: 16, fontWeight: '700' },
//   date: { fontSize: 12, marginTop: 6 },
//   row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
// });
