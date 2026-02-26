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
  onBackPress
}: StickyHeaderProps) {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 100, 150],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const stickyHeaderTranslateY = scrollY.interpolate({
    inputRange: [0, 100, 150],
    outputRange: [-50, -50, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.stickyHeader,
        {
          opacity: stickyHeaderOpacity,
          transform: [{ translateY: stickyHeaderTranslateY }],
        },
      ]}
    >
      <View style={styles.stickyHeaderCard} pointerEvents="auto">
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.stickyBackButton}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <FontAwesome name="chevron-left" size={16} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.stickyHeaderText}>
          <Text style={styles.headerWhite}>{firstWord} </Text>
          <Text style={styles.headerPurple}>{secondWord}</Text>
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  stickyHeaderCard: {
    backgroundColor: 'rgba(52, 41, 73, 0.85)',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stickyBackButton: {
    position: 'absolute',
    left: 20,
    top: 56,
    padding: 6,
  },
  stickyHeaderText: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerWhite: {
    color: '#FFFFFF',
  },
  headerPurple: {
    color: '#B8A8E6',
  },
});