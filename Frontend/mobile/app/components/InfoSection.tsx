// app/components/InfoSection.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface InfoSectionProps {
  title: string;
  themeStyle: any;
  children: React.ReactNode;
}

export const InfoSection: React.FC<InfoSectionProps> = ({ 
  title, 
  themeStyle, 
  children 
}) => {
  return (
    <View style={[styles.section, { backgroundColor: themeStyle.dashboardcard }]}>
      <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>{title}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(73, 70, 126, 0.05)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    color: '#49467E',
    letterSpacing: 0.3,
  },
});
