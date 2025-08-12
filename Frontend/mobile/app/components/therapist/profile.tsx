



import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  Pressable,
} from 'react-native';
import { useAuthContext } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { 
    profile, 
    profileLoading, 
    error, 
    fetchProfile, 
    logout 
  } = useAuthContext();

  useEffect(() => {
    fetchProfile();
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#524f85" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <View>
                <Pressable 
                  style={styles.backButton} 
                  onPress={() => router.push('./dashboard')}
                  
                >
                  <AntDesign name="arrowleft" size={24} color="black" />
                </Pressable>
              </View>
      <ScrollView contentContainerStyle={styles.container}>

        {/* <Image
          source={{ uri: 'https://i.ibb.co/F6MJsyK/profile-user.png' }}
          style={styles.illustration}
          resizeMode="contain"
        /> */}

        

        <Text style={styles.title}>👤 Your Profile</Text>

        {profile ? (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>ID</Text>
              <Text style={styles.value}>{profile.id}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{profile.first_name} {profile.last_name}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{profile.email}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>User Type</Text>
              <Text style={styles.value}>{profile.user_type}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Verified</Text>
              <Text style={styles.value}>{profile.is_verified ? 'Yes' : 'No'}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.errorText}>⚠️ Failed to load profile.</Text>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
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
    alignItems: 'center',
    marginTop:50
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  illustration: {
    width: 220,
    height: 160,
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#524f85',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#524f85',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 30,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 16,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  }
});

