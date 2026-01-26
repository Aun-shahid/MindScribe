import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import PatientService from '../services/patient.service';
import type { EmotionalInsightsAnalytics } from '../services/patient.service';

const { width } = Dimensions.get('window');

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

const EMOTION_COLORS: Record<string, string[]> = {
  joy: ['#FFE082', '#FFF9C4'],
  sadness: ['#90CAF9', '#BBDEFB'],
  anger: ['#EF9A9A', '#FFCDD2'],
  fear: ['#CE93D8', '#E1BEE7'],
  anxiety: ['#B39DDB', '#D1C4E9'],
  love: ['#F48FB1', '#F8BBD0'],
  guilt: ['#A5D6A7', '#C8E6C9'],
  shame: ['#FFAB91', '#FFCCBC'],
  pride: ['#FFD54F', '#FFE082'],
  hope: ['#81C784', '#A5D6A7'],
  gratitude: ['#4FC3F7', '#81D4FA'],
  confusion: ['#9FA8DA', '#C5CAE9'],
};

const COPING_ICONS = ['🧘', '💭', '🏃', '📝', '🎵', '💬', '🌿', '☕'];

// StatCard Component
const StatCard = ({
  title,
  value,
  emoji,
  colors,
  delay,
}: {
  title: string;
  value: string | number;
  emoji: string;
  colors: string[];
  delay: number;
}) => {
  const [cardAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 500,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity: cardAnim,
          transform: [
            {
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.statCardGradient, { backgroundColor: colors[0] }]}>
        <Text style={styles.statEmoji}>{emoji}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </Animated.View>
  );
};

export default function EmotionalInsightsAnalytics() {
  const { themeStyle } = useTheme();
  const [analytics, setAnalytics] = useState<EmotionalInsightsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await PatientService.getEmotionalInsightsAnalytics();
      setAnalytics(data);
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      console.error('[Analytics] Error loading:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderDonutChart = () => {
    if (!analytics || !analytics.emotion_distribution) return null;

    const entries = Object.entries(analytics.emotion_distribution);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    return (
      <View style={styles.chartContainer}>
        <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>
          💭 Emotion Distribution
        </Text>
        <View style={styles.donutWrapper}>
          {entries.map(([emotion, count], index) => {
            const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
            const emoji = EMOTION_EMOJIS[emotion] || '😐';
            const colors = EMOTION_COLORS[emotion] || ['#E0E0E0', '#F5F5F5'];

            return (
              <View key={emotion} style={styles.emotionRow}>
                <View style={styles.emotionInfo}>
                  <Text style={styles.emotionEmoji}>{emoji}</Text>
                  <Text style={[styles.emotionName, { color: themeStyle.text }]}>
                    {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                  </Text>
                </View>
                <View style={styles.barContainer}>
                  <View
                    style={[styles.barFill, { width: `${Number(percentage)}%` as any, backgroundColor: colors[0] }]}
                  />
                </View>
                <Text style={[styles.percentage, { color: themeStyle.label }]}>
                  {percentage}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderCopingStrategies = () => {
    if (!analytics || !analytics.top_coping_strategies || analytics.top_coping_strategies.length === 0) {
      return null;
    }

    return (
      <View style={styles.copingSection}>
        <Text style={[styles.sectionTitle, { color: themeStyle.title }]}>
          🛠️ Top Coping Strategies
        </Text>
        <View style={styles.tagsContainer}>
          {analytics.top_coping_strategies.map((strategy, index) => {
            const icon = COPING_ICONS[index % COPING_ICONS.length];
            const colorIndex = index % Object.keys(EMOTION_COLORS).length;
            const colors = Object.values(EMOTION_COLORS)[colorIndex];

            return (
              <View
                key={index}
                style={[styles.tag, { backgroundColor: colors[0] }]}
              >
                <Text style={styles.tagIcon}>{icon}</Text>
                <Text style={styles.tagText}>{strategy}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeStyle.background }]}>
        <ActivityIndicator size="large" color="#524f85" />
        <Text style={[styles.loadingText, { color: themeStyle.label }]}>
          Loading analytics...
        </Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={[styles.emptyText, { color: themeStyle.label }]}>
            No analytics data available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const mostExploredEmoji = EMOTION_EMOJIS[analytics.most_explored_emotion] || '😐';
  const mostExploredColors = EMOTION_COLORS[analytics.most_explored_emotion] || ['#E0E0E0', '#F5F5F5'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeStyle.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeStyle.title }]}>
          Emotional Analytics
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <StatCard title="Total Insights" value={analytics.total_insights} emoji="📝" colors={['#E1F5FE', '#B3E5FC']} delay={0} />
            <StatCard title="Resolved" value={analytics.resolved_count} emoji="✅" colors={['#E8F5E9', '#C8E6C9']} delay={100} />
            <StatCard
              title="Avg Rating"
              value={analytics.average_helpfulness > 0 ? `${analytics.average_helpfulness.toFixed(1)}/5` : 'N/A'}
              emoji="⭐"
              colors={['#FFF9C4', '#FFF59D']}
              delay={200}
            />
            <StatCard
              title="Most Explored"
              value={analytics.most_explored_emotion
                ? analytics.most_explored_emotion.charAt(0).toUpperCase() + analytics.most_explored_emotion.slice(1)
                : 'None'}
              emoji={mostExploredEmoji}
              colors={mostExploredColors}
              delay={300}
            />
          </View>

          {/* Emotion Distribution */}
          {renderDonutChart()}

          {/* Coping Strategies */}
          {renderCopingStrategies()}
        </Animated.View>
      </ScrollView>
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
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    paddingBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#524f85',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    marginBottom: 12,
  },
  statCardGradient: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  statEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  chartContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  donutWrapper: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emotionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
  },
  emotionEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  emotionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  barFill: {
    height: '100%',
    borderRadius: 12,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  copingSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  tagIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
  },
});
