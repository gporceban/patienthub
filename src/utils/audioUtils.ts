
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
export const encodeAudioForAPI = (audioData: Float32Array): string => {
  // Convert Float32Array (-1 to 1) to Int16Array (-32768 to 32767)
  const pcm16 = new Int16Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    // Map the Float32 sample to Int16 range
    const sample = Math.max(-1, Math.min(1, audioData[i])); // Clamp between -1 and 1
    pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
  }
  
  // Convert Int16Array to Base64
  let binary = '';
  const len = pcm16.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(pcm16[i] & 0xff, (pcm16[i] >> 8) & 0xff);
  }
  
  try {
    return btoa(binary);
  } catch (error) {
    console.error("Error encoding audio data:", error);
    // Return an empty string if encoding fails
    return '';
  }
};
