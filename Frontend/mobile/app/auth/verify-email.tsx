// app/components/auth/verify-email.tsx
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { validateTokenField } from '../utils/validation';
import { AUTH_MESSAGES } from '../constants/messages';

export default function VerifyEmailScreen() {
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const { verifyEmail, isLoading, error, clearError } = useAuth();

  const handleVerifyEmail = async () => {
    const tokenValidation = validateTokenField(token);
    if (!tokenValidation.isValid) {
      setTokenError(tokenValidation.message || 'Invalid token');
      return;
    }

    try {
      await verifyEmail({ token: token.trim() });
      router.push('./email-verified');
    } catch {
      Alert.alert(
        '❌ Verification Failed',
        error?.message || AUTH_MESSAGES.EMAIL_VERIFICATION_FAILED,
        [
          { text: 'Try Again', style: 'default' },
          { text: 'Back to Register', onPress: () => router.push('./register') },
        ]
      );
    }
  };

  const handleTokenChange = (text: string) => {
    setToken(text);
    if (tokenError) setTokenError(null);
    if (error) clearError();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>
            <Text style={styles.titleWhite}>Verify Your </Text>
            <Text style={styles.titlePurple}>Email</Text>
          </Text>

          <Image
            source={require('../../assets/images/myemail.png.png')}
            style={styles.image}
            resizeMode="contain"
          />

          <Text style={styles.subtitle}>
            Enter the verification token sent to your email. This helps us ensure your identity.
          </Text>

          {(error || tokenError) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{tokenError || error?.message}</Text>
            </View>
          )}

          <View style={[styles.inputWrapper, tokenError && styles.inputWrapperError]}>
            <MaterialIcons name="vpn-key" size={22} color="#8D8BA7" style={styles.icon} />
            <TextInput
              placeholder="Verification Token"
              placeholderTextColor="#8D8BA7"
              onChangeText={handleTokenChange}
              value={token}
              style={styles.input}
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>
<TouchableOpacity 
  style={[
    styles.verifyButton, 
    isLoading && styles.verifyButtonDisabled
  ]} 
  onPress={handleVerifyEmail}
  disabled={isLoading}
>
  {isLoading ? (
    <ActivityIndicator color="#fff" size="small" />
  ) : (
    <Text style={styles.verifyButtonText}>Verify Email</Text>
  )}
</TouchableOpacity>


          <TouchableOpacity
            onPress={() => router.push('./login')}
            disabled={isLoading}
            style={styles.linkButton}
          >
            <Text
              style={[
                styles.linkText,
                isLoading && styles.linkTextDisabled,
              ]}
            >
              ← Back to Login
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#342949',
  },
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    marginTop: 40,
    fontSize: 29,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: -50,
  },
  titleWhite: {
    color: '#FFFFFF',
  },
  titlePurple: {
    color: '#B8A8E6',
  },
  image: {
    width: 500,
    height: 500,
    // marginVertical: 20,
    marginBottom: -20,
    marginTop: -40,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 5,
    color: '#8D8BA7',
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
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 30,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    height: 50,
    width: '100%',
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
    fontSize: 16,
    color: '#FFFFFF',
  },
  verifyButton: {
    backgroundColor: '#A78BFA',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 48,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  verifyButtonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  verifyButtonText: {
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
