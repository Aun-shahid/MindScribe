import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40; // Full width with padding

export default function AnalyticsHub() {
  const router = useRouter();
  const { themeStyle } = useTheme();

  const AnalyticsCard = ({
    icon,
    title,
    description,
    color,
    route,
  }: {
    icon: string;
    title: string;
    description: string;
    color: string;
    route: string;
  }) => {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: color }]}
        onPress={() => router.push(route as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>{icon}</Text>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardDescription}>{description}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Text style={styles.arrowIcon}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeStyle.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeStyle.title }]}>📊 Analytics</Text>
        <Text style={[styles.subtitle, { color: themeStyle.label }]}>
          Track your mental wellness journey
        </Text>
      </View>

      {/* Analytics Cards */}
      <View style={styles.cardsContainer}>
        <AnalyticsCard
          icon="📝"
          title="Journal Analytics"
          description="View your journaling stats, streaks, and tag insights"
          color="#dbeafe"
          route="./journal-analytics-detail"
        />

        <AnalyticsCard
          icon="😊"
          title="Mood Analytics"
          description="Explore mood patterns, trends, and common triggers"
          color="#fef3c7"
          route="./mood-analytics-detail"
        />

        <AnalyticsCard
          icon="🧠"
          title="Emotional Insights Analytics"
          description="Explore emotion patterns, coping strategies, and growth"
          color="#e9d5ff"
          route="./emotional-insights-analytics"
        />

        {/* Placeholder for future analytics sections */}
        <View style={[styles.card, styles.comingSoonCard, { backgroundColor: themeStyle.card, borderColor: themeStyle.border }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📈</Text>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.cardTitle, { color: themeStyle.label }]}>
                More Analytics
              </Text>
              <Text style={[styles.cardDescription, { color: themeStyle.label }]}>
                Additional insights coming soon
              </Text>
            </View>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
      </View>

      {/* Info Section */}
      <View style={[styles.infoContainer, { backgroundColor: themeStyle.card }]}>
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={[styles.infoText, { color: themeStyle.text }]}>
          Analytics help you understand your patterns and track your progress over time.
          Check back regularly to see your growth!
        </Text>
      </View>

      {/* Footer Spacing */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  viewDetailsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  arrowIcon: {
    fontSize: 20,
    color: '#6366f1',
  },
  comingSoonCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  comingSoonBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#78350f',
  },
  infoContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
