import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, useWindowDimensions, Image } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Audio, ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService, { RelaxationContent } from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const GUIDED_DURATIONS_SECONDS = {
  breathing: 331,
  visualization: 1072,
  bodyScan: 631,
};

export default function PlayBreathingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState<RelaxationContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);

  const listenedMsRef = useRef(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isCleaningRef = useRef(false);
  const isSeekingRef = useRef(false);
  const runningBubbleAnimationsRef = useRef<Animated.CompositeAnimation[]>([]);

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
  const scrollY = useRef(new Animated.Value(0)).current;

  const pageInset            = clamp(width * 0.03,   12, 18);
  const headerBackOffset     = clamp(width * 0.018,   6,  8);
  const headerTopPadding     = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding  = clamp(height * 0.02,  14, 22);
  const headerButtonSize     = clamp(width * 0.098,  34, 40);
  const headerButtonRadius   = headerButtonSize / 2;
  const headerIconSize       = clamp(width * 0.047,  16, 20);
  const headerTitleSize      = clamp(width * 0.072,  24, 30);
  const headerTitleMarginTop = clamp(height * 0.046, 28, 44);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;

  const contentTopPadding   = headerEstimatedHeight + clamp(height * 0.014, 8, 12);
  const contentBottomPadding= clamp(insets.bottom + height * 0.03, 28, 44);
  const contentMaxWidth     = clamp(width * 0.92, 320, 460);

  const bubbleLarge  = clamp(width * 0.34, 100, 140);
  const bubbleMedium = clamp(width * 0.29,  90, 120);
  const bubbleSmall  = clamp(width * 0.26,  82, 108);
  const bubbleShiftY = clamp(height * 0.035, 16, 30);
  const bubbleShiftX = clamp(width * 0.045,  14, 20);

  const playerCardRadius      = clamp(width * 0.05,   16, 22);
  const playerCardPadding     = clamp(width * 0.05,   16, 22);
  const playerCardShadowOffY  = clamp(height * 0.014,  6, 10);
  const playerCardShadowR     = clamp(width * 0.05,   12, 18);
  const heroImageHeight       = clamp(width * 0.62,  210, 290);

  const titleSize         = clamp(width * 0.065,  22, 30);
  const titleMarginBottom = clamp(height * 0.012,   8, 14);
  const subtitleSize      = clamp(width * 0.034,  12, 14);
  const subtitleMarginBottom = clamp(height * 0.022, 14, 20);

  const progressMarginBottom = clamp(height * 0.026, 16, 28);
  const progressGap         = clamp(width * 0.03,    8, 12);
  const progressBarHeight   = clamp(height * 0.008,  5,  7);
  const progressBarRadius   = progressBarHeight / 2;
  const timeTextSize        = clamp(width * 0.034,  12, 14);
  const timeTextMinWidth    = clamp(width * 0.11,   38, 48);

  const controlsMarginBottom= clamp(height * 0.035, 22, 38);
  const controlGap          = clamp(width * 0.065,  18, 30);
  const skipBtnSize         = clamp(width * 0.145,  48, 60);
  const skipIconSize        = clamp(width * 0.095,  28, 36);
  const playBtnSize         = clamp(width * 0.21,   72, 96);
  const playBtnRadius       = playBtnSize / 2;
  const playIconSize        = clamp(width * 0.13,   44, 60);

  const donePaddingV  = clamp(height * 0.018, 12, 18);
  const doneFontSize  = clamp(width * 0.043,  15, 19);
  const doneRadius    = clamp(width * 0.065,  22, 30);

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

  const cleanupAudio = useCallback(async () => {
    if (isCleaningRef.current) return;
    isCleaningRef.current = true;
    try {
      const currentSound = soundRef.current;
      if (!currentSound) return;
      const status = await currentSound.getStatusAsync();
      if (status.isLoaded) {
        try { await currentSound.pauseAsync(); } catch {}
        try { await currentSound.stopAsync(); } catch (err: any) {
          if (!String(err?.message || '').toLowerCase().includes('seeking interrupted'))
            console.error('Error stopping audio:', err);
        }
        try { await currentSound.unloadAsync(); } catch (err: any) {
          if (!String(err?.message || '').toLowerCase().includes('seeking interrupted'))
            console.error('Error unloading audio:', err);
        }
      }
    } catch (err) {
      console.error('Error cleaning up audio:', err);
    } finally {
      soundRef.current = null;
      listenedMsRef.current = 0;
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      isCleaningRef.current = false;
    }
  }, []);

  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      const data = await PatientService.getRelaxationContent({});
      const item = data.find(
        (c: any) => c.id === id || c.id.toString() === id || c.id === parseInt(id || '0', 10)
      );
      if (item) {
        setContent(item);
      } else {
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
  }, [id, router]);

  const createFloatingAnimation = useCallback(
    (translateY: Animated.Value, translateX: Animated.Value, dur: number, delay: number) => {
      return Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(translateY, { toValue: -bubbleShiftY, duration: dur, delay, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: dur, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(translateX, { toValue:  bubbleShiftX, duration: dur * 0.7, delay, useNativeDriver: true }),
            Animated.timing(translateX, { toValue: -bubbleShiftX, duration: dur * 0.7,       useNativeDriver: true }),
            Animated.timing(translateX, { toValue: 0,             duration: dur * 0.6,        useNativeDriver: true }),
          ]),
        ])
      );
    },
    [bubbleShiftX, bubbleShiftY]
  );

  const startBubbleAnimations = useCallback(() => {
    [bubble1Y,bubble1X,bubble2Y,bubble2X,bubble3Y,bubble3X,bubble4Y,bubble4X,bubble5Y,bubble5X]
      .forEach(v => v.setValue(0));
    const animations = [
      createFloatingAnimation(bubble1Y, bubble1X, 4000,    0),
      createFloatingAnimation(bubble2Y, bubble2X, 5000,  500),
      createFloatingAnimation(bubble3Y, bubble3X, 4500, 1000),
      createFloatingAnimation(bubble4Y, bubble4X, 5500, 1500),
      createFloatingAnimation(bubble5Y, bubble5X, 4800, 2000),
    ];
    animations.forEach(a => a.start());
    return animations;
  }, [bubble1X,bubble1Y,bubble2X,bubble2Y,bubble3X,bubble3Y,bubble4X,bubble4Y,bubble5X,bubble5Y,createFloatingAnimation]);

  useEffect(() => {
    loadContent();
    setupAudio();
    return () => {
      runningBubbleAnimationsRef.current.forEach(a => a.stop());
      runningBubbleAnimationsRef.current = [];
      cleanupAudio();
    };
  }, [cleanupAudio, loadContent]);

  useFocusEffect(
    useCallback(() => {
      runningBubbleAnimationsRef.current.forEach(a => a.stop());
      const running = startBubbleAnimations();
      runningBubbleAnimationsRef.current = running;
      return () => {
        running.forEach(a => a.stop());
        runningBubbleAnimationsRef.current = [];
        cleanupAudio();
      };
    }, [startBubbleAnimations, cleanupAudio])
  );

  const onPlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);
    if (status.isPlaying) listenedMsRef.current = status.positionMillis || listenedMsRef.current;
    if (status.didJustFinish) setIsPlaying(false);
  };

  const resolveLoadedSound = async () => {
    const current = soundRef.current;
    if (!current) return null;
    try {
      const status = await current.getStatusAsync();
      if (!status.isLoaded) return null;
      return { current, status };
    } catch { return null; }
  };

  const handlePlay = async () => {
    try {
      if (!content) return;
      const loaded = await resolveLoadedSound();
      if (loaded) {
        if (loaded.status.isPlaying) { await loaded.current.pauseAsync(); setIsPlaying(false); }
        else                         { await loaded.current.playAsync();  setIsPlaying(true);  }
        return;
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: content.audio_url },
        { shouldPlay: false, volume: 1.0 },
        onPlaybackStatusUpdate
      );
      await new Promise(resolve => setTimeout(resolve, 100));
      const status = await newSound.getStatusAsync();
      if (!status.isLoaded) { try { await newSound.unloadAsync(); } catch {} throw new Error('Unable to load audio'); }
      await newSound.setIsLoopingAsync(false);
      soundRef.current = newSound;
      listenedMsRef.current = 0;
      await newSound.playAsync();
      setIsPlaying(true);
    } catch (err) {
      console.error('Audio play error', err);
      Alert.alert('Error', 'Unable to play audio. Please try again.');
    }
  };

  const handleSkipBackward = async () => {
    if (isCleaningRef.current || isSeekingRef.current) return;
    isSeekingRef.current = true;
    const loaded = await resolveLoadedSound();
    if (!loaded) { isSeekingRef.current = false; return; }
    try {
      await loaded.current.setPositionAsync(Math.max(0, (loaded.status.positionMillis || 0) - 10000));
    } catch (err: any) {
      if (!String(err?.message || '').toLowerCase().includes('seeking interrupted')) console.error('Skip backward error', err);
    } finally { isSeekingRef.current = false; }
  };

  const handleSkipForward = async () => {
    if (isCleaningRef.current || isSeekingRef.current) return;
    isSeekingRef.current = true;
    const loaded = await resolveLoadedSound();
    if (!loaded) { isSeekingRef.current = false; return; }
    try {
      const cur = loaded.status.positionMillis || 0;
      const max = loaded.status.durationMillis || duration || 0;
      await loaded.current.setPositionAsync(max > 0 ? Math.min(max, cur + 10000) : cur + 10000);
    } catch (err: any) {
      if (!String(err?.message || '').toLowerCase().includes('seeking interrupted')) console.error('Skip forward error', err);
    } finally { isSeekingRef.current = false; }
  };

  const handleDone = async () => {
    try {
      const durationListened = Math.floor(listenedMsRef.current / 1000);
      await cleanupAudio();
      router.push({
        pathname: './relaxation-sessions',
        params: {
          contentId:       content?.id.toString() || '',
          contentTitle:    content?.title || '',
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
    const s = Math.floor(millis / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const isBodyScanContent = () => {
    const title    = (content?.title    || '').toLowerCase();
    const category = String(content?.category || '').toLowerCase();
    return title.includes('body scan') || title.includes('body-scan') || category === 'body_scan';
  };

  if (loading) {
    return <TabLoaderCard fullScreen title="Loading breathing session..." subtitle="Preparing your guided audio" spinnerColor="#A78BFA" />;
  }

  if (!content) {
    return (
      <View style={[styles.center, { backgroundColor: '#342949' }]}>
        <Text style={styles.errorText}>Content not found</Text>
      </View>
    );
  }

  const titleLower    = (content.title    || '').toLowerCase();
  const categoryLower = (content.category || '').toLowerCase();
  const isBodyScan      = titleLower.includes('body scan') || titleLower.includes('body-scan') || categoryLower === 'body_scan';
  const isVisualization = titleLower.includes('visualization') || categoryLower === 'visualization' || categoryLower === 'guided_meditation';
  const isBreathing     = titleLower.includes('breath') || categoryLower === 'breathing';
  const exactDurationSeconds = isBodyScan      ? GUIDED_DURATIONS_SECONDS.bodyScan
                             : isVisualization ? GUIDED_DURATIONS_SECONDS.visualization
                             : isBreathing     ? GUIDED_DURATIONS_SECONDS.breathing
                             : (content.duration_seconds || Math.floor((duration || 0) / 1000) || 0);
  const displayedTotalMs = exactDurationSeconds * 1000;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#342949', '#342949', '#342949']} style={styles.screenGradient} />

      {/* Bubbles — zIndex 0, BEHIND the scroll view and card */}
      <Animated.View style={[styles.bubble, { width: bubbleSmall,  height: bubbleSmall,  top: '10%', left: '10%',  backgroundColor: 'rgba(133,130,180,0.08)', transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }]} />
      <Animated.View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium, top: '25%', right: '15%', backgroundColor: 'rgba(133,130,180,0.10)', transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }]} />
      <Animated.View style={[styles.bubble, { width: bubbleSmall,  height: bubbleSmall,  top: '50%', left: '5%',   backgroundColor: 'rgba(133,130,180,0.09)', transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }]} />
      <Animated.View style={[styles.bubble, { width: bubbleLarge,  height: bubbleLarge,  top: '70%', right: '10%', backgroundColor: 'rgba(133,130,180,0.10)', transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }]} />
      <Animated.View style={[styles.bubble, { width: bubbleSmall - clamp(width*0.07,14,22), height: bubbleSmall - clamp(width*0.07,14,22), top: '85%', left: '20%', backgroundColor: 'rgba(133,130,180,0.08)', transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }]} />

      <StickyHeader
        scrollY={scrollY}
        firstWord="Breathing"
        secondWord="Session"
        onBackPress={() => router.push('./breathing-exercises')}
      />

      {/* Fading header */}
      <Animated.View style={[styles.headerContainer, {
        paddingTop: headerTopPadding,
        paddingHorizontal: pageInset,
        paddingBottom: headerBottomPadding,
        opacity: scrollY.interpolate({ inputRange: [0, 100, 150], outputRange: [1, 0.5, 0], extrapolate: 'clamp' }),
      }]}>
        {/* Back button — hitSlop so full circle always tappable */}
        <TouchableOpacity
          onPress={() => router.push('./breathing-exercises')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.backBtnCircle, {
            left: pageInset + headerBackOffset,
            top: headerTopPadding,
            width: headerButtonSize,
            height: headerButtonSize,
            borderRadius: headerButtonRadius,
            shadowOffset: { width: 0, height: clamp(height * 0.003, 1, 3) },
            shadowRadius: clamp(width * 0.018, 5, 7),
          }]}
        >
          <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}>
          <Text style={styles.headerWhite}>Breathing </Text>
          <Text style={styles.headerPurple}>Session</Text>
        </Text>
      </Animated.View>

      {/* Scroll view — zIndex 2, above bubbles */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingHorizontal: pageInset,
          paddingTop: contentTopPadding,
          paddingBottom: contentBottomPadding,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Player card — solid background so bubbles cannot bleed through on APK */}
        <View style={[styles.playerCard, {
          maxWidth: contentMaxWidth,
          borderRadius: playerCardRadius,
          shadowOffset: { width: 0, height: playerCardShadowOffY },
          shadowRadius: playerCardShadowR,
        }]}>
          {/* Hero */}
          <View style={[styles.playerHero, { height: heroImageHeight }]}>
            {isBodyScanContent() ? (
              <Image source={require('../../assets/images/purplebodyscan.png')} style={styles.soundImage} resizeMode="cover" />
            ) : videoLoadFailed ? (
              <Image source={require('../../assets/images/purplebreathing.png')} style={styles.soundImage} resizeMode="cover" />
            ) : (
              <Video
                source={require('../../assets/images/breathingexcercisevid_android.mp4')}
                style={styles.soundImage}
                shouldPlay
                isLooping
                isMuted
                resizeMode={ResizeMode.COVER}
                onLoadStart={() => setVideoLoadFailed(false)}
                onError={(error) => {
                  console.error('Breathing hero video failed to load:', error);
                  setVideoLoadFailed(true);
                }}
              />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(24,15,39,0.12)', 'rgba(24,15,39,0.55)']}
              style={styles.playerHeroOverlay}
              pointerEvents="none"
            />
          </View>

          <View style={[styles.playerBody, { padding: playerCardPadding }]}>
            <Text style={[styles.title, { fontSize: titleSize, marginBottom: titleMarginBottom }]}>
              {content.title}
            </Text>
            <Text style={[styles.description, { fontSize: subtitleSize, marginBottom: subtitleMarginBottom }]}>
              {content.description || 'Focus on slow, steady breathing and stay present.'}
            </Text>

            {/* Progress */}
            <View style={[styles.progressSection, { marginBottom: progressMarginBottom, gap: progressGap }]}>
              <Text style={[styles.timeText, { fontSize: timeTextSize, minWidth: timeTextMinWidth }]}>
                {formatTime(position)}
              </Text>
              <View style={[styles.progressBar, { height: progressBarHeight, borderRadius: progressBarRadius }]}>
                <View style={[styles.progressFill, { width: `${duration > 0 ? (position / duration) * 100 : 0}%`, borderRadius: progressBarRadius }]} />
              </View>
              <Text style={[styles.timeText, { fontSize: timeTextSize, minWidth: timeTextMinWidth }]}>
                {displayedTotalMs > 0 ? formatTime(displayedTotalMs) : '--:--'}
              </Text>
            </View>

            {/* Controls */}
            <View style={[styles.controls, { marginBottom: controlsMarginBottom, gap: controlGap }]}>
              <TouchableOpacity style={[styles.skipButton, { width: skipBtnSize, height: skipBtnSize, borderRadius: skipBtnSize / 2 }]} onPress={handleSkipBackward}>
                <MaterialIcons name="replay-10" size={skipIconSize} color="#B8A8E6" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.playButton, { width: playBtnSize, height: playBtnSize, borderRadius: playBtnRadius }]} onPress={handlePlay}>
                <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={playIconSize} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.skipButton, { width: skipBtnSize, height: skipBtnSize, borderRadius: skipBtnSize / 2 }]} onPress={handleSkipForward}>
                <MaterialIcons name="forward-10" size={skipIconSize} color="#B8A8E6" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.doneButton, { paddingVertical: donePaddingV, borderRadius: doneRadius }]} onPress={handleDone}>
              <Text style={[styles.doneButtonText, { fontSize: doneFontSize }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#342949' },
  screenGradient:{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 0 },

  // zIndex 0 — bubbles stay BEHIND the scroll view and card
  bubble: { position: 'absolute', borderRadius: 999, zIndex: 0 },

  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900 },
  backBtnCircle: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000', shadowOpacity: 0.03, elevation: 1,
  },
  headerTitle:  { fontWeight: '800', textAlign: 'center' },
  headerWhite:  { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },

  // zIndex 2 — scroll view above bubbles
  scrollView: { flex: 1, zIndex: 2 },

  // Solid card background — #2E2448 matches the app dark purple but is opaque
  // Previously rgba(255,255,255,0.08) was transparent, letting bubbles bleed through on APK
  playerCard: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#2E2448',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    elevation: 3,
  },

  playerHero:        { width: '100%', position: 'relative' },
  soundImage:        { width: '100%', height: '100%', resizeMode: 'cover' },
  playerHeroOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  playerBody:        { width: '100%', alignItems: 'center' },
  title:             { fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  description:       { color: 'rgba(255,255,255,0.72)', textAlign: 'center' },
  progressSection:   { width: '100%', flexDirection: 'row', alignItems: 'center' },
  progressBar:       { flex: 1, backgroundColor: '#473F5A', overflow: 'hidden' },
  progressFill:      { height: '100%', backgroundColor: '#B8A8E6' },
  timeText:          { color: '#FFFFFF' },
  controls:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  skipButton:        { backgroundColor: '#473F5A', justifyContent: 'center', alignItems: 'center' },
  playButton: {
    backgroundColor: '#E91E63', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#E91E63', shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 12, elevation: 10,
  },
  doneButton: {
    width: '100%', backgroundColor: '#7C3AED', alignItems: 'center',
    shadowColor: '#7C3AED', shadowOpacity: 0.34,
    shadowOffset: { width: 0, height: 10 }, shadowRadius: 14, elevation: 10,
  },
  doneButtonText: { color: '#FFF', fontWeight: 'bold' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText:      { color: '#FFFFFF', textAlign: 'center' },
});
