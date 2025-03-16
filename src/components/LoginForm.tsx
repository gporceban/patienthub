
import React, { useState, useEffect, useContext } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/App';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, profile, loading } = useContext(AuthContext);

  // Check if user is already logged in and redirect accordingly
  useEffect(() => {
    if (!loading && user && profile?.user_type) {
      console.log("User already logged in, redirecting based on user type:", profile.user_type);
      redirectBasedOnUserType(profile.user_type);
    }
  }, [user, profile, loading]);

  const redirectBasedOnUserType = (userType: string) => {
    console.log(`Redirecting user to /${userType} page`);
    if (userType === 'paciente') {
      navigate('/paciente', { replace: true });
    } else if (userType === 'medico') {
      navigate('/medico', { replace: true });
    } else {
      console.error("Unknown user type:", userType);
      toast({
        variant: "destructive",
        title: "Erro de perfil",
        description: "Tipo de usuário desconhecido. Por favor, contate o suporte.",
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
        
        // Fetch the user profile to confirm user type
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          throw profileError;
        }

        if (!profileData) {
          console.error("No profile found for user:", data.user.id);
          toast({
            variant: "destructive",
            title: "Erro de perfil",
            description: "Perfil de usuário não encontrado. Por favor, contate o suporte.",
          });
          await supabase.auth.signOut();
          return;
        }

        console.log(`Login successful as ${profileData.user_type}, redirecting...`);
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo ao OrthoCareMosaic.`,
        });
        
        // Redirect based on role immediately after login
        redirectBasedOnUserType(profileData.user_type);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message || "Ocorreu um erro durante o login. Verifique suas credenciais.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If already logged in, show a message or redirect
  if (!loading && user && profile) {
    return (
      <div className="text-center">
        <p className="text-amber-300/90 text-lg font-semibold mb-4">
          Você já está conectado como {profile.user_type === 'paciente' ? 'Paciente' : 'Médico'}
        </p>
        <button 
          onClick={() => redirectBasedOnUserType(profile.user_type)}
          className="button-gold-gradient px-6 py-2 rounded-lg font-semibold transition-all"
        >
          Ir para Dashboard
        </button>
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
        />
        <Input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="dark-input"
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
    </div>
  );
};

export default LoginForm;
