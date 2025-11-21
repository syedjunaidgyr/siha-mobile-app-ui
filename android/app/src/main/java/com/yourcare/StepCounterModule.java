package com.yourcare;

import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.content.Context;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class StepCounterModule extends ReactContextBaseJavaModule implements SensorEventListener {
    private static final String MODULE_NAME = "StepCounterModule";
    private ReactApplicationContext reactContext;
    private SensorManager sensorManager;
    private Sensor stepCounterSensor;
    private int stepCount = 0;
    private int initialStepCount = -1;
    private int lastSavedStepCount = 0;
    private long lastSaveTime = 0;
    private int lastReportedStepCount = 0;
    private long lastEventTime = 0;
    private int lastProcessedSensorValue = -1;
    private static final String PREFS_NAME = "StepCounterPrefs";
    private static final String KEY_LAST_STEP_COUNT = "last_step_count";
    private static final String KEY_LAST_RESET_DATE = "last_reset_date";
    private static final long MIN_EVENT_INTERVAL_MS = 500;
    private static final long SAVE_INTERVAL_MS = 10000;

    public StepCounterModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.sensorManager = (SensorManager) reactContext.getSystemService(Context.SENSOR_SERVICE);
        
        if (sensorManager != null) {
            this.stepCounterSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        }
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void isAvailable(Promise promise) {
        boolean available = (stepCounterSensor != null);
        promise.resolve(available);
    }

    @ReactMethod
    public void startStepCounter(Promise promise) {
        if (stepCounterSensor == null) {
            promise.reject("SENSOR_NOT_AVAILABLE", "Step counter sensor is not available on this device");
            return;
        }

        try {
            // Always unregister first to prevent double registration
            sensorManager.unregisterListener(this);
            
            // Load saved state
            android.content.SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String lastResetDate = prefs.getString(KEY_LAST_RESET_DATE, "");
            long today = System.currentTimeMillis() / (1000 * 60 * 60 * 24);
            
            // Reset if it's a new day
            if (!lastResetDate.equals(String.valueOf(today))) {
                prefs.edit()
                    .putString(KEY_LAST_RESET_DATE, String.valueOf(today))
                    .putInt(KEY_LAST_STEP_COUNT, 0)
                    .remove("initial_step_count_today")
                    .remove("last_boot_step_count")
                    .apply();
                lastSavedStepCount = 0;
                stepCount = 0;
                initialStepCount = -1;
                lastProcessedSensorValue = -1;
            } else {
                lastSavedStepCount = prefs.getInt(KEY_LAST_STEP_COUNT, 0);
                stepCount = lastSavedStepCount;
                initialStepCount = -1;
                lastProcessedSensorValue = -1;
            }
            
            // Register sensor listener
            boolean registered = sensorManager.registerListener(
                this, 
                stepCounterSensor, 
                SensorManager.SENSOR_DELAY_UI
            );
            
            if (registered) {
                lastSaveTime = System.currentTimeMillis();
                promise.resolve(true);
            } else {
                promise.reject("REGISTRATION_FAILED", "Failed to register step counter sensor listener");
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Error starting step counter: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopStepCounter(Promise promise) {
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        promise.resolve(true);
    }

    @ReactMethod
    public void getStepCount(Promise promise) {
        WritableMap result = Arguments.createMap();
        result.putInt("steps", stepCount);
        result.putBoolean("available", stepCounterSensor != null);
        promise.resolve(result);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) {
            return;
        }

        int currentTotalSteps = (int) event.values[0];
        android.content.SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long currentTime = System.currentTimeMillis();
        long today = currentTime / (1000 * 60 * 60 * 24);
        
        // Check if it's a new day
        String lastResetDate = prefs.getString(KEY_LAST_RESET_DATE, "");
        boolean isNewDay = !lastResetDate.equals(String.valueOf(today));
        
        if (isNewDay) {
            // New day - reset everything
            prefs.edit()
                .putString(KEY_LAST_RESET_DATE, String.valueOf(today))
                .putInt(KEY_LAST_STEP_COUNT, 0)
                .putInt("last_boot_step_count", currentTotalSteps)
                .putInt("initial_step_count_today", currentTotalSteps)
                .apply();
            
            initialStepCount = currentTotalSteps;
            lastSavedStepCount = 0;
            stepCount = 0;
            lastProcessedSensorValue = currentTotalSteps;
            lastSaveTime = currentTime;
        } else {
            // Same day logic
            int lastBootStepCount = prefs.getInt("last_boot_step_count", -1);
            int initialStepCountToday = prefs.getInt("initial_step_count_today", -1);
            
            // Handle device reboot (sensor value decreased)
            if (lastBootStepCount != -1 && currentTotalSteps < lastBootStepCount) {
                stepCount = lastSavedStepCount;
                initialStepCount = currentTotalSteps;
                lastProcessedSensorValue = currentTotalSteps;
                prefs.edit()
                    .putInt("last_boot_step_count", currentTotalSteps)
                    .putInt("initial_step_count_today", currentTotalSteps)
                    .apply();
            }
            // First reading of the day
            else if (initialStepCountToday == -1) {
                initialStepCountToday = currentTotalSteps;
                initialStepCount = currentTotalSteps;
                stepCount = lastSavedStepCount;
                lastProcessedSensorValue = currentTotalSteps;
                prefs.edit()
                    .putInt("initial_step_count_today", currentTotalSteps)
                    .putInt("last_boot_step_count", currentTotalSteps)
                    .apply();
            }
            // App restarted but same day
            else if (initialStepCount == -1) {
                initialStepCount = initialStepCountToday;
                
                // Calculate steps taken while app was closed
                if (lastBootStepCount == -1) {
                    lastBootStepCount = initialStepCountToday;
                }
                
                int stepsWhileClosed = currentTotalSteps - lastBootStepCount;
                
                if (stepsWhileClosed < 0) {
                    // Device rebooted
                    stepCount = lastSavedStepCount;
                    lastProcessedSensorValue = currentTotalSteps;
                    prefs.edit()
                        .putInt("last_boot_step_count", currentTotalSteps)
                        .apply();
                } else {
                    // Add steps taken while app was closed
                    stepCount = lastSavedStepCount + stepsWhileClosed;
                    lastProcessedSensorValue = currentTotalSteps;
                    prefs.edit()
                        .putInt("last_boot_step_count", currentTotalSteps)
                        .apply();
                }
            }
            // Normal operation - calculate incremental steps
            else {
                if (lastProcessedSensorValue == -1) {
                    lastProcessedSensorValue = prefs.getInt("last_boot_step_count", initialStepCountToday);
                }
                
                int incrementalSteps = currentTotalSteps - lastProcessedSensorValue;
                
                if (incrementalSteps > 0) {
                    stepCount += incrementalSteps;
                    lastProcessedSensorValue = currentTotalSteps;
                    
                    // Cap at reasonable limit
                    if (stepCount > 100000) {
                        stepCount = 100000;
                    }
                } else if (incrementalSteps < 0) {
                    // Sensor reset - don't change count
                    lastProcessedSensorValue = currentTotalSteps;
                }
            }
            
            // Save periodically
            if (currentTime - lastSaveTime >= SAVE_INTERVAL_MS) {
                prefs.edit()
                    .putInt(KEY_LAST_STEP_COUNT, stepCount)
                    .putInt("last_boot_step_count", currentTotalSteps)
                    .apply();
                lastSavedStepCount = stepCount;
                lastSaveTime = currentTime;
            }
        }

        // Send event to JavaScript
        if (stepCount != lastReportedStepCount && 
            (currentTime - lastEventTime) >= MIN_EVENT_INTERVAL_MS) {
            sendStepCountEvent(stepCount);
            lastReportedStepCount = stepCount;
            lastEventTime = currentTime;
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // Not used
    }

    private void sendStepCountEvent(int steps) {
        WritableMap params = Arguments.createMap();
        params.putInt("steps", steps);
        
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("stepCountChanged", params);
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
    }
}