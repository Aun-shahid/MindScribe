
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
// import { validateEmailField } from '../utils/validation';
import { AUTH_MESSAGES } from '../constants/messages';
import { useTheme } from '../contexts/ThemeContext';

export default function RequestResetScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const { requestPasswordReset, isLoading, error, clearError } = useAuth();
  const { theme, themeStyle, toggleTheme } = useTheme();
  const handleResetRequest = async () => {
    // Validate email
    // const emailValidation = validateEmailField(email);
    // if (!emailValidation.isValid) {
    //   setEmailError(emailValidation.message || 'Invalid email');
    //   return;
    // }

    // Simple validation - just check if email is not empty
    if (!email.trim()) {
      setEmailError('Please enter your email address');
      return;
    }

    try {
      await requestPasswordReset({ email: email.trim() });
      Alert.alert(
        '📧 Email Sent', 
        AUTH_MESSAGES.EMAIL_SENT,
        [{ text: 'OK', onPress: () => router.push('./login') }]
      );
    } catch (err) {
      Alert.alert('❌ Failed', error?.message || AUTH_MESSAGES.EMAIL_SEND_FAILED);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) {
      setEmailError(null);
    }
    if (error) {
      clearError();
    }
  };

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: themeStyle.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: themeStyle.title }]}>Forgot Your Password?</Text>

          <Image
            style={styles.img}
            source={require('../../assets/images/Forgot.png')}
            resizeMode="contain"
          />
          
         <Text style={[styles.subtitle, { color: themeStyle.text }]}>
  Enter your email address and we will send you a link to reset your password.
</Text>


          {(error || emailError) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{emailError || error?.message}</Text>
            </View>
          )}

          <View style={[styles.inputWrapper, emailError && styles.inputWrapperError]}>
            <MaterialIcons name="email" size={20} color="#524f85" style={styles.icon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#999"
              style={styles.input}
              onChangeText={handleEmailChange}
              value={email}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

         <TouchableOpacity 
  style={[
    styles.resetButton, 
    { backgroundColor: themeStyle.button }, 
    isLoading && styles.resetButtonDisabled
  ]} 
  onPress={handleResetRequest}
  disabled={isLoading}
>
  {isLoading ? (
    <ActivityIndicator  size="small" />
  ) : (
    <Text style={styles.resetButtonText}>Send Reset Email</Text>
  )}
</TouchableOpacity>


          <TouchableOpacity 
            onPress={() => router.push('./login')}
            disabled={isLoading}
          >
            <Text style={[styles.linkText, { color: themeStyle.text }, isLoading && styles.linkTextDisabled]}>
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
    //backgroundColor: '#ffffff',
    padding: 15,
  },
  container: {
    paddingTop: 70,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    width: 250,
    height: 180,
    marginBottom: 20,
  },
  img: {
    width: 300,
    height: 500,
    marginBottom: -50,
    marginTop: -50,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#524f85',
    textAlign: 'center',
    // marginBottom: 30,
  },
  subtitle: {
    fontSize: 17,
    // color: '#666',
    textAlign: 'center',
    marginBottom: 24,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    width: '100%',
    height: 50,
  },
  inputWrapperError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: '#333',
  },
  resetButton: {
    // backgroundColor: '#524f85',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
    minHeight: 48,
  },
  resetButtonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  linkText: {
    marginTop: 24,
    color: '#524f85',
    fontSize: 16,
    textAlign: 'center',
  },
  linkTextDisabled: {
    color: '#9e9e9e',
  },
});