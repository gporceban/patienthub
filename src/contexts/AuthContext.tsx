
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
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  error: null,
  session: null,
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw profileError;
      }

      setProfile(profileData);
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      console.log("User signed out successfully");
      setUser(null);
      setProfile(null);
      setSession(null);
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
        
        setSession(initialSession);
        
        if (initialSession?.user) {
          setUser(initialSession.user);
          await fetchProfile(initialSession.user.id);
        }
      } catch (err: any) {
        console.error("Session initialization error:", err.message);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state change event:", event);
      
      setSession(currentSession);
      
      if (event === 'SIGNED_IN' && currentSession?.user) {
        console.log("User signed in:", currentSession.user.id);
        setUser(currentSession.user);
        await fetchProfile(currentSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log("User signed out");
        setUser(null);
        setProfile(null);
      } else if (event === 'TOKEN_REFRESHED' && currentSession) {
        console.log("Token refreshed for user:", currentSession.user.id);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      console.log("Cleaning up auth subscription");
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    isLoading,
    error,
    session,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
