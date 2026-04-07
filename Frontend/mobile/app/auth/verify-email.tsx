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
import { useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { AUTH_MESSAGES } from '../constants/messages';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

export default function VerifyEmailScreen() {
  const [digits, setDigits]           = useState(['', '', '', '', '', '']);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([null, null, null, null, null, null]);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // ── Responsive tokens ─────────────────────────────────────────────────────
  const topPad           = insets.top + clamp(height * 0.075, 44, 88);
  const bottomPad        = clamp(insets.bottom + height * 0.06, 40, 58);
  const hPad             = clamp(width * 0.06, 20, 28);

  const headingSize      = clamp(width * 0.088, 28, 38);
  const headingLineH     = Math.round(headingSize * 1.08);
  const headingMB        = clamp(height * 0.018, 10, 18);

  const imageW           = clamp(width * 0.88, 240, 320);
  const imageH           = clamp(height * 0.28, 170, 240);
  const imageMT          = clamp(height * 0.004, 2, 5);
  const imageMB          = clamp(height * 0.016, 9, 14);

  const subtitleSize     = clamp(width * 0.038, 13, 15);
  const subtitleMB       = clamp(height * 0.022, 14, 22);

  const boxGap           = clamp(width * 0.02, 6, 9);
  const boxSize          = clamp((width - hPad * 2 - boxGap * 5) / 6, 34, 40);
  const boxFontSize      = clamp(boxSize * 0.44, 15, 20);
  const boxRadius        = clamp(boxSize * 0.22, 8, 12);
  const otpMT            = clamp(height * 0.01, 5, 8);
  const otpMB            = clamp(height * 0.022, 14, 20);

  const btnW             = clamp(width * 0.8, 240, 320);
  const btnPadY          = clamp(height * 0.016, 12, 16);
  const btnTextSize      = clamp(width * 0.047, 16, 20);
  const btnRadius        = clamp(width * 0.04, 12, 16);
  const btnMT            = clamp(height * 0.022, 14, 20);
  const linkMT           = clamp(height * 0.022, 14, 20);
  const linkSize         = clamp(width * 0.035, 12, 14);
  const arrowSize        = clamp(width * 0.042, 14, 17);

  const circleOneSize    = clamp(width * 0.3, 90, 120);
  const circleTwoSize    = clamp(width * 0.35, 110, 140);
  const kvOffset         = Platform.OS === 'ios' ? insets.top + 8 : 0;

  const { verifyEmail, isLoading, error, clearError } = useAuth();
  const code = digits.join('');

  const handleDigitChange = (text: string, index: number) => {
    if (submitError) setSubmitError(null);
    if (error) clearError();

    if (text.length === 6 && index === 0) {
      const pasted = text.replace(/\D/g, '').slice(0, 6);
      if (pasted.length === 6) {
        setDigits(pasted.split(''));
        inputRefs.current[5]?.focus();
        return;
      }
    }

    const digit = text.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyEmail = async () => {
    if (code.length !== 6) {
      setSubmitError('Please enter the complete 6-digit code');
      return;
    }
    try {
      await verifyEmail({ code });
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

  const displayError = submitError || error?.message;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={kvOffset}
        style={styles.flex}
      >
        {/* Decorative circles */}
        <View style={[styles.circleContainer, { top: -circleOneSize * 0.5, right: -circleOneSize * 0.5 }]}>
          <View style={[styles.circle1, {
            width: circleOneSize, height: circleOneSize,
            borderRadius: circleOneSize / 2,
            marginTop: circleOneSize * 0.42,
          }]} />
          <View style={[styles.circle2, {
            width: circleTwoSize, height: circleTwoSize,
            borderRadius: circleTwoSize / 2,
            top: circleTwoSize * 0.29, right: circleTwoSize * 0.29,
          }]} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.container, {
            paddingHorizontal: hPad,
            paddingTop: topPad,
            paddingBottom: bottomPad,
          }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          bounces={false}
          overScrollMode="never"
        >
          {/* Heading */}
          <Text style={[styles.title, { fontSize: headingSize, lineHeight: headingLineH, marginBottom: headingMB }]}>
            <Text style={styles.titleWhite}>Verify Your </Text>
            <Text style={styles.titlePurple}>Email</Text>
          </Text>

          {/* Image */}
          <Image
            source={require('../../assets/images/verifyemail2.png')}
            style={[styles.image, { width: imageW, height: imageH, marginTop: imageMT, marginBottom: imageMB }]}
            resizeMode="contain"
          />

          {/* Subtitle */}
          <Text style={[styles.subtitle, { fontSize: subtitleSize, marginBottom: subtitleMB }]}>
            Enter the 6-digit code sent to your email address.
          </Text>

          {/* Error */}
          {displayError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          {/* OTP boxes */}
          <View style={[styles.otpRow, { gap: boxGap, marginTop: otpMT, marginBottom: otpMB }]}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[styles.digitBox, {
                  width: boxSize,
                  height: boxSize + clamp(height * 0.005, 2, 6),
                  fontSize: boxFontSize,
                  borderRadius: boxRadius,
                  borderColor: digit
                    ? '#A78BFA'
                    : displayError
                    ? '#f44336'
                    : 'rgba(255,255,255,0.25)',
                  borderWidth: digit ? 2 : 1,
                }]}
                value={digit}
                onChangeText={(text) => handleDigitChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={index === 0 ? 6 : 1}
                selectTextOnFocus
                editable={!isLoading}
                caretHidden
              />
            ))}
          </View>

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.verifyButton, {
              width: btnW,
              paddingVertical: btnPadY,
              borderRadius: btnRadius,
              marginTop: btnMT,
            }, isLoading && styles.verifyButtonDisabled]}
            onPress={handleVerifyEmail}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[styles.verifyButtonText, { fontSize: btnTextSize }]}>Verify Email</Text>
            }
          </TouchableOpacity>

          {/* Back to login — pill style (only change from original) */}
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
  safe:             { flex: 1, backgroundColor: '#342949' },
  flex:             { flex: 1 },
  scrollView:       { backgroundColor: '#342949' },
  container:        { alignItems: 'center', justifyContent: 'flex-start', flexGrow: 1 },
  circleContainer:  { position: 'absolute', zIndex: 1 },
  circle1:          { backgroundColor: 'rgba(133,130,180,0.2)', opacity: 0.8, position: 'absolute', top: 0, right: 0 },
  circle2:          { backgroundColor: 'rgba(133,130,180,0.25)', opacity: 0.6, position: 'absolute' },
  title:            { fontWeight: '700', textAlign: 'center' },
  titleWhite:       { color: '#FFFFFF' },
  titlePurple:      { color: '#B8A8E6' },
  image:            { alignSelf: 'center' },
  subtitle:         { textAlign: 'center', paddingHorizontal: 10, color: '#8D8BA7' },
  errorContainer:   {
    backgroundColor: '#ffebee', padding: 12, borderRadius: 8,
    borderLeftWidth: 4, borderLeftColor: '#f44336', marginBottom: 14, width: '100%',
  },
  errorText:        { color: '#c62828', fontSize: 14, textAlign: 'center' },
  otpRow:           { flexDirection: 'row', justifyContent: 'center' },
  digitBox:         {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
  },
  verifyButton:     {
    backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14, elevation: 4,
  },
  verifyButtonDisabled: { backgroundColor: '#9e9e9e' },
  verifyButtonText:     { color: '#fff', fontWeight: '600' },
  // ── Only change: pill-style back link ────────────────────────────────────
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
  backLinkText:     { color: '#A78BFA', fontWeight: '700', letterSpacing: 0.2 },
  linkTextDisabled: { color: '#9e9e9e' },
});
