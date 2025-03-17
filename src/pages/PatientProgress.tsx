
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Activity, TrendingUp, Calendar, ArrowRight, Clock, LineChart, Award } from 'lucide-react';
import { PatientAssessment } from '@/types/patientAssessments';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

// Componente para mostrar progresso do tratamento
const PatientProgress = () => {
  const { profile } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [assessments, setAssessments] = useState<PatientAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!profile) return;
      
      try {
        setIsLoading(true);
        
        // Buscar avaliações do paciente
        const { data, error } = await supabase
          .from('patient_assessments')
          .select('*')
          .eq('patient_email', profile.email)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setAssessments(data || []);
        
        // Calcular tempo desde a primeira avaliação
        if (data && data.length > 0) {
          const firstAssessment = new Date(data[data.length - 1].created_at);
          const today = new Date();
          const diffTime = Math.abs(today.getTime() - firstAssessment.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setTimeElapsed(diffDays);
        }
      } catch (error) {
        console.error('Erro ao buscar dados do paciente:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar suas informações. Tente novamente mais tarde."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPatientData();
  }, [profile, toast]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  // Calcular progresso estimado baseado no tempo desde a primeira avaliação
  const calculateProgress = () => {
    // Assume um tratamento padrão de 90 dias para cálculo de exemplo
    const standardTreatment = 90;
    const progress = Math.min(Math.round((timeElapsed / standardTreatment) * 100), 100);
    return progress;
  };
  
  if (isLoading) {
    return (
      <Layout userType="paciente">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-40" />
          ))}
        </div>
        
        <Skeleton className="h-64 w-full" />
      </Layout>
    );
  }
  
  const progressValue = calculateProgress();
  
  return (
    <Layout userType="paciente">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Seu Progresso</h1>
        <p className="text-gray-400">
          Acompanhe sua evolução e tratamento
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="card-gradient p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-darkblue-800 p-3 rounded-full">
              <Activity className="text-gold-400 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Evolução</h3>
              <p className="text-sm text-gray-400">Status do tratamento</p>
            </div>
          </div>
          <div className="mb-2">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-gray-400">Progresso estimado</span>
              <span className="text-sm font-medium">{progressValue}%</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>
          <p className="text-sm text-gray-400 mt-4">
            {timeElapsed} {timeElapsed === 1 ? 'dia' : 'dias'} de tratamento
          </p>
        </Card>
        
        <Card className="card-gradient p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-darkblue-800 p-3 rounded-full">
              <TrendingUp className="text-gold-400 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Avaliações</h3>
              <p className="text-sm text-gray-400">Histórico clínico</p>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-2xl font-bold">{assessments.length}</p>
            <p className="text-sm text-gray-400">
              {assessments.length === 0
                ? 'Nenhuma avaliação registrada'
                : assessments.length === 1
                ? 'Avaliação registrada'
                : 'Avaliações registradas'}
            </p>
          </div>
          {assessments.length > 0 && (
            <p className="text-sm text-gray-400">
              Última avaliação: {formatDate(assessments[0].created_at)}
            </p>
          )}
        </Card>
        
        <Card className="card-gradient p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-darkblue-800 p-3 rounded-full">
              <Calendar className="text-gold-400 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Próxima Consulta</h3>
              <p className="text-sm text-gray-400">Agendamento</p>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-lg font-medium text-gray-400">Nenhuma consulta agendada</p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/paciente/agenda">Agendar consulta</Link>
          </Button>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-2 md:w-[400px] mb-4">
          <TabsTrigger value="overview" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Linha do Tempo
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-0">
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center text-gold-300">
                <LineChart className="h-5 w-5 mr-2" />
                Evolução do Tratamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assessments.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="mb-2">Nenhuma avaliação registrada ainda.</p>
                  <p className="text-sm">Seus dados de evolução serão exibidos aqui após sua primeira consulta.</p>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <h3 className="font-medium mb-2">Resumo do tratamento</h3>
                    <div className="bg-darkblue-800/50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">Início do tratamento</p>
                          <p className="font-medium">{formatDate(assessments[assessments.length - 1].created_at)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Última avaliação</p>
                          <p className="font-medium">{formatDate(assessments[0].created_at)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Tempo de tratamento</p>
                          <p className="font-medium">{timeElapsed} {timeElapsed === 1 ? 'dia' : 'dias'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Total de avaliações</p>
                          <p className="font-medium">{assessments.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Conquistas</h3>
                    <div className="bg-darkblue-800/50 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="bg-gold-500/20 p-2 rounded-full mr-3">
                          <Award className="h-5 w-5 text-gold-500" />
                        </div>
                        <div>
                          <h4 className="font-medium">Primeira Consulta</h4>
                          <p className="text-xs text-gray-400">Parabéns por iniciar seu tratamento!</p>
                        </div>
                      </div>
                      
                      {assessments.length > 1 && (
                        <div className="flex items-center mt-3">
                          <div className="bg-gold-500/20 p-2 rounded-full mr-3">
                            <Award className="h-5 w-5 text-gold-500" />
                          </div>
                          <div>
                            <h4 className="font-medium">Acompanhamento Contínuo</h4>
                            <p className="text-xs text-gray-400">Você já realizou múltiplas consultas!</p>
                          </div>
                        </div>
                      )}
                      
                      {timeElapsed > 30 && (
                        <div className="flex items-center mt-3">
                          <div className="bg-gold-500/20 p-2 rounded-full mr-3">
                            <Award className="h-5 w-5 text-gold-500" />
                          </div>
                          <div>
                            <h4 className="font-medium">30 Dias de Tratamento</h4>
                            <p className="text-xs text-gray-400">Um mês completo de evolução!</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline" className="mt-0">
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center text-gold-300">
                <Clock className="h-5 w-5 mr-2" />
                Histórico de Avaliações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assessments.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="mb-2">Nenhuma avaliação registrada ainda.</p>
                  <p className="text-sm">Sua linha do tempo será exibida aqui após sua primeira consulta.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Prontuário</TableHead>
                      <TableHead className="hidden md:table-cell">Tipo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessments.map((assessment) => (
                      <TableRow key={assessment.id}>
                        <TableCell className="font-medium">{formatDate(assessment.created_at)}</TableCell>
                        <TableCell>{assessment.prontuario_id}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {assessment.clinical_note ? 'Consulta Completa' : 'Avaliação Inicial'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/paciente/avaliacoes/${assessment.id}`}>
                              Detalhes
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default PatientProgress;
