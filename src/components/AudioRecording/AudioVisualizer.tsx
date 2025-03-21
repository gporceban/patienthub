
import React from 'react';
import { Volume2 } from 'lucide-react';

interface AudioVisualizerProps {
  audioLevel: number;
  isRecording: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioLevel, isRecording }) => {
  if (!isRecording) return null;
  
  return (
    <div className="absolute right-2 bottom-2 flex items-center gap-1 bg-darkblue-800/80 px-2 py-1 rounded-full">
      <Volume2 className="h-3 w-3 text-gold-500" />
      <div className="bg-darkblue-700 rounded-full h-2 w-16">
        <div 
          className="bg-gold-500 h-2 rounded-full" 
          style={{ width: `${audioLevel * 100}%` }}
        />
      </div>
    </div>
  );
};

export default AudioVisualizer;
