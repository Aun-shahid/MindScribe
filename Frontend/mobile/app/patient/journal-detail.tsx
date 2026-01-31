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
        return { icon: '🔒', label: 'Private (Only Me)' };
      case 'therapist':
        return { icon: '👨‍⚕️', label: 'Shared with Therapist' };
      case 'anonymous':
        return { icon: '🌐', label: 'Anonymous Sharing' };
      default:
        return { icon: '📝', label: 'Not Set' };
    }
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
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`./journal-edit?id=${entry.id}` as any)}
              disabled={deleting}
            >
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={deleting}
            >
              <Text style={styles.deleteButtonText}>
                {deleting ? '⏳' : '🗑️ Delete'}
              </Text>
            </TouchableOpacity>
            {entry.is_favorite && <Text style={styles.favoriteIcon}>⭐</Text>}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Date & Time */}
          <View style={[styles.metaCard, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.dateText, { color: themeStyle.title }]}>
              {formattedDate}
            </Text>
            <Text style={[styles.timeText, { color: themeStyle.label }]}>
              {formattedTime}
            </Text>
          </View>

          {/* Title */}
          <View style={[styles.titleCard, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.title, { color: themeStyle.title }]}>
              {entry.title}
            </Text>
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
                🎭 Tags
              </Text>
              <View style={styles.tagsContainer}>
                {entry.tags_list.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Mood & Entry Type */}
          <View style={[styles.section, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>
              😊 Mood & Type
            </Text>
            
            <View style={styles.moodRow}>
              <View style={styles.moodItem}>
                <Text style={styles.metaLabel}>Entry Type</Text>
                <Text style={[styles.entryTypeText, { color: themeStyle.title }]}>
                  {getEntryTypeLabel(entry.entry_type)}
                </Text>
              </View>
            </View>

            {(entry.mood_before || entry.mood_after) && (
              <View style={styles.moodScoresRow}>
                {entry.mood_before && (
                  <View style={styles.moodScoreItem}>
                    <Text style={styles.metaLabel}>Mood Before</Text>
                    <View style={styles.moodScoreCircle}>
                      <Text style={styles.moodScoreValue}>{entry.mood_before}</Text>
                      <Text style={styles.moodScoreMax}>/10</Text>
                    </View>
                  </View>
                )}
                
                {entry.mood_after && (
                  <View style={styles.moodScoreItem}>
                    <Text style={styles.metaLabel}>Mood After</Text>
                    <View style={styles.moodScoreCircle}>
                      <Text style={styles.moodScoreValue}>{entry.mood_after}</Text>
                      <Text style={styles.moodScoreMax}>/10</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {entry.mood_improvement !== 0 && entry.mood_before && entry.mood_after && (
              <View style={styles.improvementSection}>
                <Text style={styles.metaLabel}>Mood Improvement</Text>
                <View
                  style={[
                    styles.moodBadge,
                    {
                      backgroundColor: entry.mood_improvement > 0 ? '#E8F5E9' : '#FFEBEE',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.moodText,
                      {
                        color: entry.mood_improvement > 0 ? '#2e7d32' : '#c62828',
                      },
                    ]}
                  >
                    {entry.mood_improvement > 0 ? '↑' : '↓'} {Math.abs(entry.mood_improvement)} points
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Metadata Grid */}
          <View style={[styles.section, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>
              📊 Details
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
                  <Text style={styles.privacyIcon}>{privacy.icon}</Text>
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

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.back()}
            >
              <Text style={styles.actionButtonText}>📚 Back to List</Text>
            </TouchableOpacity>
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
    padding: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  backText: {
    fontSize: 16,
    color: '#524f85',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    backgroundColor: '#524f85',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  favoriteIcon: {
    fontSize: 24,
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
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
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
