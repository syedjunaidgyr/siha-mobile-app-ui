/**
 * @format
 */

// Suppress react-native-date-picker warning if module isn't properly linked
if (typeof global !== 'undefined') {
  // @ts-ignore
  global.ignoreDatePickerWarning = true;
}

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {ErrorBoundary} from './src/components/ErrorBoundary';

// Note: Global error handler removed as ErrorUtils may not be available in all React Native builds
// ErrorBoundary component below will handle React component errors

// NOTE: We no longer set up global function for frame processor
// processFrameToJS is now passed directly via useFrameProcessor dependency array in VitalsScreen
// This is the correct approach as worklets can't access global on Android

// Wrap App with ErrorBoundary to catch any React errors
const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

AppRegistry.registerComponent(appName, () => AppWithErrorBoundary);

