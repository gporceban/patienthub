
import React, { useContext } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '@/App';

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
  
  return (
    <div className="min-h-screen">
      <Header userType={userType} userName={userName || profile?.full_name} />
      
      <div className="flex">
        {showSidebar && <Sidebar userType={userType} />}
        
        <main className={`flex-1 ${showSidebar ? 'ml-64' : ''} p-6`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
