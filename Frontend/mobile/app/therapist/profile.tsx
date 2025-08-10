
import React, { useEffect } from 'react';
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
import { getProfileFields, getThemeToggleText } from '../utils/profile';
import { ProfileField } from '../components/ProfileField';
import { THERAPIST_MESSAGES } from '../constants/messages';

export default function TherapistProfile() {
  const { profile, profileLoading, fetchProfile, logout } = useAuthContext();
  const { theme, themeStyle, toggleTheme } = useTheme();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
        <Text style={[styles.loadingText, { color: themeStyle.label }]}>{THERAPIST_MESSAGES.PROFILE_LOADING}</Text>
      </View>
    );
  }

  const profileFields = profile ? getProfileFields(profile) : [];
  const themeToggleText = getThemeToggleText(theme);

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}>
      <TouchableOpacity
        style={[styles.themeToggle, { backgroundColor: themeStyle.button }]}
        onPress={toggleTheme}
      >
        <Text style={[styles.themeToggleText, { color: themeStyle.buttonText }]}>
          {themeToggleText}
        </Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: themeStyle.title }]}>{THERAPIST_MESSAGES.PROFILE_TITLE}</Text>

        {profile ? (
          <>
            {profileFields.map((field, index) => (
              <ProfileField
                key={`${field.label}-${index}`}
                field={field}
                themeStyle={themeStyle}
              />
            ))}

            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: themeStyle.logoutButton }]}
              onPress={handleLogout}
            >
              <Text style={[styles.logoutText, { color: themeStyle.logoutText }]}>{THERAPIST_MESSAGES.LOGOUT}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[styles.errorText, { color: themeStyle.error }]}>
            {THERAPIST_MESSAGES.PROFILE_LOAD_ERROR}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
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
