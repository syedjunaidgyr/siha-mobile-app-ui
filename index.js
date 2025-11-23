/**
 * @format
 */

// Suppress react-native-date-picker warning if module isn't properly linked
if (typeof global !== 'undefined') {
  // @ts-ignore
  global.ignoreDatePickerWarning = true;
}

import {AppRegistry, ErrorUtils} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {ErrorBoundary} from './src/components/ErrorBoundary';

// Global error handler to catch unhandled errors and prevent crashes
if (ErrorUtils && typeof ErrorUtils.setGlobalHandler === 'function') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('Global error handler caught:', {
      error: error?.message || error,
      stack: error?.stack,
      isFatal,
    });
    
    // Log the error but don't crash - let ErrorBoundary handle it
    if (isFatal && originalHandler) {
      // Only call original handler for truly fatal errors
      try {
        originalHandler(error, isFatal);
      } catch (handlerError) {
        console.error('Error in global error handler:', handlerError);
      }
    }
  });
}

// Handle unhandled promise rejections
if (typeof global !== 'undefined') {
  const originalUnhandledRejection = global.onunhandledrejection;
  global.onunhandledrejection = (event) => {
    console.error('Unhandled promise rejection:', event?.reason || event);
    // Prevent default crash behavior
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (originalUnhandledRejection) {
      originalUnhandledRejection(event);
    }
  };
}

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

