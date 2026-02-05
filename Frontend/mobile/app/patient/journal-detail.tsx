import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
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

export default function JournalDetail() {
  const { themeStyle } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (id) {
      loadEntry();
    }
  }, [id]);

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
      <View style={[styles.centerContainer, { backgroundColor: themeStyle.background }]}>
        <ActivityIndicator size="large" color="#524f85" />
        <Text style={[styles.loadingText, { color: themeStyle.label }]}>
          Loading journal entry...
        </Text>
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeStyle.background }]}>
        <Text style={[styles.errorText, { color: themeStyle.label }]}>
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
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Header */}
          <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtnCircle, { borderColor: 'rgba(0,0,0,0.06)' }]}
            onPress={() => router.push('./journal-list')}
          >
            <FontAwesome name="arrow-left" size={16} color={themeStyle.title} />
          </TouchableOpacity>

          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>
              <Text style={styles.headerBlue}>View</Text>
              <Text style={styles.headerOrange}> Journal</Text>
            </Text>
          </View>

          <View style={styles.headerActions}>
            {entry.is_favorite ? (
              <FontAwesome name="star" size={20} color="#FFD54F" style={styles.favoriteIcon} />
            ) : null}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Date & Time */}
          <View style={[styles.metaCard, { backgroundColor: themeStyle.dashboardcard }]}>
            <LinearGradient
              colors={["#FF6EA5", "#FFB870", "#2BD3B6"]}
              start={[0,0]}
              end={[1,0]}
              style={styles.metaCardGrad}
            />
            <View style={styles.metaPills}
            >
              <View style={[styles.metaPill, { backgroundColor: themeStyle.background }]}>
                <FontAwesome5 name="calendar-alt" size={14} color="#FF6EA5" />
                <Text style={[styles.metaPillText, { color: themeStyle.title }]}>{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              </View>
              <View style={[styles.metaPill, { backgroundColor: themeStyle.background }]}>
                <FontAwesome5 name="clock" size={14} color="#FFB870" />
                <Text style={[styles.metaPillText, { color: themeStyle.title }]}>{formattedTime}</Text>
              </View>
            </View>
          </View>

          {/* Title */}
          <View style={[styles.titleCard, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.title, { color: themeStyle.title }]}>
              {entry.title}
            </Text>
            <FontAwesome5 name="pen-fancy" size={26} color="#E1C8FF" style={styles.titleIcon} />
          </View>

          {/* Content */}
          <View style={[styles.contentCard, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.content, { color: themeStyle.text }]}>
              {entry.content}
            </Text>
          </View>

          {/* Mood Tags */}
          {entry.tags_list && entry.tags_list.length > 0 && (
            <View style={[styles.section, { backgroundColor: themeStyle.dashboardcard }]}>
              <Text style={[styles.sectionTitle, { color: themeStyle.title }]}> 
                <FontAwesome5 name="theater-masks" size={14} color={themeStyle.title} />{' '}
                Mood Tags
              </Text>
              <View style={styles.tagsContainer}>
                {entry.tags_list.map((tag, index) => {
                  const ts = tagStyleFor(tag);
                  return (
                    <View key={index} style={[styles.tag, { backgroundColor: ts.bg, borderColor: hexToRgba(ts.color, 0.16) }]}>
                      <Text style={[styles.tagText, { color: ts.color }]}>{tag}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Mood & Entry Type */}
          {/* Mood & Entry Type removed as requested */}

          {/* Metadata Grid */}
          <View style={[styles.section, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.title }]}> 
              <FontAwesome5 name="info-circle" size={14} color={themeStyle.title} />{' '}
              Details
            </Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Word Count</Text>
                <Text style={[styles.metaValue, { color: themeStyle.title }]}>
                  {entry.word_count}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Privacy</Text>
                <View style={styles.privacyBadge}>
                  <FontAwesome5 name={privacy.name as any} size={14} color={themeStyle.title} style={styles.privacyIcon} />
                  <Text style={[styles.privacyText, { color: themeStyle.title }]}> 
                    {privacy.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Timestamps */}
          <View style={[styles.section, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>
              ⏰ Timeline
            </Text>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Created:</Text>
              <Text style={[styles.timestampValue, { color: themeStyle.text }]}>
                {new Date(entry.created_at).toLocaleString()}
              </Text>
            </View>
            {entry.updated_at !== entry.created_at && (
              <View style={styles.timestampRow}>
                <Text style={styles.timestampLabel}>Updated:</Text>
                <Text style={[styles.timestampValue, { color: themeStyle.text }]}>
                  {new Date(entry.updated_at).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons (Edit/Delete centered, then Back) */}
          <View style={styles.actionsContainer}>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => router.push(`./journal-edit?id=${entry.id}` as any)} disabled={deleting}>
                <LinearGradient colors={["#FF5AA8", "#FFB36B"]} style={styles.editBtn} start={[0,0]} end={[1,0]}> 
                  <FontAwesome5 name="edit" size={16} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </LinearGradient>
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
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: '#F3F4F6',
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
  headerBlue: { color: '#524f85' },
  headerOrange: { color: '#FF9F6B' },
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
    shadowColor: '#FF6EA5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  metaPillText: {
    marginLeft: 8,
    fontWeight: '600',
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
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    textAlign: 'center',
  },
  contentCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
  },
  section: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9F6B',
    paddingLeft: 12,
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
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
    color: '#888',
    marginBottom: 6,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 20,
    fontWeight: '700',
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
    color: '#888',
    fontWeight: '500',
  },
  timestampValue: {
    fontSize: 14,
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
    backgroundColor: '#524f85',
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
