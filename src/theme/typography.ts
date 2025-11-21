import { Platform } from 'react-native';

// Modern health & fitness typography system
export const Typography = {
  // Font Families
  fontFamily: {
    regular: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
    medium: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
    semibold: Platform.select({
      ios: 'System',
      android: 'Roboto-Medium',
      default: 'System',
    }),
    bold: Platform.select({
      ios: 'System',
      android: 'Roboto-Bold',
      default: 'System',
    }),
  },

  // Font Weights (use with fontFamily.regular on iOS)
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },

  // Font Sizes
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
    '6xl': 48,
  },

  // Line Heights
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: -1,
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 1.5,
  },
};

// Pre-configured text styles for common use cases
export const TextStyles = {
  // Headings
  h1: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.black,
    fontSize: Typography.fontSize['4xl'],
    lineHeight: Typography.fontSize['4xl'] * Typography.lineHeight.tight,
    letterSpacing: Typography.letterSpacing.tighter,
  },
  h2: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.extrabold,
    fontSize: Typography.fontSize['3xl'],
    lineHeight: Typography.fontSize['3xl'] * Typography.lineHeight.tight,
    letterSpacing: Typography.letterSpacing.tight,
  },
  h3: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.extrabold,
    fontSize: Typography.fontSize['2xl'],
    lineHeight: Typography.fontSize['2xl'] * Typography.lineHeight.snug,
    letterSpacing: Typography.letterSpacing.tight,
  },
  h4: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.xl,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.snug,
    letterSpacing: Typography.letterSpacing.normal,
  },

  // Body text
  body: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.regular,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  bodyMedium: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.medium,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  bodySemibold: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },

  // Small text
  small: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.regular,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  smallMedium: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.medium,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },
  smallSemibold: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.wide,
  },

  // Labels & Captions
  label: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.snug,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.medium,
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal,
  },

  // Special styles
  metric: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.black,
    fontSize: Typography.fontSize['5xl'],
    lineHeight: Typography.fontSize['5xl'] * Typography.lineHeight.tight,
    letterSpacing: Typography.letterSpacing.tighter,
  },
  button: {
    fontFamily: Typography.fontFamily.regular,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.snug,
    letterSpacing: Typography.letterSpacing.wide,
  },
};

