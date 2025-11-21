import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// Safely get the native module
let StepCounterModule: any = null;
try {
  StepCounterModule = NativeModules.StepCounterModule;
} catch (error) {
  console.warn('StepCounterModule not available:', error);
}

interface StepCounterModuleInterface {
  isAvailable(): Promise<boolean>;
  startStepCounter(): Promise<boolean>;
  stopStepCounter(): Promise<boolean>;
  getStepCount(): Promise<{ steps: number; available: boolean }>;
}

class NativeStepCounter {
  private module: StepCounterModuleInterface | null = null;
  private eventEmitter: NativeEventEmitter | null = null;
  private eventSubscription: any = null; // Store subscription to prevent garbage collection
  private stepCount = 0;
  private listeners: ((steps: number) => void)[] = [];
  private initialized = false;

  constructor() {
    // Don't initialize in constructor - wait until first use
  }

  private initialize() {
    if (this.initialized) return;
    
    try {
      if (Platform.OS === 'android' && StepCounterModule) {
        this.module = StepCounterModule as StepCounterModuleInterface;
        this.eventEmitter = new NativeEventEmitter(StepCounterModule);
        
        // Remove existing subscription if any
        if (this.eventSubscription) {
          this.eventSubscription.remove();
        }
        
        // Listen for step count changes and store subscription
        this.eventSubscription = this.eventEmitter.addListener('stepCountChanged', (data: { steps: number }) => {
          const newStepCount = data.steps || 0;
          if (newStepCount !== this.stepCount) {
            this.stepCount = newStepCount;
            // Notify all registered listeners
            this.listeners.forEach(listener => {
              try {
                listener(this.stepCount);
              } catch (error) {
                console.error('[NativeStepCounter] Error in listener callback:', error);
              }
            });
          }
        });
        
        this.initialized = true;
      }
    } catch (error) {
      console.warn('Error initializing native step counter:', error);
      this.module = null;
      this.eventEmitter = null;
    }
  }

  async isAvailable(): Promise<boolean> {
    this.initialize();
    if (!this.module) return false;
    try {
      return await this.module.isAvailable();
    } catch (error) {
      console.warn('Error checking step counter availability:', error);
      return false;
    }
  }

  async start(): Promise<boolean> {
    this.initialize();
    if (!this.module) return false;
    try {
      return await this.module.startStepCounter();
    } catch (error) {
      console.warn('Error starting step counter:', error);
      return false;
    }
  }

  async stop(): Promise<boolean> {
    if (!this.module) return false;
    try {
      return await this.module.stopStepCounter();
    } catch (error) {
      console.warn('Error stopping step counter:', error);
      return false;
    }
  }

  async getSteps(): Promise<number> {
    this.initialize();
    if (!this.module) return 0;
    try {
      const result = await this.module.getStepCount();
      this.stepCount = result?.steps || 0;
      return this.stepCount;
    } catch (error) {
      console.warn('Error getting step count:', error);
      return 0;
    }
  }

  getCurrentSteps(): number {
    return this.stepCount;
  }

  addListener(callback: (steps: number) => void) {
    // Ensure event emitter is initialized before adding listener
    this.initialize();
    
    this.listeners.push(callback);
    
    // Immediately notify with current step count if available
    if (this.stepCount > 0) {
      callback(this.stepCount);
    }
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  removeAllListeners() {
    this.listeners = [];
    if (this.eventSubscription) {
      this.eventSubscription.remove();
      this.eventSubscription = null;
    }
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('stepCountChanged');
    }
  }
}

export default new NativeStepCounter();

