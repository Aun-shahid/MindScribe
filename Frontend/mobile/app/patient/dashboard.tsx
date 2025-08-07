

// import { useEffect } from 'react';
// import {
//   View,
//   Text,
//   ActivityIndicator,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   SafeAreaView,
// } from 'react-native';
// import { router } from 'expo-router';
// import { useAuthContext } from '../contexts/AuthContext';
// import { useTheme } from '../contexts/ThemeContext';

// export default function PatientDashboard() {
//   const { 
//     user, 
//     profileLoading, 
//     fetchProfile 
//   } = useAuthContext();
//   const { themeStyle } = useTheme();

//   // Log complete user information whenever user changes
//   useEffect(() => {
//     if (user) {
//       console.log('='.repeat(60));
//       console.log('🔵 PATIENT USER LOGIN - COMPLETE INFO:');
//       console.log('='.repeat(60));
//       console.log('📋 Basic Info:');
//       console.log('  - ID:', user.id);
//       console.log('  - Username:', (user as any).username || 'Not available');
//       console.log('  - Email:', user.email);
//       console.log('  - First Name:', user.first_name);
//       console.log('  - Last Name:', user.last_name);
//       console.log('  - User Type:', user.user_type);
//       console.log('');
//       console.log('✅ Verification Status:');
//       console.log('  - Is Verified:', user.is_verified);
//       console.log('  - Email Verified:', (user as any).email_verified || 'Not available');
//       console.log('  - Verified Field:', (user as any).verified || 'Not available');
//       console.log('');
//       console.log('📅 Timestamps:');
//       console.log('  - Date Joined:', (user as any).date_joined || 'Not available');
//       console.log('  - Last Login:', (user as any).last_login || 'Not available');
//       console.log('');
//       console.log('🔧 Additional Fields:');
//       console.log('  - Is Active:', (user as any).is_active || 'Not available');
//       console.log('  - Is Staff:', (user as any).is_staff || 'Not available');
//       console.log('  - Is Superuser:', (user as any).is_superuser || 'Not available');
//       console.log('  - Phone Number:', (user as any).phone_number || 'Not available');
//       console.log('  - Date of Birth:', (user as any).date_of_birth || 'Not available');
//       console.log('');
//       console.log('📦 Complete User Object:');
//       console.log(JSON.stringify(user, null, 2));
//       console.log('='.repeat(60));
//     } else {
//       console.log('❌ PATIENT DASHBOARD: No user data available');
//     }
//   }, [user]);

//   useEffect(() => {
//     fetchProfile();
//   }, [fetchProfile]);

//   if (profileLoading) {
//     return (
//       <View style={[styles.loadingContainer, { backgroundColor: themeStyle.background }] }>
//         <ActivityIndicator size="large" color={themeStyle.text} />
//         <Text style={[styles.loadingText, { color: themeStyle.label }]}>Loading your dashboard...</Text>
//       </View>
//     );
//   }

//   if (!user) {
//     return (
//       <View style={[styles.errorContainer, { backgroundColor: themeStyle.background }] }>
//         <Text style={[styles.errorText, { color: themeStyle.error }]}>⚠️ Failed to load profile. Try logging in again.</Text>
//         <TouchableOpacity
//           style={[styles.btn, { backgroundColor: themeStyle.logoutButton }]}
//           onPress={() => {
//             router.push('../auth/login');
//           }}>
//           <Text style={[styles.btnlabel, { color: themeStyle.logoutText }]}>Back to Login</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }] }>
//       <ScrollView contentContainerStyle={styles.container}>
//         <Text style={[styles.welcome, { color: themeStyle.title }]}>👋 Welcome, {user.first_name}!</Text>
//         <Text style={[styles.infoLabel, { color: themeStyle.label }]}>Email:</Text>
//         <Text style={[styles.infoText, { color: themeStyle.text }]}>{user.email}</Text>
//         <Text style={[styles.infoLabel, { color: themeStyle.label }]}>User Type:</Text>
//         <Text style={[styles.infoText, { color: themeStyle.text }]}>{user.user_type}</Text>
//         <TouchableOpacity style={[styles.profileButton, { backgroundColor: themeStyle.logoutButton }]} onPress={() => router.push('./profile')}>
//           <Text style={[styles.profileButtonText, { color: themeStyle.logoutText }]}>Go to Profile</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: {
//     flex: 1,
//     backgroundColor: '#ffffff',
//   },
//   container: {
//     padding: 24,
//     justifyContent: 'center',
//   },
//   welcome: {
//     fontSize: 26,
//     fontWeight: '700',
//     color: '#524f85',
//     marginBottom: 16,
//     textAlign: 'center',
//   },
//   infoLabel: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#555',
//     marginTop: 10,
//   },
//   infoText: {
//     fontSize: 16,
//     color: '#333',
//     marginBottom: 10,
//   },
//   profileButton: {
//     marginTop: 30,
//     backgroundColor: '#524f85',
//     paddingVertical: 14,
//     paddingHorizontal: 24,
//     borderRadius: 10,
//     alignItems: 'center',
//     elevation: 3, // Android shadow
//     shadowColor: '#000', // iOS shadow
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 2 },
//     shadowRadius: 4,
//   },
//   profileButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   loadingContainer: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     color: '#666',
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     padding: 24,
//   },
//   errorText: {
//     color: 'red',
//     fontSize: 16,
//     textAlign: 'center',
//   },
//   btn:{
//         width:200,
//         backgroundColor:'#524f85',
        
//         borderRadius:50,
//         paddingVertical:12,
//         paddingHorizontal:10,
//        // padding:9,
//         alignContent:'center',
//         alignItems:'center',
//         marginTop:30
//     },
//     btnlabel:{
//         color:'white',
//         fontSize:22,
//         fontWeight:600,
        
//     },
// });



import { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;
const CARD_WIDTH = screenWidth / 2 - 32; // Two cards per row, minus padding/margin

type DashboardCard = {
  id: string;
  title: string;
  subtitle: string;
  screen: string;
};

const dashboardCards: DashboardCard[] = [
  {
    id: 'mood',
    title: "Today's Mood",
    subtitle: 'Feeling good 😊',
    screen: './mood',
  },
  {
    id: 'historyDashboard',
    title: 'History Dashboard',
    subtitle: 'View your progress and insights',
    screen: './history-dashboard',
  },
  {
    id: 'journalEntries',
    title: 'Journal Entries',
    subtitle: '12 this month',
    screen: './journal',
  },
  {
    id: 'nextSession',
    title: 'Next Session',
    subtitle: 'Tomorrow · 2:00 PM',
    screen: './sessions',
  },
  {
    id: 'break',
    title: 'Take a Break',
    subtitle: 'Relaxing sounds and nature therapy',
    screen: './relaxation',
  },
  {
    id: 'journal',
    title: 'Journal',
    subtitle: 'Express yourself with words and voice',
    screen: './journal',
  },
  {
    id: 'moodTracker',
    title: 'Mood Tracker',
    subtitle: 'Track and understand your emotions',
    screen: './mood-tracker',
  },
  {
    id: 'activityTracker',
    title: 'Activity Tracker',
    subtitle: 'Log activities and their impact on mood',
    screen: './activity-tracker',
  },
];

export default function PatientDashboard() {
  const { user, profileLoading, fetchProfile } = useAuthContext();
  const { themeStyle } = useTheme();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (profileLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeStyle.background }]}>
        <ActivityIndicator size="large" color={themeStyle.text} />
        <Text style={[styles.loadingText, { color: themeStyle.label }]}>Loading your dashboard...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themeStyle.background }]}>
        <Text style={[styles.errorText, { color: themeStyle.error }]}>⚠️ Failed to load profile. Try logging in again.</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: themeStyle.logoutButton }]}
          onPress={() => router.push('../auth/login')}>
          <Text style={[styles.btnlabel, { color: themeStyle.logoutText }]}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCardPress = (screen: string) => {
    try {
      console.log('Navigating to:', screen);
      router.push(screen as any);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback: Navigate to profile if specific screen doesn't exist
      router.push('./profile');
    }
  };

  const renderCard = ({ item }: { item: DashboardCard }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: themeStyle.dashboardcard || '#ffffff', width: CARD_WIDTH }]}
      onPress={() => handleCardPress(item.screen)}
    >
      <Text style={[styles.cardTitle, { color: themeStyle.title }]}>{item.title}</Text>
      <Text style={[styles.cardSubtitle, { color: themeStyle.text }]}>{item.subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Cute Greeting Section */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: themeStyle.title }]}>
            🌞 Good {getTimeGreeting()}, {user.first_name}!
          </Text>
          <Text style={[styles.subtext, { color: themeStyle.label }]}>
            How are you feeling today? Let’s continue your wellness journey.
          </Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoText, { color: themeStyle.text }]}>Email: {user.email}</Text>
            <Text style={[styles.infoText, { color: themeStyle.text }]}>User Type: {user.user_type}</Text>
          </View>
        </View>

        {/* Dashboard Cards */}
        <View style={styles.cardWrapper}>
          <FlatList
            data={dashboardCards}
            renderItem={renderCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.cardRow}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Utility function for time-based greeting
const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 15,
    marginBottom: 10,
  },
  infoRow: {
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  cardWrapper: {
    flex: 1,
  },
  cardRow: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  btn: {
    width: 200,
    backgroundColor: '#524f85',
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  btnlabel: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
  },
});

