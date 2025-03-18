
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  error: Error | null;
  session: Session | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  userType: 'medico' | 'paciente' | null;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  error: null,
  session: null,
  userType: null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userType, setUserType] = useState<'medico' | 'paciente' | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      console.log(`Fetching profile for user: ${userId}`);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw profileError;
      }

      console.log("Profile data retrieved:", profileData);
      setProfile(profileData);
      
      // Set user type based on the profile data
      if (profileData?.user_type) {
        setUserType(profileData.user_type as 'medico' | 'paciente');
      }
    } catch (err: any) {
      console.error("Profile fetch error:", err.message);
      setError(err);
    }
  };

  // Refresh profile function to be exposed in the context
  const refreshProfile = async () => {
    if (!user) return;
    await fetchProfile(user.id);
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      console.log("Signing out user...");
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        throw error;
      }
      
      // Clear local storage items
      window.localStorage.removeItem('ortho-care-auth-token');
      
      // Clear any other auth-related items in local storage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('token'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log("User signed out successfully", { keysRemoved: keysToRemove });
      
      setUser(null);
      setProfile(null);
      setSession(null);
      setUserType(null);
    } catch (err: any) {
      console.error("Sign Out Error:", err.message);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("AuthProvider initialized, checking session...");
    
    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get the initial session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        console.log("Initial session check:", initialSession ? "Session found" : "No session");
        
        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchProfile(initialSession.user.id);
        }
      } catch (err: any) {
        console.error("Session initialization error:", err.message);
        setError(err);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // Set up auth state change subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state change event:", event, {
        userId: currentSession?.user?.id,
        timestamp: new Date().toISOString(),
      });
      
      // Only handle events if the auth provider has completed its initialization
      if (!isInitialized && event !== 'INITIAL_SESSION') {
        console.log("Skipping auth state change event while initializing:", event);
        return;
      }
      
      if (event === 'SIGNED_IN' && currentSession?.user) {
        console.log("User signed in:", currentSession.user.id);
        setSession(currentSession);
        setUser(currentSession.user);
        await fetchProfile(currentSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log("User signed out");
        setUser(null);
        setProfile(null);
        setSession(null);
        setUserType(null);
      } else if (event === 'TOKEN_REFRESHED' && currentSession) {
        console.log("Token refreshed for user:", currentSession.user.id);
        setSession(currentSession);
      } else if (event === 'USER_UPDATED' && currentSession) {
        console.log("User updated:", currentSession.user.id);
        setUser(currentSession.user);
        await fetchProfile(currentSession.user.id);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      console.log("Cleaning up auth subscription");
      subscription?.unsubscribe();
    };
  }, [isInitialized]);

  const value = {
    user,
    profile,
    isLoading,
    error,
    session,
    userType,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
