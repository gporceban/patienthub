import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, FileText, Volume2, AlertCircle, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import AudioRecorderStatus from './AudioRecorderStatus';
import RealtimeTranscription from './RealtimeTranscription';
import { Input } from '@/components/ui/input';

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
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [transcriptionComplete, setTranscriptionComplete] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef<number>(0);
  const [currentTranscription, setCurrentTranscription] = useState('');
  
  const [agentProgress, setAgentProgress] = useState({
    patientInfo: false,
    symptoms: false,
    examFindings: false,
    diagnosis: false,
    treatment: false,
    orchestration: false
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const { toast } = useToast();
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      stopRecording();
      cleanupResources();
    };
  }, []);

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

  const cleanupResources = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
    }
    
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startPeriodicTranscription = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    
    intervalRef.current = window.setInterval(async () => {
      if (audioChunksRef.current.length === 0 || !isRecording) {
        return;
      }
      
      try {
        const tempBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudioChunk(tempBlob, false);
      } catch (error) {
        console.error('Error in periodic transcription:', error);
      }
    }, 5000);
  };

  const startRecording = async () => {
    setHasError(false);
    setErrorMessage('');
    setTranscriptionComplete(false);
    setProcessingComplete(false);
    setCurrentTranscription('');
    setAgentProgress({
      patientInfo: false,
      symptoms: false,
      examFindings: false,
      diagnosis: false,
      treatment: false,
      orchestration: false
    });
    audioChunksRef.current = [];
    
    try {
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log("Microphone access granted:", stream);
      streamRef.current = stream;
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserNodeRef.current = audioContextRef.current.createAnalyser();
      analyserNodeRef.current.fftSize = 2048;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserNodeRef.current);
      
      const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
      
      const checkAudioLevel = () => {
        if (!isRecording || !analyserNodeRef.current) return;
        
        analyserNodeRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        
        const avg = sum / dataArray.length;
        const level = Math.min(1, avg / 128);
        
        audioLevelRef.current = level;
        setAudioLevel(level);
        
        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };
      
      let options: MediaRecorderOptions = {};
      
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }
      
      console.log("Creating MediaRecorder with options:", options);
      const mediaRecorder = new MediaRecorder(stream, options);
      console.log("MediaRecorder created with options:", options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        console.log("Data available event:", event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped, chunks:", audioChunksRef.current.length);
        if (audioChunksRef.current.length === 0) {
          setHasError(true);
          setErrorMessage('Nenhum áudio capturado. Verifique se o microfone está funcionando corretamente.');
          toast({
            variant: "destructive",
            title: "Erro na gravação",
            description: "Nenhum áudio foi capturado. Verifique seu microfone."
          });
          return;
        }
        
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType || 'audio/webm' });
        console.log("Created audio blob:", audioBlob.size);
        setAudioBlob(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      checkAudioLevel();
      
      mediaRecorder.start(500);
      console.log("MediaRecorder started");
      setIsRecording(true);
      
      startPeriodicTranscription();
      
      toast({
        title: "Gravação iniciada",
        description: "Fale claramente para obter os melhores resultados."
      });
    } catch (error) {
      console.error('Erro ao acessar o microfone:', error);
      setHasError(true);
      setErrorMessage('Erro ao acessar o microfone. Verifique permissões de navegador e hardware.');
      toast({
        variant: "destructive",
        title: "Erro ao acessar o microfone",
        description: "Verifique se o microfone está conectado e se você concedeu permissão para usá-lo."
      });
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      toast({
        title: "Gravação finalizada",
        description: "Áudio capturado com sucesso."
      });
    } else {
      console.warn("Attempted to stop recording, but mediaRecorder is not active");
    }
  };

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
            toast({
              title: "Transcrição completa",
              description: "O áudio foi transcrito com sucesso e está sendo processado pelo sistema de agentes IA."
            });
            
            onTranscriptionComplete(data.text);
            processTranscription(data.text);
          } else {
            setCurrentTranscription(data.text);
          }
        } else {
          throw new Error('Nenhum texto recebido da transcrição');
        }
      };
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
    } finally {
      if (isFinal) {
        setIsTranscribing(false);
      }
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

    try {
      console.log("Starting transcription of recorded audio, blob size:", audioBlob.size);
      setIsTranscribing(true);
      setHasError(false);
      setErrorMessage('');
      
      await transcribeAudioChunk(audioBlob, true);
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

  const uploadAndTranscribeAudio = async () => {
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
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error('Falha ao converter áudio para base64');
        }
        
        console.log("Sending uploaded audio file to transcription API...");
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });
        
        if (error) {
          console.error("Transcription API error:", error);
          throw error;
        }
        
        console.log("Transcription API response:", data);
        if (data?.text) {
          setTranscriptionComplete(true);
          setCurrentTranscription(data.text);
          
          toast({
            title: "Transcrição completa",
            description: "O áudio foi transcrito com sucesso e está sendo processado pelo sistema de agentes IA."
          });
          
          onTranscriptionComplete(data.text);
          processTranscription(data.text);
        } else {
          throw new Error('Nenhum texto recebido da transcrição');
        }
      };
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
    onProcessingStart();
    setIsProcessing(true);
    setHasError(false);
    setErrorMessage('');
    
    try {
      const patientHistoryParam = patientInfo ? {
        prontuarioId: patientInfo.prontuarioId,
        email: patientInfo.email
      } : null;
      
      console.log("Processing transcription for clinical note...");
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
      
      setProcessingComplete(true);
      const historyMessage = patientInfo ? "integrado com histórico do paciente" : "";
      
      toast({
        title: "Documentos gerados",
        description: `Nota clínica, prescrição e resumo foram gerados pelos agentes IA com sucesso ${historyMessage}.`
      });
      
      onProcessingComplete({
        clinical_note: data?.text,
        prescription: prescriptionData?.text,
        summary: summaryData?.text,
        structured_data: structuredData?.structuredData
      });
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    if (!file.type.startsWith('audio/')) {
      toast({
        variant: "destructive",
        title: "Tipo de arquivo inválido",
        description: "Por favor, envie apenas arquivos de áudio."
      });
      return;
    }
    
    const maxSize = 30 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 30MB."
      });
      return;
    }
    
    setUploadedFileName(file.name);
    setAudioBlob(file);
    
    toast({
      title: "Arquivo carregado",
      description: `"${file.name}" está pronto para transcrição."
    });
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-medium mb-2">Gravação de Áudio</h3>
        <p className="text-sm text-gray-400 mb-4">
          {patientInfo ? "Grave ou envie o áudio da consulta para gerar documentos integrados com o histórico do paciente" : "Grave ou envie o áudio da consulta para gerar documentos automaticamente utilizando Agentes IA especializados"}
        </p>
        
        <div className="w-full relative mb-4">
          <RealtimeTranscription 
            isRecording={isRecording} 
            transcription={currentTranscription}
            isTranscribing={isTranscribing}
          />
          
          {isRecording && (
            <div className="absolute right-2 bottom-2 flex items-center gap-1 bg-darkblue-800/80 px-2 py-1 rounded-full">
              <Volume2 className="h-3 w-3 text-gold-500" />
              <div className="bg-darkblue-700 rounded-full h-2 w-16">
                <div 
                  className="bg-gold-500 h-2 rounded-full" 
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-4 mb-4">
          {!isRecording ? (
            <>
              <Button 
                onClick={startRecording} 
                className="bg-gold-500 hover:bg-gold-600 text-black"
                disabled={isTranscribing || isProcessing || isUploading}
              >
                <Mic className="h-4 w-4 mr-2" />
                Iniciar Gravação
              </Button>
              
              <Button
                onClick={handleUploadClick}
                variant="outline"
                disabled={isRecording || isTranscribing || isProcessing || isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Carregar Áudio
              </Button>
              <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="audio/*"
                onChange={handleFileUpload}
              />
            </>
          ) : (
            <Button 
              onClick={stopRecording} 
              variant="destructive"
            >
              <Square className="h-4 w-4 mr-2" />
              Parar Gravação
            </Button>
          )}
        </div>

        {uploadedFileName && !isRecording && (
          <div className="flex items-center text-gray-300 mb-4">
            <FileText className="h-4 w-4 mr-2 text-gold-500" />
            <span className="text-sm">{uploadedFileName}</span>
          </div>
        )}
        
        {audioBlob && !isRecording && (
          <Button 
            onClick={audioBlob === uploadedFileName ? uploadAndTranscribeAudio : transcribeAudio} 
            variant="outline" 
            disabled={isTranscribing || isProcessing || isUploading}
            className="mb-4"
          >
            {isTranscribing || isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isUploading ? "Enviando..." : "Transcrevendo..."}
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Transcrever e Processar
              </>
            )}
          </Button>
        )}
        
        {hasError && (
          <div className="flex items-center text-red-500 mt-1 mb-2">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="text-sm">{errorMessage}</span>
          </div>
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
    </div>
  );
};

export default AudioRecorder;
