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
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PatientIntro2() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const topHeight = height * 0.5;
  const bottomHeight = height * 0.5;

  const titleSize = Math.max(18, Math.min(width * 0.055, 22));
  const lineHeight = Math.round(titleSize * 1.45);
  const dotWidth = Math.round(width * 0.094);
  const emojiPad = width < 380 ? 5 : 6;
  const hintSize = Math.max(12, Math.min(width * 0.036, 14));

  const swipeResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -60) {
            router.push('./patientintro3');
          } else if (gestureState.dx > 60) {
            router.push('./patientintro1');
          }
        },
      }),
    [router],
  );

  const emojis = [
    { name: 'smile', top: topHeight * 0.12, left: width * 0.16, size: width < 380 ? 28 : 32, bg: '#FFB6C1' },
    { name: 'angry', top: topHeight * 0.18, left: width * 0.74, size: width < 380 ? 34 : 40, bg: '#FF6347' },
    { name: 'dizzy', top: topHeight * 0.40, left: width * 0.56, size: width < 380 ? 30 : 36, bg: '#9370DB' },
    { name: 'grin',  top: topHeight * 0.46, left: width * 0.06, size: width < 380 ? 32 : 38, bg: '#FFD700' },
    { name: 'frown', top: topHeight * 0.68, left: width * 0.68, size: width < 380 ? 30 : 34, bg: '#00CED1' },
  ];

  return (
    <View style={styles.container} {...swipeResponder.panHandlers}>
      {/* Top half */}
      <View style={[styles.heroSection, { height: topHeight, paddingTop: insets.top + 8 }]}>
        {emojis.map((emoji, index) => (
          <View
            key={index}
            style={{
              position: 'absolute',
              top: emoji.top,
              left: emoji.left,
              backgroundColor: emoji.bg,
              borderRadius: 50,
              padding: emojiPad,
            }}
          >
            <FontAwesome5 name={emoji.name} size={emoji.size} color="#FFFFFF" />
          </View>
        ))}
        <Image
          source={require('../../assets/images/group2ff.png')}
          style={[
            styles.groupImage,
            { width: width * 0.84, height: topHeight * 0.75, transform: [{ translateY: topHeight * 0.04 }] },
          ]}
          resizeMode="contain"
        />
      </View>

      {/* Bottom half */}
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
          Smart Support meets <Text style={styles.textAccent}>self care</Text> — powered by{' '}
          <Text style={styles.textAccent}>AI</Text> inspired by you.
        </Text>

        <View style={styles.progressContainer}>
          <View style={[styles.dot, { width: dotWidth }]} />
          <View style={[styles.dotActive, { width: dotWidth }]} />
          <View style={[styles.dot, { width: dotWidth }]} />
        </View>

        <Text style={[styles.swipeHint, { fontSize: hintSize }]}>← Swipe left or right →</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d8c9ea' },
  heroSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#d8c9ea',
    overflow: 'hidden',
  },
  groupImage: { zIndex: 2 },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: '#342949',
    paddingHorizontal: 22,
  },
  description: { textAlign: 'center', fontWeight: '800', paddingHorizontal: 14, color: '#FFFFFF' },
  textAccent: { color: '#4ec0c7' },
  progressContainer: { flexDirection: 'row', gap: 8 },
  dot: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  swipeHint: { color: 'rgba(255,255,255,0.72)', letterSpacing: 0.3 },
});
