import axios from 'axios';
import { Platform, NativeModules } from 'react-native';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get BuildConfig values from native module (Android only)
const BuildConfigModule = NativeModules.BuildConfigModule;
const buildConfigApiUrl = BuildConfigModule?.getConstants?.()?.API_BASE_URL;
const buildConfigAiUrl = BuildConfigModule?.getConstants?.()?.AI_SERVICE_URL;

// For Android emulator:
// Option 1: Use 10.0.2.2 (default Android emulator host mapping)
// Option 2: Use ADB port forwarding (adb reverse tcp:3000 tcp:3000) and use localhost
// For iOS simulator, use localhost
// For physical device, update this to use your computer's IP address
// To find your IP: ifconfig | grep "inet " | grep -v 127.0.0.1 (macOS/Linux)
// Example: 'http://192.168.1.100:3000/v1'

// Try localhost first (works with ADB port forwarding: adb reverse tcp:3000 tcp:3000)
// If that doesn't work, try 10.0.2.2 (standard Android emulator host)
// IMPORTANT: Choose the correct option based on your setup:
// - Android Emulator: Use 'http://10.0.2.2:3000/v1'
// - Physical Device: Use 'http://192.168.1.3:3000/v1' (your computer's IP)
// - iOS Simulator: Use 'http://localhost:3000/v1'
// - With ADB forwarding: Use 'http://localhost:3000/v1' (after running: adb reverse tcp:3000 tcp:3000)

// IMPORTANT: Choose based on your setup:
// - Android Emulator: Use 'http://10.0.2.2:3000/v1' (10.0.2.2 maps to host's localhost)
// - Physical Android Device: Use 'http://192.168.1.3:3000/v1' (your computer's IP)
// - iOS Simulator: Use 'http://localhost:3000/v1'
// - With ADB forwarding: Use 'http://localhost:3000/v1' (after: adb reverse tcp:3000 tcp:3000)

// Get API URLs from BuildConfig (Android) or use defaults
// BuildConfig values are set in android/app/build.gradle and can be overridden via gradle.properties
const API_BASE_URL = buildConfigApiUrl || (
  __DEV__
    ? (Platform.OS === 'android' 
        // ? 'http://192.168.1.3:3000/v1'  // Physical Device - your computer's IP address
        // ? 'http://10.0.2.2:3000/v1'  // Android Emulator - uncomment if using emulator
        ? 'http://192.168.1.3:3000/v1'  // ADB port forwarding - uncomment if using: adb reverse tcp:3000 tcp:3000
        : 'http://localhost:3000/v1')  // iOS Simulator
    : 'http://192.168.1.3:3000/v1'
);

// AI Service URL (separate microservice)
const AI_SERVICE_URL = buildConfigAiUrl || (
  __DEV__
    ? (Platform.OS === 'android'
        // ? 'http://192.168.1.3:3001/api' 
         ? 'http://192.168.1.3:3001/api'  // Physical Device
        : 'http://localhost:3001/api')  // iOS Simulator
    : 'http://192.168.1.3:3000/api'
);

// Log API configuration (only once to avoid spam)
if (__DEV__) {
  console.log('API Configuration:', {
    baseURL: API_BASE_URL,
    platform: Platform.OS,
    isDev: __DEV__,
  });
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials && credentials.password) {
        config.headers.Authorization = `Bearer ${credentials.password}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log detailed error information for debugging
    if (error.request) {
      console.error('API Request Error:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
        message: error.message,
        code: error.code,
      });
    }
    
    if (error.response) {
      console.error('API Response Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      console.error('Network Error - No response received:', {
        message: error.message,
        code: error.code,
        baseURL: error.config?.baseURL,
      });
      
      // Provide helpful diagnostic information
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        const baseUrl = API_BASE_URL.replace('/v1', '');
        console.error('Network connectivity troubleshooting:');
        console.error('1. Ensure backend server is running: cd backend && npm run dev');
        console.error('2. Verify IP address matches your computer:', API_BASE_URL);
        console.error('3. Check device is on the same WiFi network');
        console.error('4. Try testing from terminal: curl ' + baseUrl + '/health');
        console.error('5. If using Android Emulator, change API_BASE_URL to: http://10.0.2.2:3000/v1');
        console.error('6. If using physical device, ensure firewall allows port 3000');
        console.error('7. REBUILD the app after network_security_config.xml changes:');
        console.error('   cd mobile/android && ./gradlew clean && cd ../.. && npx react-native run-android');
        console.error('8. Alternative: Use ADB port forwarding:');
        console.error('   adb reverse tcp:3000 tcp:3000');
        console.error('   Then change API_BASE_URL to: http://localhost:3000/v1');
      }
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage and redirect to login
      try {
        await Keychain.resetGenericPassword();
        await AsyncStorage.removeItem('user_data');
      } catch (clearError) {
        console.error('Error clearing auth data:', clearError);
      }
    }
    return Promise.reject(error);
  }
);

// AI Service API instance (separate from main API)
export const aiApi = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 60000, // Longer timeout for AI processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor to AI API
aiApi.interceptors.request.use(
  async (config) => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials && credentials.password) {
        config.headers.Authorization = `Bearer ${credentials.password}`;
      }
    } catch (error) {
      console.error('Error getting auth token for AI service:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for AI API error handling
aiApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log detailed error information for debugging
    if (error.request) {
      console.error('AI Service Request Error:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
        message: error.message,
        code: error.code,
      });
    }
    
    if (error.response) {
      console.error('AI Service Response Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      console.error('AI Service Network Error - No response received:', {
        message: error.message,
        code: error.code,
        baseURL: error.config?.baseURL,
        url: AI_SERVICE_URL,
      });
      
      // Provide helpful diagnostic information
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        console.error('AI Service connectivity troubleshooting:');
        console.error('1. Ensure AI service is running: cd ai-service && npm run dev');
        console.error('2. Verify IP address matches your computer:', AI_SERVICE_URL);
        console.error('3. Check device is on the same WiFi network');
        console.error('4. Try testing from terminal: curl ' + AI_SERVICE_URL.replace('/api', '') + '/health');
        console.error('5. If using Android Emulator, change AI_SERVICE_URL to: http://10.0.2.2:3001/api');
        console.error('6. If using physical device, ensure firewall allows port 3001');
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
export { AI_SERVICE_URL };

