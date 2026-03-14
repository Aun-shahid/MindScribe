import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EmailVerified() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomSafeGap = Math.max(insets.bottom + 42, 54);
  const iconSize = Math.min(width * 1.08, 420);
  const iconHeight = Math.min(height * 0.42, 360);
  const messageSize = Math.max(20, Math.min(width * 0.064, 28));
  const arrowSize = Math.min(width * 0.17, 68);

  return (
    <ImageBackground
      source={require('../../assets/images/newemailbg.png')} // ✅ Full background
      style={styles.background}
      resizeMode="cover"
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: insets.top + Math.max(height * 0.11, 86),
            paddingBottom: bottomSafeGap,
          },
        ]}
      >
        <Image
          source={require('../../assets/images/emailtick.png')} // 🌸 Flower on top
          style={[
            styles.flower,
            {
              width: iconSize,
              height: iconHeight,
              marginBottom: Math.max(height * 0.02, 14),
            },
          ]}
        />

        <Text
          style={[
            styles.text,
            {
              fontSize: messageSize,
              lineHeight: Math.round(messageSize * 1.3),
              marginBottom: Math.max(height * 0.032, 24),
            },
          ]}
        >
          Your account{`\n`}was successfully created!
        </Text>

        <TouchableOpacity
          onPress={() => router.push('./login')}
          style={[
            styles.arrowButton,
            {
              width: arrowSize,
              height: arrowSize,
              borderRadius: arrowSize / 2,
            },
          ]}
        >
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    width: '100%',
  },
  flower: {
    resizeMode: 'contain',
  },
  text: {
    fontWeight: '600',
    color: '#2F2A4B',
    textAlign: 'center',
  },
  arrowButton: {
    backgroundColor: '#524f85',
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  arrow: {
    fontSize: 32,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
    marginTop: -10, // Move arrow upward to center it properly
  },
});
