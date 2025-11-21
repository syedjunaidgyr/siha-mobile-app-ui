/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {ErrorBoundary} from './src/components/ErrorBoundary';

// Ensure frame processor global is set up at app root
// This ensures it's available even if React Native wipes globals on reload
try {
  const { processFrameToJS } = require('./src/services/cameraService');
  if (typeof global !== 'undefined') {
    // @ts-ignore
    global.__runOnJSProcessFrameToJS = (pixelBuffer, w, h, pf) => {
      // call the exported function (it's async) but we don't await in this wrapper
      // any errors will be logged by processFrameToJS
      processFrameToJS(pixelBuffer, w, h, pf).catch((err) => {
        console.error('[index.js] processFrameToJS error:', err);
      });
    };
    console.log('[index.js] Frame processor global function registered');
  }
} catch (err) {
  console.warn('[index.js] Failed to import cameraService (this is OK if camera features are not used):', err);
}

// Wrap App with ErrorBoundary to catch any React errors
const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

AppRegistry.registerComponent(appName, () => AppWithErrorBoundary);

