
import React from 'react';
import { Loader2 } from 'lucide-react';

interface RealtimeTranscriptionProps {
  isRecording: boolean;
  transcription: string;
  isTranscribing: boolean;
}

const RealtimeTranscription: React.FC<RealtimeTranscriptionProps> = ({ 
  isRecording, 
  transcription,
  isTranscribing
}) => {
  return (
    <div className={`w-full h-20 rounded-md overflow-hidden ${isRecording ? 'bg-darkblue-800/80' : 'bg-darkblue-900/50'} relative`}>
      {isRecording && !transcription && !isTranscribing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Gravando áudio... Começe a falar.</p>
        </div>
      )}
      
      {isTranscribing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 mr-2 text-gold-500 animate-spin" />
          <p className="text-gray-300 text-sm">Transcrevendo áudio...</p>
        </div>
      )}
      
      {transcription && (
        <div className="absolute inset-0 p-3 overflow-y-auto">
          <p className="text-white text-sm font-medium">
            {transcription}
          </p>
          {isRecording && (
            <span className="inline-block w-2 h-4 ml-1 bg-gold-500 animate-pulse"></span>
          )}
        </div>
      )}
      
      {!isRecording && !transcription && !isTranscribing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400 text-sm">A transcrição aparecerá aqui quando a gravação iniciar</p>
        </div>
      )}
    </div>
  );
};

export default RealtimeTranscription;
