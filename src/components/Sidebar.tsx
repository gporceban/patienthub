import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Users, Calendar, FileText, 
  ClipboardCheck, User, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarProps {
  userType?: 'paciente' | 'medico';
  className?: string;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  userType = 'paciente',
  className = '',
  onClose
}) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const doctorLinks = [
    { name: 'Dashboard', path: '/medico', icon: Home },
    { name: 'Pacientes', path: '/medico/pacientes', icon: Users },
    { name: 'Agenda', path: '/medico/agenda', icon: Calendar },
    { name: 'Documentos', path: '/medico/documentos', icon: FileText },
    { name: 'Meu Perfil', path: '/medico/perfil', icon: User }
  ];
  
  const patientLinks = [
    { name: 'Dashboard', path: '/paciente', icon: Home },
    { name: 'Agenda', path: '/paciente/agenda', icon: Calendar },
    { name: 'Avaliações', path: '/paciente/avaliacoes', icon: ClipboardCheck },
  ];
  
  const links = userType === 'medico' ? doctorLinks : patientLinks;
  
  return (
    <div 
      className={cn(
        "w-64 h-screen bg-darkblue-900/95 border-r border-darkblue-800 overflow-y-auto",
        className
      )}
    >
      {isMobile && (
        <div className="flex justify-end p-2">
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>
      )}
      
      <div className="p-6">
        <h2 className="text-xl font-bold mb-6 gold-text">
          {userType === 'medico' ? 'Área do Médico' : 'Área do Paciente'}
        </h2>
        
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors ${
                  isActive
                    ? 'bg-darkblue-800 text-gold-500'
                    : 'text-gray-300 hover:bg-darkblue-800/60 hover:text-white'
                }`}
                onClick={isMobile ? onClose : undefined}
              >
                <Icon size={18} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
