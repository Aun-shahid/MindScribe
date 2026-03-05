import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { height: screenHeight } = Dimensions.get('window');

export default function AllActionsScreen() {
  const { themeStyle } = useTheme();

  // Animated values for floating bubbles
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

  // Animate bubbles
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
              Animated.timing(animatedY, {
                toValue: -30,
                duration: durationY,
                useNativeDriver: true,
              }),
              Animated.timing(animatedY, {
                toValue: 0,
                duration: durationY,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(animatedX, {
                toValue: 20,
                duration: durationX,
                useNativeDriver: true,
              }),
              Animated.timing(animatedX, {
                toValue: 0,
                duration: durationX,
                useNativeDriver: true,
              }),
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

    anim1.start();
    anim2.start();
    anim3.start();
    anim4.start();
    anim5.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      anim4.stop();
      anim5.stop();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: '#342949' }]}>
      {/* Gradient background */}
      <LinearGradient
        colors={['#342949', '#342949', '#342949']}
        start={[0, 0]}
        end={[0, 1]}
        style={[styles.screenGradient, { height: screenHeight }]}
        pointerEvents="none"
      />
      {/* Floating bubble decorations with animation */}
      <View style={styles.floatingBubbles} pointerEvents="none">
        <Animated.View style={[
          styles.bubble,
          { width: 200, height: 200, top: 50, right: -50, backgroundColor: 'rgba(115, 123, 161, 0.2)' },
          { transform: [{ translateY: bubble1Y }, { translateX: bubble1X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 280, height: 280, top: -100, left: -80, backgroundColor: 'rgba(115, 123, 161, 0.15)' },
          { transform: [{ translateY: bubble2Y }, { translateX: bubble2X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 150, height: 150, bottom: 200, left: -30, backgroundColor: 'rgba(115, 123, 161, 0.18)' },
          { transform: [{ translateY: bubble3Y }, { translateX: bubble3X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 180, height: 180, bottom: 100, right: -60, backgroundColor: 'rgba(115, 123, 161, 0.16)' },
          { transform: [{ translateY: bubble4Y }, { translateX: bubble4X }] }
        ]} />
        <Animated.View style={[
          styles.bubble,
          { width: 120, height: 120, top: '40%', right: 20, backgroundColor: 'rgba(115, 123, 161, 0.12)' },
          { transform: [{ translateY: bubble5Y }, { translateX: bubble5X }] }
        ]} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerContainer, { backgroundColor: 'transparent' }]}>
          <Text style={[styles.headerTitle]}>
            <Text style={styles.headerBlue}>All </Text>
            <Text style={styles.headerOrange}>Actions</Text>
          </Text>
        </View>

        {/* Connect with Therapist Card */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('./connect-with-therapist' as any)}>
          <LinearGradient colors={['#E6E0F8', '#D4C5F0']} style={styles.actionCard}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Connect with Therapist</Text>
              <Text style={styles.cardSubtitle}>Scan QR code or enter code manually to connect</Text>
              
              <View style={styles.actionRow}>
                <View style={styles.actionItem}>
                  <MaterialCommunityIcons name="qrcode-scan" size={20} color="#7C5CDB" />
                  <Text style={[styles.actionText, { color: '#7C5CDB' }]}>Scan QR</Text>
                </View>
                <View style={styles.actionItem}>
                  <MaterialIcons name="edit" size={20} color="#7C5CDB" />
                  <Text style={[styles.actionText, { color: '#7C5CDB' }]}>PIN</Text>
                </View>
              </View>
            </View>
            <Image source={require('../../assets/images/connect-icon.png')} style={styles.cardImage} resizeMode="contain" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Take a Mood Break Card */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('./mood' as any)}>
          <LinearGradient colors={['#C8E6C9', '#A5D6A7']} style={styles.actionCard}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Take a Mood Break</Text>
            <Text style={styles.cardSubtitle}>Track your emotions and identify triggers</Text>
            
            <View style={styles.actionRow}>
              <View style={styles.actionItem}>
                <MaterialIcons name="mood" size={20} color="#4CAF50" />
                <Text style={[styles.actionText, { color: '#4CAF50' }]}>Mood</Text>
              </View>
              <View style={styles.actionItem}>
                <MaterialCommunityIcons name="lightning-bolt" size={20} color="#4CAF50" />
                <Text style={[styles.actionText, { color: '#4CAF50' }]}>Triggers</Text>
              </View>
            </View>
          </View>
          <Image source={require('../../assets/images/mood-action.png')} style={styles.cardImage} resizeMode="contain" />
        </LinearGradient>
        </TouchableOpacity>

        {/* Journalling Card */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('./journal-list' as any)}>
          <LinearGradient colors={['#BBDEFB', '#90CAF9']} style={styles.actionCard}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Journalling</Text>
            <Text style={styles.cardSubtitle}>Capture thoughts and reflect on your journey</Text>
            
            <View style={styles.actionRow}>
              <View style={styles.actionItem}>
                <MaterialIcons name="edit-note" size={20} color="#2196F3" />
                <Text style={[styles.actionText, { color: '#2196F3' }]}>Write</Text>
              </View>
              <View style={styles.actionItem}>
                <MaterialIcons name="lock" size={20} color="#2196F3" />
                <Text style={[styles.actionText, { color: '#2196F3' }]}>Private</Text>
              </View>
            </View>
          </View>
          <Image source={require('../../assets/images/journal-icon.png')} style={styles.cardImage} resizeMode="contain" />
        </LinearGradient>
        </TouchableOpacity>

        {/* Add a Goal Card */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('./goals' as any)}>
          <LinearGradient colors={['#FFF9C4', '#FFF59D']} style={styles.actionCard}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Add a Goal</Text>
            <Text style={styles.cardSubtitle}>Set targets and track your progress</Text>
            
            <View style={styles.actionRow}>
              <View style={styles.actionItem}>
                <MaterialCommunityIcons name="target" size={20} color="#F9A825" />
                <Text style={[styles.actionText, { color: '#F9A825' }]}>New Goal</Text>
              </View>
              <View style={styles.actionItem}>
                <MaterialIcons name="flag" size={20} color="#F9A825" />
                <Text style={[styles.actionText, { color: '#F9A825' }]}>Priority</Text>
              </View>
            </View>
          </View>
          <Image source={require('../../assets/images/goal-icon.png')} style={styles.cardImage} resizeMode="contain" />
        </LinearGradient>
        </TouchableOpacity>

        {/* View Sessions Card */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('./sessions' as any)}>
          <LinearGradient colors={['#F8BBD0', '#F48FB1']} style={styles.actionCard}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>View Sessions</Text>
            <Text style={styles.cardSubtitle}>Track upcoming and past therapy sessions</Text>
            
            <View style={styles.actionRow}>
              <View style={styles.actionItem}>
                <MaterialIcons name="schedule" size={20} color="#E91E63" />
                <Text style={[styles.actionText, { color: '#E91E63' }]}>Upcoming</Text>
              </View>
              <View style={styles.actionItem}>
                <MaterialIcons name="summarize" size={20} color="#E91E63" />
                <Text style={[styles.actionText, { color: '#E91E63' }]}>Summary</Text>
              </View>
            </View>
          </View>
          <Image source={require('../../assets/images/session-icon.png')} style={styles.cardImage} resizeMode="contain" />
        </LinearGradient>
        </TouchableOpacity>

        {/* Take a Break Card */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('./take-a-break' as any)}>
          <LinearGradient colors={['#B2EBF2', '#80DEEA']} style={styles.actionCard}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Take a Break</Text>
            <Text style={styles.cardSubtitle}>Relax with sounds and breathing exercises</Text>
            
            <View style={styles.actionRow}>
              <View style={styles.actionItem}>
                <MaterialIcons name="music-note" size={20} color="#00ACC1" />
                <Text style={[styles.actionText, { color: '#00ACC1' }]}>Sounds</Text>
              </View>
              <View style={styles.actionItem}>
                <MaterialCommunityIcons name="hand-heart" size={20} color="#00ACC1" />
                <Text style={[styles.actionText, { color: '#00ACC1' }]}>Meditation</Text>
              </View>
            </View>
          </View>
          <Image source={require('../../assets/images/break-icon.png')} style={styles.cardImage} resizeMode="contain" />
        </LinearGradient>
        </TouchableOpacity>

        {/* Analytics Card */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('./analytics' as any)}>
          <LinearGradient colors={['#FFE0B2', '#FFCC80']} style={styles.actionCard}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Analytics</Text>
            <Text style={styles.cardSubtitle}>Insights into your mood and journal trends</Text>
            
            <View style={styles.actionRow}>
              <View style={styles.actionItem}>
                <MaterialIcons name="show-chart" size={20} color="#F57C00" />
                <Text style={[styles.actionText, { color: '#F57C00' }]}>Stats</Text>
              </View>
              <View style={styles.actionItem}>
                <MaterialIcons name="lightbulb" size={20} color="#F57C00" />
                <Text style={[styles.actionText, { color: '#F57C00' }]}>Insights</Text>
              </View>
            </View>
          </View>
          <Image source={require('../../assets/images/analytics-icon.png')} style={styles.cardImage} resizeMode="contain" />
        </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 0,
  },
  floatingBubbles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 1000,
  },
  headerContainer: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 8,
    zIndex: 2,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 72,
    padding: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerBlue: { color: '#FFFFFF' },
  headerOrange: { color: '#B8A8E6' },
  scroll: { 
    flex: 1, 
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 2,
  },
  actionCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 3,
  },
  cardContent: {
    flex: 1,
    paddingRight: 5,
    maxWidth: '58%',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#333',
    marginBottom: 15,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardImage: {
    width: 175,
    height: 175,
    marginLeft: 8,
  },
});
