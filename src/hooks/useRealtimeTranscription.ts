
import { useState, useRef, useEffect, useCallback } from 'react';
import { TranscriptionWebSocket, WebSocketMessage } from '@/utils/websocketUtils';
import { AudioProcessor } from '@/utils/audioProcessingUtils';

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
  const [realtimeText, setRealtimeText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const webSocketRef = useRef<TranscriptionWebSocket | null>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  
  useEffect(() => {
    if (!isConnected) {
      setRealtimeText('');
    }
  }, [isConnected]);

  useEffect(() => {
    if (isRecording && onTranscriptionUpdate && !isConnected && !isConnecting) {
      setIsConnecting(true);
      setupConnection();
    }
    
    if (!isRecording && (isConnected || isConnecting)) {
      cleanupConnection();
    }
    
    return () => {
      cleanupConnection();
    };
  }, [isRecording, onTranscriptionUpdate, isConnected, isConnecting]);
  
  useEffect(() => {
    if (onTranscriptionUpdate && realtimeText) {
      onTranscriptionUpdate(realtimeText);
    }
  }, [realtimeText, onTranscriptionUpdate]);

  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    // Handle different message types from the OpenAI API
    if (data.type === "auth_success") {
      console.log('Authentication successful');
      setIsConnected(true);
      setIsConnecting(false);
    } else if (data.type === "conversation.item.input_audio_transcription.completed") {
      if (data.transcript) {
        console.log('Transcription received:', data.transcript);
        setRealtimeText(data.transcript);
      }
    } else if (data.type === "input_audio_buffer.speech_started") {
      console.log('Speech started detected');
    } else if (data.type === "input_audio_buffer.speech_stopped") {
      console.log('Speech stopped detected');
    } else if (data.type === "error") {
      console.error('WebSocket error event:', data);
      setError(`Erro na transcrição: ${data.message || 'Erro desconhecido'}`);
    }
  }, []);

  const handleWebSocketClose = useCallback((code: number, reason: string) => {
    setIsConnected(false);
    
    if (code !== 1000 && isRecording && webSocketRef.current) {
      console.log('Abnormal WebSocket closure, attempting to reconnect...');
      webSocketRef.current.retry();
    } else {
      setIsConnecting(false);
    }
  }, [isRecording]);

  const setupConnection = async () => {
    try {
      console.log('Setting up realtime transcription connection...');
      setError(null);
      
      // Initialize audio processor if needed
      if (!audioProcessorRef.current) {
        audioProcessorRef.current = new AudioProcessor();
      }
      
      // Initialize WebSocket if needed
      if (!webSocketRef.current) {
        webSocketRef.current = new TranscriptionWebSocket({
          onMessage: handleWebSocketMessage,
          onClose: handleWebSocketClose,
          onOpen: () => {
            // WebSocket is open but not yet authenticated
          },
          onError: (err) => {
            setError(`Erro na conexão: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
          },
          maxRetryAttempts: 3,
          initialBackoffTime: 1000
        });
      }
      
      // Connect to WebSocket
      const wsConnected = await webSocketRef.current.connect();
      
      if (wsConnected && webSocketRef.current) {
        const wsInstance = webSocketRef.current as any;
        
        if (wsInstance.ws) {
          try {
            // Setup microphone with the WebSocket connection
            await audioProcessorRef.current.setupMicrophone(wsInstance.ws);
          } catch (micError) {
            console.error('Error setting up microphone:', micError);
            setError('Erro ao acessar o microfone. Verifique se as permissões estão concedidas.');
            cleanupConnection();
          }
        }
      } else {
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Error setting up connection:', error);
      setError('Erro ao configurar conexão de transcrição em tempo real');
      setIsConnecting(false);
    }
  };

  const cleanupConnection = () => {
    console.log('Cleaning up transcription connection...');
    
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
    
    if (audioProcessorRef.current) {
      audioProcessorRef.current.cleanup();
      audioProcessorRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    console.log('Transcription connection cleanup complete');
  };

  return {
    isConnecting,
    isConnected,
    realtimeText,
    error,
    setError
  };
};
