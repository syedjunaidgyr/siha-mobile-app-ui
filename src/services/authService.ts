import api from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  mobile: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  mobile: string;
  abha_id?: string;
  abha_number?: string;
}

export class AuthService {
  static async register(data: RegisterData) {
    try {
      console.log('Registering user with:', { email: data.email, mobile: data.mobile });
      const response = await api.post('/auth/register', data);
      console.log('Registration successful');
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  static async login(credentials: LoginCredentials) {
    try {
      console.log('Logging in with email:', credentials.email);
      const response = await api.post('/auth/login', credentials);
      const { token, user } = response.data;
      
      // Store token securely in keychain and user data in AsyncStorage
      await Keychain.setGenericPassword('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      
      console.log('Login successful');
      return { token, user };
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async logout() {
    await Keychain.resetGenericPassword();
    await AsyncStorage.removeItem('user_data');
  }

  static async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    try {
      const credentials = await Keychain.getGenericPassword();
      return !!credentials && !!credentials.password;
    } catch (error) {
      return false;
    }
  }

  static async linkABHA(abhaId: string, abhaNumber: string) {
    const response = await api.post('/auth/link-abha', {
      abha_id: abhaId,
      abha_number: abhaNumber,
    });
    return response.data;
  }
}

