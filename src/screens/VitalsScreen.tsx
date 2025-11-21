// src/screens/VitalsScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Camera as CameraIcon, Heart, Activity, Wind, AlertCircle, Droplet, Thermometer } from 'lucide-react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useCameraCapture, stopFrameCapture } from '../services/cameraService';
import { VitalSignsService, VitalSigns, FaceAnalysisResult } from '../services/vitalSignsService';
import { AuthService } from '../services/authService';
import SensorService, { SensorData } from '../services/sensorService';
import { Card3D, VitalCard3D } from '../components/3D';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { Svg, Path, Circle, Line, Ellipse } from 'react-native-svg';
import { Colors, Typography, TextStyles } from '../theme';
import { ScreenBackground } from '../components/ui/ScreenBackground';

const { width } = Dimensions.get('window');
const RESULTS_HORIZONTAL_MARGIN = 20;
const CARD_PADDING = 20;
const GRID_GAP = 16;
const GRID_WIDTH = width - (RESULTS_HORIZONTAL_MARGIN * 2);
const INNER_GRID_WIDTH = GRID_WIDTH - (CARD_PADDING * 2);
const CARD_WIDTH = Math.floor((INNER_GRID_WIDTH - GRID_GAP) / 2);

// Vital sign colors for consistency
const VITAL_COLORS = {
  heartRate: Colors.danger,
  stressLevel: Colors.accentTertiary,
  oxygenSaturation: Colors.success,
  respiratoryRate: Colors.accentSecondary,
  temperature: Colors.accent,
  bloodPressure: Colors.danger,
};

interface VitalCardEntry {
  key: string;
  element: React.ReactNode;
}

export default function VitalsScreen() {
  const navigation = useNavigation();
  
  // UI & state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FaceAnalysisResult | null>(null);
  const [vitals, setVitals] = useState<VitalSigns | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0); // in seconds
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0); // in milliseconds for smooth progress
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [sensorStatus, setSensorStatus] = useState<{ isGood: boolean; reasons: string[]; score: number } | null>(null);

  // camera device & refs
  const deviceFront = useCameraDevice('front');
  const deviceBack = useCameraDevice('back');
  const device = deviceFront ?? deviceBack ?? null;

  // hook from cameraService
  const {
    cameraRef: cameraServiceRef,
    startCaptureWithProcessor,
    stopCapture,
    captureLegacy,
    captureSingle,
    isFrameCaptureActive,
  } = useCameraCapture();

  // We also keep a local ref to the Camera component so VisionCamera can mount
  const cameraRef = useRef<Camera | null>(null);

  // Provide cameraRef to service hook
  useEffect(() => {
    // Keep cameraServiceRef in sync with component cameraRef
    if (cameraServiceRef && 'current' in cameraServiceRef) {
      (cameraServiceRef as any).current = cameraRef.current;
    }
  }, [cameraRef, cameraServiceRef]);


  // Permissions: check and request on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await Camera.getCameraPermissionStatus();
        if (!mounted) return;
        if (status === 'granted') {
          setHasPermission(true);
        } else {
          const req = await Camera.requestCameraPermission();
          setHasPermission(req === 'granted');
        }
      } catch (e) {
        console.error('Permission check error', e);
        setHasPermission(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // camera ready tracking
  useEffect(() => {
    const ready = hasPermission && device !== null;
    setCameraReady(ready);
    if (!ready) return;
    setCameraError(null);
    
    // Debug: Log camera render state
    console.log('CAMERA_RENDER_DEBUG', {
      hasPermission,
      device: !!device,
      cameraReady: ready,
      deviceId: device?.id,
    });
  }, [hasPermission, device]);

  // timer for recording UI
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Sensor monitoring - reduced frequency to improve performance
  useEffect(() => {
    let sensorUnsubscribe: (() => void) | null = null;
    let statusUpdateInterval: NodeJS.Timeout | null = null;
    
    const setupSensors = async () => {
      try {
        await SensorService.startMonitoring(200); // Update every 200ms (reduced from 100ms)
        
        sensorUnsubscribe = SensorService.addListener((data) => {
          setSensorData(data);
        });
        
        // Update sensor status less frequently (every 500ms) to reduce re-renders
        statusUpdateInterval = setInterval(() => {
          const status = SensorService.isGoodForVitalSigns();
          setSensorStatus(status);
        }, 500);
      } catch (error) {
        console.warn('Sensor monitoring not available:', error);
      }
    };
    
    setupSensors();
    
    return () => {
      if (sensorUnsubscribe) {
        sensorUnsubscribe();
      }
      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
      }
      SensorService.stopMonitoring();
    };
  }, []);

  // Internal function to start analysis
  const startAnalysisInternal = useCallback(async () => {
    try {
      // Start UI state immediately for responsive feel
      setIsRecording(true);
      setRecordingTime(0);
      setRecordingElapsedMs(0);
      setAnalysisResult(null);
      setVitals(null);
      setFaceDetected(null);
      
      // Defer heavy operations
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // ensure permission & device
      const perm = await Camera.getCameraPermissionStatus();
      if (perm !== 'granted') {
        const newPerm = await Camera.requestCameraPermission();
        if (newPerm !== 'granted') {
          setIsRecording(false);
          Alert.alert('Camera Permission Required', 'Please grant camera permission in settings.');
          return;
        }
      }
      if (!device) {
        setIsRecording(false);
        Alert.alert('Camera not available', 'No camera device found on this device.');
        return;
      }

      // Activate camera view (VisionCamera component uses isActive prop)
      setCameraReady(true);

      // Use takePhoto() method - more reliable than frame processor
      const durationMs = 30000; // 30 seconds
      const frameIntervalMs = 100; // Capture every 100ms = ~10 FPS (better for accurate analysis)
      let capturedFrames: string[] = [];

      // Get sensor data for this recording session
      const currentSensorData = SensorService.getCurrentData();
      
      // Start timer that updates every 250ms (reduced from 100ms to improve performance)
      const startTs = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTs;
        const elapsedSeconds = Math.min(30, Math.floor(elapsed / 1000)); // Cap at 30 seconds
        setRecordingTime(elapsedSeconds);
        setRecordingElapsedMs(Math.min(durationMs, elapsed)); // Cap at 30 seconds in ms
        
        // Auto-stop timer and capture when we reach 30 seconds (100%)
        if (elapsed >= durationMs) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setRecordingTime(30); // Ensure it's exactly 30
          setRecordingElapsedMs(durationMs); // Ensure it's exactly 30000ms
          setIsRecording(false); // Stop recording UI immediately
          
          // Stop the capture if it's still running
          if (isFrameCaptureActive()) {
            console.log('[VitalsScreen] Stopping capture at 100% completion');
            stopFrameCapture();
          }
        }
      }, 250) as unknown as number; // Reduced from 100ms to 250ms for better performance

      try {
        console.log('[VitalsScreen] Starting photo capture...');
        console.log('[VitalsScreen] Sensor conditions:', SensorService.isGoodForVitalSigns());
        // Use takePhoto() method which works reliably on all devices
        capturedFrames = await captureLegacy(durationMs, frameIntervalMs);
        console.log(`[VitalsScreen] Captured ${capturedFrames.length} frames`);
      } catch (captureErr) {
        console.error('[VitalsScreen] Capture failed:', captureErr);
        Alert.alert('Capture Error', 'Failed to capture frames. Please try again.');
        return;
      } finally {
        // Always stop the UI timer and recording state
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
        // Ensure recordingTime is exactly 30 when capture completes
        setRecordingTime(30);
        setRecordingElapsedMs(durationMs);
      setIsRecording(false);
      }

      if (!capturedFrames || capturedFrames.length === 0) {
        Alert.alert('No frames captured', 'Please ensure your face is visible and try again.');
        return;
      }

      // Show results immediately, defer heavy operations
      setIsAnalyzing(true);
      
      // Defer analysis to next frame to keep UI responsive
      requestAnimationFrame(async () => {
        try {
          const result = await VitalSignsService.analyzeFaceFromFrames(capturedFrames);

          console.log('[VitalsScreen] Analysis result:', JSON.stringify(result, null, 2));
          console.log('[VitalsScreen] Vitals to display:', JSON.stringify(result.vitals, null, 2));

          setAnalysisResult(result);
          setVitals(result.vitals ?? null);

          // Defer save operation to avoid blocking UI
          setTimeout(async () => {
            // Save if valid
            const user = await AuthService.getStoredUser();
            if (user && result.vitals && result.faceDetected) {
              try {
                await VitalSignsService.saveVitalSigns(user.id, result.vitals);
                console.log('[VitalsScreen] Vital signs saved successfully');
                Alert.alert('Success', 'Vital signs recorded successfully!');
                
                // Notify navigation that data has been updated (for dashboard/history refresh)
                // This will trigger a refresh when user navigates back
                navigation.setParams({ refresh: Date.now() } as any);
              } catch (saveError: any) {
                console.error('[VitalsScreen] Error saving vital signs:', saveError);
                Alert.alert('Save Error', 'Vital signs were analyzed but could not be saved. Please try again.');
              }
            } else if (!result.faceDetected) {
              Alert.alert('No face detected', 'We could not detect a face in the recording. Try again with better lighting and center your face.');
            }
          }, 100);
        } catch (analysisError: any) {
          console.error('[VitalsScreen] Analysis error:', analysisError);
          Alert.alert('Analysis Error', analysisError?.message ?? 'Unknown error during analysis');
          setIsAnalyzing(false);
          setIsRecording(false);
        } finally {
          setIsAnalyzing(false);
          setIsRecording(false);
        }
      });
    } catch (err: any) {
      console.error('startAnalysis error', err);
      Alert.alert('Analysis Error', err?.message ?? 'Unknown error during analysis');
      setIsRecording(false);
      setIsAnalyzing(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [device, captureLegacy]);

  // Start full analysis flow (30s capture -> send to backend -> show results)
  const startAnalysis = useCallback(async () => {
    // Defer sensor check to avoid blocking UI
    requestAnimationFrame(async () => {
      // Check sensor conditions first
      const sensorCheck = SensorService.isGoodForVitalSigns();
      if (!sensorCheck.isGood && sensorCheck.score < 50) {
        Alert.alert(
          'Poor Conditions Detected',
          `Please improve conditions:\n${sensorCheck.reasons.join('\n')}\n\nScore: ${sensorCheck.score}/100`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue Anyway', onPress: () => startAnalysisInternal() },
          ]
        );
        return;
      }

      await startAnalysisInternal();
    });
  }, [startAnalysisInternal]);

  const stopAnalysis = useCallback(() => {
    // Force stop if running
    try {
      if (isFrameCaptureActive()) {
        const frames = stopFrameCapture();
        console.log('Stopped capture, frames:', frames.length);
      }
    } catch (e) {
      console.warn('stopFrameCapture error', e);
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordingTime(0);
    setRecordingElapsedMs(0);
  }, [isFrameCaptureActive]);

  // Camera component ref handler
  const handleCameraRef = useCallback((c: Camera | null) => {
    cameraRef.current = c;
    if (cameraServiceRef && 'current' in cameraServiceRef) {
      (cameraServiceRef as any).current = c;
    }
  }, [cameraServiceRef]);

  // Disable back button during recording or analysis
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isRecording || isAnalyzing) {
        // Prevent default behavior of leaving the screen
        e.preventDefault();
        Alert.alert(
          'Recording in Progress',
          'Please wait for the recording or analysis to complete before going back.',
          [{ text: 'OK' }]
        );
      }
    });

    return unsubscribe;
  }, [navigation, isRecording, isAnalyzing]);

  // Update navigation options to disable back button during recording/analyzing
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !isRecording && !isAnalyzing,
      headerBackVisible: !isRecording && !isAnalyzing,
    });
  }, [navigation, isRecording, isAnalyzing]);

  // Simplified animated scanning bar - removed complex animation to reduce lag
  const scanProgress = useSharedValue(0);
  
  useEffect(() => {
    if (isRecording) {
      scanProgress.value = withRepeat(
        withTiming(1, { duration: 2000 }),
        -1,
        false
      );
    } else {
      scanProgress.value = 0;
    }
  }, [isRecording]);

  const scanBarStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scanProgress.value, [0, 1], [0, (width - 48) * 0.8]);
    return {
      transform: [{ translateY }],
    };
  }, []);

  // Calculate progress percentage based on elapsed milliseconds for smooth updates
  const progressPercentage = Math.min(100, Math.max(0, Math.round((recordingElapsedMs / 30000) * 100)));

  // Render
  const shouldRenderCamera = hasPermission && device && !vitals;

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>AI Vital Signs</Text>
        <Text style={styles.subtitle}>
          Position your face in front of the camera for 30 seconds
        </Text>
          </View>
      </View>

      <View style={styles.cameraContainer}>
        {shouldRenderCamera ? (
            <>
              {device && (
          <Camera
            ref={handleCameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
                  isActive={cameraReady && !vitals}
            photo={true}
                  enableZoomGesture={false}
            onError={(err) => {
              console.error('Camera error', err);
                    const errorMessage = err?.message ?? 'Unknown camera error';
                    setCameraError(errorMessage);
                    // Don't show alert for configuration errors during initialization
                    // These can happen when the camera is still initializing
                    if (!errorMessage.includes('invalid-output-configuration') && 
                        !errorMessage.includes('session')) {
                      Alert.alert('Camera Error', errorMessage);
                    }
                  }}
                />
              )}
              
              {/* Face outline oval */}
              <View style={styles.faceOutline}>
                <Svg width={width - 40} height={(width - 40) * 0.8} style={StyleSheet.absoluteFill}>
                  <Ellipse
                    cx={(width - 40) / 2}
                    cy={((width - 40) * 0.8) / 2}
                    rx={((width - 40) * 0.8) * 0.25}
                    ry={((width - 40) * 0.8) * 0.35}
                    fill="none"
                    stroke={Colors.accent}
                    strokeWidth="2"
                    strokeDasharray="8 4"
                  />
                </Svg>
              </View>

              {/* Simplified scanning visualization - only show scanning bar */}
              {isRecording && (
                <Animated.View style={[styles.scanBar, scanBarStyle]}>
                  <View style={styles.scanBarLine} />
                </Animated.View>
              )}

              {/* Recording overlay with progress */}
              {isRecording && (
                <View style={styles.recordingOverlay}>
                  <View style={styles.recordingContent}>
                    <Text style={styles.scanningText}>Scanning..</Text>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{progressPercentage}%</Text>
                  </View>
                </View>
              )}

            </>
        ) : (
          <View style={styles.placeholderCamera}>
              <View style={styles.placeholderIconContainer}>
                <CameraIcon size={64} color={Colors.accent} />
              </View>
            <Text style={styles.placeholderText}>
              {!hasPermission ? 'Camera permission required' : !device ? 'Camera device not available' : 'Ready to analyze'}
            </Text>

            {!hasPermission && (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={async () => {
                  const res = await Camera.requestCameraPermission();
                  setHasPermission(res === 'granted');
                  if (res !== 'granted') {
                    Alert.alert('Permission denied', 'Please allow camera permission in settings.');
                  }
                }}
              >
                <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {vitals && (
        <View style={styles.resultsWrapper}>
          <Card3D depth={16} style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Vital Signs Detected</Text>
              <View style={styles.resultsBadge}>
                <Text style={styles.resultsBadgeText}>✓ Complete</Text>
              </View>
            </View>
            <View style={styles.vitalsGrid}>
              {chunkVitalCards(renderVitalCards(vitals)).map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.vitalsRow}>
                  {row.map((card) => (
                    <View key={card.key} style={styles.vitalCardItem}>
                      {card.element}
                    </View>
                  ))}
                  {row.length === 1 && (
                    <View style={[styles.vitalCardItem, styles.vitalCardPlaceholder]} />
                  )}
                </View>
              ))}
            </View>

          {vitals.confidence !== undefined && (
            <View style={styles.confidenceContainer}>
                <View style={styles.confidenceHeader}>
                  <Text style={styles.confidenceLabel}>Analysis Confidence</Text>
                  <Text style={styles.confidenceValue}>
                    {Math.round((typeof vitals.confidence === 'string' ? parseFloat(vitals.confidence) : vitals.confidence ?? 0) * 100)}%
              </Text>
                </View>
              <View style={styles.confidenceBar}>
                  <View style={[styles.confidenceFill, { width: `${(typeof vitals.confidence === 'string' ? parseFloat(vitals.confidence) : vitals.confidence ?? 0) * 100}%` }]} />
              </View>
            </View>
          )}
          </Card3D>
        </View>
      )}

      <View style={styles.actionsContainer}>
        {!isRecording && !isAnalyzing && !vitals && (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, (!hasPermission || !!cameraError) && styles.buttonDisabled]}
            onPress={() => startAnalysis()}
            disabled={!hasPermission || !!cameraError}
          >
            <CameraIcon size={20} color={Colors.background} />
            <Text style={styles.buttonText}>Start Analysis</Text>
          </TouchableOpacity>
        )}

        {isRecording && (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopAnalysis}
          >
            <Text style={styles.buttonText}>Stop Recording</Text>
          </TouchableOpacity>
        )}

        {!isRecording && !isAnalyzing && vitals && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => { 
              setVitals(null); 
              setAnalysisResult(null); 
              setFaceDetected(null);
            }}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>New Analysis</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sensor Status Indicator */}
      {sensorStatus && (
        <Card3D
          depth={8}
          style={StyleSheet.flatten([
            styles.sensorStatusContainer,
            sensorStatus.isGood ? styles.sensorStatusGood : styles.sensorStatusWarning,
          ])}
        >
          <View style={styles.sensorStatusContent}>
            <View style={styles.sensorStatusIcon}>
              {sensorStatus.isGood ? (
                <Text style={styles.sensorStatusIconText}>✓</Text>
              ) : (
                <Text style={styles.sensorStatusIconText}>⚠</Text>
              )}
            </View>
            <View style={styles.sensorStatusTextContainer}>
              <Text style={styles.sensorStatusText}>
                {sensorStatus.isGood ? 'Optimal Conditions' : 'Check Conditions'}
              </Text>
              {sensorStatus.score < 100 && (
                <Text style={styles.sensorStatusScore}>Quality: {sensorStatus.score}/100</Text>
              )}
              {sensorStatus.reasons.length > 0 && (
                <Text style={styles.sensorStatusReasons}>{sensorStatus.reasons.join(' • ')}</Text>
              )}
            </View>
          </View>
        </Card3D>
      )}

      <Card3D depth={8} style={styles.instructionsContainer}>
        <View style={styles.instructionsHeader}>
          <Text style={styles.instructionsIcon}>💡</Text>
          <Text style={styles.instructionsTitle}>Tips for Best Accuracy</Text>
        </View>
        <View style={styles.instructionsList}>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionBullet}>•</Text>
            <Text style={styles.instructionItem}>Use natural or bright, even lighting</Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionBullet}>•</Text>
            <Text style={styles.instructionItem}>Keep your face centered and fill the frame</Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionBullet}>•</Text>
            <Text style={styles.instructionItem}>Stay completely still during recording</Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionBullet}>•</Text>
            <Text style={styles.instructionItem}>Remove glasses, masks, or face coverings</Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionBullet}>•</Text>
            <Text style={styles.instructionItem}>Keep phone steady (use a stand if possible)</Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionBullet}>•</Text>
            <Text style={styles.instructionItem}>Hold phone 20-30cm from your face</Text>
          </View>
      </View>
      </Card3D>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    ...TextStyles.h2,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  cameraContainer: {
    width: width - 40,
    height: (width - 40) * 0.8,
    backgroundColor: Colors.backgroundDark,
    borderRadius: 18,
    marginHorizontal: 20,
    marginVertical: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  faceOutline: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  scanBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
    height: 2,
    zIndex: 4,
  },
  scanBarLine: {
    width: '100%',
    height: 2,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  placeholderCamera: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: 20,
  },
  placeholderIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.accent,
    marginBottom: 16,
  },
  placeholderText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    shadowColor: Colors.backgroundDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  permissionButtonText: {
    ...TextStyles.button,
    color: Colors.background,
  },
  recordingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(32, 32, 34, 0.85)',
    padding: 18,
    zIndex: 5,
    pointerEvents: 'none',
  },
  recordingContent: {
    alignItems: 'center',
  },
  scanningText: {
    ...TextStyles.h4,
    color: Colors.white,
    marginBottom: 12,
    letterSpacing: Typography.letterSpacing.wide,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.cardAlt,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  progressText: {
    ...TextStyles.h4,
    color: Colors.white,
  },
  resultsWrapper: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  resultsContainer: {
    padding: 20,
    backgroundColor: Colors.card,
    borderWidth: 0,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultsTitle: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
    flex: 1,
  },
  resultsBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resultsBadgeText: {
    ...TextStyles.caption,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
    letterSpacing: Typography.letterSpacing.wide,
  },
  vitalsGrid: {
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  vitalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GRID_GAP,
  },
  vitalCardItem: {
    width: CARD_WIDTH,
    maxWidth: CARD_WIDTH,
    minWidth: CARD_WIDTH,
    height: 120,
  },
  vitalCardPlaceholder: {
    opacity: 0,
  },
  confidenceContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  confidenceLabel: {
    ...TextStyles.label,
    color: Colors.textMuted,
  },
  confidenceValue: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
  },
  confidenceBar: {
    height: 10,
    backgroundColor: Colors.cardAlt,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 5,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    marginBottom: 12,
    gap: 8,
    shadowColor: Colors.backgroundDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
  },
  secondaryButton: {
    backgroundColor: Colors.cardAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
  },
  stopButton: {
    backgroundColor: Colors.danger,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...TextStyles.button,
    color: Colors.background,
  },
  sensorStatusContainer: {
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.card,
  },
  sensorStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sensorStatusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  sensorStatusIconText: {
    fontSize: 22,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.accent,
  },
  sensorStatusTextContainer: {
    flex: 1,
  },
  sensorStatusGood: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  sensorStatusWarning: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  sensorStatusText: {
    ...TextStyles.bodySemibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sensorStatusScore: {
    ...TextStyles.small,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  sensorStatusReasons: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  instructionsContainer: {
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionsIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  instructionsTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
  },
  instructionsList: {
    gap: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionBullet: {
    fontSize: 16,
    color: Colors.accent,
    fontWeight: Typography.fontWeight.bold,
    marginRight: 12,
    marginTop: 2,
  },
  instructionItem: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
});

function renderVitalCards(vitals: VitalSigns): VitalCardEntry[] {
  const cards: VitalCardEntry[] = [];

  if (vitals.heartRate !== undefined) {
    cards.push({
      key: 'heartRate',
      element: (
        <VitalCard3D
          icon={Heart}
          label="Heart Rate"
          value={vitals.heartRate}
          unit="bpm"
          color={VITAL_COLORS.heartRate}
        />
      ),
    });
  }

  if (vitals.stressLevel !== undefined) {
    cards.push({
      key: 'stressLevel',
      element: (
        <VitalCard3D
          icon={Activity}
          label="Stress"
          value={vitals.stressLevel}
          color={VITAL_COLORS.stressLevel}
        />
      ),
    });
  }

  if (vitals.oxygenSaturation !== undefined) {
    cards.push({
      key: 'oxygenSaturation',
      element: (
        <VitalCard3D
          icon={Wind}
          label="SpO2"
          value={vitals.oxygenSaturation}
          unit="%"
          color={VITAL_COLORS.oxygenSaturation}
        />
      ),
    });
  }

  if (vitals.respiratoryRate !== undefined) {
    cards.push({
      key: 'respiratoryRate',
      element: (
        <VitalCard3D
          icon={Wind}
          label="Respiratory"
          value={vitals.respiratoryRate}
          unit="/min"
          color={VITAL_COLORS.respiratoryRate}
        />
      ),
    });
  }

  if (vitals.temperature !== undefined) {
    cards.push({
      key: 'temperature',
      element: (
        <VitalCard3D
          icon={Thermometer}
          label="Temperature"
          value={parseFloat(vitals.temperature.toFixed(1))}
          unit="°C"
          color={VITAL_COLORS.temperature}
        />
      ),
    });
  }

  if (vitals.bloodPressure) {
    cards.push({
      key: 'bloodPressure',
      element: (
        <VitalCard3D
          icon={Droplet}
          label="Blood Pressure"
          value={`${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`}
          unit="mmHg"
          color={VITAL_COLORS.bloodPressure}
        />
      ),
    });
  }

  return cards;
}

function chunkVitalCards(cards: VitalCardEntry[], size = 2): VitalCardEntry[][] {
  const rows: VitalCardEntry[][] = [];
  for (let i = 0; i < cards.length; i += size) {
    rows.push(cards.slice(i, i + size));
  }
  return rows;
}
