import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Animated, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import PatientService, { RelaxationContent } from '../services/patient.service';

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  nature_sounds: '#4CAF50',
  ambient_sounds: '#9C27B0',
  meditation: '#c084fc',
  breathing: '#a78bfa',
  visualization: '#8B5CF6',
};

export default function PlayVisualizationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [content, setContent] = useState<RelaxationContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audio
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const listenedMsRef = useRef<number>(0);
  const lastPositionRef = useRef<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Bubble animations
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
    if (!id) return;
    loadContent();
    setupAudio();
    
    // Bubble animation
    const createFloatingAnimation = (valueY: Animated.Value, valueX: Animated.Value, durationY: number, durationX: number, delay: number) => {
      return Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(valueY, {
              toValue: -30,
              duration: durationY,
              useNativeDriver: true,
            }),
            Animated.timing(valueY, {
              toValue: 0,
              duration: durationY,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(valueX, {
              toValue: 20,
              duration: durationX,
              useNativeDriver: true,
            }),
            Animated.timing(valueX, {
              toValue: -20,
              duration: durationX,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const animations = [
      createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000, 0),
      createFloatingAnimation(bubble2Y, bubble2X, 10000, 9000, 500),
      createFloatingAnimation(bubble3Y, bubble3X, 7000, 8000, 1000),
      createFloatingAnimation(bubble4Y, bubble4X, 9000, 7500, 1500),
      createFloatingAnimation(bubble5Y, bubble5X, 8500, 8500, 2000),
    ];

    animations.forEach(anim => anim.start());

    return () => { 
      cleanupAudio();
      animations.forEach(anim => anim.stop());
    };
  }, [id]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await PatientService.getRelaxationContentDetail(String(id));
      setContent(data);
      console.log('[PlayVisualization] loaded content audio_url=', data?.audio_url);
    } catch (err: any) {
      console.error('Failed to load content:', err);
      setError(err?.response?.data?.detail || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const setupAudio = async () => {
    try {
      const mode: any = {
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      };

      if (typeof (Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX !== 'undefined') {
        mode.interruptionModeIOS = (Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX;
      } else if (typeof (Audio as any).INTERRUPTION_MODE_IOS_DUCK_OTHERS !== 'undefined') {
        mode.interruptionModeIOS = (Audio as any).INTERRUPTION_MODE_IOS_DUCK_OTHERS;
      }

      if (typeof (Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX !== 'undefined') {
        mode.interruptionModeAndroid = (Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX;
      } else if (typeof (Audio as any).INTERRUPTION_MODE_ANDROID_DUCK_OTHERS !== 'undefined') {
        mode.interruptionModeAndroid = (Audio as any).INTERRUPTION_MODE_ANDROID_DUCK_OTHERS;
      }

      await Audio.setAudioModeAsync(mode);
    } catch (e) {}
  };

  const cleanupAudio = async () => {
    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.unloadAsync();
        }
      } catch (e) {
        console.warn('[PlayVisualization] Error cleaning up audio:', e);
      }
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      // accumulate listened time only while playing
      if (status.isPlaying) {
        const lastPos = lastPositionRef.current || 0;
        const delta = Math.max(0, (status.positionMillis || 0) - lastPos);
        listenedMsRef.current += delta;
        lastPositionRef.current = status.positionMillis || 0;
      }

      // handle natural finish
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };

  const handlePlay = async () => {
    if (!content) return;
    try {
      if (sound) {
        // Check if sound is loaded before trying to play/pause
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            await sound.playAsync();
            setIsPlaying(true);
          }
          return;
        } else {
          // Sound exists but isn't loaded, clean it up
          console.log('[PlayVisualization] Sound exists but not loaded, recreating...');
          try { await sound.unloadAsync(); } catch(e){}
          setSound(null);
          soundRef.current = null;
        }
      }

      console.log('[PlayVisualization] creating new audio for url:', content.audio_url);
      
      // Create sound without autoplay first
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: content.audio_url },
        { shouldPlay: false, volume: 1.0 },
        onPlaybackStatusUpdate
      );

      // Wait a moment for sound to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if loaded
      const status = await newSound.getStatusAsync();
      console.log('[PlayVisualization] sound status after create:', status);
      
      if (!status?.isLoaded) {
        try { await newSound.unloadAsync(); } catch(e){}
        throw new Error('Failed to load audio');
      }

      // Reset counters
      listenedMsRef.current = 0;
      lastPositionRef.current = 0;

      // Disable native looping
      await newSound.setIsLoopingAsync(false);

      // Store sound reference
      soundRef.current = newSound;
      setSound(newSound);

      // Now play it
      await newSound.playAsync();
      setIsPlaying(true);
      
      console.log('[PlayVisualization] audio playing successfully');
    } catch (e: any) {
      console.error('Audio play error', e);
      Alert.alert('Playback error', e?.message || `Unable to play audio. URL: ${content.audio_url}`);
      // Clean up on error
      setSound(null);
      soundRef.current = null;
      setIsPlaying(false);
    }
  };

  const handleSkipBackward = async () => {
    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          const newPosition = Math.max(0, position - 10000);
          await sound.setPositionAsync(newPosition);
        }
      } catch (e) {
        console.error('[PlayVisualization] Skip backward error:', e);
      }
    }
  };

  const handleSkipForward = async () => {
    if (sound && duration > 0) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          const newPosition = Math.min(duration, position + 10000);
          await sound.setPositionAsync(newPosition);
        }
      } catch (e) {
        console.error('[PlayVisualization] Skip forward error:', e);
      }
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDone = async () => {
    if (!content) return;
    
    // Calculate listened duration
    const listenedMs = Math.max(0, listenedMsRef.current || 0);
    const listenedSeconds = Math.floor(listenedMs / 1000);
    const positionSeconds = Math.floor((position || 0) / 1000);
    const durationListened = listenedSeconds || positionSeconds || 0;

    // Stop audio safely
    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.stopAsync();
        }
        await sound.unloadAsync();
      } catch (e) {
        console.warn('[PlayVisualization] Error stopping audio:', e);
      }
    }

    // Navigate to feedback page with session data
    router.push({
      pathname: './relaxation-sessions',
      params: {
        contentId: content.id,
        contentTitle: content.title,
        contentCategory: content.category_display || content.category,
        durationListened: durationListened.toString(),
      }
    });
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor: '#342949' }]}>
      <ActivityIndicator size="large" color="#A78BFA" />
    </View>
  );

  if (error || !content) return (
    <View style={[styles.center, { backgroundColor: '#342949' }]}>
      <Text style={{ color: '#FFFFFF' }}>{error || 'Content not found'}</Text>
      <TouchableOpacity style={[styles.doneBtn, { backgroundColor: '#B8A8E6' }]} onPress={() => router.push('./take-a-break')}>
        <Text style={{ color: '#FFFFFF' }}>Go back</Text>
      </TouchableOpacity>
    </View>
  );

  const categoryColor = CATEGORY_BADGE_COLORS[content.category] || '#8B5CF6';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#342949', '#342949', '#342949']}
        style={styles.screenGradient}
      />

      {/* Animated Bubbles */}
      <Animated.View style={[
        styles.bubble, 
        { width: 200, height: 200, top: 50, right: -50, backgroundColor: 'rgba(133, 130, 180, 0.25)' },
        { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }
      ]} />
      <Animated.View style={[
        styles.bubble, 
        { width: 280, height: 280, top: -100, left: -80, backgroundColor: 'rgba(133, 130, 180, 0.2)' },
        { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }
      ]} />
      <Animated.View style={[
        styles.bubble, 
        { width: 150, height: 150, bottom: 200, left: -30, backgroundColor: 'rgba(133, 130, 180, 0.22)' },
        { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }
      ]} />
      <Animated.View style={[
        styles.bubble, 
        { width: 180, height: 180, bottom: 100, right: -60, backgroundColor: 'rgba(133, 130, 180, 0.18)' },
        { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }
      ]} />
      <Animated.View style={[
        styles.bubble, 
        { width: 120, height: 120, top: '40%', right: 20, backgroundColor: 'rgba(133, 130, 180, 0.15)' },
        { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }
      ]} />

      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.push('./take-a-break')}
        style={styles.backButton}
      >
        <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        {/* Image Display */}
        <View style={styles.imageContainer}>
          <Image source={require('../../assets/images/vis-journey.png')} style={styles.visualizationImage} />
        </View>

        {/* Title and Category */}
        <Text style={styles.title}>{content.title}</Text>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.categoryText}>{content.category_display || content.category}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }]} />
          </View>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Playback Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handleSkipBackward} style={styles.controlBtn}>
            <MaterialIcons name="replay-10" size={40} color="#E91E63" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handlePlay} style={styles.playButton}>
            <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={56} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleSkipForward} style={styles.controlBtn}>
            <MaterialIcons name="forward-10" size={40} color="#E91E63" />
          </TouchableOpacity>
        </View>

        {/* Done Button */}
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#342949',
  },
  screenGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 1000,
    zIndex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingTop: 120,
    paddingHorizontal: 24,
    alignItems: 'center',
    zIndex: 2,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  imageContainer: {
    marginBottom: 24,
  },
  visualizationImage: {
    width: 280,
    height: 280,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 32,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  progressSection: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#473F5A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E91E63',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
    minWidth: 40,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 32,
  },
  controlBtn: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
