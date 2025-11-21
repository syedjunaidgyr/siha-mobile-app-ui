# Android APK Size Optimization Guide

## Optimizations Applied

Your app has been optimized to reduce the APK size from 204 MB. The following optimizations have been implemented:

### 1. **ProGuard/R8 Enabled** ✅
- Code minification and obfuscation enabled
- Dead code elimination
- Optimized ProGuard rules for React Native and all dependencies

### 2. **Resource Shrinking** ✅
- Unused resources are automatically removed from the APK
- Reduces APK size by removing unused drawables, layouts, etc.

### 3. **ABI Splits** ✅
- Separate APKs for each CPU architecture:
  - `armeabi-v7a` (32-bit ARM)
  - `arm64-v8a` (64-bit ARM - most modern devices)
  - `x86` (32-bit Intel)
  - `x86_64` (64-bit Intel)
- **Expected size reduction: 50-70%** per APK
- Each device only downloads the APK for its architecture

### 4. **Code Shrinking** ✅
- Unused code is removed during build
- Log statements are removed in release builds

## Building Production APKs

### Option 1: Build Split APKs (Recommended - Smaller Size)

This will create separate APKs for each architecture:

```bash
cd mobile
npm run build:android
```

APKs will be located at:
- `android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk`
- `android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`
- `android/app/build/outputs/apk/release/app-x86-release.apk`
- `android/app/build/outputs/apk/release/app-x86_64-release.apk`

**For most users, distribute the `arm64-v8a` APK** (supports 99% of modern Android devices).

### Option 2: Build Universal APK (Larger, but works on all devices)

If you need a single APK that works on all architectures:

1. Edit `android/app/build.gradle` and change:
   ```gradle
   universalApk false  // Change to true
   ```

2. Build:
   ```bash
   cd mobile
   npm run build:android:universal
   ```

### Option 3: Build Android App Bundle (AAB) - Best for Play Store

For Google Play Store distribution, use AAB format (smaller downloads):

```bash
cd mobile/android
./gradlew clean
./gradlew bundleRelease
```

The AAB will be at:
`android/app/build/outputs/bundle/release/app-release.aab`

## Expected Size Reduction

- **Before**: ~204 MB (universal APK)
- **After (arm64-v8a split)**: ~50-80 MB (estimated)
- **After (universal with optimizations)**: ~100-150 MB (estimated)

The exact size depends on:
- Native libraries included
- Assets and resources
- JavaScript bundle size

## Additional Optimization Tips

### 1. Enable Hermes (if not already enabled)
Hermes is a JavaScript engine optimized for React Native. Check if it's enabled in `android/gradle.properties`:
```
hermesEnabled=true
```

### 2. Optimize Images
- Use WebP format instead of PNG where possible
- Compress images before adding to the app
- Use vector drawables for simple icons

### 3. Remove Unused Dependencies
Review your `package.json` and remove any unused packages.

### 4. Use Android App Bundle (AAB)
For Play Store, AAB format allows Google Play to serve optimized APKs to each device, further reducing download size.

### 5. Enable Separate Builds for Debug/Release
The current setup already separates debug and release builds.

## Troubleshooting

### Build Fails with ProGuard Errors

If you encounter ProGuard errors, you may need to add keep rules for specific classes. Add them to `android/app/proguard-rules.pro`.

### APK Still Large

1. Check native library sizes:
   ```bash
   cd android/app/build/outputs/apk/release
   unzip -l app-arm64-v8a-release.apk | grep "\.so$"
   ```

2. Analyze APK contents using Android Studio's APK Analyzer:
   - Build > Analyze APK
   - Select your APK file

3. Check for large assets:
   ```bash
   find android/app/src/main/res -type f -size +100k
   ```

## Production Signing

⚠️ **Important**: The current build uses a debug keystore. For production:

1. Generate a release keystore:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Update `android/app/build.gradle` with your release signing config:
   ```gradle
   signingConfigs {
       release {
           storeFile file('my-release-key.keystore')
           storePassword 'YOUR_STORE_PASSWORD'
           keyAlias 'my-key-alias'
           keyPassword 'YOUR_KEY_PASSWORD'
       }
   }
   
   buildTypes {
       release {
           signingConfig signingConfigs.release
           // ... rest of config
       }
   }
   ```

3. Keep your keystore file secure and backed up!

## Testing the Release Build

Before distributing, test the release build:

```bash
cd mobile/android
./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-arm64-v8a-release.apk
```

Make sure to test all features, especially:
- Camera functionality
- Health data access
- Face detection
- Network requests
- Navigation

