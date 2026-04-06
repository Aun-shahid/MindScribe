import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { validateRegisterForm, FormValidationErrors } from '../utils/validation';
import { AUTH_MESSAGES } from '../constants/messages';
import { RegisterRequest } from '../types/auth';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
const USERNAME_MAX_LENGTH = 30;
const NAME_MAX_LENGTH = 50;
const EMAIL_MAX_LENGTH = 254;

export default function RegisterScreen() {
  const [role, setRole] = useState<'therapist' | 'patient'>('patient');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<FormValidationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headingSize = Math.max(30, Math.min(width * 0.09, 38));
  const buttonWidth = Math.min(width * 0.8, 340);
  const buttonVerticalPadding = Math.max(11, Math.min(height * 0.016, 14));
  const buttonTextSize = Math.max(18, Math.min(width * 0.05, 21));
  const inputFontSize = Math.max(14, Math.min(width * 0.039, 15));
  const labelFontSize = Math.max(15, Math.min(width * 0.043, 16));
  const linkFontSize = Math.max(13, Math.min(width * 0.038, 14));
  const imageWidth = Math.min(width * 1.08, 420);
  const imageHeight = Math.min(height * 0.42, 360);
  const circleOneSize = Math.min(width * 0.3, 120);
  const circleTwoSize = Math.min(width * 0.35, 140);
  const fieldWidth = Math.min(width * 0.84, 320);
  const bottomSafeGap = Math.max(insets.bottom + 42, 54);
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + 8 : 0;

  // pill link tokens
  const linkIconSize = clamp(width * 0.042, 14, 17);
  const linkPillPadX = clamp(width * 0.05, 16, 22);

  const { register, isLoading, error, clearError } = useAuth();

  const [form, setForm] = useState<RegisterRequest>({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    user_type: 'patient',
    phone_number: '',
    date_of_birth: '',
    license_number: '',
    specialization: '',
  });

  useEffect(() => {
    const loadRole = async () => {
      const savedRole = await AsyncStorage.getItem('selected_role');
      if (savedRole === 'therapist' || savedRole === 'patient') {
        setRole(savedRole);
        setForm((prev) => ({ ...prev, user_type: savedRole }));
      }
    };
    loadRole();
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
    if (validationErrors[key as keyof FormValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [key]: undefined }));
    }
    if (error) clearError();
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event?.type === 'dismissed' || !selectedDate) return;
    }
    if (selectedDate) {
      const isoDate = selectedDate.toISOString().split('T')[0];
      setDate(selectedDate);
      handleChange('date_of_birth', isoDate);
    }
  };

  const openDatePicker = () => {
    const defaultDate = form.date_of_birth ? new Date(`${form.date_of_birth}T00:00:00`) : new Date(2000, 0, 1);
    setDate(defaultDate);
    setShowDatePicker(true);
  };

  const handleRegister = async () => {
    const normalizedForm = {
      ...form,
      email: form.email.trim().toLowerCase(),
    };

    const validation = validateRegisterForm(normalizedForm);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    try {
      await register(normalizedForm);
      Alert.alert(
        'Registration Successful',
        'Your account has been created successfully.\n\nPlease verify your email to continue.',
        [{ text: 'OK', onPress: () => router.push('./verify-email') }]
      );
    } catch (err: any) {
      if (err?.details && typeof err.details === 'object') {
        setValidationErrors(err.details);
      } else {
        Alert.alert('❌ Registration Failed', error?.message || AUTH_MESSAGES.REGISTER_FAILED);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={styles.wrapper}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        bounces={false}
        overScrollMode="never"
      >
        <View
          style={[
            styles.container,
            {
              paddingHorizontal: Math.max(20, Math.min(width * 0.06, 28)),
              paddingTop: insets.top + clamp(height * 0.005, 2, 8),
              paddingBottom: bottomSafeGap,
            },
          ]}
        >
          <View style={[styles.circleContainer, { top: -circleOneSize * 0.5, right: -circleOneSize * 0.5 }]}>
            <View style={[styles.circle1, { width: circleOneSize, height: circleOneSize, borderRadius: circleOneSize / 2, marginTop: circleOneSize * 0.42 }]} />
            <View style={[styles.circle2, { width: circleTwoSize, height: circleTwoSize, borderRadius: circleTwoSize / 2, top: circleTwoSize * 0.29, right: circleTwoSize * 0.29 }]} />
          </View>

          <Image
            style={[styles.img, { width: imageWidth, height: imageHeight }]}
            source={require('../../assets/images/register.png')}
            resizeMode="contain"
          />

          <Text style={[styles.title, { fontSize: headingSize, lineHeight: Math.round(headingSize * 1.08) }]}>
            <Text style={styles.titlePrimary}>Sign </Text>
            <Text style={styles.titleAccent}>Up</Text>
          </Text>
          <Text style={[styles.subtitle, { fontSize: Math.max(14, Math.min(width * 0.042, 16)) }]}>
            {role === 'therapist' ? 'Create your therapist account' : 'Create your patient account'}
          </Text>

          {(error && !Object.keys(validationErrors).length) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          )}

          <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Username</Text>
          <TextInput
            style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.username && styles.inputError]}
            placeholder="Enter your username"
            placeholderTextColor="#8D8BA7"
            onChangeText={(text) => handleChange('username', text)}
            value={form.username}
            maxLength={USERNAME_MAX_LENGTH}
            editable={!isLoading}
          />
          {validationErrors.username && <Text style={styles.fieldErrorText}>{validationErrors.username}</Text>}

          <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Email</Text>
          <TextInput
            style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.email && styles.inputError]}
            placeholder="Enter your email"
            placeholderTextColor="#8D8BA7"
            keyboardType="email-address"
            onChangeText={(text) => handleChange('email', text.toLowerCase())}
            value={form.email}
            maxLength={EMAIL_MAX_LENGTH}
            editable={!isLoading}
            autoCapitalize="none"
          />
          {validationErrors.email && <Text style={styles.fieldErrorText}>{validationErrors.email}</Text>}

          {/* ── Password ── */}
          <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Password</Text>
          <View style={[styles.inputRow, { maxWidth: fieldWidth }, validationErrors.password && styles.inputError]}>
            <TextInput
              style={[styles.inputInner, { fontSize: inputFontSize }]}
              placeholder="Enter password"
              placeholderTextColor="#8D8BA7"
              secureTextEntry={!showPassword}
              onChangeText={(text) => handleChange('password', text)}
              value={form.password}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(prev => !prev)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={18} color="#8D8BA7" />
            </TouchableOpacity>
          </View>
          {validationErrors.password && <Text style={styles.fieldErrorText}>{validationErrors.password}</Text>}

          {/* ── Confirm Password ── */}
          <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Confirm Password</Text>
          <View style={[styles.inputRow, { maxWidth: fieldWidth }, validationErrors.password_confirm && styles.inputError]}>
            <TextInput
              style={[styles.inputInner, { fontSize: inputFontSize }]}
              placeholder="Re-enter password"
              placeholderTextColor="#8D8BA7"
              secureTextEntry={!showConfirmPassword}
              onChangeText={(text) => handleChange('password_confirm', text)}
              value={form.password_confirm}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(prev => !prev)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome name={showConfirmPassword ? 'eye' : 'eye-slash'} size={18} color="#8D8BA7" />
            </TouchableOpacity>
          </View>
          {validationErrors.password_confirm && <Text style={styles.fieldErrorText}>{validationErrors.password_confirm}</Text>}

          <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>First Name</Text>
          <TextInput
            style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.first_name && styles.inputError]}
            placeholder="Enter first name"
            placeholderTextColor="#8D8BA7"
            onChangeText={(text) => handleChange('first_name', text)}
            value={form.first_name}
            maxLength={NAME_MAX_LENGTH}
            editable={!isLoading}
          />
          {validationErrors.first_name && <Text style={styles.fieldErrorText}>{validationErrors.first_name}</Text>}

          <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Last Name</Text>
          <TextInput
            style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.last_name && styles.inputError]}
            placeholder="Enter last name"
            placeholderTextColor="#8D8BA7"
            onChangeText={(text) => handleChange('last_name', text)}
            value={form.last_name}
            maxLength={NAME_MAX_LENGTH}
            editable={!isLoading}
          />
          {validationErrors.last_name && <Text style={styles.fieldErrorText}>{validationErrors.last_name}</Text>}

          {role === 'therapist' && (
            <>
              <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>License Number</Text>
              <TextInput
                style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.license_number && styles.inputError]}
                placeholder="Enter license number"
                placeholderTextColor="#8D8BA7"
                onChangeText={(text) => handleChange('license_number', text)}
                value={form.license_number}
                editable={!isLoading}
              />
              {validationErrors.license_number && <Text style={styles.fieldErrorText}>{validationErrors.license_number}</Text>}

              <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Specialization</Text>
              <TextInput
                style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.specialization && styles.inputError]}
                placeholder="e.g., Depression, Anxiety"
                placeholderTextColor="#8D8BA7"
                onChangeText={(text) => handleChange('specialization', text)}
                value={form.specialization}
                editable={!isLoading}
              />
              {validationErrors.specialization && <Text style={styles.fieldErrorText}>{validationErrors.specialization}</Text>}
            </>
          )}

          <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.phone_number && styles.inputError]}
            placeholder="03xxxxxxxxx"
            placeholderTextColor="#8D8BA7"
            keyboardType="number-pad"
            maxLength={11}
            onChangeText={(text) => handleChange('phone_number', text.replace(/\D/g, '').slice(0, 11))}
            value={form.phone_number}
            editable={!isLoading}
          />
          {validationErrors.phone_number && <Text style={styles.fieldErrorText}>{validationErrors.phone_number}</Text>}

          <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Date of Birth</Text>
          <TouchableOpacity
            style={[styles.input, { minHeight: 44, maxWidth: fieldWidth }, validationErrors.date_of_birth && styles.inputError]}
            onPress={() => !isLoading && openDatePicker()}
            disabled={isLoading}
          >
            <Text style={{ color: form.date_of_birth ? '#FFFFFF' : '#8D8BA7' }}>
              {form.date_of_birth || 'YYYY-MM-DD'}
            </Text>
          </TouchableOpacity>
          {validationErrors.date_of_birth && <Text style={styles.fieldErrorText}>{validationErrors.date_of_birth}</Text>}

          {showDatePicker && (
            <View style={[styles.datePickerWrap, { width: fieldWidth }]}>
              <DateTimePicker
                value={date || new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.dateActionsRow}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.dateActionBtn} disabled={isLoading}>
                    <Text style={styles.dateActionText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} style={[styles.dateActionBtn, styles.dateActionBtnPrimary]} disabled={isLoading}>
                    <Text style={[styles.dateActionText, styles.dateActionTextPrimary]}>Done ✓</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { width: buttonWidth, paddingVertical: buttonVerticalPadding }, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={[styles.buttonText, { fontSize: buttonTextSize }]}>Register</Text>
            }
          </TouchableOpacity>

          {/* ── Pill-style link ── */}
          <TouchableOpacity
            onPress={() => !isLoading && router.push('./login')}
            disabled={isLoading}
            style={[styles.pillLink, { paddingHorizontal: linkPillPadX, marginTop: clamp(height * 0.022, 14, 20) }, isLoading && { opacity: 0.5 }]}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="login"
              size={linkIconSize}
              color="#A78BFA"
              style={{ marginRight: clamp(width * 0.016, 5, 8) }}
            />
            <Text style={[styles.pillLinkText, { fontSize: linkFontSize }]}>
              Already have an account? Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollView:   { backgroundColor: '#342949' },
  scrollContent:{ flexGrow: 1 },
  wrapper:      { flex: 1, backgroundColor: '#342949' },
  container:    { flexGrow: 1, justifyContent: 'flex-start', alignItems: 'center' },
  title:        { fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  titlePrimary: { color: '#FFFFFF' },
  titleAccent:  { color: '#B8A8E6' },
  subtitle:     { color: '#8D8BA7', textAlign: 'center', marginBottom: 22 },
  errorContainer: {
    backgroundColor: '#ffebee', padding: 12, borderRadius: 8,
    borderLeftWidth: 4, borderLeftColor: '#f44336', marginBottom: 16,
  },
  errorText:      { color: '#c62828', fontSize: 14, textAlign: 'center' },
  label:          { color: '#FFFFFF', marginBottom: 5, marginTop: 10, fontWeight: '500', textAlign: 'left', alignSelf: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 9,
    paddingHorizontal: 12, paddingVertical: 11,
    borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
    color: '#FFFFFF', width: '100%', alignSelf: 'center',
  },
  // ── Row wrapper for password fields with eye icon ──
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    width: '100%',
    alignSelf: 'center',
    marginBottom: 0,
  },
  inputInner: {
    flex: 1,
    color: '#FFFFFF',
    height: 22,
    padding: 0,
  },
  inputError:     { borderColor: '#f44336', borderWidth: 2 },
  fieldErrorText: { color: '#f44336', fontSize: 12, marginTop: 4, width: '100%', maxWidth: 320, alignSelf: 'center', textAlign: 'left' },
  img:            { marginBottom: -14 },
  button: {
    backgroundColor: '#A78BFA', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 22, minHeight: 48,
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14, elevation: 4,
  },
  buttonDisabled: { backgroundColor: '#9e9e9e' },
  buttonText:     { color: '#FFFFFF', fontWeight: '600' },
  datePickerWrap: {
    marginTop: 8, marginBottom: 10, borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dateActionsRow:       { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 10, paddingBottom: 10 },
  dateActionBtn:        { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.04)' },
  dateActionBtnPrimary: { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
  dateActionText:       { color: '#E7DDF8', fontWeight: '700' },
  dateActionTextPrimary:{ color: '#FFFFFF' },
  circleContainer:      { position: 'absolute', top: -60, right: -60, zIndex: 1 },
  circle1: {
    width: 120, height: 120, borderRadius: 100,
    backgroundColor: 'rgba(133,130,180,0.2)', opacity: 0.8,
    position: 'absolute', top: 0, marginTop: 50, right: 0,
  },
  circle2: {
    width: 140, height: 140, borderRadius: 100,
    backgroundColor: 'rgba(133,130,180,0.25)', opacity: 0.6,
    position: 'absolute', top: 40, right: 40,
  },

  // ── Pill link ─────────────────────────────────────────────────────────────
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
