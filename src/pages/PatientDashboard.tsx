import React, { useContext, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CalendarDays, FileText, Activity, Info, Award } from 'lucide-react';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import NotificationList from '@/components/NotificationList';
import { seedTestNotifications } from '@/types/notifications';

interface PatientAssessment {
  id: string;
  patient_name: string;
  prontuario_id: string;
  created_at: string;
  summary: string | null;
}

const PatientDashboard = () => {
  const { profile } = useContext(AuthContext);
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<PatientAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!profile) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('patient_assessments')
          .select('id, patient_name, prontuario_id, created_at, summary')
          .eq('patient_email', profile.email)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setAssessments(data || []);
      } catch (error) {
        console.error('Error fetching patient data:', error);
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
  
  useEffect(() => {
    const seedNotifications = async () => {
      if (!profile?.id) return;
      
      try {
        await seedTestNotifications(supabase, 'paciente', profile.id);
      } catch (error) {
        console.error('Error seeding notifications:', error);
      }
    };
    
    seedNotifications();
  }, [profile]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  return (
    <Layout userType="paciente">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Olá, {profile?.full_name?.split(' ')[0] || 'Paciente'}
        </h1>
        <p className="text-gray-400">
          Bem-vindo ao seu painel do paciente. Aqui você pode acompanhar sua evolução e próximas consultas.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="card-gradient p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-darkblue-800 p-3 rounded-full">
              <FileText className="text-gold-400 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Avaliações</h3>
              <p className="text-sm text-gray-400">Seus laudos médicos</p>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-2xl font-bold">{assessments.length}</p>
            <p className="text-sm text-gray-400">Avaliações realizadas</p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/paciente/avaliacoes">Ver todas</Link>
          </Button>
        </Card>
        
        <Card className="card-gradient p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-darkblue-800 p-3 rounded-full">
              <CalendarDays className="text-gold-400 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Agenda</h3>
              <p className="text-sm text-gray-400">Suas próximas consultas</p>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-gray-400">Consultas agendadas</p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/paciente/agenda">Ver agenda</Link>
          </Button>
        </Card>
        
        <Card className="card-gradient p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-darkblue-800 p-3 rounded-full">
              <Activity className="text-gold-400 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Progresso</h3>
              <p className="text-sm text-gray-400">Sua evolução de tratamento</p>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-2xl font-bold">{assessments.length > 0 ? 'Ativo' : '--'}</p>
            <p className="text-sm text-gray-400">
              {assessments.length > 0 
                ? `Desde ${assessments.length > 0 ? formatDate(assessments[assessments.length - 1].created_at) : ''}` 
                : 'Dados ainda não disponíveis'}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/paciente/progresso">Ver progresso</Link>
          </Button>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {profile?.id && (
            <div className="mb-8">
              <NotificationList 
                userId={profile.id} 
                userType="paciente" 
                limit={3} 
              />
            </div>
          )}

          <h2 className="text-xl font-semibold mb-4">Últimas Avaliações</h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((item) => (
                <Card key={item} className="p-4">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-20 w-full" />
                </Card>
              ))}
            </div>
          ) : assessments.length === 0 ? (
            <Card className="card-gradient p-6 text-center">
              <Info className="h-12 w-12 mx-auto mb-4 text-gold-400" />
              <h3 className="text-lg font-medium mb-2">Nenhuma avaliação encontrada</h3>
              <p className="text-gray-400 mb-4">
                Você ainda não possui avaliações registradas no sistema.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {assessments.slice(0, 2).map((assessment) => (
                <Card key={assessment.id} className="card-gradient p-4 hover:bg-darkblue-800/60 transition-colors">
                  <div className="mb-2">
                    <h3 className="font-semibold text-gold-300">Avaliação de {formatDate(assessment.created_at)}</h3>
                    <p className="text-sm text-gray-400">Prontuário: {assessment.prontuario_id}</p>
                  </div>
                  {assessment.summary ? (
                    <p className="text-gray-300 text-sm line-clamp-2 mb-3">
                      {assessment.summary}
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm italic mb-3">
                      Sem resumo disponível.
                    </p>
                  )}
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/paciente/avaliacoes/${assessment.id}`}>
                      Ver detalhes
                    </Link>
                  </Button>
                </Card>
              ))}
              
              {assessments.length > 2 && (
                <div className="text-center mt-4">
                  <Button asChild variant="link" className="text-gold-400">
                    <Link to="/paciente/avaliacoes">Ver todas as avaliações</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Conquistas</h2>
          <Card className="card-gradient p-6">
            <div className="text-center mb-4">
              <Award className="h-12 w-12 mx-auto mb-2 text-gold-400" />
              <h3 className="text-lg font-medium">Jornada de Recuperação</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-darkblue-800/70 rounded-lg p-3 border border-darkblue-700/50">
                <div className="flex items-center">
                  <div className="bg-gold-500/20 p-2 rounded-full mr-3">
                    <Award className="h-4 w-4 text-gold-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Primeira Consulta</h4>
                    <p className="text-xs text-gray-400">Iniciou seu tratamento</p>
                  </div>
                </div>
              </div>
              
              <div className={`bg-darkblue-800/${assessments.length > 1 ? '70' : '30'} rounded-lg p-3 border border-darkblue-700/${assessments.length > 1 ? '50' : '30'}`}>
                <div className={`flex items-center ${assessments.length > 1 ? '' : 'opacity-50'}`}>
                  <div className={`${assessments.length > 1 ? 'bg-gold-500/20' : 'bg-gray-700/20'} p-2 rounded-full mr-3`}>
                    <Award className={`h-4 w-4 ${assessments.length > 1 ? 'text-gold-500' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Consultas Múltiplas</h4>
                    <p className="text-xs text-gray-400">Realizou mais de uma consulta</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-darkblue-800/30 rounded-lg p-3 border border-darkblue-700/30">
                <div className="flex items-center opacity-50">
                  <div className="bg-gray-700/20 p-2 rounded-full mr-3">
                    <Award className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Exercícios Concluídos</h4>
                    <p className="text-xs text-gray-400">Completou todos os exercícios prescritos</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <Button asChild variant="link" className="text-gold-400">
                <Link to="/paciente/conquistas">Ver todas as conquistas</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PatientDashboard;
