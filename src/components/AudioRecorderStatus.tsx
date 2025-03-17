
import React from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

type StatusProps = {
  isRecording: boolean;
  isTranscribing: boolean;
  isProcessing: boolean;
  hasError: boolean;
  transcriptionComplete: boolean;
  processingComplete: boolean;
};

const AudioRecorderStatus: React.FC<StatusProps> = ({
  isRecording,
  isTranscribing,
  isProcessing,
  hasError,
  transcriptionComplete,
  processingComplete
}) => {
  
  if (hasError) {
    return (
      <div className="flex items-center text-red-500 mt-4">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>Ocorreu um erro no processamento</span>
      </div>
    );
  }
  
  if (isRecording) {
    return (
      <div className="flex items-center text-red-500 mt-4 animate-pulse">
        <span className="h-3 w-3 rounded-full bg-red-500 mr-2"></span>
        <span>Gravando consulta...</span>
      </div>
    );
  }
  
  if (isTranscribing) {
    return (
      <div className="flex items-center text-blue-400 mt-4">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <span>Transcrevendo áudio...</span>
      </div>
    );
  }
  
  if (isProcessing) {
    return (
      <div className="flex flex-col items-start mt-4">
        <div className="flex items-center text-blue-400 mb-2">
          {transcriptionComplete ? (
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          <span className={transcriptionComplete ? "text-green-500" : ""}>
            Transcrição de áudio
          </span>
        </div>
        
        <div className="flex items-center text-blue-400">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span>Gerando documentos clínicos...</span>
        </div>
      </div>
    );
  }
  
  if (processingComplete) {
    return (
      <div className="flex items-center text-green-500 mt-4">
        <CheckCircle className="h-5 w-5 mr-2" />
        <span>Processamento concluído com sucesso</span>
      </div>
    );
  }
  
  return null;
};

export default AudioRecorderStatus;
