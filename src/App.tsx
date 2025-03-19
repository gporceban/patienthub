
import React, { useContext } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate
} from 'react-router-dom';
import { AuthContext } from './contexts/AuthContext';
import NotFound from './pages/NotFound';
import Index from './pages/Index';
import DoctorCalendar from './pages/DoctorCalendar';
import PatientCalendar from './pages/PatientCalendar';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import DoctorPatients from './pages/DoctorPatients';
import PatientProgress from './pages/PatientProgress';
import DoctorProfile from './pages/DoctorProfile';
import PatientRecords from './pages/PatientRecords';
import PatientAssessment from './pages/PatientAssessment';
import DoctorAssessment from './pages/DoctorAssessment';
import PatientAssessmentDetails from './pages/PatientAssessmentDetails';
import CalComCallback from './pages/CalComCallback';
import DoctorDocuments from './pages/DoctorDocuments';

function App() {
  const { user, userType, isLoading, hasValidSession } = useContext(AuthContext);

  // Private route wrapper component
  const PrivateRoute = ({ children, requiredUserType }: { children: React.ReactNode, requiredUserType?: 'medico' | 'paciente' }) => {
    // Don't render anything while auth is loading
    if (isLoading) return null;
    
    // Redirect to login if not authenticated
    if (!user || !hasValidSession) {
      return <Navigate to="/" replace />;
    }
    
    // If a specific user type is required, check that too
    if (requiredUserType && userType !== requiredUserType) {
      // Redirect to appropriate dashboard based on actual user type
      const redirectPath = userType === 'medico' ? '/medico/dashboard' : '/paciente/dashboard';
      return <Navigate to={redirectPath} replace />;
    }
    
    // User is authenticated and has the right type, render the children
    return <>{children}</>;
  };

  // Public route wrapper component - redirects to dashboard if already logged in
  const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    // Don't render anything while auth is loading
    if (isLoading) return null;
    
    if (user && hasValidSession && userType) {
      const redirectPath = userType === 'medico' ? '/medico/dashboard' : '/paciente/dashboard';
      return <Navigate to={redirectPath} replace />;
    }
    
    return <>{children}</>;
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicRoute><Index /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Index /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Index /></PublicRoute>} />

        {/* Doctor Routes */}
        <Route path="/medico/dashboard" element={<PrivateRoute requiredUserType="medico"><DoctorDashboard /></PrivateRoute>} />
        
        {/* Unify calendar routes - both /calendario and /agenda point to the same component */}
        <Route path="/medico/calendario" element={<PrivateRoute requiredUserType="medico"><DoctorCalendar /></PrivateRoute>} />
        <Route path="/medico/agenda" element={<Navigate to="/medico/calendario" replace />} />
        
        <Route path="/medico/pacientes" element={<PrivateRoute requiredUserType="medico"><DoctorPatients /></PrivateRoute>} />
        <Route path="/medico/perfil" element={<PrivateRoute requiredUserType="medico"><DoctorProfile /></PrivateRoute>} />
        <Route path="/medico/avaliacao" element={<PrivateRoute requiredUserType="medico"><DoctorAssessment /></PrivateRoute>} />
        <Route path="/medico/documentos" element={<PrivateRoute requiredUserType="medico"><DoctorDocuments /></PrivateRoute>} />

        {/* Patient Routes */}
        <Route path="/paciente/dashboard" element={<PrivateRoute requiredUserType="paciente"><PatientDashboard /></PrivateRoute>} />
        
        {/* Unify patient calendar routes */}
        <Route path="/paciente/calendario" element={<PrivateRoute requiredUserType="paciente"><PatientCalendar /></PrivateRoute>} />
        <Route path="/paciente/agenda" element={<Navigate to="/paciente/calendario" replace />} />
        
        <Route path="/paciente/progresso" element={<PrivateRoute requiredUserType="paciente"><PatientProgress /></PrivateRoute>} />
        <Route path="/paciente/prontuario" element={<PrivateRoute requiredUserType="paciente"><PatientRecords /></PrivateRoute>} />
        <Route path="/paciente/avaliacao" element={<PrivateRoute requiredUserType="paciente"><PatientAssessment /></PrivateRoute>} />
        <Route path="/paciente/avaliacoes" element={<Navigate to="/paciente/avaliacao" replace />} />
        <Route path="/paciente/avaliacao/:id" element={<PrivateRoute requiredUserType="paciente"><PatientAssessmentDetails /></PrivateRoute>} />
        
        {/* Redirect root doctor/patient paths to their dashboards */}
        <Route path="/medico" element={<Navigate to="/medico/dashboard" replace />} />
        <Route path="/paciente" element={<Navigate to="/paciente/dashboard" replace />} />
        
        {/* Special Routes */}
        <Route path="/calcom/callback" element={<CalComCallback />} />
        
        {/* Catch-all route for 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
