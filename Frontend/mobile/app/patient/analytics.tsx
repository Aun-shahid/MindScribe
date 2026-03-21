import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StickyHeader from '../components/StickyHeader';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)',
  'rgba(167,139,250,0.08)',
  'rgba(52,41,73,0.72)',
];

// ── Pass from=analytics so sub-pages know where to return ────────────────────
const ANALYTICS_CARDS = [
  {
    icon: 'book',
    iconLib: 'FontAwesome',
    title: 'Journal Analytics',
    description: 'Journaling stats, streaks, and tag insights',
    accentColor: '#60A5FA',
    accentDim: 'rgba(96,165,250,0.14)',
    accentBorder: 'rgba(96,165,250,0.35)',
    glowColor: 'rgba(96,165,250,0.10)',
    route: '/patient/journal-analytics-detail?from=analytics',
    label: 'JOURNAL',
  },
  {
    icon: 'smile-o',
    iconLib: 'FontAwesome',
    title: 'Mood Analytics',
    description: 'Mood patterns, trends, and common triggers',
    accentColor: '#FBBF24',
    accentDim: 'rgba(251,191,36,0.14)',
    accentBorder: 'rgba(251,191,36,0.35)',
    glowColor: 'rgba(251,191,36,0.08)',
    route: '/patient/mood-analytics-detail?from=analytics',
    label: 'MOOD',
  },
];

export default function AnalyticsHub() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

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
  const scrollY = useRef(new Animated.Value(0)).current;

  const pi        = clamp(width * 0.048,  16, 24);
  const hTop      = insets.top + clamp(height * 0.014, 10, 18);
  const hBtnSz    = clamp(width * 0.098,  34, 40);
  const hBtnR     = hBtnSz / 2;
  const hIcon     = clamp(width * 0.047,  16, 20);
  const hTitleSz  = clamp(width * 0.075,  26, 32);
  const hMTop     = clamp(height * 0.022, 14, 22);
  const hPadBot   = clamp(height * 0.02,  14, 22);
  const hEst      = hTop + hMTop + hTitleSz + 8 + hPadBot;

  const bubbleLarge  = clamp(width * 0.74, 220, 310);
  const bubbleMedium = clamp(width * 0.52, 170, 230);
  const bubbleSmall  = clamp(width * 0.32,  96, 132);

  const cR      = clamp(width * 0.05, 16, 22);
  const cPad    = clamp(width * 0.05, 16, 22);
  const cGap    = clamp(height * 0.022, 14, 20);
  const iconSz  = clamp(width * 0.06,  22, 28);
  const badgeSz = clamp(width * 0.13,  46, 56);
  const titleSz = clamp(width * 0.048, 17, 20);
  const subSz   = clamp(width * 0.036, 13, 15);
  const labelSz = clamp(width * 0.028,  9, 11);
  const arrowSz = clamp(width * 0.04,  14, 16);

  useFocusEffect(
    useCallback(() => {
      [b1y,b1x,b2y,b2x,b3y,b3x,b4y,b4x,b5y,b5x].forEach((v) => v.setValue(0));
      const fly = (y: Animated.Value, x: Animated.Value, dY: number, dX: number) => {
        const c = Animated.parallel([
          Animated.loop(Animated.sequence([
            Animated.timing(y, { toValue: -50, duration: dY, useNativeDriver: true }),
            Animated.timing(y, { toValue:  50, duration: dY, useNativeDriver: true }),
          ])),
          Animated.loop(Animated.sequence([
            Animated.timing(x, { toValue:  30, duration: dX, useNativeDriver: true }),
            Animated.timing(x, { toValue: -30, duration: dX, useNativeDriver: true }),
          ])),
        ]);
        c.start();
        return c;
      };
      const anims = [
        fly(b1y, b1x, 8000,  7000),
        fly(b2y, b2x, 10000, 8000),
        fly(b3y, b3x, 9000,  7500),
        fly(b4y, b4x, 8500,  7200),
        fly(b5y, b5x, 9500,  8200),
      ];
      return () => anims.forEach((a) => a.stop());
    }, [b1x,b1y,b2x,b2y,b3x,b3y,b4x,b4y,b5x,b5y])
  );

  const handleBack = () => router.push('/patient/actions');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#342949', '#2A1F3D', '#342949']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Ambient glow blobs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.glow, { width: bubbleLarge * 1.2, height: bubbleLarge * 1.2, top: -bubbleLarge * 0.3, right: -bubbleLarge * 0.3, backgroundColor: 'rgba(167,139,250,0.05)' }]} />
        <View style={[styles.glow, { width: bubbleMedium, height: bubbleMedium, bottom: '15%', left: -bubbleMedium * 0.4, backgroundColor: 'rgba(96,165,250,0.04)' }]} />
      </View>

      {/* Floating bubbles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium, top: clamp(height * 0.06, 34, 62), right: -clamp(width * 0.12, 36, 56), backgroundColor: 'rgba(167,139,250,0.25)', transform: [{ translateY: b1y }, { translateX: b1x }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleLarge, height: bubbleLarge, top: -clamp(height * 0.12, 80, 120), left: -clamp(width * 0.18, 56, 88), backgroundColor: 'rgba(184,168,230,0.20)', transform: [{ translateY: b2y }, { translateX: b2x }] }]} />
        <Animated.View style={[styles.bubble, { width: clamp(width * 0.4, 120, 170), height: clamp(width * 0.4, 120, 170), bottom: clamp(height * 0.24, 160, 230), left: -clamp(width * 0.08, 20, 36), backgroundColor: 'rgba(167,139,250,0.22)', transform: [{ translateY: b3y }, { translateX: b3x }] }]} />
        <Animated.View style={[styles.bubble, { width: clamp(width * 0.48, 150, 200), height: clamp(width * 0.48, 150, 200), bottom: clamp(height * 0.12, 80, 120), right: -clamp(width * 0.14, 42, 70), backgroundColor: 'rgba(184,168,230,0.18)', transform: [{ translateY: b4y }, { translateX: b4x }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleSmall, height: bubbleSmall, top: '40%', right: clamp(width * 0.05, 14, 24), backgroundColor: 'rgba(167,139,250,0.15)', transform: [{ translateY: b5y }, { translateX: b5x }] }]} />
      </View>

      {/* Sticky header */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="My"
        secondWord="Analytics"
        onBackPress={handleBack}
      />

      {/* Fading large header — no underline gradient */}
      <Animated.View style={[styles.headerContainer, {
        paddingTop: hTop,
        paddingHorizontal: pi,
        paddingBottom: hPadBot,
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        }),
      }]}>
        <TouchableOpacity
          style={[styles.backBtnCircle, { left: pi, top: hTop, width: hBtnSz, height: hBtnSz, borderRadius: hBtnR }]}
          onPress={handleBack}
        >
          <FontAwesome name="chevron-left" size={hIcon} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginTop: hMTop }}>
          <Text style={{ fontSize: hTitleSz, fontWeight: '800', textAlign: 'center' }}>
            <Text style={{ color: '#FFFFFF' }}>My </Text>
            <Text style={{ color: '#B8A8E6' }}>Analytics</Text>
          </Text>
          {/* ── underline gradient removed ── */}
        </View>
      </Animated.View>

      {/* Scrollable content */}
      <Animated.ScrollView
        contentContainerStyle={{
          paddingTop: hEst + clamp(height * 0.034, 22, 34),
          paddingHorizontal: pi,
          paddingBottom: clamp(insets.bottom + height * 0.06, 40, 60),
        }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <Text style={{
          color: 'rgba(184,168,230,0.70)',
          fontSize: clamp(width * 0.038, 13, 15),
          textAlign: 'center',
          fontStyle: 'italic',
          letterSpacing: 0.3,
          marginBottom: clamp(height * 0.036, 22, 30),
        }}>
          Understand your patterns. Track your growth.
        </Text>

        <View style={{ gap: cGap }}>
          {ANALYTICS_CARDS.map((card) => (
            <TouchableOpacity
              key={card.route}
              activeOpacity={0.78}
              onPress={() => router.push(card.route as any)}
              style={[styles.card, { borderRadius: cR }]}
            >
              <LinearGradient
                colors={CARD_GRAD}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: cR }]}
                pointerEvents="none"
              />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: card.accentColor, borderTopLeftRadius: cR, borderTopRightRadius: cR }} />
              <View style={{ position: 'absolute', width: clamp(width * 0.5, 140, 190), height: clamp(width * 0.5, 140, 190), borderRadius: 9999, top: -clamp(width * 0.18, 50, 70), right: -clamp(width * 0.1, 28, 42), backgroundColor: card.glowColor }} pointerEvents="none" />

              <View style={{ padding: cPad, paddingTop: cPad + 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: clamp(height * 0.018, 12, 16) }}>
                  <LinearGradient
                    colors={[card.accentDim, 'rgba(52,41,73,0.4)']}
                    start={[0, 0]} end={[1, 1]}
                    style={{ width: badgeSz, height: badgeSz, borderRadius: clamp(width * 0.036, 12, 16), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: card.accentBorder }}
                  >
                    {card.iconLib === 'FontAwesome5'
                      ? <FontAwesome5 name={card.icon as any} size={iconSz} color={card.accentColor} />
                      : <FontAwesome  name={card.icon as any} size={iconSz} color={card.accentColor} />
                    }
                  </LinearGradient>
                  <View style={{ backgroundColor: card.accentDim, borderWidth: 1, borderColor: card.accentBorder, borderRadius: clamp(width * 0.04, 12, 16), paddingVertical: clamp(height * 0.005, 3, 5), paddingHorizontal: clamp(width * 0.028, 9, 12), alignSelf: 'flex-start' }}>
                    <Text style={{ color: card.accentColor, fontSize: labelSz, fontWeight: '700', letterSpacing: 1.4 }}>{card.label}</Text>
                  </View>
                </View>

                <Text style={{ color: '#FFFFFF', fontSize: titleSz, fontWeight: '800', letterSpacing: -0.2, marginBottom: clamp(height * 0.008, 5, 7) }}>{card.title}</Text>
                <Text style={{ color: '#B8A8E6', fontSize: subSz, fontWeight: '400', lineHeight: subSz * 1.6, marginBottom: clamp(height * 0.022, 14, 18) }}>{card.description}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: clamp(height * 0.014, 10, 14), borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                  <Text style={{ color: card.accentColor, fontSize: clamp(width * 0.036, 13, 15), fontWeight: '700', letterSpacing: 0.2 }}>View Details</Text>
                  <View style={{ width: clamp(width * 0.08, 28, 34), height: clamp(width * 0.08, 28, 34), borderRadius: clamp(width * 0.04, 14, 17), backgroundColor: card.accentDim, borderWidth: 1, borderColor: card.accentBorder, alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesome name="chevron-right" size={arrowSz} color={card.accentColor} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info tip card */}
        <View style={[styles.card, { borderRadius: cR, marginTop: clamp(height * 0.028, 18, 24), flexDirection: 'row', alignItems: 'flex-start', padding: cPad, gap: clamp(width * 0.03, 10, 14) }]}>
          <LinearGradient colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: cR }]} pointerEvents="none" />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#34D399', borderTopLeftRadius: cR, borderTopRightRadius: cR }} />
          <View style={{ width: clamp(width * 0.1, 36, 42), height: clamp(width * 0.1, 36, 42), borderRadius: clamp(width * 0.05, 18, 21), backgroundColor: 'rgba(52,211,153,0.14)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.30)', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <FontAwesome5 name="lightbulb" size={clamp(width * 0.038, 14, 17)} color="#34D399" />
          </View>
          <Text style={{ flex: 1, color: '#B8A8E6', fontSize: clamp(width * 0.036, 13, 15), lineHeight: clamp(width * 0.056, 20, 23), fontWeight: '400' }}>
            Analytics help you understand your patterns and track your progress over time. Check back regularly to see your growth!
          </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow:      { position: 'absolute', borderRadius: 9999 },
  bubble:    { position: 'absolute', borderRadius: 9999 },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900 },
  backBtnCircle: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  card: {
    overflow: 'hidden',
    backgroundColor: '#3F3752',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 7,
  },
});