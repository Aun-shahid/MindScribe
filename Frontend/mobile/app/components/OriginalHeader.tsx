import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface OriginalHeaderProps {
  scrollY: Animated.Value;
  firstWord: string;
  secondWord: string;
  onBackPress?: () => void;
}

export default function OriginalHeader({
  scrollY,
  firstWord,
  secondWord,
  onBackPress
}: OriginalHeaderProps) {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const originalHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 100, 150],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.headerContainer, { opacity: originalHeaderOpacity }]}>
      <TouchableOpacity
        onPress={handleBackPress}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>
        <Text style={styles.headerWhite}>{firstWord} </Text>
        <Text style={styles.headerPurple}>{secondWord}</Text>
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 65,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 65,
    padding: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  headerWhite: {
    color: '#FFFFFF',
  },
  headerPurple: {
    color: '#B8A8E6',
  },
});