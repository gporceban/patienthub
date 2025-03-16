
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CalendarClock, ChevronDown, Clock, MapPin, Plus, User 
} from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

const PatientCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // Mock appointments data
  const appointments = [
    { 
      id: 1, 
      date: new Date(2023, 10, 28, 14, 30), 
      doctor: "Dr. Paulo Oliveira",
      location: "Clínica Ortopédica Central - Sala 302",
      type: "Consulta de Rotina"
    },
    { 
      id: 2, 
      date: new Date(2023, 11, 15, 10, 0), 
      doctor: "Dra. Ana Medeiros",
      location: "Hospital São Lucas - Ala B",
      type: "Avaliação"
    }
  ];
  
  // Filter appointments for the selected date
  const filteredAppointments = date 
    ? appointments.filter(appointment => 
        appointment.date.getDate() === date.getDate() && 
        appointment.date.getMonth() === date.getMonth() && 
        appointment.date.getFullYear() === date.getFullYear()
      )
    : [];
  
  // Generate appointment times for new booking
  const appointmentTimes = [];
  for (let i = 8; i <= 17; i++) {
    appointmentTimes.push(`${i}:00`);
    if (i < 17) appointmentTimes.push(`${i}:30`);
  }
  
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-gradient p-6 lg:col-span-1">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Calendário</h2>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-darkblue-700 hover:bg-darkblue-800"
            >
              <Plus size={16} className="mr-2" />
              Nova
            </Button>
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
            {appointments.map(appointment => (
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
                      {format(appointment.date, "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                      <Clock size={14} />
                      {format(appointment.date, "HH:mm")}
                    </div>
                    <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                      <User size={14} />
                      {appointment.doctor}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                      <h3 className="font-medium">{appointment.type}</h3>
                      <p className="text-sm text-gold-400">
                        {format(appointment.date, "HH:mm")}
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
                      <span>{appointment.doctor}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-400">
                      <MapPin size={14} className="text-gray-400 mt-1 flex-shrink-0" />
                      <span>{appointment.location}</span>
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
                Não há consultas agendadas para esta data. Escolha um horário disponível abaixo.
              </p>
              
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
    </Layout>
  );
};

export default PatientCalendar;
