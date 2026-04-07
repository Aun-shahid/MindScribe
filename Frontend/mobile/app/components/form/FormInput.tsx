// app/components/form/FormInput.tsx
import React from 'react';
import { TextInput, Text, View, StyleSheet, TextInputProps } from 'react-native';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  themeStyle: any;
  containerStyle?: any;
  inputStyle?: any;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  required = false,
  themeStyle,
  containerStyle,
  inputStyle,
  ...textInputProps
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: themeStyle.text }]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          { backgroundColor: themeStyle.dashboardcard, color: themeStyle.text },
          error && styles.inputError,
          inputStyle
        ]}
        placeholderTextColor={themeStyle.label}
        {...textInputProps}
      />
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  required: {
    color: '#d32f2f',
  },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(73, 70, 126, 0.15)',
    backgroundColor: 'rgba(73, 70, 126, 0.02)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#d32f2f',
    backgroundColor: 'rgba(211, 47, 47, 0.05)',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
});

const ExpoRouterStubScreen = () => null;
export default ExpoRouterStubScreen;

