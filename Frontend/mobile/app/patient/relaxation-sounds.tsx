import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import PatientService, { RelaxationContent, RelaxationFilters } from '../services/patient.service';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

const CATEGORY_ICONS: Record<string, string> = {
  rain: '🌧️',
  ocean: '🌊',
  forest: '🌲',
  birds: '🐦',
  fire: '🔥',
  thunder: '⚡',
  wind: '💨',
  river: '🏞️',
  meditation: '🧘',
  breathing: '💆',
};

const CATEGORY_COLORS: Record<string, string> = {
  rain: '#93c5fd',
  ocean: '#67e8f9',
  forest: '#86efac',
  birds: '#fde047',
  fire: '#fca5a5',
  thunder: '#c4b5fd',
  wind: '#d1d5db',
  river: '#7dd3fc',
  meditation: '#c084fc',
  breathing: '#a78bfa',
};

export default function RelaxationSoundsScreen() {
  const { themeStyle } = useTheme();
  const [content, setContent] = useState<RelaxationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadContent();
  }, []);

  

  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PatientService.getRelaxationContent();
      // Store all content; tab UI will control what's shown
      setContent(data);
    } catch (err: any) {
      console.error('Error loading relaxation content:', err);
      setError(err.response?.data?.detail || 'Unable to load relaxation sounds. Try again.');
    } finally {
      setLoading(false);
    }
  };

  

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDurationFromSeconds = (seconds?: number | null) => {
    if (seconds === null || typeof seconds === 'undefined') return '';
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  

  

  

  const ContentCard = ({ item }: { item: RelaxationContent }) => {
    const bgColor = CATEGORY_COLORS[item.category] || '#e0e7ff';

    return (
      <TouchableOpacity onPress={() => router.push(`./relaxation-sessions?id=${item.id}`)} activeOpacity={0.9}>
      <View style={[styles.card, { backgroundColor: bgColor }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>
            {CATEGORY_ICONS[item.category] || '🎵'}
          </Text>
          {item.is_premium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>✨</Text>
            </View>
          )}
        </View>

        <Text style={[styles.cardTitle, { color: themeStyle.title }]} numberOfLines={2}>
          {item.title}
        </Text>
        
        <Text style={[styles.cardDescription, { color: themeStyle.text }]} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.cardFooter}>
          {item.average_rating && Number(item.average_rating) > 0 && (
            <Text style={[styles.cardRating, { color: themeStyle.label }]}>⭐ {item.average_rating}</Text>
          )}
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeStyle.background }]}>
        <ActivityIndicator size="large" color={themeStyle.button} />
        <Text style={[styles.loadingText, { color: themeStyle.text }]}>Loading relaxation sounds...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeStyle.background }]}>
        <Text style={styles.errorIcon}>🎵</Text>
        <Text style={[styles.errorText, { color: themeStyle.title }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: themeStyle.button }]} onPress={loadContent}>
          <Text style={[styles.retryButtonText, { color: themeStyle.buttonText }]}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (content.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeStyle.background }]}>
        <Text style={styles.emptyIcon}>🎧</Text>
        <Text style={[styles.emptyTitle, { color: themeStyle.title }]}>No relaxation sounds available</Text>
        <Text style={[styles.emptySubtext, { color: themeStyle.label }]}>
          Check back later for calming sounds and meditation content
        </Text>
      </View>
    );
  }

  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: themeStyle.background }]}> 

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeStyle.title }]}>🎵 Relaxing Sounds</Text>
          <Text style={[styles.subtitle, { color: themeStyle.label }]}>
            Nature sounds and ambient audio for relaxation
          </Text>
        </View>

        {/* Relaxing Sounds page only — Breathing tab removed */}

        {/* Filters removed — show all relaxing sounds (breathing/body-scan excluded below) */}

        {/* Content Grid */}
        <View style={styles.grid}>
          {content
              .filter((item) => {
                const t = (item.title || '').toLowerCase();
                const isBreathing = item.category === 'breathing' || item.content_type === 'breathing' || t.includes('breath') || t.includes('breathing');
                const isBodyScan = item.category === 'body_scan' || item.content_type === 'body_scan' || t.includes('body scan') || t.includes('body-scan');
                const isVisualization = item.category === 'visualization' || item.content_type === 'guided_meditation' || t.includes('visualization') || t.includes('guided meditation') || t.includes('guided-meditation');

                // Relaxing Sounds page: exclude breathing, body-scan, and visualization items
                return !isBreathing && !isBodyScan && !isVisualization;
              })
              .map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
        </View>

        {/* Footer Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Filters removed */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    gap: 10,
  },
  card: {
    width: CARD_WIDTH,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 40,
  },
  premiumBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 4,
  },
  premiumText: {
    fontSize: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    minHeight: 44,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    minHeight: 54,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardDuration: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardRating: {
    fontSize: 12,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'transparent'
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600'
  },
  playButton: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: {
    fontSize: 24,
  },
  audioPlayer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  playerText: {
    flex: 1,
  },
  playerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playerTime: {
    fontSize: 12,
  },
  playerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
  },
  playerButton: {
    borderRadius: 12,
    padding: 12,
    minWidth: 56,
    alignItems: 'center',
  },
  playerButtonIcon: {
    fontSize: 24,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    borderRadius: 16,
    padding: 20,
    width: width * 0.8,
    maxHeight: 500,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  filterOptionText: {
    fontSize: 16,
  },
  filterCheck: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});







