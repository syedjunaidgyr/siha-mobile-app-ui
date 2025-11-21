import React from 'react';
import { TextInput, View, StyleSheet, TextInputProps, Text, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';

interface FieldInputProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
}

export function FieldInput({ label, containerStyle, style, ...rest }: FieldInputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...rest}
        style={[styles.input, style]}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.input,
  },
});

