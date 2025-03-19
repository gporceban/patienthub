import React, { useState, useEffect, useContext } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { User, RefreshCcw } from 'lucide-react';
import { supabase, clearAuthState } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const navigate = useNavigate();
  const { 
    user, 
    profile, 
    userType,
    isLoading: authLoading, 
    error: authError, 
    refreshProfile,
    refreshAuth,
    hasValidSession,
    isInitialized 
  } = useContext(AuthContext);
  
  useEffect(() => {
    console.log("LoginForm rendered. Auth state:", { 
      user: !!user, 
      profile, 
      userType,
      loading: authLoading, 
      error: authError,
      hasValidSession,
      isInitialized
    });
    
    // Only redirect if we have both user and profile with user_type and not already redirecting
    if (isInitialized && !authLoading && user && userType && hasValidSession) {
      console.log("User already logged in with complete profile, redirecting to:", userType);
      redirectBasedOnUserType(userType);
    }
  }, [user, profile, userType, authLoading, hasValidSession, isInitialized]);

  const redirectBasedOnUserType = (userType: string) => {
    console.log(`Attempting to redirect user to /${userType}/dashboard page`);
    
    try {
      if (userType === 'paciente') {
        console.log("Navigating to /paciente/dashboard with replace=true");
        navigate('/paciente/dashboard', { replace: true });
      } else if (userType === 'medico') {
        console.log("Navigating to /medico/dashboard with replace=true");
        navigate('/medico/dashboard', { replace: true });
      } else {
        console.error("Unknown user type:", userType);
        toast({
          variant: "destructive",
          title: "Erro de perfil",
          description: "Tipo de usuário desconhecido. Por favor, contate o suporte.",
        });
      }
    } catch (error) {
      console.error("Error during redirect:", error);
      toast({
        variant: "destructive",
        title: "Erro de redirecionamento",
        description: "Não foi possível redirecioná-lo. Por favor, atualize a página.",
      });
    }
  };

  const handleLogin = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: "Por favor, insira seu email.",
      });
      return;
    }

    if (!password) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: "Por favor, insira sua senha.",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log(`Attempting login with email: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        console.log("Login successful, fetching profile...");
        
        // Force a refresh of the auth context
        await refreshAuth();
        
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo ao OrthoCareMosaic.`,
        });
        
        // The redirectBasedOnUserType will be handled by the useEffect when the context updates
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message || "Ocorreu um erro durante o login. Verifique suas credenciais.",
      });
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSession = async () => {
    setIsClearing(true);
    try {
      const { success, error } = await clearAuthState();
      
      if (success) {
        toast({
          title: "Sessão limpa",
          description: "Todas as informações de sessão foram removidas.",
        });
        // Force page reload to ensure clean state
        window.location.reload();
      } else {
        throw error || new Error("Failed to clear session");
      }
    } catch (error: any) {
      console.error('Error clearing session:', error);
      toast({
        variant: "destructive",
        title: "Erro ao limpar sessão",
        description: error.message || "Ocorreu um erro ao tentar limpar sua sessão.",
      });
    } finally {
      setIsClearing(false);
    }
  };

  // If there's an auth error, show it
  if (authError) {
    return (
      <div className="text-center">
        <p className="text-red-400 text-lg font-semibold mb-4">
          Erro de autenticação
        </p>
        <p className="text-red-300 mb-4">{authError.message}</p>
        <div className="flex flex-col space-y-3">
          <button 
            onClick={handleClearSession}
            className="button-gold-gradient px-6 py-2 rounded-lg font-semibold transition-all"
          >
            Limpar Sessão e Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // If already logged in, show a message or redirect
  if (isInitialized && !authLoading && user && profile && hasValidSession) {
    return (
      <div className="text-center">
        <p className="text-amber-300/90 text-lg font-semibold mb-4">
          Você já está conectado como {userType === 'paciente' ? 'Paciente' : 'Médico'}
        </p>
        <div className="flex flex-col space-y-3">
          <button 
            onClick={() => redirectBasedOnUserType(userType || '')}
            className="button-gold-gradient px-6 py-2 rounded-lg font-semibold transition-all"
          >
            Ir para Dashboard
          </button>
          <button 
            onClick={handleClearSession}
            className="text-red-400 hover:text-red-300 text-sm flex items-center justify-center"
            disabled={isClearing}
          >
            {isClearing ? (
              <span className="flex items-center"><RefreshCcw size={14} className="animate-spin mr-2" /> Limpando sessão...</span>
            ) : (
              <span>Limpar sessão e fazer logout</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full form-section">
      <h2 className="text-lg gold-text font-medium mb-4 text-center">
        Área exclusiva para pacientes do Dr. Porceban
      </h2>
      <p className="mb-6 text-sm text-gray-400 text-center">
        Entre com seu email e senha para acessar sua área do paciente
      </p>
      
      <div className="space-y-4 w-full">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="dark-input"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleLogin();
            }
          }}
        />
        <Input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="dark-input"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleLogin();
            }
          }}
        />
        <button 
          className="button-gold-gradient w-full px-6 py-2 rounded-lg font-semibold transition-all"
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? 'Processando...' : 'Entrar'}
        </button>
      </div>
      
      <div className="mt-4 text-center">
        <button className="text-amber-300/90 hover:text-amber-200 text-sm">
          Esqueci minha senha
        </button>
      </div>
      
      {/* Only show clear session button when there's a problem */}
      <div className="mt-6 text-center">
        <button 
          onClick={handleClearSession}
          className="text-red-400 hover:text-red-300 text-xs"
          disabled={isClearing}
        >
          {isClearing ? 'Limpando sessão...' : 'Problemas para entrar? Limpar dados de sessão'}
        </button>
      </div>
    </div>
  );
};

export default LoginForm;
