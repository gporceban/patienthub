
import React, { useContext, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useLocation, Navigate } from 'react-router-dom';
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
  const { profile, userType: contextUserType, isLoading } = useContext(AuthContext);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Check if the current route matches the user's type from context
  const currentPath = location.pathname.split('/')[1]; // 'medico' or 'paciente'
  const effectiveUserType = userType || profile?.user_type;
  
  // If user is logged in and trying to access the wrong module (doctor accessing patient or vice versa)
  if (!isLoading && profile && contextUserType) {
    // Check if userType is explicitly provided and doesn't match context
    if (userType && contextUserType !== userType) {
      console.warn(`User type mismatch: context=${contextUserType}, requested=${userType}`);
      // Redirect to correct dashboard based on user type
      const correctPath = contextUserType === 'medico' ? '/medico' : '/paciente';
      return <Navigate to={correctPath} replace />;
    }
    
    // Check if URL path doesn't match the user's type
    if (currentPath !== contextUserType && (currentPath === 'medico' || currentPath === 'paciente')) {
      console.warn(`Path type mismatch: context=${contextUserType}, path=${currentPath}`);
      // Redirect to correct dashboard based on user type
      const correctPath = contextUserType === 'medico' ? '/medico' : '/paciente';
      return <Navigate to={correctPath} replace />;
    }
  }
  
  const showSidebar = effectiveUserType && location.pathname !== '/';
  
  return (
    <div className="min-h-screen">
      <Header userType={effectiveUserType} userName={userName || profile?.full_name} />
      
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
              userType={effectiveUserType} 
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
