import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabLoaderCard from '../components/TabLoaderCard';
import api from '../utils/api';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

// Mood emoji mapping
const moodEmojis: { [key: string]: string } = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  anxious: '😰',
  peaceful: '😌',
  excited: '🤩',
  grateful: '🙏',
  overwhelmed: '😵',
  hopeful: '🌟',
  stressed: '😫',
};

const moodLabels: { [key: string]: string } = {
  happy: 'Happy',
  sad: 'Sad',
  angry: 'Angry',
  anxious: 'Anxious',
  peaceful: 'Peaceful',
  excited: 'Excited',
  grateful: 'Grateful',
  overwhelmed: 'Overwhelmed',
  hopeful: 'Hopeful',
  stressed: 'Stressed',
};

const moodColorMap: { [key: string]: [string, string] } = {
  happy: ['#FFD54F', '#FFC107'],
  sad: ['#64B5F6', '#4FC3F7'],
  angry: ['#FF8A80', '#FF5252'],
  anxious: ['#CE93D8', '#AB47BC'],
  peaceful: ['#81D4FA', '#4FC3F7'],
  excited: ['#FFAB91', '#FF7043'],
  grateful: ['#AED581', '#9CCC65'],
  overwhelmed: ['#B39DDB', '#9575CD'],
  hopeful: ['#A5D6A7', '#7CB342'],
  stressed: ['#E57373', '#EF5350'],
};

interface MoodAnalytics {
  average_intensity: number;
  most_common_mood: string;
  mood_distribution: { [key: string]: number };
  weekly_trend: { date: string; average_intensity: number }[];
  monthly_comparison: { [key: string]: any };
  common_triggers: string[];
}

export default function MoodAnalyticsDetail() {
  const { themeStyle } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<MoodAnalytics | null>(null);
  const [selectedDays, setSelectedDays] = useState(30);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const pageInset = clamp(width * 0.05, 16, 22);
  const headerTopPadding = insets.top + clamp(height * 0.017, 14, 22);
  const headerButtonSize = clamp(width * 0.105, 36, 42);
  const headerButtonRadius = headerButtonSize / 2;
  const headerIconSize = clamp(width * 0.05, 18, 20);
  const headerTitleSize = clamp(width * 0.074, 24, 30);
  const headerTitleMarginTop = clamp(height * 0.024, 18, 24);
  const headerBottomPad = clamp(height * 0.004, 2, 6);
  const contentTopPadding = clamp(height * 0.016, 10, 16);
  const cardRadius = clamp(width * 0.05, 14, 20);
  const cardPadding = clamp(width * 0.05, 16, 22);
  const cardBottomGap = clamp(height * 0.02, 12, 18);
  const sectionTitleSize = clamp(width * 0.043, 15, 18);
  const sectionTitleBottomGap = clamp(height * 0.015, 10, 14);
  const bodyTextSize = clamp(width * 0.036, 13, 15);
  const metricValueSize = clamp(width * 0.07, 24, 30);
  const dominantEmojiSize = clamp(width * 0.12, 42, 56);
  const dominantCircleSize = clamp(width * 0.26, 90, 110);
  const triggerChipRadius = clamp(width * 0.05, 16, 22);
  const triggerTextSize = clamp(width * 0.034, 12, 14);
  const bottomPad = clamp(insets.bottom + height * 0.02, 24, 38);
  const headerBottomMargin = clamp(height * 0.018, 10, 16);

  const emptyPadding = clamp(width * 0.1, 28, 44);
  const emptyEmojiSize = clamp(width * 0.17, 52, 72);
  const emptyTextSize = clamp(width * 0.052, 18, 22);
  const emptySubtextSize = clamp(width * 0.041, 14, 17);
  const emptyEmojiGap = clamp(height * 0.02, 12, 18);
  const emptyTextGap = clamp(height * 0.01, 6, 10);
  const emptySubtextGap = clamp(height * 0.03, 18, 28);
  const actionButtonRadius = clamp(width * 0.03, 10, 14);
  const actionButtonPadH = clamp(width * 0.06, 20, 30);
  const actionButtonPadV = clamp(height * 0.015, 10, 14);
  const actionButtonTextSize = clamp(width * 0.041, 14, 17);

  const metricsGap = clamp(width * 0.03, 10, 14);
  const metricBoxPadding = clamp(width * 0.04, 14, 18);
  const metricBoxRadius = clamp(width * 0.035, 10, 14);
  const metricIconBottomGap = clamp(height * 0.01, 6, 10);
  const metricValueBottomGap = clamp(height * 0.006, 3, 6);

  const dominantContainerPadV = clamp(height * 0.02, 12, 20);
  const dominantCircleBottomGap = clamp(height * 0.02, 12, 18);
  const dominantLabelBottomGap = clamp(height * 0.006, 3, 6);

  const distributionListGap = clamp(height * 0.02, 12, 18);
  const distributionItemGap = clamp(height * 0.012, 6, 10);
  const distributionMoodGap = clamp(width * 0.02, 6, 10);
  const distributionEmojiSize = clamp(width * 0.065, 22, 28);
  const distributionBarHeight = clamp(height * 0.01, 6, 10);
  const distributionBarRadius = distributionBarHeight / 2;

  const triggerGap = clamp(width * 0.025, 8, 12);
  const infoGap = clamp(width * 0.03, 10, 14);
  const infoEmojiSize = clamp(width * 0.065, 22, 28);
  const filterTriggerPadV = clamp(height * 0.012, 8, 10);
  const filterTriggerPadH = clamp(width * 0.03, 10, 14);
  const filterTriggerRadius = clamp(width * 0.04, 12, 16);
  const filterTriggerTextSize = clamp(width * 0.033, 12, 14);
  const filterChevronSize = clamp(width * 0.03, 11, 13);
  const modalTitleSize = clamp(width * 0.05, 18, 22);
  const modalOptionPadY = clamp(height * 0.018, 12, 16);
  const modalOptionPadX = clamp(width * 0.04, 14, 18);
  const modalOptionRadius = clamp(width * 0.033, 10, 14);
  const modalOptionTextSize = clamp(width * 0.039, 14, 17);

  const dayOptions = [7, 14, 30, 60];

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching mood analytics for', selectedDays, 'days');
      const response = await api.get<MoodAnalytics>('/patients/mood/analytics/', {
        params: { days: selectedDays },
      });
      setAnalytics(response.data);
      console.log('✅ Analytics loaded:', response.data);
    } catch (error: any) {
      console.error('❌ Error loading mood analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDays]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const getMoodEmoji = (mood: string) => moodEmojis[mood] || '😐';
  const getMoodLabel = (mood: string) => moodLabels[mood] || mood;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <TabLoaderCard
          title="Loading Analytics"
          subtitle="Preparing your mood insights..."
          spinnerColor="#FFB36B"
          fullScreen
        />
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={[styles.emptyContainer, { padding: emptyPadding }]}>
          <Text style={[styles.emptyEmoji, { fontSize: emptyEmojiSize, marginBottom: emptyEmojiGap }]}>📊</Text>
          <Text style={[styles.emptyText, { color: themeStyle.text, fontSize: emptyTextSize, marginBottom: emptyTextGap }]}>
            No mood data available
          </Text>
          <Text style={[styles.emptySubtext, { color: themeStyle.label, fontSize: emptySubtextSize, marginBottom: emptySubtextGap }]}>
            Start tracking your moods to see analytics
          </Text>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: themeStyle.button,
                borderRadius: actionButtonRadius,
                paddingHorizontal: actionButtonPadH,
                paddingVertical: actionButtonPadV,
              },
            ]}
            onPress={() => router.push('/patient/mood')}
          >
            <Text style={[styles.buttonText, { color: themeStyle.buttonText, fontSize: actionButtonTextSize }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate total entries
  const totalEntries = Object.values(analytics.mood_distribution).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <View style={[styles.container, { backgroundColor: '#342949' }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pageInset, paddingTop: 0, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.headerContainer,
            {
              paddingTop: headerTopPadding,
              paddingHorizontal: pageInset,
              paddingBottom: headerBottomPad,
              marginBottom: headerBottomMargin,
              backgroundColor: 'transparent',
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                left: pageInset - 13,
                top: headerTopPadding + clamp(height * 0.003, 2, 5) - 6,
                width: headerButtonSize,
                height: headerButtonSize,
                borderRadius: headerButtonRadius,
              },
            ]}
            onPress={() => router.back()}
          >
            <FontAwesome name="chevron-left" size={headerIconSize} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { fontSize: headerTitleSize, marginTop: headerTitleMarginTop + 4 }]}>
            <Text style={styles.headerBlue}>Mood </Text>
            <Text style={styles.headerOrange}>Analytics</Text>
          </Text>
        </View>

        <View
          style={[
            styles.timePeriodRow,
            {
              marginTop: contentTopPadding,
              marginBottom: cardBottomGap,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.timePeriodTrigger,
              {
                paddingVertical: filterTriggerPadV,
                paddingHorizontal: filterTriggerPadH,
                borderRadius: filterTriggerRadius,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => setShowPeriodModal(true)}
          >
            <Text style={[styles.timePeriodTriggerText, { fontSize: filterTriggerTextSize }]}>Time Period</Text>
            <FontAwesome name="chevron-down" size={filterChevronSize} color="#D6CFF0" />
          </TouchableOpacity>
        </View>

        {/* Key Metrics */}
        <View
          style={[
            styles.card,
            { backgroundColor: '#473F5A', borderRadius: cardRadius, padding: cardPadding, marginBottom: cardBottomGap },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: '#FFFFFF', fontSize: sectionTitleSize, marginBottom: sectionTitleBottomGap }]}>Key Metrics</Text>
            <View style={[styles.metricsGrid, { gap: metricsGap }]}>
            <View style={[styles.metricBox, { backgroundColor: '#5B5270', padding: metricBoxPadding, borderRadius: metricBoxRadius }]}>
                  <FontAwesome name="bar-chart" size={clamp(width * 0.07, 24, 30)} color="#FFB36B" style={{ marginBottom: metricIconBottomGap }} />
              <Text style={[styles.metricValue, { color: '#FFFFFF', fontSize: metricValueSize, marginBottom: metricValueBottomGap }]}>
                {totalEntries}
              </Text>
              <Text style={[styles.metricLabel, { color: '#B8A8E6', fontSize: clamp(width * 0.032, 11, 13) }]}>Total Entries</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: '#5B5270', padding: metricBoxPadding, borderRadius: metricBoxRadius }]}>
              <FontAwesome name="star" size={clamp(width * 0.07, 24, 30)} color="#FFB36B" style={{ marginBottom: metricIconBottomGap }} />
              <Text style={[styles.metricValue, { color: '#FFFFFF', fontSize: metricValueSize, marginBottom: metricValueBottomGap }]}>
                {analytics.average_intensity.toFixed(1)}
              </Text>
              <Text style={[styles.metricLabel, { color: '#B8A8E6', fontSize: clamp(width * 0.032, 11, 13) }]}> 
                Avg Intensity
              </Text>
            </View>
          </View>
        </View>

        {/* Most Common Mood */}
        {analytics.most_common_mood && (
          <View
            style={[
              styles.card,
              { backgroundColor: '#473F5A', borderRadius: cardRadius, padding: cardPadding, marginBottom: cardBottomGap },
            ]}
          >
              <Text style={[styles.sectionTitle, { color: '#FFFFFF', fontSize: sectionTitleSize, marginBottom: sectionTitleBottomGap }]}>
              Most Common Mood
            </Text>
              <View style={[styles.dominantMoodContainer, { paddingVertical: dominantContainerPadV }]}>
              <View
                style={[
                  styles.dominantMoodCircle,
                    {
                      backgroundColor: '#5B5270',
                      width: dominantCircleSize,
                      height: dominantCircleSize,
                      borderRadius: dominantCircleSize / 2,
                      marginBottom: dominantCircleBottomGap,
                    },
                ]}
              >
                <Text style={[styles.dominantMoodEmoji, { fontSize: dominantEmojiSize }]}>
                  {getMoodEmoji(analytics.most_common_mood)}
                </Text>
              </View>
                <Text style={[styles.dominantMoodLabel, { color: '#FFFFFF', fontSize: clamp(width * 0.06, 20, 26), marginBottom: dominantLabelBottomGap }]}>
                {getMoodLabel(analytics.most_common_mood)}
              </Text>
              <Text style={[styles.dominantMoodCount, { color: '#B8A8E6', fontSize: bodyTextSize }]}>
                {analytics.mood_distribution[analytics.most_common_mood]} times
              </Text>
            </View>
          </View>
        )}

        {/* Mood Distribution */}
        {Object.keys(analytics.mood_distribution).length > 0 && (
          <View
            style={[
              styles.card,
              { backgroundColor: '#473F5A', borderRadius: cardRadius, padding: cardPadding, marginBottom: cardBottomGap },
            ]}
          >
              <Text style={[styles.sectionTitle, { color: '#FFFFFF', fontSize: sectionTitleSize, marginBottom: sectionTitleBottomGap }]}> 
              Mood Distribution
            </Text>
              <View style={[styles.distributionList, { gap: distributionListGap }]}>
              {Object.entries(analytics.mood_distribution)
                .sort(([, a], [, b]) => b - a)
                .map(([mood, count]) => {
                  const percentage = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
                  return (
                      <View key={mood} style={[styles.distributionItem, { gap: distributionItemGap }]}> 
                      <View style={styles.distributionHeader}>
                          <View style={[styles.distributionMoodInfo, { gap: distributionMoodGap }]}>
                            <Text style={[styles.distributionEmoji, { fontSize: distributionEmojiSize }]}>{getMoodEmoji(mood)}</Text>
                          <Text style={[styles.distributionLabel, { color: '#FFFFFF', fontSize: bodyTextSize }]}> 
                            {getMoodLabel(mood)}
                          </Text>
                        </View>
                        <Text style={[styles.distributionCount, { color: '#FFFFFF', fontSize: clamp(width * 0.034, 12, 14) }]}> 
                          {count} ({percentage.toFixed(0)}%)
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.distributionBarBackground,
                          {
                            backgroundColor: '#5B5270',
                            height: distributionBarHeight,
                            borderRadius: distributionBarRadius,
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={moodColorMap[mood] || ['#6D5DD3', '#8A7DE2']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.distributionBar, { width: `${percentage}%`, borderRadius: distributionBarRadius }]}
                        />
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        )}

        {/* Weekly Trend removed for this page per UI uniformity request */}

        {/* Common Triggers */}
        {analytics.common_triggers.length > 0 && (
          <View
            style={[
              styles.card,
              { backgroundColor: '#473F5A', borderRadius: cardRadius, padding: cardPadding, marginBottom: cardBottomGap },
            ]}
          >
              <Text style={[styles.sectionTitle, { color: '#FFFFFF', fontSize: sectionTitleSize, marginBottom: sectionTitleBottomGap }]}> 
              🎯 Common Triggers
            </Text>
              <View style={[styles.triggersContainer, { gap: triggerGap }]}>
              {analytics.common_triggers.map((trigger, index) => (
                <View
                  key={index}
                  style={[
                    styles.triggerChip,
                    {
                      backgroundColor: '#5B5270',
                      borderColor: '#FFB36B',
                      borderRadius: triggerChipRadius,
                      paddingHorizontal: clamp(width * 0.04, 14, 18),
                      paddingVertical: clamp(height * 0.013, 8, 11),
                    },
                  ]}
                >
                  <Text style={[styles.triggerText, { color: '#FFFFFF', fontSize: triggerTextSize }]}> 
                    {trigger}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: '#5B5270', borderRadius: cardRadius, marginBottom: cardBottomGap, padding: clamp(width * 0.04, 14, 18), gap: infoGap }]}>
          <Text style={[styles.infoEmoji, { fontSize: infoEmojiSize }]}>💡</Text>
          <Text style={[styles.infoText, { color: '#FFFFFF', fontSize: bodyTextSize, lineHeight: clamp(width * 0.05, 18, 22) }]}> 
            These insights are based on your mood entries over the selected time period. Track
            consistently for more accurate patterns!
          </Text>
        </View>

        <View style={{ height: bottomPad }} />
      </ScrollView>

      <Modal
        visible={showPeriodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPeriodModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: '#473F5A' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { fontSize: modalTitleSize }]}>Time Period</Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowPeriodModal(false)}>
                <FontAwesome name="times" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {dayOptions.map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.modalOption,
                  {
                    paddingVertical: modalOptionPadY,
                    paddingHorizontal: modalOptionPadX,
                    borderRadius: modalOptionRadius,
                    backgroundColor: selectedDays === days ? '#5B5270' : 'transparent',
                  },
                ]}
                onPress={() => {
                  setSelectedDays(days);
                  setShowPeriodModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { fontSize: modalOptionTextSize }]}> 
                  Last {days} days
                </Text>
                {selectedDays === days && <FontAwesome name="check" size={14} color="#FFB36B" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginHorizontal: 0,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  analyticsButton: { position: 'absolute', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 },
  headerTitle: { fontSize: 26, fontWeight: '800', marginTop: 20, marginBottom: 2, textAlign: 'center' },
  headerBlue: { color: '#FFFFFF' },
  headerOrange: { color: '#B8A8E6' },
  timePeriodTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3E3653',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  timePeriodRow: {
    width: '100%',
    alignItems: 'flex-end',
  },
  timePeriodTriggerText: {
    color: '#EDE8FA',
    fontWeight: '700',
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
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  metricEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  dominantMoodContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  dominantMoodCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dominantMoodEmoji: {
    fontSize: 48,
  },
  dominantMoodLabel: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  dominantMoodCount: {
    fontSize: 16,
  },
  distributionList: {
    gap: 16,
  },
  distributionItem: {
    gap: 8,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distributionMoodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distributionEmoji: {
    fontSize: 24,
  },
  distributionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  distributionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  distributionBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    borderRadius: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: 20,
  },
  trendBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  trendBarFill: {
    width: '100%',
    minHeight: 40,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 6,
  },
  trendValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  trendLabel: {
    fontSize: 10,
    marginTop: 6,
  },
  triggersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  triggerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  infoEmoji: {
    fontSize: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '88%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalOptionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  /* analyticsButton not used in simple header */
  bottomPadding: {
    height: 40,
  },
});
