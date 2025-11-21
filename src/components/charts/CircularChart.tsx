import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, TextStyles } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularChartProps {
  data: number[];
  labels: string[];
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showLabels?: boolean;
  animated?: boolean;
}

export const CircularChart: React.FC<CircularChartProps> = ({
  data,
  labels,
  size = 260,
  strokeWidth = 16,
  color = Colors.accent,
  backgroundColor = 'rgba(182, 177, 192, 0.15)',
  showLabels = true,
  animated = true,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progress.value = 0;
      progress.value = withDelay(
        200,
        withTiming(1, {
          duration: 1500,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        })
      );
    } else {
      progress.value = 1;
    }
  }, [data, animated]);

  if (!data || data.length === 0) {
    return null;
  }

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate statistics
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const avgValue = data.reduce((a, b) => a + b, 0) / data.length;
  const latestValue = data[data.length - 1];

  // Calculate percentages for each segment
  const totalSum = data.reduce((a, b) => a + b, 0);
  const segments = data.map((value, index) => {
    const percentage = (value / maxValue) * 100;
    const angle = (percentage / 100) * 360;
    return { value, percentage, angle, index };
  });

  // Create animated props for each ring
  const createAnimatedProps = (percentage: number) => {
    return useAnimatedProps(() => {
      const animatedPercentage = percentage * progress.value;
      const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;
      return {
        strokeDashoffset,
      };
    });
  };

  // Calculate positions for the rings (nested circles)
  const rings = [
    { percentage: (latestValue / maxValue) * 100, label: 'Latest', color: color, delay: 0 },
    { percentage: (avgValue / maxValue) * 100, label: 'Average', color: Colors.accentTertiary, delay: 200 },
    { percentage: (maxValue / maxValue) * 100, label: 'Peak', color: Colors.success, delay: 400 },
  ];

  const ringSpacing = 26;

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={color} stopOpacity="1" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </LinearGradient>
            <LinearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={Colors.accentTertiary} stopOpacity="1" />
              <Stop offset="100%" stopColor={Colors.accentTertiary} stopOpacity="0.6" />
            </LinearGradient>
            <LinearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={Colors.success} stopOpacity="1" />
              <Stop offset="100%" stopColor={Colors.success} stopOpacity="0.6" />
            </LinearGradient>
          </Defs>

          {rings.map((ring, idx) => {
            const currentRadius = radius - idx * ringSpacing;
            const currentCircumference = 2 * Math.PI * currentRadius;
            
            return (
              <G key={`ring-${idx}`}>
                {/* Background circle */}
                <Circle
                  cx={center}
                  cy={center}
                  r={currentRadius}
                  stroke={backgroundColor}
                  strokeWidth={strokeWidth - idx * 1.5}
                  fill="none"
                  strokeLinecap="round"
                />
                
                {/* Progress circle with glow */}
                <AnimatedCircle
                  cx={center}
                  cy={center}
                  r={currentRadius}
                  stroke={`url(#gradient${idx + 1})`}
                  strokeWidth={strokeWidth - idx * 1.5}
                  fill="none"
                  strokeDasharray={currentCircumference}
                  strokeDashoffset={currentCircumference}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${center} ${center})`}
                  animatedProps={createAnimatedProps(ring.percentage)}
                  opacity={0.95}
                />
                
                {/* Outer glow effect */}
                <AnimatedCircle
                  cx={center}
                  cy={center}
                  r={currentRadius}
                  stroke={ring.color}
                  strokeWidth={(strokeWidth - idx * 1.5) + 3}
                  fill="none"
                  strokeDasharray={currentCircumference}
                  strokeDashoffset={currentCircumference}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${center} ${center})`}
                  animatedProps={createAnimatedProps(ring.percentage)}
                  opacity={0.12}
                />
              </G>
            );
          })}

          {/* Center text */}
          <SvgText
            x={center}
            y={center - 12}
            fontSize="48"
            fontWeight="900"
            fill={Colors.textPrimary}
            textAnchor="middle"
          >
            {Math.round(latestValue)}
          </SvgText>
          
          <SvgText
            x={center}
            y={center + 18}
            fontSize="12"
            fontWeight="700"
            fill={Colors.textMuted}
            textAnchor="middle"
            letterSpacing="1"
          >
            LATEST
          </SvgText>
        </Svg>

        {/* Legend */}
        {showLabels && (
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendLabel}>Latest: {Math.round(latestValue)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.accentTertiary }]} />
              <Text style={styles.legendLabel}>Avg: {Math.round(avgValue)}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendLabel}>Peak: {Math.round(maxValue)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Stats summary */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{Math.round(minValue)}</Text>
          <Text style={styles.statLabel}>Min</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{data.length}</Text>
          <Text style={styles.statLabel}>Days</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{Math.round(maxValue)}</Text>
          <Text style={styles.statLabel}>Max</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  chartWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    ...TextStyles.smallSemibold,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.cardAlt,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  statValue: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    ...TextStyles.label,
    color: Colors.textSecondary,
  },
});

