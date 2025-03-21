import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface RealtimeTranscriptionProps {
  isRecording: boolean;
  transcription: string;
  isTranscribing: boolean;
  onTranscriptionUpdate?: (text: string) => void;
}

const RealtimeTranscription: React.FC<RealtimeTranscriptionProps> = ({ 
  isRecording, 
  transcription,
  isTranscribing,
  onTranscriptionUpdate
}) => {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const [currentTranscription, setCurrentTranscription] = useState<string>(transcription);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    if (!isConnected) {
      setCurrentTranscription(transcription);
    }
  }, [transcription, isConnected]);

  const encodeAudioData = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  };

  const setupAudio = useCallback(async () => {
    try {
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      audioContextRef.current = new AudioContext({
        sampleRate: 24000,
      });
      
      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const encodedAudio = encodeAudioData(inputData);
          
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          }));
        }
      };
      
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      return true;
    } catch (error) {
      console.error('Error setting up audio:', error);
      toast({
        variant: "destructive",
        title: "Erro ao acessar microfone",
        description: "Verifique se o microfone está conectado e se você concedeu permissão."
      });
      
      return false;
    }
  }, [toast]);

  const connectWebSocket = useCallback(async () => {
    if (isConnected || isConnecting) return;
    
    try {
      setIsConnecting(true);
      setError(null);
      
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
        'realtime-transcription-token'
      );
      
      if (tokenError || !tokenData?.client_secret?.value) {
        throw new Error(tokenError?.message || 'Failed to get authentication token');
      }
      
      const ephemeralToken = tokenData.client_secret.value;
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      wsRef.current = new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription');
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connection opened for transcription');
        if (!wsRef.current) return;
        
        wsRef.current.send(JSON.stringify({
          type: "transcription_session.update",
          input_audio_format: "pcm16",
          input_audio_transcription: {
            model: "gpt-4o-transcribe-latest",
            prompt: "",
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
        }));
        
        setupAudio().then(success => {
          if (success) {
            setIsConnected(true);
            setIsConnecting(false);
            toast({
              title: "Transcrição em tempo real conectada",
              description: "Fale claramente para obter melhores resultados."
            });
          } else {
            disconnectWebSocket();
          }
        });
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'transcription_session.updated') {
            console.log('Transcription session updated:', data);
          } else if (data.type === 'speech_started') {
            console.log('Speech started');
          } else if (data.type === 'speech_stopped') {
            console.log('Speech stopped');
          } else if (data.type === 'input_audio_transcription.parts') {
            console.log('Transcription parts:', data);
            if (data.parts && data.parts.length > 0) {
              const newText = data.parts.map((part: any) => part.text).join(' ');
              setCurrentTranscription(prev => {
                const updated = prev ? `${prev} ${newText}` : newText;
                if (onTranscriptionUpdate) {
                  onTranscriptionUpdate(updated);
                }
                return updated;
              });
            }
          } else if (data.type === 'input_audio_transcription.complete') {
            console.log('Transcription complete:', data);
            if (data.text) {
              setCurrentTranscription(data.text);
              if (onTranscriptionUpdate) {
                onTranscriptionUpdate(data.text);
              }
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Erro na conexão de transcrição');
        setIsConnected(false);
        setIsConnecting(false);
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        setIsConnecting(false);
      };
      
    } catch (error) {
      console.error('Error connecting to transcription service:', error);
      toast({
        variant: "destructive",
        title: "Erro na transcrição em tempo real",
        description: error instanceof Error ? error.message : "Falha ao conectar ao serviço de transcrição"
      });
      setError(error instanceof Error ? error.message : "Erro desconhecido");
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, onTranscriptionUpdate, setupAudio, toast]);

  const disconnectWebSocket = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  useEffect(() => {
    if (isRecording && !isConnected && !isConnecting) {
      connectWebSocket();
    } else if (!isRecording && (isConnected || isConnecting)) {
      disconnectWebSocket();
    }
    
    return () => {
      disconnectWebSocket();
    };
  }, [isRecording, isConnected, isConnecting, connectWebSocket, disconnectWebSocket]);

  return (
    <div className={`w-full h-20 rounded-md overflow-hidden ${isRecording ? 'bg-darkblue-800/80' : 'bg-darkblue-900/50'} relative border border-darkblue-700`}>
      {isRecording && !currentTranscription && !isTranscribing && (
        <div className="absolute inset-0 flex items-center justify-center">
          {isConnecting ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 text-gold-500 animate-spin" />
              <p className="text-gray-300 text-sm">Conectando serviço de transcrição...</p>
            </div>
          ) : (
            <div className="flex items-center">
              <p className="text-gray-300 text-sm">Gravando áudio... Começe a falar.</p>
              <span className="ml-2 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
            </div>
          )}
        </div>
      )}
      
      {isTranscribing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 mr-2 text-gold-500 animate-spin" />
          <p className="text-gray-300 text-sm">Transcrevendo áudio...</p>
        </div>
      )}
      
      {currentTranscription && (
        <div className="absolute inset-0 p-3 overflow-y-auto">
          <p className="text-white text-sm font-medium">
            {currentTranscription}
            {isRecording && isConnected && (
              <span className="inline-block w-2 h-4 ml-1 bg-gold-500 animate-pulse"></span>
            )}
          </p>
        </div>
      )}
      
      {!isRecording && !currentTranscription && !isTranscribing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400 text-sm">A transcrição aparecerá aqui quando a gravação iniciar</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
          <p className="text-white text-sm">
            {error}
          </p>
        </div>
      )}
    </div>
  );
};

export default RealtimeTranscription;
