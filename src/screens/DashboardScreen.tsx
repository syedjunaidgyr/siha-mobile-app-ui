import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Dimensions } from 'react-native';
import { Activity, Heart, TrendingUp, Camera, Wind, ArrowRight, Bell, Calendar, Clock, Zap, Target, BarChart3, Droplet, Shield, Thermometer, AlertTriangle, Flame, Footprints } from 'lucide-react-native';
import { MetricService } from '../services/metricService';
import { AuthService } from '../services/authService';
import { StepCounterService } from '../services/stepCounterService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Card3D, VitalCard3D } from '../components/3D';
import { PreventiveHealthService, PreventiveInsights } from '../services/preventiveHealthService';
import { LifestyleService, LifestylePrediction } from '../services/lifestyleService';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { Colors, Typography, TextStyles } from '../theme';
import { LineChart } from '../components/charts';

const screenWidth = Dimensions.get('window').width;

const VITAL_COLORS = {
  heartRate: Colors.danger,
  stress: Colors.accentTertiary,
  spo2: Colors.success,
  temperature: Colors.accent,
  respiratory: Colors.accentSecondary,
  bloodPressure: Colors.danger,
};

const RATE_LIMIT_STATUS = 429;
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;
const RATE_LIMIT_DEFAULT_MESSAGE =
  'Our servers are receiving too many requests right now. Please try again shortly.';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deviceSteps, setDeviceSteps] = useState<number>(0);
  const [preventiveInsights, setPreventiveInsights] = useState<PreventiveInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [lifestylePrediction, setLifestylePrediction] = useState<LifestylePrediction | null>(null);
  const [lifestyleLoading, setLifestyleLoading] = useState(false);
  const [lifestyleError, setLifestyleError] = useState<string | null>(null);
  const [rateLimitResetAt, setRateLimitResetAt] = useState<number | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const isLoadingRef = useRef(false);

  const isWithinRateLimitCooldown = useCallback(() => {
    return rateLimitResetAt !== null && Date.now() < rateLimitResetAt;
  }, [rateLimitResetAt]);

  const applyRateLimitCooldown = useCallback(
    (message?: string) => {
      const resetTime = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      setRateLimitResetAt(resetTime);
      setRateLimitMessage(message || RATE_LIMIT_DEFAULT_MESSAGE);
    },
    []
  );

  const handleRateLimitError = useCallback(
    (error: any, message?: string) => {
      if (error?.response?.status === RATE_LIMIT_STATUS) {
        applyRateLimitCooldown(message);
        return true;
      }
      return false;
    },
    [applyRateLimitCooldown]
  );

  const abortIfRateLimited = useCallback(
    (options?: { message?: string; setError?: (msg: string) => void }) => {
      if (!isWithinRateLimitCooldown()) {
        return false;
      }
      const fallbackMessage = options?.message || RATE_LIMIT_DEFAULT_MESSAGE;
      setRateLimitMessage((current) => current ?? fallbackMessage);
      options?.setError?.(fallbackMessage);
      return true;
    },
    [isWithinRateLimitCooldown]
  );

  useEffect(() => {
    if (!rateLimitResetAt) return;
    const remaining = rateLimitResetAt - Date.now();
    if (remaining <= 0) {
      setRateLimitResetAt(null);
      setRateLimitMessage(null);
      return;
    }
    const timeout = setTimeout(() => {
      setRateLimitResetAt(null);
      setRateLimitMessage(null);
    }, remaining);
    return () => clearTimeout(timeout);
  }, [rateLimitResetAt]);


  const initializeStepCounter = async () => {
    try {
      const initialized = await StepCounterService.initialize();
      if (initialized) {
      await updateDeviceSteps();
      }
    } catch (error) {
      console.error('Error initializing step counter:', error);
    }
  };

  const updateDeviceSteps = async () => {
    try {
      // Use cached steps for immediate updates (real-time for Android)
      const cachedSteps = StepCounterService.getCachedSteps();
      
      if (cachedSteps > 0) {
      setDeviceSteps(cachedSteps);
      }
      
      // Always try to get current steps to ensure we have the latest value
      const now = Date.now();
      const lastFullUpdate = (updateDeviceSteps as any).lastFullUpdate || 0;
      
      // Update periodically as fallback (real-time updates come from listener)
      if (now - lastFullUpdate > 5000) {
        const steps = await StepCounterService.getCurrentSteps();
        setDeviceSteps(steps);
        (updateDeviceSteps as any).lastFullUpdate = now;
      } else if (cachedSteps > 0) {
        // Use cached if available
        setDeviceSteps(cachedSteps);
      }
    } catch (error) {
      console.error('Error updating device steps:', error);
    }
  };

  const loadPreventiveInsights = useCallback(async () => {
    if (
      abortIfRateLimited({
        message: 'AI insights are cooling down. Please try again shortly.',
        setError: setInsightsError,
      })
    ) {
      setInsightsLoading(false);
      return;
    }
    try {
      setInsightsLoading(true);
      setInsightsError(null);
      const insightsResult = await PreventiveHealthService.getInsights();
      setPreventiveInsights(insightsResult);
    } catch (error: any) {
      console.error('Error loading preventive insights:', error);
      if (
        handleRateLimitError(
          error,
          'AI insights hit the rate limit. Please pull to refresh again in a minute.'
        )
      ) {
        setInsightsError('AI insights temporarily rate-limited. Please try again in about a minute.');
      } else {
      setInsightsError(error?.message || 'Unable to load AI insights');
      }
    } finally {
      setInsightsLoading(false);
    }
  }, [abortIfRateLimited, handleRateLimitError]);

  const loadLifestylePrediction = useCallback(async () => {
    if (
      abortIfRateLimited({
        message: 'Lifestyle AI is cooling down. Please try again shortly.',
        setError: setLifestyleError,
      })
    ) {
      setLifestyleLoading(false);
      return;
    }
    try {
      setLifestyleLoading(true);
      setLifestyleError(null);
      const prediction = await LifestyleService.getPrediction();
      setLifestylePrediction(prediction);
    } catch (error: any) {
      console.error('Error loading lifestyle prediction:', error);
      if (
        handleRateLimitError(
          error,
          'Lifestyle AI hit the rate limit. Please pull to refresh again in a minute.'
        )
      ) {
        setLifestyleError(
          'Lifestyle plan temporarily rate-limited. Please try again in about a minute.'
        );
      } else {
        setLifestyleError(error?.response?.data?.error || 'Unable to load lifestyle AI');
        setLifestylePrediction(null);
      }
    } finally {
      setLifestyleLoading(false);
    }
  }, [abortIfRateLimited, handleRateLimitError]);

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }

    if (
      abortIfRateLimited({
        message: RATE_LIMIT_DEFAULT_MESSAGE,
      })
    ) {
      setLoading(false);
      return;
    }

    isLoadingRef.current = true;

    try {
      const userData = await AuthService.getStoredUser();
      setUser(userData);

      if (userData) {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const metricsResult = await MetricService.getMetrics(userData.id, {
          from: weekAgo.toISOString(),
          to: today.toISOString(),
          limit: 100,
        });
        setMetrics(metricsResult);

        await loadPreventiveInsights();
        await loadLifestylePrediction();
      } else {
        setPreventiveInsights(null);
        setLifestylePrediction(null);
      }
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      if (
        handleRateLimitError(
          error,
          'Health data refresh hit the server rate limit. Please try again shortly.'
        )
      ) {
        setInsightsError((prev) => prev ?? 'AI insights temporarily rate-limited.');
        setLifestyleError((prev) => prev ?? 'Lifestyle plan temporarily rate-limited.');
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [
    abortIfRateLimited,
    handleRateLimitError,
    loadPreventiveInsights,
    loadLifestylePrediction,
  ]);

  const onRefresh = useCallback(async () => {
    if (
      abortIfRateLimited({
        message: RATE_LIMIT_DEFAULT_MESSAGE,
      })
    ) {
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    await loadData();
    // Don't force update steps on refresh - use cached value to prevent duplicate syncs
    // Steps are updated in real-time via native events (Android) or periodic updates (iOS)
    const cachedSteps = StepCounterService.getCachedSteps();
    setDeviceSteps(cachedSteps);
    setRefreshing(false);
  }, [abortIfRateLimited, loadData]);

  useEffect(() => {
    loadData();
    initializeStepCounter();
    
    // Listen for real-time step updates from the service
    const unsubscribe = StepCounterService.addStepListener((steps: number) => {
      setDeviceSteps(steps);
    });
    
    // Fallback: Update periodically for iOS or if listener doesn't work
    const interval = setInterval(() => {
      updateDeviceSteps();
    }, 2000); // Check every 2 seconds as fallback

    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
      StepCounterService.stopTracking();
    };
  }, [loadData]);

  // Refresh data when screen comes into focus (e.g., returning from VitalsScreen)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getTodaySteps = () => {
    // Get steps from backend metrics
    let backendSteps = 0;
    if (metrics?.rows) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      backendSteps = metrics.rows
        .filter((m: any) => {
          if (m.metric_type !== 'steps') return false;
          const recordDate = new Date(m.start_time);
          recordDate.setHours(0, 0, 0, 0);
          return recordDate.getTime() === today.getTime();
        })
        .reduce((sum: number, m: any) => sum + parseFloat(m.value), 0);
    }
    
    // Use device steps if available and higher, otherwise use backend steps
    // This ensures we show the most up-to-date count
    return Math.max(Math.round(backendSteps), deviceSteps);
  };

  const getStepsData = () => {
    if (!metrics?.rows) return { labels: [], data: [] };
    
    // Get steps for last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    // Group steps by day
    const stepsByDay: { [key: string]: number } = {};
    metrics.rows
      .filter((m: any) => m.metric_type === 'steps')
      .forEach((m: any) => {
        const recordDate = new Date(m.start_time);
        recordDate.setHours(0, 0, 0, 0);
        const dateKey = recordDate.toISOString().split('T')[0];
        
        if (recordDate >= sevenDaysAgo) {
          stepsByDay[dateKey] = (stepsByDay[dateKey] || 0) + parseFloat(m.value);
        }
      });
    
    // Create array for last 7 days
    const labels: string[] = [];
    const data: number[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      data.push(Math.round(stepsByDay[dateKey] || 0));
    }

    return { labels, data };
  };

  const getHeartRateData = () => {
    if (!metrics?.rows) return { labels: [], data: [] };
    
    const hrData = metrics.rows
      .filter((m: any) => m.metric_type === 'heart_rate')
      .slice(0, 7)
      .reverse();

    return {
      labels: hrData.map((m: any) => {
        const date = new Date(m.start_time);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      }),
      data: hrData.map((m: any) => parseFloat(m.value)),
    };
  };

  const getLatestVitalSigns = () => {
    if (!metrics?.rows) return null;
    
    const vitalTypes = ['heart_rate', 'stress_level', 'oxygen_saturation', 'respiratory_rate', 'temperature'];
    const latest: any = {};
    
    // Sort metrics by timestamp (newest first) to get the latest values
    const sortedMetrics = [...metrics.rows].sort((a: any, b: any) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
    
    vitalTypes.forEach(type => {
      const latestMetric = sortedMetrics.find((m: any) => m.metric_type === type);
      if (latestMetric) {
        latest[type] = {
          value: parseFloat(latestMetric.value),
          timestamp: latestMetric.start_time,
          confidence: latestMetric.confidence,
        };
      }
    });
    
    // Handle blood pressure (systolic and diastolic)
    // Find the most recent systolic and diastolic with matching timestamps (same recording session)
    const systolicMetrics = sortedMetrics.filter((m: any) => m.metric_type === 'blood_pressure_systolic');
    const diastolicMetrics = sortedMetrics.filter((m: any) => m.metric_type === 'blood_pressure_diastolic');
    
    // Find matching pair with same timestamp (from same recording)
    let systolicMetric = null;
    let diastolicMetric = null;
    
    for (const sys of systolicMetrics) {
      const matchingDiastolic = diastolicMetrics.find((dia: any) => 
        dia.start_time === sys.start_time
      );
      if (matchingDiastolic) {
        systolicMetric = sys;
        diastolicMetric = matchingDiastolic;
        break; // Found the most recent matching pair
      }
    }
    
    if (systolicMetric && diastolicMetric) {
      latest.blood_pressure = {
        systolic: parseFloat(systolicMetric.value),
        diastolic: parseFloat(diastolicMetric.value),
        timestamp: systolicMetric.start_time,
        confidence: systolicMetric.confidence,
      };
    }
    
    // Check if we have at least one vital sign
    if (Object.keys(latest).length === 0) return null;
    
    return latest;
  };

  const renderRiskChip = (label: string, value?: number, accent: string = Colors.accentSecondary) => {
    const percent = typeof value === 'number' ? Math.round(value * 100) : null;
    return (
      <View key={label} style={[styles.riskChip, { borderColor: accent }]}>
        <Text style={styles.riskChipLabel}>{label}</Text>
        <Text style={[styles.riskChipValue, { color: accent }]}>
          {percent !== null ? `${percent}%` : '--'}
        </Text>
      </View>
    );
  };

  const todaySteps = getTodaySteps();
  const stepsChart = getStepsData();
  const heartRateChart = getHeartRateData();
  const latestVitals = getLatestVitalSigns();
  const displayName = user?.email?.split('@')[0] ?? 'friend';
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const readinessScore = lifestylePrediction ? `${lifestylePrediction.lifestyle_score}%` : '--';

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Calibrating your dashboard...</Text>
      </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
    <ScrollView
        contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
        <View style={styles.heroHeader}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroEyebrow}>Today · {todayLabel}</Text>
            <Text style={styles.heroTitle}>Stay consistent, {displayName}</Text>
            <Text style={styles.heroSubtitle}>Here’s your personalized wellbeing pulse.</Text>
              </View>
              <TouchableOpacity style={styles.iconButton}>
            <Bell size={18} color={Colors.background} />
          </TouchableOpacity>
            </View>

        {rateLimitMessage && (
          <View style={styles.rateLimitBanner}>
            <AlertTriangle size={18} color={Colors.accent} />
            <Text style={styles.rateLimitText}>{rateLimitMessage}</Text>
        </View>
        )}

        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroCardLabel}>Lifestyle score</Text>
            <Text style={styles.heroCardMetric}>{readinessScore}</Text>
            <Text style={styles.heroCardCaption}>
              {lifestylePrediction ? 'AI calibrated for today' : 'Complete your profile to unlock'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.heroCardButton}
            onPress={() => navigation.navigate('LifestylePrediction')}
          >
            <Text style={styles.heroCardButtonText}>Open plan</Text>
            <ArrowRight size={16} color={Colors.background} />
          </TouchableOpacity>
      </View>

        <View style={styles.quickCardsRow}>
          {/* Today's Steps - Square Card */}
          <Card3D
            depth={16}
            style={StyleSheet.flatten([styles.cardSurface, styles.quickCard, styles.stepsQuickCard])}
          >
            <View style={styles.todayStepsHeader}>
              <View style={styles.stepsIconContainer}>
                <Footprints size={18} color={Colors.textPrimary} />
                <View style={styles.iconBadge}>
                  <Zap size={8} color={Colors.background} />
                </View>
              </View>
              <View style={styles.labelRow}>
                <Text style={styles.todayStepsLabel}>Today</Text>
                <Calendar size={12} color={Colors.textMuted} />
              </View>
            </View>
            <Text style={styles.todayStepsDate}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            <View style={styles.stepsValueContainer}>
              <Text style={styles.todayStepsValue}>{todaySteps.toLocaleString()}</Text>
              <View style={styles.stepsUnitContainer}>
                <Target size={14} color={Colors.textSecondary} />
                <Text style={styles.todayStepsUnit}>steps</Text>
              </View>
            </View>
          </Card3D>

          {/* AI Vitals - Square Card */}
          <Card3D
            depth={14}
            style={StyleSheet.flatten([
              styles.cardSurface,
              styles.quickCard,
              styles.aiQuickCard,
              styles.aiVitalsCard,
            ])}
          >
            <TouchableOpacity
              style={styles.aiVitalsCardContent}
              onPress={() => navigation.navigate('Vitals')}
              activeOpacity={0.9}
            >
              <View style={styles.aiVitalsTop}>
                <View style={styles.aiVitalsIconContainer}>
                  <Camera size={20} color={Colors.textPrimary} />
                </View>
                <View style={styles.aiVitalsTextContainer}>
                  <Text style={styles.aiVitalsTitle}>AI Vital Signs</Text>
                  <Text style={styles.aiVitalsSubtitle}>Scan in 30s</Text>
                </View>
              </View>
              <View style={styles.aiVitalsArrowButton}>
                <ArrowRight size={14} color={Colors.background} />
              </View>
            </TouchableOpacity>
          </Card3D>
        </View>

        {(lifestylePrediction || lifestyleLoading || lifestyleError) && (
          <Card3D depth={14} style={{ ...styles.cardSurface, ...styles.lifestyleCard }}>
            <View style={styles.lifestyleHeader}>
              <View>
                <Text style={styles.lifestyleTitle}>Lifestyle AI</Text>
                <Text style={styles.lifestyleSubtitle}>
                  {lifestylePrediction
                    ? new Date(lifestylePrediction.prediction_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })
                    : new Date().toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                </Text>
              </View>
              <TrendingUp size={20} color={Colors.textPrimary} />
            </View>

            {lifestyleLoading && (
              <Text style={styles.lifestyleStatusText}>Calibrating your plan...</Text>
            )}
            {lifestyleError && (
              <Text style={styles.lifestyleErrorText}>{lifestyleError}</Text>
            )}

            {lifestylePrediction && (
              <>
                <View style={styles.lifestyleScoreRow}>
                  <Text style={styles.lifestyleScoreLabel}>Today's Lifestyle Score</Text>
                  <Text style={styles.lifestyleScoreValue}>
                    {lifestylePrediction.lifestyle_score}
                  </Text>
                </View>

                <View style={styles.lifestyleMetricsRow}>
                  <View style={styles.lifestyleMetric}>
                    <Flame size={18} color={Colors.accent} />
                    <Text style={styles.lifestyleMetricValue}>
                      {lifestylePrediction.predicted_calories}
                    </Text>
                    <Text style={styles.lifestyleMetricLabel}>calories</Text>
                  </View>
                  <View style={styles.lifestyleMetric}>
                    <Clock size={18} color={Colors.accentSecondary} />
                    <Text style={styles.lifestyleMetricValue}>
                      {lifestylePrediction.recommended_workout_duration}m
                    </Text>
                    <Text style={styles.lifestyleMetricLabel}>workout</Text>
                  </View>
                  <View style={styles.lifestyleMetric}>
                    <Footprints size={18} color={Colors.accentTertiary} />
                    <Text style={styles.lifestyleMetricValue}>
                      {lifestylePrediction.recommended_steps.toLocaleString()}
                    </Text>
                    <Text style={styles.lifestyleMetricLabel}>steps</Text>
                  </View>
                </View>

                <Text style={styles.lifestyleNote} numberOfLines={2}>
                  {lifestylePrediction.recommended_workout_type}
                </Text>
              </>
            )}

            <TouchableOpacity
              style={[
                styles.lifestyleDetailsButton,
                (!lifestylePrediction || lifestyleLoading) && styles.lifestyleDetailsButtonDisabled,
              ]}
              onPress={() => navigation.navigate('LifestylePrediction')}
              disabled={!lifestylePrediction || lifestyleLoading}
              activeOpacity={0.9}
            >
              <Text style={styles.lifestyleDetailsButtonText}>View full plan</Text>
              <ArrowRight size={16} color="#ffffff" />
            </TouchableOpacity>
          </Card3D>
        )}

      <View style={styles.statsContainer}>
          <Card3D depth={12} style={StyleSheet.flatten([styles.cardSurface, styles.statCard, styles.avgStepCard])}>
            <View style={styles.statIconContainer}>
              <BarChart3 size={24} color={Colors.textPrimary} />
            </View>
          <Text style={styles.statValue}>
            {stepsChart.data.length > 0
              ? Math.round(stepsChart.data.reduce((a: number, b: number) => a + b, 0) / stepsChart.data.length)
              : 0}
          </Text>
            <View style={styles.statLabelContainer}>
              <TrendingUp size={14} color={Colors.textSecondary} />
          <Text style={styles.statLabel}>Avg Steps (7d)</Text>
        </View>
          </Card3D>

          <Card3D depth={12} style={StyleSheet.flatten([styles.cardSurface, styles.statCard, styles.avgHrCard])}>
            <View style={styles.statIconContainer}>
              <Heart size={24} color={Colors.textPrimary} />
            </View>
          <Text style={styles.statValue}>
            {heartRateChart.data.length > 0
              ? Math.round(heartRateChart.data.reduce((a: number, b: number) => a + b, 0) / heartRateChart.data.length)
                : latestVitals?.heart_rate?.value || 0}
          </Text>
            <View style={styles.statLabelContainer}>
              <Heart size={14} color={Colors.textSecondary} />
          <Text style={styles.statLabel}>Avg HR (bpm)</Text>
            </View>
          </Card3D>
        </View>

        {(preventiveInsights || insightsLoading || insightsError) && (
          <Card3D depth={14} style={{ ...styles.cardSurface, ...styles.preventiveCard }}>
            <View style={styles.preventiveHeader}>
              <View style={styles.preventiveHeaderText}>
                <Text style={styles.preventiveTitle}>Preventive AI</Text>
                <Text style={styles.preventiveSubtitle}>
                  {preventiveInsights?.summary?.headline || 'Calibrating your daily nudges'}
                </Text>
              </View>
              <View style={styles.preventiveBadge}>
                <Shield size={20} color={Colors.accent} />
              </View>
            </View>

            <View style={styles.preventiveActions}>
              <TouchableOpacity
                style={[styles.regenerateButton, insightsLoading && styles.regenerateButtonDisabled]}
                onPress={loadPreventiveInsights}
                disabled={insightsLoading}
              >
                <Text style={styles.regenerateButtonText}>
                  {insightsLoading ? 'Refreshing...' : 'Regenerate Insights'}
                </Text>
              </TouchableOpacity>
            </View>

            {insightsLoading && (
              <Text style={styles.preventiveLoading}>Updating insights...</Text>
            )}
            {insightsError && (
              <Text style={styles.preventiveError}>{insightsError}</Text>
            )}

            {preventiveInsights && (
              <>
                <View style={styles.riskRow}>
                  {renderRiskChip('Fever risk', preventiveInsights.riskScores?.feverProbability, '#DC2626')}
                  {renderRiskChip('Respiratory', preventiveInsights.riskScores?.respiratoryProbability, '#2563EB')}
                  {renderRiskChip('Recovery', preventiveInsights.riskScores?.stressRecoveryIndex, '#10B981')}
                </View>

                <View style={styles.preventiveInfoRow}>
                  <View style={styles.newsBadge}>
                    <AlertTriangle size={16} color={Colors.accent} />
                    <Text style={styles.newsBadgeText}>
                      NEWS2 {preventiveInsights.news2?.score ?? '--'} · {preventiveInsights.news2?.level || 'n/a'}
                    </Text>
                  </View>
                  <Text style={styles.nextBestAction}>
                    {preventiveInsights.summary?.nextBestAction || 'Keep routine hydration & light movement.'}
                  </Text>
                </View>

                {preventiveInsights.recommendations && preventiveInsights.recommendations.length > 0 && (
                  <View style={styles.recommendationsList}>
                    {preventiveInsights.recommendations.slice(0, 3).map((rec, index) => (
                      <View key={`${rec.title}-${index}`} style={styles.recommendationItem}>
                        <View style={styles.recommendationBullet} />
                        <View style={styles.recommendationContent}>
                          <Text style={styles.recommendationTitle}>{rec.title}</Text>
                          <Text style={styles.recommendationDescription}>{rec.description}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {preventiveInsights.safety?.requiresClinicianReview && (
                  <View style={styles.safetyBanner}>
                    <Thermometer size={16} color={Colors.accent} />
                    <Text style={styles.safetyBannerText}>
                      Elevated risk — share vitals with your clinician if symptoms persist.
                    </Text>
                  </View>
                )}
              </>
            )}
          </Card3D>
        )}

        {/* Latest Vital Signs Card */}
        {latestVitals && (
          <Card3D depth={14} style={{ ...styles.cardSurface, ...styles.vitalsCard }}>
            <View style={styles.vitalsCardHeader}>
              <Text style={styles.vitalsCardTitle}>Latest Vital Signs</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('VitalSignsDetails')}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <ArrowRight size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.vitalsGrid}>
              {latestVitals.heart_rate && (
                <View style={styles.vitalCardItem}>
                  <VitalCard3D
                    icon={Heart}
                    label="Heart Rate"
                    value={latestVitals.heart_rate.value}
                    unit="bpm"
                    color={VITAL_COLORS.heartRate}
                  />
                </View>
              )}
              {latestVitals.stress_level && (
                <View style={styles.vitalCardItem}>
                  <VitalCard3D
                    icon={Activity}
                    label="Stress"
                    value={latestVitals.stress_level.value}
                    color={VITAL_COLORS.stress}
                  />
                </View>
              )}
              {latestVitals.oxygen_saturation && (
                <View style={styles.vitalCardItem}>
                  <VitalCard3D
                    icon={Wind}
                    label="SpO2"
                    value={latestVitals.oxygen_saturation.value}
                    unit="%"
                    color={VITAL_COLORS.spo2}
                  />
                </View>
              )}
              {latestVitals.temperature && (
                <View style={styles.vitalCardItem}>
                  <VitalCard3D
                    icon={Thermometer}
                    label="Temperature"
                    value={latestVitals.temperature.value}
                    unit="°C"
                    color={VITAL_COLORS.temperature}
                  />
                </View>
              )}
              {latestVitals.respiratory_rate && (
                <View style={styles.vitalCardItem}>
                  <VitalCard3D
                    icon={Wind}
                    label="Respiratory"
                    value={latestVitals.respiratory_rate.value}
                    unit="/min"
                    color={VITAL_COLORS.respiratory}
                  />
                </View>
              )}
              {latestVitals.blood_pressure && (
                <View style={styles.vitalCardItem}>
                  <VitalCard3D
                    icon={Droplet}
                    label="Blood Pressure"
                    value={`${latestVitals.blood_pressure.systolic}/${latestVitals.blood_pressure.diastolic}`}
                    unit="mmHg"
                    color={VITAL_COLORS.bloodPressure}
                  />
                </View>
              )}
      </View>
            {latestVitals.heart_rate && (
              <Text style={styles.vitalsTimestamp}>
                {new Date(latestVitals.heart_rate.timestamp).toLocaleString()}
              </Text>
            )}
          </Card3D>
        )}

      {stepsChart.data.length > 0 && (
          <Card3D depth={12} style={{ ...styles.cardSurface, ...styles.chartContainer }}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <BarChart3 size={20} color={Colors.textPrimary} />
          <Text style={styles.chartTitle}>Steps (Last 7 Days)</Text>
              </View>
              <Clock size={16} color={Colors.textSecondary} />
            </View>
          <LineChart
            data={stepsChart.data}
            labels={stepsChart.labels}
            color={Colors.success}
            height={200}
            showGrid={true}
            showDots={true}
            animated={true}
          />
          </Card3D>
      )}

      {heartRateChart.data.length > 0 && (
          <Card3D depth={12} style={{ ...styles.cardSurface, ...styles.chartContainer }}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <Heart size={20} color={Colors.textPrimary} />
          <Text style={styles.chartTitle}>Heart Rate (Last 7 Days)</Text>
              </View>
              <Clock size={16} color={Colors.textSecondary} />
            </View>
          <LineChart
            data={heartRateChart.data}
            labels={heartRateChart.labels}
            color={Colors.danger}
            height={200}
            showGrid={true}
            showDots={true}
            animated={true}
          />
          </Card3D>
      )}

      {(!stepsChart.data.length && !heartRateChart.data.length) && (
          <Card3D depth={8} style={{ ...styles.cardSurface, ...styles.emptyState }}>
          <Text style={styles.emptyStateText}>No health data available</Text>
          <Text style={styles.emptyStateSubtext}>
            Sync your devices to see your health metrics here
          </Text>
          </Card3D>
      )}
    </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  heroTextBlock: {
    flex: 1,
    gap: 6,
  },
  heroEyebrow: {
    ...TextStyles.label,
    color: Colors.textMuted,
  },
  heroTitle: {
    ...TextStyles.h2,
    color: Colors.textPrimary,
  },
  heroSubtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  rateLimitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: Colors.cardAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rateLimitText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  heroCard: {
    backgroundColor: Colors.lifestyleCard,
    borderRadius: 24,
    padding: 20,
    borderWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  heroCardLabel: {
    ...TextStyles.label,
    color: Colors.lifestyleText,
  },
  heroCardMetric: {
    ...TextStyles.metric,
    color: Colors.lifestyleText,
    marginVertical: 4,
  },
  heroCardCaption: {
    color: Colors.lifestyleText,
    fontSize: 14,
  },
  heroCardButton: {
    backgroundColor: Colors.lifestyleButton,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCardButtonText: {
    color: Colors.white,
    fontWeight: '700',
  },
  quickCardsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 20,
  },
  quickCard: {
    flex: 1,
    aspectRatio: 1,
    padding: 16,
    borderWidth: 0,
    borderRadius: 20,
    justifyContent: 'space-between',
    minHeight: 160,
  },
  stepsQuickCard: {
    backgroundColor: Colors.stepsCard,
    borderWidth: 0,
  },
  aiQuickCard: {
    backgroundColor: Colors.aiVitalsCard,
    borderWidth: 0,
  },
  cardSurface: {
    backgroundColor: Colors.card,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  header: {
    padding: 20,
    paddingTop: 30,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.backgroundDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: Colors.backgroundDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
    flexShrink: 0,
  },
  vitalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  vitalsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  todayStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepsIconContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.backgroundDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: Colors.background,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayStepsLabel: {
    ...TextStyles.bodySemibold,
    color: Colors.textPrimary,
  },
  todayStepsDate: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  stepsValueContainer: {
    alignItems: 'flex-start',
    gap: 4,
  },
  todayStepsValue: {
    ...TextStyles.h2,
    color: Colors.textPrimary,
  },
  stepsUnitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayStepsUnit: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  aiVitalsCard: {
    padding: 0,
  },
  aiVitalsCardContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  aiVitalsTop: {
    alignItems: 'center',
    gap: 10,
  },
  aiVitalsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.backgroundDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  aiVitalsTextContainer: {
    alignItems: 'center',
    gap: 4,
  },
  aiVitalsTitle: {
    ...TextStyles.bodyMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  aiVitalsSubtitle: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  aiVitalsArrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    shadowColor: Colors.backgroundDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 14,
  },
  preventiveCard: {
    marginHorizontal: 0,
    marginTop: 20,
    marginBottom: 20,
    padding: 20,
    borderWidth: 0,
  },
  preventiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  preventiveHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  preventiveTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  preventiveSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  preventiveActions: {
    marginBottom: 12,
  },
  regenerateButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardAlt,
  },
  regenerateButtonDisabled: {
    opacity: 0.6,
  },
  regenerateButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  preventiveBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardAlt,
  },
  preventiveLoading: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  preventiveError: {
    fontSize: 13,
    color: Colors.danger,
    marginBottom: 8,
  },
  lifestyleCard: {
    marginHorizontal: 0,
    marginTop: 20,
    marginBottom: 20,
    padding: 20,
    borderWidth: 0,
  },
  lifestyleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lifestyleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  lifestyleSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  lifestyleStatusText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  lifestyleErrorText: {
    fontSize: 14,
    color: Colors.danger,
    marginBottom: 12,
  },
  lifestyleScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  lifestyleScoreLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  lifestyleScoreValue: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.accent,
  },
  lifestyleMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lifestyleMetric: {
    flex: 1,
    alignItems: 'center',
  },
  lifestyleMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 6,
  },
  lifestyleMetricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  lifestyleNote: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  lifestyleDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
  },
  lifestyleDetailsButtonDisabled: {
    opacity: 0.5,
  },
  lifestyleDetailsButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 6,
  },
  riskRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  riskChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  riskChipLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  riskChipValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  preventiveInfoRow: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  newsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  newsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  nextBestAction: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  recommendationsList: {
    gap: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    gap: 10,
  },
  recommendationBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  recommendationDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  safetyBanner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(220,38,38,0.12)',
  },
  safetyBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger,
  },
  statCard: {
    flex: 1,
    padding: 18,
    alignItems: 'center',
    borderWidth: 0,
  },
  avgStepCard: {
    backgroundColor: Colors.avgStepCard,
  },
  avgHrCard: {
    backgroundColor: Colors.avgHrCard,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.backgroundDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  statLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartContainer: {
    marginHorizontal: 0,
    marginTop: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderWidth: 0,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
  },
  chart: {
    marginTop: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    borderWidth: 0,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  vitalsCard: {
    marginHorizontal: 0,
    marginTop: 20,
    padding: 20,
    borderWidth: 0,
  },
  vitalsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  vitalsCardTitle: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.cardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
    width: '100%',
  },
  vitalCardItem: {
    width: '48%',
    aspectRatio: 1,
    marginBottom: 16,
  },
  vitalItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.cardAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vitalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  vitalLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  vitalsTimestamp: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
});

