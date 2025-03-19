import React, { useContext, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { AuthContext } from '@/contexts/AuthContext';
import NotificationList from '@/components/NotificationList';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, ClipboardCheck, Activity, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface DashboardStat {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  link: string;
  linkText: string;
}

const DoctorDashboard = () => {
  const { profile } = useContext(AuthContext);
  const { toast } = useToast();
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    assessments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchDoctorStats = async () => {
      if (!profile?.id) return;
      
      try {
        setIsLoading(true);
        
        // Get patient count
        const { count: patientCount, error: patientError } = await supabase
          .from('appointments')
          .select('patient_id', { count: 'exact', head: true })
          .eq('doctor_id', profile.id)
          .is('status', 'completed');
          
        if (patientError) throw patientError;
        
        // Get appointment count
        const { count: appointmentCount, error: appointmentError } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', profile.id);
          
        if (appointmentError) throw appointmentError;
        
        // Get assessment count
        const { count: assessmentCount, error: assessmentError } = await supabase
          .from('patient_assessments')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', profile.id);
          
        if (assessmentError) throw assessmentError;
        
        setStats({
          patients: patientCount || 0,
          appointments: appointmentCount || 0,
          assessments: assessmentCount || 0,
        });
      } catch (error) {
        console.error('Error fetching doctor stats:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar estatísticas",
          description: "Não foi possível carregar suas estatísticas. Tente novamente mais tarde."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDoctorStats();
  }, [profile, toast]);
  
  const dashboardStats: DashboardStat[] = [
    {
      title: "Pacientes",
      value: stats.patients,
      icon: <Users className="h-6 w-6 text-gold-400" />,
      description: "Total de pacientes atendidos",
      link: "/medico/pacientes",
      linkText: "Ver pacientes"
    },
    {
      title: "Consultas",
      value: stats.appointments,
      icon: <CalendarDays className="h-6 w-6 text-gold-400" />,
      description: "Consultas realizadas e agendadas",
      link: "/medico/agenda",
      linkText: "Ver agenda"
    },
    {
      title: "Avaliações",
      value: stats.assessments,
      icon: <ClipboardCheck className="h-6 w-6 text-gold-400" />,
      description: "Avaliações realizadas",
      link: "/medico/avaliacao",
      linkText: "Ver avaliações"
    }
  ];
  
  return (
    <Layout userType="medico">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Bem-vindo, Dr. {profile?.full_name?.split(' ')[0] || ''}</h1>
        <p className="text-gray-400">
          Gerencie seus pacientes, consultas e acompanhe suas notificações.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Notifications section */}
          {profile?.id && (
            <div className="mb-8">
              <NotificationList 
                userId={profile.id} 
                userType="medico" 
                limit={5} 
              />
            </div>
          )}
          
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {dashboardStats.map((stat, index) => (
              <Card key={index} className="card-gradient p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-darkblue-800 p-2 rounded-full">
                    {stat.icon}
                  </div>
                  <h3 className="text-lg font-semibold">{stat.title}</h3>
                </div>
                <p className="text-3xl font-bold mb-1">{isLoading ? '...' : stat.value}</p>
                <p className="text-sm text-gray-400 mb-4">{stat.description}</p>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to={stat.link}>{stat.linkText}</Link>
                </Button>
              </Card>
            ))}
          </div>
          
          {/* Recent activity */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Atividade Recente</h2>
              <Button asChild variant="link" className="text-gold-400">
                <Link to="/medico/agenda">
                  Ver tudo <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            <Card className="card-gradient p-6">
              <div className="flex justify-center items-center flex-col py-8">
                <Activity className="h-16 w-16 text-gray-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma atividade recente</h3>
                <p className="text-gray-400 text-center max-w-md mb-4">
                  Suas atividades recentes aparecerão aqui. Comece agendando consultas ou registrando avaliações.
                </p>
                <div className="flex gap-3 mt-2">
                  <Button asChild variant="default" size="sm">
                    <Link to="/medico/agenda">Agendar Consulta</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/medico/avaliacao">Nova Avaliação</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        <div>
          {/* Quick actions */}
          <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
          <Card className="card-gradient p-5 mb-6">
            <div className="space-y-3">
              <Button asChild className="w-full justify-start" variant="secondary">
                <Link to="/medico/agenda">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Agendar Nova Consulta
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="secondary">
                <Link to="/medico/avaliacao">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Criar Nova Avaliação
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="secondary">
                <Link to="/medico/pacientes">
                  <Users className="mr-2 h-4 w-4" />
                  Gerenciar Pacientes
                </Link>
              </Button>
            </div>
          </Card>
          
          {/* Upcoming appointments */}
          <h2 className="text-xl font-semibold mb-4">Próximas Consultas</h2>
          <Card className="card-gradient p-5">
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 mx-auto text-gray-500 mb-3" />
              <h3 className="text-lg font-medium mb-2">Nenhuma consulta agendada</h3>
              <p className="text-gray-400 mb-4">
                Você não tem consultas agendadas para os próximos dias.
              </p>
              <Button asChild size="sm">
                <Link to="/medico/agenda">Ver Agenda Completa</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default DoctorDashboard;
