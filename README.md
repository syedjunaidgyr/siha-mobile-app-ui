# YourCare Mobile App

React Native mobile application for the YourCare health data aggregation platform.

## Prerequisites

- Node.js 18+
- React Native CLI
- iOS: Xcode and CocoaPods (macOS only)
- Android: Android Studio, Android SDK, JDK 17+

## Setup

1. Install dependencies:
```bash
npm install
```

2. iOS: Install CocoaPods dependencies:
```bash
cd ios && pod install && cd ..
```

3. Start Metro bundler:
```bash
npm start
```

4. Run on iOS:
```bash
npm run ios
```

5. Run on Android:
```bash
npm run android
```

## Configuration

### API URL

The API URL is automatically configured in `src/config/api.ts`:
- iOS Simulator: `http://localhost:3000`
- Android Emulator: `http://10.0.2.2:3000`
- Physical Device: Update to use your computer's IP address

### Environment Variables

For production builds, you may want to use environment variables. Consider using `react-native-config` or `react-native-dotenv`.

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # App screens
│   ├── services/         # API service clients
│   └── config/           # App configuration
├── ios/                  # iOS native code
├── android/              # Android native code
├── App.tsx               # Main app component
└── index.js              # Entry point
```

## Key Dependencies

- **React Navigation**: Navigation library
- **React Native Keychain**: Secure token storage
- **AsyncStorage**: Local data storage
- **Axios**: HTTP client
- **React Native Health**: HealthKit/Health Connect integration
- **React Native Chart Kit**: Health metrics visualization
- **Lucide React Native**: Icons

## Development

- Fast Refresh is enabled by default
- Shake device to open developer menu
- Enable remote debugging for Chrome DevTools
- Use Xcode/Android Studio for native debugging

## Building for Production

### iOS
```bash
cd ios
xcodebuild -workspace YourCare.xcworkspace -scheme YourCare -configuration Release
```

### Android
```bash
cd android
./gradlew assembleRelease
```

