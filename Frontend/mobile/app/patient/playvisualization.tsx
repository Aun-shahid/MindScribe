import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Image, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import PatientService, { RelaxationContent } from '../services/patient.service';
import TabLoaderCard from '../components/TabLoaderCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  nature_sounds: '#4CAF50',
  ambient_sounds: '#9C27B0',
  meditation: '#c084fc',
  breathing: '#a78bfa',
  visualization: '#8B5CF6',
};

const GUIDED_DURATIONS_SECONDS = {
  breathing: 331,
  visualization: 1072,
  bodyScan: 631,
};

export default function PlayVisualizationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState<RelaxationContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const listenedMsRef = useRef<number>(0);
  const lastPositionRef = useRef<number>(0);
  const soundRef = useRef<Audio.Sound | null>(null);

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

  // Responsive sizing
  const backBtnTop = insets.top + clamp(height * 0.012, 8, 14);
  const backBtnLeft = clamp(width * 0.04, 14, 22);
  const backBtnSize = clamp(width * 0.098, 34, 42);
  const backBtnRadius = backBtnSize / 2;
  const backIconSize = clamp(width * 0.047, 16, 20);
  const contentPaddingTop = insets.top + clamp(height * 0.078, 48, 72);
  const contentHPad = clamp(width * 0.058, 18, 28);
  const contentMaxWidth = clamp(width * 0.92, 320, 460);
  const heroImageHeight = clamp(width * 0.62, 210, 290);
  const playerCardRadius = clamp(width * 0.05, 16, 22);
  const playerCardPadding = clamp(width * 0.05, 16, 22);
  const playerCardShadowOffsetY = clamp(height * 0.014, 6, 10);
  const playerCardShadowRadius = clamp(width * 0.05, 12, 18);
  const titleSize = clamp(width * 0.065, 22, 30);
  const titleMarginBottom = clamp(height * 0.012, 8, 14);
  const badgePaddingH = clamp(width * 0.038, 12, 18);
  const badgePaddingV = clamp(height * 0.006, 4, 7);
  const badgeMarginBottom = clamp(height * 0.034, 22, 38);
  const categoryTextSize = clamp(width * 0.034, 12, 14);
  const progressMarginBottom = clamp(height * 0.026, 16, 28);
  const progressGap = clamp(width * 0.03, 8, 12);
  const progressBarHeight = clamp(height * 0.008, 5, 7);
  const progressBarRadius = progressBarHeight / 2;
  const timeTextSize = clamp(width * 0.034, 12, 14);
  const timeTextMinWidth = clamp(width * 0.11, 38, 48);
  const controlGap = clamp(width * 0.07, 22, 36);
  const controlIconSize = clamp(width * 0.11, 34, 44);
  const playBtnSize = clamp(width * 0.21, 72, 96);
  const playBtnRadius = playBtnSize / 2;
  const playIconSize = clamp(width * 0.13, 44, 60);
  const controlsMarginBottom = clamp(height * 0.035, 22, 38);
  const controlTouchSize = clamp(width * 0.15, 48, 62);
  const donePaddingV = clamp(height * 0.018, 12, 18);
  const doneFontSize = clamp(width * 0.043, 15, 19);
  const doneRadius = clamp(width * 0.065, 22, 30);
  const doneMarginTop = clamp(height * 0.01, 6, 10);
  const bubbleLarge = clamp(width * 0.52, 150, 220);
  const bubbleMedium = clamp(width * 0.42, 120, 180);
  const bubbleSmall = clamp(width * 0.34, 100, 150);
  const fallbackPad = clamp(width * 0.05, 16, 24);

  // ── KEY FIX: full reset in cleanupAudio ───────────────────────────────────
  const cleanupAudio = useCallback(async () => {
    const currentSound = soundRef.current;
    if (!currentSound) return;
    try {
      const status = await currentSound.getStatusAsync();
      if (status.isLoaded) {
        await currentSound.unloadAsync();
      }
    } catch (e) {
      console.warn('[PlayVisualization] Error cleaning up audio:', e);
    } finally {
      soundRef.current = null;
      setIsPlaying(false);
      setPosition(0);              // reset to start
      setDuration(0);              // reset duration
      listenedMsRef.current = 0;   // reset listened time
      lastPositionRef.current = 0; // reset last position
    }
  }, []);

  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      const data = await PatientService.getRelaxationContentDetail(String(id));
      setContent(data);
    } catch (err: any) {
      console.error('Failed to load content:', err);
      setError(err?.response?.data?.detail || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [id]);

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
    } catch {}
  };

  useEffect(() => {
    if (!id) return;
    loadContent();
    setupAudio();

    const createFloatingAnimation = (
      valueY: Animated.Value, valueX: Animated.Value,
      durationY: number, durationX: number, delay: number
    ) => {
      return Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(valueY, { toValue: -30, duration: durationY, useNativeDriver: true }),
            Animated.timing(valueY, { toValue: 0, duration: durationY, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(valueX, { toValue: 20, duration: durationX, useNativeDriver: true }),
            Animated.timing(valueX, { toValue: -20, duration: durationX, useNativeDriver: true }),
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
  }, [id, bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y,
      bubble4X, bubble4Y, bubble5X, bubble5Y, cleanupAudio, loadContent]);

  // ── Stop audio + reset when navigating away ───────────────────────────────
  useFocusEffect(
    useCallback(() => {
      return () => {
        cleanupAudio();
      };
    }, [cleanupAudio])
  );

  const resolveLoadedSound = async () => {
    const current = soundRef.current;
    if (!current) return null;
    try {
      const status = await current.getStatusAsync();
      if (!status.isLoaded) return null;
      return { current, status };
    } catch {
      return null;
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) return;

    setPosition(status.positionMillis);
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);

    if (status.isPlaying) {
      const lastPos = lastPositionRef.current || 0;
      const delta = Math.max(0, (status.positionMillis || 0) - lastPos);
      listenedMsRef.current += delta;
      lastPositionRef.current = status.positionMillis || 0;
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  };

  const handlePlay = async () => {
    if (!content) return;
    try {
      const existingSound = soundRef.current;
      if (existingSound) {
        const status = await existingSound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await existingSound.pauseAsync();
            setIsPlaying(false);
          } else {
            await existingSound.playAsync();
            setIsPlaying(true);
          }
          return;
        } else {
          try { await existingSound.unloadAsync(); } catch {}
          soundRef.current = null;
        }
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: content.audio_url },
        { shouldPlay: false, volume: 1.0 },
        onPlaybackStatusUpdate
      );

      await new Promise(resolve => setTimeout(resolve, 100));
      const status = await newSound.getStatusAsync();
      if (!status?.isLoaded) {
        try { await newSound.unloadAsync(); } catch {}
        throw new Error('Failed to load audio');
      }

      listenedMsRef.current = 0;
      lastPositionRef.current = 0;
      await newSound.setIsLoopingAsync(false);
      soundRef.current = newSound;
      await newSound.playAsync();
      setIsPlaying(true);
    } catch (e: any) {
      console.error('Audio play error', e);
      Alert.alert('Playback error', e?.message || `Unable to play audio.`);
      soundRef.current = null;
      setIsPlaying(false);
    }
  };

  const handleSkipBackward = async () => {
    const loaded = await resolveLoadedSound();
    if (!loaded) return;
    try {
      const currentPos = loaded.status.positionMillis || 0;
      await loaded.current.setPositionAsync(Math.max(0, currentPos - 10000));
    } catch (e) {
      console.error('[PlayVisualization] Skip backward error:', e);
    }
  };

  const handleSkipForward = async () => {
    const loaded = await resolveLoadedSound();
    if (!loaded) return;
    try {
      const currentPos = loaded.status.positionMillis || 0;
      const maxDuration = loaded.status.durationMillis || duration || 0;
      const newPosition = maxDuration > 0 ? Math.min(maxDuration, currentPos + 10000) : currentPos + 10000;
      await loaded.current.setPositionAsync(newPosition);
    } catch (e) {
      console.error('[PlayVisualization] Skip forward error:', e);
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
    const listenedMs = Math.max(0, listenedMsRef.current || 0);
    const listenedSeconds = Math.floor(listenedMs / 1000);
    const positionSeconds = Math.floor((position || 0) / 1000);
    const durationListened = listenedSeconds || positionSeconds || 0;

    const currentSound = soundRef.current;
    if (currentSound) {
      try {
        const status = await currentSound.getStatusAsync();
        if (status.isLoaded) await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch (e) {
        console.warn('[PlayVisualization] Error stopping audio:', e);
      }
    }

    router.push({
      pathname: './relaxation-sessions',
      params: {
        contentId: content.id,
        contentTitle: content.title,
        contentCategory: content.category_display || content.category,
        durationListened: durationListened.toString(),
      },
    });
  };

  if (loading) return (
    <TabLoaderCard
      fullScreen
      title="Loading visualization..."
      subtitle="Preparing your calm journey"
      spinnerColor="#A78BFA"
    />
  );

  if (error || !content) return (
    <View style={[styles.center, { backgroundColor: '#342949', padding: fallbackPad }]}>
      <Text style={{ color: '#FFFFFF' }}>{error || 'Content not found'}</Text>
      <TouchableOpacity
        style={[styles.doneBtn, { backgroundColor: '#B8A8E6' }]}
        onPress={() => router.push('./take-a-break')}
      >
        <Text style={{ color: '#FFFFFF' }}>Go back</Text>
      </TouchableOpacity>
    </View>
  );

  const categoryColor = CATEGORY_BADGE_COLORS[content.category] || '#8B5CF6';
  const titleLower = (content.title || '').toLowerCase();
  const categoryLower = (content.category || '').toLowerCase();
  const isBodyScan = titleLower.includes('body scan') || titleLower.includes('body-scan') || categoryLower === 'body_scan';
  const isVisualization = titleLower.includes('visualization') || categoryLower === 'visualization' || categoryLower === 'guided_meditation';
  const isBreathing = titleLower.includes('breath') || categoryLower === 'breathing';
  const exactDurationSeconds = isBodyScan
    ? GUIDED_DURATIONS_SECONDS.bodyScan
    : isVisualization
    ? GUIDED_DURATIONS_SECONDS.visualization
    : isBreathing
    ? GUIDED_DURATIONS_SECONDS.breathing
    : (content.duration_seconds || Math.floor((duration || 0) / 1000) || 0);
  const displayedTotalDurationMillis = exactDurationSeconds * 1000;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#342949', '#342949', '#342949']} style={styles.screenGradient} />

      {/* Bubbles */}
      <Animated.View style={[styles.bubble, { width: bubbleLarge, height: bubbleLarge, top: '8%', right: '-12%', backgroundColor: 'rgba(133,130,180,0.25)', transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }]} />
      <Animated.View style={[styles.bubble, { width: bubbleLarge + 20, height: bubbleLarge + 20, top: '-6%', left: '-14%', backgroundColor: 'rgba(133,130,180,0.20)', transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }]} />
      <Animated.View style={[styles.bubble, { width: bubbleSmall, height: bubbleSmall, bottom: '22%', left: '-8%', backgroundColor: 'rgba(133,130,180,0.22)', transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }]} />
      <Animated.View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium, bottom: '10%', right: '-10%', backgroundColor: 'rgba(133,130,180,0.18)', transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }]} />
      <Animated.View style={[styles.bubble, { width: bubbleSmall - 20, height: bubbleSmall - 20, top: '40%', right: '5%', backgroundColor: 'rgba(133,130,180,0.15)', transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }]} />

      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.push('./take-a-break')}
        style={[styles.backButton, {
          top: backBtnTop, left: backBtnLeft,
          width: backBtnSize, height: backBtnSize, borderRadius: backBtnRadius,
        }]}
      >
        <FontAwesome name="chevron-left" size={backIconSize} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Content */}
      <View style={[styles.content, { paddingTop: contentPaddingTop, paddingHorizontal: contentHPad, width: '100%' }]}>
        <View style={[styles.playerCard, {
          maxWidth: contentMaxWidth, borderRadius: playerCardRadius,
          shadowOffset: { width: 0, height: playerCardShadowOffsetY },
          shadowRadius: playerCardShadowRadius,
        }]}>
          {/* Hero */}
          <View style={[styles.playerHero, { height: heroImageHeight }]}>
            <Image
              source={require('../../assets/images/vis-journey.png')}
              style={styles.visualizationImage}
            />
            <LinearGradient
              colors={['transparent', 'rgba(24,15,39,0.12)', 'rgba(24,15,39,0.55)']}
              style={styles.playerHeroOverlay}
              pointerEvents="none"
            />
          </View>

          <View style={[styles.playerCardBody, { padding: playerCardPadding }]}>
            <Text style={[styles.title, { fontSize: titleSize, marginBottom: titleMarginBottom }]}>
              {content.title}
            </Text>
            <View style={[styles.categoryBadge, {
              backgroundColor: categoryColor,
              paddingHorizontal: badgePaddingH,
              paddingVertical: badgePaddingV,
              marginBottom: badgeMarginBottom,
            }]}>
              <Text style={[styles.categoryText, { fontSize: categoryTextSize }]}>
                {content.category_display || content.category}
              </Text>
            </View>

            {/* Progress */}
            <View style={[styles.progressSection, { marginBottom: progressMarginBottom, gap: progressGap }]}>
              <Text style={[styles.timeText, { fontSize: timeTextSize, minWidth: timeTextMinWidth }]}>
                {formatTime(position)}
              </Text>
              <View style={[styles.progressBar, { height: progressBarHeight, borderRadius: progressBarRadius }]}>
                <View style={[styles.progressFill, {
                  width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                  borderRadius: progressBarRadius,
                }]} />
              </View>
              <Text style={[styles.timeText, { fontSize: timeTextSize, minWidth: timeTextMinWidth }]}>
                {displayedTotalDurationMillis > 0 ? formatTime(displayedTotalDurationMillis) : '--:--'}
              </Text>
            </View>

            {/* Controls */}
            <View style={[styles.controls, { gap: controlGap, marginBottom: controlsMarginBottom }]}>
              <TouchableOpacity
                onPress={handleSkipBackward}
                style={[styles.controlBtn, {
                  width: controlTouchSize, height: controlTouchSize,
                  borderRadius: controlTouchSize / 2,
                }]}
              >
                <MaterialIcons name="replay-10" size={controlIconSize} color="#E91E63" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePlay}
                style={[styles.playButton, {
                  width: playBtnSize, height: playBtnSize, borderRadius: playBtnRadius,
                }]}
              >
                <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={playIconSize} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSkipForward}
                style={[styles.controlBtn, {
                  width: controlTouchSize, height: controlTouchSize,
                  borderRadius: controlTouchSize / 2,
                }]}
              >
                <MaterialIcons name="forward-10" size={controlIconSize} color="#E91E63" />
              </TouchableOpacity>
            </View>

            {/* Done */}
            <TouchableOpacity
              style={[styles.doneBtn, {
                paddingVertical: donePaddingV, borderRadius: doneRadius, marginTop: doneMarginTop,
              }]}
              onPress={handleDone}
            >
              <Text style={[styles.doneBtnText, { fontSize: doneFontSize }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#342949' },
  screenGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 0 },
  bubble: { position: 'absolute', borderRadius: 1000, zIndex: 1 },
  backButton: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
    shadowColor: '#000', shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 5,
  },
  content: { flex: 1, alignItems: 'center', zIndex: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playerCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.28, elevation: 9,
  },
  playerHero: { width: '100%', overflow: 'hidden' },
  visualizationImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  playerHeroOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  playerCardBody: { width: '100%', alignItems: 'center' },
  title: { fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  categoryBadge: { borderRadius: 16 },
  categoryText: { color: '#FFFFFF', fontWeight: '600' },
  progressSection: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  progressBar: { flex: 1, backgroundColor: '#473F5A', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E91E63' },
  timeText: { color: '#FFFFFF' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  controlBtn: {
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  playButton: {
    backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#E91E63', shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 12, elevation: 10,
  },
  doneBtn: {
    width: '100%', backgroundColor: '#7C3AED', alignItems: 'center',
    shadowColor: '#7C3AED', shadowOpacity: 0.34,
    shadowOffset: { width: 0, height: 10 }, shadowRadius: 14, elevation: 10,
  },
  doneBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
});