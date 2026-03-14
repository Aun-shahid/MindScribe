import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PatientIntro1() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Exactly half the screen for top, half for bottom
  const topHeight = height * 0.5;
  const bottomHeight = height * 0.5;

  // Relative font size
  const titleSize = Math.max(18, Math.min(width * 0.055, 22));
  const lineHeight = Math.round(titleSize * 1.45);
  const dotWidth = Math.round(width * 0.094);
  const hintSize = Math.max(12, Math.min(width * 0.036, 14));

  const swipeResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -60) {
            router.push('./patientintro2');
          }
        },
      }),
    [router]
  );

  return (
    <View style={styles.container} {...swipeResponder.panHandlers}>
      {/* Top half — light purple with artwork */}
      <View style={[styles.heroSection, { height: topHeight, paddingTop: insets.top + 8 }]}>
        <View style={[styles.svgContainer, { width: width * 3.2, height: topHeight * 1.6, left: -width * 0.75 }]}>
          <Image source={require('../../assets/images/Vector1.png')} style={[styles.vector1, { left: width * 0.75 }]} />
          <Image source={require('../../assets/images/Vector2.png')} style={[styles.vector2, { left: width * 1.5 }]} />
          <Image source={require('../../assets/images/vector3.png')} style={[styles.vector3, { left: width * 0.75 }]} />
          <Image source={require('../../assets/images/Vector2.png')} style={[styles.vector4, { left: width * 1.42 }]} />
          <Image
            source={require('../../assets/images/group1f.png')}
            style={[styles.groupImage, { left: width * 0.8, width: width * 0.89, height: topHeight * 0.88 }]}
          />
        </View>
      </View>

      {/* Bottom half — dark purple, straight top edge, fills rest of screen */}
      <View
        style={[
          styles.bottomContainer,
          {
            height: bottomHeight,
            paddingTop: height * 0.032,
            paddingBottom: Math.max(insets.bottom + 20, 32),
          },
        ]}
      >
        <Text style={[styles.description, { fontSize: titleSize, lineHeight }]}>
          Welcome to your <Text style={styles.textAccent}>safe space</Text> — where{' '}
          <Text style={styles.textAccent}>healing</Text> begins gently
        </Text>

        <View style={styles.progressContainer}>
          <View style={[styles.dotActive, { width: dotWidth }]} />
          <View style={[styles.dot, { width: dotWidth }]} />
          <View style={[styles.dot, { width: dotWidth }]} />
        </View>

        <Text style={[styles.swipeHint, { fontSize: hintSize }]}>Swipe left to continue →</Text>
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
    backgroundColor: '#d8c9ea',
    overflow: 'hidden',
  },

  svgContainer: {
    position: 'relative',
    top: 50,
  },

  vector1: {
    position: 'absolute',
    top: 18,
    width: 105,
    height: 56,
    resizeMode: 'contain',
  },
  vector2: {
    position: 'absolute',
    top: 28,
    width: 150,
    height: 71,
    resizeMode: 'contain',
  },
  vector3: {
    position: 'absolute',
    top: 249,
    width: 114,
    height: 67,
    resizeMode: 'contain',
  },
  vector4: {
    position: 'absolute',
    top: 158,
    width: 145,
    height: 105,
    resizeMode: 'contain',
  },
  groupImage: {
    position: 'absolute',
    top: 50,
    resizeMode: 'contain',
    zIndex: 3,
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

  swipeHint: {
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.3,
  },
});
