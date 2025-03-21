
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
