
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseTranscriptionProps {
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

export const useTranscription = ({
  onTranscriptionComplete,
  onProcessingStart,
  onProcessingComplete,
  patientInfo
}: UseTranscriptionProps) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [transcriptionComplete, setTranscriptionComplete] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  
  const transcribeAudioChunk = async (blob: Blob, isFinal: boolean) => {
    try {
      console.log(`${isFinal ? 'Final' : 'Interim'} transcription of audio blob:`, blob.size);
      if (isFinal) {
        setIsTranscribing(true);
      }
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error('Falha ao converter áudio para base64');
        }
        
        console.log("Sending audio to transcription API...");
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
            onTranscriptionComplete(data.text);
            processTranscription(data.text);
          } else {
            // For interim transcription, just update the current text
            setCurrentTranscription(data.text);
          }
        } else {
          throw new Error('Nenhum texto recebido da transcrição');
        }
      };
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
    } finally {
      if (isFinal) {
        setIsTranscribing(false);
      }
    }
  };

  const transcribeAudio = useCallback(async (blob: Blob | null, realtimeTranscription: string = '') => {
    if (!blob) {
      console.error('No audio blob provided for transcription');
      return;
    }

    try {
      setIsTranscribing(true);
      
      // If we already have a real-time transcription, skip the transcription step
      if (realtimeTranscription) {
        console.log('Using existing real-time transcription:', realtimeTranscription);
        setCurrentTranscription(realtimeTranscription);
        setTranscriptionComplete(true);
        onTranscriptionComplete(realtimeTranscription);
        processTranscription(realtimeTranscription);
        return;
      }
      
      await transcribeAudioChunk(blob, true);
    } catch (error) {
      console.error('Error transcribing audio:', error);
    }
  }, [onTranscriptionComplete]);
  
  const uploadAndTranscribeAudio = useCallback(async (blob: Blob | null) => {
    if (!blob) {
      console.error('No audio blob provided for upload');
      return;
    }

    try {
      setIsUploading(true);
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error('Failed to convert audio to base64');
        }
        
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });
        
        if (error) {
          throw error;
        }
        
        if (data?.text) {
          setCurrentTranscription(data.text);
          setTranscriptionComplete(true);
          onTranscriptionComplete(data.text);
          processTranscription(data.text);
        } else {
          throw new Error('No text received from transcription');
        }
        
        setIsUploading(false);
      };
    } catch (error) {
      console.error('Error uploading and transcribing audio:', error);
      setIsUploading(false);
    }
  }, [onTranscriptionComplete]);
  
  const processTranscription = useCallback(async (transcription: string) => {
    onProcessingStart();
    setIsProcessing(true);
    
    try {
      const patientHistoryParam = patientInfo ? {
        prontuarioId: patientInfo.prontuarioId,
        email: patientInfo.email
      } : null;
      
      const { data, error } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'clinical_note',
          reviewRequired: true,
          patientInfo: patientHistoryParam
        }
      });
      
      if (error) {
        throw error;
      }
      
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'summary',
          reviewRequired: true,
          patientInfo: patientHistoryParam
        }
      });
      
      if (summaryError) {
        throw summaryError;
      }
      
      const { data: prescriptionData, error: prescriptionError } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'prescription',
          reviewRequired: true,
          patientInfo: patientHistoryParam
        }
      });
      
      if (prescriptionError) {
        throw prescriptionError;
      }
      
      const { data: structuredData, error: structuredError } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'structured_data',
          reviewRequired: false,
          patientInfo: patientHistoryParam
        }
      });
      
      if (structuredError) {
        throw structuredError;
      }
      
      setProcessingComplete(true);
      
      onProcessingComplete({
        clinical_note: data?.text,
        prescription: prescriptionData?.text,
        summary: summaryData?.text,
        structured_data: structuredData?.structuredData
      });
    } catch (error) {
      console.error('Error processing transcription:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [onProcessingStart, onProcessingComplete, patientInfo]);
  
  return {
    isTranscribing,
    isProcessing,
    isUploading,
    transcriptionComplete,
    processingComplete,
    currentTranscription,
    setCurrentTranscription,
    transcribeAudio,
    uploadAndTranscribeAudio
  };
};
