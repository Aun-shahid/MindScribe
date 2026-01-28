import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import PatientService from '../services/patient.service';
import type { CreateJournalEntryData, JournalPrompt } from '../services/patient.service';

const MOOD_TAGS = ['Happy', 'Grateful', 'Anxious', 'Calm', 'Excited', 'Sad', 'Hopeful', 'Stressed', 'Peaceful', 'Overwhelmed'];

export default function CreateJournal() {
  const { themeStyle } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [todayPrompt, setTodayPrompt] = useState<JournalPrompt | null>(null);
  const [promptError, setPromptError] = useState<'none' | 'no_prompts' | 'error'>('none');
  
  const [formData, setFormData] = useState<CreateJournalEntryData>({
    title: '',
    content: '',
    mood_tags_list: [],
    is_private: true,
    is_favorite: false,
    entry_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  });

  useEffect(() => {
    loadTodayPrompt();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadTodayPrompt = async () => {
    try {
      const prompt = await PatientService.getTodayPrompt();
      setTodayPrompt(prompt);
      setPromptError('none');
      // Optionally auto-fill prompt in form
      setFormData(prev => ({ ...prev, prompt: prompt.prompt }));
    } catch (err: any) {
      // Handle 404 gracefully (no prompts available)
      if (err.response?.status === 404) {
        console.log('[CreateJournal] No prompts available - enabling free journaling mode');
        setPromptError('no_prompts');
      } else {
        // Handle other errors (network, 500, etc.)
        console.error('[CreateJournal] Error loading prompt:', err);
        setPromptError('error');
      }
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setFormData(prev => ({ ...prev, prompt }));
  };

  const toggleMoodTag = (tag: string) => {
    setFormData(prev => {
      const currentTags = prev.mood_tags_list || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      
      return {
        ...prev,
        mood_tags_list: newTags,
      };
    });
  };

  const handleSubmit = async (retryCount = 0) => {
    if (!formData.title.trim()) {
      Alert.alert('Required Field', 'Please add a title to your journal entry');
      return;
    }
    if (!formData.content.trim()) {
      Alert.alert('Required Field', 'Please write some content');
      return;
    }

    setSubmitting(true);
    try {
      await PatientService.createJournalEntry(formData);
      Alert.alert('Success', 'Journal entry saved successfully!', [
        {
          text: 'OK',
          onPress: () => router.push('./journal-list'),
        },
      ]);
    } catch (err: any) {
      console.error('[Journal] Error creating:', err);
      
      // Detect network error vs server error
      const isNetworkError = !err.response && err.request;
      const isServerError = err.response?.status >= 500;
      
      if (isNetworkError && retryCount < 1) {
        // Retry once for network errors
        console.log('[Journal] Network error, retrying...');
        setSubmitting(false);
        setTimeout(() => handleSubmit(retryCount + 1), 1500);
        return;
      }
      
      // Build user-friendly error message
      let errorMessage = 'Failed to save journal entry.';
      if (isNetworkError) {
        errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
      } else if (isServerError) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      // Show error but preserve user input
      Alert.alert(
        'Failed to Save',
        errorMessage,
        [
          {
            text: 'Try Again',
            onPress: () => handleSubmit(0),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.backButton}>← Back</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: themeStyle.title }]}>
                ✍️ New Journal Entry
              </Text>
              <Text style={[styles.subtitle, { color: themeStyle.label }]}>
                Express your thoughts and feelings
              </Text>
            </View>

            {/* Today's Prompt Section */}
            {loadingPrompt ? (
              <View style={[styles.promptLoadingCard, { backgroundColor: themeStyle.dashboardcard }]}>
                <ActivityIndicator size="small" color="#524f85" />
                <Text style={[styles.promptLoadingText, { color: themeStyle.label }]}>
                  Loading today's prompt...
                </Text>
              </View>
            ) : todayPrompt ? (
              <View style={styles.todayPromptSection}>
                <View style={styles.promptHeader}>
                  <Text style={[styles.promptBadge, { backgroundColor: '#E8F5E9' }]}>
                    ✨ {todayPrompt.category_display}
                  </Text>
                </View>
                <View style={[styles.todayPromptCard, { backgroundColor: '#f3f1ff' }]}>
                  <Text style={styles.promptIcon}>💭</Text>
                  <Text style={styles.todayPromptText}>
                    {todayPrompt.prompt}
                  </Text>
                  {todayPrompt.description && (
                    <Text style={styles.promptDescription}>
                      {todayPrompt.description}
                    </Text>
                  )}
                </View>
              </View>
            ) : promptError === 'no_prompts' ? (
              <View style={styles.todayPromptSection}>
                <View style={[styles.fallbackCard, { backgroundColor: '#F5F5F5' }]}>
                  <Text style={styles.fallbackIcon}>✍️</Text>
                  <Text style={styles.fallbackText}>
                    Write about one thing that's been on your mind
                  </Text>
                </View>
              </View>
            ) : promptError === 'error' ? (
              <View style={styles.todayPromptSection}>
                <View style={[styles.fallbackCard, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={styles.fallbackIcon}>📝</Text>
                  <Text style={styles.fallbackText}>
                    Unable to load today's prompt, but you can still write freely!
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Title Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: themeStyle.title }]}>
                Title *
              </Text>
              <TextInput
                style={[styles.titleInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
                placeholder="Give your entry a title..."
                placeholderTextColor={themeStyle.label}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
            </View>

            {/* Content Input - Large */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: themeStyle.title }]}>
                What's on your mind? *
              </Text>
              <TextInput
                style={[styles.contentInput, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
                placeholder="Start writing... Express yourself freely."
                placeholderTextColor={themeStyle.label}
                value={formData.content}
                onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
                multiline
                numberOfLines={12}
                textAlignVertical="top"
              />
              <Text style={[styles.wordCount, { color: themeStyle.label }]}>
                {formData.content.trim().split(/\s+/).filter(w => w).length} words
              </Text>
            </View>

            {/* Tags */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: themeStyle.title }]}>
                🎨 Tags (Optional)
              </Text>
              <Text style={[styles.subtitle, { color: themeStyle.label }]}>
                Select tags that describe your current state
              </Text>
              <View style={styles.moodTagsContainer}>
                {MOOD_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.moodTag,
                      { backgroundColor: themeStyle.dashboardcard },
                      formData.mood_tags_list?.includes(tag) && styles.moodTagSelected,
                    ]}
                    onPress={() => toggleMoodTag(tag)}
                  >
                    <Text
                      style={[
                        styles.moodTagText,
                        { color: themeStyle.text },
                        formData.mood_tags_list?.includes(tag) && styles.moodTagTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Privacy & Favorite */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => setFormData(prev => ({ ...prev, is_favorite: !prev.is_favorite }))}
              >
                <View style={styles.switchLeft}>
                  <Text style={styles.switchEmoji}>⭐</Text>
                  <Text style={[styles.switchLabel, { color: themeStyle.text }]}>
                    Mark as Favorite
                  </Text>
                </View>
                <View style={[
                  styles.switch,
                  { backgroundColor: formData.is_favorite ? '#4caf50' : '#ccc' },
                ]}>
                  <View style={[
                    styles.switchThumb,
                    { transform: [{ translateX: formData.is_favorite ? 22 : 2 }] },
                  ]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => setFormData(prev => ({ ...prev, is_private: !prev.is_private }))}
              >
                <View style={styles.switchLeft}>
                  <Text style={styles.switchEmoji}>🔒</Text>
                  <View>
                    <Text style={[styles.switchLabel, { color: themeStyle.text }]}>
                      Keep Private
                    </Text>
                    <Text style={[styles.privacySubtext, { color: themeStyle.label }]}>
                      {formData.is_private ? 'Only you can see' : 'Therapist can view'}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.switch,
                  { backgroundColor: formData.is_private ? '#4caf50' : '#ccc' },
                ]}>
                  <View style={[
                    styles.switchThumb,
                    { transform: [{ translateX: formData.is_private ? 22 : 2 }] },
                  ]} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={() => handleSubmit(0)}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? '✨ Saving...' : '💾 Save Journal Entry'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,    paddingTop: 30,  },
  backButton: {
    fontSize: 16,
    color: '#524f85',
    fontWeight: '600',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  todayPromptSection: {
    marginBottom: 24,
  },
  promptHeader: {
    marginBottom: 12,
  },
  promptBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#2e7d32',
  },
  todayPromptCard: {
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#524f85',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: '#524f85',
  },
  promptIcon: {
    fontSize: 32,
    marginBottom: 12,
    textAlign: 'center',
  },
  todayPromptText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#524f85',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 8,
  },
  promptDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  promptLoadingCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  promptLoadingText: {
    fontSize: 15,
  },
  fallbackCard: {
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fallbackIcon: {
    fontSize: 32,
    marginBottom: 12,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  promptsScroll: {
    marginBottom: 8,
  },
  promptCard: {
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    width: 250,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  promptCardSelected: {
    borderColor: '#524f85',
    elevation: 4,
  },
  promptText: {
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  titleInput: {
    padding: 16,
    borderRadius: 12,
    fontSize: 18,
    fontWeight: '600',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  contentInput: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    minHeight: 250,
    textAlignVertical: 'top',
    lineHeight: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  wordCount: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  typeScroll: {
    marginBottom: 8,
  },
  typeCard: {
    padding: 12,
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 90,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardSelected: {
    borderColor: '#524f85',
    backgroundColor: '#f3f1ff',
    elevation: 4,
  },
  typeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  moodSliderContainer: {
    marginBottom: 20,
  },
  moodSliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moodLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  moodValueBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  moodValueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
  },
  sliderTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginBottom: 8,
  },
  sliderDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#BDBDBD',
  },
  sliderDotActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1565C0',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabelText: {
    fontSize: 12,
  },
  moodTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodTag: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodTagSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4caf50',
    elevation: 2,
  },
  moodTagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  moodTagTextSelected: {
    color: '#2e7d32',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingTop: 20,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacySubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  tapToChange: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
  },
  submitButton: {
    backgroundColor: '#524f85',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
