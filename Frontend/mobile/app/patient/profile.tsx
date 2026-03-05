// import { useEffect } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   StyleSheet,
//   SafeAreaView,
//   ActivityIndicator,
//   TouchableOpacity,
// } from 'react-native';
// import { useAuthContext } from '../contexts/AuthContext';
// import { useTheme } from '../contexts/ThemeContext';

// export default function PatientProfile() {
//   const { 
//     profile, 
//     profileLoading, 
//     error, 
//     fetchProfile, 
//     logout 
//   } = useAuthContext();

//   const { theme, themeStyle, toggleTheme } = useTheme();

//   // Debug profile verification fields
//   useEffect(() => {
//     if (profile) {
//       console.log('🔍 PATIENT PROFILE VERIFICATION DEBUG:');
//       console.log('  - profile.is_verified:', profile.is_verified);
//       console.log('  - profile.email_verified:', (profile as any).email_verified);
//       console.log('  - profile.verified:', (profile as any).verified);
//       console.log('  - Complete profile object:', JSON.stringify(profile, null, 2));
//     }
//   }, [profile]);

//   useEffect(() => {
//     fetchProfile();
//   }, [fetchProfile]);

//   const handleLogout = async () => {
//     try {
//       await logout();
//     } catch (e: any) {
//       console.log('Logout error:', e?.message);
//     }
//   };

//   if (profileLoading) {
//     return (
//       <View style={[styles.loadingContainer, { backgroundColor: themeStyle.background }] }>
//         <ActivityIndicator size="large" color={themeStyle.text} />
//         <Text style={[styles.loadingText, { color: themeStyle.label }]}>Fetching your profile...</Text>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }] }>
//       <TouchableOpacity
//         style={{ alignSelf: 'flex-end', margin: 16, padding: 8, backgroundColor: themeStyle.button, borderRadius: 8 }}
//         onPress={toggleTheme}
//       >
//         <Text style={{ color: themeStyle.buttonText, fontWeight: '600' }}>
//           Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
//         </Text>
//       </TouchableOpacity>
//       <ScrollView contentContainerStyle={styles.container}>
//         <Text style={[styles.title, { color: themeStyle.title }]}>👤 Your Profile</Text>
//         {profile ? (
//           <>
//             <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }] }>
//               <Text style={[styles.label, { color: themeStyle.label }]}>ID:</Text>
//               <Text style={[styles.value, { color: themeStyle.text }]}>{profile.id}</Text>
//             </View>
//             <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }] }>
//               <Text style={[styles.label, { color: themeStyle.label }]}>Name:</Text>
//               <Text style={[styles.value, { color: themeStyle.text }]}>{profile.first_name} {profile.last_name}</Text>
//             </View>
//             <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }] }>
//               <Text style={[styles.label, { color: themeStyle.label }]}>Email:</Text>
//               <Text style={[styles.value, { color: themeStyle.text }]}>{profile.email}</Text>
//             </View>
//             <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }] }>
//               <Text style={[styles.label, { color: themeStyle.label }]}>User Type:</Text>
//               <Text style={[styles.value, { color: themeStyle.text }]}>{profile.user_type}</Text>
//             </View>
//             <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }] }>
//               <Text style={[styles.label, { color: themeStyle.label }]}>Verified:</Text>
//               <Text style={[styles.value, { color: themeStyle.text }]}>
//                 {(profile as any).email_verified || profile.is_verified ? 'Yes' : 'No'}
//               </Text>
//             </View>
//             <TouchableOpacity style={[styles.logoutButton, { backgroundColor: themeStyle.logoutButton }]} onPress={handleLogout}>
//               <Text style={[styles.logoutText, { color: themeStyle.logoutText }]}>Logout</Text>
//             </TouchableOpacity>
//           </>
//         ) : (
//           <Text style={[styles.errorText, { color: themeStyle.error }]}>⚠️ Failed to load profile. Please try again.</Text>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: {
//     flex: 1,
//     // backgroundColor set dynamically
//   },
//   container: {
//     padding: 24,
//     justifyContent: 'center',
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: '700',
//     // color set dynamically
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   infoBox: {
//     marginBottom: 16,
//     // borderBottomColor set dynamically
//     borderBottomWidth: 1,
//     paddingBottom: 8,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '600',
//     // color set dynamically
//   },
//   value: {
//     fontSize: 16,
//     // color set dynamically
//   },
//   logoutButton: {
//     // backgroundColor set dynamically
//     paddingVertical: 14,
//     borderRadius: 10,
//     alignItems: 'center',
//     marginTop: 30,
//     elevation: 2,
//   },
//   logoutText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   errorText: {
//     // color set dynamically
//     textAlign: 'center',
//     fontSize: 16,
//     marginTop: 20,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     // color set dynamically
//   },
// });
import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import StickyHeader from '../components/StickyHeader';

export default function PatientProfile() {
  const { profile, profileLoading, error, fetchProfile, logout } = useAuthContext();
  const { theme, themeStyle, toggleTheme } = useTheme();

  // Scroll + header animation
  const scrollY = useRef(new Animated.Value(0)).current;

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

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // Bubble animation effect
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
        <ActivityIndicator size="large" color="#A78BFA" />
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
              width: 120,
              height: 120,
              transform: [
                { translateY: bubble1Y },
                { translateX: bubble1X },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '30%',
              right: '-5%',
              width: 100,
              height: 100,
              transform: [
                { translateY: bubble2Y },
                { translateX: bubble2X },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '50%',
              left: '-8%',
              width: 90,
              height: 90,
              transform: [
                { translateY: bubble3Y },
                { translateX: bubble3X },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '70%',
              right: '-7%',
              width: 110,
              height: 110,
              transform: [
                { translateY: bubble4Y },
                { translateX: bubble4X },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              bottom: '5%',
              left: '5%',
              width: 95,
              height: 95,
              transform: [
                { translateY: bubble5Y },
                { translateX: bubble5X },
              ],
            },
          ]}
        />
      </LinearGradient>

      {/* Sticky header - slides in when scrolled */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="Your"
        secondWord="Profile"
        onBackPress={() => router.back()}
      />

      {/* Animated fading header */}
      <Animated.View style={[styles.headerContainer, {
        opacity: scrollY.interpolate({
          inputRange: [0, 100, 150],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        })
      }]}>
        <Text style={styles.headerTitle}>
          <Text style={styles.headerWhite}>Your </Text>
          <Text style={styles.headerPurple}>Profile</Text>
        </Text>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
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
            <View style={styles.card}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <FontAwesome name="user-circle" size={60} color="#B8A8E6" />
                </View>
                <Text style={styles.profileName}>
                  {profile.first_name} {profile.last_name}
                </Text>
                <Text style={styles.profileEmail}>{profile.email}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>User Type</Text>
                <Text style={styles.infoValue}>{profile.user_type}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account Status</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {(profile as any).email_verified || profile.is_verified ? '✓ Verified' : 'Not Verified'}
                  </Text>
                </View>
              </View>

              {/* Edit Profile Button */}
              <TouchableOpacity style={styles.editProfileButton} onPress={() => router.push('./profile-edit' as any)}>
                <FontAwesome name="pencil" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Preferences Section */}
            <Text style={styles.sectionHeader}>Preferences</Text>
            
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => router.push('./notification-settings' as any)}
            >
              <View style={styles.menuIconContainer}>
                <LinearGradient
                  colors={['#FF6B9D', '#C44569']}
                  style={styles.iconGradient}
                >
                  <FontAwesome name="bell" size={20} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Notification Settings</Text>
                <Text style={styles.menuSubtitle}>Manage your reminders</Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color="#8D8BA7" />
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <FontAwesome name="sign-out" size={16} color="#FF6B9D" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Log Out</Text>
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
    paddingTop: 90,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerWhite: {
    color: '#FFFFFF',
  },
  headerPurple: {
    color: '#B8A8E6',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#473F5A',
    padding: 20,
    borderRadius: 14,
    marginBottom: 16,
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
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#B8A8E6',
  },
  infoValue: {
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#A78BFA',
  },
  editProfileButton: {
    backgroundColor: '#A78BFA',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 12,
  },
  editProfileText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuCard: {
    backgroundColor: '#473F5A',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuIconContainer: {
    marginRight: 12,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#8D8BA7',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 107, 157, 0.15)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 157, 0.3)',
  },
  logoutText: {
    color: '#FF6B9D',
    fontSize: 16,
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
