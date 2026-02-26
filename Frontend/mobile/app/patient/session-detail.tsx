import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import PatientService from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import OriginalHeader from '../components/OriginalHeader';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Bubble animations
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

  // Scroll animation for sticky header
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (id) {
      loadSessionDetail(String(id));
    }
  }, [id]);

  // Bubble animation effect
  useEffect(() => {
    const createFloatingAnimation = (
      animatedValueY: Animated.Value,
      animatedValueX: Animated.Value,
      durationY: number,
      durationX: number,
      delayY: number = 0,
      delayX: number = 0
    ) => {
      const animateY = () => {
        Animated.sequence([
          Animated.delay(delayY),
          Animated.loop(
            Animated.sequence([
              Animated.timing(animatedValueY, {
                toValue: 50,
                duration: durationY / 2,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValueY, {
                toValue: -50,
                duration: durationY / 2,
                useNativeDriver: true,
              }),
            ])
          ),
        ]).start();
      };

      const animateX = () => {
        Animated.sequence([
          Animated.delay(delayX),
          Animated.loop(
            Animated.sequence([
              Animated.timing(animatedValueX, {
                toValue: 30,
                duration: durationX / 2,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValueX, {
                toValue: -30,
                duration: durationX / 2,
                useNativeDriver: true,
              }),
            ])
          ),
        ]).start();
      };

      animateY();
      animateX();
    };

    createFloatingAnimation(bubble1Y, bubble1X, 8000, 6000, 0, 500);
    createFloatingAnimation(bubble2Y, bubble2X, 10000, 7000, 1000, 0);
    createFloatingAnimation(bubble3Y, bubble3X, 9000, 8000, 500, 1500);
    createFloatingAnimation(bubble4Y, bubble4X, 11000, 6500, 1500, 1000);
    createFloatingAnimation(bubble5Y, bubble5X, 8500, 7500, 800, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSessionDetail = async (sessionId: string) => {
    try {
      setLoading(true);
      const data = await PatientService.getSession(sessionId);
      setSession(data);
    } catch (err: any) {
      console.error('[SessionDetail] load error', err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#342949', '#2a1f3d', '#342949']}
          style={styles.screenGradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <FontAwesome name="chevron-left" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                <Text style={styles.headerWhite}>Session </Text>
                <Text style={styles.headerPurple}>Details</Text>
              </Text>
            </View>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#A78BFA" />
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#342949', '#2a1f3d', '#342949']}
          style={styles.screenGradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <FontAwesome name="chevron-left" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                <Text style={styles.headerWhite}>Session </Text>
                <Text style={styles.headerPurple}>Details</Text>
              </Text>
            </View>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Session not found
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#342949', '#2a1f3d', '#342949']}
        style={styles.screenGradient}
      >
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '10%',
              left: '5%',
              width: 120,
              height: 120,
              transform: [
                { translateY: bubble1Y },
                { translateX: bubble1X },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '30%',
              right: '-5%',
              width: 100,
              height: 100,
              transform: [
                { translateY: bubble2Y },
                { translateX: bubble2X },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '50%',
              left: '-8%',
              width: 90,
              height: 90,
              transform: [
                { translateY: bubble3Y },
                { translateX: bubble3X },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              bottom: '20%',
              right: '10%',
              width: 110,
              height: 110,
              transform: [
                { translateY: bubble4Y },
                { translateX: bubble4X },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            {
              bottom: '40%',
              left: '15%',
              width: 95,
              height: 95,
              transform: [
                { translateY: bubble5Y },
                { translateX: bubble5X },
              ],
            },
          ]}
        />

        <SafeAreaView style={styles.safeArea}>
          {/* Sticky Header - Appears on scroll */}
          <StickyHeader
            scrollY={scrollY}
            firstWord="Session"
            secondWord="Details"
            onBackPress={() => router.push('./sessions')}
          />

          <Animated.ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
          >
            {/* Original Header */}
            <OriginalHeader
              scrollY={scrollY}
              firstWord="Session"
              secondWord="Details"
              onBackPress={() => router.push('./sessions')}
            />
            {/* Session Number & Date */}
            <View style={styles.infoCard}>
              <View style={styles.iconRow}>
                <MaterialIcons name="event-note" size={24} color="#A78BFA" />
                <Text style={styles.cardTitle}>Session Info</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Session:</Text>
                <Text style={styles.infoValue}>
                  {session.session_number ? `#${session.session_number}` : 'N/A'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>
                  {new Date(session.scheduled_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time:</Text>
                <Text style={styles.infoValue}>
                  {new Date(session.scheduled_date).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </View>

              {session.status && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status:</Text>
                  <Text style={styles.infoValue}>
                    {session.status}
                  </Text>
                </View>
              )}
            </View>

            {/* Session Summary */}
            {session.session_summary && (
              <View style={styles.infoCard}>
                <View style={styles.iconRow}>
                  <MaterialIcons name="description" size={24} color="#A78BFA" />
                  <Text style={styles.cardTitle}>Session Summary</Text>
                </View>
                <Text style={styles.bodyText}>
                  {session.session_summary}
                </Text>
              </View>
            )}

            {/* Patient Goals */}
            {session.patient_goals && (
              <View style={styles.infoCard}>
                <View style={styles.iconRow}>
                  <MaterialIcons name="track-changes" size={24} color="#A78BFA" />
                  <Text style={styles.cardTitle}>Goals</Text>
                </View>
                <Text style={styles.bodyText}>
                  {session.patient_goals}
                </Text>
              </View>
            )}

            {/* Homework Assigned */}
            {session.homework_assigned && (
              <View style={styles.infoCard}>
                <View style={styles.iconRow}>
                  <MaterialIcons name="assignment" size={24} color="#A78BFA" />
                  <Text style={styles.cardTitle}>Homework</Text>
                </View>
                <Text style={styles.bodyText}>
                  {session.homework_assigned}
                </Text>
              </View>
            )}

            {/* Next Session Goals */}
            {session.next_session_goals && (
              <View style={styles.infoCard}>
                <View style={styles.iconRow}>
                  <MaterialIcons name="flag" size={24} color="#A78BFA" />
                  <Text style={styles.cardTitle}>Next Goals</Text>
                </View>
                <Text style={styles.bodyText}>
                  {session.next_session_goals}
                </Text>
              </View>
            )}

            <View style={{ height: 30 }} />
          </Animated.ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenGradient: {
    flex: 1,
    position: 'relative',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(133, 130, 180, 0.15)',
  },
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#342949',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 50,
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
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#B8A8E6',
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
    backgroundColor: '#473F5A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B8A8E6',
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
    marginLeft: 10,
    textAlign: 'right',
    color: '#FFFFFF',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#FFFFFF',
  },
});
