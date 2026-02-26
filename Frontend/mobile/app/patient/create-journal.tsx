import { useState, useEffect, useRef } from 'react';
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
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import PatientService from '../services/patient.service';
import eventBus from '../utils/eventBus';
import type { CreateJournalEntryData, JournalPrompt } from '../services/patient.service';

const MOOD_TAGS = ['Happy', 'Grateful', 'Anxious', 'Calm', 'Excited', 'Sad', 'Hopeful', 'Stressed', 'Peaceful', 'Overwhelmed'];

export default function CreateJournal() {
  const { themeStyle } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [todayPrompt, setTodayPrompt] = useState<JournalPrompt | null>(null);
  const [promptError, setPromptError] = useState<'none' | 'no_prompts' | 'error'>('none');

  // Floating bubble animations
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
  
  const initialFormData: CreateJournalEntryData = {
    title: '',
    content: '',
    mood_tags_list: [],
    is_private: true,
    is_favorite: false,
    entry_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  };

  const [formData, setFormData] = useState<CreateJournalEntryData>(initialFormData);

  useEffect(() => {
    // Reset form to a clean state when the screen mounts so previous entries don't persist
    setFormData({ ...initialFormData, entry_date: new Date().toISOString().split('T')[0] });
    loadTodayPrompt();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    // Floating bubble animations
    const createFloatingAnimation = (
      valueY: Animated.Value,
      valueX: Animated.Value,
      durationY: number,
      durationX: number,
      delayY = 0,
      delayX = 0
    ) => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.delay(delayY),
            Animated.timing(valueY, {
              toValue: 50,
              duration: durationY,
              useNativeDriver: true,
            }),
            Animated.timing(valueY, {
              toValue: -50,
              duration: durationY,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delayX),
            Animated.timing(valueX, {
              toValue: 30,
              duration: durationX,
              useNativeDriver: true,
            }),
            Animated.timing(valueX, {
              toValue: -30,
              duration: durationX,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };

    createFloatingAnimation(bubble1Y, bubble1X, 8000, 7000, 0, 500);
    createFloatingAnimation(bubble2Y, bubble2X, 9000, 8500, 1000, 1500);
    createFloatingAnimation(bubble3Y, bubble3X, 10000, 9000, 500, 0);
    createFloatingAnimation(bubble4Y, bubble4X, 8500, 10000, 1500, 1000);
    createFloatingAnimation(bubble5Y, bubble5X, 9500, 8000, 0, 2000);
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
      // Notify other parts of the app to refresh
      eventBus.emit('journalUpdated');
      eventBus.emit('refreshDashboard');
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
    <View style={[styles.container, { backgroundColor: '#342949' }]}>
      <LinearGradient
        colors={['#342949', '#2A1F3D', '#342949']}
        style={styles.screenGradient}
      />
      
      <View style={styles.floatingBubbles}>
        <Animated.View
          style={[
            styles.bubble,
            {
              width: 200,
              height: 200,
              top: '10%',
              left: '-10%',
              backgroundColor: 'rgba(133, 130, 180, 0.15)',
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
              width: 280,
              height: 280,
              top: '25%',
              right: '-15%',
              backgroundColor: 'rgba(133, 130, 180, 0.2)',
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
              width: 180,
              height: 180,
              top: '50%',
              left: '10%',
              backgroundColor: 'rgba(133, 130, 180, 0.18)',
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
              width: 220,
              height: 220,
              bottom: '15%',
              right: '5%',
              backgroundColor: 'rgba(133, 130, 180, 0.22)',
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
              width: 120,
              height: 120,
              bottom: '30%',
              left: '-5%',
              backgroundColor: 'rgba(133, 130, 180, 0.25)',
              transform: [
                { translateY: bubble5Y },
                { translateX: bubble5X },
              ],
            },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Header */}
            <View style={[styles.headerContainer, { backgroundColor: '#342949' }]}> 
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}> 
                <FontAwesome name="chevron-left" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.headerInner}> 
                <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}> 
                  <Text style={styles.headerWhite}>New </Text>
                  <Text style={styles.headerPurple}>Journal</Text>
                </Text>
              </View>
            </View>

            {/* Today's Prompt Section */}
            {loadingPrompt ? (
              <View style={[styles.promptLoadingCard, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)' }]}>
                <ActivityIndicator size="small" color="#FFB36B" />
                <Text style={[styles.promptLoadingText, { color: '#B8A8E6' }]}>
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
            ) : promptError === 'no_prompts' ? null : promptError === 'error' ? (
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
              <View style={[styles.card, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)' }]}> 
                <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>Title</Text>
                <View style={[styles.inputBox, { backgroundColor: '#5B5270' }]}> 
                  <TextInput
                    style={[styles.titleInput, { backgroundColor: 'transparent', color: '#FFFFFF' }]}
                    placeholder="Give your entry a title..."
                    placeholderTextColor="#B8A8E6"
                    value={formData.title}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                  />
                </View>
              </View>
            </View>

            {/* Content Input - Large */}
            <View style={styles.section}>
              <View style={[styles.card, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)' }]}> 
                <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>What's on your mind?</Text>
                <Text style={[styles.cardSubtitle, { color: '#B8A8E6' }]}>Express your thoughts and feelings</Text>
                <View style={[styles.inputBoxLarge, { backgroundColor: '#5B5270' }]}> 
                  <TextInput
                    style={[styles.contentInput, { backgroundColor: 'transparent', color: '#FFFFFF' }]}
                    placeholder="Start writing... Express yourself freely."
                    placeholderTextColor="#B8A8E6"
                    value={formData.content}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
                    multiline
                    numberOfLines={12}
                    textAlignVertical="top"
                  />
                </View>
                <Text style={[styles.wordCount, { color: '#B8A8E6' }]}> 
                  {formData.content.trim().split(/\s+/).filter(w => w).length} words
                </Text>
              </View>
            </View>

            {/* Tags */}
            <View style={styles.section}>
              <View style={[styles.card, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)' }]}> 
                <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>Optional Tags</Text>
                <Text style={[styles.cardSubtitle, { color: '#B8A8E6' }]}>Select tags that describe your current state</Text>
                <View style={styles.moodTagsContainerTop}> 
                  {MOOD_TAGS.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.moodTagPill,
                        formData.mood_tags_list?.includes(tag) && styles.moodTagSelected,
                      ]}
                      onPress={() => toggleMoodTag(tag)}
                    >
                      <Text
                        style={[
                          styles.moodTagText,
                          formData.mood_tags_list?.includes(tag) && styles.moodTagTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Privacy & Favorite */}
            <View style={styles.section}>
              <View style={[styles.card, { backgroundColor: '#473F5A', borderColor: 'rgba(255,255,255,0.1)' }]}> 
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFormData(prev => ({ ...prev, is_favorite: !prev.is_favorite }))}
                >
                  <View style={styles.switchLeft}>
                    <Text style={styles.switchEmoji}>⭐</Text>
                    <Text style={[styles.switchLabel, { color: '#FFFFFF' }]}>Mark as Favorite</Text>
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
                      <Text style={[styles.switchLabel, { color: '#FFFFFF' }]}>Keep Private</Text>
                      <Text style={[styles.privacySubtext, { color: '#B8A8E6' }]}> 
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
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              onPress={() => handleSubmit(0)} 
              disabled={submitting} 
              activeOpacity={0.9}
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesome name={submitting ? 'spinner' : 'save'} size={18} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.submitButtonText}>
                  {submitting ? '✨ Saving...' : 'Save Journal Entry'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  floatingBubbles: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 1000,
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
  headerContainer: {
    paddingTop: 48,
    paddingHorizontal: 0,
    paddingBottom: 18,
    backgroundColor: '#F3F4F6',
    marginBottom: 18,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginHorizontal: -20,
  },
  backBtnCircle: {
    position: 'absolute',
    left: 18,
    top: 52,
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
  headerInner: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
  },
  headerBlue: { color: '#524f85' },
  headerOrange: { color: '#FF9F6B' },
  headerWhite: { color: '#FFFFFF' },
  headerPurple: { color: '#B8A8E6' },
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  contentInput: {
    padding: 12,
    borderRadius: 12,
    fontSize: 15,
    minHeight: 180,
    textAlignVertical: 'top',
    lineHeight: 22,
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
  moodTagsContainerTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  moodTagPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#5B5270',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: '#FFB36B',
    borderColor: '#FFB36B',
    elevation: 2,
  },
  moodTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B8A8E6',
  },
  moodTagTextSelected: {
    color: '#FFFFFF',
  },
  card: {
    padding: 16,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  inputBox: {
    padding: 10,
    borderRadius: 12,
  },
  inputBoxLarge: {
    padding: 14,
    borderRadius: 12,
    minHeight: 180,
    justifyContent: 'flex-start',
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
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    backgroundColor: '#A78BFA',
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
