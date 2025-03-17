
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onTranscriptionComplete,
  onProcessingStart,
  onProcessingComplete
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        setAudioBlob(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: "Gravação iniciada",
        description: "Fale claramente para obter os melhores resultados."
      });
    } catch (error) {
      console.error('Erro ao acessar o microfone:', error);
      toast({
        variant: "destructive",
        title: "Erro ao acessar o microfone",
        description: "Verifique se o microfone está conectado e se você concedeu permissão para usá-lo."
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Gravação finalizada",
        description: "Áudio capturado com sucesso."
      });
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob) {
      toast({
        variant: "destructive",
        title: "Sem áudio",
        description: "Nenhum áudio foi gravado para transcrição."
      });
      return;
    }

    setIsTranscribing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error('Falha ao converter áudio para base64');
        }
        
        // Call Supabase Edge Function for transcription
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });
        
        if (error) {
          throw error;
        }
        
        if (data?.text) {
          toast({
            title: "Transcrição completa",
            description: "O áudio foi transcrito com sucesso."
          });
          
          onTranscriptionComplete(data.text);
          
          // Now process the transcription with OpenAI to generate documents
          processTranscription(data.text);
        } else {
          throw new Error('Nenhum texto recebido da transcrição');
        }
      };
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      toast({
        variant: "destructive",
        title: "Erro na transcrição",
        description: "Não foi possível transcrever o áudio. Tente novamente."
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const processTranscription = async (transcription: string) => {
    onProcessingStart();
    setIsProcessing(true);
    
    try {
      // Process the transcription with OpenAI to generate clinical documents
      const { data, error } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'clinical_note',
          reviewRequired: true
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Now get the summary
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'summary',
          reviewRequired: true
        }
      });
      
      if (summaryError) {
        throw summaryError;
      }
      
      // Now get the prescription
      const { data: prescriptionData, error: prescriptionError } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'prescription',
          reviewRequired: true
        }
      });
      
      if (prescriptionError) {
        throw prescriptionError;
      }
      
      // Now get structured data
      const { data: structuredData, error: structuredError } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'structured_data',
          reviewRequired: false
        }
      });
      
      if (structuredError) {
        throw structuredError;
      }
      
      toast({
        title: "Documentos gerados",
        description: "Nota clínica, prescrição e resumo foram gerados com sucesso."
      });
      
      onProcessingComplete({
        clinical_note: data?.text,
        prescription: prescriptionData?.text,
        summary: summaryData?.text,
        structured_data: structuredData?.structuredData
      });
    } catch (error) {
      console.error('Erro ao processar transcrição:', error);
      toast({
        variant: "destructive",
        title: "Erro no processamento",
        description: "Não foi possível processar a transcrição. Tente novamente."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-medium mb-2">Gravação de Áudio</h3>
        <p className="text-sm text-gray-400 mb-4">
          Grave a consulta para gerar documentos automaticamente
        </p>
        
        <div className="flex gap-4 mb-4">
          {!isRecording ? (
            <Button 
              onClick={startRecording} 
              className="bg-gold-500 hover:bg-gold-600 text-black"
              disabled={isTranscribing || isProcessing}
            >
              <Mic className="h-4 w-4 mr-2" />
              Iniciar Gravação
            </Button>
          ) : (
            <Button 
              onClick={stopRecording} 
              variant="destructive"
            >
              <Square className="h-4 w-4 mr-2" />
              Parar Gravação
            </Button>
          )}
          
          {audioBlob && !isRecording && (
            <Button 
              onClick={transcribeAudio} 
              variant="outline" 
              disabled={isTranscribing || isProcessing}
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transcrevendo...
                </>
              ) : (
                <>
                  Transcrever e Processar
                </>
              )}
            </Button>
          )}
        </div>
        
        {(isTranscribing || isProcessing) && (
          <div className="flex flex-col items-center">
            <Loader2 className="h-6 w-6 animate-spin mb-2" />
            <p className="text-sm text-gray-400">
              {isTranscribing ? 'Transcrevendo áudio...' : 'Gerando documentos...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;
