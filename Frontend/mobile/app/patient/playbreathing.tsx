import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import PatientService, { RelaxationContent } from '../services/patient.service';

const BREATHING_IMAGES: Record<string, any> = {
  '5min': require('../../assets/images/5minbreathe.png'),
  '10min': require('../../assets/images/5minbreathe.png'),
  'default': require('../../assets/images/5minbreathe.png'),
};

export default function PlayBreathingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [content, setContent] = useState<RelaxationContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const listenedMsRef = useRef(0);

  const bubble1Y = useRef(new Animated.Value(0)).current;
  const bubble1X = useRef(new Animated.Value(0)).current;
  const bubble2Y = useRef(new Animated.Value(0)).current;
  const bubble2X = useRef(new Animated.Value(0)).current;
  const bubble3Y = useRef(new Animated.Value(0)).current;
  const bubble3X = useRef(new Animated.Value(0)).current;
  const bubble4Y = useRef(new Animated.Value(0)).current;
  const bubble4X = useRef(new Animated.Value(0)).current;
  const bubble5Y = useRef(new Animated.Value(0)).current;
  const bubble5X = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadContent();
    startBubbleAnimations();
    setupAudio();
    return () => {
      cleanupAudio();
    };
  }, [id]);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
    } catch (err) {
      console.error('Error setting up audio:', err);
    }
  };

  const cleanupAudio = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }
      }
    } catch (err) {
      console.error('Error cleaning up audio:', err);
    }
  };

  const loadContent = async () => {
    try {
      setLoading(true);
      console.log('Playbreathing: Loading content for id:', id);
      const data = await PatientService.getRelaxationContent({});
      console.log('Playbreathing: Total items received:', data.length);
      
      // Handle both string UUID and numeric IDs
      const item = data.find((c: any) => {
        const matches = c.id === id || c.id.toString() === id || c.id === parseInt(id || '0', 10);
        if (matches) {
          console.log('Found match:', c.id, c.title);
        }
        return matches;
      });
      
      if (item) {
        console.log('Playbreathing: Content loaded:', item.title);
        setContent(item);
      } else {
        console.log('Playbreathing: Content not found. Available IDs:', data.map((c: any) => c.id).join(', '));
        Alert.alert('Error', 'Content not found');
        router.push('./breathing-exercises');
      }
    } catch (err) {
      console.error('Error loading content:', err);
      Alert.alert('Error', 'Unable to load breathing exercise');
      router.push('./breathing-exercises');
    } finally {
      setLoading(false);
    }
  };

  const createFloatingAnimation = (
    translateY: Animated.Value,
    translateX: Animated.Value,
    duration: number,
    yRange: number,
    xRange: number
  ) => {
    return Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -yRange,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: xRange,
            duration: duration * 0.7,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: -xRange,
            duration: duration * 0.7,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: duration * 0.6,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
  };

  const startBubbleAnimations = () => {
    createFloatingAnimation(bubble1Y, bubble1X, 4000, 30, 15).start();
    createFloatingAnimation(bubble2Y, bubble2X, 5000, 40, 20).start();
    createFloatingAnimation(bubble3Y, bubble3X, 6000, 35, 18).start();
    createFloatingAnimation(bubble4Y, bubble4X, 4500, 38, 16).start();
    createFloatingAnimation(bubble5Y, bubble5X, 5500, 32, 22).start();
  };

  const handlePlay = async () => {
    try {
      if (!content) return;

      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            await sound.playAsync();
            setIsPlaying(true);
          }
        }
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: content.audio_url },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = await newSound.getStatusAsync();
      if (!status.isLoaded) {
        console.error('Sound not loaded after creation');
        Alert.alert('Error', 'Unable to load audio. Please try again.');
        return;
      }

      await newSound.setIsLoopingAsync(false);
      await newSound.playAsync();
      setSound(newSound);
      setIsPlaying(true);
    } catch (err) {
      console.error('Audio play error', err);
      Alert.alert('Error', 'Unable to play audio. Please try again.');
    }
  };

  const handlePause = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        }
      }
    } catch (err) {
      console.error('Pause error', err);
    }
  };

  const handleSkipBackward = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          const newPosition = Math.max(0, position - 10000);
          await sound.setPositionAsync(newPosition);
        }
      }
    } catch (err) {
      console.error('Skip backward error', err);
    }
  };

  const handleSkipForward = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          const newPosition = Math.min(duration, position + 10000);
          await sound.setPositionAsync(newPosition);
        }
      }
    } catch (err) {
      console.error('Skip forward error', err);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      if (status.isPlaying) {
        listenedMsRef.current = status.positionMillis;
      }

      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };

  const handleDone = async () => {
    try {
      const durationListened = Math.floor(listenedMsRef.current / 1000);

      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }
      }

      router.push({
        pathname: './relaxation-sessions',
        params: {
          contentId: content?.id.toString() || '',
          contentTitle: content?.title || '',
          contentCategory: content?.category || 'breathing',
          durationListened: durationListened.toString(),
        },
      });
    } catch (err) {
      console.error('Done error', err);
      router.push('./relaxation-sessions');
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getBreathingImage = () => {
    if (!content) return BREATHING_IMAGES['5min'];
    const title = content.title.toLowerCase();
    if (title.includes('10') || title.includes('body scan')) {
      return BREATHING_IMAGES['10min'];
    }
    return BREATHING_IMAGES['5min'];
  };

  if (loading) {
    return (
      <LinearGradient colors={['#342949', '#2A1F3D', '#1E1529']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A78BFA" />
        </View>
      </LinearGradient>
    );
  }

  if (!content) {
    return (
      <LinearGradient colors={['#342949', '#2A1F3D', '#1E1529']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Content not found</Text>
        </View>
      </LinearGradient>
    );
  }

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <LinearGradient colors={['#342949', '#2A1F3D', '#1E1529']} style={styles.container}>
      <Animated.View
        style={[
          styles.bubble,
          { top: '15%', left: '10%', transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubble,
          { top: '30%', right: '15%', transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubble,
          { top: '50%', left: '20%', transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubble,
          { top: '70%', right: '10%', transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] },
        ]}
      />
      <Animated.View
        style={[
          styles.bubble,
          { top: '85%', left: '50%', transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] },
        ]}
      />

      <TouchableOpacity style={styles.backButton} onPress={() => router.push('./breathing-exercises')}>
        <FontAwesome name="chevron-left" size={24} color="#B8A8E6" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.description}>{content.description}</Text>

        <View style={styles.imageContainer}>
          <Image source={getBreathingImage()} style={styles.soundImage} resizeMode="cover" />
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkipBackward}>
            <MaterialIcons name="replay-10" size={32} color="#B8A8E6" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.playButton} onPress={isPlaying ? handlePause : handlePlay}>
            <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={48} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkipForward}>
            <MaterialIcons name="forward-10" size={32} color="#B8A8E6" />
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bubble: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(184, 168, 230, 0.15)',
    zIndex: 0,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(71, 63, 90, 0.8)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#B8A8E6',
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    color: '#E91E63',
    fontSize: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 100,
    zIndex: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#B8A8E6',
    textAlign: 'center',
    marginBottom: 30,
  },
  imageContainer: {
    marginBottom: 40,
  },
  soundImage: {
    width: 280,
    height: 280,
    borderRadius: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 20,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  skipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#473F5A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 30,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#473F5A',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#B8A8E6',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: '#B8A8E6',
  },
  doneButton: {
    width: '100%',
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
