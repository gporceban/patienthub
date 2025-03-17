
import React, { useState, useEffect, useContext } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CalendarClock, ChevronDown, Clock, MapPin, Plus, User, ArrowLeft, Link
} from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import Cal, { getCalApi } from "@calcom/embed-react";
import { useNavigate } from 'react-router-dom';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';
import { useCalComToken, fetchUserAppointments, getOAuthRedirectUrl, CalComAppointment } from '@/services/calComService';

const PatientCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [showCalCom, setShowCalCom] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'default' | 'connect' | 'manage'>('default');
  const [isConnected, setIsConnected] = useState(false);
  const [appointments, setAppointments] = useState<CalComAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { fetchToken } = useCalComToken();

  // Cal.com integration
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({"namespace":"fst"});
      cal("ui", {
        "cssVarsPerTheme": {
          "light": {"cal-brand":"#1b3341"},
          "dark": {"cal-brand":"#f9f9f9"}
        },
        "hideEventTypeDetails": false,
        "layout": "month_view"
      });
    })();
  }, []);

  // Check if user is connected to Cal.com and fetch appointments
  useEffect(() => {
    const checkCalComConnection = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const token = await fetchToken();
        setIsConnected(!!token);
        
        if (token) {
          const userAppointments = await fetchUserAppointments(token);
          setAppointments(userAppointments || []);
        }
      } catch (error) {
        console.error("Error checking Cal.com connection:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkCalComConnection();
  }, [user, fetchToken]);
  
  // Filter appointments for the selected date
  const filteredAppointments = date && appointments.length > 0
    ? appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.startTime);
        return (
          appointmentDate.getDate() === date.getDate() && 
          appointmentDate.getMonth() === date.getMonth() && 
          appointmentDate.getFullYear() === date.getFullYear()
        );
      })
    : [];
  
  // Generate appointment times for new booking
  const appointmentTimes = [];
  for (let i = 8; i <= 17; i++) {
    appointmentTimes.push(`${i}:00`);
    if (i < 17) appointmentTimes.push(`${i}:30`);
  }

  // Handle Connect to Cal.com
  const handleConnectCalCom = () => {
    const redirectUrl = `${window.location.origin}/calcom/callback`;
    const authUrl = getOAuthRedirectUrl(redirectUrl);
    window.location.href = authUrl;
  };
  
  return (
    <Layout userType="paciente">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Agenda de Consultas
        </h1>
        <p className="text-gray-400">
          Visualize e agende suas consultas
        </p>
      </div>
      
      {showCalCom ? (
        <Card className="card-gradient p-6 h-[700px]">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Agendamento via Cal.com</h2>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-darkblue-700 hover:bg-darkblue-800"
              onClick={() => setShowCalCom(false)}
            >
              <ArrowLeft size={16} className="mr-2" />
              Voltar
            </Button>
          </div>
          
          <div className="h-[600px] bg-darkblue-800/50 rounded-lg">
            <Cal 
              namespace="fst"
              calLink="porceban/fst"
              style={{width:"100%", height:"100%", overflow:"scroll"}}
              config={{
                "layout": "month_view",
                "hideEventTypeDetails": false,
                "calOrigin": "https://cal.com",
                "apiKey": "cal_live_5247aff40f6b3e5b267eff4ed6a9f8be"
              }}
            />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="card-gradient p-6 lg:col-span-1">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Calendário</h2>
              
              {isConnected ? (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-darkblue-700 hover:bg-darkblue-800"
                    >
                      <Plus size={16} className="mr-2" />
                      Nova
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="bg-darkblue-900 border-darkblue-700">
                    <SheetHeader>
                      <SheetTitle className="text-white">Agendar Consulta</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-darkblue-700 hover:bg-darkblue-800"
                        onClick={() => setShowCalCom(true)}
                      >
                        <Calendar size={18} className="mr-2 text-gold-400" />
                        Agendar via Cal.com
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-darkblue-700 hover:bg-darkblue-800"
                      >
                        <User size={18} className="mr-2 text-gold-400" />
                        Agendar com Médico
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-darkblue-700 hover:bg-darkblue-800"
                  onClick={handleConnectCalCom}
                >
                  <Link size={16} className="mr-2" />
                  Conectar Cal.com
                </Button>
              )}
            </div>
            
            <div className="bg-darkblue-800/50 rounded-lg p-3 mb-6">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={ptBR}
                className="border-none bg-transparent"
              />
            </div>
            
            <h3 className="font-medium mb-2">Próximas Consultas</h3>
            
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold-500"></div>
                </div>
              ) : appointments.length > 0 ? (
                appointments.map(appointment => (
                  <div 
                    key={appointment.id}
                    className="p-3 rounded-lg bg-darkblue-800/50 border border-darkblue-700/30 hover:bg-darkblue-700/30 transition-colors cursor-pointer"
                  >
                    <div className="flex gap-3 items-start">
                      <div className="bg-darkblue-700 rounded-full p-2 flex-shrink-0">
                        <CalendarClock size={16} className="text-gold-400" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {format(new Date(appointment.startTime), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                          <Clock size={14} />
                          {format(new Date(appointment.startTime), "HH:mm")}
                        </div>
                        <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                          <User size={14} />
                          {appointment.attendees[0]?.name || "Não especificado"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-400">
                  {isConnected ? 
                    "Nenhuma consulta agendada" : 
                    "Conecte sua conta Cal.com para ver consultas"
                  }
                </div>
              )}
            </div>
          </Card>
          
          <Card className="card-gradient p-6 lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-1">
                {date ? format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
              </h2>
              <p className="text-gray-400">
                {filteredAppointments.length 
                  ? `${filteredAppointments.length} consulta(s) agendada(s)` 
                  : "Nenhuma consulta agendada para esta data"}
              </p>
            </div>
            
            {filteredAppointments.length > 0 ? (
              <div className="space-y-4">
                {filteredAppointments.map(appointment => (
                  <div 
                    key={appointment.id} 
                    className="p-4 rounded-lg bg-darkblue-800/50 border border-darkblue-700/30"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium">{appointment.title}</h3>
                        <p className="text-sm text-gold-400">
                          {format(new Date(appointment.startTime), "HH:mm")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-darkblue-700 hover:bg-darkblue-800">
                          Reagendar
                        </Button>
                        <Button variant="outline" size="sm" className="border-red-700 text-red-400 hover:bg-red-900/20">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <User size={14} className="text-gray-400" />
                        <span>{appointment.attendees[0]?.name || "Não especificado"}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-400">
                        <MapPin size={14} className="text-gray-400 mt-1 flex-shrink-0" />
                        <span>{appointment.location || "Local não especificado"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-darkblue-800/50 rounded-full">
                    <CalendarClock size={32} className="text-gold-400" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-2">Agende uma Consulta</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Não há consultas agendadas para esta data. Escolha um horário disponível abaixo ou use nosso sistema de agendamento integrado.
                </p>
                
                {isConnected ? (
                  <Button 
                    variant="default" 
                    className="bg-gold-500 hover:bg-gold-600 text-darkblue-950 mb-6"
                    onClick={() => setShowCalCom(true)}
                  >
                    Agendar com Cal.com
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    className="bg-gold-500 hover:bg-gold-600 text-darkblue-950 mb-6"
                    onClick={handleConnectCalCom}
                  >
                    Conectar com Cal.com
                  </Button>
                )}
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {appointmentTimes.map((time, index) => (
                    <Button 
                      key={index}
                      variant="outline" 
                      className="border-darkblue-700 hover:bg-darkblue-800"
                    >
                      {time}
                    </Button>
                  ))}
                </div>
                
                <Separator className="my-6 bg-darkblue-700" />
                
                <div className="flex flex-col md:flex-row justify-center gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="border-darkblue-700 hover:bg-darkblue-800">
                        Selecionar Especialista
                        <ChevronDown size={16} className="ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="bg-darkblue-800 border-darkblue-700">
                      <div className="space-y-2">
                        <div className="px-2 py-1.5 hover:bg-darkblue-700 rounded cursor-pointer">
                          Dr. Paulo Oliveira
                        </div>
                        <div className="px-2 py-1.5 hover:bg-darkblue-700 rounded cursor-pointer">
                          Dra. Ana Medeiros
                        </div>
                        <div className="px-2 py-1.5 hover:bg-darkblue-700 rounded cursor-pointer">
                          Dr. Roberto Santos
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="border-darkblue-700 hover:bg-darkblue-800">
                        Tipo de Consulta
                        <ChevronDown size={16} className="ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="bg-darkblue-800 border-darkblue-700">
                      <div className="space-y-2">
                        <div className="px-2 py-1.5 hover:bg-darkblue-700 rounded cursor-pointer">
                          Consulta de Rotina
                        </div>
                        <div className="px-2 py-1.5 hover:bg-darkblue-700 rounded cursor-pointer">
                          Avaliação
                        </div>
                        <div className="px-2 py-1.5 hover:bg-darkblue-700 rounded cursor-pointer">
                          Retorno
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </Layout>
  );
};

export default PatientCalendar;
