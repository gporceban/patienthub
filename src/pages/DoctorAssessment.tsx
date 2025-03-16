
import React, { useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, StopCircle, Send, FileText, FilePen, FilePlus2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const DoctorAssessment = () => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [processingMode, setProcessingMode] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.oncanplaythrough = () => {
          console.log(`Audio duration: ${audio.duration} seconds`);
        };
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Gravação iniciada",
        description: "Sua avaliação está sendo gravada agora."
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        variant: "destructive",
        title: "Erro de gravação",
        description: "Não foi possível acessar o microfone. Verifique as permissões do navegador."
      });
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      toast({
        title: "Gravação finalizada",
        description: "A gravação da avaliação foi concluída com sucesso."
      });
    }
  };
  
  const transcribeAudio = async () => {
    if (!audioBlob) {
      toast({
        variant: "destructive",
        title: "Nenhum áudio gravado",
        description: "Por favor, grave um áudio antes de transcrever."
      });
      return;
    }
    
    try {
      setIsTranscribing(true);
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        // Remove the data URL prefix (e.g., data:audio/webm;base64,)
        const base64Audio = base64data.split(',')[1];
        
        // Call Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (data && data.text) {
          setTranscription(data.text);
          toast({
            title: "Transcrição concluída",
            description: "O áudio foi transcrito com sucesso."
          });
        } else {
          throw new Error('No transcription returned from API');
        }
      };
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        variant: "destructive",
        title: "Erro na transcrição",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao transcrever o áudio."
      });
    } finally {
      setIsTranscribing(false);
    }
  };
  
  const processText = async (mode: string) => {
    if (!transcription) {
      toast({
        variant: "destructive",
        title: "Nenhuma transcrição disponível",
        description: "Por favor, transcreva o áudio antes de processar."
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      setProcessingMode(mode);
      
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('process-text', {
        body: { text: transcription, mode }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data && data.text) {
        setProcessedText(data.text);
        
        const modeLabels: Record<string, string> = {
          clinical_note: "Nota clínica",
          prescription: "Receita",
          summary: "Resumo"
        };
        
        toast({
          title: `${modeLabels[mode]} gerado(a)`,
          description: `O texto foi processado com sucesso.`
        });
      } else {
        throw new Error('No processed text returned from API');
      }
    } catch (error) {
      console.error('Text processing error:', error);
      toast({
        variant: "destructive",
        title: "Erro no processamento",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao processar o texto."
      });
    } finally {
      setIsProcessing(false);
      setProcessingMode(null);
    }
  };
  
  return (
    <Layout userType="medico" userName="Dr. Paulo Oliveira">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Avaliação do Paciente
        </h1>
        <p className="text-gray-400">
          Grave, transcreva e processe a consulta do paciente
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-gradient p-6">
          <h2 className="text-xl font-semibold mb-4">Gravação e Transcrição</h2>
          
          <div className="flex gap-3 mb-4">
            {!isRecording ? (
              <Button 
                onClick={startRecording} 
                className="bg-gold-500 hover:bg-gold-600 text-black"
              >
                <Mic size={18} className="mr-2" />
                Iniciar Gravação
              </Button>
            ) : (
              <Button 
                onClick={stopRecording} 
                variant="destructive"
              >
                <StopCircle size={18} className="mr-2" />
                Parar Gravação
              </Button>
            )}
            
            <Button 
              onClick={transcribeAudio} 
              disabled={!audioBlob || isRecording || isTranscribing} 
              variant="outline"
            >
              {isTranscribing ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Transcrevendo...
                </>
              ) : (
                <>
                  <Send size={18} className="mr-2" />
                  Enviar para Transcrição
                </>
              )}
            </Button>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Transcrição do Áudio</h3>
            <Textarea 
              value={transcription} 
              onChange={(e) => setTranscription(e.target.value)} 
              className="h-60 bg-darkblue-900/50 border-darkblue-700"
              placeholder="A transcrição do áudio aparecerá aqui..."
            />
          </div>
        </Card>
        
        <Card className="card-gradient p-6">
          <h2 className="text-xl font-semibold mb-4">Processamento de Texto</h2>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <Button 
              onClick={() => processText('clinical_note')} 
              disabled={!transcription || isProcessing} 
              variant="outline"
              className="border-darkblue-700"
            >
              {isProcessing && processingMode === 'clinical_note' ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText size={18} className="mr-2" />
                  Gerar Nota Clínica
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => processText('prescription')} 
              disabled={!transcription || isProcessing} 
              variant="outline"
              className="border-darkblue-700"
            >
              {isProcessing && processingMode === 'prescription' ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FilePen size={18} className="mr-2" />
                  Gerar Receita
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => processText('summary')} 
              disabled={!transcription || isProcessing} 
              variant="outline"
              className="border-darkblue-700"
            >
              {isProcessing && processingMode === 'summary' ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FilePlus2 size={18} className="mr-2" />
                  Gerar Resumo
                </>
              )}
            </Button>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Texto Processado</h3>
            <Textarea 
              value={processedText} 
              readOnly 
              className="h-60 bg-darkblue-900/50 border-darkblue-700"
              placeholder="O texto processado aparecerá aqui..."
            />
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default DoctorAssessment;
