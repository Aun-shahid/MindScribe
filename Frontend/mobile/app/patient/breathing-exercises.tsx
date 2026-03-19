import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import PatientService, { RelaxationContent } from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export default function BreathingExercisesScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState<RelaxationContent[]>([]);
  const [loading, setLoading] = useState(true);

  // Animated bubble references
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
  const runningBubbleAnimationsRef = useRef<Animated.CompositeAnimation[]>([]);

  // Scroll animation for sticky header
  const scrollY = useRef(new Animated.Value(0)).current;

  const pageInset = clamp(width * 0.03, 12, 18);
  const headerBackOffset = clamp(width * 0.018, 6, 8);
  const headerTopPadding = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding = clamp(height * 0.02, 14, 22);
  const headerButtonSize = clamp(width * 0.098, 34, 40);
  const headerButtonRadius = headerButtonSize / 2;
  const headerIconSize = clamp(width * 0.047, 16, 20);
  const headerTitleSize = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop = clamp(height * 0.046, 28, 44);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;

  const bubbleLarge = clamp(width * 0.34, 100, 140);
  const bubbleMedium = clamp(width * 0.29, 90, 120);
  const bubbleSmall = clamp(width * 0.26, 82, 108);
  const bubbleShiftY = clamp(height * 0.035, 16, 30);
  const bubbleShiftX = clamp(width * 0.045, 14, 20);

  const listTopPadding = headerEstimatedHeight + clamp(height * 0.014, 8, 12);
  const listBottomPadding = clamp(insets.bottom + height * 0.03, 28, 44);
  const listGap = clamp(height * 0.018, 12, 18);

  const subtitleSize = clamp(width * 0.039, 14, 17);
  const subtitlePadX = clamp(width * 0.05, 16, 24);
  const subtitleBottom = clamp(height * 0.02, 14, 22);

  const cardRadius = clamp(width * 0.05, 16, 22);
  const cardPad = clamp(width * 0.05, 16, 22);
  const cardShadowY = clamp(height * 0.01, 4, 8);
  const cardShadowRadius = clamp(width * 0.02, 6, 10);
  const cardMinHeight = clamp(height * 0.19, 126, 172);
  const cardImageSize = clamp(width * 0.32, 104, 144);
  const cardImageRadius = clamp(width * 0.04, 12, 18);
  const cardImageGap = clamp(width * 0.04, 12, 16);
  const cardTitleSize = clamp(width * 0.046, 16, 20);
  const cardDescSize = clamp(width * 0.034, 12, 14);
  const cardDescLineHeight = clamp(height * 0.025, 16, 20);
  const cardTextGap = clamp(height * 0.007, 4, 8);
  const badgePadX = clamp(width * 0.03, 10, 14);
  const badgePadY = clamp(height * 0.008, 5, 8);
  const badgeRadius = clamp(width * 0.03, 10, 13);
  const badgeTextSize = clamp(width * 0.032, 11, 13);

  const createFloatingAnimation = useCallback((translateY: Animated.Value, translateX: Animated.Value, duration: number, delay: number) => {
    return Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -bubbleShiftY,
            duration: duration,
            delay: delay,
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
            toValue: bubbleShiftX,
            duration: duration * 0.7,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: -bubbleShiftX,
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
  }, [bubbleShiftX, bubbleShiftY]);

  const startBubbleAnimations = useCallback(() => {
    // Reset positions so animations restart cleanly when the screen regains focus.
    bubble1Y.setValue(0); bubble1X.setValue(0);
    bubble2Y.setValue(0); bubble2X.setValue(0);
    bubble3Y.setValue(0); bubble3X.setValue(0);
    bubble4Y.setValue(0); bubble4X.setValue(0);
    bubble5Y.setValue(0); bubble5X.setValue(0);

    const animations = [
      createFloatingAnimation(bubble1Y, bubble1X, 4000, 0),
      createFloatingAnimation(bubble2Y, bubble2X, 5000, 500),
      createFloatingAnimation(bubble3Y, bubble3X, 4500, 1000),
      createFloatingAnimation(bubble4Y, bubble4X, 5500, 1500),
      createFloatingAnimation(bubble5Y, bubble5X, 4800, 2000),
    ];
    animations.forEach(anim => anim.start());
    return animations;
  }, [bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y, bubble4X, bubble4Y, bubble5X, bubble5Y, createFloatingAnimation]);

  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      const data = await PatientService.getRelaxationContent({});
      const breathingExercises = data.filter(item => {
        const t = (item.title || '').toLowerCase();
        const contentType = String(item.content_type || '');
        const category = String(item.category || '');
        const isBreathingType = contentType === 'breathing' || category === 'breathing';
        const isBodyScanType = contentType === 'body_scan' || category === 'body_scan' || t.includes('body scan') || t.includes('body-scan');
        const isBreathTitle = t.includes('breath') || t.includes('breathing');
        return isBreathingType || isBodyScanType || isBreathTitle;
      });
      setContent(breathingExercises);
    } catch (err: any) {
      console.error('Error loading breathing exercises:', err);
      Alert.alert('Error', 'Unable to load breathing exercises');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useFocusEffect(
    useCallback(() => {
      runningBubbleAnimationsRef.current.forEach(anim => anim.stop());
      const running = startBubbleAnimations();
      runningBubbleAnimationsRef.current = running;

      return () => {
        running.forEach(anim => anim.stop());
        runningBubbleAnimationsRef.current = [];
      };
    }, [startBubbleAnimations])
  );

  const handleCardPress = (type: '5min' | '10min') => {
    // Find the appropriate content based on type
    let exercise;
    
    console.log('Total content loaded:', content.length);
    console.log('Looking for:', type);
    
    if (type === '5min') {
      // Find first breathing exercise
      exercise = content.find(item => {
        const t = (item.title || '').toLowerCase();
        const contentType = String(item.content_type || '');
        const category = String(item.category || '');
        const isBreathing = contentType === 'breathing' || 
                           category === 'breathing' || 
                           t.includes('breath');
        const notBodyScan = !t.includes('body scan') && !t.includes('body-scan');
        return isBreathing && notBodyScan;
      });
    } else {
      // Find first body scan exercise
      exercise = content.find(item => {
        const t = (item.title || '').toLowerCase();
        const contentType = String(item.content_type || '');
        const category = String(item.category || '');
        return contentType === 'body_scan' || 
               category === 'body_scan' || 
               t.includes('body scan') || 
               t.includes('body-scan');
      });
    }

    if (exercise) {
      console.log('Found exercise:', exercise.id, exercise.title);
      router.push(`./playbreathing?id=${exercise.id}`);
    } else {
      console.log('No exercise found for type:', type);
      Alert.alert('Not Available', `${type === '5min' ? 'Breathing exercise' : 'Body scan exercise'} is not available right now.`);
    }
  };

  const ContentCard = ({ 
    title, 
    description, 
    duration,
    imageSource,
    onPress 
  }: { 
    title: string; 
    description: string; 
    duration: string;
    imageSource: any;
    onPress: () => void;
  }) => {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            borderRadius: cardRadius,
            padding: cardPad,
            marginBottom: listGap,
            minHeight: cardMinHeight,
            shadowOffset: { width: 0, height: cardShadowY },
            shadowRadius: cardShadowRadius,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Image source={imageSource} style={[styles.cardImage, { width: cardImageSize, height: cardImageSize, borderRadius: cardImageRadius, marginRight: cardImageGap }]} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { fontSize: cardTitleSize, marginBottom: cardTextGap }]}>{title}</Text>
          <Text style={[styles.cardDescription, { fontSize: cardDescSize, lineHeight: cardDescLineHeight, marginBottom: cardTextGap }]}>{description}</Text>
          <View style={[styles.categoryBadge, { paddingHorizontal: badgePadX, paddingVertical: badgePadY, borderRadius: badgeRadius }]}>
            <Text style={[styles.categoryText, { fontSize: badgeTextSize }]}>{duration}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <TabLoaderCard
        fullScreen
        title="Loading breathing exercises..."
        subtitle="Setting up guided calm sessions"
        spinnerColor="#A78BFA"
      />
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#342949', '#4A3B5C', '#342949']} style={styles.gradient}>
        {/* Animated Bubbles */}
        <Animated.View style={[styles.floatingBubbles, { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }], top: '10%', left: '10%' }]}>
          <View style={[styles.bubble, { width: bubbleSmall - clamp(width * 0.05, 10, 16), height: bubbleSmall - clamp(width * 0.05, 10, 16) }]} />
        </Animated.View>
        <Animated.View style={[styles.floatingBubbles, { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }], top: '25%', right: '15%' }]}>
          <View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium }]} />
        </Animated.View>
        <Animated.View style={[styles.floatingBubbles, { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }], top: '50%', left: '5%' }]}>
          <View style={[styles.bubble, { width: bubbleSmall, height: bubbleSmall }]} />
        </Animated.View>
        <Animated.View style={[styles.floatingBubbles, { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }], top: '70%', right: '10%' }]}>
          <View style={[styles.bubble, { width: bubbleLarge, height: bubbleLarge }]} />
        </Animated.View>
        <Animated.View style={[styles.floatingBubbles, { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }], top: '85%', left: '20%' }]}>
          <View style={[styles.bubble, { width: bubbleSmall - clamp(width * 0.07, 14, 22), height: bubbleSmall - clamp(width * 0.07, 14, 22) }]} />
        </Animated.View>

        {/* Sticky Header - Appears on scroll */}
        <StickyHeader
          scrollY={scrollY}
          firstWord="Breathing"
          secondWord="Exercises"
          onBackPress={() => router.push('./take-a-break')}
        />

        <Animated.View style={[styles.headerContainer, {
          paddingTop: headerTopPadding,
          paddingHorizontal: pageInset,
          paddingBottom: headerBottomPadding,
          opacity: scrollY.interpolate({
            inputRange: [0, 100, 150],
            outputRange: [1, 0.5, 0],
            extrapolate: 'clamp',
          }),
        }]}>
          <TouchableOpacity
            onPress={() => router.push('./take-a-break')}
            style={[
              styles.backBtnCircle,
              {
                left: pageInset + headerBackOffset,
                top: headerTopPadding,
                width: headerButtonSize,
                height: headerButtonSize,
                borderRadius: headerButtonRadius,
                shadowOffset: { width: 0, height: clamp(height * 0.003, 1, 3) },
                shadowRadius: clamp(width * 0.018, 5, 7),
              },
            ]}
          >
            <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}>
            <Text style={styles.headerWhite}>Breathing </Text>
            <Text style={styles.headerPurple}>Exercises</Text>
          </Text>
        </Animated.View>

        {/* Content */}
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pageInset, paddingTop: listTopPadding, paddingBottom: listBottomPadding }]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          <Text style={[styles.subtitle, { fontSize: subtitleSize, paddingHorizontal: subtitlePadX, marginBottom: subtitleBottom }]}>Choose a guided flow for this moment and let your body settle.</Text>

          {/* Cards */}
          <ContentCard
            title="5-Minute Breathing"
            description="Quick, calming breathing exercise perfect for stress relief and mental clarity"
            duration="5:31"
            imageSource={require('../../assets/images/purplebreathing.png')}
            onPress={() => handleCardPress('5min')}
          />

          <ContentCard
            title="10-Minute Body Scan"
            description="Deep relaxation body scan meditation to release tension and promote mindfulness"
            duration="10:31"
            imageSource={require('../../assets/images/purplebodyscan.png')}
            onPress={() => handleCardPress('10min')}
          />
        </Animated.ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#B8A8E6',
  },
  floatingBubbles: {
    position: 'absolute',
    zIndex: 0,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 900,
  },
  backBtnCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    elevation: 1,
  },
  headerTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  headerWhite: {
    color: '#FFFFFF',
  },
  headerPurple: {
    color: '#B8A8E6',
  },
  bubble: {
    borderRadius: 999,
    backgroundColor: 'rgba(133, 130, 180, 0.08)',
  },
  scrollContent: {
    zIndex: 2,
  },
  subtitle: {
    color: '#B8A8E6',
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(28, 21, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    elevation: 5,
  },
  cardImage: {
    resizeMode: 'cover',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardDescription: {
    color: '#D1C7E8',
  },
  categoryBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontWeight: '600',
    color: '#B8A8E6',
  },
});



