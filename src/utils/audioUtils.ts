
/**
 * Processes an Uint8Array of audio frequencies to calculate audio level
 */
export const processAudioLevel = (dataArray: Uint8Array): number => {
  if (!dataArray || dataArray.length === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  
  const avg = sum / dataArray.length;
  return Math.min(1, avg / 128);
};

/**
 * Checks if microphone is available and permissions are granted
 */
export const checkMicrophoneAvailability = async (): Promise<boolean> => {
  console.log("Checking microphone availability...");
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasMicrophone = devices.some(device => device.kind === 'audioinput');
    
    if (!hasMicrophone) {
      console.log("No microphone devices found");
      return false;
    }
    
    // Try to get permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Stop tracks immediately
    stream.getTracks().forEach(track => track.stop());
    
    console.log("Microphone is available and permissions granted");
    return true;
  } catch (error) {
    console.error("Error checking microphone availability:", error);
    return false;
  }
};

/**
 * Convert a Blob to base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
  });
};

/**
 * Convert Float32Array to Int16Array for PCM encoding
 */
export const encodeAudioForAPI = (audioData: Float32Array): Int16Array => {
  // Convert Float32Array (-1 to 1) to Int16Array (-32768 to 32767)
  const pcm16 = new Int16Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    // Map the Float32 sample to Int16 range with correct scaling and clipping
    const sample = Math.max(-1, Math.min(1, audioData[i])); // Ensure range -1 to 1
    pcm16[i] = sample < 0 ? Math.floor(sample * 32768) : Math.floor(sample * 32767);
  }
  
  return pcm16;
};

/**
 * Convert Int16Array to Base64 string for WebSocket transmission
 */
export const encodeToBase64 = (data: Int16Array): string => {
  // Convert to Uint8Array for reliable base64 encoding
  const uint8Array = new Uint8Array(data.buffer);
  
  // Use a chunked approach to handle large arrays
  let binary = '';
  const chunkSize = 0x8000; // 32K chunks to avoid call stack limits
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
    const binaryChunk = Array.from(chunk).map(byte => String.fromCharCode(byte)).join('');
    binary += binaryChunk;
  }
  
  return btoa(binary);
};

/**
 * Debug utility to check if audio data contains non-zero values
 */
export const hasAudioContent = (data: Float32Array | Int16Array): boolean => {
  // Check if audio contains non-zero values (useful for debugging)
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) > 0.01) return true;
  }
  return false;
};
