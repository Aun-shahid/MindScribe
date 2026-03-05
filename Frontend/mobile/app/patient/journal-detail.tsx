import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { FontAwesome5 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import PatientService from '../services/patient.service';
import type { JournalEntry } from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import OriginalHeader from '../components/OriginalHeader';

export default function JournalDetail() {
  const { themeStyle } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
      loadEntry();
    }
  }, [id]);

  // Bubble animation effect
  /* eslint-disable react-hooks/exhaustive-deps */
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
                toValue: 50,
                duration: durationX / 2,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValueX, {
                toValue: -50,
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

    createFloatingAnimation(bubble1Y, bubble1X, 8000, 10000, 0, 500);
    createFloatingAnimation(bubble2Y, bubble2X, 9000, 8500, 500, 1000);
    createFloatingAnimation(bubble3Y, bubble3X, 7500, 9500, 1000, 0);
    createFloatingAnimation(bubble4Y, bubble4X, 8500, 9000, 1500, 800);
    createFloatingAnimation(bubble5Y, bubble5X, 9500, 8000, 2000, 1500);
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadEntry = async () => {
    try {
      const data = await PatientService.getJournalEntry(id);
      setEntry(data);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      console.error('[JournalDetail] Error loading:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPrivacyLabel = (privacyLevel: string) => {
    switch (privacyLevel) {
      case 'private':
        return { name: 'lock', label: 'Private (Only Me)' };
      case 'therapist':
        return { name: 'user-md', label: 'Shared with Therapist' };
      case 'anonymous':
        return { name: 'globe', label: 'Anonymous Sharing' };
      default:
        return { name: 'pen-fancy', label: 'Not Set' };
    }
  };

  const tagStyleFor = (tag: string) => {
    const t = (tag || '').toLowerCase();
    if (t.includes('sad')) return { bg: '#E3F2FD', color: '#1976D2' };
    if (t.includes('anx') || t.includes('anxious')) return { bg: '#FFF3E0', color: '#FB8C00' };
    if (t.includes('stress') || t.includes('stressed')) return { bg: '#FFE6EA', color: '#D32F2F' };
    if (t.includes('happy') || t.includes('joy') || t.includes('joyful') || t.includes('glad')) return { bg: '#E8F5E9', color: '#2e7d32' };
    if (t.includes('calm') || t.includes('relax')) return { bg: '#E8F5FF', color: '#0277BD' };
    return { bg: '#F5F5F5', color: '#616161' };
  };

  const hexToRgba = (hex: string, alpha = 0.16) => {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getEntryTypeLabel = (entryType: string) => {
    const types: Record<string, string> = {
      'daily': '📔 Daily Journal',
      'gratitude': '🙏 Gratitude Entry',
      'reflection': '💭 Self Reflection',
      'dream': '💫 Dream Journal',
      'therapy': '🩺 Post-Therapy',
      'milestone': '🏆 Milestone',
      'challenge': '⚡ Challenge',
      'free_form': '✍️ Free Form',
    };
    return types[entryType] || '📝 Journal Entry';
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Journal Entry',
      'Are you sure you want to delete this journal entry? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await PatientService.deleteJournalEntry(id);
              Alert.alert('Deleted', 'Journal entry deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => router.push('./journal-list'),
                },
              ]);
            } catch (err: any) {
              console.error('[JournalDetail] Error deleting:', err);
              Alert.alert('Error', 'Failed to delete journal entry. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#342949' }]}>
        <ActivityIndicator size="large" color="#FFB36B" />
        <Text style={[styles.loadingText, { color: '#FFFFFF' }]}>
          Loading journal entry...
        </Text>
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#342949' }]}>
        <Text style={[styles.errorText, { color: '#FFFFFF' }]}>
          Entry not found
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedDate = new Date(entry.created_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(entry.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const privacy = getPrivacyLabel(entry.privacy_level);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#342949', '#2a1f3d', '#342949']}
        style={styles.screenGradient}
        pointerEvents="none"
      >
        {/* Floating Bubbles */}
        <Animated.View
          style={[
            styles.bubble,
            {
              top: '10%',
              left: '-10%',
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
              top: '70%',
              right: '-7%',
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
              bottom: '5%',
              left: '5%',
              width: 95,
              height: 95,
              transform: [
                { translateY: bubble5Y },
                { translateX: bubble5X },
              ],
            },
          ]}
        />
      </LinearGradient>

      {/* Sticky Header - Appears on scroll */}
      <StickyHeader
        scrollY={scrollY}
        firstWord="View"
        secondWord="Journal"
        onBackPress={() => router.back()}
      />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <Animated.ScrollView 
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Original Header */}
          <OriginalHeader
            scrollY={scrollY}
            firstWord="View"
            secondWord="Journal"
            onBackPress={() => router.back()}
          />

          {/* Action Buttons Row */}
          <View style={styles.headerActionsRow}>
            {entry.is_favorite ? (
              <View style={styles.favoriteIconContainer}>
                <FontAwesome name="star" size={20} color="#FFD54F" />
              </View>
            ) : null}
          </View>
          {/* Date & Time */}
          <View style={styles.metaCard}>
            <LinearGradient
              colors={["#FFB36B", "#A78BFA", "#FFB36B"]}
              start={[0,0]}
              end={[1,0]}
              style={styles.metaCardGrad}
            />
            <View style={styles.metaPills}
            >
              <View style={styles.metaPill}>
                <FontAwesome5 name="calendar-alt" size={14} color="#FFB36B" />
                <Text style={styles.metaPillText}>{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>
              <View style={styles.metaPill}>
                <FontAwesome5 name="clock" size={14} color="#FFB36B" />
                <Text style={styles.metaPillText}>{formattedTime}</Text>
              </View>
            </View>
          </View>

          {/* Title */}
          <View style={styles.titleCard}>
            <Text style={styles.title}>
              {entry.title}
            </Text>
            <FontAwesome5 name="pen-fancy" size={26} color="#B8A8E6" style={styles.titleIcon} />
          </View>

          {/* Content */}
          <View style={styles.contentCard}>
            <Text style={styles.content}>
              {entry.content}
            </Text>
          </View>

          {/* Mood Tags */}
          {entry.tags_list && entry.tags_list.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}> 
                <FontAwesome5 name="theater-masks" size={14} color="#FFFFFF" />{' '}
                Mood Tags
              </Text>
              <View style={styles.tagsContainer}>
                {entry.tags_list.map((tag, index) => {
                  return (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Mood & Entry Type */}
          {/* Mood & Entry Type removed as requested */}

          {/* Metadata Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}> 
              <FontAwesome5 name="info-circle" size={14} color="#FFFFFF" />{' '}
              Details
            </Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Word Count</Text>
                <Text style={styles.metaValue}>
                  {entry.word_count}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Privacy</Text>
                <View style={styles.privacyBadge}>
                  <FontAwesome5 name={privacy.name as any} size={14} color="#FFFFFF" style={styles.privacyIcon} />
                  <Text style={styles.privacyText}> 
                    {privacy.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Timestamps */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ⏰ Timeline
            </Text>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Created:</Text>
              <Text style={styles.timestampValue}>
                {new Date(entry.created_at).toLocaleString()}
              </Text>
            </View>
            {entry.updated_at !== entry.created_at && (
              <View style={styles.timestampRow}>
                <Text style={styles.timestampLabel}>Updated:</Text>
                <Text style={styles.timestampValue}>
                  {new Date(entry.updated_at).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons (Edit/Delete centered, then Back) */}
          <View style={styles.actionsContainer}>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => router.push(`./journal-edit?id=${entry.id}` as any)} disabled={deleting}>
                <View style={styles.editBtn}> 
                  <FontAwesome5 name="edit" size={16} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleDelete} disabled={deleting}>
                <View style={styles.deleteBtn}> 
                  <FontAwesome5 name="trash-alt" size={16} color="#D32F2F" style={{ marginRight: 10 }} />
                  <Text style={styles.deleteButtonText}>{deleting ? '⏳ Deleting' : 'Delete'}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Back to List removed: top-left back icon navigates to list now */}
          </View>
        </Animated.ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#342949',
  },
  screenGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(133, 130, 180, 0.15)',
    borderRadius: 1000,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: '#342949',
    borderRadius: 12,
    marginBottom: 14,
  },
  headerTitleCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },
  backText: {
    fontSize: 16,
    color: '#524f85',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'absolute',
    right: 18,
    top: 42,
  },
  headerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  favoriteIconContainer: {
    padding: 8,
  },
  editButton: {
    backgroundColor: '#524f85',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: '700',
  },
  favoriteIcon: {
    fontSize: 24,
  },
  backBtnCircle: {
    position: 'absolute',
    left: 18,
    top: 42,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  gradientBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 22,
    marginRight: 12,
    minWidth: 140,
    backgroundColor: '#A78BFA',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: '#FFF5F6',
    borderWidth: 1,
    borderColor: 'rgba(211,47,47,0.08)',
    minWidth: 120,
  },
  metaPills: {
    flexDirection: 'row',
    gap: 12,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#5B5270',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metaPillText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  titleIcon: {
    position: 'absolute',
    right: 18,
    top: 22,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  metaCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    backgroundColor: '#473F5A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },

  metaCardGrad: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
  },
  titleCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#473F5A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  contentCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#473F5A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
    color: '#FFFFFF',
  },
  section: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#473F5A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB36B',
    paddingLeft: 12,
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#5B5270',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB36B',
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 13,
    color: '#B8A8E6',
    marginBottom: 6,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyIcon: {
    fontSize: 18,
  },
  privacyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  moodRow: {
    marginBottom: 12,
  },
  moodItem: {
    marginBottom: 8,
  },
  entryTypeText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  moodScoresRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  moodScoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  moodScoreCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  moodScoreValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1976D2',
  },
  moodScoreMax: {
    fontSize: 12,
    color: '#1976D2',
    marginTop: -2,
  },
  improvementSection: {
    marginTop: 8,
  },
  moodSection: {
    marginTop: 8,
  },
  moodBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  moodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timestampLabel: {
    fontSize: 14,
    color: '#B8A8E6',
    fontWeight: '500',
  },
  timestampValue: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  actionsContainer: {
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#524f85',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    backgroundColor: '#A78BFA',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
