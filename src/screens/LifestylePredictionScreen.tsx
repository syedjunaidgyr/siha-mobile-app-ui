import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LifestyleService, LifestylePrediction } from '../services/lifestyleService';
import { PreventiveHealthService, PreventiveInsights } from '../services/preventiveHealthService';
import { Card3D, GradientBackground } from '../components/3D';
import {
  Flame,
  Target,
  Footprints,
  Moon,
  Droplet,
  TrendingUp,
  Calendar as CalendarIcon,
} from 'lucide-react-native';

type CalendarDay = {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
};

export default function LifestylePredictionScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [prediction, setPrediction] = useState<LifestylePrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<LifestylePrediction[]>([]);
  const [insights, setInsights] = useState<PreventiveInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  useEffect(() => {
    loadPrediction();
    loadPredictions();
  }, [selectedDate]);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadPrediction = async () => {
    try {
      setLoading(true);
      const data = await LifestyleService.getPrediction(selectedDate);
      setPrediction(data);
    } catch (error: any) {
      console.error('Load prediction error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to load prediction');
    } finally {
      setLoading(false);
    }
  };

  const loadPredictions = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7); // Next 7 days

      const data = await LifestyleService.getPredictions(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      setPredictions(data);
    } catch (error: any) {
      console.error('Load predictions error:', error);
    }
  };

  const loadInsights = async () => {
    try {
      setInsightsLoading(true);
      setInsightsError(null);
      const data = await PreventiveHealthService.getInsights();
      setInsights(data);
    } catch (error: any) {
      console.error('Load preventive insights error:', error);
      setInsightsError(error?.response?.data?.error || error?.message || 'Failed to load AI plan');
    } finally {
      setInsightsLoading(false);
    }
  };

  const markedDates = predictions.reduce((acc, pred) => {
    acc[pred.prediction_date] = {
      marked: true,
      dotColor: '#2563eb',
    };
    return acc;
  }, {} as any);

  if (selectedDate) {
    markedDates[selectedDate] = {
      ...markedDates[selectedDate],
      selected: true,
      selectedColor: '#2563eb',
    };
  }

  if (loading && !prediction) {
    return (
      <GradientBackground colors={['#EAF1FC', '#EAF1FC']} style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground colors={['#EAF1FC', '#EAF1FC']} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Lifestyle Predictions</Text>
          <Text style={styles.subtitle}>AI-powered daily recommendations</Text>
        </View>

        {/* Calendar */}
        <Card3D depth={16} style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: CalendarDay) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              selectedDayBackgroundColor: '#2563eb',
              selectedDayTextColor: '#fff',
              todayTextColor: '#2563eb',
              arrowColor: '#2563eb',
            }}
          />
        </Card3D>

        {prediction ? (
          <>
            {(insights || insightsLoading || insightsError) && (
              <Card3D depth={16} style={styles.aiPlanCard}>
                <View style={styles.aiPlanHeader}>
                  <View>
                    <Text style={styles.aiPlanTitle}>AI Lifestyle Plan</Text>
                    <Text style={styles.aiPlanSubtitle}>
                      {insights?.summary?.headline || 'Personalized routine from preventive AI'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.aiPlanRefresh, insightsLoading && styles.aiPlanRefreshDisabled]}
                    onPress={loadInsights}
                    disabled={insightsLoading}
                  >
                    <Text style={styles.aiPlanRefreshText}>
                      {insightsLoading ? 'Refreshing...' : 'Refresh'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {insightsError ? (
                  <Text style={styles.aiPlanError}>{insightsError}</Text>
                ) : (
                  <>
                    <View style={styles.aiPlanStatsRow}>
                      <View style={styles.aiPlanStat}>
                        <Text style={styles.aiPlanStatLabel}>Hydration</Text>
                        <Text style={styles.aiPlanStatValue}>
                          {formatHydration(insights?.lifestylePlan?.hydrationTargetMl)}
                        </Text>
                      </View>
                      <View style={styles.aiPlanStat}>
                        <Text style={styles.aiPlanStatLabel}>Sleep</Text>
                        <Text style={styles.aiPlanStatValue}>
                          {formatSleep(insights?.lifestylePlan?.sleepTargetHours)}
                        </Text>
                      </View>
                      <View style={styles.aiPlanStat}>
                        <Text style={styles.aiPlanStatLabel}>Next Action</Text>
                        <Text style={styles.aiPlanStatValue}>
                          {insights?.summary?.nextBestAction ? 'Ready' : 'General'}
                        </Text>
                      </View>
                    </View>

                    {renderPlanBlocks('Morning', insights?.lifestylePlan?.morning)}
                    {renderPlanBlocks('Afternoon', insights?.lifestylePlan?.afternoon)}
                    {renderPlanBlocks('Evening', insights?.lifestylePlan?.evening)}
                  </>
                )}
              </Card3D>
            )}

            {/* Lifestyle Score */}
            <Card3D depth={16} style={styles.card}>
              <View style={styles.scoreContainer}>
                <TrendingUp size={32} color="#2563eb" />
                <View style={styles.scoreContent}>
                  <Text style={styles.scoreLabel}>Lifestyle Score</Text>
                  <Text style={styles.scoreValue}>{prediction.lifestyle_score}/100</Text>
                </View>
              </View>
            </Card3D>

            {/* Nutrition */}
            <Card3D depth={16} style={styles.card}>
              <Text style={styles.sectionTitle}>Nutrition</Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Flame size={24} color="#ef4444" />
                  <Text style={styles.nutritionValue}>{prediction.predicted_calories}</Text>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Target size={24} color="#3b82f6" />
                  <Text style={styles.nutritionValue}>{Math.round(prediction.predicted_protein)}g</Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={[styles.nutritionValue, { fontSize: 18 }]}>
                    {Math.round(prediction.predicted_carbs)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={[styles.nutritionValue, { fontSize: 18 }]}>
                    {Math.round(prediction.predicted_fats)}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Fats</Text>
                </View>
              </View>
            </Card3D>

            {/* Activity */}
            <Card3D depth={16} style={styles.card}>
              <Text style={styles.sectionTitle}>Activity</Text>
              <View style={styles.activityRow}>
                <View style={styles.activityItem}>
                  <Footprints size={24} color="#10b981" />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityValue}>{prediction.recommended_steps.toLocaleString()}</Text>
                    <Text style={styles.activityLabel}>Steps</Text>
                  </View>
                </View>
                <View style={styles.activityItem}>
                  <Target size={24} color="#8b5cf6" />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityValue}>{prediction.recommended_workout_duration} min</Text>
                    <Text style={styles.activityLabel}>Workout</Text>
                  </View>
                </View>
              </View>
              <View style={styles.workoutTypeContainer}>
                <Text style={styles.workoutType}>{prediction.recommended_workout_type}</Text>
              </View>
            </Card3D>

            {/* Health */}
            <Card3D depth={16} style={styles.card}>
              <Text style={styles.sectionTitle}>Health</Text>
              <View style={styles.healthRow}>
                <View style={styles.healthItem}>
                  <Moon size={24} color="#6366f1" />
                  <View style={styles.healthContent}>
                    <Text style={styles.healthValue}>{prediction.sleep_hours}h</Text>
                    <Text style={styles.healthLabel}>Sleep</Text>
                  </View>
                </View>
                <View style={styles.healthItem}>
                  <Droplet size={24} color="#06b6d4" />
                  <View style={styles.healthContent}>
                    <Text style={styles.healthValue}>{prediction.water_intake_liters}L</Text>
                    <Text style={styles.healthLabel}>Water</Text>
                  </View>
                </View>
              </View>
            </Card3D>

            {/* Notes */}
            {prediction.notes && (
              <Card3D depth={16} style={styles.card}>
                <Text style={styles.sectionTitle}>Recommendations</Text>
                <Text style={styles.notesText}>{prediction.notes}</Text>
              </Card3D>
            )}

            {/* Date Info */}
            <View style={styles.dateInfo}>
              <CalendarIcon size={16} color="#6b7280" />
              <Text style={styles.dateInfoText}>
                {new Date(prediction.prediction_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </>
        ) : (
          <Card3D depth={16} style={styles.card}>
            <Text style={styles.noDataText}>No prediction available for this date</Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={async () => {
                try {
                  await LifestyleService.generatePrediction();
                  loadPrediction();
                } catch (error: any) {
                  Alert.alert('Error', error.response?.data?.error || 'Failed to generate prediction');
                }
              }}
            >
              <Text style={styles.generateButtonText}>Generate Prediction</Text>
            </TouchableOpacity>
          </Card3D>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

function formatHydration(hydrationTargetMl?: number) {
  if (!hydrationTargetMl) {
    return '2.5 L';
  }
  return `${(hydrationTargetMl / 1000).toFixed(1)} L`;
}

function formatSleep(hours?: number) {
  if (!hours) {
    return '7.5 h';
  }
  return `${hours.toFixed(1)} h`;
}

function renderPlanBlocks(title: string, actions?: string[]) {
  if (!actions || actions.length === 0) {
    return null;
  }
  return (
    <View style={styles.aiPlanBlock}>
      <Text style={styles.aiPlanBlockTitle}>{title}</Text>
      {actions.map((action, index) => (
        <View key={`${title}-${index}`} style={styles.aiPlanBlockRow}>
          <View style={styles.aiPlanBullet} />
          <Text style={styles.aiPlanBlockText}>{action}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  calendarCard: {
    margin: 20,
    marginBottom: 0,
    padding: 10,
    backgroundColor: '#ffffff',
  },
  card: {
    margin: 20,
    marginBottom: 0,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  aiPlanCard: {
    margin: 20,
    marginBottom: 0,
    padding: 20,
    backgroundColor: '#ffffff',
    borderWidth: 0,
  },
  aiPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  aiPlanTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  aiPlanSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  aiPlanRefresh: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
  },
  aiPlanRefreshDisabled: {
    opacity: 0.5,
  },
  aiPlanRefreshText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  aiPlanError: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 12,
  },
  aiPlanStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiPlanStat: {
    flex: 1,
    alignItems: 'center',
  },
  aiPlanStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  aiPlanStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  aiPlanBlock: {
    marginTop: 12,
  },
  aiPlanBlockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  aiPlanBlockRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  aiPlanBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
    marginTop: 8,
  },
  aiPlanBlockText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreContent: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  nutritionItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  nutritionLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  activityRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  activityItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  activityLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  workoutTypeContainer: {
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  workoutType: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
    textAlign: 'center',
  },
  healthRow: {
    flexDirection: 'row',
    gap: 16,
  },
  healthItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  healthContent: {
    flex: 1,
  },
  healthValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  healthLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  notesText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
    marginBottom: 20,
  },
  dateInfoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

