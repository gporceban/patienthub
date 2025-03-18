
import React, { useContext, useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';

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
  const navigate = useNavigate();
  const { 
    profile, 
    userType: contextUserType, 
    isLoading, 
    hasValidSession, 
    isInitialized 
  } = useContext(AuthContext);
  
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  
  // Get the current base path (medico or paciente)
  const currentPathBase = location.pathname.split('/')[1]; 
  
  // Determine if this is a protected route
  const isProtectedRoute = currentPathBase === 'medico' || currentPathBase === 'paciente';
  const isSpecialRoute = currentPathBase === 'calcom';
  
  // Skip auth check for special routes like calcom callback
  const shouldCheckAuth = isProtectedRoute && !isSpecialRoute;
  
  // Check for user type mismatch (user tries to access the wrong module)
  useEffect(() => {
    if (isInitialized && !isLoading && hasValidSession && profile && contextUserType && shouldCheckAuth) {
      // Explicitly provided userType takes precedence
      const effectiveUserType = userType || contextUserType;
      
      // Only execute this if we're on a protected route
      if (isProtectedRoute) {
        // Check for a mismatch between URL path and user type
        if (currentPathBase !== contextUserType) {
          console.warn(
            `User type mismatch: context=${contextUserType}, path=${currentPathBase}`,
            "Redirecting to correct dashboard"
          );
          
          // Prevent multiple redirects
          if (!redirecting) {
            setRedirecting(true);
            
            // Redirect to correct dashboard based on user type
            const correctPath = contextUserType === 'medico' ? '/medico' : '/paciente';
            
            toast({
              title: "Acesso não permitido",
              description: `Redirecionando para sua área ${contextUserType === 'medico' ? 'do médico' : 'do paciente'}.`,
              variant: "destructive"
            });
            
            // Use setTimeout to allow the toast to be shown
            setTimeout(() => {
              navigate(correctPath, { replace: true });
              setRedirecting(false);
            }, 1000);
          }
          
          // Return early to prevent rendering the wrong content
          return;
        }
      }
    }
  }, [
    profile, 
    contextUserType, 
    currentPathBase, 
    navigate, 
    isLoading, 
    userType, 
    isProtectedRoute, 
    hasValidSession,
    isInitialized,
    redirecting,
    shouldCheckAuth
  ]);
  
  // If user is not authenticated and tries to access a protected route
  // Skip this check for special routes like calcom callback
  if (isInitialized && !isLoading && !hasValidSession && isProtectedRoute && !isSpecialRoute) {
    console.log("User not authenticated, redirecting to login page");
    return <Navigate to="/" replace />;
  }
  
  // Determine if we should show the sidebar
  const effectiveUserType = userType || profile?.user_type;
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
