
import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fromPatientAssessments, PatientAssessment } from '@/types/patientAssessments';
import { Loader2, ArrowLeft, CalendarClock, ClipboardList, FilePlus, User } from 'lucide-react';

const PatientDetail: React.FC = () => {
  const { prontuarioId } = useParams();
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [assessments, setAssessments] = useState<PatientAssessment[]>([]);
  const [currentTab, setCurrentTab] = useState('overview');

  useEffect(() => {
    const fetchPatientAssessments = async () => {
      if (!user || !prontuarioId) return;

      try {
        setIsLoading(true);
        
        const { data, error } = await fromPatientAssessments(supabase)
          .getByProntuarioId(prontuarioId);
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setAssessments(data as PatientAssessment[]);
        }
      } catch (error) {
        console.error('Error fetching patient assessments:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar avaliações",
          description: "Não foi possível carregar as avaliações do paciente. Tente novamente mais tarde."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPatientAssessments();
  }, [user, prontuarioId, toast]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (isLoading) {
    return (
      <Layout userType="medico">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
        </div>
      </Layout>
    );
  }

  if (assessments.length === 0) {
    return (
      <Layout userType="medico">
        <Button 
          variant="outline" 
          size="sm" 
          className="mb-6" 
          asChild
        >
          <Link to="/medico/pacientes">
            <ArrowLeft size={16} className="mr-2" />
            Voltar para Pacientes
          </Link>
        </Button>
        
        <Card className="card-gradient p-6 md:p-8 text-center">
          <h3 className="text-lg md:text-xl font-medium mb-2">Paciente não encontrado</h3>
          <p className="text-sm md:text-base text-gray-400">
            Não foi possível encontrar informações para este paciente.
          </p>
        </Card>
      </Layout>
    );
  }

  // Get patient info from the first assessment (they should all be the same patient)
  const patientInfo = assessments[0];

  return (
    <Layout userType="medico">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mb-2" 
            asChild
          >
            <Link to="/medico/pacientes">
              <ArrowLeft size={16} className="mr-2" />
              Voltar para Pacientes
            </Link>
          </Button>
          
          <h1 className="text-xl md:text-2xl font-bold">{patientInfo.patient_name}</h1>
          <p className="text-sm md:text-base text-gray-400">
            ID: {patientInfo.prontuario_id} | {patientInfo.patient_email}
          </p>
        </div>
        
        <Button 
          asChild
          className="bg-gold-500 hover:bg-gold-600 text-black"
        >
          <Link to="/medico/avaliacao">
            <FilePlus size={18} className="mr-2" />
            Nova Avaliação
          </Link>
        </Button>
      </div>
      
      <Tabs defaultValue="overview" className="w-full" value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:text-gold-500">
            <User size={16} className="mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="assessments" className="data-[state=active]:text-gold-500">
            <ClipboardList size={16} className="mr-2" />
            Avaliações
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-gold-500">Informações do Paciente</CardTitle>
              <CardDescription>Dados gerais do paciente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-400">Nome</h3>
                  <p>{patientInfo.patient_name}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-400">Email</h3>
                  <p>{patientInfo.patient_email}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-400">ID do Prontuário</h3>
                  <p>{patientInfo.prontuario_id}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-400">Primeira Consulta</h3>
                  <p>{formatDate(assessments[assessments.length - 1].created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-gold-500">Resumo das Avaliações</CardTitle>
              <CardDescription>Estatísticas e informações gerais</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-darkblue-800/50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-400 mb-1">Total de Avaliações</h3>
                  <p className="text-2xl font-bold text-gold-500">{assessments.length}</p>
                </div>
                <div className="bg-darkblue-800/50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-400 mb-1">Última Avaliação</h3>
                  <p className="text-sm">{formatDate(assessments[0].created_at)}</p>
                </div>
                <div className="bg-darkblue-800/50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-400 mb-1">Primeira Avaliação</h3>
                  <p className="text-sm">{formatDate(assessments[assessments.length - 1].created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assessments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-gold-500">Histórico de Avaliações</CardTitle>
              <CardDescription>Todas as avaliações do paciente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assessments.map((assessment) => (
                  <Card key={assessment.id} className="overflow-hidden hover:bg-darkblue-800/20 transition-colors">
                    <div className="p-4 border-l-4 border-gold-500">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CalendarClock size={16} className="text-gold-500" />
                          <span className="text-sm font-medium">{formatDate(assessment.created_at)}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          asChild
                        >
                          <Link to={`/medico/avaliacao/${assessment.id}`}>
                            Ver Detalhes
                          </Link>
                        </Button>
                      </div>
                      
                      {assessment.summary && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-400 mb-1">Resumo</h4>
                          <p className="text-sm">{assessment.summary}</p>
                        </div>
                      )}
                      
                      {assessment.clinical_note && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-400 mb-1">Nota Clínica</h4>
                          <p className="text-sm line-clamp-2">{assessment.clinical_note}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default PatientDetail;
