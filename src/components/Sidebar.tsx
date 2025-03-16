
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, Home, MessageSquare, BookOpen, Users, Activity, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  userType: 'paciente' | 'medico';
}

const Sidebar: React.FC<SidebarProps> = ({ userType }) => {
  const location = useLocation();
  const basePath = `/${userType}`;
  
  const patientLinks = [
    { 
      icon: <Home size={20} />, 
      label: 'Dashboard', 
      path: `${basePath}` 
    },
    { 
      icon: <Calendar size={20} />, 
      label: 'Consultas', 
      path: `${basePath}/consultas` 
    },
    { 
      icon: <FileText size={20} />, 
      label: 'Prontuário', 
      path: `${basePath}/prontuario` 
    },
    { 
      icon: <MessageSquare size={20} />, 
      label: 'Mensagens', 
      path: `${basePath}/mensagens` 
    },
    { 
      icon: <BookOpen size={20} />, 
      label: 'Materiais Educativos', 
      path: `${basePath}/materiais` 
    },
  ];
  
  const doctorLinks = [
    { 
      icon: <Home size={20} />, 
      label: 'Dashboard', 
      path: `${basePath}` 
    },
    { 
      icon: <Stethoscope size={20} />, 
      label: 'Avaliação', 
      path: `${basePath}/avaliacao` 
    },
    { 
      icon: <Calendar size={20} />, 
      label: 'Agenda', 
      path: `${basePath}/agenda` 
    },
    { 
      icon: <Users size={20} />, 
      label: 'Pacientes', 
      path: `${basePath}/pacientes` 
    },
    { 
      icon: <Activity size={20} />, 
      label: 'Tratamentos', 
      path: `${basePath}/tratamentos` 
    },
    { 
      icon: <MessageSquare size={20} />, 
      label: 'Mensagens', 
      path: `${basePath}/mensagens` 
    },
  ];
  
  const links = userType === 'paciente' ? patientLinks : doctorLinks;

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 pt-20 bg-darkblue-900/80 backdrop-blur-md border-r border-darkblue-700/50 z-0">
      <div className="flex flex-col h-full">
        <div className="px-4 py-2">
          <h2 className="text-lg font-semibold mb-4 gold-text">
            {userType === 'paciente' ? 'Menu do Paciente' : 'Menu do Médico'}
          </h2>
          <nav className="space-y-1">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  location.pathname === link.path
                    ? "bg-darkblue-800 text-gold-400"
                    : "text-gray-300 hover:bg-darkblue-800/50 hover:text-white"
                )}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
