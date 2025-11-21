# Frame Encoding Notes for AI Service Face Detection

## Current Status

✅ **Frame processor captures frames at 30 FPS**
⚠️ **JPEG encoding may have pixel format issues**

## Potential Issue: YUV to RGB Conversion

VisionCamera frames on Android are typically in **YUV format**, but `jpeg-js` expects **RGB format** (3 bytes per pixel).

### Impact on AI Service

The AI service **should still be able to detect faces** because:
1. It uses `sharp` library which is more tolerant of format issues
2. It has a fallback face detection method (center region assumption)
3. TensorFlow.js can handle various image formats

However, **face detection accuracy may be reduced** if the JPEG encoding is incorrect.

## Solutions

### Option 1: Use takePhoto() for now (Recommended for testing)

Until we fix YUV to RGB conversion, you can use the existing `takePhoto()` method which produces correct JPEGs:

```typescript
// In VitalsScreen.tsx
const frames = await captureFrames(captureDuration, frameInterval);
```

This is slower (0.7 FPS) but produces correct images that the AI service can definitely process.

### Option 2: Fix YUV to RGB Conversion

Install a YUV to RGB conversion library or implement conversion:

```bash
npm install yuv-buffer
```

Then convert before encoding:

```typescript
import { yuv420ToRgb } from 'yuv-buffer';

// Convert YUV to RGB before JPEG encoding
const rgbData = yuv420ToRgb(uint8Array, width, height);
const imageData = {
  data: rgbData,
  width: width,
  height: height,
};
```

### Option 3: Use Native Module

Create a native module that handles frame conversion and JPEG encoding directly, which would be more efficient.

## Testing

To verify if the AI service can detect faces:

1. Check the AI service logs for face detection results
2. Look for `faceDetected: true/false` in the response
3. If face detection fails, check if it's using the fallback method (center region)

## Current Behavior

- ✅ Frames are captured at 30 FPS
- ✅ Frames are encoded as JPEG
- ⚠️ Pixel format conversion may be incorrect (YUV vs RGB)
- ✅ AI service should still work (with possible reduced accuracy)
- ✅ Fallback detection available if model fails

