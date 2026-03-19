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

const SOUND_IMAGES: Record<string, any> = {
  'Forest Birds': require('../../assets/images/bird-sound.jpg'),
  'Thunderstorm': require('../../assets/images/thunder-sound.jpg'),
  'Ocean Waves': require('../../assets/images/ocean-sound.jpg'),
  'Wind Chimes': require('../../assets/images/windchime-sound.jpg'),
  'Cozy Fireplace': require('../../assets/images/fireplace-sound.jpg'),
  'White Noise': require('../../assets/images/whitenoise-sound.webp'),
  'Gentle Rain': require('../../assets/images/rain-sound.jpg'),
  'Coffee Shop': require('../../assets/images/coffee-sound.jpg'),
  'Snooze': require('../../assets/images/snooze-sound.jpg'),
  'Footsteps': require('../../assets/images/snow-sound.jpg'),
  'Snow Footsteps': require('../../assets/images/snow-sound.jpg'),
  'Footsteps in Snow': require('../../assets/images/snow-sound.jpg'),
  'Walking in Snow': require('../../assets/images/snow-sound.jpg'),
  'Stream Water': require('../../assets/images/streamwater-sound.jpg'),
  'Flowing Stream': require('../../assets/images/streamwater-sound.jpg'),
  'Water Stream': require('../../assets/images/streamwater-sound.jpg'),
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  nature_sounds: '#4CAF50',
  ambient_sounds: '#9C27B0',
  meditation: '#c084fc',
  breathing: '#a78bfa',
};

const ACTUAL_SOUND_DURATIONS_SECONDS: Record<string, number> = {
  'Wind Chimes': 20,
  'White Noise': 300,
  'Thunderstorm': 60,
  'Stream Water': 106,
  'Snow Footsteps': 18,
  'Ocean Waves': 132,
  'Gentle Rain': 108,
  'Forest Birds': 30,
  'Cozy Fireplace': 297,
  'Coffee Shop': 169,
};

export default function PlaySoundScreen() {
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
  const [timedMinutes, setTimedMinutes] = useState<number | null>(null);

  const loopRotateAnim = useRef(new Animated.Value(0)).current;
  const listenedMsRef = useRef<number>(0);
  const lastPositionRef = useRef<number>(0);
  const isRestartingRef = useRef<boolean>(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  // Use ref for timedMinutes so onPlaybackStatusUpdate always sees current value
  const timedMinutesRef = useRef<number | null>(null);
  const contentRef = useRef<RelaxationContent | null>(null);

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
  const playBtnSize = clamp(width * 0.21, 72, 96);
  const playBtnRadius = playBtnSize / 2;
  const playIconSize = clamp(width * 0.13, 44, 60);
  const loopIconSize = clamp(width * 0.072, 24, 34);
  const controlsMarginBottom = clamp(height * 0.035, 22, 38);
  const loopBadgeTop = clamp(height * -0.008, -6, -4);
  const loopBadgeRight = clamp(width * -0.024, -10, -6);
  const loopBadgeRadius = clamp(width * 0.03, 10, 12);
  const loopBadgePadX = clamp(width * 0.016, 5, 7);
  const loopBadgePadY = clamp(height * 0.003, 2, 3);
  const loopBadgeMinWidthCompact = clamp(width * 0.08, 28, 34);
  const loopBadgeMinWidthWide = clamp(width * 0.104, 36, 42);
  const loopBadgeTextSize = clamp(width * 0.026, 9, 11);
  const loopCrossTop = clamp(height * -0.007, -5, -4);
  const loopCrossRight = clamp(width * -0.018, -7, -5);
  const loopCrossSize = clamp(width * 0.038, 13, 16);
  const loopCrossRadius = loopCrossSize / 2;
  const loopCrossIconSize = clamp(width * 0.02, 8, 10);
  const donePaddingV = clamp(height * 0.018, 12, 18);
  const doneFontSize = clamp(width * 0.043, 15, 19);
  const doneRadius = clamp(width * 0.065, 22, 30);
  const doneMarginTop = clamp(height * 0.01, 6, 10);
  const bubbleLarge = clamp(width * 0.52, 150, 220);
  const bubbleMedium = clamp(width * 0.42, 120, 180);
  const bubbleSmall = clamp(width * 0.34, 100, 150);

  const loopRotate = loopRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Keep refs in sync with state
  useEffect(() => { timedMinutesRef.current = timedMinutes; }, [timedMinutes]);
  useEffect(() => { contentRef.current = content; }, [content]);

  // ── Full reset cleanupAudio ───────────────────────────────────────────────
  const cleanupAudio = useCallback(async () => {
    const currentSound = soundRef.current;
    if (!currentSound) return;
    try {
      const status = await currentSound.getStatusAsync();
      if (status.isLoaded) {
        try { await currentSound.stopAsync(); } catch {}
        await currentSound.unloadAsync();
      }
    } catch (e) {
      console.warn('[PlaySound] Error cleaning up audio:', e);
    } finally {
      soundRef.current = null;
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      listenedMsRef.current = 0;
      lastPositionRef.current = 0;
      isRestartingRef.current = false;
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
      }
      if (typeof (Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX !== 'undefined') {
        mode.interruptionModeAndroid = (Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX;
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

  // ── Stop + reset when navigating away ────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      return () => {
        cleanupAudio();
        setTimedMinutes(null);
        timedMinutesRef.current = null;
      };
    }, [cleanupAudio])
  );

  // ── Use ref-based timedMinutes to avoid stale closure ────────────────────
  const onPlaybackStatusUpdate = useCallback((status: any) => {
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

    const currentTimedMinutes = timedMinutesRef.current;

    // Stop if timed loop target reached
    if (currentTimedMinutes) {
      const targetMs = currentTimedMinutes * 60 * 1000;
      if (listenedMsRef.current >= targetMs) {
        (async () => {
          try {
            const s = soundRef.current;
            if (s) {
              const st = await s.getStatusAsync();
              if (st.isLoaded) {
                await s.stopAsync();
                await s.setPositionAsync(0);
              }
              await s.unloadAsync();
            }
          } catch (e) {
            console.warn('[PlaySound] Error stopping at target time:', e);
          }
          soundRef.current = null;
          setIsPlaying(false);
          setPosition(0);
          setDuration(0);
          listenedMsRef.current = 0;
          lastPositionRef.current = 0;
          setTimedMinutes(null);
          timedMinutesRef.current = null;
        })();
        return;
      }
    }

    // Handle natural finish
    if (status.didJustFinish) {
      if (currentTimedMinutes) {
        const targetMs = currentTimedMinutes * 60 * 1000;
        if (listenedMsRef.current < targetMs) {
          (async () => {
            try {
              if (isRestartingRef.current) return;
              isRestartingRef.current = true;

              const s = soundRef.current;
              if (s) {
                try {
                  const st = await s.getStatusAsync();
                  if (st?.isLoaded) {
                    await s.setPositionAsync(0);
                    await s.playAsync();
                    isRestartingRef.current = false;
                    return;
                  }
                } catch {}
              }

              const uri = contentRef.current?.audio_url as string;
              const created = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: false, volume: 1.0 },
                onPlaybackStatusUpdate
              );
              await new Promise(resolve => setTimeout(resolve, 100));
              const newStatus = await created.sound.getStatusAsync();
              if (!newStatus.isLoaded) throw new Error('Failed to load recreated audio');
              await created.sound.setIsLoopingAsync(false);
              soundRef.current = created.sound;
              await created.sound.playAsync();
              isRestartingRef.current = false;
            } catch (e) {
              console.error('[PlaySound] Failed to restart audio:', e);
              isRestartingRef.current = false;
              setIsPlaying(false);
            }
          })();
          return;
        }
      }
      setIsPlaying(false);
    }
  }, []);

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
      Alert.alert('Playback error', e?.message || 'Unable to play audio.');
      soundRef.current = null;
      setIsPlaying(false);
    }
  };

  const handleLoopCycle = async () => {
    loopRotateAnim.setValue(0);
    Animated.timing(loopRotateAnim, { toValue: 1, duration: 380, useNativeDriver: true })
      .start(() => loopRotateAnim.setValue(0));

    const next = timedMinutes === null ? 5 : timedMinutes === 5 ? 10 : timedMinutes === 10 ? 20 : null;
    setTimedMinutes(next);
    timedMinutesRef.current = next;
    listenedMsRef.current = 0;
    lastPositionRef.current = 0;
    if (next !== null && !isPlaying && !soundRef.current) {
      await handlePlay();
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // ── Done: stop audio then navigate ───────────────────────────────────────
  const handleDone = async () => {
    if (!content) return;
    const listenedMs = Math.max(0, listenedMsRef.current || 0);
    const listenedSeconds = Math.floor(listenedMs / 1000);
    const positionSeconds = Math.floor((position || 0) / 1000);
    const durationListened = listenedSeconds || positionSeconds || 0;

    await cleanupAudio(); // stops + resets everything
    setTimedMinutes(null);
    timedMinutesRef.current = null;

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
      title="Loading sound session..."
      subtitle="Preparing your relaxation audio"
      spinnerColor="#A78BFA"
    />
  );

  if (error || !content) return (
    <View style={[styles.center, { backgroundColor: '#342949' }]}>
      <Text style={{ color: '#FFFFFF' }}>{error || 'Content not found'}</Text>
      <TouchableOpacity
        style={[styles.doneBtn, { backgroundColor: '#B8A8E6', paddingVertical: 12, borderRadius: 12, marginTop: 16 }]}
        onPress={() => router.push('./relaxation-sounds')}
      >
        <Text style={{ color: '#FFFFFF' }}>Go back</Text>
      </TouchableOpacity>
    </View>
  );

  const imageSource = SOUND_IMAGES[content.title];
  const categoryColor = CATEGORY_BADGE_COLORS[content.category] || '#666';
  const mappedBaseSeconds = ACTUAL_SOUND_DURATIONS_SECONDS[content.title] || 0;
  const fallbackBaseSeconds = content.duration_seconds || Math.floor((duration || 0) / 1000) || 0;
  const baseDurationSeconds = mappedBaseSeconds > 0 ? mappedBaseSeconds : fallbackBaseSeconds;
  const displayedTotalDurationMillis = (baseDurationSeconds + ((timedMinutes || 0) * 60)) * 1000;

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
        onPress={() => router.push('./relaxation-sounds')}
        style={[styles.backButton, {
          top: backBtnTop, left: backBtnLeft,
          width: backBtnSize, height: backBtnSize, borderRadius: backBtnRadius,
        }]}
      >
        <FontAwesome name="chevron-left" size={backIconSize} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Content */}
      <View style={[styles.content, { paddingTop: contentPaddingTop, paddingHorizontal: contentHPad }]}>
        <View style={[styles.playerCard, {
          maxWidth: contentMaxWidth, borderRadius: playerCardRadius,
          shadowOffset: { width: 0, height: playerCardShadowOffsetY },
          shadowRadius: playerCardShadowRadius,
        }]}>
          {/* Hero Image */}
          <View style={[styles.playerHero, { height: heroImageHeight }]}>
            {imageSource ? (
              <Image source={imageSource} style={styles.soundImage} />
            ) : (
              <View style={[styles.soundImage, styles.soundImageFallback]}>
                <FontAwesome name="music" size={clamp(width * 0.15, 48, 72)} color="#B8A8E6" />
              </View>
            )}
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
                onPress={handlePlay}
                style={[styles.playButton, {
                  width: playBtnSize, height: playBtnSize,
                  borderRadius: playBtnRadius,
                  marginLeft: clamp(width * 0.14, 38, 58),
                }]}
              >
                <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={playIconSize} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleLoopCycle} style={styles.loopIconBtn} activeOpacity={0.75}>
                <Animated.View style={{ transform: [{ rotate: loopRotate }] }}>
                  <MaterialIcons
                    name="loop"
                    size={loopIconSize}
                    color={timedMinutes !== null ? '#E91E63' : 'rgba(255,255,255,0.4)'}
                  />
                </Animated.View>
                {timedMinutes !== null ? (
                  <View style={[styles.loopBadge, {
                    top: loopBadgeTop, right: loopBadgeRight,
                    borderRadius: loopBadgeRadius,
                    paddingHorizontal: loopBadgePadX, paddingVertical: loopBadgePadY,
                    minWidth: timedMinutes >= 10 ? loopBadgeMinWidthWide : loopBadgeMinWidthCompact,
                  }]}>
                    <Text style={[styles.loopBadgeText, { fontSize: loopBadgeTextSize }]}>{timedMinutes}m</Text>
                  </View>
                ) : (
                  <View style={[styles.loopCrossBadge, {
                    top: loopCrossTop, right: loopCrossRight,
                    width: loopCrossSize, height: loopCrossSize, borderRadius: loopCrossRadius,
                  }]}>
                    <MaterialIcons name="close" size={loopCrossIconSize} color="rgba(255,255,255,0.72)" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Done */}
            <TouchableOpacity
              style={[styles.doneBtn, { paddingVertical: donePaddingV, borderRadius: doneRadius, marginTop: doneMarginTop }]}
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  content: { flex: 1, alignItems: 'center', zIndex: 2, width: '100%' },
  playerCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, elevation: 3,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  playerHero: { width: '100%', position: 'relative' },
  soundImage: { width: '100%', height: '100%' },
  soundImageFallback: { backgroundColor: '#473F5A', justifyContent: 'center', alignItems: 'center' },
  playerHeroOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  playerCardBody: { width: '100%' },
  title: { fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  categoryBadge: { alignSelf: 'center', borderRadius: 14 },
  categoryText: { color: '#FFFFFF', fontWeight: '600' },
  progressSection: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  progressBar: { flex: 1, backgroundColor: '#473F5A', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E91E63' },
  timeText: { color: '#FFFFFF' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  playButton: { backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center' },
  loopIconBtn: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  loopBadge: { position: 'absolute', backgroundColor: '#E91E63', alignItems: 'center' },
  loopBadgeText: { color: '#FFFFFF', fontWeight: '700' },
  loopCrossBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(80,70,100,0.9)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  doneBtn: { width: '100%', backgroundColor: '#7C3AED', alignItems: 'center' },
  doneBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
});