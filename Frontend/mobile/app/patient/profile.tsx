
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

  const pageInset = clamp(width * 0.03, 12, 18);
  const headerTopPadding = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding = clamp(height * 0.02, 14, 22);
  const headerTitleSize = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop = clamp(height * 0.022, 14, 22);
  const headerFadeDistance = clamp(height * 0.022, 14, 20);
  const headerEstimatedHeight = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;
  const contentTopPadding = headerEstimatedHeight + clamp(height * 0.014, 8, 12);
  const contentBottomPadding = clamp(insets.bottom + height * 0.03, 28, 44);

  const bubbleLarge = clamp(width * 0.34, 100, 140);
  const bubbleMedium = clamp(width * 0.29, 90, 120);
  const bubbleSmall = clamp(width * 0.26, 82, 108);

  const cardRadius = clamp(width * 0.042, 14, 18);
  const cardPadding = clamp(width * 0.05, 16, 22);
  const cardSpacing = clamp(height * 0.02, 14, 20);
  const profileNameSize = clamp(width * 0.06, 20, 24);
  const profileEmailSize = clamp(width * 0.036, 13, 15);
  const labelSize = clamp(width * 0.036, 13, 15);
  const valueSize = clamp(width * 0.036, 13, 15);
  const statusSize = clamp(width * 0.031, 11, 13);
  const statusPadX = clamp(width * 0.03, 10, 14);
  const statusPadY = clamp(height * 0.008, 5, 8);
  const buttonPadY = clamp(height * 0.014, 10, 14);
  const buttonRadius = clamp(width * 0.03, 10, 14);
  const buttonTextSize = clamp(width * 0.036, 13, 15);
  const sectionHeaderSize = clamp(width * 0.047, 16, 20);
  const menuIconSizeBox = clamp(width * 0.125, 42, 50);
  const menuIconRadius = clamp(width * 0.03, 10, 14);
  const menuTitleSize = clamp(width * 0.041, 14, 17);
  const menuSubtitleSize = clamp(width * 0.031, 11, 13);
  const logoutTextSize = clamp(width * 0.041, 15, 17);
  const avatarIconSize = clamp(width * 0.16, 50, 66);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const createFloatingAnimation = (
      animatedValueY: Animated.Value,
      animatedValueX: Animated.Value,
      durationY: number,
      durationX: number,
      delayY: number = 0,
      delayX: number = 0
    ) => {
      const animateY = () => {
        Animated.sequence([
          Animated.delay(delayY),
          Animated.loop(
            Animated.sequence([
              Animated.timing(animatedValueY, {
                toValue: 50,
                duration: durationY / 2,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValueY, {
                toValue: -50,
                duration: durationY / 2,
                useNativeDriver: true,
              }),
            ])
          ),
        ]).start();
      };

      const animateX = () => {
        Animated.sequence([
          Animated.delay(delayX),
          Animated.loop(
            Animated.sequence([
              Animated.timing(animatedValueX, {
                toValue: 30,
                duration: durationX / 2,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValueX, {
                toValue: -30,
                duration: durationX / 2,
                useNativeDriver: true,
              }),
            ])
          ),
        ]).start();
      };

      animateY();
      animateX();
    };

    createFloatingAnimation(bubble1Y, bubble1X, 4000, 3500);
    createFloatingAnimation(bubble2Y, bubble2X, 5000, 4000, 200, 400);
    createFloatingAnimation(bubble3Y, bubble3X, 4500, 3800, 400, 200);
    createFloatingAnimation(bubble4Y, bubble4X, 5500, 4200, 600, 300);
    createFloatingAnimation(bubble5Y, bubble5X, 4800, 4000, 300, 500);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e: any) {
      console.log('Logout error:', e?.message);
    }
  };

  if (profileLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#342949' }]}>
        <TabLoaderCard spinnerColor="#A78BFA" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#342949" />
      <LinearGradient
        colors={['#342949', '#2a1f3d', '#342949']}
        style={styles.screenGradient}
      >
        {/* Floating Bubbles */}
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '10%',
              left: '-10%',
              width: bubbleLarge,
              height: bubbleLarge,
              transform: [{ translateY: bubble1Y }, { translateX: bubble1X }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '30%',
              right: '-5%',
              width: bubbleMedium,
              height: bubbleMedium,
              transform: [{ translateY: bubble2Y }, { translateX: bubble2X }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '50%',
              left: '-8%',
              width: bubbleSmall,
              height: bubbleSmall,
              transform: [{ translateY: bubble3Y }, { translateX: bubble3X }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '70%',
              right: '-7%',
              width: bubbleMedium,
              height: bubbleMedium,
              transform: [{ translateY: bubble4Y }, { translateX: bubble4X }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              bottom: '5%',
              left: '5%',
              width: bubbleSmall,
              height: bubbleSmall,
              transform: [{ translateY: bubble5Y }, { translateX: bubble5X }],
            },
          ]}
        />
      </LinearGradient>

      <StickyHeader
        scrollY={scrollY}
        firstWord="Your"
        secondWord="Profile"
        onBackPress={() => router.back()}
      />

      <Animated.View style={[styles.headerContainer, {
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
      }]}>
        <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}>
          <Text style={styles.headerWhite}>Your </Text>
          <Text style={styles.headerPurple}>Profile</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContent, {
          paddingHorizontal: pageInset,
          paddingTop: contentTopPadding,
          paddingBottom: contentBottomPadding,
        }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {profile ? (
          <>
            {/* Profile Card */}
            <View style={[styles.card, { borderRadius: cardRadius, padding: cardPadding, marginBottom: cardSpacing }]}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <FontAwesome name="user-circle" size={avatarIconSize} color="#B8A8E6" />
                </View>
                <Text style={[styles.profileName, { fontSize: profileNameSize }]}>
                  {profile.first_name} {profile.last_name}
                </Text>
                <Text style={[styles.profileEmail, { fontSize: profileEmailSize }]}>{profile.email}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { fontSize: labelSize }]}>User Type</Text>
                <Text style={[styles.infoValue, { fontSize: valueSize }]}>{profile.user_type}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { fontSize: labelSize }]}>Account Status</Text>
                <View style={[styles.statusBadge, { paddingHorizontal: statusPadX, paddingVertical: statusPadY, borderRadius: buttonRadius }]}>
                  <Text style={[styles.statusText, { fontSize: statusSize }]}>
                    {(profile as any).email_verified || profile.is_verified ? '✓ Verified' : 'Not Verified'}
                  </Text>
                </View>
              </View>

              {/* ── FIXED: added missing closing } on style prop ── */}
              <TouchableOpacity
                style={[styles.editProfileButton, { paddingVertical: buttonPadY, paddingHorizontal: clamp(width * 0.04, 14, 18), borderRadius: buttonRadius, marginTop: clamp(height * 0.014, 10, 14) }]}
                onPress={() => router.push('./profile-edit' as any)}
              >
                <FontAwesome name="pencil" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={[styles.editProfileText, { fontSize: buttonTextSize }]}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Preferences Section */}
            <Text style={[styles.sectionHeader, { fontSize: sectionHeaderSize, marginTop: clamp(height * 0.024, 18, 26), marginBottom: clamp(height * 0.014, 10, 14) }]}>
              Preferences
            </Text>

            <TouchableOpacity
              style={[styles.menuCard, { borderRadius: cardRadius, padding: cardPadding, marginBottom: clamp(height * 0.014, 10, 14) }]}
              onPress={() => router.push('./notification-settings' as any)}
            >
              <View style={styles.menuIconContainer}>
                <LinearGradient
                  colors={['#FF6B9D', '#C44569']}
                  style={[styles.iconGradient, { width: menuIconSizeBox, height: menuIconSizeBox, borderRadius: menuIconRadius }]}
                >
                  <FontAwesome name="bell" size={20} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { fontSize: menuTitleSize }]}>Notification Settings</Text>
                <Text style={[styles.menuSubtitle, { fontSize: menuSubtitleSize }]}>Manage your reminders</Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color="#8D8BA7" />
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              style={[styles.logoutButton, { paddingVertical: clamp(height * 0.018, 12, 16), borderRadius: cardRadius, marginTop: clamp(height * 0.024, 18, 26) }]}
              onPress={handleLogout}
            >
              <FontAwesome name="sign-out" size={16} color="#FF6B9D" style={{ marginRight: 8 }} />
              <Text style={[styles.logoutText, { fontSize: logoutTextSize }]}>Log Out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.errorText}>
            ⚠️ Failed to load profile. Please try again.
          </Text>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#342949',
  },
  screenGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(133, 130, 180, 0.15)',
    borderRadius: 1000,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 900,
  },
  headerTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },
  scrollContent: {},
  card: {
    backgroundColor: '#473F5A',
    borderTopWidth: 6,
    borderTopColor: '#A78BFA',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  profileName: {
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    color: '#B8A8E6',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoLabel: {
    fontWeight: '600',
    color: '#B8A8E6',
  },
  infoValue: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A78BFA',
  },
  statusText: {
    fontWeight: '700',
    color: '#A78BFA',
  },
  editProfileButton: {
    backgroundColor: '#A78BFA',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  editProfileText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeader: {
    fontWeight: '800',
    color: '#FFFFFF',
    paddingHorizontal: 4,
  },
  menuCard: {
    backgroundColor: '#473F5A',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuIconContainer: {
    marginRight: 12,
  },
  iconGradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  menuSubtitle: {
    color: '#8D8BA7',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 107, 157, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
  },
  logoutText: {
    color: '#FF6B9D',
    fontWeight: '800',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#FF6B6B',
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
