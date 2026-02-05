import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

export default function TakeABreakScreen() {
  const router = useRouter();
  const { themeStyle } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeStyle.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeStyle.title }]}>🧘 Take a Break</Text>
        <Text style={[styles.subtitle, { color: themeStyle.label }]}>
          Choose your relaxation experience
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {/* Relaxing Sounds Option */}
        <TouchableOpacity
          style={[styles.optionCard, styles.soundsCard, { backgroundColor: themeStyle.card }]}
          onPress={() => router.push('./relaxation-sounds')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIcon, { backgroundColor: themeStyle.background }]}>
            <Text style={styles.iconText}>🎵</Text>
          </View>
          <Text style={[styles.cardTitle, { color: themeStyle.title }]}>Relaxing Sounds</Text>
          <Text style={[styles.cardDescription, { color: themeStyle.text }]}>
            Nature sounds, ambient music, and calming audio to help you relax
          </Text>
          <View style={[styles.cardBadge, { backgroundColor: themeStyle.background }]}>
            <Text style={[styles.badgeText, { color: themeStyle.text }]}>11 Sounds Available</Text>
          </View>
        </TouchableOpacity>

        {/* Breathing Exercises Option */}
        <TouchableOpacity
          style={[styles.optionCard, styles.breathingCard, { backgroundColor: themeStyle.card }]}
          onPress={() => router.push('./breathing-exercises')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIcon, { backgroundColor: themeStyle.background }]}>
            <Text style={styles.iconText}>💆</Text>
          </View>
          <Text style={[styles.cardTitle, { color: themeStyle.title }]}>Breathing Exercises</Text>
          <Text style={[styles.cardDescription, { color: themeStyle.text }]}>
            Guided meditation and breathing techniques for mindfulness
          </Text>
          <View style={[styles.cardBadge, { backgroundColor: themeStyle.background }]}>
            <Text style={[styles.badgeText, { color: themeStyle.text }]}>2 Exercises Available</Text>
          </View>
        </TouchableOpacity>

        {/* Visualization Journeys Option */}
        <TouchableOpacity
          style={[styles.optionCard, styles.visualizationCard, { backgroundColor: themeStyle.card }]}
          onPress={() => router.push('./visualization-journeys')}
          activeOpacity={0.8}
        >
          <View style={[styles.cardIcon, { backgroundColor: themeStyle.background }]}>
            <Text style={styles.iconText}>🌀</Text>
          </View>
          <Text style={[styles.cardTitle, { color: themeStyle.title }]}>Visualization Journeys</Text>
          <Text style={[styles.cardDescription, { color: themeStyle.text }]}>
            Guided visualization journeys to support relaxation and mental imagery
          </Text>
          <View style={[styles.cardBadge, { backgroundColor: themeStyle.background }]}>
            <Text style={[styles.badgeText, { color: themeStyle.text }]}>3 Journeys Available</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.infoBox, { backgroundColor: themeStyle.card }]}>
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={[styles.infoText, { color: themeStyle.text }]}>
          Taking regular breaks helps reduce stress, improve focus, and enhance overall well-being
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 30,
  },
  optionCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  soundsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  breathingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  visualizationCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
  },
  cardIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  cardBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});