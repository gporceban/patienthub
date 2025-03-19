
import React, { useState, useEffect, useContext } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { AuthContext } from '@/contexts/AuthContext';
import { Calendar as CalendarIcon, Plus, ClipboardList, Link as LinkIcon, FileText, Clock } from 'lucide-react';
import { calComWrapper, CalComBooking } from '@/services/calComWrapper';
import { supabase } from '@/integrations/supabase/client';
import { PatientAssessment, fromPatientAssessments } from '@/types/patientAssessments';
import AssessmentCard from '@/components/AssessmentCard';
import { Skeleton } from '@/components/ui/skeleton';
import CalendarDatePicker from '@/components/CalendarDatePicker';

const PatientCalendar = () => {
  const { user, profile } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [selected, setSelected] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<CalComBooking[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<CalComBooking[]>([]);
  const [assessments, setAssessments] = useState<PatientAssessment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(true);
  const [isCalComConnected, setIsCalComConnected] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Function to fetch all appointments
  const fetchAppointments = async () => {
    if (!user) return;
    
    setIsLoadingAppointments(true);
    try {
      const bookings = await calComWrapper.getBookings();
      
      if (bookings) {
        // Filter bookings to show only those for the current patient
        const patientEmail = profile?.email;
        if (patientEmail) {
          const patientBookings = bookings.filter(booking => 
            booking.attendees?.some(attendee => attendee.email === patientEmail)
          );
          setAppointments(patientBookings);
          filterAppointmentsByDate(patientBookings, selected);
        }
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar consultas",
        description: "Não foi possível carregar suas consultas agendadas. Tente novamente mais tarde."
      });
    } finally {
      setIsLoadingAppointments(false);
    }
  };
  
  // Function to filter appointments by selected date
  const filterAppointmentsByDate = (appts: CalComBooking[], date: Date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const filtered = appts.filter(appointment => {
      const appointmentDate = parseISO(appointment.startTime);
      return appointmentDate >= dayStart && appointmentDate <= dayEnd;
    });
    
    setFilteredAppointments(filtered);
  };
  
  useEffect(() => {
    const checkCalComConnection = async () => {
      if (!user) return;
      
      try {
        const connected = await calComWrapper.isConnected(user.id);
        setIsCalComConnected(connected);
        
        if (connected) {
          fetchAppointments();
        }
      } catch (error) {
        console.error('Error checking Cal.com connection:', error);
      }
    };
    
    const fetchAssessments = async () => {
      if (!profile) return;
      
      setIsLoadingAssessments(true);
      try {
        const { data, error } = await fromPatientAssessments(supabase)
          .getByPatientEmail(profile.email);
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setAssessments(data);
        }
      } catch (error) {
        console.error('Error fetching assessments:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar avaliações",
          description: "Não foi possível carregar suas avaliações. Tente novamente mais tarde."
        });
      } finally {
        setIsLoadingAssessments(false);
      }
    };
    
    checkCalComConnection();
    fetchAssessments();
  }, [user, profile, toast]);
  
  // Effect to filter appointments when selected date changes
  useEffect(() => {
    filterAppointmentsByDate(appointments, selected);
  }, [selected, appointments]);
  
  const handleConnectCalCom = () => {
    // Use the current window origin for the redirect
    const redirectUri = `${window.location.origin}/calcom/callback`;
    console.log("Using redirect URI:", redirectUri);
    
    // Get OAuth URL and redirect
    const authUrl = calComWrapper.getOAuthUrl(redirectUri);
    console.log("Redirecting to Cal.com auth URL:", authUrl);
    window.location.href = authUrl;
  };
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelected(date);
    }
  };
  
  const formatAppointmentDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt });
    } catch (error) {
      console.error("Error parsing date:", error);
      return dateString;
    }
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'confirmado':
        return 'bg-green-500/20 text-green-500';
      case 'pending':
      case 'pendente':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'cancelled':
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
          Visualize e gerencie suas consultas e avaliações
        </p>
      </div>
      
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="bg-darkblue-800">
          <TabsTrigger value="appointments" className="data-[state=active]:bg-darkblue-700">
            <ClipboardList className="h-4 w-4 mr-2" />
            Consultas
          </TabsTrigger>
          <TabsTrigger value="assessments" className="data-[state=active]:bg-darkblue-700">
            <FileText className="h-4 w-4 mr-2" />
            Avaliações
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-darkblue-700">
            <CalendarIcon className="h-4 w-4 mr-2" />
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
            
            {isCalComConnected && (
              <div className="flex justify-end mb-4">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gold-500 hover:bg-gold-600 text-black">
                      <Plus className="h-4 w-4 mr-2" />
                      Agendar Consulta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="card-gradient sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Agendar Nova Consulta</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-gray-400 mb-4">
                        Para agendar uma nova consulta, você será redirecionado para o sistema de agendamento online do consultório.
                      </p>
                      <Button 
                        className="bg-gold-500 hover:bg-gold-600 text-black w-full"
                        onClick={() => {
                          // Redirect to Cal.com booking page
                          window.open('https://cal.com/drporceban/consulta', '_blank');
                        }}
                      >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Agendar no Sistema Online
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            
            {isLoadingAppointments ? (
              Array(3).fill(0).map((_, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-64" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                </Card>
              ))
            ) : appointments.length === 0 ? (
              <Card className="card-gradient p-6 text-center">
                <h3 className="text-xl font-medium mb-2">Nenhuma Consulta Agendada</h3>
                <p className="text-gray-400 mb-6">
                  Você ainda não possui consultas agendadas. 
                </p>
                {isCalComConnected && (
                  <Button 
                    className="bg-gold-500 hover:bg-gold-600 text-black"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agendar Consulta
                  </Button>
                )}
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <CalendarDatePicker 
                    selected={selected}
                    onSelect={handleDateSelect}
                    className="h-full"
                  />
                  
                  <Card className="card-gradient p-6">
                    <h3 className="text-xl font-medium mb-4 flex items-center">
                      <Clock className="mr-2 h-5 w-5 text-gold-500" />
                      Consultas para {format(selected, "dd 'de' MMMM", { locale: pt })}
                    </h3>
                    
                    {filteredAppointments.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">
                        Nenhuma consulta agendada para esta data.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {filteredAppointments.map((appointment) => (
                          <div key={appointment.id} className="border-b border-gray-700 pb-3 last:border-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                                {appointment.status}
                              </span>
                              <span className="text-gold-500 font-medium">
                                {format(parseISO(appointment.startTime), "HH:mm", { locale: pt })}
                              </span>
                            </div>
                            <h4 className="font-medium">{appointment.title}</h4>
                            {appointment.location && (
                              <p className="text-sm text-gray-400 mt-1">Local: {appointment.location}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
                
                <h3 className="text-xl font-medium mb-4">Todas as Consultas</h3>
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <Card key={appointment.id} className="card-gradient p-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                              {appointment.status}
                            </span>
                            <span className="text-gold-500 font-medium">
                              {formatAppointmentDate(appointment.startTime)}
                            </span>
                          </div>
                          <h3 className="font-semibold">{appointment.title}</h3>
                          {appointment.location && (
                            <p className="text-sm text-gray-400">Local: {appointment.location}</p>
                          )}
                          {appointment.description && (
                            <p className="text-sm text-gray-400 mt-1">{appointment.description}</p>
                          )}
                        </div>
                        
                        <div className="flex gap-2 self-end md:self-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              window.open('https://cal.com/reschedule', '_blank');
                            }}
                          >
                            Reagendar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => {
                              window.open('https://cal.com/cancel', '_blank');
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="assessments" className="mt-6">
          <div className="space-y-4">
            {isLoadingAssessments ? (
              Array(3).fill(0).map((_, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-6 w-64" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                </Card>
              ))
            ) : assessments.length === 0 ? (
              <Card className="card-gradient p-6 text-center">
                <h3 className="text-xl font-medium mb-2">Nenhuma Avaliação Encontrada</h3>
                <p className="text-gray-400 mb-6">
                  Você ainda não possui avaliações registradas.
                </p>
              </Card>
            ) : (
              assessments.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  id={assessment.id}
                  patientName={assessment.patient_name}
                  prontuarioId={assessment.prontuario_id}
                  createdAt={assessment.created_at}
                  summary={assessment.summary}
                  userType="paciente"
                  status="completed"
                />
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="calendar" className="mt-6">
          <CalendarDatePicker
            selected={selected}
            onSelect={handleDateSelect}
            showNavigation={true}
          />
          
          <Card className="card-gradient p-6 mt-6">
            <h3 className="text-xl font-medium mb-4 flex items-center">
              <Clock className="mr-2 h-5 w-5 text-gold-500" />
              Agenda do dia {format(selected, "dd 'de' MMMM", { locale: pt })}
            </h3>
            
            {isLoadingAppointments ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, index) => (
                  <div key={index} className="border-b border-gray-700 pb-3">
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-32" />
                    </div>
                    <Skeleton className="h-4 w-48 mt-2" />
                  </div>
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                Nenhuma consulta agendada para esta data.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => (
                  <div key={appointment.id} className="border-b border-gray-700 pb-3 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gold-500 font-medium">
                        {format(parseISO(appointment.startTime), "HH:mm", { locale: pt })}
                        {" - "}
                        {format(parseISO(appointment.endTime), "HH:mm", { locale: pt })}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>
                    <h4 className="font-medium">{appointment.title}</h4>
                    {appointment.location && (
                      <p className="text-sm text-gray-400 mt-1">Local: {appointment.location}</p>
                    )}
                    {appointment.description && (
                      <p className="text-sm text-gray-400 mt-1">{appointment.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default PatientCalendar;
