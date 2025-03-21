
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, FileText, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface RecorderControlsProps {
  isRecording: boolean;
  isTranscribing: boolean;
  isProcessing: boolean;
  isUploading: boolean;
  audioBlob: Blob | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onUploadClick: () => void;
  onTranscribeAudio: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploadedFileName: string;
}

const RecorderControls: React.FC<RecorderControlsProps> = ({
  isRecording,
  isTranscribing,
  isProcessing,
  isUploading,
  audioBlob,
  fileInputRef,
  onStartRecording,
  onStopRecording,
  onUploadClick,
  onTranscribeAudio,
  onFileUpload,
  uploadedFileName
}) => {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4">
        {!isRecording ? (
          <>
            <Button 
              onClick={onStartRecording} 
              className="bg-gold-500 hover:bg-gold-600 text-black"
              disabled={isTranscribing || isProcessing || isUploading}
            >
              <Mic className="h-4 w-4 mr-2" />
              Iniciar Gravação
            </Button>
            
            <Button
              onClick={onUploadClick}
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
              onChange={onFileUpload}
            />
          </>
        ) : (
          <Button 
            onClick={onStopRecording} 
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
          onClick={onTranscribeAudio} 
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
    </div>
  );
};

export default RecorderControls;
