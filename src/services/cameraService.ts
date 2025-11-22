// src/services/cameraService.ts
// Video-based vital signs capture - universal, high-accuracy pipeline
import { Camera, VideoFile } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import React, { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

export interface VideoRecordingResult {
  path: string;
  duration: number; // milliseconds
  fileSize: number; // bytes
}

/**
 * Record a high-quality video for vital signs analysis
 * @param cameraRef - Camera component ref
 * @param durationMs - Recording duration in milliseconds (default: 30000 = 30 seconds)
 * @returns Video file path and metadata
 */
export async function recordVideoForVitals(
  cameraRef: React.RefObject<Camera>,
  durationMs: number = 30000
): Promise<VideoRecordingResult> {
  if (!cameraRef.current) {
    throw new Error('Camera ref not ready for video recording');
  }

  const camera = cameraRef.current;
  
  // Generate unique file path
  const timestamp = Date.now();
  const fileName = `vitals_${timestamp}.mp4`;
  const videoPath = `${RNFS.CachesDirectoryPath}/${fileName}`;

  console.log(`[CameraService] Starting video recording: ${durationMs}ms, path=${videoPath}`);

  try {
    // Start recording with promise-based API
    const recordingPromise = new Promise<VideoFile>((resolve, reject) => {
      camera.startRecording({
        fileType: 'mp4',
        videoCodec: 'h264',
        onRecordingFinished: (video: VideoFile) => {
          console.log(`[CameraService] Recording finished: ${video.path}, duration=${video.duration}s`);
          resolve(video);
        },
        onRecordingError: (error: Error) => {
          console.error(`[CameraService] Recording error:`, error);
          reject(error);
        },
      });
    });

    // Wait for the specified duration, then stop
    await new Promise(resolve => setTimeout(resolve, durationMs));
    
    // Stop recording - the video will be returned via onRecordingFinished callback
    camera.stopRecording();
    
    // Wait for the recording to finish
    const video = await recordingPromise;
    
    if (!video || !video.path) {
      throw new Error('Video recording failed: no file path returned');
    }

    // Wait a bit for the file to be fully written to disk
    // Sometimes the file isn't immediately available after stopRecording
    let fileExists = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!fileExists && attempts < maxAttempts) {
      fileExists = await RNFS.exists(video.path);
      if (!fileExists) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
        attempts++;
      }
    }

    if (!fileExists) {
      throw new Error(`Video file not found at path: ${video.path}`);
    }

    // Get file stats
    let fileSize = 0;
    try {
      const fileStats = await RNFS.stat(video.path);
      fileSize = fileStats.size || 0;
    } catch (statError) {
      console.warn('[CameraService] Could not get file stats, using 0:', statError);
    }
    
    const duration = video.duration ? video.duration * 1000 : durationMs; // Convert seconds to ms

    console.log(`[CameraService] Video recorded successfully: ${video.path}`);
    console.log(`[CameraService] File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB, duration: ${duration}ms`);

    return {
      path: video.path,
      duration,
      fileSize,
    };
  } catch (error: any) {
    console.error('[CameraService] Video recording error:', error);
    
    // Clean up partial file if it exists
    try {
      if (await RNFS.exists(videoPath)) {
        await RNFS.unlink(videoPath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    throw new Error(`Video recording failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Hook: useCameraCapture
 * Provides camera ref and video recording functionality
 */
export function useCameraCapture() {
  const cameraRef = useRef<Camera | null>(null);

  const recordVideo = useCallback(
    async (durationMs: number = 30000) => {
      return recordVideoForVitals(cameraRef as React.RefObject<Camera>, durationMs);
    },
    []
  );

  return {
    cameraRef,
    recordVideo,
  };
}
