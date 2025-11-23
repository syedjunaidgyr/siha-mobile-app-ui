// src/services/cameraService.ts
// Video-based vital signs capture - universal, high-accuracy pipeline
import { Camera, VideoFile } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import React, { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import api from '../config/api';
import * as Keychain from 'react-native-keychain';

export interface VideoRecordingResult {
  path: string;
  duration: number; // milliseconds
  fileSize: number; // bytes
  s3Key?: string; // S3 key if uploaded to S3
}

/**
 * Record a high-quality video for vital signs analysis
 * @param cameraRef - Camera component ref
 * @param durationMs - Recording duration in milliseconds (default: 20000 = 20 seconds)
 * @returns Video file path and metadata
 */
export async function recordVideoForVitals(
  cameraRef: React.RefObject<Camera>,
  durationMs: number = 20000
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
    console.log('[CameraService] Stopping recording...');
    camera.stopRecording();
    
    // Wait for the recording to finish with a timeout
    // The callback should fire within a few seconds after stopRecording
    const timeoutPromise = new Promise<VideoFile>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Recording callback timeout: onRecordingFinished did not fire within 10 seconds'));
      }, 10000); // 10 second timeout
    });
    
    const video = await Promise.race([recordingPromise, timeoutPromise]);
    
    // Log the full video object to see what VisionCamera actually returns
    console.log('[RECORD RESULT] Full video object from VisionCamera:', JSON.stringify(video, null, 2));
    console.log('[RECORD RESULT] Video object keys:', Object.keys(video));
    
    // VisionCamera may return path in different properties depending on version
    // Check dynamically to avoid TypeScript errors
    const videoAny = video as any;
    const srcPath = video.path || videoAny.filePath || videoAny.outputFile || videoAny.uri;
    
    if (!srcPath) {
      console.error('[CameraService] Video object keys:', Object.keys(video));
      throw new Error('Video recording failed: no file path returned. Video object: ' + JSON.stringify(video));
    }

    console.log(`[CameraService] Video callback returned path: ${srcPath}`);
    
    // Wait a bit for the file to be fully written (Android devices may take 300-600ms to flush buffer)
    await new Promise(resolve => setTimeout(resolve, 1000)); // Increased wait to 1 second
    
    // On Android, VisionCamera saves to internal app sandbox (/data/user/0/<package>/cache/)
    // RNFS cannot access this internal location directly, but React Native's FormData CAN access it
    // via file:// URI. So we'll use the original path directly for FormData upload.
    
    // However, we should try to copy to an accessible location if possible for better compatibility
    const destPath = `${RNFS.CachesDirectoryPath}/vitals-analysis-${Date.now()}.mp4`;
    const cleanSrcPath = srcPath.replace(/^file:\/\//, '');
    
    let finalPath = srcPath; // Default to original path (FormData can handle it)
    let fileSize = 0;
    
    // Try to copy the file, but don't fail if we can't - FormData can use the original path
    try {
      console.log(`[CameraService] Attempting to copy video to accessible location...`);
      console.log(`[CameraService] Source: ${cleanSrcPath}`);
      console.log(`[CameraService] Destination: ${destPath}`);
      
      // Check if source file exists (may not be accessible via RNFS, but we can try)
      const sourceExists = await RNFS.exists(cleanSrcPath);
      if (sourceExists) {
        // Try to copy
        await RNFS.copyFile(cleanSrcPath, destPath);
        
        // Verify the copied file
        const stats = await RNFS.stat(destPath);
        fileSize = stats.size || 0;
        
        if (fileSize > 0) {
          finalPath = destPath;
          console.log(`[CameraService] Video copied successfully to accessible path: ${destPath}`);
          console.log(`[CameraService] File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
        } else {
          throw new Error('Copied file has zero size');
        }
      } else {
        console.log(`[CameraService] Source file not accessible via RNFS (may be internal sandbox), will use original path`);
        throw new Error('Source file not accessible via RNFS');
      }
    } catch (copyError: any) {
      console.log(`[CameraService] Cannot copy file via RNFS (this is OK - FormData can use original path)`);
      console.log(`[CameraService] Will use original VisionCamera path: ${srcPath}`);
      
      // Estimate file size based on duration (rough estimate: ~2MB per second)
      fileSize = Math.round((video.duration || 20) * 2 * 1024 * 1024);
      finalPath = srcPath; // Use original path - FormData should be able to handle it
      
      console.log(`[CameraService] Estimated file size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`[CameraService] Note: FormData will attempt to read file directly from VisionCamera path`);
    }

    const duration = video.duration ? video.duration * 1000 : durationMs; // Convert seconds to ms

    console.log(`[CameraService] Video recorded successfully: ${finalPath}`);
    console.log(`[CameraService] Duration: ${duration}ms, File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

    // Skip S3 upload to prevent memory crashes
    // React Native has issues loading large video files into memory for S3 upload
    // The backend will handle the file upload directly via multipart/form-data
    // which is more memory-efficient and won't crash the app
    let s3Key: string | undefined = undefined;
    console.log(`[CameraService] Skipping S3 upload to prevent memory issues. File will be uploaded directly to backend.`);
    
    return {
      path: finalPath,
      duration,
      fileSize,
      s3Key,
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
 * Upload video file to S3 using presigned URL
 * NOTE: This function may cause memory issues for large files (>50MB)
 * It's recommended to skip S3 upload for large files and use direct backend upload instead
 */
async function uploadVideoToS3(videoPath: string, fileSize: number): Promise<string> {
  // Skip S3 upload for files larger than 50MB to prevent memory crashes
  if (fileSize > 50 * 1024 * 1024) {
    throw new Error('File too large for S3 upload - use direct backend upload instead');
  }

  try {
    // Step 1: Get presigned upload URL from backend
    console.log('[CameraService] Requesting S3 upload URL...');
    const uploadUrlResponse = await api.get('/ai/video-upload-url');
    const { uploadUrl, key } = uploadUrlResponse.data;

    if (!uploadUrl || !key) {
      throw new Error('Invalid response from server: missing uploadUrl or key');
    }

    console.log(`[CameraService] Got S3 upload URL for key: ${key}`);

    // Step 2: For S3 presigned PUT URLs, we need to send raw binary data
    // Reading large files into memory causes crashes, so we skip S3 for large files
    // and use direct backend upload instead (which handles files better)
    const videoUri = Platform.OS === 'android' ? `file://${videoPath}` : videoPath;
    
    // Try to read file in smaller chunks if possible, but for now we'll skip
    // S3 upload for files that might cause memory issues
    console.log(`[CameraService] Skipping S3 upload for file ${(fileSize / (1024 * 1024)).toFixed(2)} MB to prevent memory issues`);
    console.log(`[CameraService] Video will be uploaded directly to backend instead`);
    
    // Return undefined to indicate S3 upload was skipped
    throw new Error('S3 upload skipped - file will be uploaded directly to backend');
  } catch (error: any) {
    // If it's our intentional skip, re-throw it
    if (error.message.includes('S3 upload skipped') || error.message.includes('File too large')) {
      throw error;
    }
    console.error('[CameraService] S3 upload error:', error);
    throw new Error(`Failed to upload video to S3: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Hook: useCameraCapture
 * Provides camera ref and video recording functionality
 */
export function useCameraCapture() {
  const cameraRef = useRef<Camera | null>(null);

  const recordVideo = useCallback(
    async (durationMs: number = 20000) => {
      return recordVideoForVitals(cameraRef as React.RefObject<Camera>, durationMs);
    },
    []
  );

  return {
    cameraRef,
    recordVideo,
  };
}
