
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
import DoctorDocuments from "./pages/DoctorDocuments";
import NotFound from "./pages/NotFound";
import StarBackground from "./components/StarBackground";
import { toast } from "./components/ui/use-toast";

const queryClient = new QueryClient();

// Create auth context
export const AuthContext = createContext<{
  user: any;
  profile: any;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile helper function to avoid code duplication
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId as any)
        .maybeSingle();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return null;
      }
      
      if (profileData) {
        console.log("Profile loaded successfully:", profileData);
        return profileData;
      } else {
        console.warn("No profile found for user:", userId);
        return null;
      }
    } catch (error) {
      console.error("Exception in fetchUserProfile:", error);
      return null;
    }
  };

  // Function to refresh profile - can be called after profile updates
  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchUserProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }
    }
  };

  useEffect(() => {
    // Get initial auth state
    const getInitialSession = async () => {
      try {
        console.log("Getting initial session...");
        const { data } = await supabase.auth.getSession();
        
        if (data.session?.user) {
          console.log("Session found for user:", data.session.user.id);
          setUser(data.session.user);
          
          // Fetch user profile
          const profileData = await fetchUserProfile(data.session.user.id);
          if (profileData) {
            setProfile(profileData);
          }
        } else {
          console.log("No active session found");
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
        
        if (event === 'SIGNED_OUT') {
          console.log("User signed out, clearing state");
          setUser(null);
          setProfile(null);
          queryClient.clear(); // Clear any cached queries
        } else if (session?.user) {
          console.log("User session updated:", session.user.id);
          setUser(session.user);
          
          // Fetch user profile when auth state changes
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

  // Auth-aware loading component
  const LoadingOrRedirect = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="card-gradient rounded-lg p-8">
            <p className="text-xl text-gold-400">Carregando...</p>
          </div>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
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
