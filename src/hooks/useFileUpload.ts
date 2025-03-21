
import { useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface UseFileUploadProps {
  onFileLoaded?: (blob: Blob, fileName: string) => void;
}

export const useFileUpload = ({ onFileLoaded }: UseFileUploadProps = {}) => {
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result instanceof ArrayBuffer) {
        const blob = new Blob([result], { type: file.type });
        setUploadedFileName(file.name);
        
        if (onFileLoaded) {
          onFileLoaded(blob, file.name);
        }
        
        toast({
          title: "Arquivo carregado",
          description: `"${file.name}" está pronto para transcrição.`
        });
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return {
    uploadedFileName,
    fileInputRef,
    handleFileUpload,
    handleUploadClick
  };
};
