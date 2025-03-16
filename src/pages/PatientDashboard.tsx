import React, { useContext, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DashboardCard from '@/components/DashboardCard';
import AppointmentCard from '@/components/AppointmentCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, Calendar, Clock, FileText, Plus, CheckCircle, 
  ArrowRight, Award, Target, Zap, Shield, Flame
} from 'lucide-react';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { PatientAchievement } from '@/components/PatientAchievement';

const PatientDashboard = () => {
  const { profile } = useContext(AuthContext);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    appointmentsCount: 0,
    nextAppointment: null,
    daysToReview: 14,
    exercisesCompleted: 75,
    recoveryEstimate: 60,
    streak: 7,
    points: 450
  });
  
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!profile) return;
      
      try {
        setLoading(true);
        
        // In a real implementation, we would fetch this data from Supabase
        // For now, using mock data
        setStats({
          appointmentsCount: 8,
          nextAppointment: "28 Nov",
          daysToReview: 14,
          exercisesCompleted: 75,
          recoveryEstimate: 60,
          streak: 7,
          points: 450
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching patient data:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar seus dados. Tente novamente mais tarde."
        });
        setLoading(false);
      }
    };
    
    fetchPatientData();
  }, [profile, toast]);
  
  // Level calculation based on points
  const level = Math.floor(stats.points / 100);
  const levelProgress = (stats.points % 100);
  
  const achievements = [
    { 
      title: "Assiduidade", 
      description: "Não faltar a 5 consultas consecutivas", 
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      progress: 80,
      completed: false
    },
    { 
      title: "Exercícios Diários", 
      description: "Complete exercícios por 7 dias seguidos", 
      icon: <Flame className="h-6 w-6 text-orange-500" />,
      progress: 100,
      completed: true
    },
    { 
      title: "Documentação", 
      description: "Envie todos os documentos solicitados", 
      icon: <FileText className="h-6 w-6 text-blue-500" />,
      progress: 60,
      completed: false
    },
  ];
  
  return (
    <Layout userType="paciente">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Bem-vindo(a), <span className="text-gold-400">{profile?.full_name || 'Paciente'}</span>
        </h1>
        <p className="text-gray-400">
          Confira suas atividades, conquistas e próximas consultas
        </p>
      </div>
      
      {/* Gamified User Level */}
      <Card className="card-gradient p-4 mb-8 overflow-hidden relative">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-darkblue-700/30 rounded-full"></div>
        <div className="absolute right-20 -bottom-10 w-20 h-20 bg-darkblue-700/20 rounded-full"></div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 z-10 relative">
          <div className="p-3 bg-darkblue-700/50 rounded-full">
            <Award size={32} className="text-gold-400" />
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold">Nível {level}</h3>
              <span className="text-sm text-gold-400">{stats.points} pontos</span>
            </div>
            <Progress value={levelProgress} className="h-2 bg-darkblue-700" indicatorClassName="bg-gold-500" />
            <p className="text-xs text-gray-400 mt-1">
              Mais {100 - levelProgress} pontos para o próximo nível
            </p>
          </div>
          
          <div className="flex gap-2 items-center bg-darkblue-700/50 p-2 rounded-lg">
            <Flame className="text-orange-500" size={20} />
            <span className="font-medium">{stats.streak} dias</span>
            <span className="text-sm text-gray-400">de atividade</span>
          </div>
        </div>
      </Card>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <DashboardCard 
          title="Próxima Consulta" 
          value={stats.nextAppointment || "Nenhuma"} 
          icon={Calendar} 
        />
        <DashboardCard 
          title="Total de Consultas" 
          value={stats.appointmentsCount.toString()} 
          icon={CheckCircle} 
          color="gold"
        />
        <DashboardCard 
          title="Dias até Revisão" 
          value={stats.daysToReview.toString()} 
          icon={Clock} 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments Section */}
        <div className="lg:col-span-2">
          <Card className="card-gradient mb-6">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Próximas Consultas</h2>
                <Button variant="ghost" className="text-gold-400 hover:text-gold-300">
                  Ver todas <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <AppointmentCard 
                  date="28 de Novembro, 2023"
                  time="14:30"
                  doctor="Dr. Paulo Oliveira"
                  location="Clínica Ortopédica Central - Sala 302"
                  status="upcoming"
                  userType="paciente"
                />
                
                <AppointmentCard 
                  date="15 de Dezembro, 2023"
                  time="10:00"
                  doctor="Dra. Ana Medeiros"
                  location="Hospital São Lucas - Ala B"
                  status="upcoming"
                  userType="paciente"
                />
                
                <AppointmentCard 
                  date="10 de Novembro, 2023"
                  time="09:15"
                  doctor="Dr. Paulo Oliveira"
                  location="Clínica Ortopédica Central - Sala 302"
                  status="completed"
                  userType="paciente"
                />
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button className="bg-darkblue-700 hover:bg-darkblue-800 text-white">
                  <Plus size={16} className="mr-2" />
                  Agendar Nova Consulta
                </Button>
              </div>
            </div>
          </Card>
          
          {/* Achievements Section */}
          <Card className="card-gradient">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Conquistas</h2>
                <Button variant="ghost" className="text-gold-400 hover:text-gold-300">
                  Ver todas <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {achievements.map((achievement, index) => (
                  <PatientAchievement 
                    key={index}
                    title={achievement.title}
                    description={achievement.description}
                    icon={achievement.icon}
                    progress={achievement.progress}
                    completed={achievement.completed}
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>
        
        <div>
          {/* Notifications */}
          <Card className="card-gradient mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Notificações</h2>
              
              <div className="space-y-4">
                <div className="flex gap-3 p-3 rounded-lg bg-darkblue-800/50 border border-darkblue-700/30">
                  <div className="flex-shrink-0">
                    <Bell size={20} className="text-gold-400 mt-1" />
                  </div>
                  <div>
                    <p className="text-sm">Lembrete: Sua consulta com Dr. Paulo está marcada para amanhã às 14:30.</p>
                    <p className="text-xs text-gray-400 mt-1">Há 3 horas</p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 rounded-lg bg-darkblue-800/50 border border-darkblue-700/30">
                  <div className="flex-shrink-0">
                    <FileText size={20} className="text-gold-400 mt-1" />
                  </div>
                  <div>
                    <p className="text-sm">Seu relatório médico foi atualizado. Clique para visualizar.</p>
                    <p className="text-xs text-gray-400 mt-1">Ontem</p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 rounded-lg bg-darkblue-800/50 border border-darkblue-700/30">
                  <div className="flex-shrink-0">
                    <Bell size={20} className="text-gold-400 mt-1" />
                  </div>
                  <div>
                    <p className="text-sm">Dr. Paulo adicionou novos exercícios ao seu plano de tratamento.</p>
                    <p className="text-xs text-gray-400 mt-1">2 dias atrás</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button variant="outline" className="border-darkblue-700 w-full hover:bg-darkblue-800">
                  Ver Todas Notificações
                </Button>
              </div>
            </div>
          </Card>
          
          {/* Treatment Progress */}
          <Card className="card-gradient">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Progresso do Tratamento</h2>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Exercícios Realizados</span>
                    <span className="text-gold-400">{stats.exercisesCompleted}%</span>
                  </div>
                  <div className="w-full bg-darkblue-800 rounded-full h-2">
                    <div 
                      className="bg-gold-500 h-2 rounded-full" 
                      style={{ width: `${stats.exercisesCompleted}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Recuperação Estimada</span>
                    <span className="text-gold-400">{stats.recoveryEstimate}%</span>
                  </div>
                  <div className="w-full bg-darkblue-800 rounded-full h-2">
                    <div 
                      className="bg-gold-500 h-2 rounded-full" 
                      style={{ width: `${stats.recoveryEstimate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button variant="outline" className="border-darkblue-700 w-full hover:bg-darkblue-800">
                  Ver Detalhes do Tratamento
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PatientDashboard;
