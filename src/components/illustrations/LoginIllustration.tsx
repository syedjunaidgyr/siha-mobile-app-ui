import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Lock, Shield, Key, Eye } from 'lucide-react-native';
import { Colors } from '../../theme/colors';

export function LoginIllustration() {
  return (
    <View style={styles.container}>
      {/* Main Lock Icon */}
      <View style={styles.mainIcon}>
        <View style={styles.iconGlow} />
        <Lock size={40} color={Colors.accent} strokeWidth={2.5} />
      </View>
      
      {/* Floating Elements */}
      <View style={[styles.floatingElement, styles.floating1]}>
        <Shield size={18} color={Colors.accentSecondary} opacity={0.8} />
      </View>
      
      <View style={[styles.floatingElement, styles.floating2]}>
        <Key size={16} color={Colors.accentTertiary} opacity={0.8} />
      </View>
      
      <View style={[styles.floatingElement, styles.floating3]}>
        <Eye size={18} color={Colors.success} opacity={0.8} />
      </View>
      
      {/* Decorative Circles */}
      <View style={[styles.decorativeCircle, styles.circle1]} />
      <View style={[styles.decorativeCircle, styles.circle2]} />
      <View style={[styles.decorativeCircle, styles.circle3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mainIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(79, 70, 229, 0.3)',
    position: 'relative',
    zIndex: 2,
  },
  iconGlow: {
    position: 'absolute',
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    top: -7.5,
    left: -7.5,
    zIndex: -1,
  },
  floatingElement: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  floating1: {
    top: -8,
    right: -5,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  floating2: {
    bottom: 5,
    left: -8,
    borderColor: 'rgba(192, 38, 211, 0.3)',
    backgroundColor: 'rgba(192, 38, 211, 0.1)',
  },
  floating3: {
    top: 15,
    left: -12,
    borderColor: 'rgba(5, 150, 105, 0.3)',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(79, 70, 229, 0.15)',
  },
  circle1: {
    width: 90,
    height: 90,
    top: 5,
    left: 5,
    zIndex: 0,
  },
  circle2: {
    width: 100,
    height: 100,
    top: 0,
    left: 0,
    borderColor: 'rgba(79, 70, 229, 0.08)',
    zIndex: 0,
  },
  circle3: {
    width: 110,
    height: 110,
    top: -5,
    left: -5,
    borderColor: 'rgba(79, 70, 229, 0.05)',
    zIndex: 0,
  },
});

