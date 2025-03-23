
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { encodeAudioForAPI } from '@/utils/audioUtils';
import { useToast } from '@/components/ui/use-toast';

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
  const { toast } = useToast();
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
  const tokenRequestAttemptRef = useRef(0);
  const tokenRequestInProgressRef = useRef(false);
  const lastTokenRequestTimeRef = useRef<number>(0);
  
  // Track if we're permanently stopped vs temporarily disconnected
  const isPermanentlyStoppedRef = useRef(false);
  const wasRecordingRef = useRef(false);

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
    console.log("cleanupResources called. isRecording:", isRecording, "externallyTriggeredCleanup:", externallyTriggeredCleanupRef.current);
    
    // If we're unmounted or currently recording, only do cleanup when explicitly asked
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
    
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(console.error);
        }
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
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          console.error('Error closing previous audio context:', e);
        }
      }
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000 // Match with input
      });
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Use ScriptProcessor to process audio (AnalyserNode doesn't actually transmit audio)
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!state.isConnected || !websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to base64 PCM data
        const pcmData = encodeAudioForAPI(inputData);
        
        // Send to the API Realtime
        try {
          if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify({
              type: 'audio',
              data: {
                format: "encodings=PCM16",
                channels: 1,
                sample_rate: 16000,
                data: pcmData
              }
            }));
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
        
        toast({
          variant: "destructive",
          title: "Erro no acesso ao microfone",
          description: "Verifique se o microfone está ativo e as permissões concedidas."
        });
      }
      setupMicrophoneInProgressRef.current = false;
      return false;
    }
  }, [state.isConnected, toast]);
  
  const setupWebSocketConnection = useCallback((token: string) => {
    if (isCleanedUpRef.current || !token || isPermanentlyStoppedRef.current) return;
    
    cleanupWebSocket();
    
    const websocketUrl = `wss://api.openai.com/v1/audio/speech-recognition/realtime?token=${token}`;
    console.log("Connecting to WebSocket with URL:", websocketUrl);
    
    const websocket = new WebSocket(websocketUrl);
    websocketRef.current = websocket;
    
    websocket.onopen = async () => {
      console.log("WebSocket connection established successfully");
      
      if (isCleanedUpRef.current || isPermanentlyStoppedRef.current) {
        console.log("Cleanup occurred during WebSocket onopen, closing connection");
        websocket.close();
        return;
      }
      
      // Record when we established connection
      recordingStartTimeRef.current = Date.now();
      
      // Send initial configuration
      try {
        websocket.send(JSON.stringify({
          type: "start",
          data: {
            format: "encodings=PCM16",
            channels: 1,
            sample_rate: 16000,
            model: "whisper-1",
            language: "pt"
          }
        }));
      } catch (error) {
        console.error("Error sending start configuration:", error);
      }
      
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
      const micSetupSuccess = await setupMicrophone();
      
      if (!micSetupSuccess) {
        console.warn("Microphone setup failed, but WebSocket was connected");
        setState(prev => ({
          ...prev,
          error: "Erro ao configurar microfone. Verifique permissões."
        }));
      }
    };
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data.type);
        
        if (isCleanedUpRef.current || isPermanentlyStoppedRef.current) return;
        
        if (data.type === "result") {
          if (data.data?.alternatives && data.data.alternatives.length > 0) {
            const newText = data.data.alternatives[0].text || "";
            
            setState(prev => {
              const updatedText = newText; // Use new text directly from result
              
              // Update state after ensuring the component is still mounted
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
        else if (data.type === "final") {
          const completeText = data.data?.text || "";
          if (data.data?.id !== lastTranscriptId) {
            setLastTranscriptId(data.data?.id);
            
            setState(prev => {
              // Update state after ensuring the component is still mounted
              if (!isCleanedUpRef.current && !isPermanentlyStoppedRef.current) {
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
          if (!isCleanedUpRef.current && !isPermanentlyStoppedRef.current) {
            setState(prev => ({
              ...prev,
              error: `Erro na transcrição: ${data.error?.message || data.message || "Erro desconhecido"}`
            }));
            
            toast({
              variant: "destructive",
              title: "Erro na transcrição em tempo real",
              description: data.error?.message || data.message || "Erro desconhecido na transcrição"
            });
          }
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
        const reconnectDelay = timeSinceStart > 1000 ? 2000 : 5000;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isCleanedUpRef.current && isRecording && !setupInProgressRef.current && !isPermanentlyStoppedRef.current) {
            console.log("Attempting to reconnect with a new token...");
            setupRealtimeTranscription();
          }
        }, reconnectDelay);
      }
    };
  }, [cleanupWebSocket, isRecording, lastTranscriptId, onTranscriptionUpdate, setupMicrophone, toast]);
  
  const setupRealtimeTranscription = useCallback(async () => {
    if (isCleanedUpRef.current || setupInProgressRef.current || isPermanentlyStoppedRef.current) {
      console.log("Setup prevented: cleaned up, in progress, or permanently stopped");
      return;
    }
    
    // Prevent concurrent token requests and implement rate limiting
    const now = Date.now();
    const minInterval = 5000; // 5 seconds minimum between requests
    
    if (tokenRequestInProgressRef.current) {
      console.log("Token request already in progress, skipping");
      return;
    }
    
    if (now - lastTokenRequestTimeRef.current < minInterval) {
      console.log(`Too many requests, waiting to respect rate limit. Last request was ${(now - lastTokenRequestTimeRef.current) / 1000}s ago`);
      const waitTime = minInterval - (now - lastTokenRequestTimeRef.current);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isCleanedUpRef.current && isRecording && !setupInProgressRef.current && !isPermanentlyStoppedRef.current) {
          console.log("Retrying after rate limit timeout...");
          setupRealtimeTranscription();
        }
      }, waitTime);
      
      return;
    }
    
    try {
      setupInProgressRef.current = true;
      isCleanedUpRef.current = false;
      tokenRequestInProgressRef.current = true;
      lastTokenRequestTimeRef.current = now;
      
      setState(prev => ({
        ...prev,
        isConnecting: true,
        error: null
      }));
      
      // Check if we have a valid token that isn't expired
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenValid = sessionTokenRef.current && 
                         tokenExpiryRef.current && 
                         tokenExpiryRef.current > currentTime + 60; // Add a 60-second buffer
      
      if (!tokenValid) {
        // Reset token request attempt counter if this is a fresh request
        if (!isReconnectingRef.current) {
          tokenRequestAttemptRef.current = 0;
        }
        
        // Increment attempt counter
        tokenRequestAttemptRef.current++;
        
        if (tokenRequestAttemptRef.current > 5) {
          throw new Error("Falha ao obter token após múltiplas tentativas.");
        }
        
        // Obtain session token from Edge Function
        console.log("Requesting new transcription token...");
        const { data: sessionData, error: tokenError } = await supabase.functions.invoke(
          "realtime-transcription-token",
          {
            method: "POST"
          }
        );
        
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
          tokenRequestInProgressRef.current = false;
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
        tokenRequestInProgressRef.current = false;
        return;
      }
      
      setState(prev => ({
        ...prev,
        error: `Erro ao configurar transcrição em tempo real: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        isConnecting: false
      }));
      
      toast({
        variant: "destructive",
        title: "Erro na transcrição em tempo real",
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      // Increment connection attempts
      setConnectionAttempts(prev => prev + 1);
    } finally {
      setupInProgressRef.current = false;
      tokenRequestInProgressRef.current = false;
    }
  }, [setupWebSocketConnection, toast]);
  
  // Track recording state
  useEffect(() => {
    if (isRecording && !wasRecordingRef.current) {
      // Started recording
      console.log("Recording started, resetting permanent stop flag");
      isPermanentlyStoppedRef.current = false;
      isCleanedUpRef.current = false;
    } else if (!isRecording && wasRecordingRef.current) {
      // Stopped recording - don't cleanup immediately, let the component handle it
      console.log("Recording stopped");
    }
    
    wasRecordingRef.current = isRecording;
  }, [isRecording]);
  
  // Effect to handle connection and cleanup
  useEffect(() => {
    console.log("Main effect running. isRecording:", isRecording, "isConnected:", state.isConnected, "isConnecting:", state.isConnecting);
    
    // Only start the connection if we're recording and have a callback
    if (isRecording && onTranscriptionUpdate && !state.isConnected && !state.isConnecting && !setupInProgressRef.current) {
      console.log("Starting realtime transcription setup");
      setupRealtimeTranscription();
    }
    
    // Cleanup on unmount
    return () => {
      console.log("Component unmounting");
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
