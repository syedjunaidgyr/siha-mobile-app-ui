import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MetricService } from './metricService';
import { AuthService } from './authService';
import NativeStepCounter from './nativeStepCounter';

// Dynamic import for react-native-health
let AppleHealthKit: any = null;
try {
  AppleHealthKit = require('react-native-health');
} catch (error) {
  console.warn('react-native-health not available:', error);
}

const STEPS_STORAGE_KEY = 'today_steps_count';
const LAST_SYNC_KEY = 'last_steps_sync';
const LAST_SYNCED_STEPS_KEY = 'last_synced_step_count';
const LAST_RESET_DATE_KEY = 'last_reset_date';

export class StepCounterService {
  private static isInitialized = false;
  private static stepCount = 0;
  private static intervalId: NodeJS.Timeout | null = null;
  private static stepListeners: ((steps: number) => void)[] = [];
  private static nativeListenerCleanup: (() => void) | null = null;

  /**
   * Initialize step counting service
   */
  static async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Check and reset for new day FIRST
      await this.checkAndResetForNewDay();

      if (Platform.OS === 'ios') {
        return await this.initializeIOS();
      } else if (Platform.OS === 'android') {
        return await this.initializeAndroid();
      }
      return false;
    } catch (error) {
      console.error('[StepCounter] Error initializing:', error);
      return false;
    }
  }

  /**
   * Check if it's a new day and reset step count if needed
   */
  private static async checkAndResetForNewDay(): Promise<void> {
    try {
      const today = this.getTodayDateString();
      const lastResetDate = await AsyncStorage.getItem(LAST_RESET_DATE_KEY);

      if (lastResetDate !== today) {
        console.log('[StepCounter] New day detected, resetting step count');
        this.stepCount = 0;
        await AsyncStorage.multiSet([
          [STEPS_STORAGE_KEY, '0'],
          [LAST_RESET_DATE_KEY, today],
          [LAST_SYNCED_STEPS_KEY, '0'],
        ]);
      }
    } catch (error) {
      console.error('[StepCounter] Error checking/resetting for new day:', error);
    }
  }

  /**
   * Get today's date as a string (YYYY-MM-DD)
   */
  private static getTodayDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Initialize for iOS using HealthKit
   */
  private static async initializeIOS(): Promise<boolean> {
    if (!AppleHealthKit) {
      console.warn('[StepCounter] HealthKit not available, using fallback');
      this.isInitialized = true;
      this.startStepTracking();
      return true;
    }

    try {
      const permissions = {
        permissions: {
          read: [AppleHealthKit.Constants.Permissions.Steps],
          write: [],
        },
      };

      return new Promise((resolve) => {
        AppleHealthKit.initHealthKit(permissions, (error: string) => {
          if (error) {
            console.error('[StepCounter] HealthKit initialization error:', error);
          }
          this.isInitialized = true;
          this.startStepTracking();
          resolve(true);
        });
      });
    } catch (error) {
      console.error('[StepCounter] Error initializing HealthKit:', error);
      this.isInitialized = true;
      this.startStepTracking();
      return true;
    }
  }

  /**
   * Initialize for Android using native Step Counter sensor
   */
  private static async initializeAndroid(): Promise<boolean> {
    try {
      // Request permissions
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('[StepCounter] Permission not granted');
        return false;
      }

      // Check if native sensor is available
      const isAvailable = await NativeStepCounter.isAvailable();
      if (!isAvailable) {
        console.warn('[StepCounter] Native step counter not available');
        this.isInitialized = true;
        this.startStepTracking();
        return true;
      }

      // Stop any existing tracking
      try {
        await NativeStepCounter.stop();
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.warn('[StepCounter] Error stopping existing tracking:', error);
      }

      // Load saved step count
      await this.loadSavedSteps();

      // Start native step counter
      const started = await NativeStepCounter.start();
      if (!started) {
        console.warn('[StepCounter] Failed to start native step counter');
        this.isInitialized = true;
        this.startStepTracking();
        return true;
      }

      // Set up real-time listener for step updates
      this.setupNativeStepListener();

      this.isInitialized = true;
      this.startStepTracking();
      return true;
    } catch (error) {
      console.error('[StepCounter] Android initialization error:', error);
      this.isInitialized = true;
      this.startStepTracking();
      return true;
    }
  }

  /**
   * Set up listener for native step counter events
   */
  private static setupNativeStepListener(): void {
    // Remove any existing listener first
    if (this.nativeListenerCleanup) {
      this.nativeListenerCleanup();
      this.nativeListenerCleanup = null;
    }

    let lastReceivedSteps = -1;
    
    this.nativeListenerCleanup = NativeStepCounter.addListener((steps: number) => {
      // Validate step count
      if (steps < 0 || steps > 100000) {
        console.warn('[StepCounter] Invalid step count received:', steps);
        return;
      }

      // Ignore duplicate events
      if (steps === lastReceivedSteps) {
        return;
      }

      // Check for suspicious jumps (but be lenient for batched events)
      if (lastReceivedSteps > 0 && steps > lastReceivedSteps) {
        const increment = steps - lastReceivedSteps;
        if (increment > 500) {
          console.warn('[StepCounter] Very large step increment:', increment);
        }
      }

      lastReceivedSteps = steps;
      this.stepCount = steps;

      // Notify listeners immediately
      this.notifyStepListeners(steps);

      // Save to storage periodically (every 5 steps or every update if less than 5)
      if (steps % 5 === 0 || steps < 5) {
        AsyncStorage.setItem(STEPS_STORAGE_KEY, steps.toString()).catch(err => {
          console.error('[StepCounter] Error saving steps:', err);
        });
      }
    });
  }

  /**
   * Start tracking steps
   */
  private static startStepTracking(): void {
    // Load saved steps count
    this.loadSavedSteps();

    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    if (Platform.OS === 'android') {
      // Android: Real-time updates via listener, periodic sync and day check
      this.intervalId = setInterval(async () => {
        await this.checkAndResetForNewDay();
        await this.syncToBackendIfNeeded();
      }, 30000); // Every 30 seconds
    } else {
      // iOS: Periodic updates from HealthKit
      this.intervalId = setInterval(async () => {
        await this.checkAndResetForNewDay();
        await this.updateStepCount();
      }, 10000); // Every 10 seconds for better accuracy
    }

    // Initial update
    this.updateStepCount();
  }

  /**
   * Update step count from device sensors
   */
  private static async updateStepCount(): Promise<void> {
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      if (Platform.OS === 'ios') {
        await this.getIOSSteps(startOfDay, now);
      } else if (Platform.OS === 'android') {
        // For Android, use the listener value
        // Only query if we don't have a value yet
        if (this.stepCount === 0) {
          await this.getAndroidNativeSteps();
        }
      }

      // Validate step count
      this.stepCount = Math.max(0, Math.min(this.stepCount, 100000));

      // Notify listeners
      this.notifyStepListeners(this.stepCount);

      // Save to storage
      await AsyncStorage.setItem(STEPS_STORAGE_KEY, this.stepCount.toString());

      // Periodic backend sync
      await this.syncToBackendIfNeeded();
    } catch (error) {
      console.error('[StepCounter] Error updating step count:', error);
      await this.loadSavedSteps();
    }
  }

  /**
   * Get steps from iOS HealthKit
   */
  private static async getIOSSteps(startDate: Date, endDate: Date): Promise<void> {
    if (!AppleHealthKit) {
      await this.loadSavedSteps();
      return;
    }

    return new Promise((resolve) => {
      try {
        const options = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };

        AppleHealthKit.getStepCount(options, (err: string, results: any) => {
          if (err) {
            console.error('[StepCounter] Error getting iOS steps:', err);
            this.loadSavedSteps().then(() => resolve());
            return;
          }
          this.stepCount = Math.round(results.value || 0);
          resolve();
        });
      } catch (error) {
        console.error('[StepCounter] Error in getIOSSteps:', error);
        this.loadSavedSteps().then(() => resolve());
      }
    });
  }

  /**
   * Get steps from Android native sensor
   */
  private static async getAndroidNativeSteps(): Promise<void> {
    try {
      const nativeSteps = await NativeStepCounter.getSteps();
      if (nativeSteps >= 0) {
        this.stepCount = nativeSteps;
      } else {
        await this.loadSavedSteps();
      }
    } catch (error) {
      console.error('[StepCounter] Error getting Android native steps:', error);
      await this.loadSavedSteps();
    }
  }

  /**
   * Load saved steps from local storage
   */
  private static async loadSavedSteps(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(STEPS_STORAGE_KEY);
      if (saved) {
        this.stepCount = Math.max(0, parseInt(saved, 10));
      }
    } catch (error) {
      console.error('[StepCounter] Error loading saved steps:', error);
    }
  }

  /**
   * Get current step count
   */
  static async getCurrentSteps(): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // For iOS, force an update
    if (Platform.OS === 'ios') {
      await this.updateStepCount();
    }
    
    // For Android, the listener keeps stepCount up to date
    return Math.max(0, this.stepCount);
  }

  /**
   * Get cached step count (fast, may be slightly outdated)
   */
  static getCachedSteps(): number {
    return Math.max(0, this.stepCount);
  }

  /**
   * Sync steps to backend if needed
   */
  private static async syncToBackendIfNeeded(): Promise<void> {
    try {
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Only sync if more than 5 minutes since last sync
      if (lastSync && new Date(lastSync) > fiveMinutesAgo) {
        return;
      }

      const user = await AuthService.getStoredUser();
      if (!user || this.stepCount <= 0) {
        return;
      }

      // Check if we've already synced this count
      const lastSyncedSteps = await AsyncStorage.getItem(LAST_SYNCED_STEPS_KEY);
      if (lastSyncedSteps && parseInt(lastSyncedSteps, 10) === this.stepCount) {
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Sync to backend
      await MetricService.syncHealthKit(
        [
          {
            metric_type: 'steps',
            value: this.stepCount,
            unit: 'count',
            start_time: today.toISOString(),
            end_time: new Date().toISOString(),
            source: Platform.OS === 'ios' ? 'healthkit_device' : 'health_connect_device',
          },
        ],
        undefined
      );

      await AsyncStorage.multiSet([
        [LAST_SYNC_KEY, now.toISOString()],
        [LAST_SYNCED_STEPS_KEY, this.stepCount.toString()],
      ]);

      console.log('[StepCounter] Synced to backend:', this.stepCount);
    } catch (error: any) {
      if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNREFUSED') {
        console.error('[StepCounter] Error syncing to backend:', error);
      }
    }
  }

  /**
   * Manually sync to backend
   */
  static async syncToBackend(): Promise<void> {
    // Force sync by clearing last sync time
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    await this.syncToBackendIfNeeded();
  }

  /**
   * Stop tracking steps
   */
  static stopTracking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (Platform.OS === 'android') {
      if (this.nativeListenerCleanup) {
        this.nativeListenerCleanup();
        this.nativeListenerCleanup = null;
      }
      NativeStepCounter.stop().catch(error => {
        console.error('[StepCounter] Error stopping native counter:', error);
      });
    }

    this.stepListeners = [];
    this.isInitialized = false;
  }

  /**
   * Notify all step listeners
   */
  private static notifyStepListeners(steps: number): void {
    this.stepListeners.forEach(listener => {
      try {
        listener(steps);
      } catch (error) {
        console.error('[StepCounter] Error in listener:', error);
      }
    });
  }

  /**
   * Add a listener for step count updates
   */
  static addStepListener(callback: (steps: number) => void): () => void {
    this.stepListeners.push(callback);

    // Immediately notify with current count
    if (this.stepCount > 0) {
      callback(this.stepCount);
    }

    // Return unsubscribe function
    return () => {
      this.stepListeners = this.stepListeners.filter(l => l !== callback);
    };
  }
}