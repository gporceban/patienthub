
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  FileText,
  Home,
  User,
  FileEdit,
  FilePlus2,
  Users,
  Award,
  Folder,
  Activity
} from "lucide-react";

interface SidebarProps {
  userType: 'paciente' | 'medico';
}

const Sidebar: React.FC<SidebarProps> = ({ userType }) => {
  const location = useLocation();
  
  // Define sidebar items based on user type
  const sidebarItems = userType === 'paciente' 
    ? [
        { href: '/paciente', icon: <Home size={20} />, label: 'Início' },
        { href: '/paciente/agenda', icon: <CalendarClock size={20} />, label: 'Agenda' },
        { href: '/paciente/avaliacoes', icon: <FileText size={20} />, label: 'Avaliações' },
        { href: '/paciente/records', icon: <Folder size={20} />, label: 'Prontuário' },
        { href: '/paciente/progress', icon: <Activity size={20} />, label: 'Progresso' },
        { href: '/paciente/achievements', icon: <Award size={20} />, label: 'Conquistas' },
        { href: '/paciente/perfil', icon: <User size={20} />, label: 'Perfil' },
      ]
    : [
        { href: '/medico', icon: <Home size={20} />, label: 'Início' },
        { href: '/medico/pacientes', icon: <Users size={20} />, label: 'Pacientes' },
        { href: '/medico/agenda', icon: <CalendarClock size={20} />, label: 'Agenda' },
        { href: '/medico/avaliacao', icon: <FileEdit size={20} />, label: 'Nova Avaliação' },
        { href: '/medico/documentos', icon: <FilePlus2 size={20} />, label: 'Documentos' },
        { href: '/medico/perfil', icon: <User size={20} />, label: 'Perfil' },
      ];
  
  return (
    <div className="hidden md:flex flex-col w-64 min-h-screen p-4 bg-darkblue-900 border-r border-darkblue-800">
      <div className="flex-1 space-y-1 mt-8">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
              location.pathname === item.href
                ? "bg-darkblue-800 text-gold-400"
                : "text-gray-300 hover:bg-darkblue-800 hover:text-gold-300"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
