

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
import { useAuthContext } from '../../contexts/AuthContext';

export default function PatientDashboard() {
  const { 
    user, 
    profileLoading, 
    fetchProfile 
  } = useAuthContext();

  useEffect(() => {
    fetchProfile();
  }, []);

  //console.log(user);

  // if (profileLoading) {
  //   return (
  //     <View style={styles.loadingContainer}>
  //       <ActivityIndicator size="large" color="#524f85" />
  //       <Text style={styles.loadingText}>Loading your profile...</Text>
  //     </View>
  //   );
  // }

  // if (!user) {
  //   return (
  //     <View style={styles.errorContainer}>
  //       <Text style={styles.errorText}>
  //         ⚠️ Failed to load profile. Try logging in again.
  //       </Text>
  //     </View>
  //   );
  // }
  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#524f85" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }
  
  
  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          ⚠️ Failed to load profile. Try logging in again.
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            router.push('../auth/login');
          }}>
          <Text style={styles.btnlabel}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }
  

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.welcome}>👋 Welcome, {user.first_name}!</Text>
        <Text style={styles.infoLabel}>Email:</Text>
        <Text style={styles.infoText}>{user.email}</Text>

        <Text style={styles.infoLabel}>User Type:</Text>
        <Text style={styles.infoText}>{user.user_type}</Text>

        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('./profile')}>
          <Text style={styles.profileButtonText}>Go to Profile</Text>
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
