// app/auth/reset-confirm.tsx
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { validatePasswordField } from '../utils/validation';
import { AUTH_MESSAGES } from '../constants/messages';
import { AuthError } from '../types/auth';

export default function ResetConfirmScreen() {
  const { token } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const { confirmPasswordReset, isLoading, error, clearError } = useAuth();
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + 8 : 0;

  const handleReset = async () => {
    // Validate password
    const passwordValidation = validatePasswordField(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.message || 'Invalid password');
      return;
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    if (!token || typeof token !== 'string') {
      Alert.alert('❌ Error', 'Invalid reset token');
      return;
    }

    try {
      await confirmPasswordReset({ 
        token: token, 
        new_password: password 
      });
      Alert.alert(
        '✅ Success',
        AUTH_MESSAGES.PASSWORD_RESET_SUCCESS,
        [{ text: 'OK' }]
      );
    } catch (err) {
      const authError = err as AuthError;
      Alert.alert('❌ Error', authError?.message || error?.message || 'Error resetting password');
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) {
      setPasswordError(null);
    }
    if (error) {
      clearError();
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (confirmPasswordError) {
      setConfirmPasswordError(null);
    }
    if (error) {
      clearError();
    }
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          bounces={false}
          overScrollMode="never"
        >
          <Text style={styles.title}>Reset Your Password</Text>
          
          <Image
            source={require('../../assets/images/reset1.png')}
            style={styles.image}
            resizeMode="contain"
          />

          <Text style={styles.subtitle}>Please choose a new secure password</Text>

          {(error || passwordError || confirmPasswordError) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {passwordError || confirmPasswordError || error?.message}
              </Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Enter new password</Text>
          <View style={[styles.inputBox, passwordError && styles.inputBoxError]}>
            <Ionicons name="lock-closed-outline" size={20} color="#8D8BA7" />
            <TextInput
              placeholder="New Password"
              placeholderTextColor="#8D8BA7"
              style={styles.input}
              onChangeText={handlePasswordChange}
              value={password}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <Text style={styles.inputLabel}>Confirm new password</Text>
          <View style={[styles.inputBox, confirmPasswordError && styles.inputBoxError]}>
            <Ionicons name="lock-closed-outline" size={20} color="#8D8BA7" />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#8D8BA7"
              style={styles.input}
              onChangeText={handleConfirmPasswordChange}
              value={confirmPassword}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.resetButton, isLoading && styles.resetButtonDisabled]} 
            onPress={handleReset}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.resetButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('./login')}
            disabled={isLoading}
            style={styles.linkButton}
          >
            <Text style={[styles.linkText, isLoading && styles.linkTextDisabled]}>
              ← Back to Login
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#342949',
    padding: 15,
  },
  container: {
    flexGrow: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  scrollView: {
    backgroundColor: '#342949',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  image: {
    width: 250,
    height: 200,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#8D8BA7',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginLeft: 5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: '100%',
    height: 50,
  },
  inputBoxError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 10,
  },
  resetButton: {
    backgroundColor: '#A78BFA',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
    minHeight: 48,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  resetButtonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  linkTextDisabled: {
    color: '#9e9e9e',
  },
});
