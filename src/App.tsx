import React, { useContext } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate
} from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DoctorCalendar from './pages/DoctorCalendar';
import PatientCalendar from './pages/PatientCalendar';
import { AuthContext } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import DoctorRegisterPage from './pages/DoctorRegisterPage';
import PatientRegisterPage from './pages/PatientRegisterPage';
import ProfilePage from './pages/ProfilePage';
import PatientAssessments from './pages/PatientAssessments';
import DoctorAssessments from './pages/DoctorAssessments';
import AssessmentForm from './pages/AssessmentForm';
import CalComCallback from './pages/CalComCallback';

function App() {
  const { user } = useContext(AuthContext);

  const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    return user ? <>{children}</> : <Navigate to="/login" />;
  };

  const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    return !user ? <>{children}</> : <Navigate to={user.user_metadata?.user_type === 'medico' ? '/medico/calendario' : '/paciente/calendario'} />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Public Routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/register/doctor" element={<PublicRoute><DoctorRegisterPage /></PublicRoute>} />
        <Route path="/register/patient" element={<PublicRoute><PatientRegisterPage /></PublicRoute>} />

        {/* Private Routes */}
        <Route path="/medico/calendario" element={<PrivateRoute><DoctorCalendar /></PrivateRoute>} />
        <Route path="/paciente/calendario" element={<PrivateRoute><PatientCalendar /></PrivateRoute>} />
        <Route path="/perfil" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/paciente/avaliacao" element={<PrivateRoute><PatientAssessments /></PrivateRoute>} />
        <Route path="/medico/avaliacao" element={<PrivateRoute><DoctorAssessments /></PrivateRoute>} />
        <Route path="/medico/avaliacao/:prontuarioId" element={<PrivateRoute><AssessmentForm /></PrivateRoute>} />
        <Route path="/calcom/callback" element={<CalComCallback />} />

      </Routes>
    </Router>
  );
}

export default App;
