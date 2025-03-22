
import { useState, useRef, useEffect } from 'react';
import { processAudioLevel, checkMicrophoneAvailability } from '@/utils/audioUtils';
import { useToast } from '@/components/ui/use-toast';

interface UseAudioRecorderProps {
  onDataAvailable?: (chunks: Blob[]) => void;
  useRealtimeTranscription?: boolean;
}

interface UseAudioRecorderResult {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioLevel: number;
  audioChunks: Blob[];
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cleanupResources: () => void;
}

export const useAudioRecorder = ({
  onDataAvailable,
  useRealtimeTranscription = true
}: UseAudioRecorderProps = {}): UseAudioRecorderResult => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioLevelRef = useRef<number>(0);
  const startRecordingInProgressRef = useRef<boolean>(false);
  
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const cleanupResources = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping mediaRecorder:", err);
      }
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
      streamRef.current.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
      streamRef.current = null;
    }
    
    audioContextRef.current = null;
    analyserNodeRef.current = null;
    mediaRecorderRef.current = null;
    
    console.log("Audio recorder resources cleaned up");
  };

  const startPeriodicTranscription = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    
    if (!useRealtimeTranscription) {
      intervalRef.current = window.setInterval(() => {
        if (audioChunksRef.current.length === 0 || !isRecording) {
          return;
        }
        
        try {
          const tempBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (onDataAvailable) {
            onDataAvailable([...audioChunksRef.current]);
          }
        } catch (error) {
          console.error('Error in periodic transcription:', error);
        }
      }, 5000);
    }
  };

  const startRecording = async () => {
    if (startRecordingInProgressRef.current) {
      console.log("Start recording already in progress");
      return;
    }
    
    startRecordingInProgressRef.current = true;
    audioChunksRef.current = [];
    
    try {
      // First, check if the microphone is available
      const micAvailable = await checkMicrophoneAvailability();
      if (!micAvailable) {
        throw new Error('Microfone não disponível ou permissão negada');
      }
      
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
        
        const level = processAudioLevel(dataArray);
        
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
      
      // Start the audio level visualization
      checkAudioLevel();
      
      // Set the recording state before starting MediaRecorder to ensure UI is updated
      setIsRecording(true);
      
      // Start MediaRecorder with 500ms timeslice to get data frequently
      mediaRecorder.start(500);
      console.log("MediaRecorder started");
      
      if (!useRealtimeTranscription) {
        startPeriodicTranscription();
      }
      
      toast({
        title: "Gravação iniciada",
        description: useRealtimeTranscription ? 
          "Transcrição em tempo real ativada. Fale claramente." : 
          "Fale claramente para obter os melhores resultados."
      });
    } catch (error) {
      console.error('Erro ao acessar o microfone:', error);
      toast({
        variant: "destructive",
        title: "Erro ao acessar o microfone",
        description: "Verifique se o microfone está conectado e se você concedeu permissão para usá-lo."
      });
      
      setIsRecording(false);
      cleanupResources();
      throw error;
    } finally {
      startRecordingInProgressRef.current = false;
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    if (mediaRecorderRef.current && isRecording) {
      try {
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
      } catch (error) {
        console.error("Error stopping recording:", error);
        toast({
          variant: "destructive",
          title: "Erro ao finalizar gravação",
          description: "Houve um problema ao finalizar a gravação. Tente novamente."
        });
      }
    } else {
      console.warn("Attempted to stop recording, but mediaRecorder is not active");
    }
  };

  return {
    isRecording,
    audioBlob,
    audioLevel,
    audioChunks: audioChunksRef.current,
    startRecording,
    stopRecording,
    cleanupResources
  };
};
