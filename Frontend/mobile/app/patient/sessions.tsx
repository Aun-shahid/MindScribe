import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PatientService from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import TabLoaderCard from '../components/TabLoaderCard';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const CARD_GRAD: readonly [string, string, string] = [
  'rgba(255,179,107,0.11)',
  'rgba(167,139,250,0.08)',
  'rgba(52,41,73,0.72)',
];

export default function SessionsScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ from?: string }>();
  const fromRaw = params.from;
  const fromParam = Array.isArray(fromRaw) ? fromRaw[0] : fromRaw;
  const fromRef = useRef(fromParam);
  useFocusEffect(useCallback(() => { if (fromParam) fromRef.current = fromParam; }, [fromParam]));
  const goBack = () => {
    if (fromRef.current === 'dashboard') {
      router.push('./dashboard' as any);
    } else {
      router.push('./actions' as any);
    }
  };

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [groupedSessions, setGroupedSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedTherapists, setExpandedTherapists] = useState<Set<string>>(new Set());
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);

  const b1y = useRef(new Animated.Value(0)).current;
  const b1x = useRef(new Animated.Value(0)).current;
  const b2y = useRef(new Animated.Value(0)).current;
  const b2x = useRef(new Animated.Value(0)).current;
  const b3y = useRef(new Animated.Value(0)).current;
  const b3x = useRef(new Animated.Value(0)).current;
  const b4y = useRef(new Animated.Value(0)).current;
  const b4x = useRef(new Animated.Value(0)).current;
  const b5y = useRef(new Animated.Value(0)).current;
  const b5x = useRef(new Animated.Value(0)).current;

  const scrollY = useRef(new Animated.Value(0)).current;

  const pageInset               = clamp(width * 0.03, 12, 18);
  const sectionInset            = clamp(width * 0.04, 14, 20);
  const headerTopPadding        = insets.top + clamp(height * 0.014, 10, 18);
  const headerBottomPadding     = clamp(height * 0.02, 14, 22);
  const headerButtonSize        = clamp(width * 0.098, 34, 40);
  const headerButtonRadius      = headerButtonSize / 2;
  const headerIconSize          = clamp(width * 0.047, 16, 20);
  const headerTitleSize         = clamp(width * 0.072, 24, 30);
  const headerTitleMarginTop    = clamp(height * 0.022, 14, 22);
  const headerEstimatedHeight   = headerTopPadding + headerTitleMarginTop + headerTitleSize + headerBottomPadding;
  const headerFadeDistance      = clamp(height * 0.022, 14, 20);

  const bubbleLarge  = clamp(width * 0.74, 220, 310);
  const bubbleMedium = clamp(width * 0.52, 170, 230);
  const bubbleSmall  = clamp(width * 0.32,  96, 132);

  const contentTopPadding    = headerEstimatedHeight + clamp(height * 0.022, 14, 20);
  const contentBottomPadding = clamp(insets.bottom + height * 0.04, 30, 46);
  const menuBarPadding       = clamp(width * 0.008, 2, 4);
  const menuTabVerticalPadding   = clamp(height * 0.012, 8, 10);
  const menuTabHorizontalPadding = clamp(width * 0.022, 8, 12);
  const menuTabTextSize          = clamp(width * 0.033, 12, 13);
  const groupGap            = clamp(height * 0.028, 18, 24);
  const therapistPad        = clamp(width * 0.045, 14, 18);
  const therapistRadius     = clamp(width * 0.042, 14, 16);
  const avatarSize          = clamp(width * 0.145, 48, 56);
  const therapistNameSize   = clamp(width * 0.043, 15, 17);
  const specializationSize  = clamp(width * 0.033, 12, 13);
  const countSize           = clamp(width * 0.031, 11, 12);
  const sessionPad          = clamp(width * 0.042, 14, 16);
  const sessionRadius       = clamp(width * 0.038, 13, 15);
  const sessionNumberSize   = clamp(width * 0.04, 14, 16);
  const pillPadX            = clamp(width * 0.026, 9, 10);
  const pillPadY            = clamp(height * 0.006, 4, 5);
  const pillRadius          = clamp(width * 0.025, 8, 10);
  const modalWidth          = clamp(width * 0.9, 320, 420);
  const modalMaxHeight      = clamp(height * 0.78, 420, 620);
  const modalRadius         = clamp(width * 0.05, 18, 22);
  const modalPadding        = clamp(width * 0.05, 16, 22);
  const modalTitleSize      = clamp(width * 0.06, 20, 24);
  const modalMetaLabelSize  = clamp(width * 0.029, 10, 11);
  const modalMetaValueSize  = clamp(width * 0.039, 14, 16);

  useFocusEffect(
    useCallback(() => {
      [b1y,b1x,b2y,b2x,b3y,b3x,b4y,b4x,b5y,b5x].forEach((v) => v.setValue(0));
      const fly = (y: Animated.Value, x: Animated.Value, dY: number, dX: number) => {
        const c = Animated.parallel([
          Animated.loop(Animated.sequence([
            Animated.timing(y, { toValue: -50, duration: dY, useNativeDriver: true }),
            Animated.timing(y, { toValue:  50, duration: dY, useNativeDriver: true }),
          ])),
          Animated.loop(Animated.sequence([
            Animated.timing(x, { toValue:  30, duration: dX, useNativeDriver: true }),
            Animated.timing(x, { toValue: -30, duration: dX, useNativeDriver: true }),
          ])),
        ]);
        c.start();
        return c;
      };
      const anims = [
        fly(b1y, b1x, 8000,  7000),
        fly(b2y, b2x, 10000, 8000),
        fly(b3y, b3x, 9000,  7500),
        fly(b4y, b4x, 8500,  7200),
        fly(b5y, b5x, 9500,  8200),
      ];
      return () => anims.forEach((a) => a.stop());
    }, [b1x,b1y,b2x,b2y,b3x,b3y,b4x,b4y,b5x,b5y])
  );

  useFocusEffect(
    useCallback(() => { loadSessions(activeTab); }, [activeTab])
  );

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

  const handleSessionPress = (sessionData: any) => {
    setSelectedSession(sessionData);
    setSessionModalVisible(true);
  };

  const closeSessionModal = () => {
    setSessionModalVisible(false);
    setSelectedSession(null);
  };

  const openSessionDetailPage = () => {
    if (!selectedSession?.id) return;
    const sessionId = String(selectedSession.id);
    closeSessionModal();
    router.push(`./session-detail?id=${sessionId}` as any);
  };

  const formatStatus = (status?: string | null) => {
    if (!status) return '';
    return String(status).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const toggleTherapist = (therapistKey: string) => {
    setExpandedTherapists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(therapistKey)) { newSet.delete(therapistKey); } else { newSet.add(therapistKey); }
      return newSet;
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#342949', '#2A1F3D', '#342949']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      {/* Bubbles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[styles.bubble, { width: bubbleMedium, height: bubbleMedium, top: clamp(height * 0.06, 34, 62), right: -clamp(width * 0.12, 36, 56), backgroundColor: 'rgba(167,139,250,0.25)', transform: [{ translateY: b1y }, { translateX: b1x }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleLarge, height: bubbleLarge, top: -clamp(height * 0.12, 80, 120), left: -clamp(width * 0.18, 56, 88), backgroundColor: 'rgba(184,168,230,0.20)', transform: [{ translateY: b2y }, { translateX: b2x }] }]} />
        <Animated.View style={[styles.bubble, { width: clamp(width * 0.4, 120, 170), height: clamp(width * 0.4, 120, 170), bottom: clamp(height * 0.24, 160, 230), left: -clamp(width * 0.08, 20, 36), backgroundColor: 'rgba(167,139,250,0.22)', transform: [{ translateY: b3y }, { translateX: b3x }] }]} />
        <Animated.View style={[styles.bubble, { width: clamp(width * 0.48, 150, 200), height: clamp(width * 0.48, 150, 200), bottom: clamp(height * 0.12, 80, 120), right: -clamp(width * 0.14, 42, 70), backgroundColor: 'rgba(184,168,230,0.18)', transform: [{ translateY: b4y }, { translateX: b4x }] }]} />
        <Animated.View style={[styles.bubble, { width: bubbleSmall, height: bubbleSmall, top: '40%', right: clamp(width * 0.05, 14, 24), backgroundColor: 'rgba(167,139,250,0.15)', transform: [{ translateY: b5y }, { translateX: b5x }] }]} />
      </View>

      <View style={styles.safeArea}>
        <StickyHeader scrollY={scrollY} firstWord="My" secondWord="Sessions" onBackPress={goBack} />

        {/* ── Header row: back button + title in flex row (no absolute positioning) ── */}
        <Animated.View style={[styles.headerContainer, {
          paddingTop: headerTopPadding,
          paddingHorizontal: pageInset,
          paddingBottom: headerBottomPadding,
          opacity: scrollY.interpolate({ inputRange: [0, headerFadeDistance * 0.45, headerFadeDistance], outputRange: [1, 0, 0], extrapolate: 'clamp' }),
          transform: [{ translateY: scrollY.interpolate({ inputRange: [0, headerFadeDistance], outputRange: [0, -10], extrapolate: 'clamp' }) }],
        }]}>
          {/* ── FIXED back button: flex-row sibling, hitSlop, zIndex 1000 ── */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={goBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[styles.backBtnCircle, {
                width: headerButtonSize,
                height: headerButtonSize,
                borderRadius: headerButtonRadius,
              }]}
            >
              <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop }]}>
              <Text style={styles.headerWhite}>My </Text>
              <Text style={styles.headerPurple}>Sessions</Text>
            </Text>

            {/* Spacer so title stays centred */}
            <View style={{ width: headerButtonSize }} />
          </View>
        </Animated.View>

        {/* ── Loading: vertically centred on page ── */}
        {loading ? (
          <View style={styles.loaderCenter}>
            <TabLoaderCard spinnerColor="#A78BFA" fullScreen={false} />
          </View>
        ) : (
          <Animated.ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingHorizontal: sectionInset, paddingTop: contentTopPadding, paddingBottom: contentBottomPadding }}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
          >
            {/* Tab buttons */}
            <View style={[styles.tabContainer, { marginTop: clamp(height * 0.004, 2, 4), marginBottom: clamp(height * 0.03, 20, 24) }]}>
              <View style={[styles.menuBarContainer, { padding: menuBarPadding }]}>
                {(['upcoming', 'past'] as const).map((t) => (
                  <TouchableOpacity key={t} activeOpacity={0.85} onPress={() => setActiveTab(t)} style={styles.menuTabButton}>
                    {activeTab === t ? (
                      <LinearGradient colors={['#FF5AA8', '#FFB36B']} start={[0,0]} end={[1,0]} style={[styles.menuTabActive, { paddingVertical: menuTabVerticalPadding, paddingHorizontal: menuTabHorizontalPadding }]}>
                        <Text style={[styles.menuTabActiveText, { fontSize: menuTabTextSize }]}>{t === 'upcoming' ? 'Upcoming' : 'Past'}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.menuTabInactive, { paddingVertical: menuTabVerticalPadding, paddingHorizontal: menuTabHorizontalPadding }]}>
                        <Text style={[styles.menuTabInactiveText, { fontSize: menuTabTextSize }]}>{t === 'upcoming' ? 'Upcoming' : 'Past'}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {groupedSessions.length === 0 ? (
              <View style={[styles.emptyContainer, { marginTop: clamp(height * 0.08, 48, 60) }]}>
                <Text style={[styles.emptyText, { fontSize: clamp(width * 0.04, 15, 16) }]}>No sessions found.</Text>
              </View>
            ) : (
              groupedSessions.map((group: any, gidx: number) => {
                const therapistKey = `${group.therapist?.id || 'no'}-${gidx}`;
                const isExpanded = expandedTherapists.has(therapistKey);
                const sessionCount = group.sessions?.length || 0;

                return (
                  <View key={`group-${gidx}-${group.therapist?.id || 'no'}`} style={[styles.therapistGroup, { marginBottom: groupGap }]}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => toggleTherapist(therapistKey)} style={[styles.therapistCard, { borderRadius: therapistRadius, marginBottom: clamp(height * 0.015, 10, 12) }]}>
                      <LinearGradient colors={CARD_GRAD} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={[StyleSheet.absoluteFill, { borderRadius: therapistRadius }]} pointerEvents="none" />
                      <View style={[styles.therapistAccentBar, { borderTopLeftRadius: therapistRadius, borderTopRightRadius: therapistRadius }]} />
                      <View style={[styles.therapistCardBody, { padding: therapistPad }]}>
                        <View style={styles.therapistInfo}>
                          <LinearGradient colors={['#8B7AC7', '#A78BFA']} style={[styles.avatarCircle, { width: avatarSize, height: avatarSize, borderRadius: clamp(width * 0.04, 14, 16) }]}>
                            <FontAwesome name="user-md" size={clamp(width * 0.06, 20, 24)} color="#fff" />
                          </LinearGradient>
                          <View style={[styles.therapistDetails, { marginLeft: clamp(width * 0.03, 10, 12) }]}>
                            <Text style={[styles.therapistName, { fontSize: therapistNameSize }]}>{group.therapist ? group.therapist.full_name : 'Other Sessions'}</Text>
                            <Text style={styles.therapistEyebrow}>THERAPIST</Text>
                          </View>
                          <View style={styles.expandPill}>
                            <FontAwesome name={isExpanded ? 'chevron-up' : 'chevron-down'} size={clamp(width * 0.04, 14, 16)} color="#EADFFF" />
                          </View>
                        </View>
                        <View style={styles.therapistMetaRow}>
                          {group.therapist?.specialization ? (
                            <View style={styles.specializationPill}>
                              <MaterialIcons name="local-hospital" size={clamp(width * 0.034, 11, 13)} color="#CBB7FF" />
                              <Text style={[styles.specialization, { fontSize: specializationSize }]}>{group.therapist.specialization}</Text>
                            </View>
                          ) : null}
                          <View style={styles.sessionCountPill}>
                            <FontAwesome name="calendar-check-o" size={clamp(width * 0.034, 11, 13)} color="#FFB36B" />
                            <Text style={[styles.sessionCountValue, { fontSize: countSize }]}>{sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}</Text>
                          </View>
                        </View>
                        <Text style={[styles.sessionCountText, { fontSize: countSize, marginTop: clamp(height * 0.008, 4, 6) }]}>
                          {isExpanded ? 'Tap to hide the session list' : "Tap to view this therapist's sessions"}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.sessionStack}>
                        {group.sessions.map((session: any, index: number) => (
                          <TouchableOpacity
                            key={session.id} activeOpacity={0.78}
                            onPress={() => handleSessionPress(session)}
                            style={[styles.sessionCard, { padding: sessionPad, borderRadius: sessionRadius, marginBottom: index === group.sessions.length - 1 ? 0 : clamp(height * 0.015, 10, 12) }]}
                          >
                            <LinearGradient colors={CARD_GRAD} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={[StyleSheet.absoluteFill, { borderRadius: sessionRadius }]} pointerEvents="none" />
                            <View style={[styles.sessionAccent, { backgroundColor: activeTab === 'upcoming' ? '#FFB36B' : '#A78BFA' }]} />
                            <View style={styles.sessionCardBody}>
                              <View style={styles.sessionHeaderCompact}>
                                <View style={styles.sessionHeaderLeft}>
                                  <Text style={[styles.sessionNumber, { fontSize: sessionNumberSize }]}>{session.session_number ? `Session ${session.session_number}` : 'Session'}</Text>
                                  <Text style={styles.sessionCompactMeta}>
                                    {new Date(session.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    {'  •  '}
                                    {new Date(session.scheduled_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                  </Text>
                                </View>
                                <View style={styles.sessionHeaderRight}>
                                  <View style={[styles.upcomingPill, { paddingHorizontal: pillPadX, paddingVertical: pillPadY, borderRadius: pillRadius }]}>
                                    <Text style={styles.upcomingText}>{activeTab === 'upcoming' ? 'Upcoming' : 'Past'}</Text>
                                  </View>
                                  <View style={styles.sessionArrowBubble}>
                                    <FontAwesome name="chevron-right" size={clamp(width * 0.036, 12, 14)} color="#EDE4FF" />
                                  </View>
                                </View>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
            <View style={{ height: 30 }} />
          </Animated.ScrollView>
        )}

        <Modal visible={sessionModalVisible} transparent animationType="fade" onRequestClose={closeSessionModal}>
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={styles.modalDismissLayer} activeOpacity={1} onPress={closeSessionModal} />
            <View style={[styles.modalShell, { width: modalWidth, maxHeight: modalMaxHeight, borderRadius: modalRadius }]}>
              <LinearGradient colors={['#40345D', '#2E2545']} start={[0,0]} end={[1,1]} style={[styles.modalCard, { borderRadius: modalRadius, padding: modalPadding, maxHeight: modalMaxHeight }]}>
                <View style={styles.modalAccentBar} />
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalHeaderTextWrap}>
                    <Text style={[styles.modalEyebrow, { fontSize: modalMetaLabelSize }]}>SESSION SNAPSHOT</Text>
                    <View style={styles.modalTitleRow}>
                      <Text style={[styles.modalTitle, { fontSize: modalTitleSize }]}>{selectedSession?.session_number ? `Session ${selectedSession.session_number}` : 'Session Details'}</Text>
                      {selectedSession?.status ? (
                        <View style={[styles.modalStatusPill, styles.modalStatusPillInline]}>
                          <Text style={styles.modalStatusText}>{formatStatus(selectedSession.status)}</Text>
                        </View>
                      ) : null}
                    </View>
                    {selectedSession?.therapist?.full_name ? <Text style={styles.modalTherapistName}>{selectedSession.therapist.full_name}</Text> : null}
                  </View>
                  <TouchableOpacity style={styles.modalCloseBubble} onPress={closeSessionModal}>
                    <FontAwesome name="times" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalInfoGrid}>
                  <View style={styles.modalInfoTile}>
                    <View style={styles.modalIconWrap}><FontAwesome name="calendar" size={14} color="#C4B0FF" /></View>
                    <Text style={[styles.modalInfoLabel, { fontSize: modalMetaLabelSize }]}>Date</Text>
                    <Text style={[styles.modalInfoValue, { fontSize: modalMetaValueSize }]}>{selectedSession ? new Date(selectedSession.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : ''}</Text>
                  </View>
                  <View style={styles.modalInfoTile}>
                    <View style={[styles.modalIconWrap, styles.modalIconWarm]}><FontAwesome name="clock-o" size={14} color="#FFB36B" /></View>
                    <Text style={[styles.modalInfoLabel, { fontSize: modalMetaLabelSize }]}>Time</Text>
                    <Text style={[styles.modalInfoValue, { fontSize: modalMetaValueSize }]}>{selectedSession ? new Date(selectedSession.scheduled_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}</Text>
                  </View>
                </View>
                <View style={styles.modalFooterNoteWrap}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={openSessionDetailPage}
                    style={styles.modalDetailButton}
                  >
                    <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" />
                    <Text style={styles.modalDetailButtonText}>Open Full Session Details</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalFooterNote}>Tap outside or use the close button to dismiss.</Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  bubble:         { position: 'absolute', borderRadius: 9999 },
  safeArea:       { flex: 1 },

  // ── Header ────────────────────────────────────────────────────────────────
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 900 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtnCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    zIndex: 1000,
  },
  headerTitle:  { flex: 1, fontWeight: '800', textAlign: 'center' },
  headerWhite:  { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },

  // ── Loader centred vertically ─────────────────────────────────────────────
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll:       { flex: 1 },
  tabContainer:     { marginBottom: 24 },
  menuBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4A4458', borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  menuTabButton:       { flex: 1 },
  menuTabActive:       { borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  menuTabInactive:     { borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  menuTabActiveText:   { fontWeight: '600', color: '#FFFFFF' },
  menuTabInactiveText: { fontWeight: '600', color: '#A0A0A0' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText:      { color: '#B8A8E6' },
  therapistGroup: { marginBottom: 24 },
  therapistCard: { overflow: 'hidden', backgroundColor: '#3F3752', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', shadowColor: '#120A24', shadowOpacity: 0.22, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 7 },
  therapistAccentBar:  { height: 3, width: '100%', backgroundColor: '#A78BFA' },
  therapistCardBody:   { padding: 16 },
  therapistInfo:       { flexDirection: 'row', alignItems: 'flex-start' },
  avatarCircle:        { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  therapistDetails:    { marginLeft: 12, flex: 1 },
  therapistName:       { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  therapistEyebrow:    { marginTop: 4, color: '#9D8EC7', fontSize: 10, letterSpacing: 1.2, fontWeight: '700' },
  therapistMetaRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  specializationPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(167,139,250,0.14)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.28)' },
  specialization:    { fontSize: 13, color: '#E7DDF8' },
  sessionCountPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,179,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,179,107,0.28)' },
  sessionCountValue: { color: '#FFE2BE', fontWeight: '700' },
  sessionCountText:  { fontSize: 12, color: '#B8A8E6', marginTop: 6, lineHeight: 18 },
  expandPill:        { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  sessionStack: { marginTop: -2, paddingLeft: 10 },
  sessionCard: { overflow: 'hidden', backgroundColor: '#3F3752', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', shadowColor: '#120A24', shadowOpacity: 0.22, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 7 },
  sessionAccent:        { position: 'absolute', top: 0, bottom: 0, left: 0, width: 3 },
  sessionCardBody:      { paddingLeft: 8 },
  sessionHeaderCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionHeaderLeft:    { flex: 1, paddingRight: 10 },
  sessionHeaderRight:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  sessionNumber:        { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  sessionCompactMeta:   { marginTop: 4, color: '#9D8EC7', fontSize: 11, letterSpacing: 0.4 },
  upcomingPill:         { backgroundColor: 'rgba(167,139,250,0.16)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 10, borderWidth: 1, borderColor: 'rgba(167,139,250,0.34)' },
  upcomingText:         { color: '#A78BFA', fontSize: 12, fontWeight: '600' },
  sessionArrowBubble:   { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  modalBackdrop:      { flex: 1, backgroundColor: 'rgba(13,10,24,0.62)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  modalDismissLayer:  { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  modalShell:         { maxWidth: 420, width: '100%' },
  modalCard:          { borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', shadowColor: '#140E24', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 12 }, shadowRadius: 20, elevation: 8 },
  modalAccentBar:     { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#A78BFA' },
  modalHeaderRow:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  modalHeaderTextWrap:{ flex: 1, paddingRight: 10 },
  modalEyebrow:       { color: '#B8A8E6', letterSpacing: 1.4, fontWeight: '700', marginBottom: 6 },
  modalTitle:         { color: '#FFFFFF', fontWeight: '800', lineHeight: 30 },
  modalTitleRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  modalTherapistName: { marginTop: 8, color: '#D9CEF6', fontSize: 13, fontWeight: '600' },
  modalCloseBubble:   { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  modalStatusPill:       { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,179,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,179,107,0.28)' },
  modalStatusPillInline: { marginTop: 2 },
  modalStatusText:       { color: '#FFD7A8', fontWeight: '700', fontSize: 12 },
  modalInfoGrid:         { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalInfoTile:         { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14 },
  modalIconWrap:         { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(167,139,250,0.16)', marginBottom: 10 },
  modalIconWarm:         { backgroundColor: 'rgba(255,179,107,0.14)' },
  modalInfoLabel:        { color: '#9D8EC7', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', marginBottom: 5 },
  modalInfoValue:        { color: '#FFFFFF', fontWeight: '700', lineHeight: 21 },
  modalFooterNoteWrap:   { marginTop: 16, paddingTop: 14, paddingBottom: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  modalDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(167,139,250,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  modalDetailButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalFooterNote:       { color: '#B8A8E6', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
