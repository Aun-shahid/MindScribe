



import { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function TherapistDashboard() {
  const { 
    user, 
    profileLoading, 
    fetchProfile 
  } = useAuthContext();
  const { themeStyle } = useTheme();

  // Log complete user information whenever user changes
  useEffect(() => {
    if (user) {
      console.log('='.repeat(60));
      console.log('🔵 Therapist USER LOGIN - COMPLETE INFO:');
      console.log('='.repeat(60));
      console.log('📋 Basic Info:');
      console.log('  - ID:', user.id);
      console.log('  - Username:', (user as any).username || 'Not available');
      console.log('  - Email:', user.email);
      console.log('  - First Name:', user.first_name);
      console.log('  - Last Name:', user.last_name);
      console.log('  - User Type:', user.user_type);
      console.log('');
      console.log('✅ Verification Status:');
      console.log('  - Is Verified:', user.is_verified);
      console.log('  - Email Verified:', (user as any).email_verified || 'Not available');
      console.log('  - Verified Field:', (user as any).verified || 'Not available');
      console.log('');
      console.log('📅 Timestamps:');
      console.log('  - Date Joined:', (user as any).date_joined || 'Not available');
      console.log('  - Last Login:', (user as any).last_login || 'Not available');
      console.log('');
      console.log('🔧 Additional Fields:');
      console.log('  - Is Active:', (user as any).is_active || 'Not available');
      console.log('  - Is Staff:', (user as any).is_staff || 'Not available');
      console.log('  - Is Superuser:', (user as any).is_superuser || 'Not available');
      console.log('  - Phone Number:', (user as any).phone_number || 'Not available');
      console.log('  - Date of Birth:', (user as any).date_of_birth || 'Not available');
      console.log('');
      console.log('📦 Complete User Object:');
      console.log(JSON.stringify(user, null, 2));
      console.log('='.repeat(60));
    } else {
      console.log('❌ Therapist DASHBOARD: No user data available');
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (profileLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeStyle.background }] }>
        <ActivityIndicator size="large" color={themeStyle.text} />
        <Text style={[styles.loadingText, { color: themeStyle.label }]}>Loading your dashboard...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themeStyle.background }] }>
        <Text style={[styles.errorText, { color: themeStyle.error }]}>⚠️ Failed to load profile. Try logging in again.</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: themeStyle.logoutButton }]}
          onPress={() => {
            router.push('../auth/login');
          }}>
          <Text style={[styles.btnlabel, { color: themeStyle.logoutText }]}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }] }>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.welcome, { color: themeStyle.title }]}>👋 Welcome, {user.first_name}!</Text>
        <Text style={[styles.infoLabel, { color: themeStyle.label }]}>Email:</Text>
        <Text style={[styles.infoText, { color: themeStyle.text }]}>{user.email}</Text>
        <Text style={[styles.infoLabel, { color: themeStyle.label }]}>User Type:</Text>
        <Text style={[styles.infoText, { color: themeStyle.text }]}>{user.user_type}</Text>
        <TouchableOpacity style={[styles.profileButton, { backgroundColor: themeStyle.logoutButton }]} onPress={() => router.push('./profile')}>
          <Text style={[styles.profileButtonText, { color: themeStyle.logoutText }]}>Go to Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    padding: 24,
    justifyContent: 'center',
  },
  welcome: {
    fontSize: 26,
    fontWeight: '700',
    color: '#524f85',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginTop: 10,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  profileButton: {
    marginTop: 30,
    backgroundColor: '#524f85',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  btn:{
        width:200,
        backgroundColor:'#524f85',
        
        borderRadius:50,
        paddingVertical:12,
        paddingHorizontal:10,
       // padding:9,
        alignContent:'center',
        alignItems:'center',
        marginTop:30
    },
    btnlabel:{
        color:'white',
        fontSize:22,
        fontWeight:600,
        
    },
});
