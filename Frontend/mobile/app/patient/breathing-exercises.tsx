import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import PatientService, { RelaxationContent } from '../services/patient.service';
import { useTheme } from '../contexts/ThemeContext';

export default function BreathingExercisesScreen() {
  const { themeStyle } = useTheme();
  const [content, setContent] = useState<RelaxationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Audio player state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingContent, setPlayingContent] = useState<RelaxationContent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    loadContent();
    setupAudio();
    
    return () => {
      cleanupAudio();
    };
  }, []);

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
      // Get only breathing and meditation content types
      const data = await PatientService.getRelaxationContent({ 
        category: 'meditation' 
      });
      
      // Filter to only include the breathing exercises
      const breathingExercises = data.filter(item => 
        item.title === '5-Minute Breathing Exercise' || 
        item.title === '10-Minute Body Scan'
      );
      
      setContent(breathingExercises);
    } catch (err: any) {
      console.error('Error loading breathing exercises:', err);
      setError(err.response?.data?.detail || 'Unable to load breathing exercises. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (item: RelaxationContent) => {
    try {
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

      if (sound) {
        await sound.unloadAsync();
      }

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
      alert('Unable to play this exercise. Please try again.');
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

  const AudioPlayer = () => {
    if (!playingContent) return null;

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    return (
      <View style={[styles.audioPlayer, { backgroundColor: themeStyle.card, borderBottomColor: themeStyle.border }]}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerIcon}>💆</Text>
          <View style={styles.playerText}>
            <Text style={[styles.playerTitle, { color: themeStyle.title }]} numberOfLines={1}>
              {playingContent.title}
            </Text>
            <Text style={[styles.playerTime, { color: themeStyle.label }]}>
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>
        </View>
        
        <View style={styles.playerControls}>
          <TouchableOpacity
            style={[styles.playerButton, { backgroundColor: themeStyle.background }]}
            onPress={() => handlePlay(playingContent)}
          >
            <Text style={styles.playerButtonIcon}>
              {isPlaying ? '⏸️' : '▶️'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.playerButton, { backgroundColor: themeStyle.background }]}
            onPress={handleStop}
          >
            <Text style={styles.playerButtonIcon}>⏹️</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.progressBar, { backgroundColor: themeStyle.border }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: themeStyle.button }]} />
        </View>
      </View>
    );
  };

  const ExerciseCard = ({ item }: { item: RelaxationContent }) => {
    const isCurrentlyPlaying = playingContent?.id === item.id && isPlaying;

    return (
      <View style={[styles.card, { backgroundColor: themeStyle.card }]}>
        <View style={styles.cardContent}>
          <View style={[styles.cardIcon, { backgroundColor: themeStyle.button + '20' }]}>
            <Text style={styles.cardIconText}>💆</Text>
          </View>
          
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: themeStyle.title }]}>{item.title}</Text>
            <Text style={[styles.cardDescription, { color: themeStyle.text }]}>{item.description}</Text>
            
            {item.instructions && (
              <View style={[styles.instructionsBox, { backgroundColor: themeStyle.background }]}>
                <Text style={[styles.instructionsText, { color: themeStyle.label }]}>{item.instructions}</Text>
              </View>
            )}
            
            <View style={styles.cardFooter}>
              <Text style={[styles.cardDuration, { color: themeStyle.button }]}>⏱️ {item.duration_formatted}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.playButton,
            { backgroundColor: themeStyle.button },
            isCurrentlyPlaying && { backgroundColor: themeStyle.logoutButton },
          ]}
          onPress={() => handlePlay(item)}
        >
          <Text style={[styles.playButtonText, { color: themeStyle.buttonText }]}>
            {isCurrentlyPlaying ? '⏸️ Pause' : '▶️ Start'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeStyle.background }]}>
        <ActivityIndicator size="large" color={themeStyle.button} />
        <Text style={[styles.loadingText, { color: themeStyle.text }]}>Loading breathing exercises...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeStyle.background }]}>
        <Text style={styles.errorIcon}>💆</Text>
        <Text style={[styles.errorText, { color: themeStyle.error }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: themeStyle.button }]} onPress={loadContent}>
          <Text style={[styles.retryButtonText, { color: themeStyle.buttonText }]}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (content.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeStyle.background }]}>
        <Text style={styles.emptyIcon}>💆</Text>
        <Text style={[styles.emptyTitle, { color: themeStyle.title }]}>No exercises available</Text>
        <Text style={[styles.emptySubtext, { color: themeStyle.label }]}>
          Check back later for guided breathing and meditation content
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <AudioPlayer />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeStyle.title }]}>💆 Breathing Exercises</Text>
          <Text style={[styles.subtitle, { color: themeStyle.label }]}>
            Guided exercises for relaxation and mindfulness
          </Text>
        </View>

        <View style={[styles.tipsBox, { backgroundColor: themeStyle.card + '80', borderLeftColor: themeStyle.button }]}>
          <Text style={[styles.tipsTitle, { color: themeStyle.title }]}>🌟 Tips for Best Results</Text>
          <Text style={[styles.tipsText, { color: themeStyle.text }]}>• Find a quiet, comfortable space</Text>
          <Text style={[styles.tipsText, { color: themeStyle.text }]}>• Sit or lie down in a relaxed position</Text>
          <Text style={[styles.tipsText, { color: themeStyle.text }]}>• Use headphones for better experience</Text>
          <Text style={[styles.tipsText, { color: themeStyle.text }]}>• Close your eyes and follow the guidance</Text>
        </View>

        {content.map((item) => (
          <ExerciseCard key={item.id} item={item} />
        ))}
      </ScrollView>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  tipsBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardIconText: {
    fontSize: 30,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  instructionsBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDuration: {
    fontSize: 14,
    fontWeight: '600',
  },
  playButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  audioPlayer: {
    padding: 16,
    borderBottomWidth: 1,
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
    fontSize: 13,
  },
  playerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  playerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerButtonIcon: {
    fontSize: 20,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
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
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
