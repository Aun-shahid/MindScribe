import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { FontAwesome5 } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService from '../services/patient.service';
import type { JournalEntry } from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:           '#1E1630',
  bgMid:        '#251C3A',
  surface:      '#2E2448',
  surfaceMuted: '#3D3260',
  border:       'rgba(255,255,255,0.10)',
  borderAccent: 'rgba(167,139,250,0.35)',
  purple:       '#A78BFA',
  purpleDim:    'rgba(167,139,250,0.18)',
  orange:       '#FFB36B',
  orangeDim:    'rgba(255,179,107,0.15)',
  white:        '#FFFFFF',
  text:         '#EDE8FA',
  textMuted:    '#9D8EC7',
  textFaint:    '#6B5F8A',
  gold:         '#FFD54F',
  red:          '#D32F2F',
} as const;

// ── Updated card gradient ─────────────────────────────────────────────────────
const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)',
  'rgba(167,139,250,0.08)',
  'rgba(52,41,73,0.72)',
];

// ─────────────────────────────────────────────────────────────────────────────
export default function JournalDetail() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [entry,    setEntry]    = useState<JournalEntry | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scrollY   = useRef(new Animated.Value(0)).current;

  // bubble refs
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

  // ── Responsive tokens ──────────────────────────────────────────────────────
  const pi          = clamp(width * 0.048,  16, 24);
  const hTop        = insets.top + clamp(height * 0.014, 10, 18);
  const hBtnSz      = clamp(width * 0.098,  34, 40);
  const hBtnR       = hBtnSz / 2;
  const hIcon       = clamp(width * 0.047,  16, 20);
  const hTitleSz    = clamp(width * 0.075,  26, 32);
  const hMTop       = clamp(height * 0.022, 14, 22);
  const hPadBot     = clamp(height * 0.02,  14, 22);
  const hEst        = hTop + hMTop + hTitleSz + 8 + hPadBot;

  const bLarge      = clamp(width * 0.74, 220, 310);
  const bMedium     = clamp(width * 0.52, 170, 230);
  const bSmall      = clamp(width * 0.32,  96, 132);

  const cR          = clamp(width * 0.06,  20, 28);
  const cGap        = clamp(height * 0.022, 14, 20);
  const cBot        = clamp(height * 0.05,  28, 50);
  const cPad        = clamp(width * 0.05,   16, 22);

  const heroTitleSz = clamp(width * 0.082, 28, 38);
  const heroLH      = Math.round(heroTitleSz * 1.22);
  const bodyFontSz  = clamp(width * 0.042, 14, 17);
  const bodyLH      = Math.round(bodyFontSz * 1.72);
  const labelSz     = clamp(width * 0.028,  9, 11);
  const pillTxtSz   = clamp(width * 0.034, 12, 14);
  const metaValSz   = clamp(width * 0.058, 20, 26);
  const secTitleSz  = clamp(width * 0.044, 15, 18);
  const tagTxtSz    = clamp(width * 0.034, 12, 14);
  const actTxtSz    = clamp(width * 0.042, 14, 16);
  const actIconSz   = clamp(width * 0.04,  14, 17);
  const actPadY     = clamp(height * 0.018, 12, 16);
  const actPadX     = clamp(width * 0.05,  16, 22);
  const actR        = clamp(width * 0.055, 18, 24);
  const tsSz        = clamp(width * 0.036, 12, 14);
  const iconBadgeSz = clamp(width * 0.072, 26, 32);
  const iconBadgeR  = clamp(width * 0.036, 13, 16);
  const iconSz      = clamp(width * 0.032, 11, 13);

  // ── Data load ─────────────────────────────────────────────────────────────
  const loadEntry = useCallback(async () => {
    if (!id) return;
    try {
      const data = await PatientService.getJournalEntry(id);
      setEntry(data);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 14, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      console.error('[JournalDetail]', e);
    } finally {
      setLoading(false);
    }
  }, [fadeAnim, id, slideAnim]);

  useFocusEffect(
    useCallback(() => {
      setEntry(null);
      setLoading(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(24);
      loadEntry();
      return () => {};
    }, [fadeAnim, loadEntry, slideAnim])
  );

  // ── Bubble animations ─────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      [b1y,b1x,b2y,b2x,b3y,b3x,b4y,b4x,b5y,b5x].forEach((v) => v.setValue(0));
      const fly = (y: Animated.Value, x: Animated.Value, dy: number, dx: number) => {
        const c = Animated.parallel([
          Animated.loop(Animated.sequence([
            Animated.timing(y, { toValue: -dy, duration: dy * 160, useNativeDriver: true }),
            Animated.timing(y, { toValue:  dy, duration: dy * 160, useNativeDriver: true }),
          ])),
          Animated.loop(Animated.sequence([
            Animated.timing(x, { toValue:  dx, duration: dx * 260, useNativeDriver: true }),
            Animated.timing(x, { toValue: -dx, duration: dx * 260, useNativeDriver: true }),
          ])),
        ]);
        c.start();
        return c;
      };
      const anims = [
        fly(b1y, b1x, 28, 22),
        fly(b2y, b2x, 38, 18),
        fly(b3y, b3x, 22, 30),
        fly(b4y, b4x, 34, 16),
        fly(b5y, b5x, 18, 26),
      ];
      return () => anims.forEach((a) => a.stop());
    }, [b1x,b1y,b2x,b2y,b3x,b3y,b4x,b4y,b5x,b5y])
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getPrivacyLabel = (p: string) => {
    switch (p) {
      case 'private':   return { icon: 'lock',      label: 'Private (Only Me)' };
      case 'therapist': return { icon: 'user-md',   label: 'Shared with Therapist' };
      case 'anonymous': return { icon: 'globe',     label: 'Anonymous Sharing' };
      default:          return { icon: 'pen-fancy', label: 'Not Set' };
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Journal Entry',
      'Are you sure you want to delete this journal entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await PatientService.deleteJournalEntry(id);
              Alert.alert('Deleted', 'Journal entry deleted successfully', [
                { text: 'OK', onPress: () => router.push('./journal-list') },
              ]);
            } catch {
              Alert.alert('Error', 'Failed to delete journal entry. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <TabLoaderCard
        fullScreen
        title="Loading journal entry..."
        subtitle="Fetching your saved reflection"
        spinnerColor="#A78BFA"
      />
    );
  }

  if (!entry) {
    return (
      <View style={[s.centerContainer, { backgroundColor: C.bg }]}>
        <Text style={{ color: C.white, fontSize: 18, marginBottom: 20 }}>Entry not found</Text>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
          <Text style={s.backBtnTxt}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const privacy = getPrivacyLabel(entry.privacy_level);
  const dateStr = new Date(entry.created_at).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const timeStr = new Date(entry.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  // ── Inner components ──────────────────────────────────────────────────────

  const Divider = ({ color = C.purple }: { color?: string }) => (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      marginBottom: clamp(height * 0.018, 12, 18),
    }}>
      <View style={{ flex: 1, height: 1, backgroundColor: `${color}28` }} />
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, marginHorizontal: 8 }} />
      <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: `${color}60`, marginRight: 8 }} />
      <View style={{ flex: 2, height: 1, backgroundColor: `${color}16` }} />
    </View>
  );

  const SectionHead = ({
    icon, label, accent = C.orange,
  }: { icon: string; label: string; accent?: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: clamp(height * 0.014, 10, 14) }}>
      <LinearGradient
        colors={[`${accent}30`, `${accent}10`]}
        style={{
          width: iconBadgeSz, height: iconBadgeSz, borderRadius: iconBadgeR,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: `${accent}50`,
          marginRight: clamp(width * 0.028, 10, 13),
        }}
      >
        <FontAwesome5 name={icon as any} size={iconSz} color={accent} />
      </LinearGradient>
      <Text style={{ color: C.white, fontSize: secTitleSz, fontWeight: '700', letterSpacing: 0.3 }}>
        {label}
      </Text>
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>

      {/* ── Deep background ── */}
      <LinearGradient
        colors={[C.bg, C.bgMid, C.bg]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── Ambient glow blobs ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[s.glow, {
          width: bLarge * 1.1, height: bLarge * 1.1,
          top: -bLarge * 0.3, right: -bLarge * 0.3,
          backgroundColor: 'rgba(167,139,250,0.06)',
        }]} />
        <View style={[s.glow, {
          width: bMedium, height: bMedium,
          bottom: '18%', left: -bMedium * 0.35,
          backgroundColor: 'rgba(255,179,107,0.05)',
        }]} />
      </View>

      {/* ── Floating bubbles ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[s.bubble, {
          width: bMedium, height: bMedium,
          top: clamp(height * 0.06, 34, 62),
          right: -clamp(width * 0.12, 36, 56),
          backgroundColor: 'rgba(167,139,250,0.13)',
        }, { transform: [{ translateY: b1y }, { translateX: b1x }] }]} />
        <Animated.View style={[s.bubble, {
          width: bLarge, height: bLarge,
          top: -clamp(height * 0.12, 80, 120),
          left: -clamp(width * 0.18, 56, 88),
          backgroundColor: 'rgba(184,168,230,0.09)',
        }, { transform: [{ translateY: b2y }, { translateX: b2x }] }]} />
        <Animated.View style={[s.bubble, {
          width: clamp(width * 0.4, 120, 170), height: clamp(width * 0.4, 120, 170),
          bottom: clamp(height * 0.24, 160, 230),
          left: -clamp(width * 0.08, 20, 36),
          backgroundColor: 'rgba(167,139,250,0.11)',
        }, { transform: [{ translateY: b3y }, { translateX: b3x }] }]} />
        <Animated.View style={[s.bubble, {
          width: clamp(width * 0.48, 150, 200), height: clamp(width * 0.48, 150, 200),
          bottom: clamp(height * 0.12, 80, 120),
          right: -clamp(width * 0.14, 42, 70),
          backgroundColor: 'rgba(184,168,230,0.09)',
        }, { transform: [{ translateY: b4y }, { translateX: b4x }] }]} />
        <Animated.View style={[s.bubble, {
          width: bSmall, height: bSmall,
          top: '40%', right: clamp(width * 0.05, 14, 24),
          backgroundColor: 'rgba(167,139,250,0.08)',
        }, { transform: [{ translateY: b5y }, { translateX: b5x }] }]} />
      </View>

      {/* ── Sticky header ── */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="View"
        secondWord="Journal"
        onBackPress={() => router.back()}
      />

      {/* ── Large fading header ── */}
      <Animated.View style={[s.headerContainer, {
        paddingTop: hTop,
        paddingHorizontal: pi,
        paddingBottom: hPadBot,
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        }),
      }]}>
        {/* Back button */}
        <TouchableOpacity
          style={[s.backBtnCircle, {
            left: pi, top: hTop,
            width: hBtnSz, height: hBtnSz, borderRadius: hBtnR,
          }]}
          onPress={() => router.back()}
        >
          <FontAwesome name="chevron-left" size={hIcon} color={C.white} />
        </TouchableOpacity>

        {/* "View Journal" heading — no underline */}
        <View style={{ alignItems: 'center', marginTop: hMTop }}>
          <Text style={{ fontSize: hTitleSz, fontWeight: '800', textAlign: 'center' }}>
            <Text style={{ color: C.white }}>View </Text>
            <Text style={{ color: C.purple }}>Journal</Text>
          </Text>
        </View>
      </Animated.View>

      {/* ── Main scrollable content ── */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Animated.ScrollView
          contentContainerStyle={{
            paddingTop: hEst + clamp(height * 0.034, 22, 34),
            paddingBottom: cBot,
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >

          {/* ═══ TITLE CARD ═══ */}
          <View style={{ paddingHorizontal: pi, marginBottom: cGap }}>
            <View style={[s.card, { borderRadius: cR, backgroundColor: '#3F3752' }]}>

              <LinearGradient
                colors={CARD_GRAD}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: cR }]}
                pointerEvents="none"
              />

              {/* Dual-tone top accent strip */}
              <View style={{ flexDirection: 'row', height: 3 }}>
                <View style={{ flex: 1, backgroundColor: C.purple, borderTopLeftRadius: cR }} />
                <View style={{ flex: 1, backgroundColor: C.orange, borderTopRightRadius: cR }} />
              </View>

              <View style={{ padding: cPad, paddingTop: clamp(height * 0.028, 18, 26) }}>

                {/* Date + time row */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: clamp(height * 0.03, 20, 28),
                }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: C.orangeDim,
                    borderWidth: 1, borderColor: `${C.orange}35`,
                    borderRadius: clamp(width * 0.025, 8, 11),
                    paddingVertical: clamp(height * 0.007, 5, 7),
                    paddingHorizontal: clamp(width * 0.03, 10, 14),
                  }}>
                    <FontAwesome5 name="calendar-alt" size={clamp(width * 0.032, 11, 13)} color={C.orange} />
                    <Text style={{ color: C.orange, fontSize: pillTxtSz, fontWeight: '600' }}>
                      {dateStr}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: clamp(width * 0.025, 8, 12) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <FontAwesome5 name="clock" size={clamp(width * 0.028, 9, 11)} color={C.textFaint} />
                      <Text style={{ color: C.textFaint, fontSize: clamp(width * 0.03, 10, 12), fontWeight: '500' }}>
                        {timeStr}
                      </Text>
                    </View>
                    {entry.is_favorite && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <FontAwesome name="star" size={clamp(width * 0.036, 13, 15)} color={C.gold} />
                        <Text style={{ color: C.gold, fontSize: labelSz, fontWeight: '700', letterSpacing: 1.4 }}>
                          FAV
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Big entry title */}
                <Text style={{
                  color: C.white,
                  fontSize: heroTitleSz,
                  fontWeight: '800',
                  lineHeight: heroLH,
                  letterSpacing: -0.4,
                  marginBottom: clamp(height * 0.026, 18, 24),
                }}>
                  {entry.title}
                </Text>

                {/* Closing ornament */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: `${C.purple}28` }} />
                  <View style={{
                    marginHorizontal: 10,
                    width: clamp(width * 0.05, 18, 22), height: clamp(width * 0.05, 18, 22),
                    borderRadius: clamp(width * 0.025, 9, 11),
                    backgroundColor: C.purpleDim,
                    borderWidth: 1, borderColor: C.borderAccent,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FontAwesome5 name="pen-fancy" size={clamp(width * 0.024, 8, 10)} color={C.purple} />
                  </View>
                  <View style={{ flex: 1, height: 1, backgroundColor: `${C.orange}28` }} />
                </View>

              </View>
            </View>
          </View>

          {/* ═══ CONTENT CARD ═══ */}
          <View style={{ paddingHorizontal: pi, marginBottom: cGap }}>
            <View style={[s.card, { borderRadius: cR, backgroundColor: '#3F3752' }]}>
              <LinearGradient
                colors={CARD_GRAD}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: cR }]}
                pointerEvents="none"
              />
              <View style={{ height: 3, backgroundColor: C.purple, borderTopLeftRadius: cR, borderTopRightRadius: cR }} />

              <View style={{ padding: clamp(width * 0.055, 18, 26) }}>
                <Text style={{
                  color: C.purple,
                  fontSize: clamp(width * 0.22, 70, 96),
                  lineHeight: clamp(width * 0.15, 48, 66),
                  fontWeight: '900',
                  opacity: 0.2,
                  marginBottom: -clamp(height * 0.012, 8, 12),
                  marginLeft: -4,
                }}>
                  "
                </Text>

                <Text style={{
                  color: C.text,
                  fontSize: bodyFontSz,
                  lineHeight: bodyLH,
                  fontWeight: '400',
                  letterSpacing: 0.15,
                }}>
                  {entry.content}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: clamp(height * 0.022, 14, 20) }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: `${C.purple}22` }} />
                  <View style={{
                    marginHorizontal: 10,
                    width: clamp(width * 0.048, 16, 20), height: clamp(width * 0.048, 16, 20),
                    borderRadius: clamp(width * 0.024, 8, 10),
                    backgroundColor: C.purpleDim,
                    borderWidth: 1, borderColor: C.borderAccent,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <FontAwesome5 name="pen-nib" size={clamp(width * 0.024, 8, 10)} color={C.purple} />
                  </View>
                  <View style={{ flex: 1, height: 1, backgroundColor: `${C.purple}22` }} />
                </View>
              </View>
            </View>
          </View>

          {/* ═══ MOOD TAGS CARD ═══ */}
          {entry.tags_list && entry.tags_list.length > 0 && (
            <View style={{ paddingHorizontal: pi, marginBottom: cGap }}>
              <View style={[s.card, { borderRadius: cR, backgroundColor: '#3F3752' }]}>
                <LinearGradient
                  colors={CARD_GRAD}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: cR }]}
                  pointerEvents="none"
                />
                <View style={{ height: 3, backgroundColor: C.orange, borderTopLeftRadius: cR, borderTopRightRadius: cR }} />
                <View style={{ padding: cPad }}>
                  <SectionHead icon="theater-masks" label="Mood Tags" accent={C.orange} />
                  <Divider color={C.orange} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: clamp(width * 0.025, 8, 12) }}>
                    {entry.tags_list.map((tag, i) => (
                      <LinearGradient
                        key={i}
                        colors={['rgba(255,179,107,0.18)', 'rgba(255,179,107,0.08)']}
                        start={[0, 0]} end={[1, 1]}
                        style={{
                          borderRadius: clamp(width * 0.05, 16, 22),
                          borderWidth: 1, borderColor: `${C.orange}40`,
                          paddingVertical: clamp(height * 0.009, 6, 9),
                          paddingHorizontal: clamp(width * 0.036, 12, 16),
                        }}
                      >
                        <Text style={{ color: C.orange, fontSize: tagTxtSz, fontWeight: '600' }}>
                          {tag}
                        </Text>
                      </LinearGradient>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ═══ DETAILS CARD ═══ */}
          <View style={{ paddingHorizontal: pi, marginBottom: cGap }}>
            <View style={[s.card, { borderRadius: cR, backgroundColor: '#3F3752' }]}>
              <LinearGradient
                colors={CARD_GRAD}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: cR }]}
                pointerEvents="none"
              />
              <View style={{ height: 3, backgroundColor: C.purple, borderTopLeftRadius: cR, borderTopRightRadius: cR }} />
              <View style={{ padding: cPad }}>
                <SectionHead icon="info-circle" label="Details" accent={C.purple} />
                <Divider color={C.purple} />

                <View style={{ flexDirection: 'row', gap: clamp(width * 0.03, 10, 14) }}>

                  {/* Word count */}
                  <View style={{
                    flex: 1.1,
                    backgroundColor: C.purpleDim,
                    borderRadius: clamp(width * 0.045, 14, 20),
                    borderWidth: 1, borderColor: C.borderAccent,
                    padding: clamp(width * 0.045, 14, 20),
                    alignItems: 'center', justifyContent: 'center',
                    minHeight: clamp(height * 0.12, 80, 104),
                  }}>
                    <Text style={{
                      color: C.purple, fontSize: metaValSz,
                      fontWeight: '900', letterSpacing: -1,
                    }}>
                      {entry.word_count}
                    </Text>
                    <Text style={{
                      color: C.textMuted, fontSize: labelSz,
                      fontWeight: '700', letterSpacing: 1.6, marginTop: 4,
                    }}>
                      WORDS
                    </Text>
                    <View style={{
                      marginTop: clamp(height * 0.01, 6, 9),
                      width: clamp(width * 0.07, 24, 30), height: 3,
                      backgroundColor: C.purple, borderRadius: 2, opacity: 0.45,
                    }} />
                  </View>

                  {/* Privacy */}
                  <View style={{ flex: 1.9 }}>
                    <Text style={{
                      color: C.textFaint, fontSize: labelSz,
                      fontWeight: '700', letterSpacing: 1.6,
                      marginBottom: clamp(height * 0.009, 6, 9),
                    }}>
                      PRIVACY
                    </Text>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: C.surfaceMuted,
                      borderRadius: clamp(width * 0.04, 12, 18),
                      borderWidth: 1, borderColor: C.border,
                      paddingVertical: clamp(height * 0.014, 9, 13),
                      paddingHorizontal: clamp(width * 0.038, 12, 16),
                      gap: clamp(width * 0.028, 9, 13),
                    }}>
                      <View style={{
                        width: clamp(width * 0.07, 24, 30), height: clamp(width * 0.07, 24, 30),
                        borderRadius: clamp(width * 0.035, 12, 15),
                        backgroundColor: C.purpleDim,
                        borderWidth: 1, borderColor: C.borderAccent,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <FontAwesome5 name={privacy.icon as any} size={clamp(width * 0.03, 10, 12)} color={C.purple} />
                      </View>
                      <Text style={{
                        color: C.text, fontSize: clamp(width * 0.034, 12, 14),
                        fontWeight: '600', flex: 1,
                      }}>
                        {privacy.label}
                      </Text>
                    </View>
                  </View>

                </View>
              </View>
            </View>
          </View>

          {/* ═══ TIMELINE CARD ═══ */}
          <View style={{ paddingHorizontal: pi, marginBottom: cGap }}>
            <View style={[s.card, { borderRadius: cR, backgroundColor: '#3F3752' }]}>
              <LinearGradient
                colors={CARD_GRAD}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: cR }]}
                pointerEvents="none"
              />
              <View style={{ height: 3, backgroundColor: C.orange, borderTopLeftRadius: cR, borderTopRightRadius: cR }} />
              <View style={{ padding: cPad }}>
                <SectionHead icon="stream" label="Timeline" accent={C.orange} />
                <Divider color={C.orange} />

                {/* Created row */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: clamp(height * 0.018, 12, 16) }}>
                  <View style={{ alignItems: 'center', marginRight: clamp(width * 0.035, 12, 16) }}>
                    <View style={{
                      width: clamp(width * 0.068, 24, 30), height: clamp(width * 0.068, 24, 30),
                      borderRadius: clamp(width * 0.034, 12, 15),
                      backgroundColor: C.orangeDim,
                      borderWidth: 1.5, borderColor: `${C.orange}55`,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FontAwesome5 name="plus" size={clamp(width * 0.026, 9, 11)} color={C.orange} />
                    </View>
                    {entry.updated_at !== entry.created_at && (
                      <View style={{
                        width: 1.5, height: clamp(height * 0.04, 24, 34),
                        backgroundColor: `${C.orange}28`, marginTop: 4,
                      }} />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingTop: 2 }}>
                    <Text style={{
                      color: C.textFaint, fontSize: labelSz,
                      fontWeight: '700', letterSpacing: 1.5, marginBottom: 4,
                    }}>
                      CREATED
                    </Text>
                    <Text style={{ color: C.text, fontSize: tsSz, fontWeight: '500' }}>
                      {new Date(entry.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Updated row */}
                {entry.updated_at !== entry.created_at && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ alignItems: 'center', marginRight: clamp(width * 0.035, 12, 16) }}>
                      <View style={{
                        width: clamp(width * 0.068, 24, 30), height: clamp(width * 0.068, 24, 30),
                        borderRadius: clamp(width * 0.034, 12, 15),
                        backgroundColor: C.purpleDim,
                        borderWidth: 1.5, borderColor: C.borderAccent,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <FontAwesome5 name="pen" size={clamp(width * 0.024, 8, 10)} color={C.purple} />
                      </View>
                    </View>
                    <View style={{ flex: 1, paddingTop: 2 }}>
                      <Text style={{
                        color: C.textFaint, fontSize: labelSz,
                        fontWeight: '700', letterSpacing: 1.5, marginBottom: 4,
                      }}>
                        LAST EDITED
                      </Text>
                      <Text style={{ color: C.text, fontSize: tsSz, fontWeight: '500' }}>
                        {new Date(entry.updated_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* ═══ ACTION BUTTONS ═══ */}
          <View style={{
            paddingHorizontal: pi,
            gap: clamp(width * 0.03, 10, 14),
            marginBottom: clamp(height * 0.01, 6, 10),
          }}>

            {/* Edit */}
            <TouchableOpacity
              onPress={() => router.push(`./journal-edit?id=${entry.id}` as any)}
              disabled={deleting}
              activeOpacity={0.85}
              style={{ borderRadius: actR, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#A78BFA', '#7C5CE0']}
                start={[0, 0]} end={[1, 1]}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  paddingVertical: actPadY, paddingHorizontal: actPadX,
                  gap: clamp(width * 0.025, 8, 12),
                }}
              >
                <FontAwesome5 name="edit" size={actIconSz} color={C.white} />
                <Text style={{ color: C.white, fontSize: actTxtSz, fontWeight: '700', letterSpacing: 0.3 }}>
                  Edit Entry
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              activeOpacity={0.85}
              style={[s.deleteBtn, {
                borderRadius: actR,
                paddingVertical: actPadY,
                paddingHorizontal: actPadX,
              }]}
            >
              <FontAwesome5 name="trash-alt" size={actIconSz} color={C.red}
                style={{ marginRight: clamp(width * 0.024, 8, 10) }} />
              <Text style={{ color: C.red, fontSize: actTxtSz, fontWeight: '700' }}>
                {deleting ? 'Deleting…' : 'Delete Entry'}
              </Text>
            </TouchableOpacity>

          </View>

          <View style={{ height: cBot }} />
        </Animated.ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1630' },

  glow:   { position: 'absolute', borderRadius: 9999 },
  bubble: { position: 'absolute', borderRadius: 9999 },

  headerContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900,
  },
  backBtnCircle: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },

  // ── Updated card style ──────────────────────────────────────────────────
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 7,
  },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(211,47,47,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(211,47,47,0.28)',
  },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  backButton:      { backgroundColor: '#A78BFA', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  backBtnTxt:      { color: '#fff', fontSize: 16, fontWeight: '600' },
});
