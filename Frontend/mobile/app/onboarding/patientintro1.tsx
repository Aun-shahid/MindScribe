import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function PatientIntro1() {
  const { themeStyle } = useTheme();
  const router = useRouter();

  const handleNext = () => {
    router.push('./patientintro2');
  };

  return (
    <View style={[styles.container, { backgroundColor: themeStyle.onboardingtop }]}>
      {/* Top Image Layer */}
      <View style={[styles.svgWrapper, { backgroundColor: themeStyle.onboardingtop }]}>
        <View style={styles.svgContainer}>
          <Image source={require('../../assets/images/Vector1.png')} style={styles.vector1} />
          <Image source={require('../../assets/images/Vector2.png')} style={styles.vector2} />
          <Image source={require('../../assets/images/vector3.png')} style={styles.vector3} />
          <Image source={require('../../assets/images/Vector2.png')} style={styles.vector4} />
          <Image source={require('../../assets/images/group1f.png')} style={styles.groupImage} />
        </View>
      </View>

      {/* Bottom Text and CTA Section */}
      <View style={[styles.bottomContainer, { backgroundColor: themeStyle.onboardingbottom }]}>
        <Text style={[styles.description, { color: themeStyle.text }]}>
          Welcome to your <Text style={{ color: themeStyle.textdesign }}>safe space</Text> — where{' '}
          <Text style={{ color: themeStyle.textdesign }}>healing</Text> begins gently
        </Text>

        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          <View style={[styles.dot, { backgroundColor: themeStyle.progressbarmain }]} />
          <View style={[styles.dot, { backgroundColor: themeStyle.progressbarside }]} />
          <View style={[styles.dot, { backgroundColor: themeStyle.progressbarside }]} />
        </View>

        {/* Next Button */}
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: themeStyle.button }]}
          onPress={handleNext}
        >
          <Ionicons name="arrow-forward" size={24} color={themeStyle.buttonText} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  svgWrapper: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: height * 0.7,
    zIndex: 1,
  },

  svgContainer: {
    position: 'relative',
    width: width * 3.2,
    height: height * 1.2,
    top: 60,
    left: -width * 0.75,
  },

  vector1: {
    position: 'absolute',
    top: 18,
    left: width * 0.75,
    width: 105,
    height: 56,
    resizeMode: 'contain',
  },
  vector2: {
    position: 'absolute',
    top: 28,
    left: width * 1.5,
    width: 150,
    height: 71,
    resizeMode: 'contain',
  },
  vector3: {
    position: 'absolute',
    top: 249,
    left: width * 0.75,
    width: 114,
    height: 67,
    resizeMode: 'contain',
  },
  vector4: {
    position: 'absolute',
    top: 158,
    left: width * 1.42,
    width: 145,
    height: 105,
    resizeMode: 'contain',
  },
  groupImage: {
    position: 'absolute',
    top: 65,
    left: width * 0.8,
    width: width * 0.89,
    height: 450,
    resizeMode: 'contain',
    zIndex: 3,
  },

  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: height * 0.5,
    alignItems: 'center',
    paddingTop: 50,
    zIndex: 6,
  },

  description: {
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 36,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 36,
    marginTop: 40,
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
  },

  nextButton: {
    borderRadius: 999,
    padding: 20,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
