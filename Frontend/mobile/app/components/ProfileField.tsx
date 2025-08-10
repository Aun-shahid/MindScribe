// app/components/ProfileField.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProfileFieldData } from '../types/therapist';

interface ProfileFieldProps {
  field: ProfileFieldData;
  themeStyle: any;
}

export const ProfileField: React.FC<ProfileFieldProps> = ({ field, themeStyle }) => {
  return (
    <View style={[styles.infoBox, { borderBottomColor: themeStyle.border }]}>
      <Text style={[styles.label, { color: themeStyle.label }]}>{field.label}:</Text>
      <Text style={[styles.value, { color: themeStyle.text }]}>{field.value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  infoBox: {
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
  },
});

export default ProfileField;
