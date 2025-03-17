
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import AudioRecorder from '@/components/AudioRecorder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PencilLine, Check, RotateCcw, History } from 'lucide-react';
import PatientInfoForm, { PatientInfo } from '@/components/PatientInfoForm';
import { PatientAssessment } from '@/types/patientAssessments';

const DoctorAssessment = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  
  // Patient info state
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  
  // Generated content state
  const [summary, setSummary] = useState('');
  const [clinicalNote, setClinicalNote] = useState('');
  const [prescription, setPrescription] = useState('');
  const [transcription, setTranscription] = useState('');
  const [patientFriendlySummary, setPatientFriendlySummary] = useState('');
  const [structuredData, setStructuredData] = useState<any>(null);
  
  // Previous assessments state
  const [previousAssessments, setPreviousAssessments] = useState<PatientAssessment[]>([]);
  const [hasPreviousAssessments, setHasPreviousAssessments] = useState(false);
  
  // Editing state for human-in-the-loop
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingClinicalNote, setIsEditingClinicalNote] = useState(false);
  const [isEditingPrescription, setIsEditingPrescription] = useState(false);
  const [isEditingPatientSummary, setIsEditingPatientSummary] = useState(false);
  
  // AI instruction state for refinement
  const [aiInstruction, setAiInstruction] = useState('');
  const [isSubmittingInstruction, setIsSubmittingInstruction] = useState(false);
  
  // Workflow state management
  const [currentStep, setCurrentStep] = useState<'info' | 'recording' | 'review'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [docsGenerated, setDocsGenerated] = useState(false);
  const [isGeneratingPatientSummary, setIsGeneratingPatientSummary] = useState(false);
  
  // Fetch previous assessments when patient info changes
  useEffect(() => {
    const fetchPreviousAssessments = async () => {
      if (patientInfo && patientInfo.prontuarioId) {
        try {
          const { data, error } = await supabase
            .from('patient_assessments')
            .select('*')
            .eq('prontuario_id', patientInfo.prontuarioId)
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            setPreviousAssessments(data);
            setHasPreviousAssessments(true);
            
            toast({
              title: `${data.length} avaliações anteriores encontradas`,
              description: "Histórico do paciente será utilizado para gerar uma avaliação mais completa."
            });
          } else {
            setPreviousAssessments([]);
            setHasPreviousAssessments(false);
          }
        } catch (error) {
          console.error('Error fetching previous assessments:', error);
          toast({
            variant: "destructive",
            title: "Erro ao buscar histórico",
            description: "Não foi possível recuperar avaliações anteriores do paciente."
          });
        }
      }
    };
    
    fetchPreviousAssessments();
  }, [patientInfo, toast]);
  
  // Save completed assessment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !patientInfo) {
      toast({
        variant: "destructive",
        title: "Informações incompletas",
        description: "Preencha as informações do paciente antes de salvar."
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
            patient_name: patientInfo.name,
            patient_email: patientInfo.email,
            prontuario_id: patientInfo.prontuarioId,
            summary: summary,
            clinical_note: clinicalNote,
            prescription: prescription,
            patient_friendly_summary: patientFriendlySummary,
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
      
      // Reset all state
      resetForm();
      
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
  
  // Reset the form completely
  const resetForm = () => {
    setPatientInfo(null);
    setSummary('');
    setClinicalNote('');
    setPrescription('');
    setTranscription('');
    setPatientFriendlySummary('');
    setStructuredData(null);
    setDocsGenerated(false);
    setCurrentStep('info');
    setAiInstruction('');
    setPreviousAssessments([]);
    setHasPreviousAssessments(false);
  };
  
  // Transcription completion handler
  const handleTranscriptionComplete = (text: string) => {
    setTranscription(text);
  };
  
  // Processing start handler
  const handleProcessingStart = () => {
    setIsProcessing(true);
    setDocsGenerated(false);
  };
  
  // Processing completion handler
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
    
    // Set to review step when processing is complete
    setCurrentStep('review');
    
    toast({
      title: "Documentos gerados com sucesso",
      description: "Os documentos clínicos foram gerados e estão prontos para revisão."
    });
  };
  
  // Handle patient info submission
  const handlePatientInfoSubmit = (data: PatientInfo) => {
    setPatientInfo(data);
    setCurrentStep('recording');
    
    toast({
      title: "Informações do paciente salvas",
      description: "Continue com a gravação da consulta."
    });
  };
  
  // Generate patient-friendly summary
  const generatePatientFriendlySummary = async () => {
    if (!clinicalNote || !summary) {
      toast({
        variant: "destructive",
        title: "Conteúdo insuficiente",
        description: "A nota clínica e o resumo são necessários para gerar o sumário para o paciente."
      });
      return;
    }
    
    try {
      setIsGeneratingPatientSummary(true);
      
      const { data, error } = await supabase.functions.invoke('process-text', {
        body: { 
          text: `Nota Clínica: ${clinicalNote}\n\nResumo: ${summary}`,
          mode: 'patient_friendly',
          reviewRequired: true
        }
      });
      
      if (error) throw error;
      
      if (data?.text) {
        setPatientFriendlySummary(data.text);
        
        toast({
          title: "Sumário para paciente gerado",
          description: "Um sumário em linguagem acessível foi criado para o paciente."
        });
      }
    } catch (error) {
      console.error('Error generating patient summary:', error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar sumário",
        description: "Não foi possível criar o sumário para o paciente."
      });
    } finally {
      setIsGeneratingPatientSummary(false);
    }
  };
  
  // Regenerate AI content with human instruction
  const submitAiInstruction = async () => {
    if (!transcription || !aiInstruction) {
      toast({
        variant: "destructive",
        title: "Instrução incompleta",
        description: "A transcrição e a instrução para a IA são necessárias."
      });
      return;
    }
    
    try {
      setIsSubmittingInstruction(true);
      
      // Process the transcription with additional instructions
      const { data, error } = await supabase.functions.invoke('process-text', {
        body: { 
          text: transcription,
          mode: 'clinical_note',
          reviewRequired: true,
          additionalInstructions: aiInstruction,
          patientInfo: patientInfo && hasPreviousAssessments ? {
            prontuarioId: patientInfo.prontuarioId
          } : null
        }
      });
      
      if (error) throw error;
      
      if (data?.text) {
        setClinicalNote(data.text);
        
        // Clear the instruction after processing
        setAiInstruction('');
        
        toast({
          title: "Documento refinado com sucesso",
          description: "A nota clínica foi atualizada com suas instruções."
        });
      }
    } catch (error) {
      console.error('Error processing instruction:', error);
      toast({
        variant: "destructive",
        title: "Erro ao processar instrução",
        description: "Não foi possível atualizar o documento com suas instruções."
      });
    } finally {
      setIsSubmittingInstruction(false);
    }
  };
  
  return (
    <Layout userType="medico">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Nova Avaliação</h1>
        <p className="text-gray-400">
          {currentStep === 'info' && "Preencha os dados do paciente para continuar"}
          {currentStep === 'recording' && "Grave a consulta do paciente para gerar a documentação automaticamente"}
          {currentStep === 'review' && "Revise e edite a documentação gerada pela IA antes de salvar"}
        </p>
      </div>
      
      {/* Step 1: Patient Information */}
      {currentStep === 'info' && (
        <Card className="card-gradient p-6 max-w-2xl mb-6">
          <h2 className="text-lg font-semibold mb-4">Informações do Paciente</h2>
          <PatientInfoForm 
            onSubmit={handlePatientInfoSubmit}
          />
        </Card>
      )}
      
      {/* Step 2: Recording */}
      {currentStep === 'recording' && patientInfo && (
        <Card className="card-gradient p-6 max-w-2xl mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Gravação da Consulta</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentStep('info')}
              className="text-xs"
            >
              Voltar
            </Button>
          </div>
          
          <div className="bg-darkblue-800/50 p-4 rounded-md border border-darkblue-700 mb-4">
            <p className="text-sm font-medium text-gray-300">Paciente: {patientInfo.name}</p>
            <p className="text-sm font-medium text-gray-300">Prontuário: {patientInfo.prontuarioId}</p>
            {hasPreviousAssessments && (
              <div className="mt-2 flex items-center text-gold-500">
                <History className="h-4 w-4 mr-1" />
                <p className="text-sm font-medium">{previousAssessments.length} avaliações anteriores encontradas</p>
              </div>
            )}
          </div>
          
          <AudioRecorder 
            onTranscriptionComplete={handleTranscriptionComplete}
            onProcessingStart={handleProcessingStart}
            onProcessingComplete={handleProcessingComplete}
            patientInfo={hasPreviousAssessments ? {
              prontuarioId: patientInfo.prontuarioId
            } : undefined}
          />
          
          {transcription && (
            <div className="mt-6">
              <h3 className="text-md font-medium mb-2">Transcrição</h3>
              <div className="bg-darkblue-900/50 p-4 rounded-md border border-darkblue-700 overflow-y-auto max-h-60">
                <p className="text-sm whitespace-pre-wrap">{transcription}</p>
              </div>
            </div>
          )}
        </Card>
      )}
      
      {/* Step 3: Review and Edit */}
      {currentStep === 'review' && docsGenerated && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <Card className="card-gradient p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Revisão de Documentação</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentStep('recording')}
                className="text-xs"
              >
                Voltar para Gravação
              </Button>
            </div>
            
            <div className="bg-darkblue-800/50 p-4 rounded-md border border-darkblue-700 mb-6">
              <p className="text-sm font-medium text-gray-300">Paciente: {patientInfo?.name}</p>
              <p className="text-sm font-medium text-gray-300">Prontuário: {patientInfo?.prontuarioId}</p>
              {hasPreviousAssessments && (
                <div className="mt-2 flex items-center text-gold-500">
                  <History className="h-4 w-4 mr-1" />
                  <p className="text-sm font-medium">{previousAssessments.length} avaliações anteriores integradas</p>
                </div>
              )}
            </div>
            
            <Tabs defaultValue="medical" className="w-full mb-6">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="medical">Documentação Médica</TabsTrigger>
                <TabsTrigger value="patient">Sumário para Paciente</TabsTrigger>
              </TabsList>
              
              <TabsContent value="medical" className="space-y-6 pt-4">
                {/* Summary field with edit capability */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium leading-none">
                      Resumo da Avaliação
                    </label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsEditingSummary(!isEditingSummary)}
                      className="h-7 px-2"
                    >
                      {isEditingSummary ? <Check className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="h-24 bg-darkblue-800/50 border-darkblue-700"
                    readOnly={!isEditingSummary}
                  />
                </div>
                
                {/* Clinical Note field with edit capability */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium leading-none">
                      Nota Clínica
                    </label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsEditingClinicalNote(!isEditingClinicalNote)}
                      className="h-7 px-2"
                    >
                      {isEditingClinicalNote ? <Check className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Textarea
                    value={clinicalNote}
                    onChange={(e) => setClinicalNote(e.target.value)}
                    className="h-32 bg-darkblue-800/50 border-darkblue-700"
                    readOnly={!isEditingClinicalNote}
                  />
                </div>
                
                {/* Prescription field with edit capability */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium leading-none">
                      Prescrição
                    </label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsEditingPrescription(!isEditingPrescription)}
                      className="h-7 px-2"
                    >
                      {isEditingPrescription ? <Check className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Textarea
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    className="h-32 bg-darkblue-800/50 border-darkblue-700"
                    readOnly={!isEditingPrescription}
                  />
                </div>
                
                {/* AI Instruction for feedback to improve content */}
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    Instruções para a IA (opcional)
                  </label>
                  <Textarea
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    placeholder="Instrua a IA para melhorar a nota clínica, ex: 'Adicione mais detalhes sobre o tratamento' ou 'Foque mais nos sintomas respiratórios'"
                    className="h-24 bg-darkblue-800/50 border-darkblue-700"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={submitAiInstruction}
                    disabled={isSubmittingInstruction || !aiInstruction}
                    className="w-full"
                  >
                    {isSubmittingInstruction ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando instruções...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Atualizar documentação com instruções
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="patient" className="space-y-6 pt-4">
                {/* Patient-friendly summary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium leading-none">
                      Sumário para o Paciente
                    </label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsEditingPatientSummary(!isEditingPatientSummary)}
                      className="h-7 px-2"
                      disabled={!patientFriendlySummary}
                    >
                      {isEditingPatientSummary ? <Check className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Textarea
                    value={patientFriendlySummary}
                    onChange={(e) => setPatientFriendlySummary(e.target.value)}
                    className="h-64 bg-darkblue-800/50 border-darkblue-700"
                    readOnly={!isEditingPatientSummary}
                    placeholder={patientFriendlySummary ? "" : "Clique em 'Gerar sumário para paciente' para criar um resumo em linguagem acessível."}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={generatePatientFriendlySummary}
                    disabled={isGeneratingPatientSummary || !clinicalNote || !summary}
                    className="w-full"
                  >
                    {isGeneratingPatientSummary ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando sumário para paciente...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {patientFriendlySummary ? "Regenerar sumário para paciente" : "Gerar sumário para paciente"}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-400 italic">
                    Este sumário será apresentado ao paciente em linguagem não-técnica, similar ao estilo visual do Gamma.app
                  </p>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex gap-4">
              <Button 
                type="submit" 
                disabled={isSaving || isProcessing}
                className="bg-gold-500 hover:bg-gold-600 text-black flex-1"
              >
                {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={resetForm}
                disabled={isSaving || isProcessing}
              >
                Cancelar
              </Button>
            </div>
          </Card>
        </form>
      )}
    </Layout>
  );
};

export default DoctorAssessment;
