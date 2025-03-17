
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import AudioRecorder from '@/components/AudioRecorder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';

const DoctorAssessment = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  
  // Form fields
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [prontuarioId, setProntuarioId] = useState('');
  const [summary, setSummary] = useState('');
  const [clinicalNote, setClinicalNote] = useState('');
  const [prescription, setPrescription] = useState('');
  const [transcription, setTranscription] = useState('');
  const [structuredData, setStructuredData] = useState<any>(null);
  
  // State management
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTab, setCurrentTab] = useState('form');
  const [docsGenerated, setDocsGenerated] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Usuário não autenticado",
        description: "Você precisa estar logado para salvar uma avaliação."
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      const { data, error } = await supabase
        .from('patient_assessments')
        .insert([
          {
            id: uuidv4(),
            doctor_id: user.id,
            patient_name: patientName,
            patient_email: patientEmail,
            prontuario_id: prontuarioId,
            summary: summary,
            clinical_note: clinicalNote,
            prescription: prescription,
            transcription: transcription,
            structured_data: structuredData,
            created_at: new Date().toISOString(),
          },
        ]);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Avaliação salva com sucesso",
        description: "A avaliação do paciente foi salva com sucesso."
      });
      
      // Clear form fields
      setPatientName('');
      setPatientEmail('');
      setProntuarioId('');
      setSummary('');
      setClinicalNote('');
      setPrescription('');
      setTranscription('');
      setStructuredData(null);
      setDocsGenerated(false);
      
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar avaliação",
        description: "Não foi possível salvar a avaliação do paciente. Tente novamente mais tarde."
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleTranscriptionComplete = (text: string) => {
    setTranscription(text);
  };
  
  const handleProcessingStart = () => {
    setIsProcessing(true);
    setDocsGenerated(false);
  };
  
  const handleProcessingComplete = (data: {
    clinical_note?: string;
    prescription?: string;
    summary?: string;
    structured_data?: any;
  }) => {
    if (data.clinical_note) setClinicalNote(data.clinical_note);
    if (data.prescription) setPrescription(data.prescription);
    if (data.summary) setSummary(data.summary);
    if (data.structured_data) setStructuredData(data.structured_data);
    
    setIsProcessing(false);
    setDocsGenerated(true);
    
    // If we got patient info from the structured data, use it
    if (data.structured_data?.paciente) {
      const paciente = data.structured_data.paciente;
      if (!patientName && paciente.nome) {
        setPatientName(paciente.nome);
      }
      if (!prontuarioId && paciente.id) {
        setProntuarioId(paciente.id);
      }
    }
    
    // Switch to form tab to show the results
    setCurrentTab('form');
    
    toast({
      title: "Documentos gerados com sucesso",
      description: "Os documentos clínicos foram gerados e inseridos nos campos do formulário."
    });
  };
  
  return (
    <Layout userType="medico">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Nova Avaliação</h1>
        <p className="text-gray-400">
          Preencha os dados do paciente e a avaliação
        </p>
      </div>
      
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="max-w-2xl">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="form" className="relative">
            Formulário
            {docsGenerated && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="audio">
            Gravação de Áudio
            {isProcessing && (
              <Loader2 className="h-3 w-3 ml-2 animate-spin" />
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="audio" className="space-y-4">
          <Card className="card-gradient p-6">
            <AudioRecorder 
              onTranscriptionComplete={handleTranscriptionComplete}
              onProcessingStart={handleProcessingStart}
              onProcessingComplete={handleProcessingComplete}
            />
            
            {transcription && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Transcrição</h3>
                <div className="bg-darkblue-900/50 p-4 rounded-md border border-darkblue-700">
                  <p className="text-sm whitespace-pre-wrap">{transcription}</p>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="form" className="space-y-4">
          <Card className="card-gradient p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="patientName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                      Nome do Paciente
                    </label>
                    <Input
                      id="patientName"
                      placeholder="Nome completo do paciente"
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="bg-darkblue-800/50 border-darkblue-700"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="patientEmail" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                      Email do Paciente
                    </label>
                    <Input
                      id="patientEmail"
                      placeholder="Email do paciente"
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="bg-darkblue-800/50 border-darkblue-700"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="prontuarioId" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                    ID do Prontuário
                  </label>
                  <Input
                    id="prontuarioId"
                    placeholder="ID do prontuário do paciente"
                    type="text"
                    value={prontuarioId}
                    onChange={(e) => setProntuarioId(e.target.value)}
                    className="bg-darkblue-800/50 border-darkblue-700"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="summary" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                    Resumo da Avaliação
                  </label>
                  <Textarea
                    id="summary"
                    placeholder="Resumo da avaliação do paciente"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="h-24 bg-darkblue-800/50 border-darkblue-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="clinicalNote" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                    Nota Clínica
                  </label>
                  <Textarea
                    id="clinicalNote"
                    placeholder="Nota clínica sobre o paciente"
                    value={clinicalNote}
                    onChange={(e) => setClinicalNote(e.target.value)}
                    className="h-32 bg-darkblue-800/50 border-darkblue-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="prescription" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                    Prescrição
                  </label>
                  <Textarea
                    id="prescription"
                    placeholder="Prescrição para o paciente"
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    className="h-32 bg-darkblue-800/50 border-darkblue-700"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={isSaving || isProcessing}
                className="bg-gold-500 hover:bg-gold-600 text-black"
              >
                {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default DoctorAssessment;
