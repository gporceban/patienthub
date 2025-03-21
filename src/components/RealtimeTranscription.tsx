
import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeTranscriptionProps {
  isRecording: boolean;
  transcription: string;
  isTranscribing: boolean;
  onTranscriptionUpdate?: (text: string) => void;
}

// Define a more correct type for legacy audio context
// We're using Omit to remove createScriptProcessor from AudioContext, then add it back as optional
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
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  
  // Removendo a lógica de WebSocket para simplificar e usar diretamente a função transcribe-audio
  
  useEffect(() => {
    if (!isConnected) {
      setRealtimeText('');
    }
  }, [isConnected]);

  useEffect(() => {
    if (isRecording && onTranscriptionUpdate && !isConnected && !isConnecting) {
      setIsConnecting(true);
      setupAudioRecording();
    }
    
    if (!isRecording && (isConnected || isConnecting)) {
      cleanupAudioRecording();
    }
    
    return () => {
      cleanupAudioRecording();
    };
  }, [isRecording, onTranscriptionUpdate]);
  
  useEffect(() => {
    if (onTranscriptionUpdate && realtimeText) {
      onTranscriptionUpdate(realtimeText);
    }
  }, [realtimeText, onTranscriptionUpdate]);

  const setupAudioRecording = async () => {
    try {
      await setupMicrophone();
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    } catch (error) {
      console.error('Error setting up audio recording:', error);
      setError('Erro ao configurar gravação de áudio. Verifique suas permissões de microfone.');
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
      
      // Usando ScriptProcessor diretamente, sem tentar usar AudioWorklet
      const legacyContext = audioContextRef.current as unknown as LegacyAudioContext;
      if (legacyContext.createScriptProcessor) {
        processorRef.current = legacyContext.createScriptProcessor(4096, 1, 1);
        (processorRef.current as ScriptProcessorNode).onaudioprocess = async (e) => {
          if (!isConnected) return;
          
          // Lógica simplificada para capturar áudio e enviar periodicamente para transcrição
          // Em um ambiente de produção, esta lógica seria mais complexa para lidar com chunks
          // de áudio maiores e reduzir chamadas à API
          
          const inputData = e.inputBuffer.getChannelData(0);
          // Enviar para transcrição a cada 5 segundos aproximadamente
        };
      } else {
        console.error('ScriptProcessor is not supported in this browser');
        throw new Error('Audio processing is not supported in this browser');
      }
      
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      console.log('Audio processing setup complete');
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Erro ao acessar o microfone. Verifique se as permissões estão concedidas.');
      return false;
    }
  };
  
  const cleanupAudioRecording = () => {
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
    
    setIsConnected(false);
    setIsConnecting(false);
    console.log('Audio resources cleaned up');
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
          <span>Configurando gravação de áudio...</span>
        </div>
      )}
      
      {isConnected && (
        <div className="flex items-center text-green-500 mb-2">
          <div className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
          <span>Captura de áudio ativa</span>
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
