import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Gradients } from '../../theme/colors';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenBackground({ children, style }: ScreenBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={Gradients.lifestyleGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 2 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.blurOverlay} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
});

