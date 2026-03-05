
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.wrapper}
        >
    

    
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <View style={styles.circleContainer}>
            <View style={styles.circle1} />
              <View style={styles.circle2} />
          </View>
        <Image
                  style={styles.img}
                  source={require('../../assets/images/register.png')}
                  resizeMode="contain"
                ></Image>
        <Text style={styles.title}>
          {role === 'therapist' ? 'SIGN UP AS THERAPIST' : 'SIGN UP AS A PATIENT'}
        </Text>

        {(error && !Object.keys(validationErrors).length) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        )}

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={[styles.input, validationErrors.username && styles.inputError]}
          placeholder="Enter your username"
          placeholderTextColor="#8D8BA7"
          onChangeText={(text) => handleChange('username', text)}
          value={form.username}
          editable={!isLoading}
        />
        {validationErrors.username && (
          <Text style={styles.fieldErrorText}>{validationErrors.username}</Text>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, validationErrors.email && styles.inputError]}
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

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={[styles.input, validationErrors.password && styles.inputError]}
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

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={[styles.input, validationErrors.password_confirm && styles.inputError]}
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

        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={[styles.input, validationErrors.first_name && styles.inputError]}
          placeholder="Enter first name"
          placeholderTextColor="#8D8BA7"
          onChangeText={(text) => handleChange('first_name', text)}
          value={form.first_name}
          editable={!isLoading}
        />
        {validationErrors.first_name && (
          <Text style={styles.fieldErrorText}>{validationErrors.first_name}</Text>
        )}

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={[styles.input, validationErrors.last_name && styles.inputError]}
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
            <Text style={styles.label}>License Number</Text>
            <TextInput
              style={[styles.input, validationErrors.license_number && styles.inputError]}
              placeholder="Enter license number"
              placeholderTextColor="#8D8BA7"
              onChangeText={(text) => handleChange('license_number', text)}
              value={form.license_number}
              editable={!isLoading}
            />
            {validationErrors.license_number && (
              <Text style={styles.fieldErrorText}>{validationErrors.license_number}</Text>
            )}

            <Text style={styles.label}>Specialization</Text>
            <TextInput
              style={[styles.input, validationErrors.specialization && styles.inputError]}
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

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={[styles.input, validationErrors.phone_number && styles.inputError]}
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

        <Text style={styles.label}>Date of Birth</Text>
        <TouchableOpacity 
          style={[styles.input, validationErrors.date_of_birth && styles.inputError]} 
          onPress={() => !isLoading && setShowDatePicker(true)}
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
    isLoading && styles.buttonDisabled
  ]}
  onPress={handleRegister}
  disabled={isLoading}
>
  {isLoading ? (
    <ActivityIndicator color="#FFFFFF" size="small" />
  ) : (
    <Text style={styles.buttonText}>
      Register
    </Text>
  )}
</TouchableOpacity>


        <TouchableOpacity 
          onPress={() => !isLoading && router.push('./login')}
          disabled={isLoading}
        >
          <Text style={[styles.link, isLoading && styles.linkDisabled]}>
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
    backgroundColor: '#342949',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 30,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 5,
    marginTop: 10,
    fontWeight: '500'
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 9,
    padding: 12,
    fontSize: 16,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    color: '#FFFFFF',
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
    backgroundColor: '#A78BFA',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#FFFFFF',
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