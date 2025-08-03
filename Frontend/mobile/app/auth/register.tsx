
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
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { validateRegisterForm, FormValidationErrors } from '../utils/validation';
import { AUTH_MESSAGES } from '../constants/messages';
import { RegisterRequest } from '../types/auth';

export default function RegisterScreen() {
  const [role, setRole] = useState<'therapist' | 'patient'>('patient');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [validationErrors, setValidationErrors] = useState<FormValidationErrors>({});
  
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
  const { theme, themeStyle, toggleTheme } = useTheme();

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

  const handleDateChange = (_event: any, selectedDate: Date | undefined) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const isoDate = selectedDate.toISOString().split('T')[0];
      setDate(selectedDate);
      handleChange('date_of_birth', isoDate);
    }
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
        '✅ Success',
        AUTH_MESSAGES.REGISTER_SUCCESS,
        [{ text: 'OK', onPress: () => router.push('./verify-email') }]
      );
    } catch (err) {
      console.log('[RegisterScreen] Register failed:', err, 'Current error:', error);
      Alert.alert(
        '❌ Registration Failed',
        error?.message || AUTH_MESSAGES.REGISTER_FAILED
      );
    }
  };

  return (

    <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.wrapper, { backgroundColor: themeStyle.background }]}
        >
    

    
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <View style={styles.circleContainer}>
            <View style={[styles.circle1, { backgroundColor: themeStyle.circle }]} />
              <View style={[styles.circle2, { backgroundColor: themeStyle.circle }]} />
          </View>
        <Image
                  style={styles.img}
                  source={require('../../assets/images/register.png')}
                  resizeMode="contain"
                ></Image>
        <Text style={[styles.title, { color: themeStyle.title }]}>
          {role === 'therapist' ? 'SIGN UP AS THERAPIST' : 'SIGN UP AS A PATIENT'}
        </Text>

        {(error && !Object.keys(validationErrors).length) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        )}

        <Text style={[styles.label, { color: themeStyle.label }]}>Username</Text>
        <TextInput
          style={[styles.input, validationErrors.username && styles.inputError]}
          placeholder="Enter your username"
          onChangeText={(text) => handleChange('username', text)}
          value={form.username}
          editable={!isLoading}
        />
        {validationErrors.username && (
          <Text style={styles.fieldErrorText}>{validationErrors.username}</Text>
        )}

        <Text style={[styles.label, { color: themeStyle.label }]}>Email</Text>
        <TextInput
          style={[styles.input, validationErrors.email && styles.inputError]}
          placeholder="Enter your email"
          keyboardType="email-address"
          onChangeText={(text) => handleChange('email', text)}
          value={form.email}
          editable={!isLoading}
          autoCapitalize="none"
        />
        {validationErrors.email && (
          <Text style={styles.fieldErrorText}>{validationErrors.email}</Text>
        )}

        <Text style={[styles.label, { color: themeStyle.label }]}>Password</Text>
        <TextInput
          style={[styles.input, validationErrors.password && styles.inputError]}
          placeholder="Enter password"
          secureTextEntry
          onChangeText={(text) => handleChange('password', text)}
          value={form.password}
          editable={!isLoading}
        />
        {validationErrors.password && (
          <Text style={styles.fieldErrorText}>{validationErrors.password}</Text>
        )}

        <Text style={[styles.label, { color: themeStyle.label }]}>Confirm Password</Text>
        <TextInput
          style={[styles.input, validationErrors.password_confirm && styles.inputError]}
          placeholder="Re-enter password"
          secureTextEntry
          onChangeText={(text) => handleChange('password_confirm', text)}
          value={form.password_confirm}
          editable={!isLoading}
        />
        {validationErrors.password_confirm && (
          <Text style={styles.fieldErrorText}>{validationErrors.password_confirm}</Text>
        )}

        <Text style={[styles.label, { color: themeStyle.label }]}>First Name</Text>
        <TextInput
          style={[styles.input, validationErrors.first_name && styles.inputError]}
          placeholder="Enter first name"
          onChangeText={(text) => handleChange('first_name', text)}
          value={form.first_name}
          editable={!isLoading}
        />
        {validationErrors.first_name && (
          <Text style={styles.fieldErrorText}>{validationErrors.first_name}</Text>
        )}

        <Text style={[styles.label, { color: themeStyle.label }]}>Last Name</Text>
        <TextInput
          style={[styles.input, validationErrors.last_name && styles.inputError]}
          placeholder="Enter last name"
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
            <Text style={[styles.label, { color: themeStyle.label }]}>License Number</Text>
            <TextInput
              style={[styles.input, validationErrors.license_number && styles.inputError]}
              placeholder="Enter license number"
              onChangeText={(text) => handleChange('license_number', text)}
              value={form.license_number}
              editable={!isLoading}
            />
            {validationErrors.license_number && (
              <Text style={styles.fieldErrorText}>{validationErrors.license_number}</Text>
            )}

            <Text style={[styles.label, { color: themeStyle.label }]}>Specialization</Text>
            <TextInput
              style={[styles.input, validationErrors.specialization && styles.inputError]}
              placeholder="e.g., Depression, Anxiety"
              onChangeText={(text) => handleChange('specialization', text)}
              value={form.specialization}
              editable={!isLoading}
            />
            {validationErrors.specialization && (
              <Text style={styles.fieldErrorText}>{validationErrors.specialization}</Text>
            )}
          </>
        )}

        <Text style={[styles.label, { color: themeStyle.label }]}>Phone Number</Text>
        <TextInput
          style={[styles.input, validationErrors.phone_number && styles.inputError]}
          placeholder="03xx-xxxxxxx"
          keyboardType="phone-pad"
          onChangeText={(text) => handleChange('phone_number', text)}
          value={form.phone_number}
          editable={!isLoading}
        />
        {validationErrors.phone_number && (
          <Text style={styles.fieldErrorText}>{validationErrors.phone_number}</Text>
        )}

        <Text style={[styles.label, { color: themeStyle.label }]}>Date of Birth</Text>
        <TouchableOpacity 
          style={[styles.input, validationErrors.date_of_birth && styles.inputError]} 
          onPress={() => !isLoading && setShowDatePicker(true)}
          disabled={isLoading}
        >
          <Text style={{ color: form.date_of_birth ? '#000' : '#999' }}>
            {form.date_of_birth || 'YYYY-MM-DD'}
          </Text>
        </TouchableOpacity>
        {validationErrors.date_of_birth && (
          <Text style={styles.fieldErrorText}>{validationErrors.date_of_birth}</Text>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

       <TouchableOpacity
  style={[
    styles.button,
    { backgroundColor: themeStyle.button },
    isLoading && styles.buttonDisabled
  ]}
  onPress={handleRegister}
  disabled={isLoading}
>
  {isLoading ? (
    <ActivityIndicator color={themeStyle.buttonText} size="small" />
  ) : (
    <Text style={[styles.buttonText, { color: themeStyle.buttonText }]}>
      Register
    </Text>
  )}
</TouchableOpacity>


        <TouchableOpacity 
          onPress={() => !isLoading && router.push('./login')}
          disabled={isLoading}
        >
          <Text style={[styles.link, , { color: themeStyle.text }, isLoading && styles.linkDisabled]}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );

}
const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  wrapper: {
    flex: 1,
    //backgroundColor: '#ffffff'
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 30,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    //color: '#49467E',
    marginBottom: 30,
    textAlign: 'center',
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
    //color: '#524f85',
    fontSize: 16,
    marginBottom: 5,
    marginTop: 10,
    fontWeight: '500'
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 9,
    padding: 12,
    fontSize: 16,
    borderColor: 'black',
    borderWidth: 1
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  fieldErrorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  img: {
    width: 400,
    height: 400,
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
    backgroundColor: '#49467E',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#49467E',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 12,
    textDecorationLine: 'underline',
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
    // backgroundColor: '#2E2C4E87', 
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
    // backgroundColor: '#2E2C4E87', 
    opacity: 0.6,
    position: 'absolute',
    top: 40,
    right: 40,
  }
});