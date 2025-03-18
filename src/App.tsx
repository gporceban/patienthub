
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Index from './pages/Index';
import PatientDashboard from './pages/PatientDashboard';
import PatientCalendar from './pages/PatientCalendar';
import PatientAssessmentsList from './pages/PatientAssessmentsList';
import PatientAssessmentDetails from './pages/PatientAssessmentDetails';
import PatientRecords from './pages/PatientRecords';
import PatientProgress from './pages/PatientProgress';
import PatientAchievements from './pages/PatientAchievements';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorPatients from './pages/DoctorPatients';
import DoctorAssessment from './pages/DoctorAssessment';
import DoctorDocuments from './pages/DoctorDocuments';
import DoctorCreateTestPatient from './pages/DoctorCreateTestPatient';
import DoctorProfile from './pages/DoctorProfile';
import CalComCallback from './pages/CalComCallback';
import NotFound from './pages/NotFound';
import { Toaster } from "@/components/ui/toaster"
import DoctorCalendar from './pages/DoctorCalendar';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster />
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Patient routes */}
          <Route path="/paciente" element={<PatientDashboard />} />
          <Route path="/paciente/agenda" element={<PatientCalendar />} />
          <Route path="/paciente/avaliacoes" element={<PatientAssessmentsList />} />
          <Route path="/paciente/avaliacoes/:id" element={<PatientAssessmentDetails />} />
          <Route path="/paciente/records" element={<PatientRecords />} />
          <Route path="/paciente/progress" element={<PatientProgress />} />
          <Route path="/paciente/achievements" element={<PatientAchievements />} />
          
          {/* Doctor routes */}
          <Route path="/medico" element={<DoctorDashboard />} />
          <Route path="/medico/pacientes" element={<DoctorPatients />} />
          <Route path="/medico/agenda" element={<DoctorCalendar />} />
          <Route path="/medico/avaliacao" element={<DoctorAssessment />} />
          <Route path="/medico/avaliacoes/:id" element={<PatientAssessmentDetails />} />
          <Route path="/medico/documentos" element={<DoctorDocuments />} />
          <Route path="/medico/criar-teste" element={<DoctorCreateTestPatient />} />
          <Route path="/medico/perfil" element={<DoctorProfile />} />
          
          {/* Cal.com callback */}
          <Route path="/calcom/callback" element={<CalComCallback />} />
          
          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
