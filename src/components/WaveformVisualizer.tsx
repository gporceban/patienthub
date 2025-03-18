
import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  isRecording: boolean;
  audioContext?: AudioContext;
  analyser?: AnalyserNode;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ 
  isRecording, 
  audioContext, 
  analyser 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  useEffect(() => {
    if (!analyser || !isRecording || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    
    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    
    // Create data array for analyser
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    // Animation function
    const drawWaveform = () => {
      if (!isRecording || !canvasCtx) {
        if (animationRef.current) {
          window.cancelAnimationFrame(animationRef.current);
        }
        return;
      }
      
      // Request next frame
      animationRef.current = requestAnimationFrame(drawWaveform);
      
      // Get audio data
      analyser.getByteTimeDomainData(dataArray);
      
      // Clear canvas
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set line style
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#f8b84e'; // Gold color for waveform
      canvasCtx.beginPath();
      
      const sliceWidth = canvas.width / dataArray.length;
      let x = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0; // byte data ranges from 0-255, normalize to 0-2
        const y = v * (canvas.height / 2);
        
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };
    
    // Start animation
    drawWaveform();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, analyser]);
  
  return (
    <div className={`w-full h-20 rounded-md overflow-hidden ${isRecording ? 'bg-darkblue-800/80' : 'bg-darkblue-900/50'} relative`}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full" 
      />
      {!isRecording && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400 text-sm">O áudio aparecerá aqui quando a gravação iniciar</p>
        </div>
      )}
    </div>
  );
};

export default WaveformVisualizer;
