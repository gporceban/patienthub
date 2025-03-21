import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { blobToBase64 } from '@/utils/audioUtils';

interface UseTranscriptionProps {
  onTranscriptionComplete?: (text: string) => void;
  onProcessingStart?: () => void;
  onProcessingComplete?: (data: {
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

export const useTranscription = ({
  onTranscriptionComplete,
  onProcessingStart,
  onProcessingComplete,
  patientInfo
}: UseTranscriptionProps = {}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [transcriptionComplete, setTranscriptionComplete] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const { toast } = useToast();
  
  const transcribeAudioChunk = async (blob: Blob, isFinal: boolean) => {
    try {
      console.log(`${isFinal ? 'Final' : 'Interim'} transcription of audio blob:`, blob.size);
      if (isFinal) {
        setIsTranscribing(true);
      }
      
      const base64Audio = await blobToBase64(blob);
      
      console.log("Sending audio to transcription API...");
      console.log("Base64 audio length:", base64Audio.length);
      
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio }
      });
      
      if (error) {
        console.error("Transcription API error:", error);
        throw error;
      }
      
      console.log("Transcription API response:", data);
      if (data?.text) {
        if (isFinal) {
          setTranscriptionComplete(true);
          toast({
            title: "Transcrição completa",
            description: "O áudio foi transcrito com sucesso e está sendo processado pelo sistema de agentes IA."
          });
          
          if (onTranscriptionComplete) {
            onTranscriptionComplete(data.text);
          }
          processTranscription(data.text);
        } else {
          setCurrentTranscription(data.text);
        }
      } else {
        throw new Error('Nenhum texto recebido da transcrição');
      }
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      if (isFinal) {
        setHasError(true);
        setIsTranscribing(false);
        setErrorMessage(`Erro na transcrição: ${error instanceof Error ? error.message : 'Motivo desconhecido'}`);
        toast({
          variant: "destructive",
          title: "Erro na transcrição",
          description: "Não foi possível transcrever o áudio. Tente novamente."
        });
      }
    }
  };

  const transcribeAudio = async (audioBlob: Blob | null, existingTranscription: string = '') => {
    if (!audioBlob) {
      toast({
        variant: "destructive",
        title: "Sem áudio",
        description: "Nenhum áudio foi gravado para transcrição."
      });
      return;
    }

    try {
      console.log("Starting transcription of recorded audio, blob size:", audioBlob.size);
      setIsTranscribing(true);
      setHasError(false);
      setErrorMessage('');
      
      if (existingTranscription) {
        setTranscriptionComplete(true);
        if (onTranscriptionComplete) {
          onTranscriptionComplete(existingTranscription);
        }
        processTranscription(existingTranscription);
      } else {
        await transcribeAudioChunk(audioBlob, true);
      }
    } catch (error) {
      console.error("Error in transcribeAudio:", error);
      setHasError(true);
      setIsTranscribing(false);
      setErrorMessage(`Erro na transcrição: ${error instanceof Error ? error.message : 'Motivo desconhecido'}`);
      toast({
        variant: "destructive",
        title: "Erro na transcrição",
        description: "Não foi possível transcrever o áudio. Tente novamente."
      });
    }
  };

  const uploadAndTranscribeAudio = async (audioBlob: Blob | null) => {
    if (!audioBlob) {
      toast({
        variant: "destructive",
        title: "Sem áudio",
        description: "Nenhum arquivo de áudio foi carregado para transcrição."
      });
      return;
    }
    
    try {
      setIsUploading(true);
      setIsTranscribing(true);
      setHasError(false);
      setErrorMessage('');
      
      console.log("Processing uploaded audio file, size:", audioBlob.size, "type:", audioBlob.type);
      await transcribeAudioChunk(audioBlob, true);
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      setHasError(true);
      setIsTranscribing(false);
      setErrorMessage(`Erro na transcrição: ${error instanceof Error ? error.message : 'Motivo desconhecido'}`);
      toast({
        variant: "destructive",
        title: "Erro na transcrição",
        description: "Não foi possível transcrever o áudio. Tente novamente."
      });
    } finally {
      setIsUploading(false);
      setIsTranscribing(false);
    }
  };

  const processTranscription = async (transcription: string) => {
    if (onProcessingStart) {
      onProcessingStart();
    }
    setIsProcessing(true);
    setHasError(false);
    setErrorMessage('');
    
    try {
      const patientHistoryParam = patientInfo ? {
        prontuarioId: patientInfo.prontuarioId,
        email: patientInfo.email
      } : null;
      
      console.log("Processing transcription for clinical note...");
      console.log("PatientHistoryParam:", patientHistoryParam);
      
      const { data, error } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'clinical_note',
          reviewRequired: true,
          patientInfo: patientHistoryParam
        }
      });
      
      if (error) {
        console.error("Error processing clinical note:", error);
        throw error;
      }
      
      console.log("Clinical note processing response:", data);
      
      console.log("Processing transcription for summary...");
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'summary',
          reviewRequired: true,
          patientInfo: patientHistoryParam
        }
      });
      
      if (summaryError) {
        console.error("Error processing summary:", summaryError);
        throw summaryError;
      }
      
      console.log("Summary processing response:", summaryData);
      
      console.log("Processing transcription for prescription...");
      const { data: prescriptionData, error: prescriptionError } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'prescription',
          reviewRequired: true,
          patientInfo: patientHistoryParam
        }
      });
      
      if (prescriptionError) {
        console.error("Error processing prescription:", prescriptionError);
        throw prescriptionError;
      }
      
      console.log("Prescription processing response:", prescriptionData);
      
      console.log("Processing transcription for structured data...");
      const { data: structuredData, error: structuredError } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'structured_data',
          reviewRequired: false,
          patientInfo: patientHistoryParam
        }
      });
      
      if (structuredError) {
        console.error("Error processing structured data:", structuredError);
        throw structuredError;
      }
      
      console.log("Structured data processing response:", structuredData);
      
      setProcessingComplete(true);
      const historyMessage = patientInfo ? "integrado com histórico do paciente" : "";
      
      toast({
        title: "Documentos gerados",
        description: `Nota clínica, prescrição e resumo foram gerados pelos agentes IA com sucesso ${historyMessage}.`
      });
      
      if (onProcessingComplete) {
        onProcessingComplete({
          clinical_note: data?.text,
          prescription: prescriptionData?.text,
          summary: summaryData?.text,
          structured_data: structuredData?.structuredData
        });
      }
    } catch (error) {
      console.error('Erro ao processar transcrição:', error);
      setHasError(true);
      setErrorMessage(`Erro no processamento: ${error instanceof Error ? error.message : 'Motivo desconhecido'}`);
      toast({
        variant: "destructive",
        title: "Erro no processamento",
        description: "Não foi possível processar a transcrição. Tente novamente."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isTranscribing,
    isProcessing,
    isUploading,
    hasError,
    errorMessage,
    transcriptionComplete,
    processingComplete,
    currentTranscription,
    setCurrentTranscription,
    transcribeAudio,
    uploadAndTranscribeAudio,
    processTranscription
  };
};
