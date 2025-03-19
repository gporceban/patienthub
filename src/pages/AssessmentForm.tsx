
import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const AssessmentForm = () => {
  const { prontuarioId } = useParams<{ prontuarioId: string }>();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const isNewAssessment = prontuarioId === 'novo';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState<any>({
    title: '',
    description: '',
    patient_id: '',
    doctor_id: user?.id || '',
    assessment_data: {}
  });
  
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  
  useEffect(() => {
    if (!user) return;
    
    // Fetch patients list for the doctor
    const fetchPatients = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, full_name')
          .eq('doctor_id', user.id);
          
        if (error) throw error;
        
        setPatients(data || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar pacientes",
          description: "Não foi possível carregar a lista de pacientes."
        });
      }
    };
    
    // If editing existing assessment, fetch its data
    const fetchAssessment = async () => {
      if (isNewAssessment) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', prontuarioId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setAssessment(data);
          setSelectedPatient(data.patient_id);
        }
      } catch (error) {
        console.error('Error fetching assessment:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar avaliação",
          description: "Não foi possível carregar os dados da avaliação."
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatients();
    fetchAssessment();
  }, [user, prontuarioId, isNewAssessment, toast]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAssessment(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPatient(e.target.value);
    setAssessment(prev => ({
      ...prev,
      patient_id: e.target.value
    }));
  };
  
  const handleSave = async () => {
    if (!assessment.title) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha o título da avaliação."
      });
      return;
    }
    
    if (!assessment.patient_id) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, selecione um paciente."
      });
      return;
    }
    
    setSaving(true);
    
    try {
      let result;
      
      if (isNewAssessment) {
        result = await supabase
          .from('assessments')
          .insert({
            ...assessment,
            doctor_id: user?.id
          })
          .select()
          .single();
      } else {
        result = await supabase
          .from('assessments')
          .update(assessment)
          .eq('id', prontuarioId)
          .select()
          .single();
      }
      
      if (result.error) throw result.error;
      
      toast({
        title: "Avaliação salva",
        description: "A avaliação foi salva com sucesso."
      });
      
      navigate('/medico/avaliacao');
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar a avaliação. Tente novamente."
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (isNewAssessment) return;
    
    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', prontuarioId);
        
      if (error) throw error;
      
      toast({
        title: "Avaliação excluída",
        description: "A avaliação foi excluída com sucesso."
      });
      
      navigate('/medico/avaliacao');
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir a avaliação. Tente novamente."
      });
    }
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gold-400">
            {isNewAssessment ? 'Nova Avaliação' : 'Editar Avaliação'}
          </h1>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/medico/avaliacao')}
              className="border-gray-500 text-gray-400 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gold-500 text-black hover:bg-gold-600"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            
            {!isNewAssessment && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Avaliação</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        
        <Card className="card-gradient p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="patient_id">Paciente</Label>
              <select
                id="patient_id"
                name="patient_id"
                value={selectedPatient}
                onChange={handlePatientChange}
                className="w-full p-2 rounded-md bg-darkblue-800 border border-darkblue-600 text-white"
                disabled={!isNewAssessment}
              >
                <option value="">Selecione um paciente</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="title">Título da Avaliação</Label>
              <Input
                id="title"
                name="title"
                value={assessment.title}
                onChange={handleInputChange}
                placeholder="Ex: Avaliação Inicial - Joelho"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              value={assessment.description}
              onChange={handleInputChange}
              placeholder="Descreva brevemente o objetivo desta avaliação..."
              rows={4}
            />
          </div>
        </Card>
        
        <Tabs defaultValue="general">
          <TabsList className="bg-darkblue-800 border-b border-darkblue-600 mb-6">
            <TabsTrigger value="general">Informações Gerais</TabsTrigger>
            <TabsTrigger value="exam">Exame Físico</TabsTrigger>
            <TabsTrigger value="treatment">Tratamento</TabsTrigger>
            <TabsTrigger value="notes">Anotações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <Card className="card-gradient p-6">
              <h3 className="text-lg font-medium text-gold-400 mb-4">Informações Gerais</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="complaint">Queixa Principal</Label>
                  <Textarea
                    id="complaint"
                    name="assessment_data.complaint"
                    value={assessment.assessment_data?.complaint || ''}
                    onChange={(e) => setAssessment({
                      ...assessment,
                      assessment_data: {
                        ...assessment.assessment_data,
                        complaint: e.target.value
                      }
                    })}
                    placeholder="Descreva a queixa principal do paciente..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="history">Histórico</Label>
                  <Textarea
                    id="history"
                    name="assessment_data.history"
                    value={assessment.assessment_data?.history || ''}
                    onChange={(e) => setAssessment({
                      ...assessment,
                      assessment_data: {
                        ...assessment.assessment_data,
                        history: e.target.value
                      }
                    })}
                    placeholder="Histórico da condição atual..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="previous_treatments">Tratamentos Anteriores</Label>
                  <Textarea
                    id="previous_treatments"
                    name="assessment_data.previous_treatments"
                    value={assessment.assessment_data?.previous_treatments || ''}
                    onChange={(e) => setAssessment({
                      ...assessment,
                      assessment_data: {
                        ...assessment.assessment_data,
                        previous_treatments: e.target.value
                      }
                    })}
                    placeholder="Tratamentos já realizados para esta condição..."
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="exam">
            <Card className="card-gradient p-6">
              <h3 className="text-lg font-medium text-gold-400 mb-4">Exame Físico</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="physical_exam">Observações do Exame Físico</Label>
                  <Textarea
                    id="physical_exam"
                    name="assessment_data.physical_exam"
                    value={assessment.assessment_data?.physical_exam || ''}
                    onChange={(e) => setAssessment({
                      ...assessment,
                      assessment_data: {
                        ...assessment.assessment_data,
                        physical_exam: e.target.value
                      }
                    })}
                    placeholder="Resultados do exame físico..."
                    rows={5}
                  />
                </div>
                
                <div>
                  <Label htmlFor="diagnostics">Exames Complementares</Label>
                  <Textarea
                    id="diagnostics"
                    name="assessment_data.diagnostics"
                    value={assessment.assessment_data?.diagnostics || ''}
                    onChange={(e) => setAssessment({
                      ...assessment,
                      assessment_data: {
                        ...assessment.assessment_data,
                        diagnostics: e.target.value
                      }
                    })}
                    placeholder="Resultados de raio-x, ressonância, ultrassom, etc..."
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="treatment">
            <Card className="card-gradient p-6">
              <h3 className="text-lg font-medium text-gold-400 mb-4">Plano de Tratamento</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="diagnosis">Diagnóstico</Label>
                  <Textarea
                    id="diagnosis"
                    name="assessment_data.diagnosis"
                    value={assessment.assessment_data?.diagnosis || ''}
                    onChange={(e) => setAssessment({
                      ...assessment,
                      assessment_data: {
                        ...assessment.assessment_data,
                        diagnosis: e.target.value
                      }
                    })}
                    placeholder="Diagnóstico clínico..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="treatment_plan">Plano de Tratamento</Label>
                  <Textarea
                    id="treatment_plan"
                    name="assessment_data.treatment_plan"
                    value={assessment.assessment_data?.treatment_plan || ''}
                    onChange={(e) => setAssessment({
                      ...assessment,
                      assessment_data: {
                        ...assessment.assessment_data,
                        treatment_plan: e.target.value
                      }
                    })}
                    placeholder="Detalhes do plano de tratamento recomendado..."
                    rows={5}
                  />
                </div>
                
                <div>
                  <Label htmlFor="medications">Medicamentos</Label>
                  <Textarea
                    id="medications"
                    name="assessment_data.medications"
                    value={assessment.assessment_data?.medications || ''}
                    onChange={(e) => setAssessment({
                      ...assessment,
                      assessment_data: {
                        ...assessment.assessment_data,
                        medications: e.target.value
                      }
                    })}
                    placeholder="Medicamentos prescritos..."
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="notes">
            <Card className="card-gradient p-6">
              <h3 className="text-lg font-medium text-gold-400 mb-4">Anotações Adicionais</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">Anotações Gerais</Label>
                  <Textarea
                    id="notes"
                    name="assessment_data.notes"
                    value={assessment.assessment_data?.notes || ''}
                    onChange={(e) => setAssessment({
                      ...assessment,
                      assessment_data: {
                        ...assessment.assessment_data,
                        notes: e.target.value
                      }
                    })}
                    placeholder="Outras observações relevantes..."
                    rows={6}
                  />
                </div>
                
                <div>
                  <Label htmlFor="followup">Plano de Acompanhamento</Label>
                  <Textarea
                    id="followup"
                    name="assessment_data.followup"
                    value={assessment.assessment_data?.followup || ''}
                    onChange={(e) => setAssessment({
                      ...assessment,
                      assessment_data: {
                        ...assessment.assessment_data,
                        followup: e.target.value
                      }
                    })}
                    placeholder="Próximas consultas, reavaliações, etc..."
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AssessmentForm;
