
import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

type StatusProps = {
  isRecording: boolean;
  isTranscribing: boolean;
  isProcessing: boolean;
  isUploading?: boolean;
  hasError: boolean;
  transcriptionComplete: boolean;
  processingComplete: boolean;
  agentProgress?: {
    patientInfo?: boolean;
    symptoms?: boolean;
    examFindings?: boolean;
    diagnosis?: boolean;
    treatment?: boolean;
    orchestration?: boolean;
  };
  errorMessage?: string;
};

const AudioRecorderStatus: React.FC<StatusProps> = ({
  isRecording,
  isTranscribing,
  isProcessing,
  isUploading = false,
  hasError,
  transcriptionComplete,
  processingComplete,
  agentProgress = {},
  errorMessage
}) => {
  
  if (hasError) {
    return (
      <div className="flex items-center text-red-500 mt-4">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>{errorMessage || "Ocorreu um erro no processamento"}</span>
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
  
  if (isUploading) {
    return (
      <div className="flex items-center text-blue-400 mt-4">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <span>Enviando arquivo de áudio...</span>
      </div>
    );
  }
  
  if (isTranscribing) {
    return (
      <div className="flex items-center text-blue-400 mt-4">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <span>Transcrevendo áudio com modelo especializado em contexto médico...</span>
      </div>
    );
  }
  
  if (isProcessing) {
    return (
      <div className="flex flex-col items-start mt-4">
        <div className="flex items-center text-gold-500 mb-3">
          <Sparkles className="h-4 w-4 mr-2" />
          <span className="font-medium">Processamento com Agentes IA Especializados</span>
        </div>

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
        
        <div className="space-y-2 ml-6 text-sm">
          <div className="flex items-center">
            {agentProgress?.patientInfo ? 
              <CheckCircle className="h-3 w-3 mr-2 text-green-500" /> : 
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            }
            <span className={agentProgress?.patientInfo ? "text-green-500" : "text-blue-400"}>
              Agente de Extração de Dados do Paciente
            </span>
          </div>
          
          <div className="flex items-center">
            {agentProgress?.symptoms ? 
              <CheckCircle className="h-3 w-3 mr-2 text-green-500" /> : 
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            }
            <span className={agentProgress?.symptoms ? "text-green-500" : "text-blue-400"}>
              Agente de Extração de Sintomas
            </span>
          </div>
          
          <div className="flex items-center">
            {agentProgress?.examFindings ? 
              <CheckCircle className="h-3 w-3 mr-2 text-green-500" /> : 
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            }
            <span className={agentProgress?.examFindings ? "text-green-500" : "text-blue-400"}>
              Agente de Análise de Exames
            </span>
          </div>
          
          <div className="flex items-center">
            {agentProgress?.diagnosis ? 
              <CheckCircle className="h-3 w-3 mr-2 text-green-500" /> : 
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            }
            <span className={agentProgress?.diagnosis ? "text-green-500" : "text-blue-400"}>
              Agente de Diagnóstico Clínico
            </span>
          </div>
          
          <div className="flex items-center">
            {agentProgress?.treatment ? 
              <CheckCircle className="h-3 w-3 mr-2 text-green-500" /> : 
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            }
            <span className={agentProgress?.treatment ? "text-green-500" : "text-blue-400"}>
              Agente de Plano de Tratamento
            </span>
          </div>
        </div>
        
        <div className="flex items-center mt-3">
          {agentProgress?.orchestration ? 
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> : 
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          }
          <span className={agentProgress?.orchestration ? "text-green-500" : "text-blue-400"}>
            Agente Orquestrador de Documentos Clínicos
          </span>
        </div>
      </div>
    );
  }
  
  if (processingComplete) {
    return (
      <div className="flex items-center text-green-500 mt-4">
        <CheckCircle className="h-5 w-5 mr-2" />
        <span>Processamento concluído com sucesso por Agentes IA</span>
      </div>
    );
  }
  
  return null;
};

export default AudioRecorderStatus;
