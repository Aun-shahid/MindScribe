// app/components/auth/login.tsx
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
  ActivityIndicator,
  Pressable,
  Image,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useAuth } from '../hooks/useAuth';
import { validateEmailField, validatePasswordField } from '../utils/validation';
import { AUTH_MESSAGES } from '../constants/messages';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'therapist' | 'patient' | null>(null);
  
  const { login, isLoading, error, clearError } = useAuth();
  const { theme, themeStyle, toggleTheme } = useTheme();

  useEffect(() => {
    const loadRole = async () => {
      const savedRole = await AsyncStorage.getItem('selected_role');
      if (savedRole === 'therapist' || savedRole === 'patient') {
        setSelectedRole(savedRole);
      }
    };
    loadRole();
  }, []);

  const handleLogin = async () => {
    // Validate inputs
    const emailValidation = validateEmailField(email);
    const passwordValidation = validatePasswordField(password);
    
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.message || 'Invalid email');
      return;
    }
    
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.message || 'Invalid password');
      return;
    }

    try {
      await login({ email: email.trim(), password });
      
      // The useAuth hook handles navigation based on user type
      // But we need to check if the user type matches the selected role
      
    } catch (err: any) {
      // Check if the error is about wrong user type
      if (selectedRole && err.user && err.user.user_type !== selectedRole) {
        Alert.alert(
          'Wrong User Type', 
          `This account is registered as a ${err.user.user_type}.`
        );
        return;
      }
      
      Alert.alert(
        'Login Failed', 
        error?.message || AUTH_MESSAGES.LOGIN_FAILED
      );
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

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) {
      setPasswordError(null);
    }
    if (error) {
      clearError();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.wrapper, { backgroundColor: themeStyle.background }]}
    >
      <View>
        <Pressable 
          style={[styles.backButton, { backgroundColor: themeStyle.background }]} 
          onPress={() => !isLoading && router.push('./splash')}
          disabled={isLoading}
        >
          <AntDesign name="arrowleft" size={24} color={themeStyle.text} />
        </Pressable>
      </View>
      
  <View style={styles.circleContainer}>
  <View style={[styles.circle1, { backgroundColor: themeStyle.circle }]} />
  <View style={[styles.circle2, { backgroundColor: themeStyle.circle }]} />
</View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image
          style={styles.img}
          source={require('../../assets/images/loginnew2.png')}
         
          resizeMode="contain"
        />

        <Text style={[styles.title ,{color: themeStyle.title}]}>LOGIN</Text>
        <Text style={[styles.subtitle,{color: themeStyle.title}]}>Please log in to continue</Text>

        {(error && !emailError && !passwordError) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        )}

        <View style={[styles.inputWrapper, emailError && styles.inputWrapperError]}>
          <MaterialIcons name="email" size={20} color="#524f85" style={styles.icon} />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#999"
            style={styles.input}
            onChangeText={handleEmailChange}
            value={email}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>
        {emailError && (
          <Text style={styles.fieldErrorText}>{emailError}</Text>
        )}

        <View style={[styles.inputWrapper, passwordError && styles.inputWrapperError]}>
          <FontAwesome name="lock" size={20} color="#524f85" style={styles.icon} />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            style={styles.input}
            onChangeText={handlePasswordChange}
            value={password}
            secureTextEntry
            editable={!isLoading}
          />
        </View>
        {passwordError && (
          <Text style={styles.fieldErrorText}>{passwordError}</Text>
        )}

       <TouchableOpacity 
  style={[
    styles.loginButton,
    { backgroundColor: themeStyle.logoutButton },
    isLoading && styles.loginButtonDisabled
  ]} 
  onPress={handleLogin}
  disabled={isLoading}
>
  {isLoading ? (
    <ActivityIndicator color={themeStyle.button} size="small" />
  ) : (
    <Text style={[styles.loginButtonText, { color: themeStyle.logoutText }]}>
      Login
    </Text>
  )}
</TouchableOpacity>


        <View style={styles.links}>
          <TouchableOpacity 
            onPress={() => !isLoading && router.push('./register')}
            disabled={isLoading}
          >
            <Text style={[styles.linkText,{color: themeStyle.text}, isLoading && styles.linkTextDisabled]}>
              Dont have an account? Register
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => !isLoading && router.push('./request-reset')}
            disabled={isLoading}
          >
            <Text style={[styles.linkText, {color: themeStyle.text}, isLoading && styles.linkTextDisabled]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    //backgroundColor: '#ffffff',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
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
  },
  container: {
    padding: 24,
    justifyContent: 'center',
    paddingTop: 100,
  },
  img: {
    marginTop: -50,
    width: 500,
    height: 500,
    alignSelf: 'center',
    marginBottom: -25,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    //color: '#524f85',
    // color: themeStyle.titleColor,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    //color: '#888',
    textAlign: 'center',
    marginBottom: 30,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
  inputWrapperError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  icon: {
    marginRight: 8,
  },
  fieldErrorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: -15,
    marginBottom: 10,
    marginLeft: 4,
  },
  loginButton: {
    //backgroundColor: '#524f85',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 48,
  },
  loginButtonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  links: {
    marginTop: 30,
    alignItems: 'center',
  },
  linkText: {
    color: '#524f85',
    fontSize: 14,
    marginVertical: 5,
  },
  linkTextDisabled: {
    color: '#9e9e9e',
  },
});
