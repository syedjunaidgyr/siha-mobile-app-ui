import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, TouchableOpacityProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { Card3D } from './Card3D';

interface Button3DProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const variantColors = {
  primary: ['#5C84D8', '#4A72C5', '#3D5FB3'],
  secondary: ['#6B7280', '#4B5563', '#374151'],
  success: ['#10B981', '#059669', '#047857'],
  danger: ['#EF4444', '#DC2626', '#B91C1C'],
};

export const Button3D: React.FC<Button3DProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
  icon,
  ...props
}) => {
  const pressProgress = useSharedValue(0);

  const colors = variantColors[variant];

  const handlePressIn = () => {
    pressProgress.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    pressProgress.value = withSpring(0, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressProgress.value, [0, 1], [1, 0.95]);
    const translateY = interpolate(pressProgress.value, [0, 1], [0, 2]);

    return {
      transform: [{ scale }, { translateY }],
    };
  });

  const sizeStyles = {
    small: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
    medium: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16 },
    large: { paddingVertical: 18, paddingHorizontal: 32, borderRadius: 20 },
  };

  const textSizeStyles = {
    small: { fontSize: 14 },
    medium: { fontSize: 16 },
    large: { fontSize: 18 },
  };

  // Calculate depth based on press state - use a fixed value since we can't read shared value directly
  const currentDepth = 8;

  return (
    <Animated.View style={animatedStyle}>
      <Card3D
        depth={currentDepth}
        gradient
        gradientColors={colors}
        animated
        style={StyleSheet.flatten([sizeStyles[size], style])}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      >
        <View style={styles.buttonContent}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.buttonText, textSizeStyles[size], textStyle]}>{title}</Text>
        </View>
      </Card3D>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});

