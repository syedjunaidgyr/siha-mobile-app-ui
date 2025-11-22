import axios from 'axios';
import { Platform, NativeModules } from 'react-native';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get BuildConfig values from native module (Android only)
let buildConfigApiUrl: string | undefined;
let buildConfigAiUrl: string | undefined;

try {
  const BuildConfigModule = NativeModules.BuildConfigModule;
  if (BuildConfigModule?.getConstants) {
    const constants = BuildConfigModule.getConstants();
    buildConfigApiUrl = constants?.API_BASE_URL;
    buildConfigAiUrl = constants?.AI_SERVICE_URL;
  }
} catch (error) {
  console.warn('BuildConfigModule not available:', error);
  // Continue with default values
}

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
// - Physical Device: Use 'http://192.168.0.101:4000/v1' (your computer's IP)
// - iOS Simulator: Use 'http://localhost:3000/v1'
// - With ADB forwarding: Use 'http://localhost:3000/v1' (after running: adb reverse tcp:3000 tcp:3000)

// IMPORTANT: Choose based on your setup:
// - Android Emulator: Use 'http://10.0.2.2:3000/v1' (10.0.2.2 maps to host's localhost)
// - Physical Android Device: Use 'http://192.168.0.101:4000/v1' (your computer's IP)
// - iOS Simulator: Use 'http://localhost:3000/v1'
// - With ADB forwarding: Use 'http://localhost:3000/v1' (after: adb reverse tcp:3000 tcp:3000)

// Get API URLs from BuildConfig (Android) or use defaults
// BuildConfig values are set in android/app/build.gradle and can be overridden via gradle.properties
// In development mode, we prioritize __DEV__ logic over BuildConfig for flexibility
const DEFAULT_BACKEND_HOST = 'http://192.168.0.101';

// Helper: Determine the correct API URL based on platform and environment
// Using AWS server at 192.168.0.101 for all platforms
const getApiBaseUrl = () => {
  if (!__DEV__) {
    return buildConfigApiUrl || `${DEFAULT_BACKEND_HOST}:4000/v1`;
  }
  
  // In development, use AWS server for all platforms
  // AWS server is accessible from both emulator and physical devices
  return `${DEFAULT_BACKEND_HOST}:4000/v1`;
};

const API_BASE_URL = getApiBaseUrl();

// Helper: Determine the correct AI Service URL
// Using AWS server at 192.168.0.101 for all platforms
const getAiServiceUrl = () => {
  if (!__DEV__) {
    return buildConfigAiUrl || `${DEFAULT_BACKEND_HOST}:3001/api`;
  }
  
  // In development, use AWS server for all platforms
  // AWS server is accessible from both emulator and physical devices
  return `${DEFAULT_BACKEND_HOST}:3001/api`;
};

const AI_SERVICE_URL = getAiServiceUrl();

// Log API configuration (only once to avoid spam)
if (__DEV__) {
  console.log('API Configuration:', {
    baseURL: API_BASE_URL,
    aiServiceURL: AI_SERVICE_URL,
    platform: Platform.OS,
    isDev: __DEV__,
    buildConfigApiUrl: buildConfigApiUrl || 'not set',
    server: 'AWS (192.168.0.101)',
    note: 'Using AWS server. Ensure server is running and security groups allow connections.',
  });
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for regular requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate axios instance for video analysis with longer timeout (large payloads)
export const videoApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for video analysis (large payloads)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor to videoApi as well
videoApi.interceptors.request.use(
  async (config) => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials && credentials.password) {
        config.headers.Authorization = `Bearer ${credentials.password}`;
      }
    } catch (error) {
      console.error('Error getting auth token for video API:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for videoApi with better error handling
videoApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.request) {
      console.error('Video API Request Error:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
        message: error.message,
        code: error.code,
      });
    }
    
    if (error.response) {
      console.error('Video API Response Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      console.error('Video API Network Error:', {
        message: error.message,
        code: error.code,
        baseURL: error.config?.baseURL,
      });
      
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        const baseUrl = API_BASE_URL.replace('/v1', '');
        const port = baseUrl.split(':').pop() || '4000';
        const serverIp = baseUrl.replace('http://', '').split(':')[0];
        
        console.error('Video Analysis - Network connectivity troubleshooting:');
        console.error('Large payload may be timing out. Check:');
        console.error('1. AWS Security Group allows port ' + port);
        console.error('2. Server is running and accessible');
        console.error('3. Network connection is stable');
        console.error('4. Try reducing number of frames if issue persists');
      }
    }
    
    return Promise.reject(error);
  }
);

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
        const port = baseUrl.split(':').pop() || '4000';
        const serverIp = baseUrl.replace('http://', '').split(':')[0];
        const isAwsServer = serverIp === '192.168.0.101';
        
        console.error('Network connectivity troubleshooting:');
        if (isAwsServer) {
          console.error('AWS Server Connection Issues:');
          console.error('1. Check AWS EC2 Security Group - ensure port ' + port + ' is open:');
          console.error('   - Go to EC2 → Security Groups → Your instance\'s security group');
          console.error('   - Add inbound rule: Type=Custom TCP, Port=' + port + ', Source=0.0.0.0/0');
          console.error('2. Verify server is running on AWS:');
          console.error('   - SSH into EC2: ssh -i your-key.pem ec2-user@' + serverIp);
          console.error('   - Check PM2: pm2 list');
          console.error('   - Check port: netstat -tuln | grep ' + port);
          console.error('3. Test from your computer: curl ' + baseUrl + '/health');
          console.error('4. Check AWS instance status in EC2 console');
          console.error('5. Verify network security config allows cleartext (already configured)');
        } else {
          console.error('1. Ensure backend server is running on port ' + port);
          console.error('2. Verify IP address matches your server:', API_BASE_URL);
          console.error('3. Test from terminal: curl ' + baseUrl + '/health');
          console.error('4. Check firewall allows port ' + port);
        }
        console.error('6. If issue persists, check device internet connectivity');
        console.error('7. Try: ping ' + serverIp + ' (from device terminal if available)');
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

