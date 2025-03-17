
import React, { useState, useEffect, useContext } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Award, Trophy, Target, Star, Calendar, TrendingUp } from 'lucide-react';
import { PatientAssessment } from '@/types/patientAssessments';
import { Link } from 'react-router-dom';

// Estrutura para achievements
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  unlockedAt?: Date;
  category: 'tratamento' | 'consultas' | 'progresso';
}

const PatientAchievements = () => {
  const { profile } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [assessments, setAssessments] = useState<PatientAssessment[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [timeElapsed, setTimeElapsed] = useState(0);
  
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
  
  // Gerar conquistas baseadas nos dados do paciente
  useEffect(() => {
    if (assessments.length === 0 && !isLoading) {
      // Definir conquistas padrão bloqueadas se não houver avaliações
      setAchievements(generateDefaultAchievements(false));
      return;
    }
    
    if (assessments.length > 0) {
      const firstAssessmentDate = new Date(assessments[assessments.length - 1].created_at);
      const achievementsList = [
        // Conquistas de tratamento
        {
          id: 'first-assessment',
          title: 'Primeira Consulta',
          description: 'Parabéns por iniciar seu tratamento ortopédico!',
          icon: <Award className="h-6 w-6 text-gold-500" />,
          unlocked: true,
          unlockedAt: firstAssessmentDate,
          category: 'tratamento' as const
        },
        {
          id: '30-days',
          title: '30 Dias de Tratamento',
          description: 'Você completou um mês de evolução no seu tratamento!',
          icon: <Calendar className="h-6 w-6 text-gold-500" />,
          unlocked: timeElapsed >= 30,
          unlockedAt: timeElapsed >= 30 ? new Date(firstAssessmentDate.getTime() + 30 * 24 * 60 * 60 * 1000) : undefined,
          category: 'tratamento' as const
        },
        {
          id: '90-days',
          title: '90 Dias de Tratamento',
          description: 'Você completou três meses de evolução no seu tratamento!',
          icon: <TrendingUp className="h-6 w-6 text-gold-500" />,
          unlocked: timeElapsed >= 90,
          unlockedAt: timeElapsed >= 90 ? new Date(firstAssessmentDate.getTime() + 90 * 24 * 60 * 60 * 1000) : undefined,
          category: 'tratamento' as const
        },
        
        // Conquistas de consultas
        {
          id: 'multiple-assessments',
          title: 'Acompanhamento Contínuo',
          description: 'Você realizou múltiplas consultas de acompanhamento!',
          icon: <Star className="h-6 w-6 text-gold-500" />,
          unlocked: assessments.length >= 2,
          unlockedAt: assessments.length >= 2 ? new Date(assessments[assessments.length - 2].created_at) : undefined,
          category: 'consultas' as const
        },
        {
          id: 'five-assessments',
          title: 'Compromisso com a Saúde',
          description: 'Você completou cinco consultas de acompanhamento!',
          icon: <Trophy className="h-6 w-6 text-gold-500" />,
          unlocked: assessments.length >= 5,
          unlockedAt: assessments.length >= 5 ? new Date(assessments[assessments.length - 5].created_at) : undefined,
          category: 'consultas' as const
        },
        
        // Conquistas de progresso
        {
          id: 'progress-milestone',
          title: 'Marcos de Recuperação',
          description: 'Você atingiu marcos importantes na sua recuperação ortopédica!',
          icon: <Target className="h-6 w-6 text-gold-500" />,
          unlocked: assessments.length >= 3 && timeElapsed >= 45,
          unlockedAt: assessments.length >= 3 && timeElapsed >= 45 ? new Date() : undefined,
          category: 'progresso' as const
        }
      ];
      
      setAchievements(achievementsList);
    }
  }, [assessments, timeElapsed, isLoading]);
  
  // Gerar conquistas padrão (bloqueadas)
  const generateDefaultAchievements = (unlocked: boolean): Achievement[] => {
    return [
      {
        id: 'first-assessment',
        title: 'Primeira Consulta',
        description: 'Inicie seu tratamento ortopédico',
        icon: <Award className="h-6 w-6 text-gray-500" />,
        unlocked,
        category: 'tratamento'
      },
      {
        id: '30-days',
        title: '30 Dias de Tratamento',
        description: 'Complete um mês de evolução no seu tratamento',
        icon: <Calendar className="h-6 w-6 text-gray-500" />,
        unlocked: false,
        category: 'tratamento'
      },
      {
        id: 'multiple-assessments',
        title: 'Acompanhamento Contínuo',
        description: 'Realize múltiplas consultas de acompanhamento',
        icon: <Star className="h-6 w-6 text-gray-500" />,
        unlocked: false,
        category: 'consultas'
      }
    ];
  };
  
  const formatDate = (date?: Date) => {
    if (!date) return '';
    
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  // Filtrar conquistas por categoria
  const filteredAchievements = activeTab === 'all' 
    ? achievements 
    : achievements.filter(achievement => achievement.category === activeTab);
  
  // Calcular estatísticas de conquistas
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const unlockedPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
  
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
  
  return (
    <Layout userType="paciente">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Conquistas</h1>
        <p className="text-gray-400">
          Acompanhe seus marcos e conquistas de tratamento
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="card-gradient p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-darkblue-800 p-3 rounded-full">
              <Trophy className="text-gold-400 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Total</h3>
              <p className="text-sm text-gray-400">Conquistas desbloqueadas</p>
            </div>
          </div>
          <div className="mb-2">
            <p className="text-2xl font-bold">{unlockedCount}/{totalCount}</p>
            <p className="text-sm text-gray-400">
              {unlockedPercentage}% completado
            </p>
          </div>
        </Card>
        
        <Card className="card-gradient p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-darkblue-800 p-3 rounded-full">
              <TrendingUp className="text-gold-400 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Progresso</h3>
              <p className="text-sm text-gray-400">Tempo de tratamento</p>
            </div>
          </div>
          <div className="mb-2">
            <p className="text-2xl font-bold">{timeElapsed}</p>
            <p className="text-sm text-gray-400">
              {timeElapsed === 1 ? 'dia de tratamento' : 'dias de tratamento'}
            </p>
          </div>
        </Card>
        
        <Card className="card-gradient p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-darkblue-800 p-3 rounded-full">
              <Star className="text-gold-400 h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Avaliações</h3>
              <p className="text-sm text-gray-400">Consultas realizadas</p>
            </div>
          </div>
          <div className="mb-2">
            <p className="text-2xl font-bold">{assessments.length}</p>
            <p className="text-sm text-gray-400">
              {assessments.length === 1 ? 'avaliação feita' : 'avaliações feitas'}
            </p>
          </div>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4 md:w-[500px] mb-4">
          <TabsTrigger value="all" className="flex items-center">
            <Trophy className="h-4 w-4 mr-2" />
            Todas
          </TabsTrigger>
          <TabsTrigger value="tratamento" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Tratamento
          </TabsTrigger>
          <TabsTrigger value="consultas" className="flex items-center">
            <Star className="h-4 w-4 mr-2" />
            Consultas
          </TabsTrigger>
          <TabsTrigger value="progresso" className="flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Progresso
          </TabsTrigger>
        </TabsList>
        
        <Card className="card-gradient mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-gold-300">
              <Trophy className="h-5 w-5 mr-2" />
              {activeTab === 'all' ? 'Todas as Conquistas' : 
               activeTab === 'tratamento' ? 'Conquistas de Tratamento' :
               activeTab === 'consultas' ? 'Conquistas de Consultas' : 'Conquistas de Progresso'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAchievements.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="mb-2">Nenhuma conquista nesta categoria ainda.</p>
                <p className="text-sm">Continue seu tratamento para desbloquear conquistas!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAchievements.map((achievement) => (
                  <div 
                    key={achievement.id}
                    className={`p-4 rounded-lg border ${
                      achievement.unlocked 
                        ? 'bg-darkblue-800/50 border-gold-500/30' 
                        : 'bg-darkblue-800/20 border-gray-700/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-center mb-3">
                      <div className={`p-2 rounded-full mr-3 ${
                        achievement.unlocked ? 'bg-gold-500/20' : 'bg-gray-700/20'
                      }`}>
                        {achievement.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{achievement.title}</h4>
                        <p className="text-xs text-gray-400">{achievement.description}</p>
                      </div>
                    </div>
                    
                    {achievement.unlocked && achievement.unlockedAt && (
                      <div className="mt-2 text-xs text-gold-300/70">
                        Desbloqueado em {formatDate(achievement.unlockedAt)}
                      </div>
                    )}
                    
                    {!achievement.unlocked && (
                      <div className="mt-2 text-xs text-gray-500 italic">
                        Ainda não desbloqueado
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {assessments.length === 0 && (
              <div className="text-center mt-6">
                <p className="text-gray-400 mb-3">Realize sua primeira avaliação para começar a desbloquear conquistas!</p>
                <Button asChild>
                  <Link to="/paciente">Voltar ao Dashboard</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </Layout>
  );
};

export default PatientAchievements;
