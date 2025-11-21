import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { Colors, TextStyles } from '../theme';
import LinearGradient from 'react-native-linear-gradient';
import { Gradients } from '../theme/colors';

const logoImage = require('../assets/logo.png');

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textScaleAnim = useRef(new Animated.Value(0.8)).current;
  const coreRotateAnim = useRef(new Animated.Value(0)).current;
  const glowPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Core rotation animation
    Animated.loop(
      Animated.timing(coreRotateAnim, {
        toValue: 360,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulseAnim, {
          toValue: 1.3,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Initial entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Text animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(textScaleAnim, {
          toValue: 1,
          tension: 45,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1200);

    // Exit animation
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textFadeAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.5,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onFinish();
      });
    }, 3800);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const coreRotateInterpolate = coreRotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Gradients.lifestyleGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Animated background particles */}
      <View style={styles.particlesContainer}>
        {[...Array(20)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.particle,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.3,
              },
            ]}
          />
        ))}
      </View>
      
      <View style={styles.content}>
        {/* Central Core - AI Brain */}
        <Animated.View
          style={[
            styles.coreWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View 
            style={[
              styles.coreContainer,
              { transform: [{ rotate: coreRotateInterpolate }] }
            ]}
          >
            <Animated.View 
              style={[
                styles.coreGlow, 
                { transform: [{ scale: glowPulseAnim }] }
              ]} 
            />
            <View style={styles.coreGlowOuter} />
            <View style={styles.core}>
              <View style={styles.coreInner}>
                <Image 
                  source={logoImage} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* SIHA Text with enhanced styling */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textFadeAnim,
              transform: [{ scale: textScaleAnim }],
            },
          ]}
        >
          <View style={styles.nameContainer}>
            <Text style={styles.appName}>SIHA</Text>
            <View style={styles.nameLine} />
          </View>
          <Text style={styles.tagline}>Your AI Health Companion</Text>
          <Text style={styles.subtitle}>Powered by MJ</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  coreWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  coreContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  coreGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(79, 70, 229, 0.25)',
    top: -15,
    left: -15,
  },
  coreGlowOuter: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    top: -30,
    left: -30,
  },
  core: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderWidth: 3,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  coreInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(79, 70, 229, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
    flexShrink: 0,
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 8,
    
  },
  appName: {
    ...TextStyles.h1,
    fontSize: 52,
    fontWeight: '900',
    color: Colors.accent,
    letterSpacing: 6,
    marginBottom: 4,
    textShadowColor: 'rgba(79, 70, 229, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
    paddingTop: 20,
  },
  nameLine: {
    width: 80,
    height: 4,
    backgroundColor: Colors.accent,
    borderRadius: 2,
    opacity: 0.7,
  },
  tagline: {
    ...TextStyles.body,
    fontSize: 18,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    ...TextStyles.body,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 2,
    fontWeight: '400',
    textTransform: 'uppercase',
    opacity: 0.7,
  },
});
