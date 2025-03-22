
import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { useRealtimeTranscription } from '@/hooks/useRealtimeTranscription';
import TranscriptionDisplay from './TranscriptionDisplay';

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
  
  // Use a stable callback that only changes when onTranscriptionUpdate changes
  const stableCallback = useCallback((text: string) => {
    if (onTranscriptionUpdate) {
      onTranscriptionUpdate(text);
    }
  }, [onTranscriptionUpdate]);
  
  // Only use the realtime transcription if we're recording and have a callback
  const shouldUseRealtime = useMemo(() => {
    return isRecording && !!onTranscriptionUpdate;
  }, [isRecording, onTranscriptionUpdate]);
  
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
  
  // Properly handle recording state changes with a delay to prevent premature cleanup
  useEffect(() => {
    if (prevIsRecordingRef.current && !isRecording) {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      
      // Delay cleanup by 2 seconds to ensure all processing is complete
      cleanupTimeoutRef.current = setTimeout(() => {
        cleanupResources();
      }, 2000);
    }
    
    prevIsRecordingRef.current = isRecording;
    
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [isRecording, cleanupResources]);
  
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
