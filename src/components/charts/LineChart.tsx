import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { Colors } from '../../theme';

interface LineChartProps {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  showVerticalGrid?: boolean;
  showDots?: boolean;
  animated?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  labels,
  color = Colors.accent,
  height = 220,
  showGrid = true,
  showVerticalGrid = true,
  showDots = true,
  animated = true,
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32; // maintain consistent margins

  // Prepare data for react-native-chart-kit
  const chartData = {
    labels: labels.length > 0 ? labels : data.map((_, i) => `${i + 1}`),
    datasets: [
      {
        data: data,
        color: () => color,
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: Colors.card,
    backgroundGradientFrom: Colors.card,
    backgroundGradientTo: Colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    labelColor: () => Colors.textSecondary,
    style: {
      borderRadius: 24,
    },
    propsForDots: {
      r: showDots ? '4' : '0',
      strokeWidth: '2',
      stroke: color,
      fill: Colors.white,
    },
    propsForBackgroundLines: {
      strokeDasharray: '5,5',
      stroke: Colors.textMuted,
      strokeWidth: 0.7,
      opacity: 0.25,
    },
    formatYLabel: (value: string) => {
      const num = parseFloat(value);
      return Math.round(num).toString();
    },
    useShadowColorFromDataset: false,
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <RNLineChart
          data={chartData}
          width={chartWidth}
          height={height}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withVerticalLabels={showVerticalGrid}
          withHorizontalLabels={showGrid}
          withDots={showDots}
          withShadow={true}
          withInnerLines={showGrid}
          withOuterLines={false}
          withVerticalLines={showVerticalGrid}
          fromZero={true}
          segments={5}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  chartWrapper: {
    width: '100%',
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  chart: {
    marginVertical: 6,
    borderRadius: 24,
  },
});
