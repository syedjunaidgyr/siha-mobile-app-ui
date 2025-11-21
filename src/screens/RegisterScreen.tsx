import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Eye, EyeOff, Mail, User, Phone, Lock } from 'lucide-react-native';
import { AuthService } from '../services/authService';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { FieldInput } from '../components/ui/FieldInput';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Card3D } from '../components/3D';
import { RegisterIllustration } from '../components/illustrations/RegisterIllustration';
import { Colors, TextStyles } from '../theme';

interface RegisterScreenProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
}

export default function RegisterScreen({
  onRegisterSuccess,
  onNavigateToLogin,
}: RegisterScreenProps) {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (pwd: string): { strength: string; color: string } => {
    if (pwd.length === 0) return { strength: '', color: Colors.textMuted };
    if (pwd.length < 6) return { strength: 'Weak', color: Colors.danger };
    if (pwd.length < 8) return { strength: 'Medium', color: Colors.info };
    if (pwd.length < 12) return { strength: 'Good', color: Colors.success };
    return { strength: 'Strong', color: Colors.success };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleRegister = async () => {
    if (!email || !mobile || !password || !name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.register({ email, mobile, password, name });
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
            <RegisterIllustration />
            <Text style={styles.title}>Get started</Text>
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
                    <User size={16} color={Colors.textMuted} />
                    <Text style={styles.inputLabel}>Your name</Text>
                  </View>
                  <FieldInput
                    placeholder="Enter your full name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    containerStyle={styles.inputContainer}
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <View style={styles.inputLabelContainer}>
                    <Phone size={16} color={Colors.textMuted} />
                    <Text style={styles.inputLabel}>Mobile Number</Text>
                  </View>
                  <FieldInput
                    placeholder="+1 234 567 8900"
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                    autoComplete="tel"
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
                      placeholder="Create a strong password"
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
                  {password.length > 0 && (
                    <View style={styles.passwordStrengthContainer}>
                      <View style={styles.passwordStrengthBarWrapper}>
                        <View 
                          style={[
                            styles.passwordStrengthBar, 
                            { 
                              backgroundColor: passwordStrength.color, 
                              width: `${Math.min((password.length / 12) * 100, 100)}%` 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                        {passwordStrength.strength}
                      </Text>
                    </View>
                  )}
                </View>

                <PrimaryButton
                  label="Sign up"
                  onPress={handleRegister}
                  loading={loading}
                  style={styles.signUpButton}
                />
              </View>
            </View>
          </Card3D>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={onNavigateToLogin} style={styles.footerButtonContainer}>
              <Text style={styles.footerButton}>Sign in</Text>
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
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  passwordStrengthBarWrapper: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  passwordStrengthBar: {
    height: 4,
    borderRadius: 2,
  },
  passwordStrengthText: {
    ...TextStyles.smallSemibold,
    fontSize: 12,
    minWidth: 50,
    textAlign: 'right',
  },
  signUpButton: {
    marginTop: 8,
  },
});
