/**
 * Sensor Service for Vital Signs Detection
 * Uses phone sensors to improve accuracy:
 * - Accelerometer/Gyroscope: Detect movement (filter out shaky frames)
 * - Proximity: Ensure phone is at correct distance
 * - Ambient Light: Adjust for lighting conditions
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

export interface SensorData {
  accelerometer?: {
    x: number;
    y: number;
    z: number;
    magnitude: number; // Total acceleration magnitude
  };
  gyroscope?: {
    x: number;
    y: number;
    z: number;
    magnitude: number; // Total rotation magnitude
  };
  proximity?: {
    distance: number; // 0 = close, 5 = far (cm)
    isNear: boolean;
  };
  ambientLight?: {
    illuminance: number; // lux
  };
  timestamp: number;
}

export interface SensorStatus {
  accelerometerAvailable: boolean;
  gyroscopeAvailable: boolean;
  proximityAvailable: boolean;
  ambientLightAvailable: boolean;
  isMonitoring: boolean;
}

class SensorService {
  private static instance: SensorService;
  private accelerometerData: SensorData['accelerometer'] | null = null;
  private gyroscopeData: SensorData['gyroscope'] | null = null;
  private proximityData: SensorData['proximity'] | null = null;
  private ambientLightData: SensorData['ambientLight'] | null = null;
  private isMonitoring = false;
  private listeners: ((data: SensorData) => void)[] = [];
  private updateInterval: NodeJS.Timeout | null = null;

  // Motion thresholds
  private readonly MAX_ACCELERATION = 2.0; // m/s² - threshold for "still"
  private readonly MAX_ROTATION = 0.5; // rad/s - threshold for "still"
  private readonly PROXIMITY_NEAR_THRESHOLD = 5; // cm - too close
  private readonly PROXIMITY_FAR_THRESHOLD = 30; // cm - too far
  private readonly MIN_LIGHT = 50; // lux - minimum for good quality

  private constructor() {}

  static getInstance(): SensorService {
    if (!SensorService.instance) {
      SensorService.instance = new SensorService();
    }
    return SensorService.instance;
  }

  /**
   * Check which sensors are available
   */
  async checkAvailability(): Promise<SensorStatus> {
    // For now, assume sensors are available
    // In production, you'd check actual hardware availability
    return {
      accelerometerAvailable: true,
      gyroscopeAvailable: true,
      proximityAvailable: Platform.OS === 'android' || Platform.OS === 'ios',
      ambientLightAvailable: Platform.OS === 'android',
      isMonitoring: this.isMonitoring,
    };
  }

  /**
   * Start monitoring sensors
   */
  async startMonitoring(updateInterval: number = 100): Promise<boolean> {
    if (this.isMonitoring) {
      return true;
    }

    try {
      // Start sensor monitoring
      // Note: This is a simplified implementation
      // In production, you'd use react-native-sensors or native modules
      
      this.isMonitoring = true;
      
      // Simulate sensor updates (replace with actual sensor implementation)
      this.updateInterval = setInterval(() => {
        this.updateSensorData();
      }, updateInterval);

      return true;
    } catch (error) {
      console.error('Error starting sensor monitoring:', error);
      this.isMonitoring = false;
      return false;
    }
  }

  /**
   * Stop monitoring sensors
   */
  stopMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Get current sensor data
   */
  getCurrentData(): SensorData {
    return {
      accelerometer: this.accelerometerData || undefined,
      gyroscope: this.gyroscopeData || undefined,
      proximity: this.proximityData || undefined,
      ambientLight: this.ambientLightData || undefined,
      timestamp: Date.now(),
    };
  }

  /**
   * Check if current conditions are good for vital signs detection
   */
  isGoodForVitalSigns(): {
    isGood: boolean;
    reasons: string[];
    score: number; // 0-100
  } {
    const reasons: string[] = [];
    let score = 100;

    // Check motion
    if (this.accelerometerData) {
      if (this.accelerometerData.magnitude > this.MAX_ACCELERATION) {
        reasons.push('Too much movement detected');
        score -= 30;
      }
    }

    if (this.gyroscopeData) {
      if (this.gyroscopeData.magnitude > this.MAX_ROTATION) {
        reasons.push('Phone is rotating');
        score -= 20;
      }
    }

    // Check proximity
    if (this.proximityData) {
      if (this.proximityData.isNear) {
        reasons.push('Phone too close to face');
        score -= 25;
      } else if (this.proximityData.distance > this.PROXIMITY_FAR_THRESHOLD) {
        reasons.push('Phone too far from face');
        score -= 25;
      }
    }

    // Check lighting
    if (this.ambientLightData) {
      if (this.ambientLightData.illuminance < this.MIN_LIGHT) {
        reasons.push('Lighting too dim');
        score -= 20;
      }
    }

    return {
      isGood: score >= 70,
      reasons,
      score: Math.max(0, score),
    };
  }

  /**
   * Add listener for sensor updates
   */
  addListener(callback: (data: SensorData) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Update sensor data (simulated - replace with actual sensor readings)
   */
  private updateSensorData(): void {
    // TODO: Replace with actual sensor readings
    // For now, simulate stable readings (good conditions)
    this.accelerometerData = {
      x: 0.1 + Math.random() * 0.2 - 0.1,
      y: 0.1 + Math.random() * 0.2 - 0.1,
      z: 9.8 + Math.random() * 0.2 - 0.1, // Gravity
      magnitude: Math.sqrt(0.1 ** 2 + 0.1 ** 2 + 9.8 ** 2),
    };

    this.gyroscopeData = {
      x: Math.random() * 0.1 - 0.05,
      y: Math.random() * 0.1 - 0.05,
      z: Math.random() * 0.1 - 0.05,
      magnitude: Math.random() * 0.1,
    };

    this.proximityData = {
      distance: 20 + Math.random() * 5, // 20-25 cm (good range)
      isNear: false,
    };

    this.ambientLightData = {
      illuminance: 200 + Math.random() * 100, // 200-300 lux (good lighting)
    };

    const data = this.getCurrentData();
    this.listeners.forEach((listener) => listener(data));
  }
}

export default SensorService.getInstance();

