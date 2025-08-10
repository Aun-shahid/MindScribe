// app/components/form/OptionButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  selectedStyle?: ViewStyle;
  selectedTextStyle?: TextStyle;
}

export const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  selected,
  onPress,
  containerStyle,
  textStyle,
  selectedStyle,
  selectedTextStyle,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        containerStyle,
        selected && [styles.buttonSelected, selectedStyle]
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.buttonText,
        textStyle,
        selected && [styles.buttonTextSelected, selectedTextStyle]
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    marginRight: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonSelected: {
    backgroundColor: '#49467E',
    borderColor: '#49467E',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.2,
  },
  buttonTextSelected: {
    color: '#ffffff',
  },
});
