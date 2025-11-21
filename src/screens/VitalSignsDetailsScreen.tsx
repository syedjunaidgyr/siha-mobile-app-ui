import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Heart, Activity, Wind, Calendar, ArrowLeft, Droplet, Thermometer } from 'lucide-react-native';
import { MetricService } from '../services/metricService';
import { AuthService } from '../services/authService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { Card3D } from '../components/3D';
import { Colors, Typography, TextStyles } from '../theme';

interface VitalSignsRecord {
  id: string;
  timestamp: string;
  heartRate?: number;
  stressLevel?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
  temperature?: number;
  bloodPressure?: { systolic: number; diastolic: number };
  confidence?: number;
}

export default function VitalSignsDetailsScreen() {
  const navigation = useNavigation();
  const [records, setRecords] = useState<VitalSignsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVitalSigns();
  }, []);

  // Refresh data when screen comes into focus (e.g., after saving new vitals)
  useFocusEffect(
    useCallback(() => {
      loadVitalSigns();
    }, [])
  );

  const loadVitalSigns = async () => {
    try {
      const user = await AuthService.getStoredUser();
      if (!user) return;

      // Fetch all vital signs metrics
      const vitalTypes = ['heart_rate', 'stress_level', 'oxygen_saturation', 'respiratory_rate', 'temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic'];
      const allMetrics: any[] = [];

      for (const type of vitalTypes) {
        const result = await MetricService.getMetrics(user.id, {
          type,
          limit: 100,
        });
        if (result?.rows) {
          allMetrics.push(...result.rows);
        }
      }

      // Group metrics by timestamp (same recording session)
      const groupedByTime: { [key: string]: any } = {};
      
      allMetrics.forEach((metric: any) => {
        const timestamp = new Date(metric.start_time).toISOString();
        // Round to nearest minute to group same session
        const timeKey = new Date(timestamp).setSeconds(0, 0).toString();
        
        if (!groupedByTime[timeKey]) {
          groupedByTime[timeKey] = {
            id: timeKey,
            timestamp: metric.start_time,
            confidence: metric.confidence,
          };
        }
        
        const value = parseFloat(metric.value);
        switch (metric.metric_type) {
          case 'heart_rate':
            groupedByTime[timeKey].heartRate = value;
            break;
          case 'stress_level':
            groupedByTime[timeKey].stressLevel = value;
            break;
          case 'oxygen_saturation':
            groupedByTime[timeKey].oxygenSaturation = value;
            break;
          case 'respiratory_rate':
            groupedByTime[timeKey].respiratoryRate = value;
            break;
          case 'temperature':
            groupedByTime[timeKey].temperature = value;
            break;
          case 'blood_pressure_systolic':
            if (!groupedByTime[timeKey].bloodPressure) {
              groupedByTime[timeKey].bloodPressure = {};
            }
            groupedByTime[timeKey].bloodPressure.systolic = value;
            break;
          case 'blood_pressure_diastolic':
            if (!groupedByTime[timeKey].bloodPressure) {
              groupedByTime[timeKey].bloodPressure = {};
            }
            groupedByTime[timeKey].bloodPressure.diastolic = value;
            break;
        }
      });

      // Convert to array and sort by timestamp (newest first)
      const recordsArray = Object.values(groupedByTime).sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ) as VitalSignsRecord[];

      setRecords(recordsArray);
    } catch (error) {
      console.error('Error loading vital signs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVitalSigns();
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };
  };

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
      </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vital Signs History</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {records.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={64} color={Colors.textMuted} />
            <Text style={styles.emptyStateText}>No vital signs recorded yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Use the AI Vital Signs feature to capture your first reading
            </Text>
          </View>
        ) : (
          records.map((record) => {
            const { date, time} = formatDate(record.timestamp);
            return (
              <Card3D key={record.id} depth={10} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.dateContainer}>
                    <Calendar size={14} color={Colors.textSecondary} />
                    <Text style={styles.dateText}>{date}</Text>
                    <Text style={styles.timeText}>{time}</Text>
                  </View>
                  {record.confidence !== undefined && record.confidence !== null && (
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {Math.round((typeof record.confidence === 'string' ? parseFloat(record.confidence) : record.confidence) * 100)}%
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.vitalsGrid}>
                  {record.heartRate !== undefined && (
                    <View style={styles.vitalCard}>
                      <Heart size={20} color={Colors.danger} />
                      <Text style={styles.vitalLabel}>HEART RATE</Text>
                      <Text style={styles.vitalValue}>{record.heartRate}</Text>
                      <Text style={styles.vitalUnit}>bpm</Text>
                    </View>
                  )}

                  {record.stressLevel !== undefined && (
                    <View style={styles.vitalCard}>
                      <Activity size={20} color={Colors.accentTertiary} />
                      <Text style={styles.vitalLabel}>STRESS</Text>
                      <Text style={styles.vitalValue}>{record.stressLevel}</Text>
                      <Text style={styles.vitalUnit}>score</Text>
                    </View>
                  )}

                  {record.oxygenSaturation !== undefined && (
                    <View style={styles.vitalCard}>
                      <Wind size={20} color={Colors.success} />
                      <Text style={styles.vitalLabel}>SPO2</Text>
                      <Text style={styles.vitalValue}>{record.oxygenSaturation}%</Text>
                      <Text style={styles.vitalUnit}>oxygen</Text>
                    </View>
                  )}

                  {record.respiratoryRate !== undefined && (
                    <View style={styles.vitalCard}>
                      <Wind size={20} color={Colors.accentSecondary} />
                      <Text style={styles.vitalLabel}>RESPIRATORY</Text>
                      <Text style={styles.vitalValue}>{record.respiratoryRate}</Text>
                      <Text style={styles.vitalUnit}>/min</Text>
                    </View>
                  )}

                  {record.bloodPressure && (
                    <View style={styles.vitalCard}>
                      <Droplet size={20} color={Colors.danger} />
                      <Text style={styles.vitalLabel}>BLOOD PRESSURE</Text>
                      <Text style={styles.vitalValue}>
                        {record.bloodPressure.systolic}/{record.bloodPressure.diastolic}
                      </Text>
                      <Text style={styles.vitalUnit}>mmHg</Text>
                    </View>
                  )}
                  {record.temperature !== undefined && (
                    <View style={styles.vitalCard}>
                      <Thermometer size={20} color={Colors.accent} />
                      <Text style={styles.vitalLabel}>TEMP</Text>
                      <Text style={styles.vitalValue}>{record.temperature.toFixed(1)}</Text>
                      <Text style={styles.vitalUnit}>°C</Text>
                    </View>
                  )}
                </View>
              </Card3D>
            );
          })
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  recordCard: {
    backgroundColor: Colors.card,
    marginBottom: 16,
    padding: 18,
    borderWidth: 0,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    ...TextStyles.bodySemibold,
    color: Colors.textPrimary,
  },
  timeText: {
    ...TextStyles.small,
    color: Colors.textSecondary,
  },
  confidenceBadge: {
    backgroundColor: Colors.cardAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  confidenceText: {
    ...TextStyles.caption,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.accent,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vitalCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.cardAlt,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  vitalLabel: {
    ...TextStyles.label,
    color: Colors.textMuted,
    marginTop: 8,
    marginBottom: 6,
  },
  vitalValue: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
  },
  vitalUnit: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyStateText: {
    ...TextStyles.h4,
    color: Colors.textSecondary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    ...TextStyles.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

