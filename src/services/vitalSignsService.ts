import api, { videoApi } from '../config/api';
import { MetricService, MetricInput } from './metricService';
import { Platform } from 'react-native';
import SensorService from './sensorService';
import { Buffer } from 'buffer';

export interface VitalSigns {
  heartRate?: number; // BPM
  stressLevel?: number; // 0-100 scale
  oxygenSaturation?: number; // SpO2 percentage
  respiratoryRate?: number; // breaths per minute
  temperature?: number; // °C
  bloodPressure?: { systolic: number; diastolic: number }; // BP in mmHg format
  confidence?: number; // 0-1 confidence score
  timestamp: Date;
}

export interface FaceAnalysisResult {
  vitals: VitalSigns;
  faceDetected: boolean;
  analysisDuration: number; // milliseconds
  frameCount: number;
}

/**
 * Service for AI-powered face analysis to detect vital signs
 * Sends frames to backend API for processing
 */
export class VitalSignsService {
  /**
   * Analyze face from video frames to extract vital signs
   * Sends frames to backend API for AI processing
   */
  static async analyzeFaceFromFrames(frames: string[]): Promise<FaceAnalysisResult> {
    const startTime = Date.now();

    try {
      if (!frames || frames.length === 0) {
        throw new Error('No frames provided for analysis');
      }

      // Convert frames to base64 if they're ImageData objects
      // If they're already strings (base64), use them directly
      let base64Frames = frames.map((frame) => {
        if (typeof frame === 'string') {
          return frame; // Already base64
        }
        // Convert ImageData to base64 (simplified - in production, use proper conversion)
        // For now, we'll expect base64 strings from the camera
        throw new Error('ImageData conversion not implemented. Please provide base64 strings.');
      });

      // Optimize: Sample frames if we have too many to reduce payload size
      // For video analysis, we typically need 10-15 frames, not 20+
      const MAX_FRAMES = 15;
      if (base64Frames.length > MAX_FRAMES) {
        // Sample evenly across the frames
        const step = Math.floor(base64Frames.length / MAX_FRAMES);
        const sampledFrames: string[] = [];
        for (let i = 0; i < base64Frames.length; i += step) {
          sampledFrames.push(base64Frames[i]);
          if (sampledFrames.length >= MAX_FRAMES) break;
        }
        console.log(`[VitalSignsService] Sampling ${base64Frames.length} frames down to ${sampledFrames.length} to reduce payload size`);
        base64Frames = sampledFrames;
      }

      // Get sensor data if available
      let sensorData = null;
      try {
        // Use static import to avoid bundle download issues
        sensorData = SensorService.getCurrentData();
      } catch (error) {
        // Sensor service not available, continue without it
        console.log('Sensor data not available:', error);
      }

      // Log payload size for debugging
      const payloadSize = JSON.stringify({ frames: base64Frames, sensorData }).length;
      const payloadSizeMB = (payloadSize / (1024 * 1024)).toFixed(2);
      console.log(`[VitalSignsService] ${base64Frames.length} frames, payload size: ${payloadSizeMB} MB`);
      
      // Use S3 for large payloads (>20MB) to avoid socket hang up errors
      const useS3 = parseFloat(payloadSizeMB) > 20;
      
      let response: any;
      
      if (useS3) {
        console.log('[VitalSignsService] Using S3 for large payload upload...');
        
        // Step 1: Get presigned S3 upload URLs
        const uploadUrlsResponse = await api.get(`/ai/upload-urls?frameCount=${base64Frames.length}`);
        const uploadInfos = uploadUrlsResponse.data.uploadUrls;
        
        if (uploadInfos.length !== base64Frames.length) {
          throw new Error(`Mismatch: got ${uploadInfos.length} upload URLs for ${base64Frames.length} frames`);
        }
        
        // Step 2: Upload frames to S3
        console.log(`[VitalSignsService] Uploading ${base64Frames.length} frames to S3...`);
        const uploadPromises = base64Frames.map(async (frameBase64, index) => {
          try {
            const { uploadUrl, key } = uploadInfos[index];
            
            // Remove data URL prefix if present
            const base64Data = frameBase64.replace(/^data:image\/[^;]+;base64,/, '');
            
            // Convert base64 to binary for S3 upload
            let imageData: string | Uint8Array;
            if (typeof Buffer !== 'undefined') {
              const buffer = Buffer.from(base64Data, 'base64');
              imageData = buffer;
              console.log(`[VitalSignsService] Frame ${index + 1}: Converted to buffer, size: ${buffer.length} bytes`);
            } else {
              // Fallback: convert base64 to Uint8Array
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              imageData = bytes;
              console.log(`[VitalSignsService] Frame ${index + 1}: Converted to Uint8Array, size: ${bytes.length} bytes`);
            }
            
            // Upload to S3 using presigned URL
            console.log(`[VitalSignsService] Uploading frame ${index + 1} to S3: ${key.substring(0, 50)}...`);
            const uploadResponse = await fetch(uploadUrl, {
              method: 'PUT',
              body: imageData,
              headers: {
                'Content-Type': 'image/jpeg',
              },
            });
            
            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text().catch(() => 'Unable to read error response');
              console.error(`[VitalSignsService] S3 upload failed for frame ${index + 1}:`, {
                status: uploadResponse.status,
                statusText: uploadResponse.statusText || 'No status text',
                errorBody: errorText.substring(0, 200),
                url: uploadUrl.substring(0, 100) + '...',
              });
              throw new Error(`Failed to upload frame ${index + 1} to S3: Status ${uploadResponse.status} - ${errorText.substring(0, 100)}`);
            }
            
            console.log(`[VitalSignsService] Successfully uploaded frame ${index + 1} to S3`);
            return key;
          } catch (error: any) {
            console.error(`[VitalSignsService] Error uploading frame ${index + 1}:`, error);
            // Re-throw with more context
            if (error.message && error.message.includes('Failed to upload')) {
              throw error;
            }
            throw new Error(`Failed to upload frame ${index + 1} to S3: ${error.message || 'Unknown error'}`);
          }
        });
        
        const s3Keys = await Promise.all(uploadPromises);
        console.log(`[VitalSignsService] Successfully uploaded ${s3Keys.length} frames to S3`);
        
        // Step 3: Send S3 keys to backend for analysis
        console.log('[VitalSignsService] Sending S3 keys to backend for analysis...');
        response = await videoApi.post('/ai/analyze-video', {
          s3Keys: s3Keys,
          save: false,
          sensorData: sensorData,
        });
      } else {
        // For smaller payloads, use direct base64 (faster, no S3 overhead)
        console.log('[VitalSignsService] Using direct base64 upload (payload < 20MB)...');
        
        // Test connectivity first with a small health check
        try {
          await api.get('/health');
          console.log('[VitalSignsService] Health check passed, proceeding with video analysis');
        } catch (healthError: any) {
          console.error('[VitalSignsService] Health check failed - server may not be accessible:', healthError.message);
          throw new Error('Cannot connect to server. Please check your network connection and ensure the server is running.');
        }

        // Send frames directly to backend API for analysis
        console.log('[VitalSignsService] Sending video analysis request...');
        response = await videoApi.post('/ai/analyze-video', {
        frames: base64Frames,
        save: false, // Don't save yet, we'll save after user confirms
        sensorData: sensorData, // Include sensor data for better analysis
      });
      }

      const result = response.data.result;
      
      console.log('[VitalSignsService] Raw AI response:', JSON.stringify(result, null, 2));
      
      // Parse and normalize vitals data from AI response
      const vitalsData = result.vitals || {};
      
      console.log('[VitalSignsService] Raw vitalsData:', JSON.stringify(vitalsData, null, 2));
      
      // Ensure timestamp is set (use current time if not provided)
      const timestamp = vitalsData.timestamp 
        ? new Date(vitalsData.timestamp) 
        : new Date();
      
      // Parse confidence - handle both string and number formats
      let confidence: number | undefined;
      if (vitalsData.confidence !== undefined) {
        if (typeof vitalsData.confidence === 'string') {
          confidence = parseFloat(vitalsData.confidence);
        } else if (typeof vitalsData.confidence === 'number') {
          confidence = vitalsData.confidence;
        }
      } else if (result.confidence !== undefined) {
        // Fallback to result-level confidence
        if (typeof result.confidence === 'string') {
          confidence = parseFloat(result.confidence);
        } else if (typeof result.confidence === 'number') {
          confidence = result.confidence;
        }
      }
      
      // Parse blood pressure - ensure values are correctly extracted
      let bloodPressure: { systolic: number; diastolic: number } | undefined;
      
      // Handle different possible response formats
      const bpData = vitalsData.bloodPressure || vitalsData.blood_pressure || result.bloodPressure || result.blood_pressure;
      
      if (bpData) {
        // Try to get systolic and diastolic from various possible key names
        const sysValue = bpData.systolic || bpData.sys || bpData.systolic_value;
        const diaValue = bpData.diastolic || bpData.dia || bpData.diastolic_value;
        
        console.log('[VitalSignsService] Blood pressure raw data:', { bpData, sysValue, diaValue, type: { sys: typeof sysValue, dia: typeof diaValue } });
        
        if (sysValue !== undefined && sysValue !== null && diaValue !== undefined && diaValue !== null) {
          // Convert to numbers, handling strings, numbers, or other formats
          let systolic: number;
          let diastolic: number;
          
          if (typeof sysValue === 'number') {
            systolic = sysValue;
          } else if (typeof sysValue === 'string') {
            systolic = parseFloat(sysValue);
          } else {
            systolic = Number(sysValue);
          }
          
          if (typeof diaValue === 'number') {
            diastolic = diaValue;
          } else if (typeof diaValue === 'string') {
            diastolic = parseFloat(diaValue);
          } else {
            diastolic = Number(diaValue);
          }
          
          // Validate the parsed values
          if (!isNaN(systolic) && !isNaN(diastolic) && systolic > 0 && diastolic > 0) {
            bloodPressure = { systolic, diastolic };
            console.log('[VitalSignsService] Blood pressure successfully parsed:', bloodPressure);
          } else {
            console.warn('[VitalSignsService] Invalid blood pressure values after parsing:', { systolic, diastolic, rawSys: sysValue, rawDia: diaValue });
          }
        } else {
          console.warn('[VitalSignsService] Blood pressure data found but missing systolic or diastolic:', { bpData, sysValue, diaValue });
        }
      } else {
        console.log('[VitalSignsService] No blood pressure data found in response');
      }
      
      // Build normalized vitals object
      const vitals: VitalSigns = {
        heartRate: vitalsData.heartRate !== undefined ? Number(vitalsData.heartRate) : undefined,
        stressLevel: vitalsData.stressLevel !== undefined ? Number(vitalsData.stressLevel) : undefined,
        oxygenSaturation: vitalsData.oxygenSaturation !== undefined ? Number(vitalsData.oxygenSaturation) : undefined,
        respiratoryRate: vitalsData.respiratoryRate !== undefined ? Number(vitalsData.respiratoryRate) : undefined,
        temperature: vitalsData.temperature !== undefined ? Number(vitalsData.temperature) : undefined,
        bloodPressure: bloodPressure,
        confidence: confidence,
        timestamp: timestamp,
      };
      
      console.log('[VitalSignsService] Final parsed vitals:', JSON.stringify(vitals, null, 2));
      
      return {
        vitals: vitals,
        faceDetected: result.faceDetected === true,
        analysisDuration: result.duration 
          ? (typeof result.duration === 'string' ? parseInt(result.duration.replace('ms', '')) : result.duration)
          : (Date.now() - startTime),
        frameCount: result.frameCount || frames.length,
      };
    } catch (error: any) {
      console.error('Error analyzing face:', error);
      
      // Provide more helpful error messages
      if (error.code === 'ERR_NETWORK') {
        const errorMsg = 'Network connection failed. Please check:\n' +
          '1. AWS Security Group allows port 4000\n' +
          '2. Server is running on AWS\n' +
          '3. Your device has internet connection\n' +
          '\nTry: curl http://13.203.161.24:4000/health from your computer to verify server accessibility.';
        throw new Error(errorMsg);
      }
      
      if (error.response?.status === 413) {
        throw new Error('Payload too large. Try capturing fewer frames or reducing image quality.');
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Analysis failed');
    }
  }

  /**
   * Analyze a single image frame
   * Accepts base64 string or file URI
   */
  static async analyzeImageFrame(imageBase64: string): Promise<FaceAnalysisResult> {
    const startTime = Date.now();

    try {
      // Send to backend API for analysis (endpoint is on main backend, not separate AI service)
      // Use videoApi for consistency (even single frame)
      const response = await videoApi.post('/ai/analyze-video', {
        frames: [imageBase64],
        save: false,
      });

      const result = response.data.result;
      
      return {
        vitals: result.vitals,
        faceDetected: result.faceDetected,
        analysisDuration: result.analysisDuration || (Date.now() - startTime),
        frameCount: 1,
      };
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      throw new Error(error.response?.data?.message || error.message || 'Analysis failed');
    }
  }

  // Note: All AI processing is now done on the backend
  // The methods below are kept for backward compatibility but are no longer used

  /**
   * Save vital signs to backend
   */
  static async saveVitalSigns(userId: string, vitals: VitalSigns): Promise<void> {
    try {
      console.log('[VitalSignsService] Saving vital signs to database:', JSON.stringify(vitals, null, 2));
      
      const metrics: MetricInput[] = [];
      // Ensure timestamp is a Date object
      const timestamp = vitals.timestamp instanceof Date ? vitals.timestamp : new Date(vitals.timestamp || Date.now());

      // Handle confidence as string or number
      const confidenceValue = vitals.confidence !== undefined 
        ? (typeof vitals.confidence === 'string' ? parseFloat(vitals.confidence) : vitals.confidence)
        : undefined;

      if (vitals.heartRate !== undefined) {
        metrics.push({
          metric_type: 'heart_rate',
          value: vitals.heartRate,
          unit: 'bpm',
          start_time: timestamp.toISOString(),
          source: 'ai_face_analysis',
          confidence: confidenceValue,
        });
      }

      if (vitals.stressLevel !== undefined) {
        metrics.push({
          metric_type: 'stress_level',
          value: vitals.stressLevel,
          unit: 'score',
          start_time: timestamp.toISOString(),
          source: 'ai_face_analysis',
          confidence: confidenceValue,
        });
      }

      if (vitals.oxygenSaturation !== undefined) {
        metrics.push({
          metric_type: 'oxygen_saturation',
          value: vitals.oxygenSaturation,
          unit: '%',
          start_time: timestamp.toISOString(),
          source: 'ai_face_analysis',
          confidence: confidenceValue,
        });
      }

      if (vitals.respiratoryRate !== undefined) {
        metrics.push({
          metric_type: 'respiratory_rate',
          value: vitals.respiratoryRate,
          unit: 'breaths/min',
          start_time: timestamp.toISOString(),
          source: 'ai_face_analysis',
          confidence: confidenceValue,
        });
      }

      if (vitals.temperature !== undefined) {
        metrics.push({
          metric_type: 'temperature',
          value: vitals.temperature,
          unit: '°C',
          start_time: timestamp.toISOString(),
          source: 'ai_face_analysis',
          confidence: confidenceValue,
        });
      }

      if (vitals.bloodPressure !== undefined) {
        // Save systolic BP
        metrics.push({
          metric_type: 'blood_pressure_systolic',
          value: vitals.bloodPressure.systolic,
          unit: 'mmHg',
          start_time: timestamp.toISOString(),
          source: 'ai_face_analysis',
          confidence: confidenceValue,
        });
        // Save diastolic BP
        metrics.push({
          metric_type: 'blood_pressure_diastolic',
          value: vitals.bloodPressure.diastolic,
          unit: 'mmHg',
          start_time: timestamp.toISOString(),
          source: 'ai_face_analysis',
          confidence: confidenceValue,
        });
      }

      if (metrics.length > 0) {
        console.log('[VitalSignsService] Saving metrics to database:', JSON.stringify(metrics, null, 2));
        
        // Save using the existing metrics endpoint
        const response = await api.post('/sync/healthkit', {
          metrics,
        });
        
        console.log('[VitalSignsService] Metrics saved successfully:', response.data);
      } else {
        console.warn('[VitalSignsService] No metrics to save - all vital signs were undefined');
      }
    } catch (error) {
      console.error('[VitalSignsService] Error saving vital signs:', error);
      throw error;
    }
  }
}

