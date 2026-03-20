import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

// ── Same glass recipe used across the app ────────────────────────────────────
const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)', 'rgba(167,139,250,0.08)', 'rgba(52,41,73,0.72)',
];

export default function PatientProfile() {
  const { profile, profileLoading, error, fetchProfile, logout } = useAuthContext();
  const { theme, themeStyle, toggleTheme } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const scrollY = useRef(new Animated.Value(0)).current;

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

  // ── Responsive tokens ─────────────────────────────────────────────────────
  const pageInset             = clamp(width * 0.03, 12, 18);
  const headerTopPadding      = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding   = clamp(height * 0.02, 14, 22);
  const headerTitleSize       = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop  = clamp(height * 0.022, 14, 22);
  const headerFadeDistance    = clamp(height * 0.022, 14, 20);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;
  const contentTopPadding     = headerEstimatedHeight + clamp(height * 0.014, 8, 12);
  const contentBottomPadding  = clamp(insets.bottom + height * 0.03, 28, 44);

  const bubbleLarge  = clamp(width * 0.34, 100, 140);
  const bubbleMedium = clamp(width * 0.29,  90, 120);
  const bubbleSmall  = clamp(width * 0.26,  82, 108);

  // card layout
  const cardRadius   = clamp(width * 0.045, 14, 18);
  const cardPadding  = clamp(width * 0.05,  16, 22);
  const cardSpacing  = clamp(height * 0.018, 12, 18);

  // avatar
  const avatarRingSize = clamp(width * 0.28, 96, 116);
  const avatarIconSize = clamp(width * 0.16,  50,  66);

  // typography
  const profileNameSize  = clamp(width * 0.062, 21, 26);
  const profileEmailSize = clamp(width * 0.034, 12, 14);
  const labelSize        = clamp(width * 0.032, 11, 13);
  const valueSize        = clamp(width * 0.036, 13, 15);
  const statusSize       = clamp(width * 0.029, 10, 12);
  const buttonTextSize   = clamp(width * 0.036, 13, 15);
  const sectionHeaderSize= clamp(width * 0.028, 10, 11);
  const menuTitleSize    = clamp(width * 0.041, 14, 17);
  const menuSubtitleSize = clamp(width * 0.031, 11, 13);
  const logoutTextSize   = clamp(width * 0.041, 15, 17);

  // menu icon
  const menuIconBox    = clamp(width * 0.115, 38, 46);
  const menuIconRadius = clamp(width * 0.028,  9, 12);
  const menuIconSz     = clamp(width * 0.048,  16, 19);

  // misc
  const buttonPadY  = clamp(height * 0.016, 11, 15);
  const buttonRadius= clamp(width * 0.03,   10, 14);

  useEffect(() => { fetchProfile(); }, []);

  useEffect(() => {
    const fly = (
      ay: Animated.Value, ax: Animated.Value,
      dy: number, dx: number, dly = 0, dlx = 0
    ) => {
      Animated.sequence([Animated.delay(dly), Animated.loop(Animated.sequence([
        Animated.timing(ay, { toValue:  50, duration: dy / 2, useNativeDriver: true }),
        Animated.timing(ay, { toValue: -50, duration: dy / 2, useNativeDriver: true }),
      ]))]).start();
      Animated.sequence([Animated.delay(dlx), Animated.loop(Animated.sequence([
        Animated.timing(ax, { toValue:  30, duration: dx / 2, useNativeDriver: true }),
        Animated.timing(ax, { toValue: -30, duration: dx / 2, useNativeDriver: true }),
      ]))]).start();
    };
    fly(bubble1Y, bubble1X, 4000, 3500);
    fly(bubble2Y, bubble2X, 5000, 4000, 200, 400);
    fly(bubble3Y, bubble3X, 4500, 3800, 400, 200);
    fly(bubble4Y, bubble4X, 5500, 4200, 600, 300);
    fly(bubble5Y, bubble5X, 4800, 4000, 300, 500);
  }, []);

  const handleLogout = async () => {
    try { await logout(); } catch (e: any) { console.log('Logout error:', e?.message); }
  };

  if (profileLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#342949' }]}>
        <TabLoaderCard spinnerColor="#A78BFA" />
      </View>
    );
  }

  const isVerified = (profile as any)?.email_verified || profile?.is_verified;
  const initials   = profile ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() : '?';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />

      {/* ── Background — unchanged ── */}
      <LinearGradient colors={['#342949', '#2a1f3d', '#342949']} style={styles.screenGradient}>
        <Animated.View style={[styles.bubble, { top: '10%', left: '-10%', width: bubbleLarge,  height: bubbleLarge,  transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }]} />
        <Animated.View style={[styles.bubble, { top: '30%', right: '-5%', width: bubbleMedium, height: bubbleMedium, transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }]} />
        <Animated.View style={[styles.bubble, { top: '50%', left: '-8%', width: bubbleSmall,   height: bubbleSmall,  transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }]} />
        <Animated.View style={[styles.bubble, { top: '70%', right: '-7%',width: bubbleMedium,  height: bubbleMedium, transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }]} />
        <Animated.View style={[styles.bubble, { bottom: '5%',left: '5%', width: bubbleSmall,   height: bubbleSmall,  transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }]} />
      </LinearGradient>

      {/* ── Sticky + fading header — unchanged ── */}
      <StickyHeader scrollY={scrollY} firstWord="Your" secondWord="Profile" onBackPress={() => router.back()} />

      <Animated.View style={[styles.headerContainer, {
        paddingTop: headerTopPadding, paddingHorizontal: pageInset, paddingBottom: headerBottomPadding,
        opacity: scrollY.interpolate({ inputRange: [0, headerFadeDistance * 0.45, headerFadeDistance], outputRange: [1, 0, 0], extrapolate: 'clamp' }),
        transform: [{ translateY: scrollY.interpolate({ inputRange: [0, headerFadeDistance], outputRange: [0, -10], extrapolate: 'clamp' }) }],
      }]}>
        <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}>
          <Text style={styles.headerWhite}>Your </Text>
          <Text style={styles.headerPurple}>Profile</Text>
        </Text>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════════════════════
           SCROLL CONTENT
      ══════════════════════════════════════════════════════════════════════ */}
      <Animated.ScrollView
        contentContainerStyle={{ paddingHorizontal: pageInset, paddingTop: contentTopPadding, paddingBottom: contentBottomPadding }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {profile ? (
          <>
            {/* ── IDENTITY CARD ── */}
            <View style={[styles.glassCard, { borderRadius: cardRadius, overflow: 'hidden', marginBottom: cardSpacing }]}>
              <LinearGradient colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              {/* purple top accent strip */}
              <View style={{ height: 3, backgroundColor: '#A78BFA', position: 'absolute', top: 0, left: 0, right: 0 }} />

              <View style={{ padding: cardPadding, paddingTop: cardPadding + 3 }}>
                {/* Avatar orb + name + email */}
                <View style={{ alignItems: 'center', marginBottom: clamp(height * 0.024, 16, 22) }}>
                  {/* Outer glow ring */}
                  <View style={[styles.avatarRing, { width: avatarRingSize, height: avatarRingSize, borderRadius: avatarRingSize / 2, marginBottom: clamp(height * 0.016, 10, 14) }]}>
                    <LinearGradient
                      colors={['#6D45C7', '#A78BFA', '#FFB36B']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: avatarRingSize / 2 }]}
                    />
                    {/* Inner dark circle */}
                    <View style={[styles.avatarInner, { width: avatarRingSize - 4, height: avatarRingSize - 4, borderRadius: (avatarRingSize - 4) / 2 }]}>
                      {initials.length > 0 && initials !== '?' ? (
                        <Text style={{ fontSize: clamp(width * 0.1, 34, 44), fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 }}>
                          {initials}
                        </Text>
                      ) : (
                        <FontAwesome name="user" size={avatarIconSize * 0.85} color="#B8A8E6" />
                      )}
                    </View>
                  </View>

                  <Text style={{ fontSize: profileNameSize, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', letterSpacing: 0.3, marginBottom: 4 }}>
                    {profile.first_name} {profile.last_name}
                  </Text>
                  <Text style={{ fontSize: profileEmailSize, color: '#9D8EC7', textAlign: 'center', letterSpacing: 0.2 }}>
                    {profile.email}
                  </Text>

                  {/* Verified badge inline */}
                  <View style={[styles.verifiedBadge, { marginTop: clamp(height * 0.01, 6, 10) }]}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isVerified ? '#34D399' : '#FFB36B', marginRight: 6 }} />
                    <Text style={{ fontSize: clamp(width * 0.028, 10, 11), color: isVerified ? '#34D399' : '#FFB36B', fontWeight: '700', letterSpacing: 0.8 }}>
                      {isVerified ? 'VERIFIED ACCOUNT' : 'UNVERIFIED'}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: clamp(height * 0.02, 14, 18) }} />

                {/* Info rows — icon-led */}
                {[
                  { icon: 'id-badge',   label: 'User Type',    value: profile.user_type?.replace(/_/g, ' ') ?? '—', accent: '#A78BFA' },
                  { icon: 'user',       label: 'Username',     value: (profile as any).username ?? '—',              accent: '#FFB36B' },
                  { icon: 'phone',      label: 'Phone',        value: (profile as any).phone_number ?? 'Not set',    accent: '#5DADE2' },
                  { icon: 'calendar',   label: 'Date of Birth',value: (profile as any).date_of_birth ?? 'Not set',   accent: '#34D399' },
                ].map((row, idx, arr) => (
                  <View
                    key={row.label}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: clamp(height * 0.014, 10, 13),
                      borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                      borderBottomColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {/* Coloured icon badge */}
                    <View style={[styles.rowIconBadge, { backgroundColor: `${row.accent}18`, borderColor: `${row.accent}30` }]}>
                      <FontAwesome name={row.icon as any} size={clamp(width * 0.036, 12, 15)} color={row.accent} />
                    </View>
                    <View style={{ flex: 1, marginLeft: clamp(width * 0.03, 10, 14) }}>
                      <Text style={{ fontSize: labelSize, color: '#7B6FA0', fontWeight: '600', letterSpacing: 0.4, marginBottom: 2 }}>
                        {row.label.toUpperCase()}
                      </Text>
                      <Text style={{ fontSize: valueSize, color: '#FFFFFF', fontWeight: '700' }}>
                        {row.value}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Edit Profile button */}
                <TouchableOpacity
                  style={[styles.editBtn, { paddingVertical: buttonPadY, borderRadius: buttonRadius, marginTop: clamp(height * 0.02, 14, 18) }]}
                  onPress={() => router.push('./profile-edit' as any)}
                  activeOpacity={0.82}
                >
                  <LinearGradient
                    colors={['#A78BFA', '#7C5FC0']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: buttonRadius }]}
                  />
                  <FontAwesome name="pencil" size={13} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: buttonTextSize, color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.3 }}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── PREFERENCES SECTION HEADER ── */}
            <Text style={{ fontSize: sectionHeaderSize, color: '#7B6FA0', fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: clamp(height * 0.012, 8, 12), paddingHorizontal: 2 }}>
              Preferences
            </Text>

            {/* ── MENU CARDS ── */}
            {[
              {
                icon: 'bell'       as const,
                grad: ['#FF6B9D', '#C44569'] as [string, string],
                title: 'Notification Settings',
                sub:   'Manage your reminders',
                route: './notification-settings',
                accent: '#FF6B9D',
              },
            ].map(item => (
              <TouchableOpacity
                key={item.title}
                style={[styles.glassCard, { borderRadius: cardRadius, overflow: 'hidden', marginBottom: cardSpacing }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.82}
              >
                <LinearGradient colors={CARD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                {/* left accent rail */}
                <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: item.accent }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', padding: cardPadding, paddingLeft: cardPadding + 3 }}>
                  <LinearGradient
                    colors={item.grad}
                    style={[styles.menuIconGrad, { width: menuIconBox, height: menuIconBox, borderRadius: menuIconRadius }]}
                  >
                    <FontAwesome name={item.icon} size={menuIconSz} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: clamp(width * 0.035, 12, 16) }}>
                    <Text style={{ fontSize: menuTitleSize, fontWeight: '700', color: '#FFFFFF', marginBottom: 3 }}>{item.title}</Text>
                    <Text style={{ fontSize: menuSubtitleSize, color: '#7B6FA0' }}>{item.sub}</Text>
                  </View>
                  <View style={styles.chevronBubble}>
                    <FontAwesome name="chevron-right" size={clamp(width * 0.03, 10, 12)} color="#B8A8E6" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* ── LOGOUT ── */}
            <TouchableOpacity
              style={[styles.logoutBtn, { borderRadius: cardRadius, paddingVertical: clamp(height * 0.018, 13, 17), marginTop: clamp(height * 0.01, 6, 10) }]}
              onPress={handleLogout}
              activeOpacity={0.82}
            >
              <View style={styles.logoutInner}>
                <View style={[styles.logoutIconBubble, { borderRadius: clamp(width * 0.03, 10, 12) }]}>
                  <FontAwesome name="sign-out" size={clamp(width * 0.042, 14, 17)} color="#EF4444" />
                </View>
                <Text style={{ fontSize: logoutTextSize, color: '#EF4444', fontWeight: '800', letterSpacing: 0.2, marginLeft: clamp(width * 0.03, 10, 14) }}>
                  Log Out
                </Text>
              </View>
            </TouchableOpacity>

            {/* App version footnote */}
            <Text style={{ textAlign: 'center', color: 'rgba(123,111,160,0.45)', fontSize: clamp(width * 0.027, 9, 11), marginTop: clamp(height * 0.024, 16, 22), letterSpacing: 0.5 }}>
              Mindful — Patient App
            </Text>
          </>
        ) : (
          <Text style={styles.errorText}>⚠️ Failed to load profile. Please try again.</Text>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#342949' },
  screenGradient:  { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  bubble:          { position: 'absolute', backgroundColor: 'rgba(133, 130, 180, 0.15)', borderRadius: 1000 },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900 },
  headerTitle:     { fontWeight: '800', textAlign: 'center' },
  headerWhite:     { color: '#FFFFFF' },
  headerPurple:    { color: '#B8A8E6' },
  loadingContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText:       { textAlign: 'center', fontSize: 16, color: '#FF6B6B', marginTop: 20 },

  // ── Glass card (shared with rest of app) ─────────────────────────────────
  glassCard: {
    backgroundColor: '#3F3752',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#120A24',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 7,
  },

  // ── Avatar ────────────────────────────────────────────────────────────────
  avatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    shadowColor: '#A78BFA',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  avatarInner: {
    backgroundColor: '#2C2248',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Verified badge ────────────────────────────────────────────────────────
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.20)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  // ── Info row icon badge ───────────────────────────────────────────────────
  rowIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },

  // ── Edit button ───────────────────────────────────────────────────────────
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // ── Menu cards ────────────────────────────────────────────────────────────
  menuIconGrad: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chevronBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
    overflow: 'hidden',
  },
  logoutInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIconBubble: {
    width: 34,
    height: 34,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
});
