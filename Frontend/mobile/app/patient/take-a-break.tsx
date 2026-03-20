import React, { useRef, useEffect, useCallback } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
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

  // ── Responsive tokens ─────────────────────────────────────────────────────
  const pageInset           = clamp(width * 0.03,   12, 18);
  const sectionInset        = clamp(width * 0.045,  14, 20);
  const hTop                = insets.top + clamp(height * 0.014, 10, 18);
  const hBtnSz              = clamp(width * 0.098,  34, 40);
  const hBtnR               = hBtnSz / 2;
  const hIconSz             = clamp(width * 0.047,  16, 20);
  const hTitleSz            = clamp(width * 0.072,  24, 30);
  const hMTop               = clamp(height * 0.022, 14, 22);
  const hBotPad             = clamp(height * 0.02,  14, 22);
  // hEst: safe area + button row + gap + title line height + bottom pad
  const hEst                = hTop + hBtnSz + hMTop * 0.5 + hTitleSz * 1.3 + hBotPad;
  const headerFadeDist      = clamp(height * 0.022, 14, 20);

  const bubbleLarge         = clamp(width * 0.34, 100, 140);
  const bubbleMedium        = clamp(width * 0.29,  90, 120);
  const bubbleSmall         = clamp(width * 0.26,  82, 108);

  const contentTopPad       = hEst + clamp(height * 0.028, 18, 24);
  const contentBotPad       = clamp(insets.bottom + height * 0.04, 30, 46);
  const taglineSz           = clamp(width * 0.042, 15, 17);
  const contentGap          = clamp(height * 0.024, 16, 22);
  const cardsGap            = clamp(height * 0.026, 16, 22);
  const cardRadius          = clamp(width * 0.05,  18, 22);
  const cardPadding         = clamp(width * 0.048, 16, 20);
  const cardTitleSz         = clamp(width * 0.046, 16, 18);
  const cardSubSz           = clamp(width * 0.035, 12, 14);
  const iconBadgeSz         = clamp(width * 0.122, 42, 50);
  const iconSz              = clamp(width * 0.062, 22, 26);
  const arrowSz             = clamp(width * 0.055, 20, 22);

  // ── Animated values ───────────────────────────────────────────────────────
  const b1y = useRef(new Animated.Value(0)).current;
  const b1x = useRef(new Animated.Value(0)).current;
  const b2y = useRef(new Animated.Value(0)).current;
  const b2x = useRef(new Animated.Value(0)).current;
  const b3y = useRef(new Animated.Value(0)).current;
  const b3x = useRef(new Animated.Value(0)).current;
  const b4y = useRef(new Animated.Value(0)).current;
  const b4x = useRef(new Animated.Value(0)).current;
  const b5y = useRef(new Animated.Value(0)).current;
  const b5x = useRef(new Animated.Value(0)).current;
  const scrollY     = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // ── Bubble animations — useFocusEffect so they restart on screen focus ───
  useFocusEffect(
    useCallback(() => {
      [b1y,b1x,b2y,b2x,b3y,b3x,b4y,b4x,b5y,b5x].forEach(v => v.setValue(0));

      const fly = (y: Animated.Value, x: Animated.Value, dY: number, dX: number, delay = 0) => {
        const c = Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.loop(Animated.sequence([
                Animated.timing(y, { toValue: -30, duration: dY, useNativeDriver: true }),
                Animated.timing(y, { toValue:   0, duration: dY, useNativeDriver: true }),
              ])),
              Animated.loop(Animated.sequence([
                Animated.timing(x, { toValue:  20, duration: dX, useNativeDriver: true }),
                Animated.timing(x, { toValue:   0, duration: dX, useNativeDriver: true }),
              ])),
            ]),
          ])
        );
        c.start();
        return c;
      };

      const anims = [
        fly(b1y, b1x, 8000, 7000,    0),
        fly(b2y, b2x, 9000, 8000, 1000),
        fly(b3y, b3x, 7000, 9000,  500),
        fly(b4y, b4x, 10000, 7500, 1500),
        fly(b5y, b5x, 8500, 8500, 2000),
      ];

      return () => anims.forEach(a => a.stop());
    }, [])
  );

  // ── Shimmer animation ─────────────────────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(800),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-90, width + 90],
  });

  // ── Visualization handler ─────────────────────────────────────────────────
  const handleVisualizationJourney = async () => {
    try {
      const data = await PatientService.getRelaxationContent({});
      const visualizations = data.filter((i: any) => {
        const isViz      = matchesValue(i.category, 'visualization') || matchesValue(i.content_type, 'guided_meditation');
        const isBreath   = matchesValue(i.category, 'breathing') || matchesValue(i.content_type, 'breathing') || matchesValue(i.category, 'body_scan') || matchesValue(i.content_type, 'body_scan');
        const titleLower = (i.title || '').toLowerCase();
        const hasBreath  = titleLower.includes('breath') || titleLower.includes('body scan') || titleLower.includes('body-scan');
        return isViz && !isBreath && !hasBreath;
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />

      {/* Background gradient — zIndex 0 */}
      <LinearGradient
        colors={['#342949', '#2a1f3d', '#342949']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Floating bubbles — zIndex 0, BEHIND everything including cards */}
      <View style={styles.bubblesLayer} pointerEvents="none">
        <Animated.View style={[styles.bubble, {
          width: bubbleLarge, height: bubbleLarge,
          top: hEst - clamp(height * 0.04, 20, 30),
          right: -bubbleLarge * 0.3,
          backgroundColor: 'rgba(167,139,250,0.25)',
          transform: [{ translateY: b1y }, { translateX: b1x }],
        }]} />
        <Animated.View style={[styles.bubble, {
          width: bubbleLarge * 1.4, height: bubbleLarge * 1.4,
          top: -bubbleLarge * 0.72,
          left: -bubbleLarge * 0.56,
          backgroundColor: 'rgba(184,168,230,0.20)',
          transform: [{ translateY: b2y }, { translateX: b2x }],
        }]} />
        <Animated.View style={[styles.bubble, {
          width: bubbleMedium, height: bubbleMedium,
          bottom: clamp(height * 0.24, 150, 210),
          left: -bubbleMedium * 0.2,
          backgroundColor: 'rgba(167,139,250,0.22)',
          transform: [{ translateY: b3y }, { translateX: b3x }],
        }]} />
        <Animated.View style={[styles.bubble, {
          width: bubbleMedium * 1.15, height: bubbleMedium * 1.15,
          bottom: clamp(height * 0.12, 80, 120),
          right: -bubbleMedium * 0.42,
          backgroundColor: 'rgba(184,168,230,0.18)',
          transform: [{ translateY: b4y }, { translateX: b4x }],
        }]} />
        <Animated.View style={[styles.bubble, {
          width: bubbleSmall, height: bubbleSmall,
          top: '40%',
          right: pageInset,
          backgroundColor: 'rgba(167,139,250,0.15)',
          transform: [{ translateY: b5y }, { translateX: b5x }],
        }]} />
      </View>

      {/* Sticky header */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Take a"
        secondWord="Break"
        onBackPress={() => router.push('./actions' as any)}
      />

      {/* Fading large header — flex-row layout, no absolute back button */}
      <Animated.View style={[styles.fadingHeader, {
        paddingTop: hTop,
        opacity: scrollY.interpolate({
          inputRange: [0, headerFadeDist * 0.45, headerFadeDist],
          outputRange: [1, 0, 0],
          extrapolate: 'clamp',
        }),
        transform: [{
          translateY: scrollY.interpolate({
            inputRange: [0, headerFadeDist],
            outputRange: [0, -10],
            extrapolate: 'clamp',
          }),
        }],
      }]}>
        {/* Row 1 — back button only (no right element needed here) */}
        <View style={{ paddingHorizontal: pageInset }}>
          <TouchableOpacity
            onPress={() => router.push('./actions' as any)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: hBtnSz, height: hBtnSz, borderRadius: hBtnR,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
            }}
          >
            <FontAwesome name="chevron-left" size={hIconSz} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Row 2 — title, below button with spacing */}
        <View style={{ alignItems: 'center', marginTop: hMTop * 0.5, paddingBottom: hBotPad }}>
          <Text style={{ fontSize: hTitleSz, fontWeight: '800', textAlign: 'center' }}>
            <Text style={{ color: '#FFFFFF' }}>Take a </Text>
            <Text style={{ color: '#B8A8E6' }}>Break</Text>
          </Text>
        </View>
      </Animated.View>

      {/* Scroll content — zIndex 2 so it sits above bubbles */}
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: sectionInset,
          paddingTop: contentTopPad,
          paddingBottom: contentBotPad,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <Text style={[styles.tagline, { fontSize: taglineSz, marginBottom: contentGap * 1.8 }]}>
          Step away. Breathe slowly. Return softer.
        </Text>

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
            <View style={[styles.cardRow, { marginTop: 8 }]}>
              <View style={[styles.iconBadge, { width: iconBadgeSz, height: iconBadgeSz, borderRadius: iconBadgeSz / 2, backgroundColor: 'rgba(99,179,237,0.14)', borderColor: 'rgba(99,179,237,0.38)' }]}>
                <MaterialIcons name="headset" size={iconSz} color="#93C5FD" />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { fontSize: cardTitleSz }]}>Relaxation Sounds</Text>
                <Text style={[styles.cardSub, { fontSize: cardSubSz }]}>Ambient audio to quiet the mind</Text>
              </View>
              <MaterialIcons name="chevron-right" size={arrowSz} color="rgba(255,255,255,0.26)" />
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
            <View style={[styles.cardRow, { marginTop: 8 }]}>
              <View style={[styles.iconBadge, { width: iconBadgeSz, height: iconBadgeSz, borderRadius: iconBadgeSz / 2, backgroundColor: 'rgba(192,132,252,0.14)', borderColor: 'rgba(192,132,252,0.38)' }]}>
                <MaterialIcons name="remove-red-eye" size={iconSz} color="#D8B4FE" />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { fontSize: cardTitleSz }]}>Visualization Journeys</Text>
                <Text style={[styles.cardSub, { fontSize: cardSubSz }]}>Guided escapes for a peaceful mind</Text>
              </View>
              <MaterialIcons name="chevron-right" size={arrowSz} color="rgba(255,255,255,0.26)" />
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
            <View style={[styles.cardRow, { marginTop: 8 }]}>
              <View style={[styles.iconBadge, { width: iconBadgeSz, height: iconBadgeSz, borderRadius: iconBadgeSz / 2, backgroundColor: 'rgba(110,231,183,0.14)', borderColor: 'rgba(110,231,183,0.38)' }]}>
                <MaterialIcons name="air" size={iconSz} color="#6EE7B7" />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { fontSize: cardTitleSz }]}>Breathing Exercises</Text>
                <Text style={[styles.cardSub, { fontSize: cardSubSz }]}>Slow your breath, calm your nervous system</Text>
              </View>
              <MaterialIcons name="chevron-right" size={arrowSz} color="rgba(255,255,255,0.26)" />
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
    backgroundColor: '#342949',
  },

  // Bubbles sit at zIndex 0 — BEHIND the scroll view and cards
  bubblesLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 0,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 1000,
  },

  fadingHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 900,
  },

  // Scroll view at zIndex 2 — above bubbles
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

  // Card: solid background so bubbles CANNOT bleed through
  // rgba(255,255,255,0.07) was too transparent on APK — use a solid dark color
  card: {
    backgroundColor: '#3A3256',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },

  cardAccentStrip: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 90,
  },
  shimmerGradient: { flex: 1 },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  cardBody:  { flex: 1 },
  cardTitle: { fontWeight: '700', color: '#FFFFFF', marginBottom: 5 },
  cardSub:   { color: 'rgba(200,190,240,0.72)', fontWeight: '400', lineHeight: 18 },
});
