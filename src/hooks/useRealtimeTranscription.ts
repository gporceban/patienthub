
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { encodeAudioForAPI, encodeToBase64 } from '@/utils/audioUtils';

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
  const externallyTriggeredCleanupRef = useRef(false);
  const isUnmountedRef = useRef(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const sessionSetupCompletedRef = useRef(false);
  
  // Track if we're permanently stopped vs temporarily disconnected
  const isPermanentlyStoppedRef = useRef(false);

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
    sessionSetupCompletedRef.current = false;
  }, []);
  
  // Cleanup function for all resources
  const cleanupResources = useCallback(() => {
    // If we're unmounted or in recording state, only do cleanup when explicitly asked
    if ((isRecording && !externallyTriggeredCleanupRef.current) || isUnmountedRef.current) {
      console.log("Skipping cleanup because either recording is active or component is unmounted");
      return;
    }
    
    // Mark as permanently stopped to prevent automatic reconnection
    isPermanentlyStoppedRef.current = true;
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
    console.log("Transcription resources cleaned up");
    externallyTriggeredCleanupRef.current = false;
  }, [cleanupWebSocket, isRecording]);
  
  // Explicit cleanup to be called externally
  const forceCleanupResources = useCallback(() => {
    externallyTriggeredCleanupRef.current = true;
    cleanupResources();
  }, [cleanupResources]);
  
  // Setup microphone capture
  const setupMicrophone = useCallback(async () => {
    if (setupMicrophoneInProgressRef.current || isCleanedUpRef.current || isPermanentlyStoppedRef.current) {
      console.log("Microphone setup already in progress or resources cleaned up");
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
          sampleRate: 16000, // OpenAI recommends 16kHz
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('Microphone access granted');
      
      if (isCleanedUpRef.current || isPermanentlyStoppedRef.current) {
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
        sampleRate: 16000 // Match with input
      });
      audioContextRef.current = newAudioContext;
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Use ScriptProcessor to process audio
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!state.isConnected || !websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
          console.log("Cannot send audio: Not connected or WebSocket not ready");
          return;
        }
        
        if (!sessionSetupCompletedRef.current) {
          console.log("Cannot send audio: Session setup not completed yet");
          return;
        }
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array for PCM16 (OpenAI format)
        const pcmData = encodeAudioForAPI(inputData);
        
        // Convert to base64 for sending to API
        const base64Audio = encodeToBase64(pcmData);
        
        // Check for valid base64 data before sending
        if (!base64Audio || base64Audio.length === 0) {
          console.warn("Empty audio data, skipping send");
          return;
        }
        
        // Generate a unique event ID for each audio chunk
        const eventId = `audio_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Send to the API Realtime - use the exact format from the documentation
        try {
          if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            const message = {
              event_id: eventId,
              type: "input_audio_buffer.append",
              audio: base64Audio
            };
            
            console.log(`Sending audio chunk (${base64Audio.length} bytes) with event ID: ${eventId}`);
            websocketRef.current.send(JSON.stringify(message));
          }
        } catch (err) {
          console.error("Error sending audio data:", err);
        }
      };
      
      if (isCleanedUpRef.current || activeStreamIdRef.current !== streamId || isPermanentlyStoppedRef.current) {
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
      if (!isCleanedUpRef.current && !isPermanentlyStoppedRef.current) {
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
    if (isCleanedUpRef.current || !token || isPermanentlyStoppedRef.current) return;
    
    cleanupWebSocket();
    
    // Use the WebSocket protocol array for authentication
    const websocket = new WebSocket(
      "wss://api.openai.com/v1/realtime?intent=transcription",
      [
        "realtime",
        // For client tokens
        "openai-ephemeral-client-token." + token,
        // Beta protocol, required
        "openai-beta.realtime-v1"
      ]
    );
    
    websocketRef.current = websocket;
    console.log("Connecting to WebSocket with token authentication");
    
    websocket.onopen = async () => {
      console.log("WebSocket connection established successfully");
      
      if (isCleanedUpRef.current || isPermanentlyStoppedRef.current) {
        websocket.close();
        return;
      }
      
      // Record when we established connection
      recordingStartTimeRef.current = Date.now();
      
      // Wait a moment before sending the session update to ensure the connection is stable
      setTimeout(() => {
        // Send initial configuration according to the documentation
        try {
          if (websocket.readyState === WebSocket.OPEN) {
            const configMessage = {
              type: "transcription_session.update",
              session: {
                input_audio_format: "pcm16",
                input_audio_transcription: {
                  model: "gpt-4o-transcribe",
                  prompt: "Esta é uma consulta médica em português do Brasil.",
                  language: "pt"
                },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500,
                  create_response: true
                },
                input_audio_noise_reduction: {
                  type: "near_field"
                },
                include: [
                  "item.input_audio_transcription.logprobs"
                ]
              }
            };
            
            console.log("Sending transcription session configuration:", JSON.stringify(configMessage, null, 2));
            websocket.send(JSON.stringify(configMessage));
            
            // Mark session setup as completed - now we can start sending audio
            sessionSetupCompletedRef.current = true;
          }
        } catch (error) {
          console.error("Error sending session configuration:", error);
        }
      }, 300); // Short delay to ensure connection is ready
      
      // Successfully connected
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null
      }));
      
      setConnectionAttempts(0);
      isReconnectingRef.current = false;
      
      // Setup microphone capture
      await setupMicrophone();
    };
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data.type);
        
        if (isCleanedUpRef.current || isPermanentlyStoppedRef.current) return;
        
        // Handle different message types
        if (data.type === "transcription_session.created") {
          console.log("Transcription session created successfully");
        }
        else if (data.type === "transcription_session.updated") {
          console.log("Transcription session updated successfully");
        }
        else if (data.type === "input_audio_buffer.speech_started") {
          console.log("Speech detected by VAD");
        }
        else if (data.type === "input_audio_buffer.speech_stopped") {
          console.log("Speech stopped detected by VAD");
        }
        else if (data.type === "response.audio_transcript.delta") {
          // Incremental transcription update
          if (data.delta) {
            console.log("Transcription delta:", data.delta);
            setState(prev => {
              const updatedText = prev.text + data.delta;
              
              if (!isCleanedUpRef.current && !isPermanentlyStoppedRef.current) {
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
        } 
        else if (data.type === "response.audio_transcript.done") {
          // Final transcription for a segment
          if (data.transcript) {
            console.log("Final transcription:", data.transcript);
            
            if (data.id !== lastTranscriptId) {
              setLastTranscriptId(data.id);
              
              setState(prev => {
                if (!isCleanedUpRef.current && !isPermanentlyStoppedRef.current) {
                  if (onTranscriptionUpdate) {
                    onTranscriptionUpdate(data.transcript);
                  }
                }
                
                return {
                  ...prev,
                  text: data.transcript
                };
              });
            }
          }
        }
        else if (data.type === "error") {
          console.error("WebSocket error event:", data);
          if (!isCleanedUpRef.current && !isPermanentlyStoppedRef.current) {
            setState(prev => ({
              ...prev,
              error: `Erro na transcrição: ${data.error?.message || data.message || "Erro desconhecido"}`
            }));
          }
        }
        else {
          console.log("Unhandled message type:", data.type, data);
        }
      } catch (e) {
        console.error("Error parsing WebSocket message:", e, event.data);
      }
    };
    
    websocket.onerror = (error) => {
      console.error("WebSocket connection error:", error);
      
      if (isCleanedUpRef.current || isPermanentlyStoppedRef.current) return;
      
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
      
      if (isCleanedUpRef.current || isPermanentlyStoppedRef.current) return;
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false
      }));
      
      // If the token is expired or invalid (codes used by OpenAI for invalid tokens)
      const isAuthError = [3000, 3001, 3002, 3003].includes(event.code);
      
      // Only attempt to reconnect if we're still recording and this wasn't an unmount cleanup
      if (isRecording && !isReconnectingRef.current && !isPermanentlyStoppedRef.current) {
        // If it was an auth error, request a new token
        if (isAuthError) {
          isReconnectingRef.current = true;
          console.log("Token may be expired or invalid. Requesting a new token...");
          
          // Invalidate the current token
          sessionTokenRef.current = null;
          tokenExpiryRef.current = null;
        }
        
        // Wait a moment before reconnecting to avoid rapid reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Only reconnect if we've been recording for at least 1 second
        // This helps prevent immediate reconnection loops
        const timeSinceStart = recordingStartTimeRef.current ? Date.now() - recordingStartTimeRef.current : 0;
        const reconnectDelay = timeSinceStart > 1000 ? 1000 : 3000;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isCleanedUpRef.current && isRecording && !setupInProgressRef.current && !isPermanentlyStoppedRef.current) {
            console.log("Attempting to reconnect with a new token...");
            setupRealtimeTranscription();
          }
        }, reconnectDelay);
      }
    };
  }, [cleanupWebSocket, isRecording, lastTranscriptId, onTranscriptionUpdate, setupMicrophone]);
  
  const setupRealtimeTranscription = useCallback(async () => {
    if (isCleanedUpRef.current || setupInProgressRef.current || isPermanentlyStoppedRef.current) return;
    
    try {
      setupInProgressRef.current = true;
      isCleanedUpRef.current = false;
      sessionSetupCompletedRef.current = false;
      
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
        
        if (!sessionData || !sessionData.token) {
          console.error("Invalid session data:", sessionData);
          throw new Error("Token de transcrição inválido ou ausente");
        }
        
        if (isCleanedUpRef.current || isPermanentlyStoppedRef.current) {
          setupInProgressRef.current = false;
          return;
        }
        
        sessionTokenRef.current = sessionData.token;
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
      
      if (isCleanedUpRef.current || isPermanentlyStoppedRef.current) {
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
  
  // Reset on recording start
  useEffect(() => {
    if (isRecording) {
      isPermanentlyStoppedRef.current = false;
      isCleanedUpRef.current = false;
      sessionSetupCompletedRef.current = false;
    }
  }, [isRecording]);
  
  // Effect to handle connection and cleanup
  useEffect(() => {
    // Only start the connection if we're recording and have a callback
    if (isRecording && onTranscriptionUpdate && !state.isConnected && !state.isConnecting && !setupInProgressRef.current) {
      setupRealtimeTranscription();
    }
    
    // Clean up when not recording
    if (!isRecording && (state.isConnected || state.isConnecting)) {
      forceCleanupResources();
    }
    
    // Cleanup on unmount
    return () => {
      isUnmountedRef.current = true;
      forceCleanupResources();
    };
  }, [
    isRecording, 
    onTranscriptionUpdate, 
    state.isConnected, 
    state.isConnecting, 
    setupRealtimeTranscription, 
    forceCleanupResources
  ]);
  
  return {
    isConnecting: state.isConnecting,
    isConnected: state.isConnected,
    error: state.error,
    text: state.text,
    connectionAttempts,
    cleanupResources: forceCleanupResources
  };
};
