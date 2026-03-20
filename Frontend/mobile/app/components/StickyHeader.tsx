import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StickyHeaderProps {
  scrollY: Animated.Value;
  firstWord: string;
  secondWord: string;
  onBackPress?: () => void;
}

export default function StickyHeader({
  scrollY,
  firstWord,
  secondWord,
  onBackPress,
}: StickyHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const opacity = scrollY.interpolate({
    inputRange: [0, 100, 150],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const translateY = scrollY.interpolate({
    inputRange: [0, 100, 150],
    outputRange: [-50, -50, 0],
    extrapolate: 'clamp',
  });

  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const id = scrollY.addListener(({ value }) => setVisible(value >= 150));
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  const btnSize = 36;

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[styles.wrapper, { opacity, transform: [{ translateY }] }]}
    >
      {/* Flex row — no absolute positioning, always reliable */}
      <View
        style={[styles.row, { paddingTop: insets.top + 10, paddingBottom: 14 }]}
        pointerEvents="auto"
      >
        {/* Back button — left slot */}
        <TouchableOpacity
          onPress={handleBackPress}
          activeOpacity={0.7}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={[styles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }]}
        >
          <FontAwesome name="chevron-left" size={15} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Title — centred, offset by btn width on right so it's visually balanced */}
        <Text style={[styles.title, { marginRight: btnSize }]} numberOfLines={1}>
          <Text style={styles.white}>{firstWord} </Text>
          <Text style={styles.purple}>{secondWord}</Text>
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(52,41,73,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexShrink: 0,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  white:  { color: '#FFFFFF' },
  purple: { color: '#B8A8E6' },
});
