
import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { processAudioLevel } from '@/utils/audioUtils';

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeText, setRealtimeText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastTranscriptId, setLastTranscriptId] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const sessionTokenRef = useRef<string | null>(null);

  // Cleanup WebSocket connection
  const cleanupWebSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  };
  
  // Effect to handle connection and cleanup
  useEffect(() => {
    if (isRecording && onTranscriptionUpdate && !isConnected && !isConnecting) {
      setIsConnecting(true);
      setupRealtimeTranscription();
    }
    
    if (!isRecording && (isConnected || isConnecting)) {
      cleanupRealtimeTranscription();
    }
    
    return () => {
      cleanupRealtimeTranscription();
    };
  }, [isRecording, onTranscriptionUpdate]);
  
  useEffect(() => {
    if (onTranscriptionUpdate && realtimeText) {
      onTranscriptionUpdate(realtimeText);
    }
  }, [realtimeText, onTranscriptionUpdate]);

  const setupRealtimeTranscription = async () => {
    try {
      // Obter token de sessão da função Edge
      const { data: sessionData, error: tokenError } = await supabase.functions.invoke("realtime-transcription-token");
      
      if (tokenError) {
        console.error("Error getting transcription token:", tokenError);
        throw new Error(`Erro ao obter token de transcrição: ${tokenError.message}`);
      }
      
      if (!sessionData || !sessionData.client_secret?.value) {
        throw new Error("Token de transcrição inválido ou ausente");
      }
      
      sessionTokenRef.current = sessionData.client_secret.value;
      console.log("Received transcription session token, connecting WebSocket...");
      
      // Iniciar WebSocket
      const websocket = new WebSocket("wss://api.openai.com/v1/realtime");
      websocketRef.current = websocket;
      
      websocket.onopen = async () => {
        console.log("WebSocket connection established, starting audio capture...");
        await setupMicrophone();
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data.type);
          
          if (data.type === "conversation.item.input_audio_transcription.delta") {
            const newText = data.delta || "";
            setRealtimeText((prev) => prev + newText);
          } 
          else if (data.type === "conversation.item.input_audio_transcription.completed") {
            const completeText = data.transcript || "";
            if (data.item_id !== lastTranscriptId) {
              setLastTranscriptId(data.item_id);
              setRealtimeText(completeText);
            }
          }
          else if (data.type === "session.created") {
            console.log("Transcription session created successfully");
            
            // Enviar configuração da sessão
            websocket.send(JSON.stringify({
              type: "transcription_session.update",
              input_audio_format: "pcm16",
              input_audio_transcription: {
                model: "gpt-4o-transcribe",
                prompt: "Vocabulário médico, terminologia ortopédica",
                language: "pt"
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
          }
          else if (data.type === "error") {
            console.error("WebSocket error:", data);
            setError(`Erro na transcrição: ${data.message || "Erro desconhecido"}`);
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e, event.data);
        }
      };
      
      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Erro na conexão WebSocket. Tente novamente.");
        setIsConnected(false);
        setIsConnecting(false);
      };
      
      websocket.onclose = () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch (error) {
      console.error('Error setting up real-time transcription:', error);
      setError(`Erro ao configurar transcrição em tempo real: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setIsConnecting(false);
    }
  };

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
      
      mediaStreamRef.current = stream;
      
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }
      
      const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
      audioContextRef.current = newAudioContext;
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Usar ScriptProcessor para processar áudio
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!isConnected || !websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Converter Float32Array para Int16Array (PCM16)
        const pcmData = encodeAudioForAPI(inputData);
        
        // Enviar para a API Realtime
        try {
          websocketRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: pcmData
          }));
        } catch (err) {
          console.error("Error sending audio data:", err);
        }
      };
      
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      console.log('Audio processing setup complete');
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Erro ao acessar o microfone. Verifique se as permissões estão concedidas.');
      return false;
    }
  };
  
  // Função para codificar áudio para a API
  const encodeAudioForAPI = (float32Array: Float32Array): string => {
    // Converter de Float32Array para Int16Array (PCM16)
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Converter para string binária e codificar em base64
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  };
  
  const cleanupRealtimeTranscription = () => {
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
    
    setIsConnected(false);
    setIsConnecting(false);
    console.log('Transcription resources cleaned up');
  };
  
  // Interface visual  
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
          <span>Configurando transcrição em tempo real...</span>
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
