
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { processAudioLevel, encodeAudioForAPI } from '@/utils/audioUtils';

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
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const sessionTokenRef = useRef<string | null>(null);

  // Cleanup WebSocket connection
  const cleanupWebSocket = () => {
    if (websocketRef.current) {
      console.log("Closing WebSocket connection");
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
  }, [isRecording, onTranscriptionUpdate, isConnected, isConnecting]);
  
  useEffect(() => {
    if (onTranscriptionUpdate && realtimeText) {
      onTranscriptionUpdate(realtimeText);
    }
  }, [realtimeText, onTranscriptionUpdate]);

  const setupRealtimeTranscription = async () => {
    try {
      // Obter token de sessão da função Edge
      console.log("Requesting transcription token...");
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
      
      sessionTokenRef.current = sessionData.client_secret.value;
      console.log("Received transcription session token");
      
      // Connect using the WebSocket API with the token
      const websocketUrl = `wss://api.openai.com/v1/realtime?intent=transcription?token=${sessionTokenRef.current}`;
      console.log("Connecting to WebSocket with URL:", websocketUrl);
      
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      const websocket = new WebSocket(websocketUrl, {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1",
        },
      });
      websocketRef.current = websocket;
      
      websocket.onopen = async () => {
        console.log("WebSocket connection established successfully");
        
        // Successfully connected
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        setConnectionAttempts(0);
        
        // Setup microphone capture
        setupMicrophone();
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", data.type);
          
          if (data.type === "transcription.delta") {
            const newText = data.delta || "";
            setRealtimeText((prev) => prev + newText);
          } 
          else if (data.type === "transcription.completed") {
            const completeText = data.transcript || "";
            if (data.item_id !== lastTranscriptId) {
              setLastTranscriptId(data.item_id);
              setRealtimeText(completeText);
            }
          }
          else if (data.type === "error") {
            console.error("WebSocket error event:", data);
            setError(`Erro na transcrição: ${data.error?.message || data.message || "Erro desconhecido"}`);
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e, event.data);
        }
      };
      
      websocket.onerror = (error) => {
        console.error("WebSocket connection error:", error);
        setError("Erro na conexão WebSocket. Tente novamente.");
        setIsConnected(false);
        setIsConnecting(false);
        
        // Increment connection attempts
        setConnectionAttempts(prev => prev + 1);
      };
      
      websocket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} - ${event.reason}`);
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch (error) {
      console.error('Error setting up real-time transcription:', error);
      setError(`Erro ao configurar transcrição em tempo real: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setIsConnecting(false);
      
      // Increment connection attempts
      setConnectionAttempts(prev => prev + 1);
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
        <div className="text-red-500 mb-2 flex items-start">
          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Erro:</p>
            <p className="text-sm">{error}</p>
            {connectionAttempts > 2 && (
              <p className="text-xs mt-1">
                Problema persistente. Considere usar transcrição normal em vez de tempo real.
              </p>
            )}
          </div>
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
