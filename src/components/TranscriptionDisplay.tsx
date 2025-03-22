
import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface TranscriptionDisplayProps {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  text: string;
  isRecording: boolean;
  isTranscribing: boolean;
  transcription: string;
  connectionAttempts: number;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  isConnecting,
  isConnected,
  error,
  text,
  isRecording,
  isTranscribing,
  transcription,
  connectionAttempts
}) => {
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
        {isRecording && isConnected ? text : transcription}
      </div>
      
      {!isRecording && !transcription && !isTranscribing && (
        <div className="text-gray-500 italic">
          Inicie a gravação para capturar o áudio da consulta
        </div>
      )}
    </div>
  );
};

export default TranscriptionDisplay;
