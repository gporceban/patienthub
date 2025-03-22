import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { encodeAudioForAPI } from '@/utils/audioUtils';

interface UseRealtimeTranscriptionProps {
  isRecording: boolean;
  onTranscriptionUpdate?: (text: string) => void;
}

export const useRealtimeTranscription = ({ 
  isRecording, 
  onTranscriptionUpdate 
}: UseRealtimeTranscriptionProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tokenRef = useRef<string | null>(null);
  const tokenExpiryRef = useRef<Date | null>(null);
  const isCleaningUpRef = useRef(false);
  const isRecordingRef = useRef(isRecording);
  const connectionInProgressRef = useRef(false);
  
  useEffect(() => {
    // Update the ref when isRecording changes
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Function to fetch a token from our Supabase Edge Function
  const fetchToken = useCallback(async () => {
    console.log("Fetching new realtime transcription token");
    try {
      const { data, error } = await supabase.functions.invoke('realtime-transcription-token');
      
      if (error) {
        throw new Error(`Failed to get token: ${error.message}`);
      }
      
      if (!data || !data.token) {
        throw new Error('No token returned from function');
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Token expires in 10 minutes
      
      tokenRef.current = data.token;
      tokenExpiryRef.current = expiresAt;
      
      console.log("Received token, expiring at:", expiresAt.toISOString());
      
      return data.token;
    } catch (err) {
      console.error("Error fetching token:", err);
      setError(`Failed to get authentication token: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    }
  }, []);

  // Function to get a valid token (either existing or new)
  const getValidToken = useCallback(async () => {
    // If we have a token and it's not expired, use it
    if (tokenRef.current && tokenExpiryRef.current && new Date() < tokenExpiryRef.current) {
      console.log("Using existing valid token, expiring at:", tokenExpiryRef.current.toISOString());
      return tokenRef.current;
    }
    
    // Otherwise get a new one
    return await fetchToken();
  }, [fetchToken]);
  
  // Function to properly clean up all resources
  const cleanupResources = useCallback(() => {
    console.log("Component unmounting, cleaning up resources");
    
    if (isRecordingRef.current && !isCleaningUpRef.current) {
      console.log("Recording still in progress, skipping cleanup");
      return;
    }
    
    isCleaningUpRef.current = true;
    
    // Close WebSocket connection
    if (wsRef.current) {
      console.log("Closing WebSocket connection");
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Stop audio processing
    if (processorRef.current && sourceRef.current) {
      try {
        sourceRef.current.disconnect(processorRef.current);
        processorRef.current.disconnect();
      } catch (err) {
        console.error("Error disconnecting audio nodes:", err);
      }
      processorRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (err) {
        console.error("Error closing audio context:", err);
      }
      audioContextRef.current = null;
    }
    
    // Stop media stream tracks
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error("Error stopping media tracks:", err);
      }
      streamRef.current = null;
    }
    
    isCleaningUpRef.current = false;
  }, []);

  // Start streaming microphone audio to the WebSocket when recording is active
  const startStreaming = useCallback(async () => {
    if (!isRecordingRef.current || connectionInProgressRef.current) {
      return;
    }

    if (connectionAttempts > 5) {
      setError("Maximum connection attempts reached. Please try again later.");
      return;
    }
    
    connectionInProgressRef.current = true;
    setIsConnecting(true);
    setError(null);
    
    console.log("Starting real-time transcription");

    try {
      // Get a token for authentication
      const token = await getValidToken();
      
      // Create WebSocket connection with the token
      console.log("Connecting to WebSocket with URL:", `wss://api.openai.com/v1/realtime?intent=transcription&token=${token}`);
      
      const ws = new WebSocket(`wss://api.openai.com/v1/realtime?intent=transcription&token=${token}`);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionAttempts(0);
        
        // Initialize the transcription session
        const sessionConfig = {
          type: "transcription_session.update",
          input_audio_format: "pcm16",
          input_audio_transcription: {
            model: "gpt-4o-transcribe",
            prompt: "Áudio em português brasileiro, linguagem médica ortopédica",
            language: "pt"
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          input_audio_noise_reduction: {
            type: "near_field"
          },
          include: [
            "item.input_audio_transcription.logprobs"
          ]
        };
        
        ws.send(JSON.stringify(sessionConfig));
        
        // Access the microphone
        navigator.mediaDevices.getUserMedia({ audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }})
        .then(stream => {
          streamRef.current = stream;
          
          // Create audio context and processor to capture audio data
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 16000,
          });
          
          sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
          processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
          
          // Process audio data and send to WebSocket
          processorRef.current.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN && isRecordingRef.current) {
              const inputData = e.inputBuffer.getChannelData(0);
              const base64Audio = encodeAudioForAPI(inputData);
              
              // Send audio data
              ws.send(JSON.stringify({
                type: "input_audio_buffer.append",
                audio: base64Audio
              }));
            }
          };
          
          // Connect the audio nodes
          sourceRef.current.connect(processorRef.current);
          processorRef.current.connect(audioContextRef.current.destination);
        })
        .catch(err => {
          console.error("Error accessing microphone:", err);
          setError(`Error accessing microphone: ${err.message}`);
          setIsConnecting(false);
          connectionInProgressRef.current = false;
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "transcription.response" && data.text) {
            setText(prev => {
              const newText = data.text;
              if (onTranscriptionUpdate) {
                onTranscriptionUpdate(newText);
              }
              return newText;
            });
          }
        } catch (err) {
          console.warn("Error parsing WebSocket message:", err);
        }
      };
      
      ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, "-", event.reason);
        setIsConnected(false);
        
        // Reconnect logic for certain error codes
        if (isRecordingRef.current && [1001, 1006, 1011, 1012, 3001].includes(event.code)) {
          console.log("Attempting to reconnect...");
          setConnectionAttempts(prev => prev + 1);
          setTimeout(() => {
            connectionInProgressRef.current = false;
            if (isRecordingRef.current) {
              startStreaming();
            }
          }, 2000);
        } else {
          connectionInProgressRef.current = false;
          setIsConnecting(false);
        }
      };
      
      ws.onerror = (event) => {
        console.error("WebSocket connection error:", event);
        setError("WebSocket connection error");
        setIsConnected(false);
        setIsConnecting(false);
        connectionInProgressRef.current = false;
      };
      
    } catch (err) {
      console.error("Error in startStreaming:", err);
      setError(`Error starting real-time transcription: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsConnecting(false);
      connectionInProgressRef.current = false;
    }
  }, [connectionAttempts, getValidToken, onTranscriptionUpdate]);

  // Manage WebSocket connection based on recording state
  useEffect(() => {
    if (isRecording) {
      startStreaming();
    } else if (!isRecording && isConnected) {
      console.log("Recording stopped, closing connection");
      cleanupResources();
    }
    
    return () => {
      if (!isRecordingRef.current) {
        cleanupResources();
      }
    };
  }, [isRecording, isConnected, startStreaming, cleanupResources]);

  // Ensure cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    isConnecting,
    isConnected,
    error,
    text,
    connectionAttempts
  };
};
