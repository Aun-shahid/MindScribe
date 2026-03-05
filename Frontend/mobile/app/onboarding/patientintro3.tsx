import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function PatientIntro2() {
  const router = useRouter();

  const handleNext = () => {
    router.push('../auth/login');
  };

  return (
    <View style={styles.container}>
      {/* Top Image Layer */}
      <View style={styles.topHalfContainer}>
        <Image
          source={require('../../assets/images/group3bg.png')}
          style={styles.bgImage}
          resizeMode="cover"
        />
        <Image
          source={require('../../assets/images/group3ff.png')}
          style={styles.mainImage}
          resizeMode="contain"
        />
      </View>

      {/* Bottom Text and CTA Section */}
      <View style={styles.bottomContainer}>
        <Text style={styles.description}>
         Track your <Text style={styles.textAccent}>moods </Text> — discover your{' '}
          <Text style={styles.textAccent}>emotional rhythm</Text> {''}

        </Text>

        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dotActive} />
        </View>

        {/* Next Button */}
       {/* Next Button */}
<TouchableOpacity
  style={styles.nextButton}
  onPress={handleNext}
>
  <Text style={styles.nextButtonText}>
    Get Started
  </Text>
</TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d8c9ea',
  },

  topHalfContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: height * 0.7,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d8c9ea',
  },

  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },

  mainImage: {
    width: width * 1.2,
    height: height * 0.9,
    marginTop: 40,
    zIndex: 2,
  },

  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: height * 0.5,
    alignItems: 'center',
    paddingTop: 50,
    zIndex: 6,
    backgroundColor: '#342949',
  },

  description: {
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 36,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 36,
    marginTop: 40,
    color: '#FFFFFF',
  },

  textAccent: {
    color: '#4ec0c7',
  },

  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 48,
  },

  dot: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  dotActive: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },

  nextButton: {
    borderRadius: 999,
    padding: 20,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A78BFA',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },

  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
