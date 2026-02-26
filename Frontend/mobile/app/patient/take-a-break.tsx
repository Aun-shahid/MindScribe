import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import PatientService from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import OriginalHeader from '../components/OriginalHeader';

const { height: screenHeight } = Dimensions.get('window');

export default function TakeABreakScreen() {
  const router = useRouter();
  const { themeStyle } = useTheme();

  // Handle visualization journey navigation
  const handleVisualizationJourney = async () => {
    try {
      const data = await PatientService.getRelaxationContent({});
      const visualizations = data.filter(i => {
        const isVisualization = (i.category === 'visualization') || (i.content_type === 'guided_meditation');
        const isBreathing = (i.category === 'breathing') || (i.content_type === 'breathing') || (i.category === 'body_scan') || (i.content_type === 'body_scan');
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
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#342949' }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={['#342949', '#342949', '#342949']}
        start={[0, 0]}
        end={[0, 1]}
        style={[styles.screenGradient, { height: screenHeight }]}
        pointerEvents="none"
      />
      {/* Floating bubble decorations with animation */}
      <View style={styles.floatingBubbles} pointerEvents="none">
        <Animated.View style={[
          styles.bubble,
          { width: 200, height: 200, top: 50, right: -50, backgroundColor: 'rgba(115, 123, 161, 0.2)' },
          { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 280, height: 280, top: -100, left: -80, backgroundColor: 'rgba(115, 123, 161, 0.15)' },
          { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 150, height: 150, bottom: 200, left: -30, backgroundColor: 'rgba(115, 123, 161, 0.18)' },
          { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 180, height: 180, bottom: 100, right: -60, backgroundColor: 'rgba(115, 123, 161, 0.16)' },
          { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 120, height: 120, top: '40%', right: 20, backgroundColor: 'rgba(115, 123, 161, 0.12)' },
          { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }
        ]} />
      </View>

      {/* Sticky Header - Appears on scroll */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Take a"
        secondWord="Break"
      />

      <Animated.ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Original Header */}
        <OriginalHeader
          scrollY={scrollY}
          firstWord="Take a"
          secondWord="Break"
        />

        {/* Top Illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require('../../assets/images/relaxation-page.png')}
            style={styles.mainIllustration}
            resizeMode="contain"
          />
        </View>

        {/* Main Heading */}
        <Text style={[styles.mainHeading, { color: '#FFFFFF' }]}>
          Pause for a moment and breathe.
        </Text>

        {/* Description */}
        <Text style={[styles.description, { color: '#FFFFFF' }]}>
          This space is made to help you slow down, clear your mind, and gently reconnect with yourself.
          Listen to calming sounds, follow a guided breathing exercise, or drift into a peaceful visualization journey.
          {'\n'}
          There's no rush—take the time you need.
        </Text>

        {/* Call to Action */}
        <Text style={[styles.callToAction, { color: '#FFFFFF' }]}>
          Your calm starts here.
        </Text>

        {/* Cards Container */}
        <View style={styles.cardsContainer}>
          {/* Relaxation Sounds Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('./relaxation-sounds')}
            style={[styles.card, styles.blueCard]}
          >
            <Image
              source={require('../../assets/images/rel-sounds.png')}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Relaxation Sounds</Text>
              <View style={styles.cardMeta}>
                <MaterialIcons name="access-time" size={14} color="#5A8FC4" />
                <Text style={styles.cardMetaText}>Varied Timings</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Visualization Journeys Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleVisualizationJourney}
            style={[styles.card, styles.pinkCard]}
          >
            <Image
              source={require('../../assets/images/vis-sounds.png')}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Visualization Journeys</Text>
              <View style={styles.cardMeta}>
                <MaterialIcons name="access-time" size={14} color="#E89DAA" />
                <Text style={styles.cardMetaText}>15 min</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Breathing Exercises Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('./breathing-exercises')}
            style={[styles.card, styles.greenCard]}
          >
            <Image
              source={require('../../assets/images/bre-sounds.png')}
              style={styles.cardImage}
              resizeMode="cover"
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Breathing Excercises</Text>
              <View style={styles.cardMeta}>
                <MaterialIcons name="access-time" size={14} color="#7AB89D" />
                <Text style={styles.cardMetaText}>5 min & 10 min</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </Animated.ScrollView>
    </SafeAreaView>
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
    zIndex: 0,
  },
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
    paddingHorizontal: 20,
    zIndex: 2,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  mainIllustration: {
    width: 400,
    height: 320,
  },
  mainHeading: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  callToAction: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 28,
  },
  cardsContainer: {
    gap: 16,
    zIndex: 3,
  },
  card: {
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 110,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    zIndex: 3,
    overflow: 'hidden',
  },
  blueCard: {
    backgroundColor: '#D6E8F7',
  },
  pinkCard: {
    backgroundColor: '#FFE0E7',
  },
  greenCard: {
    backgroundColor: '#D9F0E3',
  },
  cardImage: {
    width: 130,
    height: '100%',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  cardContent: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetaText: {
    fontSize: 13,
    color: '#666',
  },
});