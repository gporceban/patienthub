
import React from 'react';
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
  const {
    isConnecting,
    isConnected,
    realtimeText,
    error,
    connectionAttempts
  } = useRealtimeTranscription({
    isRecording,
    onTranscriptionUpdate
  });

  // Determine which transcription to display
  const displayTranscription = isRecording && onTranscriptionUpdate && isConnected 
    ? realtimeText 
    : transcription;

  return (
    <TranscriptionDisplay
      isRecording={isRecording}
      isTranscribing={isTranscribing}
      isConnecting={isConnecting}
      isConnected={isConnected}
      error={error}
      connectionAttempts={connectionAttempts}
      transcription={transcription}
      customTranscription={displayTranscription}
    />
  );
};

export default RealtimeTranscription;
