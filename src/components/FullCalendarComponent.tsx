
import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getCalComBookings } from '@/services/calComV2Service';
import { useToast } from '@/components/ui/use-toast';

interface FullCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    status: string;
    attendees?: { name: string; email: string }[];
    location?: string;
  };
}

interface FullCalendarComponentProps {
  userId: string;
  onEventClick?: (info: any) => void;
}

const FullCalendarComponent: React.FC<FullCalendarComponentProps> = ({ userId, onEventClick }) => {
  const [events, setEvents] = useState<FullCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEvents = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        const upcomingResponse = await getCalComBookings(userId, 'upcoming');
        const pastResponse = await getCalComBookings(userId, 'past');
        
        let allEvents: FullCalendarEvent[] = [];
        
        if (upcomingResponse.success && upcomingResponse.bookings) {
          const upcomingEvents = upcomingResponse.bookings.map(booking => ({
            id: booking.id,
            title: booking.title,
            start: booking.startTime,
            end: booking.endTime,
            backgroundColor: getStatusColor(booking.status).bg,
            borderColor: getStatusColor(booking.status).border,
            textColor: getStatusColor(booking.status).text,
            extendedProps: {
              status: booking.status,
              attendees: booking.attendees,
              location: booking.location
            }
          }));
          
          allEvents = [...allEvents, ...upcomingEvents];
        }
        
        if (pastResponse.success && pastResponse.bookings) {
          const pastEvents = pastResponse.bookings.map(booking => ({
            id: booking.id,
            title: booking.title,
            start: booking.startTime,
            end: booking.endTime,
            backgroundColor: getStatusColor(booking.status, true).bg,
            borderColor: getStatusColor(booking.status, true).border,
            textColor: getStatusColor(booking.status, true).text,
            extendedProps: {
              status: booking.status,
              attendees: booking.attendees,
              location: booking.location
            }
          }));
          
          allEvents = [...allEvents, ...pastEvents];
        }
        
        setEvents(allEvents);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar eventos",
          description: "Não foi possível carregar seus eventos agendados. Tente novamente mais tarde."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [userId, toast]);

  const getStatusColor = (status: string, isPast = false) => {
    // For past events, make colors more muted
    const opacity = isPast ? '80' : 'cc';
    
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'confirmado':
        return {
          bg: `#22c55e${opacity}`,
          border: '#16a34a',
          text: '#ffffff'
        };
      case 'pending':
      case 'pendente':
        return {
          bg: `#eab308${opacity}`,
          border: '#ca8a04',
          text: '#ffffff'
        };
      case 'cancelled':
      case 'cancelado':
        return {
          bg: `#ef4444${opacity}`,
          border: '#dc2626',
          text: '#ffffff'
        };
      default:
        return {
          bg: `#6b7280${opacity}`,
          border: '#4b5563',
          text: '#ffffff'
        };
    }
  };

  const handleEventClick = (info: any) => {
    if (onEventClick) {
      onEventClick(info);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-[500px] w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-4 card-gradient">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        locale={ptBrLocale}
        events={events}
        eventClick={handleEventClick}
        height="auto"
        aspectRatio={1.35}
        buttonText={{
          today: 'Hoje',
          month: 'Mês',
          week: 'Semana',
          day: 'Dia'
        }}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false,
          hour12: false
        }}
        allDayText="Dia todo"
        noEventsText="Nenhum evento para exibir"
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          omitZeroMinute: false,
          hour12: false
        }}
        dayMaxEvents={3}
        moreLinkText={count => `+${count} mais`}
        firstDay={0}
      />
    </Card>
  );
};

export default FullCalendarComponent;
