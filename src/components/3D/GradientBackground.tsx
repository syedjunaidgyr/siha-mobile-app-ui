import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Gradients } from '../../theme/colors';

interface GradientBackgroundProps {
  children: React.ReactNode;
  colors?: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
  angle?: number; // 0-360 degrees
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  colors = Gradients.purpleNight,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  angle = 135,
}) => {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={colors}
        start={start}
        end={end}
        angle={angle}
        useAngle
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.overlayGlow} />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  overlayGlow: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 227, 106, 0.08)',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});

