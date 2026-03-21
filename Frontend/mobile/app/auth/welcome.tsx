import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ONBOARDING_KEY = 'has_completed_onboarding';

export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const buttonWidth = Math.min(width * 0.8, 340);
  const buttonVerticalPadding = Math.max(11, Math.min(height * 0.016, 14));
  const buttonTextSize = Math.max(18, Math.min(width * 0.05, 21));
  const imageHeight = Math.min(height * 0.62, 520);
  const titleSize = width < 380 ? 32 : 38;
  const bottomSafeGap = Math.max(insets.bottom + 42, 54);

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('selected_role', 'patient');
    const done = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (done === 'true') {
      // Already seen the intro slides — go straight to login
      router.push('../auth/login');
    } else {
      // First time — show the intro slides
      router.push('../onboarding/patientintro1');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 28, paddingBottom: bottomSafeGap }]}>
      <View style={styles.header}>
        <FontAwesome5 name="brain" size={45} color="#FFFFFF" style={{ marginTop: 17 }} />
        <Text style={[styles.title, { fontSize: titleSize }]}>
          <Text style={{ color: '#FFFFFF' }}>Mind</Text>
          <Text style={{ color: '#B8A8E6' }}>Scribe</Text>
        </Text>
      </View>

      <Image
        source={require('../../assets/images/final_welcome.png')}
        style={[styles.bgImage, { height: imageHeight }]}
        resizeMode="contain"
      />

      <TouchableOpacity
        style={[styles.btn, { width: buttonWidth, paddingVertical: buttonVerticalPadding }]}
        onPress={handleGetStarted}
      >
        <Text style={[styles.btnLabel, { fontSize: buttonTextSize }]}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#342949',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  title: {
    fontWeight: '800',
    marginTop: 10,
    marginLeft: 10,
    color: '#FFFFFF',
  },
  bgImage: {
    width: '100%',
    maxWidth: 420,
    marginTop: -10,
    marginBottom: 0,
    shadowColor: '#111',
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  btn: {
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: '#A78BFA',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  btnLabel: {
    fontWeight: '400',
    color: '#FFFFFF',
  },
});
