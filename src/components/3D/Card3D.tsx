import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

interface Card3DProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: ViewStyle;
  depth?: number; // Shadow depth (0-20)
  gradient?: boolean;
  gradientColors?: string[];
  animated?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const Card3D = React.forwardRef<TouchableOpacity, Card3DProps>(({
  children,
  style,
  depth = 8,
  gradient = false,
  gradientColors = ['#ffffff', '#f3f4f6'],
  animated = true,
  ...touchableProps
}, ref) => {
  const scale = useSharedValue(1);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);

  const handlePressIn = () => {
    if (animated) {
      scale.value = withSpring(0.98);
    }
  };

  const handlePressOut = () => {
    if (animated) {
      scale.value = withSpring(1);
      rotateX.value = withSpring(0);
      rotateY.value = withSpring(0);
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { perspective: 1000 },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
      ],
    };
  });

  const shadowStyle = {
    shadowColor: '#202022',
    shadowOffset: {
      width: 0,
      height: depth * 0.8,
    },
    shadowOpacity: 0.08 + depth * 0.005,
    shadowRadius: depth * 1.2,
    elevation: depth * 2,
  };

  if (gradient) {
    return (
      <AnimatedTouchable
        ref={ref}
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.container, shadowStyle, animatedStyle, style]}
        {...touchableProps}
      >
        <View
          style={[
            styles.gradientContainer,
            {
              backgroundColor: gradientColors[0],
            },
          ]}
        >
          {children}
        </View>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      ref={ref}
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, styles.card, shadowStyle, animatedStyle, style]}
      {...touchableProps}
    >
      {children}
    </AnimatedTouchable>
  );
});

Card3D.displayName = 'Card3D';

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#f6f6f6',
  },
  card: {
    backgroundColor: '#f6f6f6',
  },
  gradientContainer: {
    borderRadius: 18,
    overflow: 'hidden',
  },
});

