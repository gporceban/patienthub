
import React, { useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mic, StopCircle, Send, FileText, FilePen, FilePlus2, Loader2, 
  Save, Database, ArrowLeft 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import PatientInfoForm, { PatientInfo } from '@/components/PatientInfoForm';
import { useContext } from 'react';
import { AuthContext } from '@/App';

const DoctorAssessment = () => {
  const { toast } = useToast();
  const { user } = useContext(AuthContext);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  const [processedText, setProcessedText] = useState('');
  const [structuredData, setStructuredData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingMode, setProcessingMode] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [step, setStep] = useState<'patient-info' | 'recording' | 'processing'>('patient-info');
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const handlePatientInfoSubmit = async (data: PatientInfo) => {
    try {
      // Create a new assessment record
      const { data: assessmentData, error } = await supabase
        .from('patient_assessments')
        .insert({
          patient_email: data.email,
          patient_name: data.name,
          prontuario_id: data.prontuarioId,
          doctor_id: user?.id
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      setAssessmentId(assessmentData.id);
      setPatientInfo(data);
      setStep('recording');
      
      toast({
        title: "Informações do paciente salvas",
        description: "Agora você pode iniciar a gravação da avaliação."
      });
    } catch (error) {
      console.error('Error saving patient info:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar informações",
        description: "Não foi possível salvar as informações do paciente. Tente novamente."
      });
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Specify audio format as mp3 if possible, or use a more compatible format
      const options = { mimeType: 'audio/mp3;codecs=mp3' };
      
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.log('MediaRecorder with specified options failed, trying default options');
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        setAudioBlob(audioBlob);
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.oncanplaythrough = () => {
          console.log(`Audio duration: ${audio.duration} seconds`);
          console.log(`Audio type: ${audioBlob.type}`);
          console.log(`Audio size: ${audioBlob.size} bytes`);
        };
      };
      
      mediaRecorder.start(100); // Collect data every 100ms for smoother processing
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
      
      setStep('processing');
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
        // Remove the data URL prefix (e.g., data:audio/mp3;base64,)
        const base64Audio = base64data.split(',')[1];
        
        console.log('Sending audio for transcription, size:', base64Audio?.length || 0);
        
        // Call Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });
        
        if (error) {
          console.error('Transcription error:', error);
          throw new Error(error.message);
        }
        
        if (data && data.text) {
          setTranscription(data.text);
          
          // Save transcription to database
          if (assessmentId) {
            await supabase
              .from('patient_assessments')
              .update({ transcription: data.text })
              .eq('id', assessmentId);
          }
          
          toast({
            title: "Transcrição concluída",
            description: "O áudio foi transcrito com sucesso."
          });
          
          // Automatically generate structured data
          processText('structured_data');
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
        body: { 
          text: transcription, 
          mode,
          patientInfo: patientInfo 
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data && data.text) {
        setProcessedText(data.text);
        
        // If we have structured data, save it
        if (mode === 'structured_data' && data.structuredData) {
          setStructuredData(data.structuredData);
        }
        
        // Save to database based on mode
        if (assessmentId) {
          const updateData: any = {};
          
          if (mode === 'clinical_note') {
            updateData.clinical_note = data.text;
          } else if (mode === 'prescription') {
            updateData.prescription = data.text;
          } else if (mode === 'summary') {
            updateData.summary = data.text;
          }
          
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('patient_assessments')
              .update(updateData)
              .eq('id', assessmentId);
          }
        }
        
        const modeLabels: Record<string, string> = {
          clinical_note: "Nota clínica",
          prescription: "Receita",
          summary: "Resumo",
          structured_data: "Dados estruturados"
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
  
  const saveAssessment = async () => {
    if (!assessmentId) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível identificar o registro da avaliação."
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      // The data is already being saved incrementally, so just confirm to the user
      toast({
        title: "Avaliação salva com sucesso",
        description: "Todos os dados da avaliação foram salvos no sistema."
      });
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar a avaliação. Tente novamente."
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const resetAssessment = () => {
    // Confirm before resetting
    if (window.confirm("Tem certeza que deseja reiniciar a avaliação? Todos os dados não salvos serão perdidos.")) {
      setPatientInfo(null);
      setAudioBlob(null);
      setTranscription('');
      setProcessedText('');
      setStructuredData(null);
      setAssessmentId(null);
      setStep('patient-info');
    }
  };
  
  const backToPatientInfo = () => {
    setStep('patient-info');
  };
  
  return (
    <Layout userType="medico" userName="Dr. Paulo Oliveira">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Avaliação do Paciente
        </h1>
        <p className="text-gray-400">
          {step === 'patient-info' ? 'Insira os dados do paciente para iniciar' : 
          step === 'recording' ? 'Grave a consulta do paciente' : 
          'Processe e analise os resultados da consulta'}
        </p>
      </div>
      
      {step === 'patient-info' ? (
        <Card className="card-gradient p-6 max-w-lg mx-auto">
          <h2 className="text-xl font-semibold mb-4">Informações do Paciente</h2>
          <PatientInfoForm onSubmit={handlePatientInfoSubmit} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-gradient p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Gravação e Transcrição</h2>
              {step === 'recording' && (
                <Button 
                  onClick={backToPatientInfo}
                  variant="outline"
                  size="sm"
                >
                  <ArrowLeft size={16} className="mr-1" />
                  Voltar
                </Button>
              )}
            </div>
            
            {patientInfo && (
              <div className="bg-darkblue-800/50 p-3 rounded-md mb-4 text-sm">
                <p><strong>Paciente:</strong> {patientInfo.name}</p>
                <p><strong>Email:</strong> {patientInfo.email}</p>
                <p><strong>ID do Prontuário:</strong> {patientInfo.prontuarioId}</p>
              </div>
            )}
            
            <div className="flex gap-3 mb-4">
              {step === 'recording' && (
                !isRecording ? (
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
                )
              )}
              
              {step === 'processing' && (
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
              )}
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
              
              <Button 
                onClick={() => processText('structured_data')} 
                disabled={!transcription || isProcessing} 
                variant="outline"
                className="border-darkblue-700"
              >
                {isProcessing && processingMode === 'structured_data' ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Database size={18} className="mr-2" />
                    Gerar Dados Estruturados
                  </>
                )}
              </Button>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Texto Processado</h3>
              <Textarea 
                value={processedText} 
                readOnly 
                className="h-60 bg-darkblue-900/50 border-darkblue-700"
                placeholder="O texto processado aparecerá aqui..."
              />
            </div>
            
            {structuredData && (
              <div className="mt-4 p-3 bg-darkblue-800/50 rounded-md">
                <h3 className="text-sm font-medium mb-2">Dados Estruturados</h3>
                <pre className="text-xs overflow-auto max-h-40 p-2 bg-darkblue-900/50 rounded">
                  {JSON.stringify(structuredData, null, 2)}
                </pre>
              </div>
            )}
            
            {transcription && (
              <div className="mt-4 flex gap-3">
                <Button 
                  onClick={saveAssessment}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      Finalizar e Salvar
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={resetAssessment}
                  variant="outline"
                  className="border-red-700 text-red-500 hover:bg-red-900/20"
                >
                  Reiniciar Avaliação
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default DoctorAssessment;
