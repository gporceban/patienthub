
import { useRef, useState } from 'react';

interface UseFileUploadProps {
  onFileLoaded: (blob: Blob, fileName: string) => void;
}

export const useFileUpload = ({ onFileLoaded }: UseFileUploadProps) => {
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    console.log('File selected:', file.name);
    
    // Check if file is audio
    if (!file.type.startsWith('audio/')) {
      console.error('Selected file is not an audio file');
      return;
    }
    
    setUploadedFileName(file.name);
    
    // Convert file to blob
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) return;
      
      const blob = new Blob([arrayBuffer], { type: file.type });
      console.log('File loaded as blob:', blob.size);
      
      onFileLoaded(blob, file.name);
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  return {
    uploadedFileName,
    fileInputRef,
    handleFileUpload,
    handleUploadClick
  };
};
