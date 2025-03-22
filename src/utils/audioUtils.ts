/**
 * Utility functions for audio processing
 */

/**
 * Process and analyze audio levels from audio data
 */
export const processAudioLevel = (dataArray: Uint8Array): number => {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  
  const avg = sum / dataArray.length;
  const level = Math.min(1, avg / 128);
  
  return level;
};

/**
 * Convert Blob to base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result?.toString().split(',')[1];
      if (base64String) {
        resolve(base64String);
      } else {
        reject(new Error('Falha ao converter áudio para base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Check if microphone is available and permissions are granted
 * @returns Promise resolving to true if microphone is available, false otherwise
 */
export const checkMicrophoneAvailability = async (): Promise<boolean> => {
  try {
    console.log("Checking microphone availability...");
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    
    if (audioInputs.length === 0) {
      console.log("No audio input devices found");
      return false;
    }
    
    // Try to get actual access to verify permissions
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Immediately stop the tracks since we just needed to check access
    stream.getTracks().forEach(track => track.stop());
    
    console.log("Microphone is available and permissions granted");
    return true;
  } catch (error) {
    console.error("Microphone availability check failed:", error);
    return false;
  }
};

/**
 * Convert Float32Array audio data to base64 encoded PCM16 format for the OpenAI API
 * @param float32Array The Float32Array from the audio buffer
 * @returns base64 encoded PCM16 audio data
 */
export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  // Convert Float32Array (-1.0 to 1.0) to Int16Array (-32768 to 32767)
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Ensure the value is within -1.0 to 1.0 range
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    // Scale to 16-bit range and convert
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Convert Int16Array to Uint8Array for base64 encoding
  const uint8Array = new Uint8Array(int16Array.buffer);
  
  // Convert to binary string
  let binary = '';
  const chunkSize = 0x8000; // Split into chunks to avoid call stack overflow
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    // Apply directly to avoid creating an array
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  // Convert binary string to base64
  return btoa(binary);
};

/**
 * Decode base64 PCM16 audio into a Float32Array for Web Audio API
 */
export const decodeAudioFromAPI = (base64Audio: string): Float32Array => {
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 0x8000;
  }
  
  return float32Array;
};
