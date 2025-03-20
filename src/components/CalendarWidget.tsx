
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getCalComBookings } from '@/services/calComV2Service';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  attendees?: { name: string; email: string }[];
  location?: string;
}

interface CalendarWidgetProps {
  userId: string;
  onSelectEvent?: (event: CalendarEvent) => void;
  limit?: number;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ userId, onSelectEvent, limit = 3 }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEvents = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        const response = await getCalComBookings(userId, 'upcoming');
        
        if (response.success && response.bookings) {
          const calendarEvents = response.bookings.map(booking => ({
            id: booking.id,
            title: booking.title,
            start: booking.startTime,
            end: booking.endTime,
            status: booking.status,
            attendees: booking.attendees,
            location: booking.location
          }));
          
          setEvents(calendarEvents);
        } else {
          throw new Error(response.error || 'Erro ao buscar eventos do calendário');
        }
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

  const handleEventClick = (event: CalendarEvent) => {
    if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  const formatEventTime = (start: string, end: string) => {
    try {
      const startDate = parseISO(start);
      const endDate = parseISO(end);
      return `${format(startDate, "dd 'de' MMMM 'às' HH:mm", { locale: pt })} - ${format(endDate, "HH:mm", { locale: pt })}`;
    } catch (error) {
      console.error("Error parsing event date:", error);
      return "Data inválida";
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

  const limitedEvents = events.slice(0, limit);

  return (
    <Card className="card-gradient p-5 mb-5">
      <div className="flex items-center mb-4">
        <Calendar className="mr-2 h-5 w-5 text-gold-400" />
        <h3 className="text-lg font-semibold">Próximos Eventos</h3>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {Array(limit).fill(0).map((_, index) => (
            <div key={index} className="border-b border-darkblue-700 pb-3 last:border-0">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-5 w-48 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : limitedEvents.length === 0 ? (
        <div className="text-center py-6">
          <Clock className="mx-auto h-10 w-10 text-gray-500 mb-2" />
          <p className="text-gray-400 mb-2">Nenhum evento agendado</p>
          <Button size="sm" variant="outline">
            Agendar Consulta
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {limitedEvents.map((event) => (
            <div 
              key={event.id} 
              className="p-3 rounded-md border border-darkblue-700 hover:bg-darkblue-800 transition-colors cursor-pointer"
              onClick={() => handleEventClick(event)}
            >
              <div className="flex justify-between items-start">
                <h4 className="font-medium">{event.title}</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(event.status)}`}>
                  {event.status}
                </span>
              </div>
              <p className="text-sm text-gold-400 mt-1">
                {formatEventTime(event.start, event.end)}
              </p>
              {event.location && (
                <p className="text-sm text-gray-400 mt-1">
                  Local: {event.location}
                </p>
              )}
            </div>
          ))}
          
          {events.length > limit && (
            <Button variant="ghost" size="sm" className="w-full mt-2 text-gold-400">
              Ver todos os {events.length} eventos
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default CalendarWidget;
