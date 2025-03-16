import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster"
import { supabase } from './integrations/supabase/client';
import { AuthContext } from './contexts/AuthContext';
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
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (err: any) {
        setError(err);
        console.error("Session Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchProfile = async (userId: string) => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) {
          throw profileError;
        }

        setProfile(profileData);
      } catch (err: any) {
        setError(err);
        console.error("Profile Error:", err);
      }
    };

    // Initial fetch
    fetchSession();

    // Set up listener for authentication changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      if (event === 'INITIAL_SESSION') {
        await fetchSession();
      } else if (event === 'SIGNED_IN') {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
      setProfile(null);
    } catch (err: any) {
      setError(err);
      console.error("Sign Out Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, error, signOut }}>
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
    </AuthContext.Provider>
  );
}

export default App;
