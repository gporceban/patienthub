import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, createContext } from "react";
import { supabase } from "./integrations/supabase/client";
import Index from "./pages/Index";
import PatientDashboard from "./pages/PatientDashboard";
import PatientCalendar from "./pages/PatientCalendar";
import PatientRecords from "./pages/PatientRecords";
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorAssessment from "./pages/DoctorAssessment";
import PatientAssessment from "./pages/PatientAssessment";
import PatientAssessmentsList from "./pages/PatientAssessmentsList";
import DoctorProfile from "./pages/DoctorProfile";
import DoctorPatients from "./pages/DoctorPatients";
import DoctorDocuments from "./pages/DoctorDocuments";
import NotFound from "./pages/NotFound";
import StarBackground from "./components/StarBackground";
import { toast } from "./components/ui/use-toast";

const queryClient = new QueryClient();

export const AuthContext = createContext<{
  user: any;
  profile: any;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  refreshProfile: async () => {},
});

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Profile fetch timeout")), 10000);
      });
      
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      const { data: profileData, error: profileError } = await Promise.race([
        fetchPromise,
        timeoutPromise.then(() => {
          throw new Error("Profile fetch timeout");
        })
      ]) as any;
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setError(`Error fetching profile: ${profileError.message}`);
        return null;
      }
      
      if (profileData) {
        console.log("Profile loaded successfully:", profileData);
        setError(null);
        return profileData;
      } else {
        console.warn("No profile found for user:", userId);
        setError("No profile found for your user ID. Please contact support.");
        return null;
      }
    } catch (error: any) {
      console.error("Exception in fetchUserProfile:", error);
      setError(`Error fetching profile: ${error.message}`);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      setLoading(true);
      const profileData = await fetchUserProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        console.log("Getting initial session...");
        const { data } = await supabase.auth.getSession();
        
        if (data.session?.user) {
          console.log("Session found for user:", data.session.user.id);
          setUser(data.session.user);
          
          const profileData = await fetchUserProfile(data.session.user.id);
          if (profileData) {
            setProfile(profileData);
          }
        } else {
          console.log("No active session found");
        }
      } catch (error: any) {
        console.error("Error getting initial session:", error);
        setError(`Error getting initial session: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        
        if (event === 'SIGNED_OUT') {
          console.log("User signed out, clearing state");
          setUser(null);
          setProfile(null);
          setError(null);
          queryClient.clear();
        } else if (session?.user) {
          console.log("User session updated:", session.user.id);
          setUser(session.user);
          
          const profileData = await fetchUserProfile(session.user.id);
          if (profileData) {
            setProfile(profileData);
          }
        }
        
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const LoadingOrRedirect = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center flex-col">
          <div className="card-gradient rounded-lg p-8">
            <p className="text-xl text-gold-400">Carregando...</p>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-900/50 text-red-200 rounded max-w-md">
              <p className="font-medium">Erro:</p>
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-red-800 text-white rounded hover:bg-red-700"
              >
                Recarregar Página
              </button>
            </div>
          )}
        </div>
      );
    }
    return <Navigate to="/" replace />;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, profile, loading, error, refreshProfile }}>
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
                  !loading ? (
                    user && profile?.user_type === 'paciente' ? (
                      <PatientDashboard />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    <LoadingOrRedirect />
                  )
                } 
              />
              <Route 
                path="/paciente/agenda" 
                element={
                  !loading ? (
                    user && profile?.user_type === 'paciente' ? (
                      <PatientCalendar />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    <LoadingOrRedirect />
                  )
                } 
              />
              <Route 
                path="/paciente/records" 
                element={
                  !loading ? (
                    user && profile?.user_type === 'paciente' ? (
                      <PatientRecords />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    <LoadingOrRedirect />
                  )
                } 
              />
              <Route 
                path="/paciente/avaliacoes" 
                element={
                  !loading ? (
                    user && profile?.user_type === 'paciente' ? (
                      <PatientAssessmentsList />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    <LoadingOrRedirect />
                  )
                } 
              />
              <Route 
                path="/paciente/avaliacoes/:id" 
                element={
                  !loading ? (
                    user && profile?.user_type === 'paciente' ? (
                      <PatientAssessment />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    <LoadingOrRedirect />
                  )
                } 
              />
              <Route 
                path="/medico" 
                element={
                  !loading ? (
                    user && profile?.user_type === 'medico' ? (
                      <DoctorDashboard />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    <LoadingOrRedirect />
                  )
                } 
              />
              <Route 
                path="/medico/perfil" 
                element={
                  !loading ? (
                    user && profile?.user_type === 'medico' ? (
                      <DoctorProfile />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    <LoadingOrRedirect />
                  )
                } 
              />
              <Route 
                path="/medico/pacientes" 
                element={
                  !loading ? (
                    user && profile?.user_type === 'medico' ? (
                      <DoctorPatients />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    <LoadingOrRedirect />
                  )
                } 
              />
              <Route 
                path="/medico/agenda" 
                element={
                  !loading ? (
                    user && profile?.user_type === 'medico' ? (
                      <PatientCalendar />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    <LoadingOrRedirect />
                  )
                } 
              />
              <Route 
                path="/medico/avaliacao" 
                element={
                  !loading ? (
                    user && profile?.user_type === 'medico' ? (
                      <DoctorAssessment />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    <LoadingOrRedirect />
                  )
                } 
              />
              <Route 
                path="/medico/documentos" 
                element={
                  !loading ? (
                    user && profile?.user_type === 'medico' ? (
                      <DoctorDocuments />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  ) : (
                    <LoadingOrRedirect />
                  )
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

export default App;
