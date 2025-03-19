
import React, { useState, useEffect, useContext } from 'react';
import { DayPicker } from 'react-day-picker';
import { pt } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';
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
import { calComWrapper, CalComBooking } from '@/services/calComWrapper';
import { supabase } from '@/integrations/supabase/client';
import { fromPatientAssessments } from '@/types/patientAssessments';
import AssessmentCard from '@/components/AssessmentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

const DoctorCalendar = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<CalComBooking[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalComConnected, setIsCalComConnected] = useState(false);
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
  
  // State for the availability form
  const [availabilityForm, setAvailabilityForm] = useState({
    days: [] as string[],
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'America/Sao_Paulo'
  });
  
  useEffect(() => {
    const checkCalComConnection = async () => {
      if (!user) return;
      
      try {
        const connected = await calComWrapper.isConnected(user.id);
        setIsCalComConnected(connected);
      } catch (error) {
        console.error('Error checking Cal.com connection:', error);
      }
    };
    
    const fetchBookings = async () => {
      if (!user) return;
      
      try {
        const bookings = await calComWrapper.getBookings();
        
        if (bookings) {
          setAppointments(bookings);
        }
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar consultas",
          description: "Não foi possível carregar suas consultas agendadas. Tente novamente mais tarde."
        });
      }
    };
    
    const fetchAssessments = async () => {
      if (!user) return;
      
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
        setIsLoading(false);
      }
    };
    
    checkCalComConnection();
    fetchBookings();
    fetchAssessments();
  }, [user, toast]);
  
  const handleConnectCalCom = () => {
    // Use the current window origin for the redirect
    const redirectUri = `${window.location.origin}/calcom/callback`;
    console.log("Using redirect URI:", redirectUri);
    
    // Get OAuth URL and redirect
    const authUrl = calComWrapper.getOAuthUrl(redirectUri);
    console.log("Redirecting to Cal.com auth URL:", authUrl);
    window.location.href = authUrl;
  };
  
  const handleCreateAvailability = async () => {
    if (!user) return;
    
    try {
      // Convert the array of day strings to numbers
      const dayNumbers = availabilityForm.days.map(day => {
        switch (day) {
          case 'monday': return 1;
          case 'tuesday': return 2;
          case 'wednesday': return 3;
          case 'thursday': return 4;
          case 'friday': return 5;
          case 'saturday': return 6;
          case 'sunday': return 0;
          default: return 1;
        }
      });
      
      const success = await calComWrapper.createAvailability(user.id, {
        days: dayNumbers,
        startTime: availabilityForm.startTime,
        endTime: availabilityForm.endTime,
        timezone: availabilityForm.timezone
      });
      
      if (success) {
        toast({
          title: "Disponibilidade criada",
          description: "Sua disponibilidade foi configurada com sucesso.",
        });
        setIsAvailabilityDialogOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível configurar sua disponibilidade. Tente novamente."
        });
      }
    } catch (error) {
      console.error('Error creating availability:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao configurar sua disponibilidade."
      });
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
  
  return (
    <Layout userType="medico">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Agenda Médica</h1>
        <p className="text-gray-400">
          Visualize e gerencie suas consultas e avaliações agendadas
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
                  Conecte sua conta ao Cal.com para gerenciar sua agenda de forma mais eficiente.
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
              </div>
            )}
            
            {appointments.length === 0 ? (
              <Card className="card-gradient p-6 text-center">
                <h3 className="text-xl font-medium mb-2">Nenhuma Consulta Agendada</h3>
                <p className="text-gray-400 mb-6">
                  Você ainda não possui consultas agendadas. 
                </p>
                {isCalComConnected && (
                  <Button 
                    onClick={() => setIsAvailabilityDialogOpen(true)}
                    className="bg-gold-500 hover:bg-gold-600 text-black"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Disponibilidade
                  </Button>
                )}
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
              ))
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
            
            {isLoading ? (
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

export default DoctorCalendar;
