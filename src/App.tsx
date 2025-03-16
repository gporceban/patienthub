
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, createContext } from "react";
import { supabase } from "./integrations/supabase/client";
import Index from "./pages/Index";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorAssessment from "./pages/DoctorAssessment";
import PatientAssessment from "./pages/PatientAssessment";
import PatientAssessmentsList from "./pages/PatientAssessmentsList";
import DoctorProfile from "./pages/DoctorProfile";
import DoctorPatients from "./pages/DoctorPatients";
import NotFound from "./pages/NotFound";
import StarBackground from "./components/StarBackground";

const queryClient = new QueryClient();

// Create auth context
export const AuthContext = createContext<{
  user: any;
  profile: any;
  loading: boolean;
}>({
  user: null,
  profile: null,
  loading: true,
});

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial auth state
    const getInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (data.session?.user) {
          setUser(data.session.user);
          
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();
          
          if (!profileError && profileData) {
            setProfile(profileData);
            console.log("Profile loaded:", profileData);
          } else {
            console.error("Error fetching profile:", profileError);
          }
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        setUser(session?.user || null);
        
        if (session?.user) {
          // Fetch user profile when auth state changes
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (!profileError && profileData) {
              setProfile(profileData);
              console.log("Profile updated:", profileData);
            } else {
              console.error("Error fetching updated profile:", profileError);
            }
          } catch (error) {
            console.error("Error in auth state change handler:", error);
          }
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, profile, loading }}>
        <TooltipProvider>
          <StarBackground />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route 
                path="/paciente" 
                element={
                  !loading && user ? (
                    profile?.user_type === 'paciente' ? (
                      <PatientDashboard />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    loading ? <div>Carregando...</div> : <Navigate to="/" replace />
                  )
                } 
              />
              <Route 
                path="/paciente/avaliacoes" 
                element={
                  !loading && user ? (
                    profile?.user_type === 'paciente' ? (
                      <PatientAssessmentsList />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    loading ? <div>Carregando...</div> : <Navigate to="/" replace />
                  )
                } 
              />
              <Route 
                path="/paciente/avaliacoes/:id" 
                element={
                  !loading && user ? (
                    profile?.user_type === 'paciente' ? (
                      <PatientAssessment />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    loading ? <div>Carregando...</div> : <Navigate to="/" replace />
                  )
                } 
              />
              <Route 
                path="/medico" 
                element={
                  !loading && user ? (
                    profile?.user_type === 'medico' ? (
                      <DoctorDashboard />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    loading ? <div>Carregando...</div> : <Navigate to="/" replace />
                  )
                } 
              />
              <Route 
                path="/medico/perfil" 
                element={
                  !loading && user ? (
                    profile?.user_type === 'medico' ? (
                      <DoctorProfile />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    loading ? <div>Carregando...</div> : <Navigate to="/" replace />
                  )
                } 
              />
              <Route 
                path="/medico/pacientes" 
                element={
                  !loading && user ? (
                    profile?.user_type === 'medico' ? (
                      <DoctorPatients />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    loading ? <div>Carregando...</div> : <Navigate to="/" replace />
                  )
                } 
              />
              <Route 
                path="/medico/avaliacao" 
                element={
                  !loading && user ? (
                    profile?.user_type === 'medico' ? (
                      <DoctorAssessment />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    loading ? <div>Carregando...</div> : <Navigate to="/" replace />
                  )
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

export default App;
