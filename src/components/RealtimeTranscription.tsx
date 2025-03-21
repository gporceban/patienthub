import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeTranscriptionProps {
  isRecording: boolean;
  transcription: string;
  isTranscribing: boolean;
  onTranscriptionUpdate?: (text: string) => void;
}

interface LegacyAudioContext extends Omit<AudioContext, 'createScriptProcessor'> {
  createScriptProcessor?: (
    bufferSize: number,
    numberOfInputChannels: number,
    numberOfOutputChannels: number
  ) => ScriptProcessorNode;
}

const RealtimeTranscription: React.FC<RealtimeTranscriptionProps> = ({
  isRecording,
  transcription,
  isTranscribing,
  onTranscriptionUpdate
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeText, setRealtimeText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioData = useRef<Float32Array | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const maxRetryAttemptsRef = useRef<number>(3);
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffTimeRef = useRef<number>(1000);

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
  }, [isRecording, onTranscriptionUpdate]);
  
  useEffect(() => {
    if (onTranscriptionUpdate && realtimeText) {
      onTranscriptionUpdate(realtimeText);
    }
  }, [realtimeText, onTranscriptionUpdate]);

  const setupMicrophone = useCallback(async () => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
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
      
      mediaStreamRef.current = stream;
      
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }
      
      const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = newAudioContext;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      if ('audioWorklet' in audioContextRef.current) {
        try {
          await audioContextRef.current.audioWorklet.addModule('https://cdn.jsdelivr.net/npm/audio-worklet-polyfill@1.0.1/dist/worklet-processor.min.js');
          processorRef.current = new AudioWorkletNode(audioContextRef.current, 'worklet-processor');
          processorRef.current.port.onmessage = (e) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
            
            audioData.current = new Float32Array(e.data);
            const pcmData = convertToInt16(audioData.current);
            wsRef.current.send(pcmData.buffer);
          };
        } catch (workletError) {
          console.warn('AudioWorklet not supported or failed to load, falling back to ScriptProcessor:', workletError);
          const legacyContext = audioContextRef.current as unknown as LegacyAudioContext;
          if (legacyContext.createScriptProcessor) {
            processorRef.current = legacyContext.createScriptProcessor(4096, 1, 1);
            (processorRef.current as ScriptProcessorNode).onaudioprocess = (e) => {
              if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              audioData.current = new Float32Array(inputData.length);
              audioData.current.set(inputData);
              
              const pcmData = convertToInt16(audioData.current);
              wsRef.current.send(pcmData.buffer);
            };
          } else {
            console.error('Neither AudioWorklet nor ScriptProcessor is supported in this browser');
            throw new Error('Audio processing is not supported in this browser');
          }
        }
      } else {
        console.warn('AudioWorklet not supported, using deprecated ScriptProcessor');
        const legacyContext = audioContextRef.current as unknown as LegacyAudioContext;
        if (legacyContext.createScriptProcessor) {
          processorRef.current = legacyContext.createScriptProcessor(4096, 1, 1);
          (processorRef.current as ScriptProcessorNode).onaudioprocess = (e) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
            
            const inputData = e.inputBuffer.getChannelData(0);
            audioData.current = new Float32Array(inputData.length);
            audioData.current.set(inputData);
            
            const pcmData = convertToInt16(audioData.current);
            wsRef.current.send(pcmData.buffer);
          };
        } else {
          console.error('ScriptProcessor is not supported in this browser');
          throw new Error('Audio processing is not supported in this browser');
        }
      }
      
      source.connect(processorRef.current);
      
      if ('onaudioprocess' in processorRef.current) {
        processorRef.current.connect(audioContextRef.current.destination);
      }
      
      console.log('Audio processing setup complete');
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Erro ao acessar o microfone. Verifique se as permissões estão concedidas.');
      return false;
    }
  }, []);
  
  const cleanupMicrophone = useCallback(() => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {
        console.error('Error disconnecting processor:', e);
      }
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
    
    console.log('Microphone resources cleaned up');
  }, []);
  
  const retryConnection = useCallback(() => {
    if (retryCountRef.current < maxRetryAttemptsRef.current) {
      retryCountRef.current += 1;
      const backoffTime = backoffTimeRef.current * Math.pow(1.5, retryCountRef.current - 1);
      const jitter = backoffTime * 0.1 * Math.random();
      const retryTime = Math.min(10000, backoffTime + jitter);
      
      console.log(`Retrying connection (attempt ${retryCountRef.current} of ${maxRetryAttemptsRef.current}) in ${Math.round(retryTime)}ms...`);
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      retryTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, retryTime);
    } else {
      console.log('Max retry attempts reached, giving up...');
      setError('Falha ao conectar ao serviço de transcrição após várias tentativas. Por favor, tente novamente mais tarde.');
      setIsConnecting(false);
    }
  }, []);
  
  const convertToInt16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  };
  
  const setupConnection = async () => {
    try {
      console.log('Setting up realtime transcription connection...');
      setError(null);
      const micSetupSuccess = await setupMicrophone();
      
      if (micSetupSuccess) {
        await connectWebSocket();
      } else {
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Error setting up connection:', error);
      setError('Erro ao configurar conexão de transcrição em tempo real');
      setIsConnecting(false);
    }
  };
  
  const connectWebSocket = async () => {
    try {
      console.log('Requesting OpenAI token for transcription...');
      const { data, error } = await supabase.functions.invoke('realtime-transcription-token');
      
      if (error) {
        console.error('Error getting transcription token:', error);
        throw new Error(`Erro ao obter token: ${error.message}`);
      }
      
      if (!data?.client_secret?.value) {
        console.error('Invalid token response:', data);
        throw new Error('Token inválido recebido');
      }
      
      const token = data.client_secret.value;
      console.log('Token received, connecting to WebSocket...');
      
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          console.error('Error closing existing websocket:', e);
        }
      }
      
      wsRef.current = new WebSocket('wss://api.openai.com/v1/realtime/transcription');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connection opened for transcription');
        retryCountRef.current = 0;
        backoffTimeRef.current = 1000;
        
        if (!wsRef.current) return;
        
        const messageData = {
          bearer_token: token,
          model: 'whisper-1',
          encoding: 'linear16',
          sample_rate: 16000,
          language: 'pt',
          compression: 'none'
        };
        
        wsRef.current.send(JSON.stringify(messageData));
        console.log('Initialization message sent to WebSocket');
        setIsConnected(true);
        setIsConnecting(false);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.error) {
            console.error('WebSocket error from server:', data.error);
            setError(`Erro do servidor: ${data.error.message || data.error}`);
            return;
          }
          
          if (data.status === 'ok' && data.type === 'parameters_ok') {
            console.log('WebSocket parameters accepted');
          } else if (data.type === 'transcription') {
            if (data.text) {
              setRealtimeText(data.text);
            }
          } else if (data.status === 'error') {
            console.error('WebSocket transcription error:', data);
            setError(`Erro na transcrição: ${data.error || 'Erro desconhecido'}`);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, event.data);
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log(`WebSocket closed with code ${event.code}: ${event.reason}`);
        setIsConnected(false);
        
        if (event.code !== 1000 && isRecording) {
          console.log('Abnormal WebSocket closure, attempting to reconnect...');
          retryConnection();
        } else {
          setIsConnecting(false);
        }
      };
      
      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Erro na conexão de transcrição. Tentando reconectar...');
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setError(`Erro na conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setIsConnected(false);
      retryConnection();
    }
  };
  
  const cleanupConnection = () => {
    console.log('Cleaning up WebSocket connection...');
    
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      wsRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    cleanupMicrophone();
    setIsConnected(false);
    setIsConnecting(false);
    console.log('Connection cleanup complete');
  };
  
  if (isTranscribing && !isRecording) {
    return (
      <div className="p-4 border border-darkblue-700 bg-darkblue-900 rounded-lg h-32 overflow-auto relative">
        <div className="flex items-center text-blue-400 mb-2">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span>Transcrevendo áudio...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 border border-darkblue-700 bg-darkblue-900 rounded-lg h-32 overflow-auto relative">
      {isConnecting && !isConnected && !error && (
        <div className="flex items-center text-blue-400 mb-2">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span>Conectando ao serviço de transcrição...</span>
        </div>
      )}
      
      {isConnected && (
        <div className="flex items-center text-green-500 mb-2">
          <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
          <span>Transcrição em tempo real ativa</span>
        </div>
      )}
      
      {error && (
        <div className="text-red-500 mb-2">
          {error}
        </div>
      )}
      
      <div className="text-gray-200">
        {isRecording && onTranscriptionUpdate && isConnected ? realtimeText : transcription}
      </div>
      
      {!isRecording && !transcription && !isTranscribing && (
        <div className="text-gray-500 italic">
          Inicie a gravação para capturar o áudio da consulta
        </div>
      )}
    </div>
  );
};

export default RealtimeTranscription;
