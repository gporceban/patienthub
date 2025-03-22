
import React, { useCallback } from 'react';
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
  // Prevent callback changes causing re-renders
  const stableCallback = useCallback((text: string) => {
    if (onTranscriptionUpdate) {
      onTranscriptionUpdate(text);
    }
  }, [onTranscriptionUpdate]);
  
  const {
    isConnecting,
    isConnected,
    error,
    text,
    connectionAttempts
  } = useRealtimeTranscription({
    isRecording,
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
