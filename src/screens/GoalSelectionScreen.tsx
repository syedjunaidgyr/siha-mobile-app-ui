import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { ProfileService } from '../services/profileService';
import { LifestyleService } from '../services/lifestyleService';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors } from '../theme/colors';

interface GoalSelectionScreenProps {
  onComplete: () => void;
}

const goals = [
  {
    id: 'weight_loss' as const,
    title: 'Weight Loss',
    description: 'Lose weight and burn calories',
    icon: '🔥',
  },
  {
    id: 'weight_gain' as const,
    title: 'Weight Gain',
    description: 'Gain healthy weight',
    icon: '📈',
  },
  {
    id: 'muscle_gain' as const,
    title: 'Muscle Gain',
    description: 'Build muscle and strength',
    icon: '💪',
  },
  {
    id: 'maintain' as const,
    title: 'Maintain',
    description: 'Maintain current weight',
    icon: '⚖️',
  },
  {
    id: 'general_fitness' as const,
    title: 'General Fitness',
    description: 'Improve overall health',
    icon: '🏃',
  },
  {
    id: 'improve_endurance' as const,
    title: 'Improve Endurance',
    description: 'Build stamina and endurance',
    icon: '🏋️',
  },
];

export default function GoalSelectionScreen({ onComplete }: GoalSelectionScreenProps) {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!selectedGoal) {
      Alert.alert('Error', 'Please select a goal');
      return;
    }

    setLoading(true);
    try {
      await ProfileService.updateProfile({
        goal: selectedGoal as any,
      });

      await LifestyleService.generatePrediction();

      onComplete();
    } catch (error: any) {
      console.error('Goal selection error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.stepLabel}>Step 03 · Intent</Text>
        <Text style={styles.title}>What do you want to achieve?</Text>
        <Text style={styles.subtitle}>Your goal will tune the workout stimuli, macros and recovery nudges.</Text>

        <View style={styles.goalsContainer}>
          {goals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[styles.goalCard, selectedGoal === goal.id && styles.goalCardActive]}
              onPress={() => setSelectedGoal(goal.id)}
            >
              <View style={styles.goalIconBubble}>
                <Text style={styles.goalIcon}>{goal.icon}</Text>
              </View>
              <View style={styles.goalTextBlock}>
                <Text style={[styles.goalTitle, selectedGoal === goal.id && styles.goalTitleActive]}>
                  {goal.title}
                </Text>
                <Text style={styles.goalDescription}>{goal.description}</Text>
              </View>
              <View style={[styles.goalIndicator, selectedGoal === goal.id && styles.goalIndicatorActive]} />
            </TouchableOpacity>
          ))}
        </View>

        <PrimaryButton label="Start Now" onPress={handleComplete} loading={loading} />
      </ScrollView>
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
    fontSize: 32,
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
  goalsContainer: {
    marginBottom: 32,
  },
  goalCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalCardActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.cardAlt,
  },
  goalIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  goalIcon: {
    fontSize: 24,
  },
  goalTextBlock: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  goalTitleActive: {
    color: Colors.accent,
  },
  goalDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  goalIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  goalIndicatorActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
});

