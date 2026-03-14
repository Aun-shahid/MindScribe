import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PatientIntro3() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const topHeight = height * 0.5;
  const bottomHeight = height * 0.5;

  const titleSize = Math.max(18, Math.min(width * 0.055, 22));
  const lineHeight = Math.round(titleSize * 1.45);
  const dotWidth = Math.round(width * 0.094);
  const buttonWidth = Math.min(width * 0.68, 240);
  const btnFontSize = Math.max(15, Math.min(width * 0.044, 18));

  const handleNext = () => {
    router.push('../auth/login');
  };

  return (
    <View style={styles.container}>
      {/* Top half */}
      <View style={[styles.heroSection, { height: topHeight, paddingTop: insets.top + 8 }]}>
        <Image source={require('../../assets/images/group3bg.png')} style={styles.bgImage} resizeMode="cover" />
        <Image
          source={require('../../assets/images/group3ff.png')}
          style={[
            styles.mainImage,
            { width: width * 1.0, height: topHeight * 0.78, transform: [{ translateY: topHeight * 0.05 }] },
          ]}
          resizeMode="contain"
        />
      </View>

      {/* Bottom half — straight top edge */}
      <View
        style={[
          styles.bottomContainer,
          {
            height: bottomHeight,
            paddingTop: height * 0.028,
            paddingBottom: Math.max(insets.bottom + 42, 52),
          },
        ]}
      >
        <Text style={[styles.description, { fontSize: titleSize, lineHeight }]}>
          Track your <Text style={styles.textAccent}>moods</Text> — discover your{' '}
          <Text style={styles.textAccent}>emotional rhythm</Text>
        </Text>

        <View style={styles.progressContainer}>
          <View style={[styles.dot, { width: dotWidth }]} />
          <View style={[styles.dot, { width: dotWidth }]} />
          <View style={[styles.dotActive, { width: dotWidth }]} />
        </View>

        <TouchableOpacity style={[styles.nextButton, { width: buttonWidth }]} onPress={handleNext}>
          <Text style={[styles.nextButtonText, { fontSize: btnFontSize }]}>Get Started</Text>
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

  heroSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#d8c9ea',
    overflow: 'hidden',
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
    zIndex: 2,
  },

  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: '#342949',
    paddingHorizontal: 22,
  },

  description: {
    textAlign: 'center',
    fontWeight: '800',
    paddingHorizontal: 14,
    color: '#FFFFFF',
  },

  textAccent: {
    color: '#4ec0c7',
  },

  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },

  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  dotActive: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },

  nextButton: {
    borderRadius: 999,
    paddingVertical: 16,
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
    fontWeight: 'bold',
  },
});
