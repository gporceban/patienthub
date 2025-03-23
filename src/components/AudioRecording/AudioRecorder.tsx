import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useTranscription } from '@/hooks/useTranscription';
import { useFileUpload } from '@/hooks/useFileUpload';
import AudioRecorderStatus from '../AudioRecorderStatus';
import RealtimeTranscription from '../RealtimeTranscription';
import RecorderControls from './RecorderControls';
import AudioVisualizer from './AudioVisualizer';
import AgentProgressIndicator from './AgentProgressIndicator';
import { useToast } from '@/components/ui/use-toast';

interface AudioRecorderProps {
  onTranscriptionComplete: (transcription: string) => void;
  onProcessingStart: () => void;
  onProcessingComplete: (data: {
    clinical_note?: string;
    prescription?: string;
    summary?: string;
    structured_data?: any;
  }) => void;
  patientInfo?: {
    prontuarioId?: string;
    email?: string;
  };
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onTranscriptionComplete,
  onProcessingStart,
  onProcessingComplete,
  patientInfo
}) => {
  const [useRealtimeTranscription, setUseRealtimeTranscription] = useState(true);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();
  
  const [agentProgress, setAgentProgress] = useState({
    patientInfo: false,
    symptoms: false,
    examFindings: false,
    diagnosis: false,
    treatment: false,
    orchestration: false
  });
  
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize custom hooks
  const { 
    isRecording, 
    audioLevel, 
    startRecording, 
    stopRecording,
    cleanupResources
  } = useAudioRecorder({
    useRealtimeTranscription
  });
  
  const {
    isTranscribing,
    isProcessing,
    isUploading,
    transcriptionComplete,
    processingComplete,
    currentTranscription: hookTranscription,
    setCurrentTranscription: setHookTranscription,
    transcribeAudio,
    uploadAndTranscribeAudio
  } = useTranscription({
    onTranscriptionComplete,
    onProcessingStart,
    onProcessingComplete,
    patientInfo
  });
  
  const {
    uploadedFileName,
    fileInputRef,
    handleFileUpload,
    handleUploadClick
  } = useFileUpload({
    onFileLoaded: (blob, fileName) => {
      setAudioBlob(blob);
    }
  });
  
  // Listen for events to disable realtime transcription
  useEffect(() => {
    const handleDisableRealtime = () => {
      setUseRealtimeTranscription(false);
      toast({
        title: "Transcrição em tempo real desativada",
        description: "Usando transcrição normal para melhor compatibilidade.",
      });
    };
    
    document.addEventListener('disable-realtime-transcription', handleDisableRealtime);
    
    return () => {
      document.removeEventListener('disable-realtime-transcription', handleDisableRealtime);
    };
  }, [toast]);
  
  // Update transcription from hook
  useEffect(() => {
    if (hookTranscription) {
      setCurrentTranscription(hookTranscription);
    }
  }, [hookTranscription]);

  // Cleanup function
  useEffect(() => {
    return () => {
      cleanupResources();
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
    };
  }, [cleanupResources]);

  // Handle agent progress simulation
  useEffect(() => {
    if (isProcessing && !processingComplete) {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
      
      setAgentProgress({
        patientInfo: false,
        symptoms: false,
        examFindings: false,
        diagnosis: false,
        treatment: false,
        orchestration: false
      });
      
      progressTimerRef.current = setTimeout(() => {
        setAgentProgress(prev => ({ ...prev, patientInfo: true }));
        
        progressTimerRef.current = setTimeout(() => {
          setAgentProgress(prev => ({ ...prev, symptoms: true }));
          
          progressTimerRef.current = setTimeout(() => {
            setAgentProgress(prev => ({ ...prev, examFindings: true }));
            
            progressTimerRef.current = setTimeout(() => {
              setAgentProgress(prev => ({ ...prev, diagnosis: true }));
              
              progressTimerRef.current = setTimeout(() => {
                setAgentProgress(prev => ({ ...prev, treatment: true }));
                
                progressTimerRef.current = setTimeout(() => {
                  setAgentProgress(prev => ({ ...prev, orchestration: true }));
                }, 3000);
              }, 2000);
            }, 2000);
          }, 2000);
        }, 1500);
      }, 1000);
    }
    
    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
    };
  }, [isProcessing, processingComplete]);

  // Handler functions
  const handleStartRecording = async () => {
    setHasError(false);
    setErrorMessage('');
    
    try {
      await startRecording();
    } catch (error) {
      setHasError(true);
      setErrorMessage('Erro ao acessar o microfone. Verifique permissões de navegador e hardware.');
      console.error('Error starting recording:', error);
    }
  };

  const handleTranscribeAudio = () => {
    if (uploadedFileName) {
      uploadAndTranscribeAudio(audioBlob);
    } else {
      transcribeAudio(audioBlob, useRealtimeTranscription ? currentTranscription : '');
    }
  };

  const handleRealtimeTranscriptionUpdate = (text: string) => {
    setCurrentTranscription(text);
    setHookTranscription(text);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-medium mb-2">Gravação de Áudio</h3>
        <p className="text-sm text-gray-400 mb-4">
          {patientInfo 
            ? "Grave ou envie o áudio da consulta para gerar documentos integrados com o histórico do paciente" 
            : "Grave ou envie o áudio da consulta para gerar documentos automaticamente utilizando Agentes IA especializados"
          }
        </p>
        
        <div className="w-full relative mb-4">
          <RealtimeTranscription 
            isRecording={isRecording} 
            transcription={currentTranscription}
            isTranscribing={isTranscribing}
            onTranscriptionUpdate={useRealtimeTranscription ? handleRealtimeTranscriptionUpdate : undefined}
          />
          
          <AudioVisualizer 
            audioLevel={audioLevel} 
            isRecording={isRecording} 
          />
        </div>
        
        <div className="flex items-center mb-4">
          <div className="flex items-center mr-4">
            <input
              type="checkbox"
              id="realtimeTranscription"
              checked={useRealtimeTranscription}
              onChange={(e) => setUseRealtimeTranscription(e.target.checked)}
              className="mr-2 h-4 w-4 text-gold-500 rounded border-gray-600 focus:ring-gold-500"
              disabled={isRecording}
            />
            <label htmlFor="realtimeTranscription" className="text-sm text-gray-300">
              Usar transcrição em tempo real
            </label>
          </div>
          {useRealtimeTranscription && (
            <p className="text-xs text-gold-500">
              A transcrição aparecerá enquanto você fala
            </p>
          )}
        </div>
        
        <RecorderControls
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          isProcessing={isProcessing}
          isUploading={isUploading}
          audioBlob={audioBlob}
          fileInputRef={fileInputRef}
          onStartRecording={handleStartRecording}
          onStopRecording={stopRecording}
          onUploadClick={handleUploadClick}
          onTranscribeAudio={handleTranscribeAudio}
          onFileUpload={handleFileUpload}
          uploadedFileName={uploadedFileName}
        />
        
        {hasError && (
          <div className="flex items-center text-red-500 mt-1 mb-2">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="text-sm">{errorMessage}</span>
          </div>
        )}
        
        {isProcessing && !processingComplete && (
          <AgentProgressIndicator 
            agentProgress={agentProgress}
            transcriptionComplete={transcriptionComplete}
          />
        )}
        
        <AudioRecorderStatus 
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          isProcessing={isProcessing}
          hasError={hasError}
          errorMessage={errorMessage}
          transcriptionComplete={transcriptionComplete}
          processingComplete={processingComplete}
          agentProgress={agentProgress}
          isUploading={isUploading}
        />
      </div>
      
      {currentTranscription && (
        <div className="mt-6">
          <h3 className="text-md font-medium mb-2">Transcrição</h3>
          <div className="bg-darkblue-900/50 p-4 rounded-md border border-darkblue-700 overflow-y-auto max-h-60">
            <p className="text-sm whitespace-pre-wrap">{currentTranscription}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
