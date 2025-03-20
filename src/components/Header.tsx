import React, { useContext } from 'react';
import Logo from './Logo';
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, BellIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { AuthContext } from '@/contexts/AuthContext';
interface HeaderProps {
  userType?: 'paciente' | 'medico';
  userName?: string;
}
const Header: React.FC<HeaderProps> = ({
  userType,
  userName
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profile
  } = useContext(AuthContext);

  // Use profile name if available, otherwise use provided userName or default
  const displayName = profile?.full_name || userName || 'Usuário';
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Sessão encerrada",
        description: "Você saiu da sua conta com sucesso."
      });
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: "Ocorreu um erro ao tentar sair da sua conta."
      });
    }
  };

  // Only show header on authenticated routes
  if (location.pathname === '/') {
    return null;
  }
  return <header className="w-full py-4 backdrop-blur-md border-b border-darkblue-700/50 sticky top-0 z-10 bg-slate-900 bg-opacity-95 px-4 md:px-6 bg-[2F4159]">
      <div className="container mx-auto flex justify-between items-center">
        <Logo size="small" />
        
        <div className="flex items-center gap-4">
          <div className="text-right mr-2">
            <p className="text-sm text-muted-foreground">Olá,</p>
            <p className="font-medium text-gold-500">{displayName}</p>
          </div>
          
          <Button variant="outline" size="sm" onClick={handleLogout} className="border-darkblue-700 hover:bg-darkblue-800">
            <LogOut size={16} className="mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </header>;
};
export default Header;