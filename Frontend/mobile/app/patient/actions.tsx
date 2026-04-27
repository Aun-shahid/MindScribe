import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const wp = (pct: number) => (screenWidth * pct) / 100;
const hp = (pct: number) => (screenHeight * pct) / 100;

export default function AllActionsScreen() {
  const { themeStyle } = useTheme();

  const scrollRef = useRef<ScrollView>(null);

  const bubble1Y = useRef(new Animated.Value(0)).current;
  const bubble1X = useRef(new Animated.Value(0)).current;
  const bubble2Y = useRef(new Animated.Value(0)).current;
  const bubble2X = useRef(new Animated.Value(0)).current;
  const bubble3Y = useRef(new Animated.Value(0)).current;
  const bubble3X = useRef(new Animated.Value(0)).current;
  const bubble4Y = useRef(new Animated.Value(0)).current;
  const bubble4X = useRef(new Animated.Value(0)).current;
  const bubble5Y = useRef(new Animated.Value(0)).current;
  const bubble5X = useRef(new Animated.Value(0)).current;

  // Scroll to top every time this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useEffect(() => {
    const createFloatingAnimation = (
      animatedY: Animated.Value,
      animatedX: Animated.Value,
      durationY: number,
      durationX: number,
      delay: number
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(animatedY, { toValue: -30, duration: durationY, useNativeDriver: true }),
              Animated.timing(animatedY, { toValue: 0, duration: durationY, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(animatedX, { toValue: 20, duration: durationX, useNativeDriver: true }),
              Animated.timing(animatedX, { toValue: 0, duration: durationX, useNativeDriver: true }),
            ]),
          ]),
        ])
      );
    };

    const anim1 = createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000, 0);
    const anim2 = createFloatingAnimation(bubble2Y, bubble2X, 9000, 8000, 1000);
    const anim3 = createFloatingAnimation(bubble3Y, bubble3X, 7000, 9000, 500);
    const anim4 = createFloatingAnimation(bubble4Y, bubble4X, 10000, 7500, 1500);
    const anim5 = createFloatingAnimation(bubble5Y, bubble5X, 8500, 8500, 2000);

    anim1.start(); anim2.start(); anim3.start(); anim4.start(); anim5.start();

    return () => {
      anim1.stop(); anim2.stop(); anim3.stop(); anim4.stop(); anim5.stop();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: '#342949' }]}>
      <LinearGradient
        colors={['#342949', '#342949', '#342949']}
        start={[0, 0]} end={[0, 1]}
        style={[styles.screenGradient, { height: screenHeight }]}
        pointerEvents="none"
      />

      <View style={styles.floatingBubbles} pointerEvents="none">
        <Animated.View style={[styles.bubble, { width: wp(50), height: wp(50), top: hp(5), right: -wp(12), backgroundColor: 'rgba(115, 123, 161, 0.2)' }, { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }]} />
        <Animated.View style={[styles.bubble, { width: wp(70), height: wp(70), top: -hp(10), left: -wp(20), backgroundColor: 'rgba(115, 123, 161, 0.15)' }, { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }]} />
        <Animated.View style={[styles.bubble, { width: wp(38), height: wp(38), bottom: hp(22), left: -wp(8), backgroundColor: 'rgba(115, 123, 161, 0.18)' }, { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }]} />
        <Animated.View style={[styles.bubble, { width: wp(45), height: wp(45), bottom: hp(10), right: -wp(15), backgroundColor: 'rgba(115, 123, 161, 0.16)' }, { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }]} />
        <Animated.View style={[styles.bubble, { width: wp(30), height: wp(30), top: '40%', right: wp(5), backgroundColor: 'rgba(115, 123, 161, 0.12)' }, { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }]} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>
              <Text style={styles.headerBlue}>All </Text>
            <Text style={styles.headerOrange}>Actions</Text>
          </Text>
        </View>

        {/* Connect with Therapist */}
        <TouchableOpacity activeOpacity={0.8} style={styles.cardWrapper} onPress={() => router.push('./connect-with-therapist?from=actions' as any)}>
          <LinearGradient colors={['#E6E0F8', '#D4C5F0']} style={styles.actionCard}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Connect with Therapist</Text>
                <Text style={styles.cardSubtitle}>Scan QR code or enter code manually to connect</Text>
              <View style={styles.actionRow}>
                <View style={styles.actionItem}>
                  <MaterialCommunityIcons name="qrcode-scan" size={wp(4.5)} color="#7C5CDB" />
                  <Text style={[styles.actionText, { color: '#7C5CDB' }]}>Scan QR</Text>
                </View>
                <View style={styles.actionItem}>
                  <MaterialIcons name="edit" size={wp(4.5)} color="#7C5CDB" />
                  <Text style={[styles.actionText, { color: '#7C5CDB' }]}>PIN</Text>
                </View>
              </View>
            </View>
            <View style={styles.imageContainer}>
              <Image source={require('../../assets/images/connect-icon.png')} style={styles.cardImage} resizeMode="contain" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Take a Mood Break */}
        <TouchableOpacity activeOpacity={0.8} style={styles.cardWrapper} onPress={() => router.push('./mood?from=actions' as any)}>
          <LinearGradient colors={['#C8E6C9', '#A5D6A7']} style={styles.actionCard}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Take a Mood Break</Text>
              <Text style={styles.cardSubtitle}>Track your emotions and identify triggers</Text>
              <View style={styles.actionRow}>
                <View style={styles.actionItem}>
                  <MaterialIcons name="mood" size={wp(4.5)} color="#4CAF50" />
                  <Text style={[styles.actionText, { color: '#4CAF50' }]}>Mood</Text>
                </View>
                <View style={styles.actionItem}>
                  <MaterialCommunityIcons name="lightning-bolt" size={wp(4.5)} color="#4CAF50" />
                  <Text style={[styles.actionText, { color: '#4CAF50' }]}>Triggers</Text>
                </View>
              </View>
            </View>
            <View style={styles.imageContainer}>
              <Image source={require('../../assets/images/mood-action.png')} style={styles.cardImage} resizeMode="contain" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Journalling */}
        <TouchableOpacity activeOpacity={0.8} style={styles.cardWrapper} onPress={() => router.push('./journal-list?from=actions' as any)}>
          <LinearGradient colors={['#BBDEFB', '#90CAF9']} style={styles.actionCard}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Journalling</Text>
              <Text style={styles.cardSubtitle}>Capture thoughts and reflect on your journey</Text>
              <View style={styles.actionRow}>
                <View style={styles.actionItem}>
                  <MaterialIcons name="edit-note" size={wp(4.5)} color="#2196F3" />
                  <Text style={[styles.actionText, { color: '#2196F3' }]}>Write</Text>
                </View>
                <View style={styles.actionItem}>
                  <MaterialIcons name="lock" size={wp(4.5)} color="#2196F3" />
                  <Text style={[styles.actionText, { color: '#2196F3' }]}>Private</Text>
                </View>
              </View>
            </View>
            <View style={styles.imageContainer}>
              <Image source={require('../../assets/images/journal-icon.png')} style={styles.cardImage} resizeMode="contain" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Add a Goal */}
        <TouchableOpacity activeOpacity={0.8} style={styles.cardWrapper} onPress={() => router.push('./goals?from=actions' as any)}>
          <LinearGradient colors={['#FFF9C4', '#FFF59D']} style={styles.actionCard}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Add a Goal</Text>
              <Text style={styles.cardSubtitle}>Set targets and track your progress</Text>
              <View style={styles.actionRow}>
                <View style={styles.actionItem}>
                  <MaterialCommunityIcons name="target" size={wp(4.5)} color="#F9A825" />
                  <Text style={[styles.actionText, { color: '#F9A825' }]}>New Goal</Text>
                </View>
                <View style={styles.actionItem}>
                  <MaterialIcons name="flag" size={wp(4.5)} color="#F9A825" />
                  <Text style={[styles.actionText, { color: '#F9A825' }]}>Priority</Text>
                </View>
              </View>
            </View>
            <View style={styles.imageContainer}>
              <Image source={require('../../assets/images/goal-icon.png')} style={styles.cardImage} resizeMode="contain" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* View Sessions */}
        <TouchableOpacity activeOpacity={0.8} style={styles.cardWrapper} onPress={() => router.push('./sessions?from=actions' as any)}>
          <LinearGradient colors={['#F8BBD0', '#F48FB1']} style={styles.actionCard}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>View Sessions</Text>
              <Text style={styles.cardSubtitle}>Track upcoming and past therapy sessions</Text>
              <View style={styles.actionRow}>
                <View style={styles.actionItem}>
                  <MaterialIcons name="schedule" size={wp(4.5)} color="#E91E63" />
                  <Text style={[styles.actionText, { color: '#E91E63' }]}>Upcoming</Text>
                </View>
                <View style={styles.actionItem}>
                  <MaterialIcons name="summarize" size={wp(4.5)} color="#E91E63" />
                  <Text style={[styles.actionText, { color: '#E91E63' }]}>Summary</Text>
                </View>
              </View>
            </View>
            <View style={styles.imageContainer}>
              <Image source={require('../../assets/images/session-icon.png')} style={styles.cardImage} resizeMode="contain" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Take a Break */}
        <TouchableOpacity activeOpacity={0.8} style={styles.cardWrapper} onPress={() => router.push('./take-a-break?from=actions' as any)}>
          <LinearGradient colors={['#B2EBF2', '#80DEEA']} style={styles.actionCard}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Take a Break</Text>
              <Text style={styles.cardSubtitle}>Relax with sounds and breathing exercises</Text>
              <View style={styles.actionRow}>
                <View style={styles.actionItem}>
                  <MaterialIcons name="music-note" size={wp(4.5)} color="#00ACC1" />
                  <Text style={[styles.actionText, { color: '#00ACC1' }]}>Sounds</Text>
                </View>
                <View style={styles.actionItem}>
                  <MaterialCommunityIcons name="hand-heart" size={wp(4.5)} color="#00ACC1" />
                  <Text style={[styles.actionText, { color: '#00ACC1' }]}>Meditation</Text>
                </View>
              </View>
            </View>
            <View style={styles.imageContainer}>
              <Image source={require('../../assets/images/break-icon.png')} style={styles.cardImage} resizeMode="contain" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Analytics */}
        <TouchableOpacity activeOpacity={0.8} style={styles.cardWrapper} onPress={() => router.push('./analytics?from=actions' as any)}>
          <LinearGradient colors={['#FFE0B2', '#FFCC80']} style={styles.actionCard}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Analytics</Text>
              <Text style={styles.cardSubtitle}>Insights into your mood and journal trends</Text>
              <View style={styles.actionRow}>
                <View style={styles.actionItem}>
                  <MaterialIcons name="show-chart" size={wp(4.5)} color="#F57C00" />
                  <Text style={[styles.actionText, { color: '#F57C00' }]}>Stats</Text>
                </View>
                <View style={styles.actionItem}>
                  <MaterialIcons name="lightbulb" size={wp(4.5)} color="#F57C00" />
                  <Text style={[styles.actionText, { color: '#F57C00' }]}>Insights</Text>
                </View>
              </View>
            </View>
            <View style={styles.imageContainer}>
              <Image source={require('../../assets/images/analytics-icon.png')} style={styles.cardImage} resizeMode="contain" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: hp(4) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenGradient: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 0 },
  floatingBubbles: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  bubble: { position: 'absolute', borderRadius: 9999 },
  headerContainer: { paddingTop: hp(8), paddingHorizontal: wp(5), paddingBottom: hp(2), zIndex: 2 },
  headerTitle: { fontSize: wp(7), fontWeight: '800', textAlign: 'center', letterSpacing: 0.3 },
  headerBlue: { color: '#FFFFFF' },
  headerOrange: { color: '#B8A8E6' },
  scroll: { flex: 1, zIndex: 2 },
  scrollContent: { paddingHorizontal: wp(4), paddingBottom: hp(2) },
  cardWrapper: {
    marginBottom: hp(1.6), borderRadius: wp(5),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 5, elevation: 4,
  },
  actionCard: {
    borderRadius: wp(5), paddingTop: hp(1.8), paddingBottom: 0,
    paddingLeft: wp(5), paddingRight: 0,
    flexDirection: 'row', alignItems: 'flex-end',
    overflow: 'hidden', minHeight: hp(15),
  },
  cardContent: {
    flex: 1, paddingRight: wp(2), paddingBottom: hp(1.8),
    justifyContent: 'flex-start',
  },
  cardTitle: { fontSize: Math.min(wp(4.8), 20), fontWeight: '700', color: '#111', marginBottom: hp(0.4), lineHeight: Math.min(wp(6), 26) },
  cardSubtitle: { fontSize: Math.min(wp(3), 15), color: '#333', marginBottom: hp(1.2), lineHeight: Math.min(wp(4.3), 20) },
  actionRow: { flexDirection: 'row', gap: wp(2) },
  actionItem: {
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: wp(3),
    paddingHorizontal: wp(3), paddingVertical: hp(0.7),
    flexDirection: 'row', alignItems: 'center', gap: wp(1.5),
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  actionText: { fontSize: Math.min(wp(3), 13), fontWeight: '600' },
  imageContainer: { width: wp(35), height: hp(15), justifyContent: 'flex-end', alignItems: 'center' },
  cardImage: { width: wp(33), height: hp(13.5) },
});
