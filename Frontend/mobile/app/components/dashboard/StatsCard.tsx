// app/components/dashboard/StatsCard.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface StatsCardProps {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  color: string;
  themeStyle: any;
  onPress?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  color,
  themeStyle,
  onPress
}) => (
  <TouchableOpacity 
    style={[styles.statsCard, { backgroundColor: themeStyle.dashboardcard }]}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.statsCardIconContainer, { backgroundColor: color }]}>
      <Text style={styles.statsCardIcon}>{icon}</Text>
    </View>
    <Text style={[styles.statsCardValue, { color: themeStyle.text }]}>{value}</Text>
    <Text style={[styles.statsCardTitle, { color: themeStyle.label }]}>{title}</Text>
    <Text style={[styles.statsCardSubtitle, { color: themeStyle.label }]}>{subtitle}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  statsCard: {
    flex: 1,
    padding: 20,
    marginHorizontal: 6,
    borderRadius: 20,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  statsCardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statsCardIcon: {
    fontSize: 20,
  },
  statsCardValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statsCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  statsCardSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.8,
  },
});

const ExpoRouterStubScreen = () => null;
export default ExpoRouterStubScreen;

