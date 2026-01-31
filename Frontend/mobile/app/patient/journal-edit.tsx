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
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import PatientService from '../services/patient.service';
import type { CreateJournalEntryData, JournalEntry } from '../services/patient.service';

const MOOD_TAGS = ['Happy', 'Grateful', 'Anxious', 'Calm', 'Excited', 'Sad', 'Hopeful', 'Stressed', 'Peaceful', 'Overwhelmed'];

const PROMPTS = [
  "What made you smile today?",
  "Describe a challenge you faced and how you handled it.",
  "What are you grateful for right now?",
  "Write about a moment that brought you peace today.",
  "What's on your mind that you need to process?",
  "Describe your current emotional state.",
  "What would make tomorrow better?",
  "Reflect on something you learned recently.",
];

export default function JournalEdit() {
  const { themeStyle } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [originalEntry, setOriginalEntry] = useState<JournalEntry | null>(null);
  
  const [formData, setFormData] = useState<CreateJournalEntryData>({
    title: '',
    content: '',
    mood_tags_list: [],
    is_private: true,
    is_favorite: false,
    entry_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (id) {
      loadEntry();
    }
  }, [id]);

  const loadEntry = async () => {
    try {
      const entry = await PatientService.getJournalEntry(id);
      setOriginalEntry(entry);
      
      // Populate form with existing data
      setFormData({
        prompt: entry.tags || undefined,
        title: entry.title || '',
        content: entry.content || '',
        mood_tags_list: entry.tags_list || [],
        is_private: entry.privacy_level === 'private',
        is_favorite: entry.is_favorite,
        entry_date: new Date(entry.created_at).toISOString().split('T')[0],
      });

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      console.error('[JournalEdit] Error loading:', err);
      Alert.alert('Error', 'Failed to load journal entry');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setSelectedPrompt(prompt);
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

  const handleSubmit = async () => {
    if (!formData.title?.trim()) {
      Alert.alert('Required Field', 'Please add a title to your journal entry');
      return;
    }
    if (!formData.content?.trim()) {
      Alert.alert('Required Field', 'Please write some content');
      return;
    }

    setSubmitting(true);
    try {
      await PatientService.updateJournalEntry(id, formData);
      Alert.alert('Success', 'Journal entry updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      console.error('[JournalEdit] Error updating:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update journal entry');
    } finally {
      setSubmitting(false);
    }
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
                <Text style={styles.backButton}>← Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: themeStyle.title }]}>
                ✏️ Edit Journal Entry
              </Text>
              <Text style={[styles.subtitle, { color: themeStyle.label }]}>
                Update your thoughts and feelings
              </Text>
            </View>

            {/* Prompts Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>
                💡 Need inspiration?
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptsScroll}>
                {PROMPTS.map((prompt, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.promptCard,
                      { backgroundColor: themeStyle.dashboardcard },
                      selectedPrompt === prompt && styles.promptCardSelected,
                    ]}
                    onPress={() => handlePromptSelect(prompt)}
                  >
                    <Text style={[styles.promptText, { color: themeStyle.text }]}>
                      {prompt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

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
                {formData.content?.trim().split(/\s+/).filter(w => w).length || 0} words
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

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? '✨ Saving...' : '💾 Save Changes'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={submitting}
              >
                <Text style={[styles.cancelButtonText, { color: themeStyle.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    paddingTop: 30,
  },
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
  moodTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#524f85',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
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
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
