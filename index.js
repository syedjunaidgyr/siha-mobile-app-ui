/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Ensure frame processor global is set up at app root
// This ensures it's available even if React Native wipes globals on reload
import { processFrameToJS } from './src/services/cameraService';

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

AppRegistry.registerComponent(appName, () => App);

