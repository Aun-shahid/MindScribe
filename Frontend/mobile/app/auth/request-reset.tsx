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
import { AUTH_MESSAGES } from '../constants/messages';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

export default function RequestResetScreen() {
  const [email, setEmail]           = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ── Responsive tokens (all clamp — zero fixed px) ─────────────────────────
  const topPad        = insets.top + clamp(height * 0.1, 58, 110);
  const bottomPad     = clamp(insets.bottom + height * 0.06, 40, 58);
  const hPad          = clamp(width * 0.06, 20, 28);
  const kvOffset      = Platform.OS === 'ios' ? insets.top + 8 : 0;

  const titleSize     = clamp(width * 0.088, 28, 38);
  const titleLineH    = Math.round(titleSize * 1.08);
  const titleMB       = clamp(height * 0.018, 10, 18);

  const imageW        = clamp(width * 0.88, 240, 320);
  const imageH        = clamp(height * 0.28, 170, 240);
  const imageMT       = clamp(height * 0.004, 2, 5);
  const imageMB       = clamp(height * 0.016, 9, 14);

  const subtitleSize  = clamp(width * 0.038, 13, 16);
  const subtitleMB    = clamp(height * 0.022, 14, 22);

  const labelSize     = clamp(width * 0.038, 13, 16);
  const labelMB       = clamp(height * 0.014, 10, 14);
  const labelMT       = clamp(height * 0.012, 7, 12);
  const fieldW        = clamp(width * 0.84, 260, 340);
  const inputH        = clamp(height * 0.062, 42, 52);
  const inputPadX     = clamp(width * 0.028, 9, 13);
  const inputFontSize = clamp(width * 0.038, 13, 15);
  const iconSize      = clamp(width * 0.05, 17, 22);
  const inputRadius   = clamp(width * 0.028, 8, 12);
  const inputMB       = clamp(height * 0.016, 10, 18);

  const btnW          = clamp(width * 0.8, 240, 360);
  const btnPadY       = clamp(height * 0.016, 11, 15);
  const btnTextSize   = clamp(width * 0.048, 16, 21);
  const btnRadius     = clamp(width * 0.036, 10, 14);
  const btnMT         = clamp(height * 0.022, 14, 22);

  const linkMT        = clamp(height * 0.022, 14, 20);
  const linkSize      = clamp(width * 0.036, 12, 14);
  const arrowSize     = clamp(width * 0.042, 14, 17);

  const circleOneSize = clamp(width * 0.3, 90, 120);
  const circleTwoSize = clamp(width * 0.35, 110, 140);

  const { requestPasswordReset, isLoading, error, clearError } = useAuth();

  const handleResetRequest = async () => {
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
    if (emailError) setEmailError(null);
    if (error) clearError();
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={kvOffset}
        style={{ flex: 1 }}
      >
        {/* Decorative circles */}
        <View style={[styles.circleContainer, { top: -circleOneSize * 0.5, right: -circleOneSize * 0.5 }]}>
          <View style={[styles.circle1, {
            width: circleOneSize, height: circleOneSize,
            borderRadius: circleOneSize / 2, marginTop: circleOneSize * 0.42,
          }]} />
          <View style={[styles.circle2, {
            width: circleTwoSize, height: circleTwoSize,
            borderRadius: circleTwoSize / 2, top: circleTwoSize * 0.29, right: circleTwoSize * 0.29,
          }]} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.container, {
            paddingTop: topPad,
            paddingHorizontal: hPad,
            paddingBottom: bottomPad,
          }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          bounces={false}
          overScrollMode="never"
        >
          {/* Two-colour heading */}
          <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleLineH, marginBottom: titleMB }]}>
            <Text style={styles.titleWhite}>Forgot </Text>
            <Text style={styles.titlePurple}>Password</Text>
          </Text>

          {/* Image */}
          <Image
            source={require('../../assets/images/forgotpass.png')}
            style={{ width: imageW, height: imageH, marginTop: imageMT, marginBottom: imageMB }}
            resizeMode="contain"
          />

          {/* Subtitle */}
          <Text style={[styles.subtitle, { fontSize: subtitleSize, marginBottom: subtitleMB }]}>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </Text>

          {/* Error */}
          {(error || emailError) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{emailError || error?.message}</Text>
            </View>
          )}

          {/* Email label + input */}
          <Text style={[styles.label, { fontSize: labelSize, width: fieldW, marginBottom: labelMB, marginTop: labelMT }]}>
            Email address
          </Text>
          <View style={[styles.inputWrapper, {
            maxWidth: fieldW, height: inputH,
            borderRadius: inputRadius, paddingHorizontal: inputPadX,
            marginBottom: inputMB,
          }, emailError && styles.inputWrapperError]}>
            <MaterialIcons name="email" size={iconSize} color="#8D8BA7" style={{ marginRight: clamp(width * 0.02, 6, 9) }} />
            <TextInput
              placeholder="your@email.com"
              placeholderTextColor="#8D8BA7"
              style={[styles.input, { fontSize: inputFontSize }]}
              onChangeText={handleEmailChange}
              value={email}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          {/* Send button */}
          <TouchableOpacity
            style={[styles.resetButton, {
              width: btnW, paddingVertical: btnPadY,
              borderRadius: btnRadius, marginTop: btnMT,
            }, isLoading && styles.resetButtonDisabled]}
            onPress={handleResetRequest}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[styles.resetButtonText, { fontSize: btnTextSize }]}>Send Reset Email</Text>
            }
          </TouchableOpacity>

          {/* Professional back-to-login link */}
          <TouchableOpacity
            onPress={() => router.push('./login')}
            disabled={isLoading}
            style={[styles.backLink, { marginTop: linkMT }]}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={arrowSize}
              color={isLoading ? '#9e9e9e' : '#A78BFA'}
              style={{ marginRight: clamp(width * 0.016, 5, 8) }}
            />
            <Text style={[styles.backLinkText, { fontSize: linkSize }, isLoading && styles.linkTextDisabled]}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper:      { flex: 1, backgroundColor: '#342949' },
  scrollView:   { backgroundColor: '#342949' },
  container:    { justifyContent: 'flex-start', alignItems: 'center', flexGrow: 1 },

  circleContainer: { position: 'absolute', zIndex: 1 },
  circle1: { backgroundColor: 'rgba(133,130,180,0.2)', opacity: 0.8, position: 'absolute', top: 0, right: 0 },
  circle2: { backgroundColor: 'rgba(133,130,180,0.25)', opacity: 0.6, position: 'absolute' },

  title:       { fontWeight: '700', textAlign: 'center' },
  titleWhite:  { color: '#FFFFFF' },
  titlePurple: { color: '#B8A8E6' },

  subtitle: { color: '#8D8BA7', textAlign: 'center', paddingHorizontal: 10 },

  errorContainer: {
    backgroundColor: '#ffebee', padding: 12, borderRadius: 8,
    borderLeftWidth: 4, borderLeftColor: '#f44336', marginBottom: 14, width: '100%',
  },
  errorText: { color: '#c62828', fontSize: 14, textAlign: 'center' },

  label: { color: '#FFFFFF', fontWeight: '600', alignSelf: 'center' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)', width: '100%',
  },
  inputWrapperError: { borderColor: '#f44336', borderWidth: 2 },
  input: { flex: 1, color: '#FFFFFF' },

  resetButton: {
    backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 4,
  },
  resetButtonDisabled: { backgroundColor: '#9e9e9e' },
  resetButtonText: { color: '#fff', fontWeight: '700' },

  // Professional back link — icon + text, purple tinted, pill container
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.28)',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backLinkText: {
    color: '#A78BFA',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  linkTextDisabled: { color: '#9e9e9e' },
});
