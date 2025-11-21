import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { ProfileService } from '../services/profileService';
import { LifestyleService } from '../services/lifestyleService';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors, TextStyles } from '../theme';
import { Target, Check } from 'lucide-react-native';

interface GoalSelectionScreenProps {
  onComplete: () => void;
}

const goals = [
  {
    id: 'weight_loss' as const,
    title: 'Weight Loss',
    description: 'Lose weight and burn calories',
    icon: '🔥',
    color: Colors.danger,
  },
  {
    id: 'weight_gain' as const,
    title: 'Weight Gain',
    description: 'Gain healthy weight',
    icon: '📈',
    color: Colors.success,
  },
  {
    id: 'muscle_gain' as const,
    title: 'Muscle Gain',
    description: 'Build muscle and strength',
    icon: '💪',
    color: Colors.accent,
  },
  {
    id: 'maintain' as const,
    title: 'Maintain',
    description: 'Maintain current weight',
    icon: '⚖️',
    color: Colors.info,
  },
  {
    id: 'general_fitness' as const,
    title: 'General Fitness',
    description: 'Improve overall health',
    icon: '🏃',
    color: Colors.accentSecondary,
  },
  {
    id: 'improve_endurance' as const,
    title: 'Improve Endurance',
    description: 'Build stamina and endurance',
    icon: '🏋️',
    color: Colors.accentTertiary,
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Target size={32} color={Colors.accent} fill={Colors.accent} />
              <View style={styles.iconGlow} />
            </View>
            <View style={styles.heroBadge}>
              <Target size={14} color={Colors.accent} />
              <Text style={styles.badgeText}>Step 03 · Intent</Text>
            </View>
            <Text style={styles.title}>What do you want to achieve?</Text>
            <Text style={styles.subtitle}>
              Your goal will personalize your workout plan, nutrition guidance, and wellness tracking to help you succeed.
            </Text>
          </View>

          <View style={styles.goalsContainer}>
            {goals.map((goal) => {
              const isSelected = selectedGoal === goal.id;
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    isSelected && styles.goalCardActive,
                    isSelected && { borderColor: goal.color },
                  ]}
                  onPress={() => setSelectedGoal(goal.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.goalIconBubble,
                    isSelected && { backgroundColor: `${goal.color}15` },
                  ]}>
                    <Text style={styles.goalIcon}>{goal.icon}</Text>
                  </View>
                  <View style={styles.goalTextBlock}>
                    <Text style={[
                      styles.goalTitle,
                      isSelected && { color: goal.color },
                    ]}>
                      {goal.title}
                    </Text>
                    <Text style={styles.goalDescription}>{goal.description}</Text>
                  </View>
                  <View style={[
                    styles.goalIndicator,
                    isSelected && styles.goalIndicatorActive,
                    isSelected && { borderColor: goal.color, backgroundColor: goal.color },
                  ]}>
                    {isSelected && (
                      <Check size={8} color={Colors.white} strokeWidth={3} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryButton
            label="Continue"
            onPress={handleComplete}
            loading={loading}
            style={styles.continueButton}
            disabled={!selectedGoal}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  iconContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  iconGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    zIndex: -1,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    marginBottom: 20,
    gap: 6,
  },
  badgeText: {
    ...TextStyles.smallSemibold,
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  title: {
    ...TextStyles.h1,
    color: Colors.textPrimary,
    marginBottom: 12,
    lineHeight: 44,
  },
  subtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  goalsContainer: {
    marginBottom: 32,
  },
  goalCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    transition: 'all 0.2s ease',
  },
  goalCardActive: {
    backgroundColor: Colors.cardAlt,
    borderWidth: 2,
    shadowColor: Colors.accent,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  goalIconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  goalIcon: {
    fontSize: 28,
  },
  goalTextBlock: {
    flex: 1,
  },
  goalTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  goalDescription: {
    ...TextStyles.small,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  goalIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIndicatorActive: {
    borderWidth: 2,
  },
  continueButton: {
    marginTop: 8,
  },
});

