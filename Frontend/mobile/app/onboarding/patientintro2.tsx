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
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function PatientIntro2() {
  const { themeStyle } = useTheme();
  const router = useRouter();

  const handleNext = () => {
    router.push('./patientintro3');
  };
const emojis = [
  { name: 'smile', top: 80, left: 120, size: 32, bg: '#FFB6C1' },       // pink - higher & more centered
  { name: 'angry', top: 140, left: 340, size: 40, bg: '#FF6347' },      // red - very low right
  { name: 'dizzy', top: 260, left: 250, size: 36, bg: '#9370DB' },       // purple - unchanged
  { name: 'grin', top: 290, left: 20, size: 38, bg: '#FFD700' },        // yellow - lower than before
  { name: 'frown', top: 420, left: 280, size: 34, bg: '#00CED1' }       // blue - unchanged
];


  return (
    <View style={[styles.container, { backgroundColor: themeStyle.onboardingtop }]}>
      {/* Top Emoji Layer */}
      <View style={[styles.emojiWrapper, { backgroundColor: themeStyle.onboardingtop }]}>
        {emojis.map((emoji, index) => (
          <View
            key={index}
            style={{
              position: 'absolute',
              top: emoji.top,
              left: emoji.left,
              backgroundColor: emoji.bg,
              borderRadius: 50,
              padding: 6,
            }}
          >
            <FontAwesome5
              name={emoji.name}
              size={emoji.size}
              color="#FFFFFF"
            />
          </View>
        ))}
        {/* Preserve Group2 Image */}
        <Image source={require('../../assets/images/group2ff.png')} style={styles.groupImage} resizeMode="contain" />
      </View>

      {/* Bottom Text and CTA Section */}
      <View style={[styles.bottomContainer, { backgroundColor: themeStyle.onboardingbottom }]}>
        <Text style={[styles.description, { color: themeStyle.text }]}>
          Smart Support meets <Text style={{ color: themeStyle.textdesign }}>self care </Text> — powered by {' '}
          <Text style={{ color: themeStyle.textdesign }}>AI</Text> inspired by you.
        </Text>

     <View style={styles.progressContainer}>
          <View style={[styles.dot, { backgroundColor: themeStyle.progressbarside }]} />
          <View style={[styles.dot, { backgroundColor: themeStyle.progressbarmain }]} />
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

  emojiWrapper: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: height * 0.7,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  groupImage: {
    width: width * 0.9,
    height: height * 0.5,
    marginTop: 80,
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