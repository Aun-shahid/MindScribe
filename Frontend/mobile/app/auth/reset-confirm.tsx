// app/auth/reset-confirm.tsx
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Image, Platform, KeyboardAvoidingView, SafeAreaView, Alert, ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { validatePasswordField } from '../utils/validation';
import { AUTH_MESSAGES } from '../constants/messages';
import { AuthError } from '../types/auth';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

export default function ResetConfirmScreen() {
  const { token } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [password, setPassword]                         = useState('');
  const [confirmPassword, setConfirmPassword]           = useState('');
  const [passwordError, setPasswordError]               = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword]                 = useState(false);
  const [showConfirmPassword, setShowConfirmPassword]   = useState(false);
  const [successVisible, setSuccessVisible]             = useState(false);

  const { confirmPasswordReset, isLoading, error, clearError } = useAuth();

  // ── Responsive tokens ─────────────────────────────────────────────────────
  const hPad          = clamp(width * 0.06, 20, 28);
  const topPad        = insets.top + clamp(height * 0.012, 6, 12);
  const bottomPad     = clamp(insets.bottom + height * 0.05, 32, 52);
  const kvOffset      = Platform.OS === 'ios' ? insets.top + 8 : 0;

  const titleSize     = clamp(width * 0.07, 24, 32);
  const titleMB       = clamp(height * 0.022, 14, 22);

  const imageW        = clamp(width * 0.82, 240, 380);
  const imageH        = clamp(height * 0.34, 200, 290);
  const imageMB       = clamp(height * 0.008, 4, 8);

  const subtitleSize  = clamp(width * 0.038, 13, 16);
  const subtitleMB    = clamp(height * 0.018, 10, 16);

  const labelSize     = clamp(width * 0.038, 13, 16);
  const labelMB       = clamp(height * 0.008, 5, 8);
  const inputMB       = clamp(height * 0.022, 14, 22);
  const inputH        = clamp(height * 0.065, 46, 56);
  const inputPadX     = clamp(width * 0.032, 10, 14);
  const inputFontSize = clamp(width * 0.038, 13, 16);
  const iconSize      = clamp(width * 0.048, 17, 22);
  const inputRadius   = clamp(width * 0.032, 10, 14);

  const btnPadY       = clamp(height * 0.018, 13, 17);
  const btnTextSize   = clamp(width * 0.048, 16, 20);
  const btnRadius     = clamp(width * 0.038, 12, 16);
  const btnMT         = clamp(height * 0.022, 14, 22);
  const linkMT        = clamp(height * 0.022, 14, 20);
  const linkSize      = clamp(width * 0.038, 13, 16);
  const linkPillPadX  = clamp(width * 0.05, 16, 22);
  const linkIconSize  = clamp(width * 0.042, 14, 17);

  // ── Logic from Code 1 ─────────────────────────────────────────────────────
  const handleReset = async () => {
    const passwordValidation = validatePasswordField(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.message || 'Invalid password');
      return;
    }
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
        new_password: password,
      });
      setSuccessVisible(true);
    } catch (err) {
      const authError = err as AuthError;
      Alert.alert('❌ Error', authError?.message || error?.message || 'Error resetting password');
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError(null);
    if (error) clearError();
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (confirmPasswordError) setConfirmPasswordError(null);
    if (error) clearError();
  };

  const displayError = passwordError || confirmPasswordError || error?.message;

  // ── UI from Code 2 ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.wrapper}>
      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <FontAwesome name="check" size={26} color="#1F2937" />
            </View>
            <Text style={styles.successTitle}>Password updated</Text>
            <Text style={styles.successText}>{AUTH_MESSAGES.PASSWORD_RESET_SUCCESS}</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setSuccessVisible(false);
                router.replace('./login');
              }}
            >
              <Text style={styles.successButtonText}>Continue to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={kvOffset}
        style={{ flex: 1 }}
      >
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
          {/* Title */}
          <Text style={[styles.title, { fontSize: titleSize, marginBottom: titleMB }]}>
            <Text style={{ color: '#FFFFFF' }}>Reset Your </Text>
            <Text style={{ color: '#B8A8E6' }}>Password</Text>
          </Text>

          {/* Image */}
          <Image
            source={require('../../assets/images/request2.png')}
            style={{ width: imageW, height: imageH, marginBottom: imageMB }}
            resizeMode="contain"
          />

          {/* Subtitle */}
          <Text style={[styles.subtitle, { fontSize: subtitleSize, marginBottom: subtitleMB }]}>
            Please choose a new secure password
          </Text>

          {/* Error */}
          {displayError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          {/* New password */}
          <Text style={[styles.inputLabel, { fontSize: labelSize, marginBottom: labelMB }]}>
            Enter new password
          </Text>
          <View style={[styles.inputBox, {
            height: inputH, borderRadius: inputRadius,
            paddingHorizontal: inputPadX, marginBottom: inputMB,
          }, passwordError && styles.inputBoxError]}>
            <Ionicons name="lock-closed-outline" size={iconSize} color="#8D8BA7" />
            <TextInput
              placeholder="New Password"
              placeholderTextColor="#8D8BA7"
              style={[styles.input, { fontSize: inputFontSize }]}
              onChangeText={handlePasswordChange}
              value={password}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((value) => !value)}
              hitSlop={8}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={clamp(width * 0.05, 18, 22)}
                color="#C4B5FD"
              />
            </TouchableOpacity>
          </View>

          {/* Confirm password */}
          <Text style={[styles.inputLabel, { fontSize: labelSize, marginBottom: labelMB }]}>
            Confirm new password
          </Text>
          <View style={[styles.inputBox, {
            height: inputH, borderRadius: inputRadius,
            paddingHorizontal: inputPadX, marginBottom: inputMB,
          }, confirmPasswordError && styles.inputBoxError]}>
            <Ionicons name="lock-closed-outline" size={iconSize} color="#8D8BA7" />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#8D8BA7"
              style={[styles.input, { fontSize: inputFontSize }]}
              onChangeText={handleConfirmPasswordChange}
              value={confirmPassword}
              secureTextEntry={!showConfirmPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((value) => !value)}
              hitSlop={8}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={clamp(width * 0.05, 18, 22)}
                color="#C4B5FD"
              />
            </TouchableOpacity>
          </View>

          {/* Reset button */}
          <TouchableOpacity
            style={[styles.resetButton, {
              paddingVertical: btnPadY,
              borderRadius: btnRadius,
              marginTop: btnMT,
            }, isLoading && styles.resetButtonDisabled]}
            onPress={handleReset}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[styles.resetButtonText, { fontSize: btnTextSize }]}>Reset Password</Text>
            }
          </TouchableOpacity>

          {/* Back to login */}
          <TouchableOpacity
            onPress={() => router.push('./login')}
            disabled={isLoading}
            style={[styles.pillLink, { marginTop: linkMT, paddingHorizontal: linkPillPadX }, isLoading && { opacity: 0.5 }]}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={linkIconSize}
              color="#A78BFA"
              style={{ marginRight: clamp(width * 0.016, 5, 8) }}
            />
            <Text style={[styles.pillLinkText, { fontSize: linkSize }]}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper:             { flex: 1, backgroundColor: '#342949' },
  scrollView:          { backgroundColor: '#342949' },
  container:           { flexGrow: 1, alignItems: 'center' },
  title:               { fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  subtitle:            { color: '#8D8BA7', textAlign: 'center', paddingHorizontal: 10 },
  errorContainer:      {
    backgroundColor: '#ffebee', padding: 12, borderRadius: 8,
    borderLeftWidth: 4, borderLeftColor: '#f44336', marginBottom: 14, width: '100%',
  },
  errorText:           { color: '#c62828', fontSize: 14, textAlign: 'center' },
  inputLabel:          { fontWeight: '600', color: '#FFFFFF', alignSelf: 'flex-start', marginLeft: 4 },
  inputBox:            {
    flexDirection: 'row', alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)', width: '100%',
  },
  inputBoxError:       { borderColor: '#f44336', borderWidth: 2 },
  input:               { flex: 1, color: '#FFFFFF', marginLeft: 10 },
  successOverlay:      {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successCard:         {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    elevation: 12,
  },
  successIconWrap:     {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C4B5FD',
    marginBottom: 16,
  },
  successTitle:        {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  successText:         {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
  },
  successButton:       {
    width: '100%',
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonText:   {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  resetButton:         {
    backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center',
    width: '100%', minHeight: 48,
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14, elevation: 4,
  },
  resetButtonDisabled: { backgroundColor: '#9e9e9e' },
  resetButtonText:     { color: '#fff', fontWeight: '600' },
  pillLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.28)',
    borderRadius: 999,
    paddingVertical: 10,
  },
  pillLinkText: { color: '#A78BFA', fontWeight: '700', letterSpacing: 0.2 },
});
