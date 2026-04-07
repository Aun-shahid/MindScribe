// app/components/dashboard/PerformanceCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PerformanceCardProps {
  icon: string;
  label: string;
  value: string;
  progress: number;
  color: string;
  themeStyle: any;
}

export const PerformanceCard: React.FC<PerformanceCardProps> = ({
  icon,
  label,
  value,
  progress,
  color,
  themeStyle
}) => (
  <View style={[styles.performanceCard, { backgroundColor: 'rgba(82, 79, 133, 0.05)' }]}>
    <View style={styles.performanceCardHeader}>
      <Text style={styles.performanceCardIcon}>{icon}</Text>
      <Text style={[styles.performanceCardValue, { color: themeStyle.text }]}>{value}</Text>
    </View>
    <Text style={[styles.performanceCardLabel, { color: themeStyle.label }]}>{label}</Text>
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarBackground, { backgroundColor: 'rgba(82, 79, 133, 0.1)' }]}>
        <View style={[
          styles.progressBarFill,
          { 
            width: `${progress}%`,
            backgroundColor: color
          }
        ]} />
      </View>
      <Text style={[styles.progressText, { color: themeStyle.label }]}>{progress}%</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  performanceCard: {
    flex: 1,
    padding: 16,
    marginHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(82, 79, 133, 0.1)',
  },
  performanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  performanceCardIcon: {
    fontSize: 24,
  },
  performanceCardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  performanceCardLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
});

const ExpoRouterStubScreen = () => null;
export default ExpoRouterStubScreen;

