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
import AudioRecorder from '@/components/AudioRecording/AudioRecorder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PencilLine, Check, RotateCcw, History } from 'lucide-react';
import PatientInfoForm, { PatientInfo } from '@/components/PatientInfoForm';
import { PatientAssessment, fromPatientAssessments, AssessmentStatus } from '@/types/patientAssessments';

const DoctorAssessment = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [creatingAssessment, setCreatingAssessment] = useState(false);
  
  const [summary, setSummary] = useState('');
  const [clinicalNote, setClinicalNote] = useState('');
  const [prescription, setPrescription] = useState('');
  const [transcription, setTranscription] = useState('');
  const [patientFriendlySummary, setPatientFriendlySummary] = useState('');
  const [structuredData, setStructuredData] = useState<any>(null);
  
  const [previousAssessments, setPreviousAssessments] = useState<PatientAssessment[]>([]);
  const [hasPreviousAssessments, setHasPreviousAssessments] = useState(false);
  
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingClinicalNote, setIsEditingClinicalNote] = useState(false);
  const [isEditingPrescription, setIsEditingPrescription] = useState(false);
  const [isEditingPatientSummary, setIsEditingPatientSummary] = useState(false);
  
  const [aiInstruction, setAiInstruction] = useState('');
  const [isSubmittingInstruction, setIsSubmittingInstruction] = useState(false);
  
  const [currentStep, setCurrentStep] = useState<'info' | 'recording' | 'review'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [docsGenerated, setDocsGenerated] = useState(false);
  const [isGeneratingPatientSummary, setIsGeneratingPatientSummary] = useState(false);
  
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
  
  const createInitialAssessment = async (patientData: PatientInfo) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Não autenticado",
        description: "Você precisa estar logado para criar uma avaliação."
      });
      return null;
    }
    
    setCreatingAssessment(true);
    
    try {
      const newId = uuidv4();
      console.log("Creating initial assessment with ID:", newId);
      
      const assessmentData = {
        id: newId,
        doctor_id: user.id,
        patient_name: patientData.name,
        patient_email: patientData.email,
        prontuario_id: patientData.prontuarioId,
        status: 'in_progress' as AssessmentStatus
      };
      
      const patientAssessments = fromPatientAssessments(supabase);
      const { data, error } = await patientAssessments.insert(assessmentData);
      
      if (error) {
        console.error("Error creating initial assessment:", error);
        throw error;
      }
      
      console.log("Initial assessment created:", data);
      toast({
        title: "Avaliação iniciada",
        description: "Prossiga com a gravação da consulta."
      });
      
      return newId;
    } catch (error) {
      console.error('Error creating initial assessment:', error);
      toast({
        variant: "destructive",
        title: "Erro ao iniciar avaliação",
        description: "Não foi possível criar o registro inicial. Tente novamente."
      });
      return null;
    } finally {
      setCreatingAssessment(false);
    }
  };
  
  const updateAssessment = async () => {
    if (!assessmentId) {
      console.error("No assessment ID to update");
      return false;
    }
    
    try {
      setIsSaving(true);
      
      const patientAssessments = fromPatientAssessments(supabase);
      const { error } = await patientAssessments.update({
        summary,
        clinical_note: clinicalNote,
        prescription,
        patient_friendly_summary: patientFriendlySummary,
        transcription,
        structured_data: structuredData,
        status: 'completed' as AssessmentStatus
      }, assessmentId);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Avaliação salva com sucesso",
        description: "A avaliação do paciente foi atualizada e finalizada."
      });
      
      return true;
    } catch (error) {
      console.error('Error updating assessment:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar avaliação",
        description: "Não foi possível atualizar a avaliação do paciente."
      });
      
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
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
    
    const success = await updateAssessment();
    
    if (success) {
      resetForm();
    }
  };
  
  const resetForm = () => {
    setPatientInfo(null);
    setAssessmentId(null);
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
  
  const handleTranscriptionComplete = (text: string) => {
    setTranscription(text);
    
    if (assessmentId) {
      const patientAssessments = fromPatientAssessments(supabase);
      patientAssessments.update({
        transcription: text
      }, assessmentId).then(({ error }) => {
        if (error) {
          console.error("Error updating transcription:", error);
        } else {
          console.log("Transcription updated in assessment record");
        }
      });
    }
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
    
    setCurrentStep('review');
    
    if (assessmentId) {
      const patientAssessments = fromPatientAssessments(supabase);
      patientAssessments.update({
        clinical_note: data.clinical_note,
        prescription: data.prescription,
        summary: data.summary,
        structured_data: data.structured_data
      }, assessmentId).then(({ error }) => {
        if (error) {
          console.error("Error updating processed data:", error);
        } else {
          console.log("Processed data updated in assessment record");
        }
      });
    }
    
    toast({
      title: "Documentos gerados com sucesso",
      description: "Os documentos clínicos foram gerados e estão prontos para revisão."
    });
  };
  
  const handlePatientInfoSubmit = async (data: PatientInfo) => {
    setPatientInfo(data);
    
    const newId = await createInitialAssessment(data);
    
    if (newId) {
      setAssessmentId(newId);
      setCurrentStep('recording');
    } else {
      toast({
        variant: "destructive",
        title: "Erro ao iniciar avaliação",
        description: "Não foi possível passar para a próxima etapa. Tente novamente."
      });
    }
  };
  
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
        
        if (assessmentId) {
          const patientAssessments = fromPatientAssessments(supabase);
          patientAssessments.update({
            patient_friendly_summary: data.text
          }, assessmentId).then(({ error }) => {
            if (error) {
              console.error("Error updating patient friendly summary:", error);
            }
          });
        }
        
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
        
        if (assessmentId) {
          const patientAssessments = fromPatientAssessments(supabase);
          patientAssessments.update({
            clinical_note: data.text
          }, assessmentId).then(({ error }) => {
            if (error) {
              console.error("Error updating clinical note with AI instruction:", error);
            }
          });
        }
        
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
      
      {currentStep === 'info' && (
        <Card className="card-gradient p-6 max-w-2xl mb-6">
          <h2 className="text-lg font-semibold mb-4">Informações do Paciente</h2>
          <PatientInfoForm 
            onSubmit={handlePatientInfoSubmit}
            isLoading={creatingAssessment}
          />
        </Card>
      )}
      
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
            {assessmentId && (
              <p className="text-sm font-medium text-gray-300">ID da Avaliação: {assessmentId}</p>
            )}
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

