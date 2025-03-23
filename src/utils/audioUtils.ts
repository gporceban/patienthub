
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
 * Encode audio data for the OpenAI API
 * Converts Float32Array to Int16Array base64 string
 */
// Modify this function to return Int16Array instead of string
export const encodeAudioForAPI = (audioData: Float32Array): Int16Array => {
  // Convert Float32Array (-1 to 1) to Int16Array (-32768 to 32767)
  const pcm16 = new Int16Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    // Map the Float32 sample to Int16 range
    pcm16[i] = Math.max(-32768, Math.min(32767, Math.floor(audioData[i] * 32767)));
  }
  
  return pcm16;
};

// Add this new function
export const encodeToBase64 = (data: Int16Array): string => {
  // Convert Int16Array to Uint8Array
  const uint8Array = new Uint8Array(data.buffer);
  
  // Convert to base64
  let binaryString = '';
  uint8Array.forEach(byte => {
    binaryString += String.fromCharCode(byte);
  });
  
  return btoa(binaryString);
};