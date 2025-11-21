import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';

interface PrimaryButtonProps extends TouchableOpacityProps {
  label: string;
  loading?: boolean;
  variant?: 'solid' | 'ghost';
  style?: ViewStyle;
}

export function PrimaryButton({ label, loading, disabled, variant = 'solid', style, ...rest }: PrimaryButtonProps) {
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      {...rest}
      disabled={disabled || loading}
      style={[
        styles.base,
        isGhost ? styles.ghost : styles.solid,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? Colors.accent : Colors.background} />
      ) : (
        <Text style={[styles.label, isGhost && styles.ghostLabel]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  solid: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
  ghostLabel: {
    color: Colors.textPrimary,
  },
});

