// app/components/dashboard/MoodCard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MoodCardProps {
  name: string;
  count: number;
  color: string;
  percentage: number;
  themeStyle: any;
}

export const MoodCard: React.FC<MoodCardProps> = ({
  name,
  count,
  color,
  percentage,
  themeStyle
}) => (
  <View style={styles.moodCard}>
    <View style={styles.moodCardLeft}>
      <View style={[styles.moodIndicator, { backgroundColor: color }]} />
      <View style={styles.moodTextContainer}>
        <Text style={[styles.moodName, { color: themeStyle.text }]}>{name}</Text>
        <Text style={[styles.moodSubtext, { color: themeStyle.label }]}>{count} patients</Text>
      </View>
    </View>
    <View style={styles.moodCardRight}>
      <Text style={[styles.moodPercentage, { color: themeStyle.text }]}>{percentage}%</Text>
      <View style={styles.moodBarContainer}>
        <View style={[styles.moodBarBackground, { backgroundColor: 'rgba(82, 79, 133, 0.1)' }]}>
          <View style={[
            styles.moodBarFill,
            { 
              width: `${percentage}%`,
              backgroundColor: color
            }
          ]} />
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  moodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(82, 79, 133, 0.05)',
  },
  moodCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moodIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 16,
  },
  moodTextContainer: {
    flex: 1,
  },
  moodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  moodSubtext: {
    fontSize: 13,
    opacity: 0.8,
  },
  moodCardRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  moodPercentage: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  moodBarContainer: {
    width: 60,
  },
  moodBarBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  moodBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
