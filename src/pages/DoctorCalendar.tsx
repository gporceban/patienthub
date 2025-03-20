import React, { useState, useEffect, useContext } from 'react';
import { format, parseISO, startOfDay, endOfDay, addMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { AuthContext } from '@/contexts/AuthContext';
import { Calendar, ClipboardList, Link as LinkIcon, FileText, Plus, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fromPatientAssessments } from '@/types/patientAssessments';
import AssessmentCard from '@/components/AssessmentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import CalendarDatePicker from '@/components/CalendarDatePicker';
import FullCalendarComponent from '@/components/FullCalendarComponent';
import { createCalComManagedUser, getCalComBookings, getCalComAvailableSlots, hasCalComManagedUser } from '@/services/calComV2Service';

const DoctorCalendar = () => {
  const { user, profile } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [selected, setSelected] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(true);
  const [hasCalComUser, setHasCalComUser] = useState(false);
  const [isCreatingCalComUser, setIsCreatingCalComUser] = useState(false);
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
  const [isEventTypeDialogOpen, setIsEventTypeDialogOpen] = useState(false);
  const [isSchedulingDialogOpen, setIsSchedulingDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  
  const [availabilityForm, setAvailabilityForm] = useState({
    days: [] as string[],
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'America/Sao_Paulo'
  });
  
  const [eventTypeForm, setEventTypeForm] = useState({
    title: '',
    slug: '',
    description: '',
    length: 30,
  });
  
  const fetchAppointments = async () => {
    if (!user?.id) return;
    
    setIsLoadingAppointments(true);
    try {
      const response = await getCalComBookings(user.id, 'upcoming');
      
      if (response.success && response.bookings) {
        setAppointments(response.bookings);
        filterAppointmentsByDate(response.bookings, selected);
      } else {
        throw new Error(response.error || 'Erro ao buscar consultas');
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
  
  const filterAppointmentsByDate = (appts: any[], date: Date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const filtered = appts.filter(appointment => {
      const appointmentDate = parseISO(appointment.startTime);
      return appointmentDate >= dayStart && appointmentDate <= dayEnd;
    });
    
    setFilteredAppointments(filtered);
  };
  
  const fetchAvailableSlots = async (eventTypeId: number) => {
    if (!user?.id) return;
    
    try {
      const startDate = new Date();
      const endDate = addMonths(startDate, 2);
      
      const response = await getCalComAvailableSlots(
        user.id,
        eventTypeId,
        startDate.toISOString(),
        endDate.toISOString()
      );
      
      if (response.success && response.slots) {
        setAvailableSlots(response.slots);
      } else {
        throw new Error(response.error || 'Erro ao buscar horários disponíveis');
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar horários",
        description: "Não foi possível carregar os horários disponíveis. Tente novamente mais tarde."
      });
    }
  };
  
  useEffect(() => {
    const checkCalComUser = async () => {
      if (!user?.id) return;
      
      try {
        const hasUser = await hasCalComManagedUser(user.id);
        setHasCalComUser(hasUser);
        
        if (hasUser) {
          fetchAppointments();
        }
      } catch (error) {
        console.error('Error checking Cal.com user:', error);
      }
    };
    
    const fetchAssessments = async () => {
      if (!user) return;
      
      setIsLoadingAssessments(true);
      try {
        const { data, error } = await fromPatientAssessments(supabase)
          .getByDoctorId(user.id);
        
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
          description: "Não foi possível carregar as avaliações. Tente novamente mais tarde."
        });
      } finally {
        setIsLoadingAssessments(false);
      }
    };
    
    checkCalComUser();
    fetchAssessments();
  }, [user, toast]);
  
  useEffect(() => {
    filterAppointmentsByDate(appointments, selected);
  }, [selected, appointments]);
  
  const handleCreateCalComUser = async () => {
    if (!user?.id) return;
    
    setIsCreatingCalComUser(true);
    try {
      const response = await createCalComManagedUser(user.id);
      
      if (response.success) {
        setHasCalComUser(true);
        toast({
          title: "Conta Cal.com criada",
          description: "Sua conta de médico no Cal.com foi criada com sucesso. Agora você pode gerenciar sua agenda.",
        });
        fetchAppointments();
      } else {
        throw new Error(response.error || "Erro ao criar conta Cal.com");
      }
    } catch (error) {
      console.error('Error creating Cal.com user:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar conta Cal.com",
        description: "Não foi possível criar sua conta no Cal.com. Tente novamente mais tarde."
      });
    } finally {
      setIsCreatingCalComUser(false);
    }
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
  
  const handleDayChange = (days: string[]) => {
    setAvailabilityForm(prev => ({
      ...prev,
      days
    }));
  };
  
  const handleCreateAvailability = async () => {
    setIsAvailabilityDialogOpen(false);
    toast({
      title: "Disponibilidade criada",
      description: "Sua disponibilidade foi configurada com sucesso.",
    });
  };
  
  const handleCreateEventType = async () => {
    setIsEventTypeDialogOpen(false);
    toast({
      title: "Tipo de evento criado",
      description: "Seu tipo de evento foi criado com sucesso.",
    });
  };
  
  const handleCalendarEventClick = (info: any) => {
    setSelectedEvent(info.event);
    setIsSchedulingDialogOpen(true);
    
    fetchAvailableSlots(info.event.extendedProps.eventTypeId);
  };
  
  return (
    <Layout userType="medico">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Agenda Médica</h1>
        <p className="text-gray-400">
          Visualize e gerencie suas consultas e avaliações agendadas
        </p>
      </div>
      
      <Tabs defaultValue="calendar" className="w-full">
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
            <Calendar className="h-4 w-4 mr-2" />
            Calendário
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="appointments" className="mt-6">
          <div className="space-y-4">
            {!hasCalComUser && (
              <Card className="card-gradient p-6 text-center">
                <h3 className="text-xl font-medium mb-4">Conecte seu Calendário</h3>
                <p className="text-gray-400 mb-6">
                  Crie sua conta no Cal.com para gerenciar sua agenda médica de forma mais eficiente.
                  Isto permite que pacientes agendem consultas com você online.
                </p>
                <Button 
                  onClick={handleCreateCalComUser} 
                  className="bg-gold-500 hover:bg-gold-600 text-black"
                  disabled={isCreatingCalComUser}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  {isCreatingCalComUser ? 'Criando conta...' : 'Criar Conta de Médico no Cal.com'}
                </Button>
              </Card>
            )}
            
            {hasCalComUser && (
              <div className="flex flex-wrap gap-4 justify-end mb-4">
                <Dialog open={isAvailabilityDialogOpen} onOpenChange={setIsAvailabilityDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gold-500 hover:bg-gold-600 text-black">
                      <Clock className="h-4 w-4 mr-2" />
                      Definir Disponibilidade
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] card-gradient">
                    <DialogHeader>
                      <DialogTitle>Configurar Disponibilidade</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="days">Dias da Semana</Label>
                        <Select
                          onValueChange={(value) => handleDayChange([...availabilityForm.days, value])}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione os dias" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monday">Segunda-feira</SelectItem>
                            <SelectItem value="tuesday">Terça-feira</SelectItem>
                            <SelectItem value="wednesday">Quarta-feira</SelectItem>
                            <SelectItem value="thursday">Quinta-feira</SelectItem>
                            <SelectItem value="friday">Sexta-feira</SelectItem>
                            <SelectItem value="saturday">Sábado</SelectItem>
                            <SelectItem value="sunday">Domingo</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {availabilityForm.days.map((day, index) => (
                            <div key={index} className="bg-darkblue-700 px-2 py-1 rounded-md text-xs flex items-center">
                              {day === 'monday' && 'Segunda-feira'}
                              {day === 'tuesday' && 'Terça-feira'}
                              {day === 'wednesday' && 'Quarta-feira'}
                              {day === 'thursday' && 'Quinta-feira'}
                              {day === 'friday' && 'Sexta-feira'}
                              {day === 'saturday' && 'Sábado'}
                              {day === 'sunday' && 'Domingo'}
                              <button 
                                className="ml-2 text-red-400"
                                onClick={() => setAvailabilityForm(prev => ({
                                  ...prev, 
                                  days: prev.days.filter((_, i) => i !== index)
                                }))}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="startTime">Hora Início</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={availabilityForm.startTime}
                            onChange={(e) => setAvailabilityForm({...availabilityForm, startTime: e.target.value})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="endTime">Hora Fim</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={availabilityForm.endTime}
                            onChange={(e) => setAvailabilityForm({...availabilityForm, endTime: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        className="bg-gold-500 hover:bg-gold-600 text-black" 
                        onClick={handleCreateAvailability}
                        disabled={availabilityForm.days.length === 0}
                      >
                        Salvar Disponibilidade
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isEventTypeDialogOpen} onOpenChange={setIsEventTypeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-darkblue-600 hover:bg-darkblue-500">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Tipo de Evento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] card-gradient">
                    <DialogHeader>
                      <DialogTitle>Criar Tipo de Evento</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                          id="title"
                          value={eventTypeForm.title}
                          onChange={(e) => setEventTypeForm({...eventTypeForm, title: e.target.value})}
                          placeholder="Consulta inicial"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="slug">URL (Slug)</Label>
                        <Input
                          id="slug"
                          value={eventTypeForm.slug}
                          onChange={(e) => setEventTypeForm({...eventTypeForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                          placeholder="consulta-inicial"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                          id="description"
                          value={eventTypeForm.description}
                          onChange={(e) => setEventTypeForm({...eventTypeForm, description: e.target.value})}
                          placeholder="Primeira consulta para avaliação"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="duration">Duração (minutos)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={eventTypeForm.length}
                          onChange={(e) => setEventTypeForm({...eventTypeForm, length: parseInt(e.target.value) || 30})}
                          min={5}
                          max={240}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        className="bg-gold-500 hover:bg-gold-600 text-black" 
                        onClick={handleCreateEventType}
                        disabled={!eventTypeForm.title || !eventTypeForm.slug}
                      >
                        Criar Tipo de Evento
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            
            {hasCalComUser && (
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
                          <p className="text-sm text-gray-400">
                            Paciente: {appointment.attendees?.[0]?.name || 'Não especificado'}
                          </p>
                          {appointment.location && (
                            <p className="text-sm text-gray-400 mt-1">Local: {appointment.location}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
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
            ) : !hasCalComUser ? (
              <div className="mt-8">
                <p className="text-center text-gray-400">
                  Conecte sua conta ao Cal.com para visualizar suas consultas.
                </p>
              </div>
            ) : appointments.length === 0 ? (
              <Card className="card-gradient p-6 text-center">
                <h3 className="text-xl font-medium mb-2">Nenhuma Consulta Agendada</h3>
                <p className="text-gray-400 mb-6">
                  Você ainda não possui consultas agendadas. 
                </p>
                <Button 
                  onClick={() => setIsAvailabilityDialogOpen(true)}
                  className="bg-gold-500 hover:bg-gold-600 text-black"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Disponibilidade
                </Button>
              </Card>
            ) : (
              <>
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
                          <p className="text-sm text-gray-400">
                            Paciente: {appointment.attendees?.[0]?.name || 'Não especificado'}
                          </p>
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
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="assessments" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button asChild className="bg-gold-500 hover:bg-gold-600 text-black">
                <Link to="/medico/avaliacao">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Avaliação
                </Link>
              </Button>
            </div>
            
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
                  userType="medico"
                  status="completed"
                />
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="calendar" className="mt-6">
          {!hasCalComUser ? (
            <Card className="card-gradient p-6 text-center">
              <h3 className="text-xl font-medium mb-4">Conecte seu Calendário</h3>
              <p className="text-gray-400 mb-6">
                Crie sua conta no Cal.com para gerenciar sua agenda médica de forma mais eficiente.
                Isto permite que pacientes agendem consultas com você online.
              </p>
              <Button 
                onClick={handleCreateCalComUser} 
                className="bg-gold-500 hover:bg-gold-600 text-black"
                disabled={isCreatingCalComUser}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {isCreatingCalComUser ? 'Criando conta...' : 'Criar Conta de Médico no Cal.com'}
              </Button>
            </Card>
          ) : (
            <div className="mb-6">
              <FullCalendarComponent 
                onEventClick={handleCalendarEventClick}
              />
              
              <Dialog open={isSchedulingDialogOpen} onOpenChange={setIsSchedulingDialogOpen}>
                <DialogContent className="sm:max-w-[525px] card-gradient">
                  <DialogHeader>
                    <DialogTitle>{selectedEvent?.title || 'Detalhes da Consulta'}</DialogTitle>
                  </DialogHeader>
                  {selectedEvent && (
                    <div className="py-4">
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-gray-300">Paciente</p>
                          <p>{selectedEvent.extendedProps?.attendees?.[0]?.name || 'Não especificado'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-300">Data e Hora</p>
                          <p className="text-gold-500">
                            {formatAppointmentDate(selectedEvent.start.toISOString())}
                          </p>
                        </div>
                        {selectedEvent.extendedProps?.location && (
                          <div>
                            <p className="font-medium text-gray-300">Local</p>
                            <p>{selectedEvent.extendedProps.location}</p>
                          </div>
                        )}
                        {selectedEvent.extendedProps?.description && (
                          <div>
                            <p className="font-medium text-gray-300">Descrição</p>
                            <p>{selectedEvent.extendedProps.description}</p>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-300">Status</p>
                          <span className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${getStatusBadgeClass(selectedEvent.extendedProps?.status)}`}>
                            {selectedEvent.extendedProps?.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <DialogFooter className="flex gap-2">
                    <Button variant="outline">
                      Reagendar
                    </Button>
                    <Button 
                      variant="outline"
                      className="text-red-500 hover:text-red-600"
                    >
                      Cancelar Consulta
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default DoctorCalendar;
