import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';

const matchesValue = (value: unknown, target: string) => String(value ?? '') === target;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export default function TakeABreakScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const pageInset = clamp(width * 0.03, 12, 18);
  const sectionInset = clamp(width * 0.045, 14, 20);
  const headerTopPadding = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding = clamp(height * 0.02, 14, 22);
  const headerButtonSize = clamp(width * 0.098, 34, 40);
  const headerButtonRadius = headerButtonSize / 2;
  const headerIconSize = clamp(width * 0.047, 16, 20);
  const headerTitleSize = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop = clamp(height * 0.022, 14, 22);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;
  const headerFadeDistance = clamp(height * 0.022, 14, 20);
  const headerBackOffset = clamp(width * 0.018, 6, 8);
  const bubbleLarge = clamp(width * 0.34, 100, 140);
  const bubbleMedium = clamp(width * 0.29, 90, 120);
  const bubbleSmall = clamp(width * 0.26, 82, 108);
  const contentTopPadding = headerEstimatedHeight + clamp(height * 0.028, 18, 24);
  const contentBottomPadding = clamp(insets.bottom + height * 0.04, 30, 46);
  const taglineSize = clamp(width * 0.042, 15, 17);
  const contentGap = clamp(height * 0.024, 16, 22);
  const cardsGap = clamp(height * 0.026, 16, 22);
  const cardRadius = clamp(width * 0.05, 18, 22);
  const cardPadding = clamp(width * 0.048, 16, 20);
  const cardTitleSize = clamp(width * 0.046, 16, 18);
  const cardSubSize = clamp(width * 0.035, 12, 14);
  const iconBadgeSize = clamp(width * 0.122, 42, 50);
  const iconSize = clamp(width * 0.062, 22, 26);
  const arrowSize = clamp(width * 0.055, 20, 22);

  // Handle visualization journey navigation
  const handleVisualizationJourney = async () => {
    try {
      const data = await PatientService.getRelaxationContent({});
      const visualizations = data.filter(i => {
        const isVisualization = matchesValue(i.category, 'visualization') || matchesValue(i.content_type, 'guided_meditation');
        const isBreathing = matchesValue(i.category, 'breathing') || matchesValue(i.content_type, 'breathing') || matchesValue(i.category, 'body_scan') || matchesValue(i.content_type, 'body_scan');
        const titleLower = (i.title || '').toLowerCase();
        const titleIndicatesBreath = titleLower.includes('breath') || titleLower.includes('body scan') || titleLower.includes('body-scan');
        return isVisualization && !isBreathing && !titleIndicatesBreath;
      });
      
      if (visualizations.length > 0) {
        router.push(`./playvisualization?id=${visualizations[0].id}`);
      } else {
        Alert.alert('No Content', 'No visualization journeys available right now.');
      }
    } catch (err) {
      console.error('Failed to load visualization:', err);
      Alert.alert('Error', 'Unable to load visualization journey');
    }
  };

  // Animated values for floating bubbles
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

  // Shimmer animation for accent strips
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Animate bubbles
  useEffect(() => {
    const createFloatingAnimation = (
      animatedY: Animated.Value,
      animatedX: Animated.Value,
      durationY: number,
      durationX: number,
      delay: number
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(animatedY, {
                toValue: -30,
                duration: durationY,
                useNativeDriver: true,
              }),
              Animated.timing(animatedY, {
                toValue: 0,
                duration: durationY,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(animatedX, {
                toValue: 20,
                duration: durationX,
                useNativeDriver: true,
              }),
              Animated.timing(animatedX, {
                toValue: 0,
                duration: durationX,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ])
      );
    };

    const anim1 = createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000, 0);
    const anim2 = createFloatingAnimation(bubble2Y, bubble2X, 9000, 8000, 1000);
    const anim3 = createFloatingAnimation(bubble3Y, bubble3X, 7000, 9000, 500);
    const anim4 = createFloatingAnimation(bubble4Y, bubble4X, 10000, 7500, 1500);
    const anim5 = createFloatingAnimation(bubble5Y, bubble5X, 8500, 8500, 2000);

    anim1.start();
    anim2.start();
    anim3.start();
    anim4.start();
    anim5.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      anim4.stop();
      anim5.stop();
    };
  }, [bubble1X, bubble1Y, bubble2X, bubble2Y, bubble3X, bubble3Y, bubble4X, bubble4Y, bubble5X, bubble5Y]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(800),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-90, width + 90],
  });

  return (
    <View style={[styles.container, { backgroundColor: '#342949' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />

      {/* Gradient background */}
      <LinearGradient
        colors={['#342949', '#2a1f3d', '#342949']}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Floating bubble decorations with animation */}
      <View style={styles.floatingBubbles} pointerEvents="none">
        {/* 1 — odd: warm purple 0.25 */}
        <Animated.View style={[
          styles.bubble,
          { width: bubbleLarge, height: bubbleLarge, top: headerEstimatedHeight - clamp(height * 0.04, 20, 30), right: -bubbleLarge * 0.3, backgroundColor: 'rgba(167,139,250,0.25)' },
          { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }
        ]} />
        {/* 2 — even: cool light purple 0.20 */}
        <Animated.View style={[
          styles.bubble,
          { width: bubbleLarge * 1.4, height: bubbleLarge * 1.4, top: -bubbleLarge * 0.72, left: -bubbleLarge * 0.56, backgroundColor: 'rgba(184,168,230,0.20)' },
          { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }
        ]} />
        {/* 3 — odd: warm purple 0.22 */}
        <Animated.View style={[
          styles.bubble,
          { width: bubbleMedium, height: bubbleMedium, bottom: clamp(height * 0.24, 150, 210), left: -bubbleMedium * 0.2, backgroundColor: 'rgba(167,139,250,0.22)' },
          { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }
        ]} />
        {/* 4 — even: cool light purple 0.18 */}
        <Animated.View style={[
          styles.bubble,
          { width: bubbleMedium * 1.15, height: bubbleMedium * 1.15, bottom: clamp(height * 0.12, 80, 120), right: -bubbleMedium * 0.42, backgroundColor: 'rgba(184,168,230,0.18)' },
          { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }
        ]} />
        {/* 5 — odd: warm purple 0.15 */}
        <Animated.View style={[
          styles.bubble,
          { width: bubbleSmall, height: bubbleSmall, top: '40%', right: pageInset, backgroundColor: 'rgba(167,139,250,0.15)' },
          { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }
        ]} />
      </View>

      {/* Sticky Header - Appears on scroll */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Take a"
        secondWord="Break"
        onBackPress={() => router.back()}
      />

      {/* Animated fading header */}
      <Animated.View style={[
        styles.fadingHeader,
        {
          paddingTop: headerTopPadding,
          paddingHorizontal: pageInset,
          paddingBottom: headerBottomPadding,
          opacity: scrollY.interpolate({
            inputRange: [0, headerFadeDistance * 0.45, headerFadeDistance],
            outputRange: [1, 0, 0],
            extrapolate: 'clamp',
          }),
          transform: [{
            translateY: scrollY.interpolate({
              inputRange: [0, headerFadeDistance],
              outputRange: [0, -10],
              extrapolate: 'clamp',
            }),
          }],
        },
      ]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backButton,
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
          <Text style={styles.headerWhite}>Take a </Text>
          <Text style={styles.headerPurple}>Break</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: sectionInset,
          paddingTop: contentTopPadding,
          paddingBottom: contentBottomPadding,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Tagline */}
        <Text style={[styles.tagline, { fontSize: taglineSize, marginBottom: contentGap * 1.8 }]}>
          Step away. Breathe slowly. Return softer.
        </Text>

        {/* Cards */}
        <View style={{ gap: cardsGap }}>

          {/* Relaxation Sounds */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('./relaxation-sounds')}
            style={[styles.card, { borderRadius: cardRadius, padding: cardPadding }]}
          >
            <View style={[styles.cardAccentStrip, { backgroundColor: '#63B3ED', borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius }]}>
              <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslate }] }]}>
                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.65)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shimmerGradient} />
              </Animated.View>
            </View>
            <View style={styles.cardRow}>
              <View style={[styles.iconBadge, { width: iconBadgeSize, height: iconBadgeSize, borderRadius: iconBadgeSize / 2, backgroundColor: 'rgba(99,179,237,0.14)', borderColor: 'rgba(99,179,237,0.38)' }]}>
                <MaterialIcons name="headset" size={iconSize} color="#93C5FD" />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { fontSize: cardTitleSize }]}>Relaxation Sounds</Text>
                <Text style={[styles.cardSub, { fontSize: cardSubSize }]}>Ambient audio to quiet the mind</Text>
              </View>
              <MaterialIcons name="chevron-right" size={arrowSize} color="rgba(255,255,255,0.26)" />
            </View>
          </TouchableOpacity>

          {/* Visualization Journeys */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleVisualizationJourney}
            style={[styles.card, { borderRadius: cardRadius, padding: cardPadding }]}
          >
            <View style={[styles.cardAccentStrip, { backgroundColor: '#C084FC', borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius }]}>
              <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslate }] }]}>
                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.65)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shimmerGradient} />
              </Animated.View>
            </View>
            <View style={styles.cardRow}>
              <View style={[styles.iconBadge, { width: iconBadgeSize, height: iconBadgeSize, borderRadius: iconBadgeSize / 2, backgroundColor: 'rgba(192,132,252,0.14)', borderColor: 'rgba(192,132,252,0.38)' }]}>
                <MaterialIcons name="remove-red-eye" size={iconSize} color="#D8B4FE" />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { fontSize: cardTitleSize }]}>Visualization Journeys</Text>
                <Text style={[styles.cardSub, { fontSize: cardSubSize }]}>Guided escapes for a peaceful mind</Text>
              </View>
              <MaterialIcons name="chevron-right" size={arrowSize} color="rgba(255,255,255,0.26)" />
            </View>
          </TouchableOpacity>

          {/* Breathing Exercises */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('./breathing-exercises')}
            style={[styles.card, { borderRadius: cardRadius, padding: cardPadding }]}
          >
            <View style={[styles.cardAccentStrip, { backgroundColor: '#6EE7B7', borderTopLeftRadius: cardRadius, borderTopRightRadius: cardRadius }]}>
              <Animated.View style={[styles.shimmerOverlay, { transform: [{ translateX: shimmerTranslate }] }]}>
                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.65)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shimmerGradient} />
              </Animated.View>
            </View>
            <View style={styles.cardRow}>
              <View style={[styles.iconBadge, { width: iconBadgeSize, height: iconBadgeSize, borderRadius: iconBadgeSize / 2, backgroundColor: 'rgba(110,231,183,0.14)', borderColor: 'rgba(110,231,183,0.38)' }]}>
                <MaterialIcons name="air" size={iconSize} color="#6EE7B7" />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { fontSize: cardTitleSize }]}>Breathing Exercises</Text>
                <Text style={[styles.cardSub, { fontSize: cardSubSize }]}>Slow your breath, calm your nervous system</Text>
              </View>
              <MaterialIcons name="chevron-right" size={arrowSize} color="rgba(255,255,255,0.26)" />
            </View>
          </TouchableOpacity>

        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fadingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 900,
  },
  backButton: {
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
  floatingBubbles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 1000,
  },
  scroll: {
    flex: 1,
    zIndex: 2,
  },
  tagline: {
    color: 'rgba(220,210,255,0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  cardAccentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
  },
  shimmerGradient: {
    flex: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  cardSub: {
    color: 'rgba(200,190,240,0.72)',
    fontWeight: '400',
    lineHeight: 18,
  },
});
