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
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import PatientService from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import OriginalHeader from '../components/OriginalHeader';

export default function SessionsScreen() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [groupedSessions, setGroupedSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedTherapists, setExpandedTherapists] = useState<Set<string>>(new Set());

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
    loadSessions(activeTab);
  }, [activeTab]);

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

  const loadSessions = async (filter: 'upcoming' | 'past' = 'upcoming') => {
    try {
      setLoading(true);
      const data = await PatientService.getMySessions(filter, 50, 0);
      const sessions = Array.isArray(data) ? data : (data?.sessions || []);
      let flatSessions: any[] = [];
      if (Array.isArray(sessions)) {
        flatSessions = sessions;
      } else if (sessions && typeof sessions === 'object') {
        flatSessions = [...(sessions.upcoming || []), ...(sessions.past || [])];
      }

      // Group by therapist
      const groups: Record<string, any[]> = {};
      flatSessions.forEach((s: any) => {
        const t = s.therapist || null;
        const key = t && t.id ? String(t.id) : 'no_therapist';
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      });

      const grouped = Object.keys(groups).map((k) => ({
        therapist: groups[k][0]?.therapist || null,
        sessions: groups[k],
      }));
      setGroupedSessions(grouped);
    } catch (err: any) {
      console.error('[Sessions] load error', err);
      setGroupedSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionPress = (sessionId: string) => {
    router.push(`./session-detail?id=${sessionId}` as any);
  };

  const toggleTherapist = (therapistKey: string) => {
    setExpandedTherapists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(therapistKey)) {
        newSet.delete(therapistKey);
      } else {
        newSet.add(therapistKey);
      }
      return newSet;
    });
  };

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
            firstWord="My"
            secondWord="Sessions"
          />

          {/* Header */}
          <OriginalHeader
            scrollY={scrollY}
            firstWord="My"
            secondWord="Sessions"
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
            {/* Subtitle */}
            <Text style={styles.subtitle}>
              Track your therapy journey
            </Text>

            {/* Tab Buttons */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setActiveTab('upcoming')}
                style={{ flex: 1 }}
              >
                <View style={[styles.tab, activeTab === 'upcoming' ? styles.activeTab : styles.inactiveTab]}>
                  <Text style={[styles.tabText, activeTab === 'upcoming' ? styles.activeTabText : styles.inactiveTabText]}>
                    Upcoming
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setActiveTab('past')}
                style={{ flex: 1, marginLeft: 16 }}
              >
                <View style={[styles.tab, activeTab === 'past' ? styles.activeTab : styles.inactiveTab]}>
                  <Text style={[styles.tabText, activeTab === 'past' ? styles.activeTabText : styles.inactiveTabText]}>
                    Past
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Sessions List */}
            {loading ? (
              <ActivityIndicator size="large" color="#A78BFA" style={{ marginTop: 40 }} />
            ) : groupedSessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No sessions found.
                </Text>
              </View>
            ) : (
              groupedSessions.map((group: any, gidx: number) => {
                const therapistKey = `${group.therapist?.id || 'no'}-${gidx}`;
                const isExpanded = expandedTherapists.has(therapistKey);
                const sessionCount = group.sessions?.length || 0;
                
                return (
                <View key={`group-${gidx}-${group.therapist?.id || 'no'}`} style={styles.therapistGroup}>
                  {/* Therapist Header Card */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleTherapist(therapistKey)}
                    style={styles.therapistCard}
                  >
                    <View style={styles.therapistInfo}>
                      <LinearGradient
                        colors={['#8B7AC7', '#A78BFA']}
                        style={styles.avatarCircle}
                      >
                        <FontAwesome name="user-md" size={24} color="#fff" />
                      </LinearGradient>
                      <View style={styles.therapistDetails}>
                        <Text style={styles.therapistName}>
                          {group.therapist ? group.therapist.full_name : 'Other Sessions'}
                        </Text>
                        {group.therapist?.specialization && (
                          <View style={styles.specializationRow}>
                            <MaterialIcons name="local-hospital" size={14} color="#A78BFA" />
                            <Text style={styles.specialization}>
                              {group.therapist.specialization}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.sessionCountText}>
                          Click to view {sessionCount} scheduled {sessionCount === 1 ? 'session' : 'sessions'}
                        </Text>
                      </View>
                      <FontAwesome 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color="#A78BFA" 
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Session Cards - Only show when expanded */}
                  {isExpanded && group.sessions.map((session: any) => (
                    <TouchableOpacity
                      key={session.id}
                      activeOpacity={0.7}
                      onPress={() => handleSessionPress(session.id)}
                      style={styles.sessionCard}
                    >
                      <View style={styles.sessionContent}>
                        <View style={styles.sessionHeader}>
                          <Text style={styles.sessionNumber}>
                            {session.session_number
                              ? `Session ${session.session_number}`
                              : 'Session'}
                          </Text>
                          {activeTab === 'upcoming' && (
                            <View style={styles.upcomingPill}>
                              <Text style={styles.upcomingText}>Upcoming</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.sessionMeta}>
                          <View style={styles.metaRow}>
                            <FontAwesome name="calendar" size={13} color="#B8A8E6" />
                            <Text style={styles.metaText}>
                              {new Date(session.scheduled_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                          </View>
                          <View style={styles.metaRow}>
                            <FontAwesome name="clock-o" size={13} color="#B8A8E6" />
                            <Text style={styles.metaText}>
                              {new Date(session.scheduled_date).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <FontAwesome name="chevron-right" size={16} color="#B8A8E6" />
                    </TouchableOpacity>
                  ))}
                </View>
              );
              })
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
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
    color: '#B8A8E6',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  tab: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#A78BFA',
  },
  inactiveTab: {
    backgroundColor: '#5B5270',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  inactiveTabText: {
    color: '#B8A8E6',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#B8A8E6',
  },
  therapistGroup: {
    marginBottom: 24,
  },
  therapistCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#473F5A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  therapistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  therapistDetails: {
    marginLeft: 12,
    flex: 1,
  },
  therapistName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    color: '#FFFFFF',
  },
  specializationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specialization: {
    fontSize: 13,
    color: '#B8A8E6',
  },
  sessionCountText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    fontStyle: 'italic',
  },
  sessionCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#473F5A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  upcomingPill: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  upcomingText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionMeta: {
    flexDirection: 'row',
    gap: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
});
