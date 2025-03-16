
import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  userType?: 'paciente' | 'medico';
  userName?: string;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  userType,
  userName = userType === 'paciente' ? 'Maria Silva' : 'Dr. Paulo Oliveira'
}) => {
  const location = useLocation();
  const showSidebar = userType && location.pathname !== '/';
  
  return (
    <div className="min-h-screen">
      <Header userType={userType} userName={userName} />
      
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
