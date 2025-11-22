# Fixing Network Errors in Release APK

## Problem
When building a release APK, the app tries to connect to the production API URL (`https://api.yourcare.com/v1`) which may not be available, causing network errors.

## Solution

### Option 1: Use Development Server (Quick Fix for Testing)

1. **Find your computer's IP address:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```

2. **Edit `android/gradle.properties`:**
   ```properties
   # Uncomment and update these lines with your IP address
   API_BASE_URL=http://YOUR_IP_ADDRESS:3000/v1
   AI_SERVICE_URL=http://YOUR_IP_ADDRESS:3001/api
   ```
   
   Example:
   ```properties
   API_BASE_URL=http://192.168.0.101:4000/v1
   AI_SERVICE_URL=http://192.168.0.101:3001/api
   ```

3. **Make sure your backend server is running:**
   ```bash
   cd backend
   npm run dev
   ```

4. **Rebuild the APK:**
   ```bash
   cd mobile
   npm run build:android
   ```

5. **Ensure your device and computer are on the same WiFi network**

### Option 2: Set Up Production API Server

If you have a production API server:

1. Update the production URLs in `android/app/build.gradle`:
   ```gradle
   def apiBaseUrl = project.findProperty('API_BASE_URL') ?: 'https://your-production-api.com/v1'
   def aiServiceUrl = project.findProperty('AI_SERVICE_URL') ?: 'https://your-production-ai.com/api'
   ```

2. Ensure your production server has valid SSL certificates (for HTTPS)

3. Rebuild the APK

### Option 3: Use ADB Port Forwarding (For Physical Device Testing)

1. **Connect your device via USB**

2. **Forward ports:**
   ```bash
   adb reverse tcp:3000 tcp:3000
   adb reverse tcp:3001 tcp:3001
   ```

3. **Edit `android/gradle.properties`:**
   ```properties
   API_BASE_URL=http://localhost:3000/v1
   AI_SERVICE_URL=http://localhost:3001/api
   ```

4. **Rebuild the APK**

## How It Works

The app now reads API URLs from Android's `BuildConfig`, which is set during the build process:

- **Debug builds**: Always use development URLs (`http://192.168.0.101:4000/v1`)
- **Release builds**: Use URLs from `gradle.properties` if set, otherwise use production URLs

The configuration is read from:
1. `gradle.properties` (if `API_BASE_URL` and `AI_SERVICE_URL` are set)
2. Default values in `build.gradle` (production URLs)

## Troubleshooting

### Still Getting Network Errors?

1. **Check if the backend is running:**
   ```bash
   curl http://YOUR_IP:3000/health
   ```

2. **Check firewall settings** - ensure ports 3000 and 3001 are open

3. **Verify WiFi connection** - device and computer must be on the same network

4. **Check network security config** - the app allows cleartext HTTP traffic for development

5. **Rebuild after changes:**
   ```bash
   cd mobile/android
   ./gradlew clean
   cd ../..
   npm run build:android
   ```

### Testing the APK

After building, install and test:
```bash
# Install the APK
adb install android/app/build/outputs/apk/release/app-arm64-v8a-release.apk

# Check logs for API URL being used
adb logcat | grep "API Configuration"
```

## For Production Deployment

When ready for production:

1. **Set up your production API servers** with proper SSL certificates
2. **Remove or comment out** the API URL overrides in `gradle.properties`
3. **Update production URLs** in `android/app/build.gradle` if needed
4. **Rebuild the APK** - it will use production URLs

