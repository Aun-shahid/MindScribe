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
  useWindowDimensions,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { validateTokenField } from '../utils/validation';
import { AUTH_MESSAGES } from '../constants/messages';

export default function VerifyEmailScreen() {
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headingSize = Math.max(30, Math.min(width * 0.09, 38));
  const subtitleSize = Math.max(14, Math.min(width * 0.042, 16));
  const inputFontSize = Math.max(14, Math.min(width * 0.039, 15));
  const labelFontSize = Math.max(15, Math.min(width * 0.043, 16));
  const linkFontSize = Math.max(13, Math.min(width * 0.038, 14));
  const imageWidth = Math.min(width * 1.08, 420);
  const imageHeight = Math.min(height * 0.42, 360);
  const fieldWidth = Math.min(width * 0.84, 320);
  const buttonWidth = Math.min(width * 0.8, 340);
  const buttonVerticalPadding = Math.max(11, Math.min(height * 0.016, 14));
  const buttonTextSize = Math.max(18, Math.min(width * 0.05, 21));
  const bottomSafeGap = Math.max(insets.bottom + 42, 54);
  const circleOneSize = Math.min(width * 0.3, 120);
  const circleTwoSize = Math.min(width * 0.35, 140);
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + 8 : 0;
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={styles.flex}
      >
        <View style={[styles.circleContainer, { top: -circleOneSize * 0.5, right: -circleOneSize * 0.5 }]}> 
          <View style={[styles.circle1, { width: circleOneSize, height: circleOneSize, borderRadius: circleOneSize / 2, marginTop: circleOneSize * 0.42 }]} />
          <View style={[styles.circle2, { width: circleTwoSize, height: circleTwoSize, borderRadius: circleTwoSize / 2, top: circleTwoSize * 0.29, right: circleTwoSize * 0.29 }]} />
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.container,
            {
              paddingHorizontal: Math.max(20, Math.min(width * 0.06, 28)),
              paddingTop: insets.top + 42,
              paddingBottom: bottomSafeGap,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          bounces={false}
          overScrollMode="never"
        >
          <Text style={[styles.title, { fontSize: headingSize, lineHeight: Math.round(headingSize * 1.08) }]}>
            <Text style={styles.titleWhite}>Verify Your </Text>
            <Text style={styles.titlePurple}>Email</Text>
          </Text>

          <Image
            source={require('../../assets/images/myemail.png.png')}
            style={[styles.image, { width: imageWidth, height: imageHeight }]}
            resizeMode="contain"
          />

          <Text style={[styles.subtitle, { fontSize: subtitleSize }]}> 
            Enter the verification token sent to your email. This helps us ensure your identity.
          </Text>

          {(error || tokenError) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{tokenError || error?.message}</Text>
            </View>
          )}

          <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Verification Token</Text>
          <View style={[styles.inputWrapper, { maxWidth: fieldWidth }, tokenError && styles.inputWrapperError]}>
            <MaterialIcons name="vpn-key" size={22} color="#8D8BA7" style={styles.icon} />
            <TextInput
              placeholder="Verification Token"
              placeholderTextColor="#8D8BA7"
              onChangeText={handleTokenChange}
              value={token}
              style={[styles.input, { fontSize: inputFontSize }]}
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>
<TouchableOpacity 
  style={[
    styles.verifyButton,
    { width: buttonWidth, paddingVertical: buttonVerticalPadding },
    isLoading && styles.verifyButtonDisabled
  ]} 
  onPress={handleVerifyEmail}
  disabled={isLoading}
>
  {isLoading ? (
    <ActivityIndicator color="#fff" size="small" />
  ) : (
    <Text style={[styles.verifyButtonText, { fontSize: buttonTextSize }]}>Verify Email</Text>
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
                { fontSize: linkFontSize },
                isLoading && styles.linkTextDisabled,
              ]}
            >
              Back to Login
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
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  scrollView: {
    backgroundColor: '#342949',
  },
  circleContainer: {
    position: 'absolute',
    zIndex: 1,
  },
  circle1: {
    backgroundColor: 'rgba(133, 130, 180, 0.2)',
    opacity: 0.8,
    position: 'absolute',
    top: 0,
    right: 0,
  },
  circle2: {
    backgroundColor: 'rgba(133, 130, 180, 0.25)',
    opacity: 0.6,
    position: 'absolute',
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleWhite: {
    color: '#FFFFFF',
  },
  titlePurple: {
    color: '#B8A8E6',
  },
  image: {
    marginBottom: 8,
    marginTop: -2,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
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
    borderRadius: 9,
    marginBottom: 16,
    paddingHorizontal: 9,
    backgroundColor: 'rgba(255,255,255,0.05)',
    height: 44,
    width: '100%',
  },
  inputWrapperError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  label: {
    color: '#FFFFFF',
    marginBottom: 5,
    marginTop: 10,
    fontWeight: '500',
    textAlign: 'left',
    alignSelf: 'center',
  },
  icon: {
    marginRight: 7,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
  },
  verifyButton: {
    backgroundColor: '#A78BFA',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 48,
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
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkText: {
    color: '#D7CFF0',
    textDecorationLine: 'underline',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  linkTextDisabled: {
    color: '#9e9e9e',
  },
});
