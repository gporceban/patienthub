import React, { useState, useEffect, useContext } from 'react';
import Layout from '@/components/Layout';
import DashboardCard from '@/components/DashboardCard';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Users, Calendar, FileText, Search, Plus, MapPin, Clock, ArrowRight, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Appointment {
  id: string;
  patient_id: string;
  date_time: string;
  location: string;
  status: string;
  patient_name?: string;
}

interface AppointmentStats {
  total: number;
  today: number;
  active_patients: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  icon_type: string;
  created_at: string;
  read: boolean;
}

const DoctorDashboard = () => {
  const { user, profile } = useContext(AuthContext);
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<AppointmentStats>({
    total: 0,
    today: 0,
    active_patients: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  
  useEffect(() => {
    const fetchAppointmentsAndStats = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        console.log("Fetching appointments for doctor:", user.id);
        
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            id,
            patient_id,
            date_time,
            location,
            status
          `)
          .eq('doctor_id', user.id)
          .order('date_time', { ascending: true });
          
        if (appointmentsError) {
          console.error("Error fetching appointments:", appointmentsError);
          throw appointmentsError;
        }
        
        console.log("Appointments data received:", appointmentsData);
        
        if (appointmentsData && appointmentsData.length > 0) {
          const appointmentsWithNames = await Promise.all(
            appointmentsData.map(async (appointment) => {
              if (!appointment || !appointment.patient_id) {
                return { ...appointment, patient_name: 'Desconhecido' };
              }
              
              try {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', appointment.patient_id)
                  .single();
                  
                return {
                  ...appointment,
                  patient_name: profileData?.full_name || 'Paciente'
                };
              } catch (error) {
                console.error("Error fetching patient name:", error);
                return {
                  ...appointment,
                  patient_name: 'Paciente'
                };
              }
            })
          );
          
          setAppointments(appointmentsWithNames as Appointment[]);
          
          const todayAppointments = appointmentsWithNames.filter(
            app => app?.date_time?.startsWith(today)
          ).length;
          
          const uniquePatients = new Set(
            appointmentsWithNames
              .filter(app => app && app.patient_id)
              .map(app => app.patient_id)
          ).size;
          
          setStats({
            total: appointmentsWithNames.length,
            today: todayAppointments,
            active_patients: uniquePatients
          });
        } else {
          console.log("No appointments found for doctor:", user.id);
          setAppointments([]);
          setStats({
            total: 0,
            today: 0,
            active_patients: 0
          });
        }
        
        try {
          const { count: assessmentCount, error: assessmentError } = await supabase
            .from('patient_assessments')
            .select('id', { count: 'exact', head: true })
            .eq('doctor_id', user.id);
            
          if (!assessmentError && assessmentCount !== null) {
            setStats(prev => ({
              ...prev,
              total: prev.total + assessmentCount
            }));
          }
        } catch (assessmentError) {
          console.error("Error fetching assessments:", assessmentError);
        }
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError("Erro ao carregar dados. Verifique sua conexão com a internet e tente novamente.");
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados do dashboard."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAppointmentsAndStats();
  }, [user, today, toast]);
  
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
      try {
        setNotificationsLoading(true);
        
        const { data, error } = await supabase
          .from('doctor_notifications')
          .select('*')
          .eq('doctor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (error) {
          throw error;
        }
        
        if (data) {
          setNotifications(data as Notification[]);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar notificações",
          description: "Não foi possível carregar as notificações."
        });
      } finally {
        setNotificationsLoading(false);
      }
    };
    
    fetchNotifications();
  }, [user, toast]);
  
  const filteredAppointments = appointments.filter(appointment => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      appointment.patient_name?.toLowerCase().includes(query) ||
      appointment.location.toLowerCase().includes(query)
    );
  });
  
  const todaysAppointments = appointments.filter(
    appointment => appointment.date_time.startsWith(today)
  );
  
  const formatAppointmentTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };
  
  const formatAppointmentDate = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const formatNotificationTime = (dateTimeString: string) => {
    const now = new Date();
    const date = new Date(dateTimeString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `Há ${diffInMinutes} minuto${diffInMinutes !== 1 ? 's' : ''}`;
    } else if (diffInMinutes < 1440) { // less than a day
      const hours = Math.floor(diffInMinutes / 60);
      return `Há ${hours} hora${hours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      if (days === 1) return 'Ontem';
      return `Há ${days} dias`;
    }
  };
  
  const getIconForNotification = (iconType: string) => {
    switch (iconType) {
      case 'calendar':
        return <Calendar className="h-4 w-4 text-blue-400" />;
      case 'user':
        return <Users className="h-4 w-4 text-emerald-400" />;
      default:
        return <Bell className="h-4 w-4 text-amber-400" />;
    }
  };
  
  const getIconBgForNotification = (iconType: string) => {
    switch (iconType) {
      case 'calendar':
        return 'bg-blue-950';
      case 'user':
        return 'bg-emerald-950';
      default:
        return 'bg-amber-950';
    }
  };
  
  const doctorName = profile?.full_name || "Dr. Paulo Oliveira";
  
  const renderDashboardCards = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((index) => (
            <Card key={index} className="card-gradient p-6">
              <Skeleton className="h-6 w-1/3 mb-3" />
              <Skeleton className="h-8 w-1/4" />
            </Card>
          ))}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <DashboardCard
          title="Pacientes Ativos"
          value={stats.active_patients.toString()}
          icon={Users}
        />
        
        <DashboardCard
          title="Consultas Hoje"
          value={stats.today.toString()}
          icon={Calendar}
        />
        
        <DashboardCard
          title="Total de Atendimentos"
          value={stats.total.toString()}
          icon={FileText}
        />
      </div>
    );
  };
  
  const renderRecentPatients = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    if (filteredAppointments.length === 0) {
      return (
        <div className="text-center py-6 border border-dashed border-darkblue-700 rounded-lg">
          <Users className="h-10 w-10 mx-auto text-gray-400 mb-2" />
          <h3 className="text-lg font-medium mb-1">Nenhum paciente cadastrado</h3>
          <p className="text-gray-400 mb-4">Você ainda não possui pacientes cadastrados no sistema.</p>
          <Button asChild size="sm" className="bg-gold-500 hover:bg-gold-600 text-black">
            <Link to="/medico/pacientes">
              <Plus size={16} className="mr-2" />
              Adicionar Paciente
            </Link>
          </Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {filteredAppointments.slice(0, 3).map((appointment) => (
          <div key={appointment.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-darkblue-800 rounded-full h-9 w-9 flex items-center justify-center text-sm font-medium text-gold-400">
                {appointment.patient_name?.split(' ').map(name => name[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{appointment.patient_name}</p>
                <p className="text-xs text-gray-400">Consulta: {formatAppointmentDate(appointment.date_time)}, {formatAppointmentTime(appointment.date_time)}</p>
              </div>
            </div>
          </div>
        ))}
        
        <Button asChild variant="link" className="mt-2 text-gold-400">
          <Link to="/medico/pacientes">
            Ver Todos os Pacientes
          </Link>
        </Button>
      </div>
    );
  };
  
  const renderNotifications = () => {
    if (notificationsLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="p-3 border border-darkblue-700 rounded-lg bg-darkblue-800/40">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    if (notifications.length === 0) {
      return (
        <div className="text-center py-6 border border-dashed border-darkblue-700 rounded-lg">
          <Bell className="h-10 w-10 mx-auto text-gray-400 mb-2" />
          <h3 className="text-lg font-medium mb-1">Sem notificações</h3>
          <p className="text-gray-400">Você não tem novas notificações no momento.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div key={notification.id} className="p-3 border border-darkblue-700 rounded-lg bg-darkblue-800/40">
            <div className="flex items-start gap-3">
              <div className={`${getIconBgForNotification(notification.icon_type)} rounded-full p-2 mt-1`}>
                {getIconForNotification(notification.icon_type)}
              </div>
              <div>
                <p className="font-medium text-sm">{notification.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatNotificationTime(notification.created_at)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <Layout userType="medico" userName={profile?.full_name || "Dr. Paulo Oliveira"}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          Bem-vindo, <span className="text-gold-400">{profile?.full_name || "Dr. Paulo Oliveira"}</span>
        </h1>
        <p className="text-gray-400">
          Gerencie seus pacientes e consultas
        </p>
      </div>
      
      {renderDashboardCards()}
      
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6 text-red-200">
          <p>{error}</p>
          <Button 
            variant="outline" 
            className="mt-2 border-red-800 hover:bg-red-900/30"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="card-gradient p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Agenda do Dia</h2>
              
              <Button asChild variant="link" className="text-gold-400">
                <Link to="/medico/consultas">
                  Ver agenda completa 
                  <ArrowRight size={16} className="ml-2" />
                </Link>
              </Button>
            </div>
            
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="search"
                  placeholder="Buscar paciente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-darkblue-800/50 border-darkblue-700"
                />
              </div>
            </div>
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="p-4 border border-darkblue-700 rounded-lg bg-darkblue-800/40">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-5 w-32" />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : todaysAppointments.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-darkblue-700 rounded-lg">
                <Calendar className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                <h3 className="text-lg font-medium mb-1">Sem consultas hoje</h3>
                <p className="text-gray-400 mb-4">Você não tem consultas agendadas para hoje.</p>
                <Button asChild size="sm" className="bg-gold-500 hover:bg-gold-600 text-black">
                  <Link to="/medico/consultas">
                    <Plus size={16} className="mr-2" />
                    Agendar Consulta
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="p-4 border border-darkblue-700 rounded-lg bg-darkblue-800/40 hover:bg-darkblue-800/60 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            className={
                              appointment.status === 'agendada' 
                                ? "bg-emerald-900/70 text-emerald-300 hover:bg-emerald-900" 
                                : appointment.status === 'concluída'
                                ? "bg-blue-900/70 text-blue-300 hover:bg-blue-900"
                                : "bg-orange-900/70 text-orange-300 hover:bg-orange-900"
                            }
                          >
                            {appointment.status === 'agendada' ? 'Agendada' :
                             appointment.status === 'concluída' ? 'Concluída' : 'Pendente'}
                          </Badge>
                          <span className="text-gold-400 font-semibold">{appointment.patient_name}</span>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm text-gray-400">
                          <div className="flex items-center">
                            <Clock size={14} className="mr-1" />
                            {formatAppointmentTime(appointment.date_time)}
                          </div>
                          <div className="hidden md:block text-gray-500">•</div>
                          <div className="flex items-center">
                            <MapPin size={14} className="mr-1" />
                            {appointment.location}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-darkblue-700">
                          Remarcar
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-800 text-red-400 hover:bg-red-950">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        
        <div>
          <Card className="card-gradient p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Notificações</h2>
            
            {renderNotifications()}
            
            <Button 
              variant="link" 
              className="w-full mt-3 text-gold-400"
              onClick={async () => {
                if (notifications.length === 0) return;
                
                try {
                  await supabase
                    .from('doctor_notifications')
                    .update({ read: true })
                    .eq('doctor_id', user?.id || '')
                    .eq('read', false);
                    
                  toast({
                    title: "Notificações marcadas como lidas",
                    description: "Todas as notificações foram marcadas como lidas."
                  });
                } catch (error) {
                  console.error('Error marking notifications as read:', error);
                }
              }}
            >
              Marcar Todas Como Lidas
            </Button>
          </Card>
          
          <Card className="card-gradient p-6">
            <h2 className="text-xl font-semibold mb-4">Pacientes Recentes</h2>
            
            {renderRecentPatients()}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default DoctorDashboard;
