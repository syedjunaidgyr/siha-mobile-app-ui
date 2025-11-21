package com.yourcare;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import java.util.HashMap;
import java.util.Map;

public class BuildConfigModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "BuildConfigModule";

    public BuildConfigModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("API_BASE_URL", BuildConfig.API_BASE_URL);
        constants.put("AI_SERVICE_URL", BuildConfig.AI_SERVICE_URL);
        return constants;
    }

    @ReactMethod
    public void getApiBaseUrl(Promise promise) {
        try {
            promise.resolve(BuildConfig.API_BASE_URL);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get API base URL", e);
        }
    }

    @ReactMethod
    public void getAiServiceUrl(Promise promise) {
        try {
            promise.resolve(BuildConfig.AI_SERVICE_URL);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get AI service URL", e);
        }
    }
}

