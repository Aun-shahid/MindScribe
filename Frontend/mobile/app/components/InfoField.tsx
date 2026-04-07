// app/components/InfoField.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface InfoFieldProps {
  label: string;
  value: string;
  themeStyle: any;
  isColumn?: boolean;
}

export const InfoField: React.FC<InfoFieldProps> = ({ 
  label, 
  value, 
  themeStyle, 
  isColumn = false 
}) => {
  const containerStyle = isColumn ? styles.infoColumn : styles.infoRow;
  
  return (
    <View style={containerStyle}>
      <Text style={[styles.label, { color: themeStyle.label }]}>{label}:</Text>
      <Text style={[styles.value, { color: themeStyle.text }, isColumn && styles.columnValue]}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(73, 70, 126, 0.1)',
  },
  infoColumn: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(73, 70, 126, 0.1)',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    opacity: 0.8,
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 15,
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
    lineHeight: 22,
  },
  columnValue: {
    textAlign: 'left',
    marginTop: 6,
  },
});

const ExpoRouterStubScreen = () => null;
export default ExpoRouterStubScreen;

