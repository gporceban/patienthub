
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
 * Encode audio data for the OpenAI Realtime API
 * Converts Float32Array to base64-encoded PCM16 format
 */
export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  // Converter de Float32Array para Int16Array (PCM16)
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Converter para string binária e codificar em base64
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
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

/**
 * Check if a microphone is available and accessible
 */
export const checkMicrophoneAvailability = async (): Promise<boolean> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasMicrophone = devices.some(device => device.kind === 'audioinput');
    
    if (!hasMicrophone) {
      console.warn('No microphone devices found');
      return false;
    }
    
    // Try to access the microphone
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    // Clean up immediately to not leave the mic open
    stream.getTracks().forEach(track => track.stop());
    
    return true;
  } catch (err) {
    console.error('Error checking microphone:', err);
    return false;
  }
};
