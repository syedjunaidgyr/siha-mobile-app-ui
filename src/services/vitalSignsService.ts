import api, { aiApi } from '../config/api';
import { MetricService, MetricInput } from './metricService';
import { Platform } from 'react-native';
import SensorService from './sensorService';

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
      const base64Frames = frames.map((frame) => {
        if (typeof frame === 'string') {
          return frame; // Already base64
        }
        // Convert ImageData to base64 (simplified - in production, use proper conversion)
        // For now, we'll expect base64 strings from the camera
        throw new Error('ImageData conversion not implemented. Please provide base64 strings.');
      });

      // Get sensor data if available
      let sensorData = null;
      try {
        // Use static import to avoid bundle download issues
        sensorData = SensorService.getCurrentData();
      } catch (error) {
        // Sensor service not available, continue without it
        console.log('Sensor data not available:', error);
      }

      // Send frames to AI service for analysis
      const response = await aiApi.post('/ai/analyze-video', {
        frames: base64Frames,
        save: false, // Don't save yet, we'll save after user confirms
        sensorData: sensorData, // Include sensor data for better analysis
      });

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
      // Send to AI service
      const response = await aiApi.post('/ai/analyze-video', {
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

