import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { ProfileService, Profile } from '../services/profileService';
import { LifestyleService } from '../services/lifestyleService';
import { AuthService } from '../services/authService';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { User, LogOut } from 'lucide-react-native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors, Typography, TextStyles } from '../theme';
import { Card3D } from '../components/3D';

interface ProfileScreenProps {
  onLogout?: () => Promise<void>;
}

export default function ProfileScreen({ onLogout }: ProfileScreenProps = {}) {
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [goal, setGoal] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const goals = [
    { id: 'weight_loss', title: 'Weight Loss' },
    { id: 'weight_gain', title: 'Weight Gain' },
    { id: 'muscle_gain', title: 'Muscle Gain' },
    { id: 'maintain', title: 'Maintain' },
    { id: 'general_fitness', title: 'General Fitness' },
    { id: 'improve_endurance', title: 'Improve Endurance' },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await ProfileService.getProfile();
      setProfile(profileData);
      setFullName(profileData.name || '');
      setEmail(profileData.email);
      setGender(profileData.gender || null);
      setHeight(profileData.height?.toString() || '');
      setWeight(profileData.weight?.toString() || '');
      setDateOfBirth(profileData.date_of_birth ? new Date(profileData.date_of_birth) : new Date(2000, 0, 1));
      setGoal(profileData.goal || null);
    } catch (error: any) {
      console.error('Load profile error:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please add your full name');
      return;
    }

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

    if (!goal) {
      Alert.alert('Error', 'Please select a goal');
      return;
    }

    setSaving(true);
    try {
      const updatedProfile = await ProfileService.updateProfile({
        name: fullName.trim(),
        gender,
        height: parseFloat(height),
        weight: parseFloat(weight),
        date_of_birth: dateOfBirth.toISOString().split('T')[0],
        goal: goal as any,
      });

      // Regenerate lifestyle prediction with new profile data
      await LifestyleService.generatePrediction();

      setProfile(updatedProfile);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      console.error('Save profile error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to log in again to access your account.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              // Use the logout handler from App.tsx if provided
              if (onLogout) {
                await onLogout();
              } else {
                // Fallback: Clear authentication tokens and user data
                await AuthService.logout();
                
                // Navigate to root stack navigator
                // The navigation structure: NavigationContainer -> Stack -> Tab -> Profile
                // We need to get to the Stack navigator (root of conditional routes)
                const tabNav = navigation.getParent(); // Tab navigator
                const stackNav = tabNav?.getParent(); // Stack navigator
                
                if (stackNav) {
                  // Reset the stack navigator to Login screen
                  stackNav.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: 'Login' }],
                    })
                  );
                }
              }
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              // Always reset loading state after a brief delay to allow navigation to complete
              setTimeout(() => {
                setLoggingOut(false);
              }, 300);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => {
              setEditing(false);
              loadProfile();
            }}>
              <Text style={styles.editButton}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <Card3D depth={14} style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroAvatar}>
              <User size={24} color={Colors.accent} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroEyebrow}>Preventive Profile</Text>
              <Text style={styles.heroTitle}>
                {fullName || 'Add your name'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {email || 'Add your email'}
              </Text>
              <Text style={styles.heroHint}>
                Keep your vitals updated to unlock personalized AI guidance.
              </Text>
            </View>
          </View>
          <View style={styles.heroMetricsRow}>
            {[
              { label: 'Goal', value: goals.find((g) => g.id === (goal || profile?.goal))?.title || 'Add goal' },
              { label: 'Height', value: height ? `${height} cm` : profile?.height ? `${profile.height} cm` : 'Add height' },
              { label: 'Weight', value: weight ? `${weight} kg` : profile?.weight ? `${profile.weight} kg` : 'Add weight' },
            ].map((metric) => (
              <View key={metric.label} style={styles.heroMetric}>
                <Text style={styles.heroMetricLabel}>{metric.label}</Text>
                <Text style={styles.heroMetricValue}>{metric.value}</Text>
              </View>
            ))}
          </View>
        </Card3D>

        <Card3D depth={12} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <Text style={styles.sectionCaption}>Baseline identifiers</Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Full Name</Text>
        {editing ? (
          <TextInput
            style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
          />
        ) : (
              <Text style={styles.value}>{fullName || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{email || 'Not set'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Gender</Text>
        {editing ? (
              <View style={styles.genderContainer}>
                {['male', 'female', 'other'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.genderButton, gender === option && styles.genderButtonActive]}
                    onPress={() => setGender(option as typeof gender)}
                  >
                    <Text style={[styles.genderButtonText, gender === option && styles.genderButtonTextActive]}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
        ) : (
              <Text style={styles.value}>{profile?.gender || 'Not set'}</Text>
        )}
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldBlock}>
        <Text style={styles.label}>Date of Birth</Text>
        {editing ? (
          <>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setIsDatePickerOpen(true)}
            >
              <Text style={styles.dateButtonText}>
                {dateOfBirth.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            <DatePicker
              modal
              mode="date"
              open={isDatePickerOpen}
              date={dateOfBirth}
              maximumDate={new Date()}
              onConfirm={(selectedDate) => {
                setIsDatePickerOpen(false);
                setDateOfBirth(selectedDate);
              }}
              onCancel={() => setIsDatePickerOpen(false)}
            />
          </>
        ) : (
          <Text style={styles.value}>
            {profile?.date_of_birth
              ? new Date(profile.date_of_birth).toLocaleDateString()
              : 'Not set'}
          </Text>
        )}
          </View>
        </Card3D>

        <Card3D depth={12} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Body Composition</Text>
            <Text style={styles.sectionCaption}>This powers AI vitals</Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Height (cm)</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                placeholder="Enter your height"
                placeholderTextColor={Colors.textMuted}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.value}>{profile?.height ? `${profile.height} cm` : 'Not set'}</Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Weight (kg)</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                placeholder="Enter your weight"
                placeholderTextColor={Colors.textMuted}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.value}>{profile?.weight ? `${profile.weight} kg` : 'Not set'}</Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldBlock}>
        <Text style={styles.label}>Goal</Text>
        {editing ? (
          <View style={styles.goalContainer}>
            {goals.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.goalButton, goal === g.id && styles.goalButtonActive]}
                onPress={() => setGoal(g.id)}
              >
                <Text style={[styles.goalButtonText, goal === g.id && styles.goalButtonTextActive]}>
                  {g.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.value}>
            {goals.find((g) => g.id === profile?.goal)?.title || 'Not set'}
          </Text>
        )}
          </View>
        </Card3D>

        {editing && (
          <PrimaryButton
            label="Save changes"
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
          />
        )}

        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={Colors.danger} />
            ) : (
              <>
                <LogOut size={18} color={Colors.danger} />
                <Text style={styles.logoutButtonText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.logoutHint}>
            Sign out of your account and return to the login screen
          </Text>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 120,
    gap: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...TextStyles.h1,
    color: Colors.textPrimary,
  },
  editButton: {
    ...TextStyles.bodySemibold,
    color: Colors.accent,
  },
  label: {
    ...TextStyles.smallSemibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  value: {
    ...TextStyles.bodySemibold,
    color: Colors.textPrimary,
  },
  input: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...TextStyles.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.cardAlt,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.cardAlt,
  },
  genderButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
    borderWidth: 1,
  },
  genderButtonText: {
    ...TextStyles.bodySemibold,
    color: Colors.textSecondary,
  },
  genderButtonTextActive: {
    color: Colors.background,
  },
  dateButton: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.cardAlt,
  },
  dateButtonText: {
    ...TextStyles.body,
    color: Colors.textPrimary,
  },
  goalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalButton: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.cardAlt,
  },
  goalButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
    borderWidth: 1,
  },
  goalButtonText: {
    ...TextStyles.smallSemibold,
    color: Colors.textSecondary,
  },
  goalButtonTextActive: {
    color: Colors.background,
  },
  heroCard: {
    padding: 20,
    backgroundColor: Colors.card,
  },
  heroHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.cardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    ...TextStyles.smallSemibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  heroTitle: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
  },
  heroSubtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  heroHint: {
    ...TextStyles.caption,
    color: Colors.textMuted,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heroMetric: {
    flex: 1,
    backgroundColor: Colors.cardAlt,
    borderRadius: 16,
    padding: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  heroMetricLabel: {
    ...TextStyles.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: 4,
  },
  heroMetricValue: {
    ...TextStyles.bodySemibold,
    color: Colors.textPrimary,
  },
  sectionCard: {
    padding: 20,
    backgroundColor: Colors.card,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
  },
  sectionCaption: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
  },
  fieldBlock: {
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  saveButton: {
    marginTop: 8,
  },
  logoutSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    backgroundColor: 'transparent',
    minWidth: 160,
  },
  logoutButtonText: {
    ...TextStyles.bodySemibold,
    color: Colors.danger,
  },
  logoutHint: {
    ...TextStyles.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 32,
  },
});

