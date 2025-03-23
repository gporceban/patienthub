
import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import TranscriptionDisplay from './TranscriptionDisplay';
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
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevIsRecordingRef = useRef(isRecording);
  const [useRealtime, setUseRealtime] = useState(true);
  const { toast } = useToast();
  
  // Use a stable callback that only changes when onTranscriptionUpdate changes
  const stableCallback = useCallback((text: string) => {
    if (onTranscriptionUpdate) {
      onTranscriptionUpdate(text);
    }
  }, [onTranscriptionUpdate]);
  
  // Only use the realtime transcription if we're recording, have a callback, and useRealtime is true
  const shouldUseRealtime = useMemo(() => {
    return isRecording && !!onTranscriptionUpdate && useRealtime;
  }, [isRecording, onTranscriptionUpdate, useRealtime]);
  
  const {
    isConnecting,
    isConnected,
    error,
    text,
    connectionAttempts,
    cleanupResources
  } = useRealtimeTranscription({
    isRecording: shouldUseRealtime,
    onTranscriptionUpdate: stableCallback
  });
  
  // Listen for the disable-realtime-transcription event
  useEffect(() => {
    const handleDisableRealtime = () => {
      setUseRealtime(false);
      toast({
        title: "Transcrição em tempo real desativada",
        description: "Usando modo de transcrição padrão agora.",
        variant: "default",
      });
    };
    
    document.addEventListener('disable-realtime-transcription', handleDisableRealtime);
    
    return () => {
      document.removeEventListener('disable-realtime-transcription', handleDisableRealtime);
    };
  }, [toast]);
  
  // Properly handle recording state changes with a delay to prevent premature cleanup
  useEffect(() => {
    if (prevIsRecordingRef.current && !isRecording) {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      
      // Delay cleanup by 3 seconds to ensure all processing is complete
      cleanupTimeoutRef.current = setTimeout(() => {
        cleanupResources();
      }, 3000);
    }
    
    prevIsRecordingRef.current = isRecording;
    
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [isRecording, cleanupResources]);
  
  // If not using realtime transcription, return a simpler display
  if (!useRealtime) {
    return (
      <div className="p-4 border border-darkblue-700 bg-darkblue-900 rounded-lg h-32 overflow-auto relative">
        {isRecording && (
          <div className="flex items-center text-blue-400 mb-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
            <span>Gravando (modo de transcrição padrão)</span>
          </div>
        )}
        {isTranscribing && !isRecording && (
          <div className="flex items-center text-blue-400 mb-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
            <span>Transcrevendo áudio...</span>
          </div>
        )}
        <div className="text-gray-200">
          {transcription}
        </div>
        {!isRecording && !transcription && !isTranscribing && (
          <div className="text-gray-500 italic">
            Inicie a gravação para capturar o áudio da consulta
          </div>
        )}
      </div>
    );
  }
  
  return (
    <TranscriptionDisplay
      isConnecting={isConnecting}
      isConnected={isConnected}
      error={error}
      text={text}
      isRecording={isRecording}
      isTranscribing={isTranscribing}
      transcription={transcription}
      connectionAttempts={connectionAttempts}
    />
  );
};

export default React.memo(RealtimeTranscription);
