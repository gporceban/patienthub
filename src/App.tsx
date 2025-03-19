
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

function App() {
  const { user } = useContext(AuthContext);

  const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    return user ? <>{children}</> : <Navigate to="/" />;
  };

  const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    return !user ? <>{children}</> : <Navigate to={user.user_metadata?.user_type === 'medico' ? '/medico/calendario' : '/paciente/calendario'} />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />

        {/* Public Routes */}
        <Route path="/login" element={<PublicRoute><Index /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Index /></PublicRoute>} />
        <Route path="/register/doctor" element={<PublicRoute><Index /></PublicRoute>} />
        <Route path="/register/patient" element={<PublicRoute><Index /></PublicRoute>} />

        {/* Private Routes */}
        <Route path="/medico/calendario" element={<PrivateRoute><DoctorCalendar /></PrivateRoute>} />
        <Route path="/paciente/calendario" element={<PrivateRoute><PatientCalendar /></PrivateRoute>} />
        <Route path="/medico/dashboard" element={<PrivateRoute><DoctorDashboard /></PrivateRoute>} />
        <Route path="/paciente/dashboard" element={<PrivateRoute><PatientDashboard /></PrivateRoute>} />
        <Route path="/medico/pacientes" element={<PrivateRoute><DoctorPatients /></PrivateRoute>} />
        <Route path="/paciente/progresso" element={<PrivateRoute><PatientProgress /></PrivateRoute>} />
        <Route path="/medico/perfil" element={<PrivateRoute><DoctorProfile /></PrivateRoute>} />
        <Route path="/paciente/prontuario" element={<PrivateRoute><PatientRecords /></PrivateRoute>} />
        <Route path="/paciente/avaliacao" element={<PrivateRoute><PatientAssessment /></PrivateRoute>} />
        <Route path="/medico/avaliacao" element={<PrivateRoute><DoctorAssessment /></PrivateRoute>} />
        <Route path="/paciente/avaliacao/:id" element={<PrivateRoute><PatientAssessmentDetails /></PrivateRoute>} />
        <Route path="/calcom/callback" element={<CalComCallback />} />
        
        {/* Catch-all route for 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
