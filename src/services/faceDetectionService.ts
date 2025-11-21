import { Platform } from 'react-native';
import FaceDetector, { FaceDetectionOptions, Face } from '@react-native-ml-kit/face-detection';
import RNFS from 'react-native-fs';

/**
 * On-device face detection service using ML Kit
 * Provides fast, real-time face detection without network calls
 */
export class FaceDetectionService {
  private static options: FaceDetectionOptions = {
    performanceMode: 'fast', // Use fast mode for real-time detection
    landmarkMode: 'none', // We don't need landmarks for basic detection
    contourMode: 'none', // We don't need contours for basic detection
    classificationMode: 'none', // We don't need classification (smiling, eyes open) for basic detection
    minFaceSize: 0.1, // Minimum face size (10% of image)
  };
  
  // Track temporary files created for cleanup
  private static tempFiles: string[] = [];

  /**
   * Convert file path to a URI that ML Kit can access on Android
   * ML Kit on Android requires content:// URIs or files in accessible locations
   */
  private static async getImageUri(imagePath: string): Promise<string> {
    if (Platform.OS === 'android') {
      try {
        // On Android, ML Kit requires a content URI or a file in external storage
        // First, check if it's already a content URI
        if (imagePath.startsWith('content://')) {
          return imagePath;
        }

        // Remove file:// prefix if present
        const cleanPath = imagePath.replace(/^file:\/\//, '');
        
        // Check if file exists
        const fileExists = await RNFS.exists(cleanPath);
        if (!fileExists) {
          throw new Error(`File does not exist: ${cleanPath}`);
        }

        // If the file is in internal storage (/data/user/0/ or /data/data/),
        // we need to copy it to external storage which ML Kit can access
        if (cleanPath.includes('/data/user/0/') || cleanPath.includes('/data/data/')) {
          console.log('ML Kit: File is in internal storage, copying to external directory...');
          
          // Read the file
          const base64 = await RNFS.readFile(cleanPath, 'base64');
          
          // Use external cache directory if available, otherwise use external directory
          const externalDir = RNFS.ExternalCachesDirectoryPath || RNFS.ExternalDirectoryPath || RNFS.CachesDirectoryPath;
          const externalPath = `${externalDir}/face_detection_${Date.now()}.jpg`;
          await RNFS.writeFile(externalPath, base64, 'base64');
          
          // Track temporary file for cleanup
          this.tempFiles.push(externalPath);
          
          console.log('ML Kit: File copied to external directory:', externalPath);
          return `file://${externalPath}`;
        }
        
        // If it's already in external storage, use it directly
        const fileUri = cleanPath.startsWith('/') ? `file://${cleanPath}` : cleanPath;
        return fileUri;
      } catch (error) {
        console.error('Error converting path to URI:', error);
        throw error;
      }
    } else {
      // On iOS, use the path directly
      return imagePath.startsWith('file://') ? imagePath : `file://${imagePath}`;
    }
  }

  /**
   * Detect faces in an image file
   * @param imagePath - Path to the image file (from camera photo.path)
   * @returns Array of detected faces
   */
  static async detectFaces(imagePath: string): Promise<Face[]> {
    try {
      console.log('ML Kit: Detecting faces in image:', imagePath);
      
      // Convert path to appropriate URI format for the platform
      // This will handle copying internal storage files to external storage on Android
      const imageUri = await this.getImageUri(imagePath);
      console.log('ML Kit: Using URI:', imageUri);
      
      // Ensure the URI has the file:// prefix if it's a file path
      let processedUri = imageUri;
      if (!imageUri.startsWith('content://') && !imageUri.startsWith('file://') && imageUri.startsWith('/')) {
        processedUri = `file://${imageUri}`;
      }
      
      const faces = await FaceDetector.detect(processedUri, this.options);
      console.log('ML Kit: Detected', faces.length, 'face(s)');
      
      return faces;
    } catch (error: any) {
      console.error('Error detecting faces:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        path: imagePath,
      });
      throw error;
    } finally {
      // Clean up temporary files after detection (success or error)
      // Don't await to avoid blocking, cleanup happens in background
      this.cleanupTempFiles().catch((error) => {
        console.warn('ML Kit: Error during cleanup:', error);
      });
    }
  }

  /**
   * Check if a face is detected in an image
   * @param imagePath - Path to the image file
   * @returns true if at least one face is detected, false otherwise
   */
  static async isFaceDetected(imagePath: string): Promise<boolean> {
    try {
      const faces = await this.detectFaces(imagePath);
      return faces.length > 0;
    } catch (error) {
      console.error('Error checking face detection:', error);
      return false;
    }
  }

  /**
   * Clean up temporary files created during face detection
   */
  private static async cleanupTempFiles() {
    if (this.tempFiles.length === 0) return;
    
    const filesToClean = [...this.tempFiles];
    // Clear the array immediately to prevent duplicate cleanup attempts
    this.tempFiles = [];
    
    // Clean up all files in parallel
    await Promise.all(
      filesToClean.map(async (filePath) => {
        try {
          const exists = await RNFS.exists(filePath);
          if (exists) {
            await RNFS.unlink(filePath);
            console.log('ML Kit: Cleaned up temporary file:', filePath);
          }
        } catch (error) {
          // Ignore cleanup errors
          console.warn('ML Kit: Failed to cleanup temp file:', filePath, error);
        }
      })
    );
  }
}

