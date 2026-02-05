import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import PatientService, { RelaxationContent } from '../services/patient.service';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function VisualizationJourneysScreen() {
  const { themeStyle } = useTheme();
  const router = useRouter();
  const [content, setContent] = useState<RelaxationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await PatientService.getRelaxationContent({});
      // Strictly include visualization journeys: category 'visualization' or guided meditations
      // and explicitly exclude breathing/body-scan items which belong in the Breathing Exercises screen
      const items = data.filter(i => {
        const isVisualization = (i.category === 'visualization') || (i.content_type === 'guided_meditation');
        const isBreathing = (i.category === 'breathing') || (i.content_type === 'breathing') || (i.category === 'body_scan') || (i.content_type === 'body_scan');
        const titleLower = (i.title || '').toLowerCase();
        const titleIndicatesBreath = titleLower.includes('breath') || titleLower.includes('body scan') || titleLower.includes('body-scan');
        return isVisualization && !isBreathing && !titleIndicatesBreath;
      });
      setContent(items);
    } catch (e: any) {
      console.error('Failed to load visualizations', e);
      setError('Unable to load visualization journeys');
    } finally { setLoading(false); }
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor: themeStyle.background }]}>
      <ActivityIndicator size="large" color={themeStyle.button} />
      <Text style={{ color: themeStyle.text, marginTop: 12 }}>Loading visualization journeys...</Text>
    </View>
  );

  if (error) return (
    <View style={[styles.center, { backgroundColor: themeStyle.background }]}>
      <Text style={{ color: themeStyle.text }}>{error}</Text>
      <TouchableOpacity style={[styles.reloadBtn, { backgroundColor: themeStyle.button }]} onPress={load}><Text style={{ color: themeStyle.buttonText }}>Retry</Text></TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={[{ flex: 1, backgroundColor: themeStyle.background }]} contentContainerStyle={{ padding: 20 }}>
      <Text style={[styles.headerTitle, { color: themeStyle.title }]}>🌀 Visualization Journeys</Text>
      <Text style={[styles.lead, { color: themeStyle.label }]}>Experience guided visualization journeys to support relaxation, grounding, and mental imagery. Tap a journey to begin.</Text>

      <View style={{ marginTop: 16 }}>
        {content.length === 0 && (
          <View style={{ padding: 20, borderRadius: 12, backgroundColor: themeStyle.card }}>
            <Text style={{ color: themeStyle.text }}>No visualization journeys available right now.</Text>
          </View>
        )}

        {content.map(item => (
          <View key={item.id} style={[styles.journeyCard, { backgroundColor: themeStyle.card }]}>
            <View style={styles.journeyHeader}>
              <Text style={[styles.journeyTitle, { color: themeStyle.title }]}>{item.title}</Text>
              <Text style={[styles.journeyDuration, { color: themeStyle.label }]}>{item.duration_formatted || ''}</Text>
            </View>

            <Text style={[styles.journeyDesc, { color: themeStyle.text }]} numberOfLines={4}>{item.description || item.instructions || 'A guided visualization journey.'}</Text>

            <View style={styles.journeyFooter}>
              <Text style={{ color: themeStyle.label }}>{item.category_display || item.content_type_display}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.startBtn, { backgroundColor: themeStyle.button }]} onPress={() => router.push(`./relaxation-sessions?id=${item.id}`)}>
                  <Text style={{ color: themeStyle.buttonText, fontWeight: '700' }}>Start Journey</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  reloadBtn: { marginTop: 12, padding: 10, borderRadius: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: CARD_WIDTH, padding: 16, borderRadius: 12, marginBottom: 12 },
});
