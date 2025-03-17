
import React, { useContext, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu } from 'lucide-react';
import { Button } from './ui/button';

interface LayoutProps {
  children: React.ReactNode;
  userType?: 'paciente' | 'medico';
  userName?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  userType,
  userName
}) => {
  const location = useLocation();
  const { profile } = useContext(AuthContext);
  const showSidebar = userType && location.pathname !== '/';
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen">
      <Header userType={userType} userName={userName || profile?.full_name} />
      
      <div className="flex relative">
        {showSidebar && (
          <>
            {isMobile && (
              <Button 
                variant="outline" 
                size="icon"
                className="fixed bottom-4 right-4 z-50 bg-darkblue-800 border-darkblue-700 text-white rounded-full shadow-lg"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            
            <Sidebar 
              userType={userType} 
              className={`${isMobile ? 'fixed z-40 transition-transform duration-300 ease-in-out' : 'relative'} 
                ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
              onClose={() => setSidebarOpen(false)}
            />
          </>
        )}
        
        <main className={`flex-1 ${showSidebar && !isMobile ? 'ml-64' : ''} p-4 md:p-6 w-full overflow-x-hidden`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
