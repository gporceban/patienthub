
import React from 'react';
import { Loader2, CheckCircle } from 'lucide-react';

interface AgentProgressProps {
  agentProgress: {
    patientInfo?: boolean;
    symptoms?: boolean;
    examFindings?: boolean;
    diagnosis?: boolean;
    treatment?: boolean;
    orchestration?: boolean;
  };
  transcriptionComplete: boolean;
}

const AgentProgressIndicator: React.FC<AgentProgressProps> = ({ 
  agentProgress, 
  transcriptionComplete
}) => {
  return (
    <div className="flex flex-col items-start mt-4">
      <div className="flex items-center text-gold-500 mb-3">
        <div className="h-4 w-4 mr-2 flex items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="h-4 w-4"
          >
            <path 
              fillRule="evenodd" 
              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
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
};

export default AgentProgressIndicator;
