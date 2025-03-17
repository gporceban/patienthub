
import React from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AssessmentCardProps {
  id: string;
  patientName: string;
  prontuarioId: string;
  createdAt: string;
  summary?: string | null;
  userType: 'paciente' | 'medico';
  status?: 'completed' | 'scheduled' | 'canceled';
}

const AssessmentCard: React.FC<AssessmentCardProps> = ({
  id,
  patientName,
  prontuarioId,
  createdAt,
  summary,
  userType,
  status = 'completed'
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: pt });
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "HH:mm", { locale: pt });
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-500';
      case 'completed':
        return 'bg-green-500/20 text-green-500';
      case 'canceled':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Agendada';
      case 'completed':
        return 'Concluída';
      case 'canceled':
        return 'Cancelada';
      default:
        return 'Desconhecido';
    }
  };
  
  const detailsPath = userType === 'paciente' 
    ? `/paciente/avaliacoes/${id}` 
    : `/medico/pacientes/avaliacao/${id}`;
  
  return (
    <Card className="card-gradient p-4 hover:bg-darkblue-800/60 transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(status)}`}>
              {getStatusText(status)}
            </span>
            <div className="flex items-center text-gold-500">
              <Calendar size={14} className="mr-1" />
              <span className="text-sm font-medium mr-2">{formatDate(createdAt)}</span>
              <Clock size={14} className="mr-1" />
              <span className="text-sm font-medium">{formatTime(createdAt)}</span>
            </div>
          </div>
          
          <h3 className="font-semibold">{userType === 'medico' ? patientName : 'Sua avaliação'}</h3>
          <p className="text-sm text-gray-400">Prontuário: {prontuarioId}</p>
          
          {summary ? (
            <p className="text-gray-300 text-sm line-clamp-2 mt-2">
              {summary}
            </p>
          ) : (
            <p className="text-gray-400 text-sm italic mt-2">
              Sem resumo disponível.
            </p>
          )}
        </div>
        
        <div className="self-end md:self-center">
          <Button asChild size="sm" variant="outline">
            <Link to={detailsPath}>
              <FileText className="h-4 w-4 mr-2" />
              Ver detalhes
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AssessmentCard;
