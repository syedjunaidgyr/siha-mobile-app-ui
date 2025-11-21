import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Card3D } from './Card3D';
import { Colors, Typography } from '../../theme';

// Card width will be set via style prop from parent

// Type for Lucide icon component
type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

interface VitalCard3DProps {
  icon: IconComponent;
  label: string;
  value: string | number;
  unit?: string;
  color: string;
  style?: ViewStyle;
  animated?: boolean;
}

export const VitalCard3D: React.FC<VitalCard3DProps> = ({
  icon: Icon,
  label,
  value,
  unit,
  color,
  style,
  animated = true,
}) => {
  const accentColor = color || Colors.accent;

  return (
    <View style={[styles.container, style]}>
      <Card3D depth={8} style={styles.card}>
        <View style={styles.content}>
          <View style={styles.topSection}>
              <View style={[styles.iconContainer, { borderColor: accentColor }]}>
                <Icon size={20} color={accentColor} />
            </View>
          </View>
          <View style={styles.middleSection}>
            <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">{label.toUpperCase()}</Text>
          </View>
          <View style={styles.bottomSection}>
            <View style={styles.valueContainer}>
              <Text style={[styles.value, { color: accentColor }]} numberOfLines={1}>{value}</Text>
              {unit && <Text style={styles.unit} numberOfLines={1}>{unit}</Text>}
            </View>
          </View>
        </View>
      </Card3D>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.card,
    borderRadius: 20,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.card,
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    minHeight: 100,
  },
  topSection: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
    marginBottom: 6,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.backgroundDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  middleSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    minHeight: 14,
    marginBottom: 8,
    marginTop: 4,
  },
  label: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: Typography.letterSpacing.wider,
    textAlign: 'center',
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  bottomSection: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    marginTop: 'auto',
    minHeight: 44,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    flexShrink: 0,
  },
  value: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.extrabold,
    letterSpacing: Typography.letterSpacing.tight,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  unit: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    marginLeft: 2,
    lineHeight: 12,
  },
});

