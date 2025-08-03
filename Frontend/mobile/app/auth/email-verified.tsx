import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';

const { height, width } = Dimensions.get('window');

export default function EmailVerified() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../../assets/images/newemailbg.png')} // ✅ Full background
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Image
          source={require('../../assets/images/emailtick.png')} // 🌸 Flower on top
          style={styles.flower}
        />

        <Text style={styles.text}>Your account{'\n'}was successfully created!</Text>

        <TouchableOpacity
          onPress={() => router.push('./login')}
          style={styles.arrowButton}
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
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    width: '100%',
    marginTop: -height * 0.55, // Move everything way further upward
  },
  flower: {
    width: width * 0.4,
    height: height * 0.2,
    marginBottom: 30, // Increased spacing
  },
  text: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 40, // Increased spacing
  },
  arrowButton: {
    backgroundColor: '#524f85',
    width: 60,
    height: 60,
    borderRadius: 30,
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
