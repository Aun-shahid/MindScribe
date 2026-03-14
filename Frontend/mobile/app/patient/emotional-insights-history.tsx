import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import PatientService, { EmotionalInsight, EmotionalInsightsFilters, CreateEmotionalInsightData } from '../services/patient.service';
import TabLoaderCard from '../components/TabLoaderCard';

const EMOTION_EMOJIS: Record<string, string> = {
  joy: '😊',
  sadness: '😢',
  anger: '😠',
  fear: '😨',
  anxiety: '😰',
  love: '❤️',
  guilt: '😔',
  shame: '😳',
  pride: '🦁',
  hope: '🌟',
  gratitude: '🙏',
  confusion: '😕',
};

const INTENSITY_COLORS = [
  '#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a',
  '#4caf50', '#43a047', '#388e3c', '#2e7d32', '#1b5e20'
];

export default function EmotionalInsightsHistory() {
  const { themeStyle } = useTheme();
  const [insights, setInsights] = useState<EmotionalInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<EmotionalInsight | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [filters, setFilters] = useState<EmotionalInsightsFilters>({
    ordering: '-created_at',
  });
  const [selectedEmotion, setSelectedEmotion] = useState<string | undefined>(undefined);
  
  // Edit form state
  const [editForm, setEditForm] = useState<CreateEmotionalInsightData>({
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

  const loadInsights = async () => {
    try {
      setError(null);
      const data = await PatientService.getEmotionalInsights(filters);
      setInsights(data);
    } catch (err: any) {
      console.error('[EmotionalInsights] Error loading data:', err);
      setError(err.response?.data?.message || 'Failed to load emotional insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [filters]);

  const onRefresh = () => {
    setRefreshing(true);
    loadInsights();
  };

  const handleInsightPress = (insight: EmotionalInsight) => {
    setSelectedInsight(insight);
    setIsEditing(false);
    setModalVisible(true);
  };
  
  const handleEditPress = () => {
    if (!selectedInsight) return;
    
    // Populate edit form with current values
    setEditForm({
      primary_emotion: selectedInsight.primary_emotion,
      intensity: selectedInsight.intensity,
      what_happened: selectedInsight.what_happened,
      body_sensations: selectedInsight.body_sensations || '',
      thoughts: selectedInsight.thoughts || '',
      behaviors: selectedInsight.behaviors || '',
      insights_learned: selectedInsight.insights_learned || '',
      coping_strategies: selectedInsight.coping_strategies || '',
      is_resolved: selectedInsight.is_resolved,
      helpfulness_rating: selectedInsight.helpfulness_rating,
    });
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
  };
  
  const handleSaveEdit = async () => {
    if (!selectedInsight) return;
    
    try {
      // Validate required field
      if (!editForm.what_happened.trim()) {
        Alert.alert('Required Field', 'Please describe what happened');
        return;
      }
      
      await PatientService.updateEmotionalInsight(selectedInsight.id, editForm);
      Alert.alert('Success', 'Emotional insight updated successfully!');
      setIsEditing(false);
      setModalVisible(false);
      loadInsights(); // Refresh the list
    } catch (err: any) {
      console.error('[EmotionalInsights] Error updating:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update emotional insight');
    }
  };
  
  const handleDeleteInsight = async () => {
    if (!selectedInsight) return;
    
    Alert.alert(
      'Delete Insight',
      'Are you sure you want to delete this emotional insight? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await PatientService.deleteEmotionalInsight(selectedInsight.id);
              Alert.alert('Success', 'Emotional insight deleted successfully!');
              setModalVisible(false);
              loadInsights(); // Refresh the list
            } catch (err: any) {
              console.error('[EmotionalInsights] Error deleting:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete emotional insight');
            }
          },
        },
      ]
    );
  };

  const toggleResolvedFilter = () => {
    setFilters(prev => ({
      ...prev,
      resolved: prev.resolved === undefined ? false : prev.resolved === false ? true : undefined,
    }));
    setShowStatusDropdown(false);
  };
  
  const setStatusFilter = (status: 'all' | 'resolved' | 'unresolved') => {
    if (status === 'all') {
      setFilters(prev => ({ ...prev, resolved: undefined }));
    } else if (status === 'resolved') {
      setFilters(prev => ({ ...prev, resolved: true }));
    } else {
      setFilters(prev => ({ ...prev, resolved: false }));
    }
    setShowStatusDropdown(false);
  };

  const setEmotionFilter = (emotion: string) => {
    if (selectedEmotion === emotion) {
      setSelectedEmotion(undefined);
      setFilters(prev => ({ ...prev, emotion: undefined }));
    } else {
      setSelectedEmotion(emotion);
      setFilters(prev => ({ ...prev, emotion }));
    }
  };

  const getResolvedFilterLabel = () => {
    if (filters.resolved === undefined) return 'All Status';
    return filters.resolved ? '✓ Resolved' : '⏳ Unresolved';
  };

  const renderInsightCard = ({ item }: { item: EmotionalInsight }) => {
    const emoji = EMOTION_EMOJIS[item.primary_emotion] || '😐';
    const intensityColor = INTENSITY_COLORS[Math.min(item.intensity - 1, 9)] || '#e0e0e0';
    const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={[styles.insightCard, { backgroundColor: themeStyle.dashboardcard || '#ffffff' }]}
        onPress={() => handleInsightPress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.emotionBadge}>
            <Text style={styles.emoji}>{emoji}</Text>
            <View style={[styles.intensityBar, { backgroundColor: intensityColor }]}>
              <Text style={styles.intensityText}>{item.intensity}/10</Text>
            </View>
          </View>
          {item.is_resolved && (
            <View style={styles.resolvedBadge}>
              <Text style={styles.resolvedText}>✓ Resolved</Text>
            </View>
          )}
        </View>

        <Text style={[styles.emotionTitle, { color: themeStyle.title }]}>
          {item.emotion_display}
        </Text>

        <Text style={[styles.whatHappened, { color: themeStyle.text }]} numberOfLines={2}>
          {item.what_happened}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={[styles.dateText, { color: themeStyle.label }]}>
            {formattedDate}
          </Text>
          {item.helpfulness_rating > 0 && (
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>
                {'⭐'.repeat(item.helpfulness_rating)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEditModal = () => {
    const allEmotions = ['joy', 'sadness', 'anger', 'fear', 'anxiety', 'love', 'guilt', 'shame', 'pride', 'hope', 'gratitude', 'confusion'];
    
    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelEdit}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: themeStyle.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: themeStyle.title }]}>
                  ✏️ Edit Emotional Insight
                </Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleCancelEdit}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Emotion Selector */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: themeStyle.title }]}>
                  Emotion Experienced *
                </Text>
                <View style={styles.emotionGrid}>
                  {allEmotions.map((emotion) => (
                    <TouchableOpacity
                      key={emotion}
                      style={[
                        styles.emotionButton,
                        editForm.primary_emotion === emotion && styles.emotionButtonSelected,
                        { backgroundColor: editForm.primary_emotion === emotion ? '#4caf50' : themeStyle.dashboardcard }
                      ]}
                      onPress={() => setEditForm({ ...editForm, primary_emotion: emotion as any })}
                    >
                      <Text style={styles.emotionEmoji}>{EMOTION_EMOJIS[emotion]}</Text>
                      <Text style={[
                        styles.emotionLabel,
                        { color: editForm.primary_emotion === emotion ? '#fff' : themeStyle.text }
                      ]}>
                        {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Intensity Scale */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: themeStyle.title }]}>
                  Intensity (1-10) *
                </Text>
                <View style={styles.intensityRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.intensityButton,
                        { backgroundColor: INTENSITY_COLORS[level - 1] },
                        editForm.intensity === level && styles.intensityButtonSelected
                      ]}
                      onPress={() => setEditForm({ ...editForm, intensity: level })}
                    >
                      <Text style={[
                        styles.intensityButtonText,
                        editForm.intensity === level && styles.intensityButtonTextSelected
                      ]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Text Fields */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: themeStyle.title }]}>
                  What Happened? *
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
                  placeholder="Describe the situation..."
                  placeholderTextColor={themeStyle.label}
                  value={editForm.what_happened}
                  onChangeText={(text) => setEditForm({ ...editForm, what_happened: text })}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: themeStyle.title }]}>
                  🫀 Body Sensations
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
                  placeholder="How did your body feel?"
                  placeholderTextColor={themeStyle.label}
                  value={editForm.body_sensations}
                  onChangeText={(text) => setEditForm({ ...editForm, body_sensations: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: themeStyle.title }]}>
                  💭 Thoughts
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
                  placeholder="What were you thinking?"
                  placeholderTextColor={themeStyle.label}
                  value={editForm.thoughts}
                  onChangeText={(text) => setEditForm({ ...editForm, thoughts: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: themeStyle.title }]}>
                  🎭 Behaviors
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
                  placeholder="How did you react?"
                  placeholderTextColor={themeStyle.label}
                  value={editForm.behaviors}
                  onChangeText={(text) => setEditForm({ ...editForm, behaviors: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: themeStyle.title }]}>
                  💡 Insights Learned
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
                  placeholder="What did you learn?"
                  placeholderTextColor={themeStyle.label}
                  value={editForm.insights_learned}
                  onChangeText={(text) => setEditForm({ ...editForm, insights_learned: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: themeStyle.title }]}>
                  🛠️ Coping Strategies
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text }]}
                  placeholder="How did you cope?"
                  placeholderTextColor={themeStyle.label}
                  value={editForm.coping_strategies}
                  onChangeText={(text) => setEditForm({ ...editForm, coping_strategies: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Resolved Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setEditForm({ ...editForm, is_resolved: !editForm.is_resolved })}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: themeStyle.label },
                  editForm.is_resolved && { backgroundColor: '#4caf50', borderColor: '#4caf50' }
                ]}>
                  {editForm.is_resolved && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkboxLabel, { color: themeStyle.text }]}>
                  I have resolved this emotion
                </Text>
              </TouchableOpacity>

              {/* Helpfulness Rating */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: themeStyle.title }]}>
                  ⭐ Helpfulness Rating (Optional)
                </Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setEditForm({ ...editForm, helpfulness_rating: star })}
                    >
                      <Text style={styles.starButton}>
                        {star <= editForm.helpfulness_rating ? '⭐' : '☆'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.editActionButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: themeStyle.dashboardcard }]}
                  onPress={handleCancelEdit}
                >
                  <Text style={[styles.cancelButtonText, { color: themeStyle.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderDetailModal = () => {
    if (!selectedInsight) return null;

    const emoji = EMOTION_EMOJIS[selectedInsight.primary_emotion] || '😐';
    const intensityColor = INTENSITY_COLORS[Math.min(selectedInsight.intensity - 1, 9)] || '#e0e0e0';

    if (isEditing) {
      return renderEditModal();
    }

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeStyle.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={styles.modalEmotionBadge}>
                  <Text style={styles.modalEmoji}>{emoji}</Text>
                  <Text style={[styles.modalEmotionTitle, { color: themeStyle.title }]}>
                    {selectedInsight.emotion_display}
                  </Text>
                </View>
                <View style={styles.modalHeaderButtons}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleEditPress}
                  >
                    <Text style={styles.editButtonText}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.intensityIndicator, { backgroundColor: intensityColor }]}>
                <Text style={styles.intensityLabel}>Intensity: {selectedInsight.intensity}/10</Text>
              </View>

              {selectedInsight.is_resolved && (
                <View style={styles.resolvedBanner}>
                  <Text style={styles.resolvedBannerText}>✓ This emotion has been resolved</Text>
                </View>
              )}

              <DetailSection
                title="📋 What Happened"
                content={selectedInsight.what_happened}
                themeStyle={themeStyle}
              />

              {selectedInsight.body_sensations && (
                <DetailSection
                  title="🫀 Body Sensations"
                  content={selectedInsight.body_sensations}
                  themeStyle={themeStyle}
                />
              )}

              {selectedInsight.thoughts && (
                <DetailSection
                  title="💭 Thoughts"
                  content={selectedInsight.thoughts}
                  themeStyle={themeStyle}
                />
              )}

              {selectedInsight.behaviors && (
                <DetailSection
                  title="🎭 Behaviors"
                  content={selectedInsight.behaviors}
                  themeStyle={themeStyle}
                />
              )}

              {selectedInsight.insights_learned && (
                <DetailSection
                  title="💡 Insights Learned"
                  content={selectedInsight.insights_learned}
                  themeStyle={themeStyle}
                />
              )}

              {selectedInsight.coping_strategies && (
                <DetailSection
                  title="🛠️ Coping Strategies"
                  content={selectedInsight.coping_strategies}
                  themeStyle={themeStyle}
                />
              )}

              {selectedInsight.helpfulness_rating > 0 && (
                <View style={styles.ratingSection}>
                  <Text style={[styles.detailTitle, { color: themeStyle.title }]}>
                    ⭐ Helpfulness Rating
                  </Text>
                  <Text style={styles.ratingStars}>
                    {'⭐'.repeat(selectedInsight.helpfulness_rating)}
                    {'☆'.repeat(5 - selectedInsight.helpfulness_rating)}
                  </Text>
                </View>
              )}

              <Text style={[styles.timestamp, { color: themeStyle.label }]}>
                Created: {new Date(selectedInsight.created_at).toLocaleString()}
              </Text>
              
              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteInsight}
              >
                <Text style={styles.deleteButtonText}>🗑️ Delete Insight</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <TabLoaderCard
        fullScreen
        title="Loading emotional insights..."
        subtitle="Collecting your past reflections"
        spinnerColor={themeStyle.text}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeStyle.title }]}>
          📚 Past Insights
        </Text>
        <Text style={[styles.subtitle, { color: themeStyle.label }]}>
          {insights.length} {insights.length === 1 ? 'entry' : 'entries'} found
        </Text>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <Text style={[styles.filterTitle, { color: themeStyle.title }]}>
          🔍 Filter By:
        </Text>
        
        {/* Status Filter Dropdown */}
        <View>
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: themeStyle.dashboardcard }]}
            onPress={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <Text style={[styles.filterChipText, { color: themeStyle.text }]}>
              {getResolvedFilterLabel()} ▼
            </Text>
          </TouchableOpacity>
          
          {showStatusDropdown && (
            <View style={[styles.dropdown, { backgroundColor: themeStyle.dashboardcard }]}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => setStatusFilter('all')}
              >
                <Text style={[styles.dropdownText, { color: themeStyle.text }]}>
                  All Status
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => setStatusFilter('resolved')}
              >
                <Text style={[styles.dropdownText, { color: themeStyle.text }]}>
                  ✓ Resolved
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => setStatusFilter('unresolved')}
              >
                <Text style={[styles.dropdownText, { color: themeStyle.text }]}>
                  ⏳ Unresolved
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Emotion Filters */}
        <Text style={[styles.filterSubtitle, { color: themeStyle.label }]}>
          Emotions:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emotionFilters}>
          {Object.entries(EMOTION_EMOJIS).map(([emotion, emoji]) => (
            <TouchableOpacity
              key={emotion}
              style={[
                styles.emotionFilterChip,
                { backgroundColor: themeStyle.dashboardcard },
                selectedEmotion === emotion && styles.emotionFilterChipSelected,
              ]}
              onPress={() => setEmotionFilter(emotion)}
            >
              <Text style={styles.emotionFilterEmoji}>{emoji}</Text>
              <Text style={[styles.emotionFilterText, { color: themeStyle.text }]}>
                {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {insights.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🌟</Text>
          <Text style={[styles.emptyText, { color: themeStyle.label }]}>
            No insights match your filters
          </Text>
          <Text style={[styles.emptySubtext, { color: themeStyle.label }]}>
            Try adjusting your filters or create new insights
          </Text>
        </View>
      ) : (
        <FlatList
          data={insights}
          renderItem={renderInsightCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {renderDetailModal()}
    </SafeAreaView>
  );
}

// Helper component for detail sections
const DetailSection = ({
  title,
  content,
  themeStyle,
}: {
  title: string;
  content: string;
  themeStyle: any;
}) => (
  <View style={styles.detailSection}>
    <Text style={[styles.detailTitle, { color: themeStyle.title }]}>{title}</Text>
    <Text style={[styles.detailContent, { color: themeStyle.text }]}>{content}</Text>
  </View>
);

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
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  backButton: {
    paddingBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#524f85',
    fontWeight: '600',
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  filterSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  filterChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 12,
    alignSelf: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  filterChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dropdown: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    zIndex: 1000,
    paddingVertical: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emotionFilters: {
    marginBottom: 12,
  },
  emotionFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  emotionFilterChipSelected: {
    borderColor: '#524f85',
    elevation: 3,
  },
  emotionFilterEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  emotionFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: '#fee',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#c00',
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  insightCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  emotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  intensityBar: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  intensityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  resolvedBadge: {
    backgroundColor: '#4caf50',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  resolvedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  emotionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  whatHappened: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalEmotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  modalEmotionTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  intensityIndicator: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  intensityLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  resolvedBanner: {
    backgroundColor: '#4caf50',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  resolvedBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  ratingSection: {
    marginBottom: 20,
  },
  ratingStars: {
    fontSize: 24,
    marginTop: 8,
  },
  timestamp: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  // Create form styles
  createButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emotionScroll: {
    marginBottom: 8,
  },
  emotionOption: {
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    minWidth: 80,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emotionOptionSelected: {
    borderColor: '#524f85',
  },
  emotionEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  intensityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  intensityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  textArea: {
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
  },
  formRatingContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ratingStar: {
    fontSize: 32,
    marginRight: 4,
  },
  submitButton: {
    backgroundColor: '#524f85',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#524f85',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emotionButton: {
    width: '30%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  emotionButtonSelected: {
    elevation: 4,
    shadowOpacity: 0.2,
  },
  emotionEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  intensityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intensityButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  intensityButtonSelected: {
    borderColor: '#000',
    borderWidth: 3,
  },
  intensityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  intensityButtonTextSelected: {
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  starRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    fontSize: 32,
  },
  editActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
