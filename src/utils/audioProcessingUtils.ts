
// Define a more correct type for legacy audio context
// We're using Omit to remove createScriptProcessor from AudioContext, then add it back as optional
export interface LegacyAudioContext extends Omit<AudioContext, 'createScriptProcessor'> {
  createScriptProcessor?: (
    bufferSize: number,
    numberOfInputChannels: number,
    numberOfOutputChannels: number
  ) => ScriptProcessorNode;
}

/**
 * Converts Float32Array audio data to Int16Array for transmission
 */
export const convertToInt16 = (float32Array: Float32Array): Int16Array => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
};

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | AudioWorkletNode | null = null;
  private audioData: Float32Array | null = null;
  private websocket: WebSocket | null = null;

  /**
   * Set up microphone and audio processing
   */
  async setupMicrophone(websocket: WebSocket) {
    try {
      this.websocket = websocket;
      
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
      }
      
      console.log('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('Microphone access granted');
      
      this.mediaStream = stream;
      
      if (this.audioContext) {
        await this.audioContext.close();
      }
      
      const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      this.audioContext = newAudioContext;
      
      const source = this.audioContext.createMediaStreamSource(stream);
      
      if ('audioWorklet' in this.audioContext) {
        try {
          await this.audioContext.audioWorklet.addModule('https://cdn.jsdelivr.net/npm/audio-worklet-polyfill@1.0.1/dist/worklet-processor.min.js');
          this.processor = new AudioWorkletNode(this.audioContext, 'worklet-processor');
          this.processor.port.onmessage = (e) => this.processAudioData(e.data);
        } catch (workletError) {
          console.warn('AudioWorklet not supported or failed to load, falling back to ScriptProcessor:', workletError);
          // Safely cast to LegacyAudioContext
          const legacyContext = this.audioContext as unknown as LegacyAudioContext;
          if (legacyContext.createScriptProcessor) {
            this.processor = legacyContext.createScriptProcessor(4096, 1, 1);
            (this.processor as ScriptProcessorNode).onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              this.audioData = new Float32Array(inputData.length);
              this.audioData.set(inputData);
              this.sendAudioData();
            };
          } else {
            console.error('Neither AudioWorklet nor ScriptProcessor is supported in this browser');
            throw new Error('Audio processing is not supported in this browser');
          }
        }
      } else {
        console.warn('AudioWorklet not supported, using deprecated ScriptProcessor');
        // Safely cast to LegacyAudioContext
        const legacyContext = this.audioContext as unknown as LegacyAudioContext;
        if (legacyContext.createScriptProcessor) {
          this.processor = legacyContext.createScriptProcessor(4096, 1, 1);
          (this.processor as ScriptProcessorNode).onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            this.audioData = new Float32Array(inputData.length);
            this.audioData.set(inputData);
            this.sendAudioData();
          };
        } else {
          console.error('ScriptProcessor is not supported in this browser');
          throw new Error('Audio processing is not supported in this browser');
        }
      }
      
      source.connect(this.processor);
      
      if ('onaudioprocess' in this.processor) {
        this.processor.connect(this.audioContext.destination);
      }
      
      console.log('Audio processing setup complete');
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  /**
   * Process audio data from AudioWorklet
   */
  private processAudioData(data: Float32Array) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;
    
    this.audioData = new Float32Array(data);
    this.sendAudioData();
  }

  /**
   * Send processed audio data to WebSocket
   */
  private sendAudioData() {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN || !this.audioData) return;
    
    const pcmData = convertToInt16(this.audioData);
    this.websocket.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(pcmData.buffer))))
    }));
  }

  /**
   * Clean up all audio resources
   */
  cleanup() {
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch (e) {
        console.error('Error disconnecting processor:', e);
      }
      this.processor = null;
    }
    
    if (this.audioContext) {
      try {
        this.audioContext.close().catch(console.error);
      } catch (e) {
        console.error('Error closing audio context:', e);
      }
      this.audioContext = null;
    }
    
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error('Error stopping media tracks:', e);
      }
      this.mediaStream = null;
    }
    
    console.log('Microphone resources cleaned up');
  }

  /**
   * Set the websocket to send audio data to
   */
  setWebSocket(websocket: WebSocket) {
    this.websocket = websocket;
  }
}
