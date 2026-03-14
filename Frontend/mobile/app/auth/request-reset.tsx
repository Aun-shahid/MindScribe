
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
  useWindowDimensions,
} from 'react-native';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
// import { validateEmailField } from '../utils/validation';
import { AUTH_MESSAGES } from '../constants/messages';

export default function RequestResetScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headingSize = Math.max(30, Math.min(width * 0.09, 38));
  const subtitleSize = Math.max(14, Math.min(width * 0.042, 16));
  const inputFontSize = Math.max(14, Math.min(width * 0.039, 15));
  const labelFontSize = Math.max(15, Math.min(width * 0.043, 16));
  const linkFontSize = Math.max(13, Math.min(width * 0.038, 14));
  const imageWidth = Math.min(width * 0.88, 300);
  const imageHeight = Math.min(height * 0.28, 240);
  const circleOneSize = Math.min(width * 0.3, 120);
  const circleTwoSize = Math.min(width * 0.35, 140);
  const fieldWidth = Math.min(width * 0.84, 320);
  const buttonWidth = Math.min(width * 0.8, 340);
  const buttonVerticalPadding = Math.max(11, Math.min(height * 0.016, 14));
  const buttonTextSize = Math.max(18, Math.min(width * 0.05, 21));
  const bottomSafeGap = Math.max(insets.bottom + 42, 54);
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + 8 : 0;
  const { requestPasswordReset, isLoading, error, clearError } = useAuth();
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
        'Reset Email Sent',
        'A password reset link has been sent to your email address. Please check your inbox and spam folder.',
        [{ text: 'OK', onPress: () => router.push('./login') }]
      );
    } catch {
      Alert.alert('Request Failed', error?.message || AUTH_MESSAGES.EMAIL_SEND_FAILED);
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
    <SafeAreaView style={styles.wrapper}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={{ flex: 1 }}
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
              paddingTop: insets.top + 14,
              paddingHorizontal: Math.max(20, Math.min(width * 0.06, 28)),
              paddingBottom: bottomSafeGap,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          bounces={false}
          overScrollMode="never"
        >
          <Text style={[styles.title, { fontSize: headingSize, lineHeight: Math.round(headingSize * 1.08) }]}>
            <Text style={styles.titlePrimary}>Forgot </Text>
            <Text style={styles.titleAccent}>Password</Text>
          </Text>

          <Image
            style={[styles.img, { width: imageWidth, height: imageHeight }]}
            source={require('../../assets/images/Forgot.png')}
            resizeMode="contain"
          />
          
         <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Enter your email address and we will send you a link to reset your password.</Text>


          {(error || emailError) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{emailError || error?.message}</Text>
            </View>
          )}

          <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Email</Text>
          <View style={[styles.inputWrapper, { maxWidth: fieldWidth }, emailError && styles.inputWrapperError]}>
            <MaterialIcons name="email" size={20} color="#8D8BA7" style={styles.icon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#8D8BA7"
              style={[styles.input, { fontSize: inputFontSize }]}
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
    { width: buttonWidth, paddingVertical: buttonVerticalPadding },
    isLoading && styles.resetButtonDisabled
  ]} 
  onPress={handleResetRequest}
  disabled={isLoading}
>
  {isLoading ? (
    <ActivityIndicator  size="small" />
  ) : (
    <Text style={[styles.resetButtonText, { fontSize: buttonTextSize }]}>Send Reset Email</Text>
  )}
</TouchableOpacity>


          <TouchableOpacity 
            onPress={() => router.push('./login')}
            disabled={isLoading}
          >
            <Text style={[styles.linkText, { fontSize: linkFontSize }, isLoading && styles.linkTextDisabled]}>
              Back to Login
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
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
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
  illustration: {
    width: 250,
    height: 180,
    marginBottom: 20,
  },
  img: {
    marginBottom: 10,
    marginTop: 4,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  titlePrimary: {
    color: '#FFFFFF',
  },
  titleAccent: {
    color: '#B8A8E6',
  },
  subtitle: {
    color: '#8D8BA7',
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
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderRadius: 9,
    marginBottom: 16,
    paddingHorizontal: 9,
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: '100%',
    height: 44,
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
  resetButton: {
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
  resetButtonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  linkText: {
    marginTop: 14,
    color: '#D7CFF0',
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  linkTextDisabled: {
    color: '#9e9e9e',
  },
});