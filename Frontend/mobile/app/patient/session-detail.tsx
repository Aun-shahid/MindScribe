import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)',
  'rgba(167,139,250,0.08)',
  'rgba(52,41,73,0.72)',
];

type DetailSection = {
  key: string;
  title: string;
  icon: 'description' | 'track-changes' | 'assignment' | 'flag';
  value: string;
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const pageInset = clamp(width * 0.03, 12, 18);
  const sectionInset = clamp(width * 0.04, 14, 20);
  const headerTopPadding = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding = clamp(height * 0.02, 14, 22);
  const headerButtonSize = clamp(width * 0.098, 34, 40);
  const headerButtonRadius = headerButtonSize / 2;
  const headerIconSize = clamp(width * 0.047, 16, 20);
  const headerTitleSize = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop = clamp(height * 0.022, 14, 22);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;
  const headerFadeDistance = clamp(height * 0.022, 14, 20);
  const contentTopPadding = headerEstimatedHeight + clamp(height * 0.022, 14, 20);
  const contentBottomPadding = clamp(insets.bottom + height * 0.04, 30, 46);

  const bubbleLarge = clamp(width * 0.74, 220, 310);
  const bubbleMedium = clamp(width * 0.52, 170, 230);
  const bubbleSmall = clamp(width * 0.32, 96, 132);

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

  const goBack = () => router.push('./sessions' as any);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const loadSessionDetail = async (sessionId: string) => {
      try {
        setLoading(true);
        const data = await PatientService.getSession(sessionId);
        setSession(data?.session || data || null);
      } catch (err) {
        console.error('[SessionDetail] load error', err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    loadSessionDetail(String(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      [b1y, b1x, b2y, b2x, b3y, b3x, b4y, b4x, b5y, b5x].forEach((v) => v.setValue(0));

      const fly = (y: Animated.Value, x: Animated.Value, dY: number, dX: number) => {
        const c = Animated.parallel([
          Animated.loop(
            Animated.sequence([
              Animated.timing(y, { toValue: -50, duration: dY, useNativeDriver: true }),
              Animated.timing(y, { toValue: 50, duration: dY, useNativeDriver: true }),
            ])
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(x, { toValue: 30, duration: dX, useNativeDriver: true }),
              Animated.timing(x, { toValue: -30, duration: dX, useNativeDriver: true }),
            ])
          ),
        ]);
        c.start();
        return c;
      };

      const anims = [
        fly(b1y, b1x, 8000, 7000),
        fly(b2y, b2x, 10000, 8000),
        fly(b3y, b3x, 9000, 7500),
        fly(b4y, b4x, 8500, 7200),
        fly(b5y, b5x, 9500, 8200),
      ];

      return () => anims.forEach((a) => a.stop());
    }, [b1x, b1y, b2x, b2y, b3x, b3y, b4x, b4y, b5x, b5y])
  );

  const sessionInfoRows = session
    ? [
        {
          label: 'Session',
          value: session.session_number ? `#${session.session_number}` : 'N/A',
        },
        {
          label: 'Date',
          value: session.scheduled_date
            ? new Date(session.scheduled_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
            : 'N/A',
        },
        {
          label: 'Time',
          value: session.scheduled_date
            ? new Date(session.scheduled_date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })
            : 'N/A',
        },
        {
          label: 'Status',
          value: session.status
            ? String(session.status).replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase())
            : 'N/A',
        },
      ]
    : [];

  const detailSections: DetailSection[] = [
    {
      key: 'summary',
      title: 'Session Summary',
      icon: 'description' as const,
      value: session?.session_summary || '',
    },
    {
      key: 'goals',
      title: 'Goals',
      icon: 'track-changes' as const,
      value: session?.patient_goals || '',
    },
    {
      key: 'homework',
      title: 'Homework',
      icon: 'assignment' as const,
      value: session?.homework_assigned || '',
    },
    {
      key: 'next-goals',
      title: 'Next Goals',
      icon: 'flag' as const,
      value: session?.next_session_goals || '',
    },
  ].filter((section) => Boolean(section.value));

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#342949', '#2A1F3D', '#342949']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium, top: clamp(height * 0.06, 34, 62), right: -clamp(width * 0.12, 36, 56), backgroundColor: 'rgba(167,139,250,0.25)', transform: [{ translateY: b1y }, { translateX: b1x }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleLarge, height: bubbleLarge, top: -clamp(height * 0.12, 80, 120), left: -clamp(width * 0.18, 56, 88), backgroundColor: 'rgba(184,168,230,0.20)', transform: [{ translateY: b2y }, { translateX: b2x }] }]} />
        <Animated.View style={[styles.bubble, { width: clamp(width * 0.4, 120, 170), height: clamp(width * 0.4, 120, 170), bottom: clamp(height * 0.24, 160, 230), left: -clamp(width * 0.08, 20, 36), backgroundColor: 'rgba(167,139,250,0.22)', transform: [{ translateY: b3y }, { translateX: b3x }] }]} />
        <Animated.View style={[styles.bubble, { width: clamp(width * 0.48, 150, 200), height: clamp(width * 0.48, 150, 200), bottom: clamp(height * 0.12, 80, 120), right: -clamp(width * 0.14, 42, 70), backgroundColor: 'rgba(184,168,230,0.18)', transform: [{ translateY: b4y }, { translateX: b4x }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleSmall, height: bubbleSmall, top: '40%', right: clamp(width * 0.05, 14, 24), backgroundColor: 'rgba(167,139,250,0.15)', transform: [{ translateY: b5y }, { translateX: b5x }] }]} />
      </View>

      <View style={styles.safeArea}>
        <StickyHeader scrollY={scrollY} firstWord="Session" secondWord="Details" onBackPress={goBack} />

        <Animated.View
          style={[
            styles.headerContainer,
            {
              paddingTop: headerTopPadding,
              paddingHorizontal: pageInset,
              paddingBottom: headerBottomPadding,
              opacity: scrollY.interpolate({
                inputRange: [0, headerFadeDistance * 0.45, headerFadeDistance],
                outputRange: [1, 0, 0],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, headerFadeDistance],
                    outputRange: [0, -10],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={goBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[
                styles.backBtnCircle,
                {
                  width: headerButtonSize,
                  height: headerButtonSize,
                  borderRadius: headerButtonRadius,
                },
              ]}
            >
              <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}>
              <Text style={styles.headerWhite}>Session </Text>
              <Text style={styles.headerPurple}>Details</Text>
            </Text>

            <View style={{ width: headerButtonSize }} />
          </View>
        </Animated.View>

        {loading ? (
          <View style={styles.loaderCenter}>
            <TabLoaderCard spinnerColor="#A78BFA" fullScreen={false} />
          </View>
        ) : !session ? (
          <View style={styles.loaderCenter}>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Session not found</Text>
              <Text style={styles.emptySubtitle}>Please go back and try opening another session.</Text>
            </View>
          </View>
        ) : (
          <Animated.ScrollView
            style={styles.scroll}
            contentContainerStyle={{
              paddingHorizontal: sectionInset,
              paddingTop: contentTopPadding,
              paddingBottom: contentBottomPadding,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: true,
            })}
            scrollEventThrottle={16}
          >
            <View style={[styles.card, styles.heroCard]}>
              <LinearGradient colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <View style={styles.cardTopRail}>
                <View style={styles.cardTopRailLeft} />
                <View style={styles.cardTopRailRight} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.iconRow}>
                  <LinearGradient colors={['rgba(167,139,250,0.3)', 'rgba(167,139,250,0.1)']} style={styles.iconBadge}>
                    <MaterialIcons name="event-note" size={16} color="#CDB6FF" />
                  </LinearGradient>
                  <Text style={styles.cardTitle}>Session Info</Text>
                </View>

                {sessionInfoRows.map((row) => (
                  <View key={row.label} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text style={styles.infoValue}>{row.value}</Text>
                  </View>
                ))}

                <View style={styles.cardDivider}>
                  <View style={styles.cardDividerLeft} />
                  <View style={styles.cardDividerDot} />
                  <View style={styles.cardDividerRight} />
                </View>
              </View>
            </View>

            {detailSections.map((section) => (
              <View key={section.key} style={styles.card}>
                <LinearGradient colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                <View style={styles.cardTopRailMuted} />
                <View style={styles.cardBody}>
                  <View style={styles.iconRow}>
                    <LinearGradient colors={['rgba(255,179,107,0.28)', 'rgba(255,179,107,0.08)']} style={styles.iconBadge}>
                      <MaterialIcons name={section.icon} size={16} color="#FFD6A8" />
                    </LinearGradient>
                    <Text style={styles.cardTitle}>{section.title}</Text>
                  </View>
                  <Text style={styles.bodyText}>{section.value}</Text>
                </View>
              </View>
            ))}

            <View style={{ height: 30 }} />
          </Animated.ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bubble: { position: 'absolute', borderRadius: 9999 },
  safeArea: { flex: 1 },

  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtnCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    zIndex: 1000,
  },
  headerTitle: { flex: 1, fontWeight: '800', textAlign: 'center' },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },

  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 18,
    backgroundColor: 'rgba(63,55,82,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#B8A8E6',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  scroll: { flex: 1 },
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
    borderRadius: 16,
    marginBottom: 14,
  },
  heroCard: {
    marginBottom: 16,
  },
  cardTopRail: {
    flexDirection: 'row',
    height: 3,
  },
  cardTopRailLeft: {
    flex: 1,
    backgroundColor: '#A78BFA',
    borderTopLeftRadius: 16,
  },
  cardTopRailRight: {
    flex: 1,
    backgroundColor: '#FFB36B',
    borderTopRightRadius: 16,
  },
  cardTopRailMuted: {
    height: 3,
    backgroundColor: 'rgba(167,139,250,0.7)',
  },
  cardBody: {
    padding: 16,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoLabel: {
    color: '#9D8EC7',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    width: 72,
    marginTop: 1,
  },
  infoValue: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  bodyText: {
    color: '#E9E2FA',
    fontSize: 13,
    lineHeight: 22,
  },
  cardDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cardDividerLeft: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(167,139,250,0.24)',
  },
  cardDividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 8,
    backgroundColor: '#A78BFA',
  },
  cardDividerRight: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,179,107,0.24)',
  },
});
