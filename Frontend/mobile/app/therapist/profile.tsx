
import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useAuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

/*************  ✨ Windsurf Command ⭐  *************/
/*******  57d4a96b-609a-4102-a609-bfaaceecc820  *******/
export default function TherapistProfile() {
  const { profile, profileLoading, error, fetchProfile, logout } = useAuthContext();
  const { theme, themeStyle, toggleTheme } = useTheme();

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      console.log('🔍 THERAPIST PROFILE DEBUG');
      console.log(JSON.stringify(profile, null, 2));
    }
  }, [profile]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e: any) {
      console.log('Logout error:', e?.message);
    }
  };

  if (profileLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeStyle.background }]}>
        <ActivityIndicator size="large" color={themeStyle.text} />
        <Text style={[styles.loadingText, { color: themeStyle.label }]}>Fetching your profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}>
      <TouchableOpacity
        style={[styles.themeToggle, { backgroundColor: themeStyle.button }]}
        onPress={toggleTheme}
      >
        <Text style={[styles.themeToggleText, { color: themeStyle.buttonText }]}>
          Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: themeStyle.title }]}>👩‍⚕️ Therapist Profile</Text>

        {profile ? (
          <>
            <ProfileField label="ID" value={profile.id} themeStyle={themeStyle} />
            <ProfileField
              label="Name"
              value={`${profile.first_name} ${profile.last_name}`}
              themeStyle={themeStyle}
            />
            <ProfileField label="Email" value={profile.email} themeStyle={themeStyle} />
            <ProfileField label="User Type" value={profile.user_type} themeStyle={themeStyle} />
            <ProfileField
              label="Verified"
              value={(profile as any).email_verified || profile.is_verified ? 'Yes' : 'No'}
              themeStyle={themeStyle}
            />

            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: themeStyle.logoutButton }]}
              onPress={handleLogout}
            >
              <Text style={[styles.logoutText, { color: themeStyle.logoutText }]}>Logout</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[styles.errorText, { color: themeStyle.error }]}>
            ⚠️ Failed to load profile. Please try again.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileField({
  label,
  value,
  themeStyle,
}: {
  label: string;
  value: string;
  themeStyle: any;
}) {
  return (
    <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }]}>
      <Text style={[styles.label, { color: themeStyle.label }]}>{label}:</Text>
      <Text style={[styles.value, { color: themeStyle.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoBox: {
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
  },
  themeToggle: {
    alignSelf: 'flex-end',
    marginTop: 50,
    padding: 8,
    borderRadius: 8,
  },
  themeToggleText: {
    fontWeight: '600',
  },
  logoutButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});
