import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions
} from 'react-native';
import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../utils/api';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const moodOptions = [
  { label: 'Happy', emoji: '😊' }, 
  { label: 'Sad', emoji: '😢' }, 
  { label: 'Anxious', emoji: '😰' }, 
  { label: 'Peaceful', emoji: '😌' }, 
  { label: 'Angry', emoji: '😠' },
  { label: 'Grateful', emoji: '🙏' }, 
  { label: 'Hopeful', emoji: '🌟' }, 
  { label: 'Overwhelmed', emoji: '😵' }, 
  { label: 'Excited', emoji: '🤩' }, 
  { label: 'Calm', emoji: '😇' }, 
  { label: 'Stressed', emoji: '😤' }, 
  { label: 'Reflective', emoji: '🤔' }
];

const journalPrompts = [
  "What would you like to let go of today?",
  "What are you most grateful for right now?",
  "How did you grow today?",
  "What made you smile today?",
  "What challenged you today and how did you handle it?",
  "What are you looking forward to tomorrow?"
];

interface JournalEntry {
  title: string;
  content: string;
  entry_type: string;
  mood_before: number;
  mood_after: number;
  tags_list: string[];
}

interface JournalEntryResponse {
  id: string;
  title: string;
  content: string;
  entry_type: string;
  privacy_level: string;
  mood_before: number;
  mood_after: number;
  mood_improvement: string;
  tags: string;
  tags_list: string[];
  word_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

const JournalEntry = () => {
  const { themeStyle } = useTheme();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [entryContent, setEntryContent] = useState('');
  const [moodBefore, setMoodBefore] = useState('5');
  const [moodAfter, setMoodAfter] = useState('7');
  const [tagsInput, setTagsInput] = useState('');
  const [title, setTitle] = useState('Daily Reflection');
  const [currentPrompt] = useState(journalPrompts[Math.floor(Math.random() * journalPrompts.length)]);
  const [loading, setLoading] = useState(false);
  const [journalHistory, setJournalHistory] = useState<JournalEntryResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const fetchJournalHistory = async () => {
    if (historyLoaded) return;
    
    try {
      setHistoryLoading(true);
      const response = await api.get('/patients/journal/?limit=10');
      setJournalHistory(response.data);
      setHistoryLoaded(true);
    } catch (error) {
      console.error('❌ Error fetching journal history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
    if (!showHistory && !historyLoaded) {
      fetchJournalHistory();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEntryTypeIcon = (entryType: string) => {
    const icons: { [key: string]: string } = {
      daily: '📅',
      gratitude: '🙏',
      reflection: '🤔',
      dream: '💭',
      therapy: '🛋️',
      milestone: '🏆',
      challenge: '⚡',
      free_form: '✍️'
    };
    return icons[entryType] || '📝';
  };

  const validateInputs = () => {
    if (!entryContent.trim()) {
      Alert.alert('Validation Error', 'Please write something in your journal entry.');
      return false;
    }
    
    const beforeMood = parseInt(moodBefore);
    const afterMood = parseInt(moodAfter);
    
    if (isNaN(beforeMood) || beforeMood < 1 || beforeMood > 10) {
      Alert.alert('Validation Error', 'Mood Before must be a number between 1 and 10.');
      return false;
    }
    
    if (isNaN(afterMood) || afterMood < 1 || afterMood > 10) {
      Alert.alert('Validation Error', 'Mood After must be a number between 1 and 10.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;

    const payload: JournalEntry = {
      title: title.trim() || 'Daily Reflection',
      content: entryContent.trim(),
      entry_type: 'daily',
      mood_before: parseInt(moodBefore),
      mood_after: parseInt(moodAfter),
      tags_list: tagsInput.split(',').map(tag => tag.trim()).filter(Boolean),
    };

    try {
      setLoading(true);
      const response = await api.post('/patients/journal/', payload);
      console.log('✅ Journal entry saved:', response.data);
      
      const moodImprovement = payload.mood_after - payload.mood_before;
      const improvementText = moodImprovement > 0 
        ? `Great! Your mood improved by ${moodImprovement} points.` 
        : moodImprovement < 0 
        ? `Your mood shifted by ${moodImprovement} points. That's okay, tomorrow is a new day.`
        : `Your mood stayed consistent. Stability can be a strength.`;
        
      Alert.alert(
        'Success! 🎉', 
        `Your journal entry "${payload.title}" has been saved.\n\n${improvementText}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
      
      // Reset form
      setEntryContent('');
      setMoodBefore('5');
      setMoodAfter('7');
      setTagsInput('');
      setTitle('Daily Reflection');
      setSelectedMood(null);
      
      // Refresh history if it was loaded
      if (historyLoaded) {
        setHistoryLoaded(false);
        fetchJournalHistory();
      }
    } catch (error: any) {
      console.error('❌ Error saving journal:', error);
      const errorMessage = error.response?.data?.detail || 'Something went wrong while saving your entry.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={[styles.header, { backgroundColor: '#6C5CE7' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal Entry</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.promptCard, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.promptLabel, { color: themeStyle.label }]}>✨ Daily Prompt</Text>
          <Text style={[styles.promptText, { color: themeStyle.text }]}>
            {currentPrompt}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>📝 Journal Title</Text>
          <TextInput
            style={[styles.titleInput, {
              backgroundColor: themeStyle.background,
              color: themeStyle.text,
              borderColor: themeStyle.border
            }]}
            placeholder="Give your entry a title..."
            placeholderTextColor={themeStyle.label}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>💭 How are you feeling?</Text>
          <View style={styles.moodContainer}>
            {moodOptions.map((mood) => (
              <TouchableOpacity
                key={mood.label}
                style={[
                  styles.moodTag,
                  { borderColor: themeStyle.border },
                  selectedMood === mood.label && styles.selectedMoodTag
                ]}
                onPress={() => setSelectedMood(mood.label)}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text
                  style={[
                    styles.moodLabel,
                    {
                      color: selectedMood === mood.label ? 'white' : themeStyle.text
                    }
                  ]}
                >
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>✍️ Your Thoughts</Text>
          <TextInput
            style={[styles.textArea, {
              backgroundColor: themeStyle.background,
              color: themeStyle.text,
              borderColor: themeStyle.border
            }]}
            placeholder="Share your thoughts, feelings, or experiences..."
            placeholderTextColor={themeStyle.label}
            value={entryContent}
            onChangeText={setEntryContent}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: themeStyle.label }]}>
            {entryContent.length} characters
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>📊 Mood Tracking</Text>
          <Text style={[styles.moodSubtitle, { color: themeStyle.label }]}>
            Rate your mood on a scale of 1-10
          </Text>
          
          <View style={styles.rowInputs}>
            <View style={styles.moodInputGroup}>
              <Text style={[styles.moodInputLabel, { color: themeStyle.text }]}>😔 Before</Text>
              <View style={[styles.moodInputContainer, { backgroundColor: themeStyle.background, borderColor: themeStyle.border }]}>
                <TextInput
                  style={[styles.moodInput, { color: themeStyle.text }]}
                  value={moodBefore}
                  onChangeText={setMoodBefore}
                  keyboardType="numeric"
                  maxLength={2}
                  textAlign="center"
                />
              </View>
            </View>

            <View style={styles.moodInputGroup}>
              <Text style={[styles.moodInputLabel, { color: themeStyle.text }]}>😊 After</Text>
              <View style={[styles.moodInputContainer, { backgroundColor: themeStyle.background, borderColor: themeStyle.border }]}>
                <TextInput
                  style={[styles.moodInput, { color: themeStyle.text }]}
                  value={moodAfter}
                  onChangeText={setMoodAfter}
                  keyboardType="numeric"
                  maxLength={2}
                  textAlign="center"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
          <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>🏷️ Tags</Text>
          <Text style={[styles.tagSubtitle, { color: themeStyle.label }]}>
            Add tags to categorize your entry (comma-separated)
          </Text>
          <TextInput
            style={[styles.textInput, {
              backgroundColor: themeStyle.background,
              color: themeStyle.text,
              borderColor: themeStyle.border
            }]}
            placeholder="e.g. growth, anxiety, goals, family"
            placeholderTextColor={themeStyle.label}
            value={tagsInput}
            onChangeText={setTagsInput}
          />
          {tagsInput.length > 0 && (
            <View style={styles.tagPreview}>
              {tagsInput.split(',').map((tag, index) => (
                tag.trim() && (
                  <View key={index} style={[styles.tagChip, { backgroundColor: '#6C5CE7' }]}>
                    <Text style={styles.tagChipText}>{tag.trim()}</Text>
                  </View>
                )
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.completeButton, 
            { 
              opacity: loading ? 0.7 : 1,
              backgroundColor: loading ? '#9CA3AF' : '#6C5CE7'
            }
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.loadingText}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.completeButtonText}>💾 Save Entry</Text>
          )}
        </TouchableOpacity>

        {/* Journal History Section */}
        <View style={[styles.historySection, { backgroundColor: themeStyle.dashboardcard }]}>
          <TouchableOpacity
            style={styles.historyHeader}
            onPress={toggleHistory}
          >
            <View style={styles.historyHeaderContent}>
              <Text style={[styles.historyTitle, { color: themeStyle.text }]}>
                📚 Previous Entries
              </Text>
              <Text style={[styles.historySubtitle, { color: themeStyle.label }]}>
                {showHistory ? 'Tap to hide' : 'Tap to view your journal history'}
              </Text>
            </View>
            <Text style={[styles.expandIcon, { color: themeStyle.text }]}>
              {showHistory ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showHistory && (
            <View style={styles.historyContent}>
              {historyLoading ? (
                <View style={styles.historyLoadingContainer}>
                  <ActivityIndicator size="small" color="#6C5CE7" />
                  <Text style={[styles.historyLoadingText, { color: themeStyle.label }]}>
                    Loading your entries...
                  </Text>
                </View>
              ) : journalHistory.length > 0 ? (
                <View style={styles.historyList}>
                  {journalHistory.map((entry) => (
                    <View key={entry.id} style={[styles.historyCard, { backgroundColor: themeStyle.background }]}>
                      <View style={styles.historyCardHeader}>
                        <View style={styles.historyCardTitle}>
                          <Text style={styles.entryTypeIcon}>
                            {getEntryTypeIcon(entry.entry_type)}
                          </Text>
                          <Text style={[styles.historyEntryTitle, { color: themeStyle.text }]}>
                            {entry.title || 'Untitled Entry'}
                          </Text>
                          {entry.is_favorite && (
                            <Text style={styles.favoriteIcon}>⭐</Text>
                          )}
                        </View>
                        <Text style={[styles.historyDate, { color: themeStyle.label }]}>
                          {formatDate(entry.created_at)}
                        </Text>
                      </View>

                      <Text style={[styles.historyEntryContent, { color: themeStyle.text }]} numberOfLines={2}>
                        {entry.content}
                      </Text>

                      <View style={styles.historyCardFooter}>
                        <View style={styles.moodIndicators}>
                          <View style={styles.moodItem}>
                            <Text style={styles.historyMoodLabel}>😔</Text>
                            <Text style={[styles.moodValue, { color: themeStyle.text }]}>
                              {entry.mood_before}
                            </Text>
                          </View>
                          <Text style={[styles.moodArrow, { color: themeStyle.label }]}>→</Text>
                          <View style={styles.moodItem}>
                            <Text style={styles.historyMoodLabel}>😊</Text>
                            <Text style={[styles.moodValue, { color: themeStyle.text }]}>
                              {entry.mood_after}
                            </Text>
                          </View>
                        </View>

                        {entry.tags_list && entry.tags_list.length > 0 && (
                          <View style={styles.historyTags}>
                            {entry.tags_list.slice(0, 3).map((tag, index) => (
                              <View key={index} style={[styles.historyTag, { backgroundColor: '#6C5CE7' }]}>
                                <Text style={styles.historyTagText}>{tag}</Text>
                              </View>
                            ))}
                            {entry.tags_list.length > 3 && (
                              <Text style={[styles.moreTagsText, { color: themeStyle.label }]}>
                                +{entry.tags_list.length - 3}
                              </Text>
                            )}
                          </View>
                        )}

                        <View style={styles.entryStats}>
                          <Text style={[styles.wordCount, { color: themeStyle.label }]}>
                            {entry.word_count} words
                          </Text>
                          {entry.mood_improvement && (
                            <Text style={[
                              styles.moodImprovement,
                              { 
                                color: parseInt(entry.mood_improvement) > 0 ? '#10B981' : 
                                       parseInt(entry.mood_improvement) < 0 ? '#EF4444' : themeStyle.label
                              }
                            ]}>
                              {parseInt(entry.mood_improvement) > 0 ? '+' : ''}{entry.mood_improvement}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyHistory}>
                  <Text style={[styles.emptyHistoryText, { color: themeStyle.label }]}>
                    📖 No previous entries yet.{'\n'}Start writing to build your journal history!
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default JournalEntry;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  promptCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#6C5CE7',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  titleInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  moodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 2,
    marginBottom: 8,
    minWidth: width * 0.25,
    justifyContent: 'center',
  },
  selectedMoodTag: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  moodEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 140,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
    fontStyle: 'italic',
  },
  moodSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
    marginTop: 8,
  },
  moodInputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  moodInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  moodInputContainer: {
    borderWidth: 2,
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodInput: {
    fontSize: 18,
    fontWeight: 'bold',
    width: '100%',
    height: '100%',
  },
  tagSubtitle: {
    fontSize: 14,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    height: 56,
  },
  tagPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#6C5CE7',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
  
  // History Section Styles
  historySection: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  historyHeaderContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  historySubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  expandIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  historyLoadingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  historyList: {
    gap: 16,
  },
  historyCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyCardHeader: {
    marginBottom: 12,
  },
  historyCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  entryTypeIcon: {
    fontSize: 16,
  },
  historyEntryTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  favoriteIcon: {
    fontSize: 14,
  },
  historyDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  historyEntryContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  historyCardFooter: {
    gap: 12,
  },
  moodIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moodItem: {
    alignItems: 'center',
    gap: 2,
  },
  historyMoodLabel: {
    fontSize: 12,
  },
  moodValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  moodArrow: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  historyTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  moreTagsText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  entryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCount: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  moodImprovement: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyHistory: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
