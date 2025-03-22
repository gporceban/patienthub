
import React, { useCallback, useMemo } from 'react';
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
    connectionAttempts
  } = useRealtimeTranscription({
    isRecording: shouldUseRealtime,
    onTranscriptionUpdate: stableCallback
  });
  
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
