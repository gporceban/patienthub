
import { useState, useRef, useEffect } from 'react';

interface UseAudioRecorderProps {
  useRealtimeTranscription?: boolean;
}

export const useAudioRecorder = ({ useRealtimeTranscription = false }: UseAudioRecorderProps = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);
  
  const cleanupResources = () => {
    // Stop recording if in progress
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    // Clear any timers
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Close audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    
    setIsRecording(false);
    setAudioLevel(0);
    audioLevelRef.current = 0;
  };
  
  const startRecording = async () => {
    try {
      console.log("Requesting microphone access...");
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log("Microphone access granted:", stream);
      streamRef.current = stream;
      
      // Configure audio level monitoring
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyserNode = audioContext.createAnalyser();
      analyserNodeRef.current = analyserNode;
      analyserNode.fftSize = 2048;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyserNode);
      
      // Monitor audio levels
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      
      const checkAudioLevel = () => {
        if (!isRecording) return;
        
        analyserNode.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        
        const avg = sum / dataArray.length;
        const level = Math.min(1, avg / 128);
        
        audioLevelRef.current = level;
        setAudioLevel(level);
        
        requestAnimationFrame(checkAudioLevel);
      };
      
      // Set up MediaRecorder with proper options
      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      console.log("MediaRecorder created with options:", options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        console.log("Data available event:", event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Start the audio monitoring
      checkAudioLevel();
      
      // Start recording
      mediaRecorder.start(500); // Collect data every 500ms
      console.log("MediaRecorder started");
      setIsRecording(true);
      
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      return false;
    }
  };
  
  const stopRecording = () => {
    console.log("Stopping recording...");
    if (!mediaRecorderRef.current || !isRecording) {
      console.warn("Attempted to stop recording, but mediaRecorder is not active");
      return null;
    }
    
    return new Promise<Blob | null>((resolve) => {
      mediaRecorderRef.current!.onstop = () => {
        console.log("MediaRecorder stopped, chunks:", audioChunksRef.current.length);
        if (audioChunksRef.current.length === 0) {
          resolve(null);
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("Created audio blob:", audioBlob.size);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        setIsRecording(false);
        resolve(audioBlob);
      };
      
      mediaRecorderRef.current!.stop();
    });
  };
  
  return {
    isRecording,
    audioLevel,
    startRecording,
    stopRecording,
    cleanupResources
  };
};
