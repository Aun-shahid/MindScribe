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
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import PatientService, { RelaxationContent, RelaxationFilters } from '../services/patient.service';
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
  const [filters, setFilters] = useState<RelaxationFilters>({});
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  
  // Audio player state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingContent, setPlayingContent] = useState<RelaxationContent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadContent();
    setupAudio();
    
    return () => {
      cleanupAudio();
    };
  }, [filters]);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (err) {
      console.error('Error setting up audio:', err);
    }
  };

  const cleanupAudio = async () => {
    if (sound) {
      await sound.unloadAsync();
    }
  };

  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PatientService.getRelaxationContent(filters);
      
      // Filter out breathing exercises (they're in a separate screen now)
      const sounds = data.filter(item => 
        item.title !== '5-Minute Breathing Exercise' && 
        item.title !== '10-Minute Body Scan'
      );
      
      setContent(sounds);
    } catch (err: any) {
      console.error('Error loading relaxation content:', err);
      setError(err.response?.data?.detail || 'Unable to load relaxation sounds. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (item: RelaxationContent) => {
    try {
      // If already playing this content, just toggle pause
      if (playingContent?.id === item.id && sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      // Stop current sound if playing different content
      if (sound) {
        await sound.unloadAsync();
      }

      // Load and play new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: item.audio_url },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setPlayingContent(item);
      setIsPlaying(true);
    } catch (err) {
      console.error('Error playing audio:', err);
      alert('Unable to play this sound. Please try again.');
    }
  };

  const handleStop = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      setPlayingContent(null);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        handleStop();
      }
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const CategoryFilter = () => {
    const categories = [
      { value: '', label: 'All Categories' },
      { value: 'rain', label: '🌧️ Rain' },
      { value: 'ocean', label: '🌊 Ocean' },
      { value: 'forest', label: '🌲 Forest' },
      { value: 'birds', label: '🐦 Birds' },
      { value: 'fire', label: '🔥 Fire' },
      { value: 'thunder', label: '⚡ Thunder' },
      { value: 'wind', label: '💨 Wind' },
      { value: 'river', label: '🏞️ River' },
      { value: 'meditation', label: '🧘 Meditation' },
      { value: 'breathing', label: '💆 Breathing' },
    ];

    return (
      <Modal
        visible={showCategoryFilter}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryFilter(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryFilter(false)}
        >
          <View style={[styles.filterModal, { backgroundColor: themeStyle.card }]}>
            <Text style={[styles.filterModalTitle, { color: themeStyle.title }]}>Filter by Category</Text>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.filterOption, { borderBottomColor: themeStyle.border }]}
                onPress={() => {
                  setFilters({ ...filters, category: cat.value || undefined });
                  setShowCategoryFilter(false);
                }}
              >
                <Text style={[styles.filterOptionText, { color: themeStyle.text }]}>{cat.label}</Text>
                {filters.category === cat.value && (
                  <Text style={[styles.filterCheck, { color: themeStyle.button }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const TypeFilter = () => {
    const types = [
      { value: '', label: 'All Types' },
      { value: 'nature', label: 'Nature' },
      { value: 'meditation', label: 'Meditation' },
      { value: 'breathing', label: 'Breathing' },
      { value: 'music', label: 'Music' },
      { value: 'ambient', label: 'Ambient' },
    ];

    return (
      <Modal
        visible={showTypeFilter}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTypeFilter(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTypeFilter(false)}
        >
          <View style={[styles.filterModal, { backgroundColor: themeStyle.card }]}>
            <Text style={[styles.filterModalTitle, { color: themeStyle.title }]}>Filter by Type</Text>
            {types.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[styles.filterOption, { borderBottomColor: themeStyle.border }]}
                onPress={() => {
                  setFilters({ ...filters, type: type.value as any || undefined });
                  setShowTypeFilter(false);
                }}
              >
                <Text style={[styles.filterOptionText, { color: themeStyle.text }]}>{type.label}</Text>
                {filters.type === type.value && (
                  <Text style={[styles.filterCheck, { color: themeStyle.button }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const AudioPlayer = () => {
    if (!playingContent) return null;

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    return (
      <View style={[styles.audioPlayer, { backgroundColor: themeStyle.button }]}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerIcon}>
            {CATEGORY_ICONS[playingContent.category] || '🎵'}
          </Text>
          <View style={styles.playerText}>
            <Text style={[styles.playerTitle, { color: themeStyle.buttonText }]} numberOfLines={1}>
              {playingContent.title}
            </Text>
            <Text style={[styles.playerTime, { color: themeStyle.buttonText + 'CC' }]}>
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>
        </View>
        
        <View style={styles.playerControls}>
          <TouchableOpacity
            style={[styles.playerButton, { backgroundColor: themeStyle.button }]}
            onPress={() => handlePlay(playingContent)}
          >
            <Text style={styles.playerButtonIcon}>
              {isPlaying ? '⏸️' : '▶️'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.playerButton, { backgroundColor: themeStyle.button }]}
            onPress={handleStop}
          >
            <Text style={styles.playerButtonIcon}>⏹️</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.progressBar, { backgroundColor: themeStyle.button }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: themeStyle.buttonText }]} />
        </View>
      </View>
    );
  };

  const ContentCard = ({ item }: { item: RelaxationContent }) => {
    const isCurrentlyPlaying = playingContent?.id === item.id && isPlaying;
    const bgColor = CATEGORY_COLORS[item.category] || '#e0e7ff';

    return (
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
          <Text style={[styles.cardDuration, { color: themeStyle.label }]}>{item.duration_formatted}</Text>
          {item.average_rating && (
            <Text style={[styles.cardRating, { color: themeStyle.label }]}>⭐ {item.average_rating}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.playButton,
            { backgroundColor: themeStyle.button },
            isCurrentlyPlaying && { backgroundColor: themeStyle.logoutButton },
          ]}
          onPress={() => handlePlay(item)}
        >
          <Text style={styles.playButtonText}>
            {isCurrentlyPlaying ? '⏸️' : '▶️'}
          </Text>
        </TouchableOpacity>
      </View>
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

  return (
    <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
      {/* Audio Player (Sticky Top) */}
      <AudioPlayer />

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

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: themeStyle.card, borderColor: themeStyle.button }]}
            onPress={() => setShowCategoryFilter(true)}
          >
            <Text style={[styles.filterButtonText, { color: themeStyle.text }]}>
              {filters.category ? `🏷️ ${filters.category}` : '🏷️ Category'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: themeStyle.card, borderColor: themeStyle.button }]}
            onPress={() => setShowTypeFilter(true)}
          >
            <Text style={[styles.filterButtonText, { color: themeStyle.text }]}>
              {filters.type ? `📂 ${filters.type}` : '📂 Type'}
            </Text>
          </TouchableOpacity>

          {(filters.category || filters.type) && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: themeStyle.error + '20', borderColor: themeStyle.error }]}
              onPress={() => setFilters({})}
            >
              <Text style={[styles.clearButtonText, { color: themeStyle.error }]}>✕ Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content Grid */}
        <View style={styles.grid}>
          {content.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </View>

        {/* Footer Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Filter Modals */}
      <CategoryFilter />
      <TypeFilter />
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
