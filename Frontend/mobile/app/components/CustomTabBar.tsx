import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const VISIBLE_TABS = ['dashboard', 'actions', 'profile'];

const TAB_META: Record<string, { label: string; icon: (color: string, size: number) => React.ReactNode }> = {
  dashboard: {
    label: 'Dashboard',
    icon: (color, size) => <MaterialIcons name="dashboard" size={size} color={color} />,
  },
  actions: {
    label: 'Actions',
    icon: (color, size) => <MaterialIcons name="apps" size={size} color={color} />,
  },
  profile: {
    label: 'Profile',
    icon: (color, size) => <FontAwesome name="user" size={size} color={color} />,
  },
};

const ACTIVE_ICON = '#1e1530';
const INACTIVE_ICON = '#6d6a8a';
const BAR_BG = '#1a1230';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((r) => VISIBLE_TABS.includes(r.name));

  // One animated value per visible tab (0 = inactive, 1 = active)
  const animations = useRef<Record<string, Animated.Value>>(
    Object.fromEntries(VISIBLE_TABS.map((name) => [name, new Animated.Value(0)]))
  ).current;

  // Drive animations when active route changes
  useEffect(() => {
    const activeRoute = state.routes[state.index];
    VISIBLE_TABS.forEach((name) => {
      Animated.spring(animations[name], {
        toValue: name === activeRoute.name ? 1 : 0,
        useNativeDriver: false,
        tension: 60,
        friction: 8,
      }).start();
    });
  }, [animations, state.index, state.routes]);

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || 8 }]}>
      <View style={styles.container}>
        {visibleRoutes.map((route) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;

          const isFocused = state.routes[state.index].name === route.name;
          const anim = animations[route.name];

          // Pill width: expands from ~48 to ~130 when active
          const pillWidth = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [44, 128],
          });

          // Label opacity fades in
          const labelOpacity = anim.interpolate({
            inputRange: [0, 0.6, 1],
            outputRange: [0, 0, 1],
          });

          // Background color of pill
          const pillBg = anim.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(184,168,230,0)', 'rgba(184,168,230,1)'],
          });

          const iconColor = isFocused ? ACTIVE_ICON : INACTIVE_ICON;
          const iconSize = isFocused ? 22 : 22;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.name}
              onPress={onPress}
              activeOpacity={0.8}
              style={styles.tabItem}
            >
              <Animated.View
                style={[
                  styles.pill,
                  {
                    width: pillWidth,
                    backgroundColor: pillBg as any,
                  },
                ]}
              >
                {meta.icon(iconColor, iconSize)}
                <Animated.Text
                  style={[
                    styles.label,
                    { opacity: labelOpacity, color: ACTIVE_ICON },
                  ]}
                  numberOfLines={1}
                >
                  {meta.label}
                </Animated.Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BAR_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 20,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
    paddingBottom: 4,
    height: 56,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 10,
    gap: 6,
    overflow: 'hidden',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
