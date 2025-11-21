import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { AuthService } from '../services/authService';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { FieldInput } from '../components/ui/FieldInput';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Colors } from '../theme/colors';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateToRegister: () => void;
}

export default function LoginScreen({
  onLoginSuccess,
  onNavigateToRegister,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await AuthService.login({ email, password });
      onLoginSuccess();
    } catch (error: any) {
      let errorMessage = 'Invalid credentials';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please check if the backend is running on port 3000.';
      }
      console.error('Login error details:', error);
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
    <View style={styles.container}>
        <View style={styles.heroBadge}>
          <Text style={styles.badgeText}>Welcome back</Text>
        </View>
        <Text style={styles.title}>Start your fitness{"\n"}journey</Text>
        <Text style={styles.subtitle}>Log in to sync your habits, vitals and care plan.</Text>

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
            label="Password"
            placeholder="Enter password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

          <PrimaryButton
            label="Sign In"
        onPress={handleLogin}
            loading={loading}
            style={{ marginTop: 4 }}
          />

          <TouchableOpacity style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Forgot password?</Text>
      </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onNavigateToRegister} style={styles.bottomLink}>
          <Text style={styles.bottomLinkText}>
            New here? <Text style={styles.linkAccent}>Create account</Text>
        </Text>
      </TouchableOpacity>
    </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.input,
    marginBottom: 20,
  },
  badgeText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 36,
    color: Colors.textPrimary,
    fontWeight: '800',
    marginBottom: 8,
    lineHeight: 40,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
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
  secondaryAction: {
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryActionText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  bottomLink: {
    marginTop: 32,
    alignItems: 'center',
  },
  bottomLinkText: {
    color: Colors.textSecondary,
  },
  linkAccent: {
    color: Colors.accent,
    fontWeight: '700',
  },
});

