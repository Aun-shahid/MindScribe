import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import PatientService, { CreateEmotionalInsightData } from '../services/patient.service';

const EMOTION_EMOJIS: Record<string, string> = {
  joy: '😊',
  sadness: '😢',
  anger: '😠',
  fear: '😨',
  disgust: '🤢',
  surprise: '😲',
  anxiety: '😰',
  guilt: '😔',
  shame: '😳',
  love: '❤️',
};

const INTENSITY_COLORS = [
  '#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a',
  '#4caf50', '#43a047', '#388e3c', '#2e7d32', '#1b5e20'
];

const EMOTIONS: Array<{ value: CreateEmotionalInsightData['primary_emotion'], label: string, emoji: string }> = [
  { value: 'joy', label: 'Joy', emoji: '😊' },
  { value: 'sadness', label: 'Sadness', emoji: '😢' },
  { value: 'anger', label: 'Anger', emoji: '😠' },
  { value: 'fear', label: 'Fear', emoji: '😨' },
  { value: 'anxiety', label: 'Anxiety', emoji: '😰' },
  { value: 'love', label: 'Love', emoji: '❤️' },
  { value: 'guilt', label: 'Guilt', emoji: '😔' },
  { value: 'shame', label: 'Shame', emoji: '😳' },
  { value: 'pride', label: 'Pride', emoji: '🦁' },
  { value: 'hope', label: 'Hope', emoji: '🌟' },
  { value: 'gratitude', label: 'Gratitude', emoji: '🙏' },
  { value: 'confusion', label: 'Confusion', emoji: '😕' },
];

export default function CreateEmotionalInsight() {
  const { themeStyle } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<CreateEmotionalInsightData>({
    primary_emotion: 'joy',
    intensity: 5,
    what_happened: '',
    body_sensations: '',
    thoughts: '',
    behaviors: '',
    insights_learned: '',
    coping_strategies: '',
    is_resolved: false,
    helpfulness_rating: 1,
  });

  const handleSubmit = async () => {
    if (!formData.what_happened.trim()) {
      Alert.alert('Required Field', 'Please describe what happened');
      return;
    }

    setSubmitting(true);
    try {
      await PatientService.createEmotionalInsight(formData);
      Alert.alert('Success! 🎉', 'Your emotional insight has been saved successfully');
      resetForm();
    } catch (err: any) {
      console.error('[CreateEmotionalInsight] Error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to save emotional insight');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      primary_emotion: 'joy',
      intensity: 5,
      what_happened: '',
      body_sensations: '',
      thoughts: '',
      behaviors: '',
      insights_learned: '',
      coping_strategies: '',
      is_resolved: false,
      helpfulness_rating: 1,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeStyle.title }]}>
              🧠 Emotional Insight
            </Text>
            <Text style={[styles.subtitle, { color: themeStyle.label }]}>
              Explore and understand your emotions
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.historyButton]}
              onPress={() => router.push('./emotional-insights-history')}
            >
              <Text style={styles.actionButtonEmoji}>📚</Text>
              <Text style={styles.actionButtonText}>History</Text>
            </TouchableOpacity>
          </View>

          {/* Form Container */}
          <View style={[styles.formContainer, { backgroundColor: themeStyle.dashboardcard }]}>
            <Text style={[styles.formTitle, { color: themeStyle.title }]}>
              Create New Insight
            </Text>

            {/* Emotion Selector */}
            <Text style={[styles.label, { color: themeStyle.title }]}>
              How are you feeling? *
            </Text>
            <View style={styles.emotionGrid}>
              {EMOTIONS.map((emotion) => (
                <TouchableOpacity
                  key={emotion.value}
                  style={[
                    styles.emotionCard,
                    { backgroundColor: themeStyle.background },
                    formData.primary_emotion === emotion.value && styles.emotionCardSelected,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, primary_emotion: emotion.value }))}
                >
                  <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
                  <Text style={[styles.emotionLabel, { color: themeStyle.text }]}>
                    {emotion.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Intensity */}
            <Text style={[styles.label, { color: themeStyle.title }]}>
              Intensity: {formData.intensity}/10 *
            </Text>
            <View style={styles.intensityContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.intensityButton,
                    { backgroundColor: formData.intensity >= level ? INTENSITY_COLORS[level - 1] : '#e0e0e0' },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, intensity: level }))}
                >
                  <Text style={styles.intensityText}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* What Happened */}
            <Text style={[styles.label, { color: themeStyle.title }]}>
              What happened? *
            </Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: themeStyle.background, color: themeStyle.text }]}
              value={formData.what_happened}
              onChangeText={(text) => setFormData(prev => ({ ...prev, what_happened: text }))}
              placeholder="Describe the situation..."
              placeholderTextColor={themeStyle.label}
              multiline
              numberOfLines={3}
            />

            {/* Body Sensations */}
            <Text style={[styles.label, { color: themeStyle.title }]}>
              🫀 Body Sensations
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeStyle.background, color: themeStyle.text }]}
              value={formData.body_sensations}
              onChangeText={(text) => setFormData(prev => ({ ...prev, body_sensations: text }))}
              placeholder="How did your body feel?"
              placeholderTextColor={themeStyle.label}
            />

            {/* Thoughts */}
            <Text style={[styles.label, { color: themeStyle.title }]}>
              💭 Thoughts
            </Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: themeStyle.background, color: themeStyle.text }]}
              value={formData.thoughts}
              onChangeText={(text) => setFormData(prev => ({ ...prev, thoughts: text }))}
              placeholder="What were you thinking?"
              placeholderTextColor={themeStyle.label}
              multiline
              numberOfLines={2}
            />

            {/* Behaviors */}
            <Text style={[styles.label, { color: themeStyle.title }]}>
              🎭 Behaviors
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeStyle.background, color: themeStyle.text }]}
              value={formData.behaviors}
              onChangeText={(text) => setFormData(prev => ({ ...prev, behaviors: text }))}
              placeholder="How did you behave?"
              placeholderTextColor={themeStyle.label}
            />

            {/* Insights Learned */}
            <Text style={[styles.label, { color: themeStyle.title }]}>
              💡 Insights Learned
            </Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: themeStyle.background, color: themeStyle.text }]}
              value={formData.insights_learned}
              onChangeText={(text) => setFormData(prev => ({ ...prev, insights_learned: text }))}
              placeholder="What did you learn from this?"
              placeholderTextColor={themeStyle.label}
              multiline
              numberOfLines={2}
            />

            {/* Coping Strategies */}
            <Text style={[styles.label, { color: themeStyle.title }]}>
              🛠️ Coping Strategies
            </Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: themeStyle.background, color: themeStyle.text }]}
              value={formData.coping_strategies}
              onChangeText={(text) => setFormData(prev => ({ ...prev, coping_strategies: text }))}
              placeholder="What helped you cope?"
              placeholderTextColor={themeStyle.label}
              multiline
              numberOfLines={2}
            />

            {/* Is Resolved */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setFormData(prev => ({ ...prev, is_resolved: !prev.is_resolved }))}
            >
              <View style={[styles.checkbox, formData.is_resolved && styles.checkboxChecked]}>
                {formData.is_resolved && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={[styles.checkboxLabel, { color: themeStyle.text }]}>
                ✅ This emotion has been resolved
              </Text>
            </TouchableOpacity>

            {/* Helpfulness Rating */}
            <Text style={[styles.label, { color: themeStyle.title }]}>
              ⭐ How helpful was this reflection? ({formData.helpfulness_rating}/5)
            </Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  onPress={() => setFormData(prev => ({ ...prev, helpfulness_rating: rating }))}
                  style={styles.starButton}
                >
                  <Text style={styles.starText}>
                    {rating <= formData.helpfulness_rating! ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Save Insight</Text>
                <Text style={styles.submitButtonEmoji}>💾</Text>
              </>
            )}
          </TouchableOpacity>
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
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  historyButton: {
    backgroundColor: '#524f85',
  },
  actionButtonEmoji: {
    fontSize: 22,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  formContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  emotionCard: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    width: '23%',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  emotionCardSelected: {
    borderColor: '#524f85',
    elevation: 4,
  },
  emotionEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  emotionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  intensityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  intensityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  intensityText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    marginBottom: 8,
    minHeight: 90,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 15,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  starText: {
    fontSize: 36,
  },
  submitButton: {
    backgroundColor: '#4caf50',
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
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
    marginRight: 8,
  },
  submitButtonEmoji: {
    fontSize: 20,
  },
});
