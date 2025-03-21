import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AudioRecorder from '@/components/AudioRecording/AudioRecorder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronsRight, Plus, UserRound, FileText, Copy, Check } from 'lucide-react';

type AssessmentType = {
  id: string;
  created_at: string;
  patient_id: string;
  doctor_id: string;
  summary: string | null;
  clinical_note: string | null;
  prescription: string | null;
  status: string;
};

type PatientType = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  sex: string | null;
  prontuario_id: string | null;
};

type Step = 'patient-selection' | 'recording' | 'editing' | 'completed';

const DoctorAssessment = () => {
  const [currentStep, setCurrentStep] = useState<Step>('patient-selection');
  const [patients, setPatients] = useState<PatientType[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientType | null>(null);
  const [isNewPatientDialogOpen, setIsNewPatientDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ 
    full_name: '', 
    email: '', 
    phone: '', 
    date_of_birth: '', 
    sex: '',
    prontuario_id: ''
  });
  const [transcription, setTranscription] = useState('');
  const [clinicalNote, setClinicalNote] = useState('');
  const [prescription, setPrescription] = useState('');
  const [summary, setSummary] = useState('');
  const [structuredData, setStructuredData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [copiedFields, setCopiedFields] = useState<{[key: string]: boolean}>({});
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  
  useEffect(() => {
    if (id) {
      loadAssessment(id);
      setAssessmentId(id);
      setCurrentStep('editing');
    } else {
      fetchPatients();
    }
  }, [id]);
  
  const loadAssessment = async (assessmentId: string) => {
    try {
      const { data: assessment, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();
        
      if (error) throw error;
      
      if (assessment) {
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', assessment.patient_id)
          .single();
          
        if (patientError) throw patientError;
        
        setSelectedPatient(patient);
        setClinicalNote(assessment.clinical_note || '');
        setPrescription(assessment.prescription || '');
        setSummary(assessment.summary || '');
        
        if (assessment.structured_data) {
          try {
            setStructuredData(typeof assessment.structured_data === 'string' 
              ? JSON.parse(assessment.structured_data) 
              : assessment.structured_data);
          } catch (e) {
            console.error('Error parsing structured data:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error loading assessment:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar a avaliação",
      });
    }
  };
  
  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('full_name');
        
      if (error) throw error;
      
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao buscar lista de pacientes",
      });
    }
  };
  
  const handleCreatePatient = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([{
          full_name: newPatient.full_name,
          email: newPatient.email,
          phone: newPatient.phone || null,
          date_of_birth: newPatient.date_of_birth || null,
          sex: newPatient.sex || null,
          prontuario_id: newPatient.prontuario_id || null
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setPatients([...patients, data]);
      setSelectedPatient(data);
      setIsNewPatientDialogOpen(false);
      
      toast({
        title: "Sucesso",
        description: "Paciente cadastrado com sucesso",
      });
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao cadastrar paciente",
      });
    }
  };
  
  const handleSelectPatient = async () => {
    if (!selectedPatient) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Selecione um paciente para continuar",
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('assessments')
        .insert([{
          patient_id: selectedPatient.id,
          doctor_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'in_progress'
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setAssessmentId(data.id);
      setCurrentStep('recording');
      console.log("Assessment created, moving to recording step");
    } catch (error) {
      console.error('Error creating assessment:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao criar avaliação",
      });
    }
  };
  
  const handlePatientChange = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient || null);
  };
  
  const handleTranscriptionComplete = (text: string) => {
    setTranscription(text);
  };
  
  const handleProcessingStart = () => {
    setIsProcessing(true);
  };
  
  const handleProcessingComplete = (data: {
    clinical_note?: string;
    prescription?: string;
    summary?: string;
    structured_data?: any;
  }) => {
    setClinicalNote(data.clinical_note || '');
    setPrescription(data.prescription || '');
    setSummary(data.summary || '');
    setStructuredData(data.structured_data || null);
    setIsProcessing(false);
    setCurrentStep('editing');
  };
  
  const handleSaveAssessment = async () => {
    if (!assessmentId) return;
    
    try {
      const { error } = await supabase
        .from('assessments')
        .update({
          clinical_note: clinicalNote,
          prescription: prescription,
          summary: summary,
          structured_data: structuredData,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', assessmentId);
        
      if (error) throw error;
      
      setCurrentStep('completed');
      toast({
        title: "Sucesso",
        description: "Avaliação salva com sucesso",
      });
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar avaliação",
      });
    }
  };
  
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFields({...copiedFields, [field]: true});
    
    setTimeout(() => {
      setCopiedFields({...copiedFields, [field]: false});
    }, 2000);
    
    toast({
      title: "Copiado",
      description: "Texto copiado para a área de transferência"
    });
  };
  
  const renderPatientSelectionStep = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Selecionar Paciente</h3>
          <p className="text-sm text-gray-400">Selecione um paciente existente ou cadastre um novo.</p>
        </div>
        
        <div className="space-y-4">
          <Select onValueChange={handlePatientChange}>
            <SelectTrigger className="bg-darkblue-700 border-darkblue-600 w-full">
              <SelectValue placeholder="Selecione um paciente" />
            </SelectTrigger>
            <SelectContent className="bg-darkblue-700 border-darkblue-600">
              {patients.map(patient => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => setIsNewPatientDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Novo Paciente
          </Button>
        </div>
        
        <Button 
          className="bg-gold-500 hover:bg-gold-600 text-black w-full"
          onClick={handleSelectPatient}
          disabled={!selectedPatient}
        >
          Avançar
          <ChevronsRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  };
  
  const renderRecordingStep = () => {
    return (
      <div className="space-y-6">
        <div className="bg-darkblue-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <UserRound className="h-5 w-5 text-gold-500" />
            <h3 className="text-lg font-medium">Informações do Paciente</h3>
          </div>
          {selectedPatient && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Nome</p>
                <p>{selectedPatient.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p>{selectedPatient.email}</p>
              </div>
              {selectedPatient.phone && (
                <div>
                  <p className="text-sm text-gray-400">Telefone</p>
                  <p>{selectedPatient.phone}</p>
                </div>
              )}
              {selectedPatient.date_of_birth && (
                <div>
                  <p className="text-sm text-gray-400">Data de Nascimento</p>
                  <p>{new Date(selectedPatient.date_of_birth).toLocaleDateString('pt-BR')}</p>
                </div>
              )}
              {selectedPatient.sex && (
                <div>
                  <p className="text-sm text-gray-400">Sexo</p>
                  <p>{selectedPatient.sex === 'male' ? 'Masculino' : 'Feminino'}</p>
                </div>
              )}
              {selectedPatient.prontuario_id && (
                <div>
                  <p className="text-sm text-gray-400">ID do Prontuário</p>
                  <p>{selectedPatient.prontuario_id}</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-darkblue-800 p-4 rounded-lg">
          <AudioRecorder 
            onTranscriptionComplete={handleTranscriptionComplete}
            onProcessingStart={handleProcessingStart}
            onProcessingComplete={handleProcessingComplete}
            patientInfo={{
              prontuarioId: selectedPatient?.prontuario_id || undefined,
              email: selectedPatient?.email
            }}
          />
        </div>
        
        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('patient-selection')}
          >
            Voltar
          </Button>
          
          <Button 
            disabled={isProcessing || (!clinicalNote && !prescription && !summary)}
            onClick={() => setCurrentStep('editing')}
          >
            {isProcessing ? (
              <>Processando...</>
            ) : (
              <>
                Avançar
                <ChevronsRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };
  
  const renderEditingStep = () => {
    return (
      <div className="space-y-6">
        <Tabs defaultValue="clinical_note" className="space-y-4">
          <TabsList>
            <TabsTrigger value="clinical_note">Nota Clínica</TabsTrigger>
            <TabsTrigger value="prescription">Prescrição</TabsTrigger>
            <TabsTrigger value="summary">Resumo</TabsTrigger>
            {structuredData && <TabsTrigger value="structured_data">Dados Estruturados</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="clinical_note" className="space-y-2">
            <div className="flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(clinicalNote, 'clinical_note')}
                disabled={copiedFields['clinical_note']}
              >
                {copiedFields['clinical_note'] ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <Textarea 
              value={clinicalNote} 
              onChange={(e) => setClinicalNote(e.target.value)} 
              className="bg-darkblue-700 border-darkblue-600 min-h-[150px]"
            />
          </TabsContent>
          
          <TabsContent value="prescription" className="space-y-2">
            <div className="flex justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard(prescription, 'prescription')}
                disabled={copiedFields['prescription']}
              >
                {copiedFields['prescription'] ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <Textarea 
              value={prescription} 
              onChange={(e) => setPrescription(e.target.value)} 
              className="bg-darkblue-700 border-darkblue-600 min-h-[150px]"
            />
          </TabsContent>
          
          <TabsContent value="summary" className="space-y-2">
            <div className="flex justify-end">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard(summary, 'summary')}
                disabled={copiedFields['summary']}
              >
                {copiedFields['summary'] ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <Textarea 
              value={summary} 
              onChange={(e) => setSummary(e.target.value)} 
              className="bg-darkblue-700 border-darkblue-600 min-h-[150px]"
            />
          </TabsContent>
          
          {structuredData && (
            <TabsContent value="structured_data">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(structuredData).map(([key, value]: [string, any]) => (
                  <div key={key} className="space-y-2">
                    <p className="text-sm text-gray-400">{key}</p>
                    {typeof value === 'string' || typeof value === 'number' ? (
                      <p>{value}</p>
                    ) : (
                      <pre>{JSON.stringify(value, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
        
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setCurrentStep('recording')}>
            Voltar
          </Button>
          
          <Button 
            className="bg-gold-500 hover:bg-gold-600 text-black"
            onClick={handleSaveAssessment}
          >
            Salvar Avaliação
          </Button>
        </div>
      </div>
    );
  };
  
  const renderCompletedStep = () => {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Avaliação Concluída!</h2>
          <p className="text-gray-400">A avaliação foi salva com sucesso.</p>
        </div>
        
        <div className="flex justify-center">
          <Button onClick={() => navigate('/doctor/assessments')}>
            Voltar para Avaliações
          </Button>
        </div>
      </div>
    );
  };
  
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'patient-selection':
        return renderPatientSelectionStep();
      case 'recording':
        return renderRecordingStep();
      case 'editing':
        return renderEditingStep();
      case 'completed':
        return renderCompletedStep();
      default:
        return null;
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            {id ? 'Editar Avaliação' : 'Nova Avaliação'}
          </h1>
          <p className="text-gray-400">
            {currentStep === 'patient-selection' && 'Selecione um paciente para iniciar a avaliação'}
            {currentStep === 'recording' && 'Grave o áudio da consulta para gerar a documentação'}
            {currentStep === 'editing' && 'Revise e edite os documentos gerados pela IA'}
            {currentStep === 'completed' && 'Avaliação concluída com sucesso'}
          </p>
        </div>
        
        <Card className="bg-darkblue-900 border-darkblue-700 text-white p-6">
          {renderCurrentStep()}
        </Card>
      </div>
      
      <Dialog open={isNewPatientDialogOpen} onOpenChange={setIsNewPatientDialogOpen}>
        <DialogContent className="bg-darkblue-800 text-white border-darkblue-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Paciente</DialogTitle>
            <DialogDescription className="text-gray-400">
              Preencha os dados do paciente para cadastrá-lo no sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Nome Completo</label>
              <Input
                id="name"
                value={newPatient.full_name}
                onChange={(e) => setNewPatient({...newPatient, full_name: e.target.value})}
                className="bg-darkblue-700 border-darkblue-600"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                value={newPatient.email}
                onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                className="bg-darkblue-700 border-darkblue-600"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">Telefone</label>
              <Input
                id="phone"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                className="bg-darkblue-700 border-darkblue-600"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="dob" className="text-sm font-medium">Data de Nascimento</label>
              <Input
                id="dob"
                type="date"
                value={newPatient.date_of_birth}
                onChange={(e) => setNewPatient({...newPatient, date_of_birth: e.target.value})}
                className="bg-darkblue-700 border-darkblue-600"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="sex" className="text-sm font-medium">Sexo</label>
              <Select 
                value={newPatient.sex} 
                onValueChange={(value) => setNewPatient({...newPatient, sex: value})}
              >
                <SelectTrigger className="bg-darkblue-700 border-darkblue-600">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-darkblue-700 border-darkblue-600">
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="prontuario_id" className="text-sm font-medium">ID do Prontuário</label>
              <Input
                id="prontuario_id"
                value={newPatient.prontuario_id}
                onChange={(e) => setNewPatient({...newPatient, prontuario_id: e.target.value})}
                className="bg-darkblue-700 border-darkblue-600"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleCreatePatient}
              className="bg-gold-500 hover:bg-gold-600 text-black"
              disabled={!newPatient.full_name || !newPatient.email}
            >
              Cadastrar Paciente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default DoctorAssessment;
