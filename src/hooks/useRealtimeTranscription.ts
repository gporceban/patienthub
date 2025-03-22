
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { encodeAudioForAPI } from '@/utils/audioUtils';

interface UseRealtimeTranscriptionProps {
  isRecording: boolean;
  onTranscriptionUpdate?: (text: string) => void;
}

interface TranscriptionState {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  text: string;
}

export const useRealtimeTranscription = ({ 
  isRecording, 
  onTranscriptionUpdate 
}: UseRealtimeTranscriptionProps) => {
  const [state, setState] = useState<TranscriptionState>({
    isConnecting: false,
    isConnected: false,
    error: null,
    text: ''
  });
  
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastTranscriptId, setLastTranscriptId] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const tokenExpiryRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCleanedUpRef = useRef(false);
  const isReconnectingRef = useRef(false);
  const setupInProgressRef = useRef(false);
  const activeStreamIdRef = useRef<string | null>(null);
  const setupMicrophoneInProgressRef = useRef(false);
  const sessionInitializedRef = useRef(false);

  // Cleanup WebSocket connection
  const cleanupWebSocket = useCallback(() => {
    if (websocketRef.current) {
      console.log("Closing WebSocket connection");
      try {
        websocketRef.current.close();
      } catch (err) {
        console.error("Error closing WebSocket:", err);
      }
      websocketRef.current = null;
    }
  }, []);
  
  // Cleanup function for all resources
  const cleanupResources = useCallback(() => {
    console.log("Transcription resources cleanup initiated");
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    cleanupWebSocket();
    
    if (processorRef.current && audioContextRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {
        console.error('Error disconnecting processor:', e);
      }
      processorRef.current = null;
    }
    
    if (sourceRef.current && audioContextRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (e) {
        console.error('Error disconnecting source:', e);
      }
      sourceRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(console.error);
      } catch (e) {
        console.error('Error closing audio context:', e);
      }
      audioContextRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
      } catch (e) {
        console.error('Error stopping media tracks:', e);
      }
      mediaStreamRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false
    }));
    
    isCleanedUpRef.current = true;
    sessionInitializedRef.current = false;
    console.log("Transcription resources cleaned up");
  }, [cleanupWebSocket]);
  
  // Setup microphone capture
  const setupMicrophone = useCallback(async () => {
    if (setupMicrophoneInProgressRef.current) {
      console.log("Microphone setup already in progress");
      return false;
    }
    
    try {
      setupMicrophoneInProgressRef.current = true;
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
        mediaStreamRef.current = null;
      }
      
      console.log('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('Microphone access granted');
      
      if (isCleanedUpRef.current) {
        console.log('Resources cleaned up during microphone setup, aborting');
        stream.getTracks().forEach(track => track.stop());
        setupMicrophoneInProgressRef.current = false;
        return false;
      }
      
      const streamId = stream.id || Math.random().toString();
      activeStreamIdRef.current = streamId;
      mediaStreamRef.current = stream;
      
      if (audioContextRef.current) {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          console.error('Error closing previous audio context:', e);
        }
      }
      
      const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
      audioContextRef.current = newAudioContext;
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Use ScriptProcessor to process audio
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!state.isConnected || !websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to base64 for sending
        const pcmData = encodeAudioForAPI(inputData);
        
        // Send to the API Realtime
        try {
          websocketRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: pcmData
          }));
        } catch (err) {
          console.error("Error sending audio data:", err);
        }
      };
      
      if (isCleanedUpRef.current || activeStreamIdRef.current !== streamId) {
        console.log('Resources cleaned up or stream changed during microphone setup, aborting');
        stream.getTracks().forEach(track => track.stop());
        setupMicrophoneInProgressRef.current = false;
        return false;
      }
      
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      console.log('Audio processing setup complete');
      setupMicrophoneInProgressRef.current = false;
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      if (!isCleanedUpRef.current) {
        setState(prev => ({
          ...prev,
          error: 'Erro ao acessar o microfone. Verifique se as permissões estão concedidas.'
        }));
      }
      setupMicrophoneInProgressRef.current = false;
      return false;
    }
  }, [state.isConnected]);
  
  const setupWebSocketConnection = useCallback((token: string) => {
    if (isCleanedUpRef.current || !token) return;
    
    cleanupWebSocket();
    
    const websocketUrl = `wss://api.openai.com/v1/realtime?intent=transcription&token=${token}`;
    console.log("Connecting to WebSocket with URL:", websocketUrl);
    
    const websocket = new WebSocket(websocketUrl);
    websocketRef.current = websocket;
    
    websocket.onopen = async () => {
      console.log("WebSocket connection established successfully");
      
      if (isCleanedUpRef.current) {
        websocket.close();
        return;
      }
      
      // Successfully connected
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null
      }));
      
      // Send configuration update
      console.log("Sending transcription session configuration");
      websocket.send(JSON.stringify({
        type: "transcription_session.update",
        input_audio_format: "pcm16",
        input_audio_transcription: {
          model: "gpt-4o-transcribe",
          language: "pt",
          prompt: "Vocabulário médico, terminologia ortopédica"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000,
        },
        input_audio_noise_reduction: {
          type: "near_field"
        }
      }));
      
      sessionInitializedRef.current = true;
      setConnectionAttempts(0);
      isReconnectingRef.current = false;
      
      // Setup microphone capture
      await setupMicrophone();
    };
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data.type);
        
        if (isCleanedUpRef.current) return;
        
        if (data.type === "transcription.delta") {
          const newText = data.delta || "";
          setState(prev => {
            const updatedText = prev.text + newText;
            
            // Update state after ensuring the component is still mounted
            if (!isCleanedUpRef.current) {
              if (onTranscriptionUpdate) {
                onTranscriptionUpdate(updatedText);
              }
            }
            
            return {
              ...prev,
              text: updatedText
            };
          });
        } 
        else if (data.type === "transcription.completed") {
          const completeText = data.transcript || "";
          if (data.item_id !== lastTranscriptId) {
            setLastTranscriptId(data.item_id);
            
            setState(prev => {
              // Update state after ensuring the component is still mounted
              if (!isCleanedUpRef.current) {
                if (onTranscriptionUpdate) {
                  onTranscriptionUpdate(completeText);
                }
              }
              
              return {
                ...prev,
                text: completeText
              };
            });
          }
        }
        else if (data.type === "error") {
          console.error("WebSocket error event:", data);
          if (!isCleanedUpRef.current) {
            setState(prev => ({
              ...prev,
              error: `Erro na transcrição: ${data.error?.message || data.message || "Erro desconhecido"}`
            }));
          }
        }
      } catch (e) {
        console.error("Error parsing WebSocket message:", e, event.data);
      }
    };
    
    websocket.onerror = (error) => {
      console.error("WebSocket connection error:", error);
      
      if (isCleanedUpRef.current) return;
      
      setState(prev => ({
        ...prev,
        error: "Erro na conexão WebSocket. Tente novamente.",
        isConnected: false,
        isConnecting: false
      }));
      
      // Increment connection attempts
      setConnectionAttempts(prev => prev + 1);
    };
    
    websocket.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.code} - ${event.reason}`);
      
      if (isCleanedUpRef.current) return;
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false
      }));
      
      // If the token is expired or invalid (code 3000 is often used by OpenAI for invalid tokens)
      // Request a new token and reconnect
      if ((event.code === 3000 || event.code === 1000) && !isReconnectingRef.current && isRecording) {
        isReconnectingRef.current = true;
        console.log("Token may be expired. Requesting a new token...");
        
        // Invalidate the current token
        sessionTokenRef.current = null;
        tokenExpiryRef.current = null;
        
        // Wait a moment before reconnecting to avoid rapid reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isCleanedUpRef.current && isRecording && !setupInProgressRef.current) {
            console.log("Attempting to reconnect with a new token...");
            setupRealtimeTranscription();
          }
        }, 1000);
      }
    };
  }, [cleanupWebSocket, isRecording, lastTranscriptId, onTranscriptionUpdate, setupMicrophone]);
  
  const setupRealtimeTranscription = useCallback(async () => {
    if (isCleanedUpRef.current || setupInProgressRef.current) return;
    
    try {
      setupInProgressRef.current = true;
      isCleanedUpRef.current = false;
      
      setState(prev => ({
        ...prev,
        isConnecting: true
      }));
      
      // Check if we have a valid token that isn't expired
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenValid = sessionTokenRef.current && 
                         tokenExpiryRef.current && 
                         tokenExpiryRef.current > currentTime + 30; // Add a 30-second buffer
      
      if (!tokenValid) {
        // Obtain session token from Edge Function
        console.log("Requesting new transcription token...");
        const { data: sessionData, error: tokenError } = await supabase.functions.invoke("realtime-transcription-token");
        
        if (tokenError) {
          console.error("Error getting transcription token:", tokenError);
          throw new Error(`Erro ao obter token de transcrição: ${tokenError.message}`);
        }
        
        console.log("Session data received:", sessionData);
        
        if (!sessionData || !sessionData.client_secret?.value) {
          console.error("Invalid session data:", sessionData);
          throw new Error("Token de transcrição inválido ou ausente");
        }
        
        if (isCleanedUpRef.current) {
          setupInProgressRef.current = false;
          return;
        }
        
        sessionTokenRef.current = sessionData.client_secret.value;
        tokenExpiryRef.current = sessionData.expires_at;
        
        console.log(`Received transcription session token, expires at: ${
          tokenExpiryRef.current ? new Date(tokenExpiryRef.current * 1000).toISOString() : 'unknown'
        }`);
      } else {
        console.log("Using existing valid token, expiring at:", new Date(tokenExpiryRef.current * 1000).toISOString());
      }
      
      // Connect using the WebSocket API with the token
      setupWebSocketConnection(sessionTokenRef.current!);
      
    } catch (error) {
      console.error('Error setting up real-time transcription:', error);
      
      if (isCleanedUpRef.current) {
        setupInProgressRef.current = false;
        return;
      }
      
      setState(prev => ({
        ...prev,
        error: `Erro ao configurar transcrição em tempo real: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        isConnecting: false
      }));
      
      // Increment connection attempts
      setConnectionAttempts(prev => prev + 1);
    } finally {
      setupInProgressRef.current = false;
    }
  }, [setupWebSocketConnection]);
  
  // Effect to handle connection and cleanup
  useEffect(() => {
    // Only start the connection if we're recording and have a callback
    if (isRecording && onTranscriptionUpdate && !state.isConnected && !state.isConnecting && !setupInProgressRef.current) {
      // Reset the cleanup flag when starting new connection
      isCleanedUpRef.current = false;
      setupRealtimeTranscription();
    }
    
    // Clean up when not recording
    if (!isRecording && (state.isConnected || state.isConnecting)) {
      cleanupResources();
    }
    
    // Cleanup on unmount
    return () => {
      cleanupResources();
    };
  }, [
    isRecording, 
    onTranscriptionUpdate, 
    state.isConnected, 
    state.isConnecting, 
    setupRealtimeTranscription, 
    cleanupResources
  ]);
  
  return {
    isConnecting: state.isConnecting,
    isConnected: state.isConnected,
    error: state.error,
    text: state.text,
    connectionAttempts,
    cleanupResources
  };
};
