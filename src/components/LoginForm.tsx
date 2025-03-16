
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
    if (userType === 'paciente') {
      navigate('/paciente', { replace: true });
    } else if (userType === 'medico') {
      navigate('/medico', { replace: true });
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

    setIsLoading(true);

    try {
      console.log(`Attempting login with email: ${email}`);
      
      // For demo purposes, using a simplified login approach
      // In production, would need proper authentication and verification
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || 'default-password', // In this design, password might be optional
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
          .eq('id', data.user.id as any)
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
          description: `Bem-vindo ao Patient Hub.`,
        });
        
        // Redirect based on role
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
        <Button 
          onClick={() => redirectBasedOnUserType(profile.user_type)}
          className="w-full bg-gradient-to-r from-amber-500/80 to-amber-600/80 hover:from-amber-500 hover:to-amber-600 text-white"
        >
          Ir para Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-4">
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-black/60 border-gray-700 focus:border-amber-400/50 placeholder-gray-500"
          />
          <Button 
            className="w-full bg-gradient-to-r from-amber-500/80 to-amber-600/80 hover:from-amber-500 hover:to-amber-600 text-white"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? 'Processando...' : 'Entrar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
