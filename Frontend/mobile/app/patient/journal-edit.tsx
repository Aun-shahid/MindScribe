import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import PatientService from '../services/patient.service';
import type { CreateJournalEntryData, JournalEntry } from '../services/patient.service';
import StickyHeader from '../components/StickyHeader';
import OriginalHeader from '../components/OriginalHeader';
import TabLoaderCard from '../components/TabLoaderCard';

const MOOD_TAGS = ['Happy', 'Grateful', 'Anxious', 'Calm', 'Excited', 'Sad', 'Hopeful', 'Stressed', 'Peaceful', 'Overwhelmed'];

export default function JournalEdit() {
  const { themeStyle } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [originalEntry, setOriginalEntry] = useState<JournalEntry | null>(null);

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
      <TabLoaderCard
        fullScreen
        title="Loading journal entry..."
        subtitle="Preparing your editor"
        spinnerColor="#FFB36B"
      />
    );
  }

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
        firstWord="Edit"
        secondWord="Journal"
        onBackPress={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Animated.ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Original Header */}
            <OriginalHeader
              scrollY={scrollY}
              firstWord="Edit"
              secondWord="Journal"
              onBackPress={() => router.back()}
            />

            {/* Title Input */}
            <View style={[styles.card, { backgroundColor: '#473F5A' }]}>
              <Text style={styles.cardTitle}>
                Title *
              </Text>
              <TextInput
                style={styles.cardTextInput}
                placeholder="Give your entry a title..."
                placeholderTextColor="#B8A8E6"
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
            </View>

            {/* Content Input - Large */}
            <View style={[styles.card, { backgroundColor: '#473F5A' }]}>
              <Text style={styles.cardTitle}>
                What's on your mind? *
              </Text>
              <TextInput
                style={[styles.cardTextInput, { minHeight: 250 }]}
                placeholder="Start writing... Express yourself freely."
                placeholderTextColor="#B8A8E6"
                value={formData.content}
                onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
                multiline
                numberOfLines={12}
                textAlignVertical="top"
              />
              <Text style={styles.wordCount}>
                {formData.content?.trim().split(/\s+/).filter(w => w).length || 0} words
              </Text>
            </View>

            {/* Tags */}
            <View style={[styles.card, { backgroundColor: '#473F5A' }]}>
              <Text style={styles.cardTitle}>
                🎨 Tags (Optional)
              </Text>
              <Text style={[styles.subtitle, { textAlign: 'left', marginBottom: 12 }]}>
                Select tags that describe your current state
              </Text>
              <View style={styles.moodTagsContainer}>
                {MOOD_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.moodTag,
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

            {/* Privacy & Favorite */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => setFormData(prev => ({ ...prev, is_favorite: !prev.is_favorite }))}
              >
                <View style={styles.switchLeft}>
                  <Text style={styles.switchEmoji}>⭐</Text>
                  <Text style={styles.switchLabel}>
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
                    <Text style={styles.switchLabel}>
                      Keep Private
                    </Text>
                    <Text style={styles.privacySubtext}>
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
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    paddingTop: 30,
  },
  headerTitleContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  backButton: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleWhite: {
    color: '#FFFFFF',
  },
  titlePurple: {
    color: '#B8A8E6',
  },
  subtitle: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#B8A8E6',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#FFFFFF',
  },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#FFFFFF',
  },
  cardTextInput: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#5B5270',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 50,
  },
  wordCount: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'right',
    fontStyle: 'italic',
    color: '#B8A8E6',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  wordCount: {
    marginTop: 8,
    fontSize: 13,
    textAlign: 'right',
    fontStyle: 'italic',
    color: '#B8A8E6',
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
    backgroundColor: '#5B5270',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  moodTagSelected: {
    backgroundColor: '#FFB36B',
    borderColor: '#FFB36B',
  },
  moodTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  moodTagTextSelected: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
    color: '#FFFFFF',
  },
  privacySubtext: {
    fontSize: 12,
    marginTop: 2,
    color: '#B8A8E6',
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
    backgroundColor: '#A78BFA',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
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
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
