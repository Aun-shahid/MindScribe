import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import PatientService, { RelaxationContent } from '../services/patient.service';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

// Image mapping for sounds
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

const CARD_BG_COLORS: Record<string, string> = {
  'Forest Birds': '#473F5A',
  'Ocean Waves': '#473F5A',
  'Thunderstorm': '#473F5A',
  'Wind Chimes': '#473F5A',
  'Cozy Fireplace': '#473F5A',
  'White Noise': '#473F5A',
  'Gentle Rain': '#473F5A',
  'Coffee Shop': '#473F5A',
  'Snooze': '#473F5A',
  'Footsteps': '#473F5A',
  'Snow Footsteps': '#473F5A',
  'Footsteps in Snow': '#473F5A',
  'Walking in Snow': '#473F5A',
  'Stream Water': '#473F5A',
  'Flowing Stream': '#473F5A',
  'Water Stream': '#473F5A',
};

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  rain: '#4CAF50',
  ocean: '#4CAF50',
  forest: '#4CAF50',
  birds: '#4CAF50',
  fire: '#9C27B0',
  thunder: '#4CAF50',
  wind: '#9C27B0',
  river: '#4CAF50',
  meditation: '#9C27B0',
  breathing: '#9C27B0',
};

export default function RelaxationSoundsScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState<RelaxationContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
  const headerTitleMarginTop = clamp(height * 0.022, 14, 22);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;

  const bubbleLarge = clamp(width * 0.38, 110, 160);
  const bubbleMedium = clamp(width * 0.32, 95, 130);
  const bubbleSmall = clamp(width * 0.28, 85, 115);

  const contentTopPadding = headerEstimatedHeight + clamp(height * 0.018, 12, 20);
  const contentBottomPadding = clamp((insets.bottom || 0) + height * 0.03, 28, 44);
  const contentHPad = clamp(width * 0.04, 14, 22);

  const cardRadius = clamp(width * 0.053, 16, 22);
  const cardImageWidth = clamp(width * 0.27, 85, 110);
  const cardMinHeight = clamp(height * 0.09, 64, 86);
  const cardTitleSize = clamp(width * 0.04, 13, 16);
  const cardDescSize = clamp(width * 0.032, 11, 13);
  const badgePaddingX = clamp(width * 0.022, 7, 10);
  const badgePaddingY = clamp(height * 0.005, 3, 5);
  const badgeRadius = clamp(width * 0.028, 9, 11);
  const playBtnSize = clamp(width * 0.094, 32, 42);
  const playBtnRadius = playBtnSize / 2;
  const playIconSize = clamp(width * 0.047, 15, 21);

  useEffect(() => {
    loadContent();
    
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
      animations.forEach(anim => anim.stop());
    };
  }, [bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y, bubble4X, bubble4Y, bubble5X, bubble5Y]);

  

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



  const ContentCard = ({ item }: { item: RelaxationContent }) => {
    const bgColor = CARD_BG_COLORS[item.title] || '#473F5A';
    const categoryBadgeColor = CATEGORY_BADGE_COLORS[item.category] || '#4CAF50';
    const imageSource = SOUND_IMAGES[item.title];

    return (
      <TouchableOpacity 
        onPress={() => router.push(`./playsound?id=${item.id}`)} 
        activeOpacity={0.8}
        style={styles.cardWrapper}
      >
        <View style={[styles.card, { backgroundColor: bgColor, borderRadius: cardRadius, minHeight: cardMinHeight }]}>
          {imageSource && (
            <Image
              source={imageSource}
              style={[styles.cardImage, { width: cardImageWidth, borderTopLeftRadius: cardRadius, borderBottomLeftRadius: cardRadius }]}
              resizeMode="cover"
            />
          )}
          <View style={[styles.cardContent, { paddingLeft: clamp(width * 0.04, 12, 18), paddingRight: clamp(width * 0.03, 10, 14) }]}>
            <Text style={[styles.cardTitle, { fontSize: cardTitleSize }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.cardDescription, { fontSize: cardDescSize }]} numberOfLines={1}>
              {item.description}
            </Text>
            <View style={[styles.categoryBadge, { backgroundColor: categoryBadgeColor, paddingHorizontal: badgePaddingX, paddingVertical: badgePaddingY, borderRadius: badgeRadius }]}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          </View>
          <View style={styles.arrowContainer}>
            <View style={[styles.playButton, { width: playBtnSize, height: playBtnSize, borderRadius: playBtnRadius }]}>
              <MaterialIcons name="arrow-forward-ios" size={playIconSize} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <TabLoaderCard
        fullScreen
        title="Loading relaxation sounds..."
        subtitle="Preparing calming content for you"
        spinnerColor="#A78BFA"
      />
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: '#342949' }]}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>🎵</Text>
          <Text style={[styles.errorText, { color: '#FFFFFF' }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: '#B8A8E6' }]} onPress={loadContent}>
            <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (content.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: '#342949' }]}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🎧</Text>
          <Text style={[styles.emptyTitle, { color: '#FFFFFF' }]}>No relaxation sounds available</Text>
          <Text style={[styles.emptySubtext, { color: 'rgba(255,255,255,0.7)' }]}>
            Check back later for calming sounds and meditation content
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#342949', '#342949', '#342949']}
        style={styles.screenGradient}
        pointerEvents="none"
      />

      {/* Animated Bubbles */}
      <Animated.View style={[
        styles.bubble, 
        { width: bubbleLarge, height: bubbleLarge, top: '10%', right: '-10%', backgroundColor: 'rgba(133, 130, 180, 0.25)' },
        { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }
      ]} pointerEvents="none" />
      <Animated.View style={[
        styles.bubble, 
        { width: bubbleLarge + 20, height: bubbleLarge + 20, top: '-5%', left: '-12%', backgroundColor: 'rgba(133, 130, 180, 0.2)' },
        { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }
      ]} pointerEvents="none" />
      <Animated.View style={[
        styles.bubble, 
        { width: bubbleSmall, height: bubbleSmall, bottom: '25%', left: '-8%', backgroundColor: 'rgba(133, 130, 180, 0.22)' },
        { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }
      ]} pointerEvents="none" />
      <Animated.View style={[
        styles.bubble, 
        { width: bubbleMedium, height: bubbleMedium, bottom: '12%', right: '-10%', backgroundColor: 'rgba(133, 130, 180, 0.18)' },
        { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }
      ]} pointerEvents="none" />
      <Animated.View style={[
        styles.bubble, 
        { width: bubbleSmall - 10, height: bubbleSmall - 10, top: '40%', right: '5%', backgroundColor: 'rgba(133, 130, 180, 0.15)' },
        { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }
      ]} pointerEvents="none" />

      {/* Sticky Header - Appears on scroll */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Relaxation"
        secondWord="Sounds"
        onBackPress={() => router.push('./take-a-break')}
      />

      {/* Goals-style fading header */}
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
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderColor: 'rgba(255,255,255,0.14)',
            },
          ]}
        >
          <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}>
          <Text style={styles.headerWhite}>Relaxation </Text>
          <Text style={styles.headerPurple}>Sounds</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: contentTopPadding, paddingBottom: contentBottomPadding }]}
        style={styles.scroll}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <Text style={[styles.subtitle, { fontSize: clamp(width * 0.038, 13, 16), paddingHorizontal: contentHPad }]}>
          Nature sounds and ambient audio for relaxation
        </Text>

        {/* Content List */}
        <View style={[styles.contentList, { paddingHorizontal: contentHPad }]}>
          {content
              .filter((item) => {
                const t = (item.title || '').toLowerCase();
                const isBreathing = (item.category as string) === 'breathing' || (item.content_type as string) === 'breathing' || t.includes('breath') || t.includes('breathing');
                const isBodyScan = (item.category as string) === 'body_scan' || (item.content_type as string) === 'body_scan' || t.includes('body scan') || t.includes('body-scan');
                const isVisualization = (item.category as string) === 'visualization' || (item.content_type as string) === 'guided_meditation' || t.includes('visualization') || t.includes('guided meditation') || t.includes('guided-meditation');

                // Relaxing Sounds page: exclude breathing, body-scan, and visualization items
                return !isBreathing && !isBodyScan && !isVisualization;
              })
              .map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
        </View>

        {/* Footer Spacing */}
        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* Filters removed */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scroll: {
    flex: 1,
    zIndex: 2,
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
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  headerTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginBottom: 16,
  },
  contentList: {
    paddingTop: 20,
    gap: 12,
    zIndex: 3,
  },
  cardWrapper: {
    marginBottom: 12,
    zIndex: 3,
  },
  card: {
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    zIndex: 3,
  },
  cardImage: {
    width: 100,
    height: '100%',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  cardContent: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  arrowContainer: {
    paddingRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 83, 80, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
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







