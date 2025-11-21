import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/authService';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { FieldInput } from '../components/ui/FieldInput';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors } from '../theme/colors';

interface RegisterScreenProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
}

export default function RegisterScreen({
  onRegisterSuccess,
  onNavigateToLogin,
}: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !mobile || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.register({ email, mobile, password });
      // Auto-login after registration - store token if returned
      if (result.token) {
        const { token, user } = result;
        await Keychain.setGenericPassword('auth_token', token);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));
      } else {
        // Fallback to login if token not in response
        await AuthService.login({ email, password });
      }
      onRegisterSuccess();
    } catch (error: any) {
      let errorMessage = 'Failed to create account';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please check if the backend is running on port 3000.';
      }
      console.error('Registration error details:', error);
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.illustrationBadge}>
          <Text style={styles.illustrationText}>Step 01 · Profile</Text>
        </View>
        <Text style={styles.title}>Let's craft your{"\n"}wellness profile</Text>
        <Text style={styles.subtitle}>Tell us how to reach you and keep your account safe.</Text>

        <View style={styles.formCard}>
          <FieldInput
            label="Email"
            placeholder="Email address"
          value={email}
          onChangeText={setEmail}
            autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
          <FieldInput
            label="Mobile number"
            placeholder="Phone number"
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
          <FieldInput
            label="Password"
            placeholder="Create password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
          <FieldInput
            label="Confirm password"
            placeholder="Repeat password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
        />

          <PrimaryButton
            label="Continue"
          onPress={handleRegister}
            loading={loading}
            style={{ marginTop: 4 }}
          />

          <TouchableOpacity onPress={onNavigateToLogin} style={styles.switchAuth}>
            <Text style={styles.switchAuthText}>
              Already onboard? <Text style={styles.linkAccent}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
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
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  illustrationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.input,
    marginBottom: 20,
  },
  illustrationText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchAuth: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchAuthText: {
    color: Colors.textSecondary,
  },
  linkAccent: {
    color: Colors.accent,
    fontWeight: '700',
  },
});

