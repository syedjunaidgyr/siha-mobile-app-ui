// src/services/cameraService.ts
// Production-ready Camera Service + hook for react-native-vision-camera frame capture.
// Works with VisionCamera frame processor + fallback to takePhoto() capture.
// Exports:
// - useCameraCapture() hook (preferred usage from components)
// - frameProcessorWorklet (worklet function used by useFrameProcessor internally)
// - startFrameCapture / stopFrameCapture (internal but available if needed)
// - captureFramesLegacy (fallback using takePhoto)

import { Camera, Frame } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import RNFS from 'react-native-fs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Buffer } from 'buffer'; // fallback for base64 conversion

// NOTE: Ensure your metro/polyfills provide Buffer in RN. Many projects do.
// You can add `global.Buffer = global.Buffer || require('buffer').Buffer;` in entry file if needed.

/**
 * Frame capture state used by worklet and JS
 */
export interface FrameCaptureState {
  isCapturing: boolean;
  frames: string[]; // base64-encoded frames (data:image/...)
  startTime: number;
  duration: number;
  frameInterval: number; // ms
  lastFrameTime: number;
  onComplete?: (frames: string[]) => void;
}

let frameCaptureState: FrameCaptureState | null = null;
let shouldStopCapture = false; // Flag to stop capture early

// expose to worklet via global - worklets can access global.* variables
if (typeof global !== 'undefined') {
  // @ts-ignore
  global.__frameCaptureState = frameCaptureState;
}

/**
 * Helper: create base64 string from ArrayBuffer (safe path using Buffer)
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  try {
    // Use Buffer if available (most robust in RN env with buffer polyfill)
    const u8 = new Uint8Array(buffer);
    // Buffer.from(u8).toString('base64') works in RN when buffer polyfill exists
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(u8).toString('base64');
    }
    // fallback to btoa if present
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < u8.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunkSize)));
    }
    if (typeof btoa !== 'undefined') {
      return btoa(binary);
    }
    // ultimate fallback - convert via String.fromCharCode (may fail on large buffers)
    throw new Error('Buffer and btoa not available for base64 conversion');
  } catch (err) {
    console.warn('arrayBufferToBase64 failed, returning empty string', err);
    return '';
  }
}

/**
 * Start frame capture (worklet reads this via global)
 */
export function startFrameCapture(durationMs: number, frameIntervalMs = 33) {
  shouldStopCapture = false; // Reset stop flag
  frameCaptureState = {
    isCapturing: true,
    frames: [],
    startTime: Date.now(),
    duration: durationMs,
    frameInterval: frameIntervalMs,
    lastFrameTime: 0,
  };
  if (typeof global !== 'undefined') {
    // @ts-ignore
    global.__frameCaptureState = frameCaptureState;
  }
  console.log(`[CameraService] startFrameCapture duration=${durationMs} interval=${frameIntervalMs}`);
}

/**
 * Stop frame capture and return frames
 */
export function stopFrameCapture(): string[] {
  shouldStopCapture = true; // Set flag to stop capture
  if (!frameCaptureState) return [];
  const frames = [...frameCaptureState.frames];
  const duration = Date.now() - frameCaptureState.startTime;
  const fps = frames.length > 0 ? (frames.length / duration) * 1000 : 0;
  console.log(`[CameraService] stopFrameCapture captured=${frames.length} duration=${duration}ms fps=${fps.toFixed(1)}`);
  frameCaptureState.isCapturing = false; // Mark as not capturing
  frameCaptureState = null;
  if (typeof global !== 'undefined') {
    // @ts-ignore
    global.__frameCaptureState = null;
  }
  return frames;
}

/**
 * Is capture active
 */
export function isFrameCaptureActive(): boolean {
  return !!frameCaptureState && frameCaptureState.isCapturing;
}

/**
 * processFrameToJS
 * Called from worklet via runOnJS with pixel buffer (ArrayBuffer) and metadata.
 * This runs on JS thread and must be fast-ish — it pushes base64 frames into shared state.
 */
export async function processFrameToJS(
  pixelBuffer: ArrayBuffer,
  width: number,
  height: number,
  pixelFormat: string
): Promise<void> {
  try {
    if (!frameCaptureState || !frameCaptureState.isCapturing) {
      return;
    }

    // Convert ArrayBuffer to base64 (raw). We mark format as raw so backend can interpret.
    const base64 = arrayBufferToBase64(pixelBuffer);
    if (!base64) {
      console.warn('[CameraService] processFrameToJS produced empty base64, skipping frame');
      return;
    }

    // store data:image/raw;... so backend can know to expect raw YUV/RGB depending on pixelFormat
    const frameData = `data:image/raw;width=${width};height=${height};format=${pixelFormat};base64,${base64}`;

    frameCaptureState.frames.push(frameData);

    // Update global reference so worklet sees updated frames if it re-reads global.
    if (typeof global !== 'undefined') {
      // @ts-ignore
      global.__frameCaptureState = frameCaptureState;
    }

    // Log periodic progress
    if (frameCaptureState.frames.length % 30 === 0) {
      const elapsed = Date.now() - frameCaptureState.startTime;
      const fps = (frameCaptureState.frames.length / elapsed) * 1000;
      console.log(`[CameraService] captured ${frameCaptureState.frames.length} frames (approx ${fps.toFixed(1)} FPS)`);
    }
  } catch (err) {
    console.error('[CameraService] processFrameToJS error:', err);
  }
}

/**
 * Worklet frame processor function.
 * - This runs on UI thread as a worklet.
 * - It accesses global.__frameCaptureState to decide if it should capture.
 * - For each eligible frame, it calls runAsync(frame, ...) to produce an ArrayBuffer, then runOnJS(processFrameToJS).
 *
 * IMPORTANT:
 * - Keep this code minimal and avoid JS closures or external references not allowed in worklets.
 */
export const frameProcessorWorklet = (frame: Frame) => {
  'worklet';
  try {
    // Debug: Log that frame processor is running (first few frames only)
    // @ts-ignore
    if (typeof global !== 'undefined' && !global.__frameProcessorLogged) {
      // @ts-ignore
      global.__frameProcessorLogged = true;
      try {
        // @ts-ignore
        runOnJS(console.log)('[CameraService] Frame processor is RUNNING');
      } catch {}
    }

    // @ts-ignore
    const state = typeof global !== 'undefined' ? global.__frameCaptureState : null;
    if (!state || !state.isCapturing) {
      return;
    }

    const now = Date.now();
    const elapsed = now - state.startTime;
    if (elapsed >= state.duration) {
      // mark capture finished on worklet side then call onComplete via runOnJS if provided
      state.isCapturing = false;
      // @ts-ignore
      if (typeof global !== 'undefined') global.__frameCaptureState = state;
      
      // Debug log
      try {
        // @ts-ignore
        runOnJS(console.log)(`[CameraService.worklet] Duration reached: ${elapsed}ms >= ${state.duration}ms, frames captured: ${state.frames.length}`);
      } catch {}
      
      if (state.onComplete) {
        // runOnJS to call completion on JS thread
        const framesCopy = [...state.frames];
        runOnJS(state.onComplete)(framesCopy);
      } else {
        try {
          // @ts-ignore
          runOnJS(console.warn)('[CameraService.worklet] Duration reached but onComplete is not set');
        } catch {}
      }
      return;
    }

    const timeSinceLast = now - state.lastFrameTime;
    if (timeSinceLast < state.frameInterval) {
      return;
    }
    state.lastFrameTime = now;
    // persist updated state back to global
    // @ts-ignore
    if (typeof global !== 'undefined') global.__frameCaptureState = state;

    // Extract frame data directly (toArrayBuffer is synchronous but may be slow)
    // For better performance, we could use runAsync, but it requires proper setup
      try {
        const pixelBuffer = frame.toArrayBuffer(); // returns ArrayBuffer (native -> JS)
        const w = frame.width;
        const h = frame.height;
        const pf = frame.pixelFormat;
        // call JS to handle conversion/storage
      // Use global (not globalThis) for React Native compatibility
      // @ts-ignore
      const processFn = typeof global !== 'undefined' ? global.__runOnJSProcessFrameToJS : null;
      if (processFn && typeof processFn === 'function') {
        runOnJS(processFn)(pixelBuffer, w, h, pf);
      } else {
        // Fallback: try to log error (may not work in all worklet contexts)
        try {
          // @ts-ignore
          runOnJS(console.log)('[CameraService.worklet] __runOnJSProcessFrameToJS not found');
        } catch {}
      }
    } catch (e) {
      // cannot call console.* reliably inside some worklet contexts, but try
      try {
        // @ts-ignore
        runOnJS(console.error)('[CameraService.worklet] error during frame conversion', String(e));
      } catch {}
    }
  } catch (e) {
    try {
      // @ts-ignore
      console.error('[CameraService.frameProcessorWorklet] unexpected error', e);
    } catch {}
  }
};

// We need a stable JS function reference accessible from worklet via runOnJS.
// Some RN/reanimated environments restrict passing module functions directly to runOnJS.
// So we attach a wrapper to global that delegates to processFrameToJS.
// This ensures runOnJS(global.__runOnJSProcessFrameToJS) works from the worklet.
if (typeof global !== 'undefined') {
  // @ts-ignore
  global.__runOnJSProcessFrameToJS = (pixelBuffer: ArrayBuffer, w: number, h: number, pf: string) => {
    // call the exported function (it's async) but we don't await in this wrapper
    // any errors will be logged by processFrameToJS
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    processFrameToJS(pixelBuffer, w, h, pf);
  };
}

/**
 * Capture using takePhoto() — reliable method that works on all devices.
 * - Captures photos at specified interval within duration.
 * - Returns array of "data:image/jpeg;base64,..." strings.
 * - Optimized to capture as many frames as possible.
 */
export async function captureFramesLegacy(
  cameraRef: React.RefObject<Camera>,
  durationMs: number,
  intervalMs = 200
): Promise<string[]> {
  if (!cameraRef || !cameraRef.current) {
    throw new Error('Camera ref not ready (photo capture)');
  }
  
  const start = Date.now();
  const end = start + durationMs;
  const frames: string[] = [];
  let attempts = 0;
  let lastCaptureTime = start;

  console.log(`[CameraService] Starting photo capture: duration=${durationMs}ms, interval=${intervalMs}ms`);
  shouldStopCapture = false; // Reset stop flag

  while (Date.now() < end && !shouldStopCapture) {
    attempts++;
    const now = Date.now();
    
    // Check if capture was stopped
    if (shouldStopCapture) {
      console.log('[CameraService] Capture stopped early by stopFrameCapture()');
      break;
    }
    
    // Check if enough time has passed since last capture
    const timeSinceLastCapture = now - lastCaptureTime;
    if (timeSinceLastCapture < intervalMs) {
      // Wait until interval has passed
      const waitTime = intervalMs - timeSinceLastCapture;
      const remaining = end - now;
      if (remaining <= 0 || shouldStopCapture) break;
      await new Promise((res) => setTimeout(res, Math.min(waitTime, remaining)));
      continue;
    }

    try {
      const photo = await cameraRef.current.takePhoto({ 
        flash: 'off',
      });
      
      if (photo && photo.path) {
        try {
          const b = await RNFS.readFile(photo.path, 'base64');
          frames.push(`data:image/jpeg;base64,${b}`);
          lastCaptureTime = Date.now();
          
          // Log progress every 10 frames
          if (frames.length % 10 === 0) {
            const elapsed = Date.now() - start;
            const fps = (frames.length / elapsed) * 1000;
            console.log(`[CameraService] Captured ${frames.length} frames (${fps.toFixed(1)} FPS)`);
          }
          
          // Clean up photo file to save space
          try {
            await RNFS.unlink(photo.path);
          } catch (unlinkErr) {
            // Ignore cleanup errors
          }
        } catch (readErr) {
          console.warn('[CameraService] Failed to read photo:', readErr);
        }
      }
    } catch (err: any) {
      console.warn(`[CameraService] takePhoto failed (attempt ${attempts}):`, err?.message || err);
      // Don't break on single failure, continue trying
    }

    // Check remaining time
    const remaining = end - Date.now();
    if (remaining <= 0) break;
  }

  const totalDuration = Date.now() - start;
  const fps = frames.length > 0 ? (frames.length / totalDuration) * 1000 : 0;
  console.log(`[CameraService] Photo capture complete: ${frames.length} frames in ${totalDuration}ms (${fps.toFixed(1)} FPS, ${attempts} attempts)`);
  
  return frames;
}

/**
 * Helper single-frame capture with takePhoto() - returns { path, base64 } or null
 */
export async function captureSingleFrameWithPath(cameraRef: React.RefObject<Camera>) {
  if (!cameraRef || !cameraRef.current) throw new Error('Camera ref not ready for single capture');
  const photo = await cameraRef.current.takePhoto({ flash: 'off' });
  if (!photo || !photo.path) return null;
  const b = await RNFS.readFile(photo.path, 'base64');
  return { path: photo.path, base64: `data:image/jpeg;base64,${b}` };
}

/**
 * Hook: useCameraCapture
 * - Provides cameraRef, selected device (prefers front), isCapturing flag, and capture functions.
 * - Exposes captureWithProcessor (preferred) and captureLegacy (fallback).
 */
export function useCameraCapture() {
  const [hasPermission, setHasPermission] = useState(false);
  // Use VisionCamera hook inside component that imports this hook instead.
  // We cannot call useCameraDevice here because this file may be used by multiple components.
  // The consumer component (VitalsScreen) will call useCameraDevice.
  // However to make your previous code work, we will instead expose cameraRef and helper functions.

  const cameraRef = useRef<Camera | null>(null);

  const startCaptureWithProcessor = useCallback((durationMs: number, frameIntervalMs = 33) => {
    startFrameCapture(durationMs, frameIntervalMs);
    return new Promise<string[]>((resolve) => {
      // attach onComplete to capture state
      if (!frameCaptureState) {
        // safety - resolve empty array
        resolve([]);
        return;
      }
      
      let resolved = false;
      const resolveOnce = (frames: string[]) => {
        if (resolved) return;
        resolved = true;
        resolve(frames);
      };
      
      // Timeout fallback: ensure promise resolves even if worklet doesn't call onComplete
      // Add 2 second buffer to allow worklet to finish
      const timeoutId = setTimeout(() => {
        console.log('[CameraService] startCaptureWithProcessor timeout, stopping capture');
        const frames = stopFrameCapture();
        resolveOnce(frames);
      }, durationMs + 2000);
      
      // Set up onComplete callback that clears timeout and resolves
      frameCaptureState.onComplete = (frames: string[]) => {
        clearTimeout(timeoutId);
        // clear onComplete to avoid duplicates
        if (frameCaptureState) frameCaptureState.onComplete = undefined;
        resolveOnce(frames);
      };
    });
  }, []);

  const stopCapture = useCallback(() => {
    const frames = stopFrameCapture();
    return frames;
  }, []);

  const captureLegacy = useCallback(async (durationMs: number, intervalMs = 500) => {
    return captureFramesLegacy(cameraRef as React.RefObject<Camera>, durationMs, intervalMs);
  }, []);

  const captureSingle = useCallback(async () => {
    return captureSingleFrameWithPath(cameraRef as React.RefObject<Camera>);
  }, []);

  return {
    cameraRef,
    startCaptureWithProcessor,
    stopCapture,
    captureLegacy,
    captureSingle,
    isFrameCaptureActive,
  };
}
