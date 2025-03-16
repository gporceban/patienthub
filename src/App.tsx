
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from './contexts/AuthContext';
import Index from './pages/Index';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorAssessment from './pages/DoctorAssessment';
import DoctorPatients from './pages/DoctorPatients';
import DoctorDocuments from './pages/DoctorDocuments';
import NotFound from './pages/NotFound';
import PatientAssessmentsList from './pages/PatientAssessmentsList';
import PatientAssessment from './pages/PatientAssessment';
import DoctorProfile from './pages/DoctorProfile';
import StarBackground from './components/StarBackground';
import DoctorCreateTestPatient from './pages/DoctorCreateTestPatient';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-darkblue-950 text-gray-100">
          <StarBackground />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/paciente" element={<PatientDashboard />} />
            <Route path="/paciente/avaliacoes" element={<PatientAssessmentsList />} />
            <Route path="/paciente/avaliacoes/:id" element={<PatientAssessment />} />
            <Route path="/medico" element={<DoctorDashboard />} />
            <Route path="/medico/avaliacao" element={<DoctorAssessment />} />
            <Route path="/medico/pacientes" element={<DoctorPatients />} />
            <Route path="/medico/documentos" element={<DoctorDocuments />} />
            <Route path="/medico/perfil" element={<DoctorProfile />} />
            <Route path="/medico/criar-teste" element={<DoctorCreateTestPatient />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
