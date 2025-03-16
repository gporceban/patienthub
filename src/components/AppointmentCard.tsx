
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface AppointmentCardProps {
  date: string;
  time: string;
  doctor?: string;
  patient?: string;
  location: string;
  status: 'upcoming' | 'completed' | 'canceled';
  userType: 'paciente' | 'medico';
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  date,
  time,
  doctor,
  patient,
  location,
  status,
  userType
}) => {
  const statusClasses = {
    upcoming: "bg-green-500/20 text-green-500 border-green-500/30",
    completed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    canceled: "bg-red-500/20 text-red-400 border-red-500/30"
  };
  
  const statusText = {
    upcoming: "Agendada",
    completed: "Concluída",
    canceled: "Cancelada"
  };
  
  return (
    <Card className="card-gradient overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} className="text-gold-400" />
              <span className="text-sm text-gray-300">{date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-gold-400" />
              <span className="text-sm text-gray-300">{time}</span>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs ${statusClasses[status]}`}>
            {statusText[status]}
          </div>
        </div>
        
        <div className="mb-4">
          {userType === 'paciente' && doctor && (
            <p className="font-medium text-white mb-1">{doctor}</p>
          )}
          {userType === 'medico' && patient && (
            <p className="font-medium text-white mb-1">{patient}</p>
          )}
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <MapPin size={14} />
            <span>{location}</span>
          </div>
        </div>
        
        {status === 'upcoming' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 border-darkblue-700">
              Remarcar
            </Button>
            <Button variant="outline" size="sm" className="flex-1 border-red-700 text-red-400 hover:text-red-300">
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default AppointmentCard;
