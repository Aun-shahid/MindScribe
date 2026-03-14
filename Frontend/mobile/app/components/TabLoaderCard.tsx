import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface TabLoaderCardProps {
  title?: string;
  subtitle?: string;
  spinnerColor?: string;
  fullScreen?: boolean;
  icon?: 'brain' | 'hands-helping';
  showText?: boolean;
}

export default function TabLoaderCard({
  title,
  subtitle,
  spinnerColor = '#FFB36B',
  fullScreen = true,
  icon = 'brain',
  showText = false,
}: TabLoaderCardProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotation, {
          toValue: -360,
          duration: 850,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(180),
        Animated.timing(rotation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 360,
          duration: 850,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(180),
        Animated.timing(rotation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  const displayText = showText && (title || subtitle);

  return (
    <View style={[styles.wrap, fullScreen && styles.wrapFullScreen]}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <FontAwesome5 name={icon} size={48} color={spinnerColor} />
      </Animated.View>
      {displayText ? <Text style={styles.title}>{title}</Text> : null}
      {displayText && subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  wrapFullScreen: {
    flex: 1,
    paddingVertical: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  subtitle: {
    color: '#B9AFDD',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});
