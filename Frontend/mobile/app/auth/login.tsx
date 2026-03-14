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
  useWindowDimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { validateEmailField, validatePasswordField } from '../utils/validation';
import { AUTH_MESSAGES } from '../constants/messages';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'therapist' | 'patient' | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const headingSize = Math.max(30, Math.min(width * 0.09, 38));
  const subtitleSize = Math.max(14, Math.min(width * 0.042, 16));
  const inputFontSize = Math.max(14, Math.min(width * 0.039, 15));
  const imageWidth = Math.min(width * 0.94, 360);
  const imageHeight = Math.min(height * 0.33, 280);
  const circleOneSize = Math.min(width * 0.3, 120);
  const circleTwoSize = Math.min(width * 0.35, 140);
  const buttonWidth = Math.min(width * 0.8, 340);
  const buttonVerticalPadding = Math.max(11, Math.min(height * 0.016, 14));
  const buttonTextSize = Math.max(18, Math.min(width * 0.05, 21));
  const fieldWidth = Math.min(width * 0.84, 320);
  const linkFontSize = Math.max(13, Math.min(width * 0.038, 14));
  const bottomSafeGap = Math.max(insets.bottom + 42, 54);
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + 8 : 0;
  
  const { login, isLoading, error, clearError } = useAuth();

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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={styles.wrapper}
    >
      <View>
        <Pressable 
          style={[styles.backButton, { top: insets.top + 10, left: Math.max(12, width * 0.04) }]}
          onPress={() => !isLoading && router.push('./welcome')}
          disabled={isLoading}
        >
          <AntDesign name="left" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
      
  <View style={[styles.circleContainer, { top: -circleOneSize * 0.5, right: -circleOneSize * 0.5 }]}> 
  <View style={[styles.circle1, { width: circleOneSize, height: circleOneSize, borderRadius: circleOneSize / 2, marginTop: circleOneSize * 0.42 }]} />
  <View style={[styles.circle2, { width: circleTwoSize, height: circleTwoSize, borderRadius: circleTwoSize / 2, top: circleTwoSize * 0.29, right: circleTwoSize * 0.29 }]} />
</View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.container,
          {
            flexGrow: 1,
            paddingHorizontal: Math.max(20, Math.min(width * 0.06, 28)),
            paddingTop: insets.top + Math.max(56, height * 0.09),
            paddingBottom: bottomSafeGap,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        bounces={false}
        overScrollMode="never"
      >
        <Image
          style={[styles.img, { width: imageWidth, height: imageHeight }]}
          source={require('../../assets/images/login2.png')}
         
          resizeMode="contain"
        />

        <Text style={[styles.title, { fontSize: headingSize, lineHeight: Math.round(headingSize * 1.1), marginTop: height * 0.018 }]}>
          <Text style={styles.titlePrimary}>LOG</Text>
          <Text style={styles.titleAccent}>IN</Text>
        </Text>
        <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Please log in to continue</Text>

        {(error && !emailError && !passwordError) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        )}

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
        {emailError && (
          <Text style={styles.fieldErrorText}>{emailError}</Text>
        )}

        <View style={[styles.inputWrapper, { maxWidth: fieldWidth }, passwordError && styles.inputWrapperError]}>
          <FontAwesome name="lock" size={20} color="#8D8BA7" style={styles.icon} />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#8D8BA7"
            style={[styles.input, { fontSize: inputFontSize }]}
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
          { width: buttonWidth, paddingVertical: buttonVerticalPadding },
    isLoading && styles.loginButtonDisabled
  ]} 
  onPress={handleLogin}
  disabled={isLoading}
>
  {isLoading ? (
    <ActivityIndicator color="#FFFFFF" size="small" />
  ) : (
    <Text style={[styles.loginButtonText, { fontSize: buttonTextSize }]}>
      Login
    </Text>
  )}
</TouchableOpacity>


        <View style={styles.links}>
          <TouchableOpacity 
            onPress={() => !isLoading && router.push('./register')}
            disabled={isLoading}
          >
            <Text style={[styles.linkText, { fontSize: linkFontSize }, isLoading && styles.linkTextDisabled]}>
              Don&apos;t have an account? Register
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => !isLoading && router.push('./request-reset')}
            disabled={isLoading}
          >
            <Text style={[styles.linkText, styles.linkTextSecondary, { fontSize: linkFontSize }, isLoading && styles.linkTextDisabled]}>
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
    backgroundColor: '#342949',
  },
  backButton: {
    position: 'absolute',
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
    opacity: 0.6,
    position: 'absolute',
    top: 40,
    right: 40,
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    backgroundColor: '#342949',
  },
  img: {
    marginTop: -24,
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
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
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderRadius: 9,
    marginBottom: 16,
    paddingHorizontal: 9,
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: '100%',
  },
  inputWrapperError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  input: {
    flex: 1,
    height: 44,
    color: '#FFFFFF',
  },
  icon: {
    marginRight: 7,
  },
  fieldErrorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: -15,
    marginBottom: 10,
    marginLeft: 4,
  },
  loginButton: {
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
  loginButtonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  links: {
    marginTop: 24,
    alignItems: 'center',
    gap: 10,
  },
  linkText: {
    color: '#D7CFF0',
    fontWeight: '500',
    letterSpacing: 0.2,
    textDecorationLine: 'underline',
  },
  linkTextSecondary: {
    color: '#BFB4E2',
  },
  linkTextDisabled: {
    color: '#9e9e9e',
  },
});
