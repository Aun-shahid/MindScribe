
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { validateRegisterForm, FormValidationErrors } from '../utils/validation';
import { AUTH_MESSAGES } from '../constants/messages';
import { RegisterRequest } from '../types/auth';

export default function RegisterScreen() {
  const [role, setRole] = useState<'therapist' | 'patient'>('patient');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<FormValidationErrors>({});
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
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[key as keyof FormValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [key]: undefined }));
    }
    
    // Clear general error
    if (error) {
      clearError();
    }
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event?.type !== 'set' || !selectedDate) {
        return;
      }
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
    // Validate form
    const validation = validateRegisterForm(form);
    console.log('[RegisterScreen] Form data:', form);
    console.log('[RegisterScreen] Validation result:', validation);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    try {
      console.log('[RegisterScreen] Calling register...');
      await register(form);
      console.log('[RegisterScreen] Register finished, showing success alert');
      Alert.alert(
        'Registration Successful',
        'Your account has been created successfully.\n\nPlease verify your email to continue.',
        [{ text: 'OK', onPress: () => router.push('./verify-email') }]
      );
    } catch (err:any) {
      console.log('[RegisterScreen] Register failed:', err, 'Current error:', error);
      if(err?.details && typeof err.details === 'object') {
        setValidationErrors(err.details);
      }
      else{
      Alert.alert(
        '❌ Registration Failed',
        error?.message || AUTH_MESSAGES.REGISTER_FAILED
      );
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
            paddingTop: insets.top + 26,
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
                ></Image>
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
          editable={!isLoading}
        />
        {validationErrors.username && (
          <Text style={styles.fieldErrorText}>{validationErrors.username}</Text>
        )}

        <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Email</Text>
        <TextInput
          style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.email && styles.inputError]}
          placeholder="Enter your email"
          placeholderTextColor="#8D8BA7"
          keyboardType="email-address"
          onChangeText={(text) => handleChange('email', text)}
          value={form.email}
          editable={!isLoading}
          autoCapitalize="none"
        />
        {validationErrors.email && (
          <Text style={styles.fieldErrorText}>{validationErrors.email}</Text>
        )}

        <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Password</Text>
        <TextInput
          style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.password && styles.inputError]}
          placeholder="Enter password"
          placeholderTextColor="#8D8BA7"
          secureTextEntry
          onChangeText={(text) => handleChange('password', text)}
          value={form.password}
          editable={!isLoading}
        />
        {validationErrors.password && (
          <Text style={styles.fieldErrorText}>{validationErrors.password}</Text>
        )}

        <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Confirm Password</Text>
        <TextInput
          style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.password_confirm && styles.inputError]}
          placeholder="Re-enter password"
          placeholderTextColor="#8D8BA7"
          secureTextEntry
          onChangeText={(text) => handleChange('password_confirm', text)}
          value={form.password_confirm}
          editable={!isLoading}
        />
        {validationErrors.password_confirm && (
          <Text style={styles.fieldErrorText}>{validationErrors.password_confirm}</Text>
        )}

        <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>First Name</Text>
        <TextInput
          style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.first_name && styles.inputError]}
          placeholder="Enter first name"
          placeholderTextColor="#8D8BA7"
          onChangeText={(text) => handleChange('first_name', text)}
          value={form.first_name}
          editable={!isLoading}
        />
        {validationErrors.first_name && (
          <Text style={styles.fieldErrorText}>{validationErrors.first_name}</Text>
        )}

        <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Last Name</Text>
        <TextInput
          style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.last_name && styles.inputError]}
          placeholder="Enter last name"
          placeholderTextColor="#8D8BA7"
          onChangeText={(text) => handleChange('last_name', text)}
          value={form.last_name}
          editable={!isLoading}
        />
        {validationErrors.last_name && (
          <Text style={styles.fieldErrorText}>{validationErrors.last_name}</Text>
        )}



        {/* Conditionally render therapist-specific fields */}
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
            {validationErrors.license_number && (
              <Text style={styles.fieldErrorText}>{validationErrors.license_number}</Text>
            )}

            <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Specialization</Text>
            <TextInput
              style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.specialization && styles.inputError]}
              placeholder="e.g., Depression, Anxiety"
              placeholderTextColor="#8D8BA7"
              onChangeText={(text) => handleChange('specialization', text)}
              value={form.specialization}
              editable={!isLoading}
            />
            {validationErrors.specialization && (
              <Text style={styles.fieldErrorText}>{validationErrors.specialization}</Text>
            )}
          </>
        )}

        <Text style={[styles.label, { fontSize: labelFontSize, width: fieldWidth }]}>Phone Number</Text>
        <TextInput
          style={[styles.input, { fontSize: inputFontSize, maxWidth: fieldWidth }, validationErrors.phone_number && styles.inputError]}
          placeholder="03xx-xxxxxxx"
          placeholderTextColor="#8D8BA7"
          keyboardType="phone-pad"
          onChangeText={(text) => handleChange('phone_number', text)}
          value={form.phone_number}
          editable={!isLoading}
        />
        {validationErrors.phone_number && (
          <Text style={styles.fieldErrorText}>{validationErrors.phone_number}</Text>
        )}

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
        {validationErrors.date_of_birth && (
          <Text style={styles.fieldErrorText}>{validationErrors.date_of_birth}</Text>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={date || new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'android' ? 'calendar' : 'inline'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {showDatePicker && Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.dateDoneButton, { width: fieldWidth }]}
            onPress={() => setShowDatePicker(false)}
            disabled={isLoading}
          >
            <Text style={styles.dateDoneText}>Done</Text>
          </TouchableOpacity>
        )}

       <TouchableOpacity
  style={[
    styles.button,
    { width: buttonWidth, paddingVertical: buttonVerticalPadding },
    isLoading && styles.buttonDisabled
  ]}
  onPress={handleRegister}
  disabled={isLoading}
>
  {isLoading ? (
    <ActivityIndicator color="#FFFFFF" size="small" />
  ) : (
    <Text style={[styles.buttonText, { fontSize: buttonTextSize }]}> 
      Register
    </Text>
  )}
</TouchableOpacity>


        <TouchableOpacity 
          onPress={() => !isLoading && router.push('./login')}
          disabled={isLoading}
        >
          <Text style={[styles.link, { fontSize: linkFontSize }, isLoading && styles.linkDisabled]}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );

}
const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: '#342949',
  },
  scrollContent: {
    flexGrow: 1,
  },
  wrapper: {
    flex: 1,
    backgroundColor: '#342949',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
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
    marginBottom: 22,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  label: {
    color: '#FFFFFF',
    marginBottom: 5,
    marginTop: 10,
    fontWeight: '500',
    textAlign: 'left',
    alignSelf: 'center',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    color: '#FFFFFF',
    width: '100%',
    alignSelf: 'center',
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  fieldErrorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    textAlign: 'left',
  },
  img: {
    marginBottom: -14,
  },
  radioGroup: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 20,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  radioLabel: {
    color: 'white',
    fontSize: 16,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#A78BFA',
    borderRadius: 12,
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
  buttonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  dateDoneButton: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 10,
  },
  dateDoneText: {
    color: '#D7CFF0',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  link: {
    color: '#D7CFF0',
    textAlign: 'center',
    marginTop: 14,
    textDecorationLine: 'underline',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  linkDisabled: {
    color: '#9e9e9e',
  },
  circleContainer: {
    position: 'absolute',
    top: -60,
    right: -60,
    zIndex: 1,
  },
  circle1: {
    width: 120,
    height: 120,
    borderRadius: 100,
    backgroundColor: 'rgba(133, 130, 180, 0.2)',
    opacity: 0.8,
    position: 'absolute',
    top: 0,
    marginTop: 50,
    right: 0,
  },
  circle2: {
    width: 140,
    height: 140,
    borderRadius: 100,
    backgroundColor: 'rgba(133, 130, 180, 0.25)',
    // backgroundColor: '#2E2C4E87', 
    opacity: 0.6,
    position: 'absolute',
    top: 40,
    right: 40,
  }
});