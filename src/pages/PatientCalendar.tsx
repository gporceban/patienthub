
import React, { useState, useEffect, useContext } from 'react';
import { DayPicker } from 'react-day-picker';
import { pt } from 'date-fns/locale';
import { format } from 'date-fns';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { AuthContext } from '@/contexts/AuthContext';
import { Calendar, Plus, ClipboardList, Link as LinkIcon } from 'lucide-react';
import { getCalComOAuthUrl, getCalComToken } from '@/services/calComService';
import { supabase } from '@/integrations/supabase/client';
import { fromAppointments } from '@/types/doctorProfile';

const PatientCalendar = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalComConnected, setIsCalComConnected] = useState(false);
  
  useEffect(() => {
    const checkCalComConnection = async () => {
      if (!user) return;
      
      try {
        const token = await getCalComToken(user.id);
        setIsCalComConnected(!!token);
      } catch (error) {
        console.error('Error checking Cal.com connection:', error);
      }
    };
    
    const fetchAppointments = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await fromAppointments(supabase)
          .getByPatientId(user.id);
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setAppointments(data);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar consultas",
          description: "Não foi possível carregar suas consultas agendadas. Tente novamente mais tarde."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkCalComConnection();
    fetchAppointments();
  }, [user, toast]);
  
  const handleConnectCalCom = () => {
    const redirectUri = `${window.location.origin}/calcom/callback`;
    const authUrl = getCalComOAuthUrl(redirectUri);
    window.location.href = authUrl;
  };
  
  const formatAppointmentDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt });
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'bg-green-500/20 text-green-500';
      case 'pendente':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'cancelado':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };
  
  return (
    <Layout userType="paciente">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Meu Calendário</h1>
        <p className="text-gray-400">
          Visualize e gerencie suas consultas agendadas
        </p>
      </div>
      
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="bg-darkblue-800">
          <TabsTrigger value="appointments" className="data-[state=active]:bg-darkblue-700">
            <ClipboardList className="h-4 w-4 mr-2" />
            Consultas
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-darkblue-700">
            <Calendar className="h-4 w-4 mr-2" />
            Calendário
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="appointments" className="mt-6">
          <div className="space-y-4">
            {!isCalComConnected && (
              <Card className="card-gradient p-6 text-center">
                <h3 className="text-xl font-medium mb-4">Conecte seu Calendário</h3>
                <p className="text-gray-400 mb-6">
                  Conecte sua conta ao Cal.com para gerenciar suas consultas de forma mais eficiente.
                </p>
                <Button 
                  onClick={handleConnectCalCom} 
                  className="bg-gold-500 hover:bg-gold-600 text-black"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Conectar ao Cal.com
                </Button>
              </Card>
            )}
            
            {appointments.length === 0 ? (
              <Card className="card-gradient p-6 text-center">
                <h3 className="text-xl font-medium mb-2">Nenhuma Consulta Agendada</h3>
                <p className="text-gray-400 mb-6">
                  Você ainda não possui consultas agendadas. 
                </p>
                <Button className="bg-gold-500 hover:bg-gold-600 text-black">
                  <Plus className="h-4 w-4 mr-2" />
                  Agendar Consulta
                </Button>
              </Card>
            ) : (
              appointments.map((appointment) => (
                <Card key={appointment.id} className="card-gradient p-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                          {appointment.status}
                        </span>
                        <span className="text-gold-500 font-medium">
                          {formatAppointmentDate(appointment.date_time)}
                        </span>
                      </div>
                      <h3 className="font-semibold">{appointment.location}</h3>
                      {appointment.notes && (
                        <p className="text-sm text-gray-400 mt-1">{appointment.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 self-end md:self-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                      >
                        Reagendar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="calendar" className="mt-6">
          <Card className="card-gradient p-6">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={setSelected}
              locale={pt}
              className="text-gold-500 bg-darkblue-800/50 p-4 rounded-lg"
              modifiersClassNames={{
                selected: 'bg-gold-500 text-black rounded-lg',
                today: 'text-white font-bold',
              }}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default PatientCalendar;
