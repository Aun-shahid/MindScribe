// app/components/InputCard.tsx

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

interface InputCardProps {
  title: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  themeStyle: any;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'numeric';
  maxLength?: number;
}

export const InputCard: React.FC<InputCardProps> = ({
  title,
  value,
  onChangeText,
  placeholder,
  themeStyle,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  maxLength,
}) => {
  const inputStyle = multiline ? styles.textArea : styles.textInput;

  return (
    <View style={[styles.card, { backgroundColor: themeStyle.dashboardcard }]}>
      <Text style={[styles.sectionTitle, { color: themeStyle.text }]}>{title}</Text>
      <TextInput
        style={[inputStyle, {
          backgroundColor: themeStyle.background,
          color: themeStyle.text,
          borderColor: themeStyle.border
        }]}
        placeholder={placeholder}
        placeholderTextColor={themeStyle.label}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 48,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
});
