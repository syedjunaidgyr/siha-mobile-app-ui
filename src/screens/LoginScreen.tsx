import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import { AuthService } from '../services/authService';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { FieldInput } from '../components/ui/FieldInput';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Card3D } from '../components/3D';
import { LoginIllustration } from '../components/illustrations/LoginIllustration';
import { Colors, TextStyles } from '../theme';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateToRegister: () => void;
}

export default function LoginScreen({
  onLoginSuccess,
  onNavigateToRegister,
}: LoginScreenProps) {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <StatusBar barStyle="dark-content" />
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
          {/* Header */}
          <View style={styles.header}>
            {navigation.canGoBack() && (
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <LoginIllustration />
            <Text style={styles.title}>Welcome back</Text>
          </View>

          {/* Card */}
          <Card3D depth={10} style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.form}>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputLabelContainer}>
                    <Mail size={16} color={Colors.textMuted} />
                    <Text style={styles.inputLabel}>Email Address</Text>
                  </View>
                  <FieldInput
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    containerStyle={styles.inputContainer}
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <View style={styles.inputLabelContainer}>
                    <Lock size={16} color={Colors.textMuted} />
                    <Text style={styles.inputLabel}>Password</Text>
                  </View>
                  <View style={styles.passwordContainer}>
                    <FieldInput
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      containerStyle={styles.inputContainer}
                      style={[styles.input, styles.passwordInput]}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color={Colors.textMuted} />
                      ) : (
                        <Eye size={20} color={Colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.forgotPassword}
                  onPress={() => Alert.alert('Info', 'Forgot password feature coming soon')}
                >
                  <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
                </TouchableOpacity>

                <PrimaryButton
                  label="Sign in"
                  onPress={handleLogin}
                  loading={loading}
                  style={styles.signInButton}
                />
              </View>
            </View>
          </Card3D>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={onNavigateToRegister} style={styles.footerButtonContainer}>
              <Text style={styles.footerButton}>Get Started</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  footerText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
  },
  footerButtonContainer: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  footerButton: {
    ...TextStyles.bodySemibold,
    color: Colors.white,
    fontSize: 14,
  },
  welcomeSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    ...TextStyles.h2,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    marginTop: 20,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 20,
  },
  form: {
    gap: 16,
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputLabel: {
    ...TextStyles.smallSemibold,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 0,
  },
  input: {
    fontSize: 15,
    paddingVertical: 12,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 12,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    ...TextStyles.smallMedium,
    color: Colors.accent,
    fontSize: 14,
  },
  signInButton: {
    marginTop: 8,
  },
});
