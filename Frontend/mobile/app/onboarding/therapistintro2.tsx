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
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function TherapistIntro2() {
  const { themeStyle } = useTheme();
  const router = useRouter();

  const handleNext = () => {
    router.push('./therapistintro3');
  };

  return (
    <View style={[styles.container, { backgroundColor: themeStyle.onboardingtop }]}>
      {/* Top Image Layer */}
      <View style={styles.topHalfContainer}>
        <Image
          source={require('../../assets/images/group5bg.png')}
          style={styles.bgImage}
          resizeMode="cover"
        />
        <Image
          source={require('../../assets/images/group5.png')}
          style={styles.mainImage}
          resizeMode="contain"
        />
      </View>

      {/* Bottom Text and CTA Section */}
      <View style={[styles.bottomContainer, { backgroundColor: themeStyle.onboardingbottom }]}>
        <Text style={[styles.description, { color: themeStyle.text }]}>
         <Text style={{ color: themeStyle.textdesign }}>Smart insights </Text> — to track client mood and{' '}
          <Text style={{ color: themeStyle.textdesign }}>progress </Text>real time {''}

        </Text>

        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          <View style={[styles.dot, { backgroundColor: themeStyle.progressbarside }]} />
          <View style={[styles.dot, { backgroundColor: themeStyle.progressbarmain }]} />
          <View style={[styles.dot, { backgroundColor: themeStyle.progressbarside }]} />
        </View>

        {/* Next Button */}
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

  topHalfContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: height * 0.7,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
