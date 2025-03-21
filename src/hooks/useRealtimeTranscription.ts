
import { useState, useEffect, useRef } from 'react';
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

  // Cleanup WebSocket connection
  const cleanupWebSocket = () => {
    if (websocketRef.current) {
      console.log("Closing WebSocket connection");
      websocketRef.current.close();
      websocketRef.current = null;
    }
  };
  
  // Cleanup function for all resources
  const cleanupResources = () => {
    isCleanedUpRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    cleanupWebSocket();
    
    if (processorRef.current && sourceRef.current) {
      try {
        sourceRef.current.disconnect();
        processorRef.current.disconnect();
      } catch (e) {
        console.error('Error disconnecting audio nodes:', e);
      }
      sourceRef.current = null;
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(console.error);
      } catch (e) {
        console.error('Error closing audio context:', e);
      }
      audioContextRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
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
    console.log('Transcription resources cleaned up');
  };
  
  // Effect to handle text updates
  useEffect(() => {
    if (onTranscriptionUpdate && state.text) {
      onTranscriptionUpdate(state.text);
    }
  }, [state.text, onTranscriptionUpdate]);
  
  // Setup microphone capture
  const setupMicrophone = async () => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
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
      
      if (isCleanedUpRef.current) return false;
      
      mediaStreamRef.current = stream;
      
      if (audioContextRef.current) {
        await audioContextRef.current.close();
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
        
        // Convert Float32Array to Int16Array (PCM16)
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
      
      if (isCleanedUpRef.current) return false;
      
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      console.log('Audio processing setup complete');
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      if (!isCleanedUpRef.current) {
        setState(prev => ({
          ...prev,
          error: 'Erro ao acessar o microfone. Verifique se as permissões estão concedidas.'
        }));
      }
      return false;
    }
  };
  
  const setupWebSocketConnection = (token: string) => {
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
          setState(prev => ({
            ...prev,
            text: prev.text + newText
          }));
        } 
        else if (data.type === "transcription.completed") {
          const completeText = data.transcript || "";
          if (data.item_id !== lastTranscriptId) {
            setLastTranscriptId(data.item_id);
            setState(prev => ({
              ...prev,
              text: completeText
            }));
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
      if (event.code === 3000 && !isReconnectingRef.current && isRecording) {
        isReconnectingRef.current = true;
        console.log("Token may be expired. Requesting a new token...");
        
        // Wait a moment before reconnecting to avoid rapid reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isCleanedUpRef.current && isRecording) {
            console.log("Attempting to reconnect with a new token...");
            setupRealtimeTranscription();
          }
        }, 1000);
      }
    };
  };
  
  const setupRealtimeTranscription = async () => {
    try {
      if (isCleanedUpRef.current) return;
      
      isCleanedUpRef.current = false;
      setState(prev => ({
        ...prev,
        isConnecting: true
      }));
      
      // Check if we have a valid token that isn't expired
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenValid = sessionTokenRef.current && 
                         tokenExpiryRef.current && 
                         tokenExpiryRef.current > currentTime;
      
      if (!tokenValid) {
        // Obter token de sessão da função Edge
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
        
        if (isCleanedUpRef.current) return;
        
        sessionTokenRef.current = sessionData.client_secret.value;
        
        // Use the expires_at value from the token, or default to 10 minutes if it's 0 or invalid
        if (sessionData.expires_at && sessionData.expires_at > 0) {
          tokenExpiryRef.current = sessionData.expires_at;
        } else {
          tokenExpiryRef.current = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
        }
        
        console.log("Received transcription session token, expires at:", 
                    tokenExpiryRef.current ? new Date(tokenExpiryRef.current * 1000).toISOString() : 'unknown');
      } else {
        console.log("Using existing valid token");
      }
      
      // Connect using the WebSocket API with the token
      setupWebSocketConnection(sessionTokenRef.current!);
      
    } catch (error) {
      console.error('Error setting up real-time transcription:', error);
      
      if (isCleanedUpRef.current) return;
      
      setState(prev => ({
        ...prev,
        error: `Erro ao configurar transcrição em tempo real: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        isConnecting: false
      }));
      
      // Increment connection attempts
      setConnectionAttempts(prev => prev + 1);
    }
  };
  
  // Effect to handle connection and cleanup
  useEffect(() => {
    if (isRecording && onTranscriptionUpdate && !state.isConnected && !state.isConnecting) {
      setState(prev => ({
        ...prev,
        isConnecting: true
      }));
      
      setupRealtimeTranscription();
    }
    
    if (!isRecording && (state.isConnected || state.isConnecting)) {
      cleanupResources();
    }
    
    return () => {
      cleanupResources();
    };
  }, [isRecording, onTranscriptionUpdate, state.isConnected, state.isConnecting]);
  
  return {
    isConnecting: state.isConnecting,
    isConnected: state.isConnected,
    error: state.error,
    text: state.text,
    connectionAttempts,
    cleanupResources
  };
};
