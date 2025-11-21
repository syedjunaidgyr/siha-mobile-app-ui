import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { ProfileService } from '../services/profileService';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { FieldInput } from '../components/ui/FieldInput';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors } from '../theme/colors';

// Safely import DatePicker with fallback
let DatePicker: any = null;
try {
  DatePicker = require('react-native-date-picker').default;
} catch (error) {
  console.warn('react-native-date-picker not available, using fallback');
  // Set global flag to suppress warning if module exists but isn't linked
  if (typeof global !== 'undefined') {
    (global as any).ignoreDatePickerWarning = true;
  }
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date(2000, 0, 1));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!gender) {
      Alert.alert('Error', 'Please select your gender');
      return;
    }

    if (!height || parseFloat(height) <= 0) {
      Alert.alert('Error', 'Please enter a valid height');
      return;
    }

    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    setLoading(true);
    try {
      await ProfileService.updateProfile({
        gender,
        height: parseFloat(height),
        weight: parseFloat(weight),
        date_of_birth: dateOfBirth.toISOString().split('T')[0],
      });
      onComplete();
    } catch (error: any) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save profile information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.stepLabel}>Step 02 · Body data</Text>
        <Text style={styles.title}>Build your digital twin</Text>
        <Text style={styles.subtitle}>
          We’ll tailor the lifestyle plan, vitals calibration and workout intensity.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>How do you identify?</Text>
          <View style={styles.genderContainer}>
            {['male', 'female', 'other'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.genderChip, gender === item && styles.genderChipActive]}
                onPress={() => setGender(item as any)}
              >
                <Text style={[styles.genderChipText, gender === item && styles.genderChipTextActive]}>
                  {item === 'other' ? 'Non-binary' : item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Height</Text>
              <Text style={styles.metricValue}>{height || '170'} cm</Text>
              <FieldInput
                placeholder="Enter height"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                style={styles.hiddenInput}
              />
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Weight</Text>
              <Text style={styles.metricValue}>{weight || '70'} kg</Text>
              <FieldInput
                placeholder="Enter weight"
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                style={styles.hiddenInput}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Birth date</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setIsDatePickerOpen(true)}>
            <Text style={styles.dateButtonText}>{dateOfBirth.toLocaleDateString()}</Text>
            <Text style={styles.dateButtonHint}>Tap to adjust</Text>
          </TouchableOpacity>

          <PrimaryButton label="Save & Continue" onPress={handleNext} loading={loading} />
        </View>
      </ScrollView>

      {DatePicker ? (
        <DatePicker
          modal
          mode="date"
          open={isDatePickerOpen}
          date={dateOfBirth}
          maximumDate={new Date()}
          onConfirm={(selectedDate: Date) => {
            setIsDatePickerOpen(false);
            setDateOfBirth(selectedDate);
          }}
          onCancel={() => setIsDatePickerOpen(false)}
        />
      ) : Platform.OS === 'android' ? (
        // Fallback for Android using built-in date picker
        isDatePickerOpen && (
          <View style={StyleSheet.absoluteFill} />
        )
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  stepLabel: {
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  genderChipText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  genderChipTextActive: {
    color: Colors.background,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.cardAlt,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  metricValue: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
  },
  hiddenInput: {
    marginTop: 12,
  },
  dateButton: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    backgroundColor: Colors.input,
    marginBottom: 24,
  },
  dateButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  dateButtonHint: {
    color: Colors.textMuted,
    marginTop: 4,
    fontSize: 12,
  },
});

