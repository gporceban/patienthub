import React, { useState, useEffect, useContext } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from 'react-router-dom';
import { Lock, User, UserCog } from 'lucide-react';
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

  const handleLogin = async (role: 'paciente' | 'medico') => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: "Por favor, preencha todos os campos.",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log(`Attempting login as ${role} with email: ${email}`);
      
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

        // Check if user type matches the selected role
        if (profileData.user_type !== role) {
          console.error(`User type mismatch: expected ${role}, got ${profileData.user_type}`);
          toast({
            variant: "destructive",
            title: "Tipo de usuário incorreto",
            description: `Você tentou entrar como ${role}, mas sua conta está registrada como ${profileData.user_type}.`,
          });
          await supabase.auth.signOut();
        } else {
          console.log(`Login successful as ${role}, redirecting...`);
          toast({
            title: "Login realizado com sucesso",
            description: `Você entrou como ${role}.`,
          });
          
          // Redirect based on role
          redirectBasedOnUserType(role);
        }
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

  const handleSignUp = async (role: 'paciente' | 'medico') => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: "Por favor, preencha todos os campos.",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log(`Attempting to sign up as ${role} with email: ${email}`);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: role,
            full_name: '',
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        console.log("Signup successful:", data.user);
        
        toast({
          title: "Conta criada com sucesso",
          description: "Por favor, verifique seu e-mail para confirmar sua conta.",
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: error.message || "Ocorreu um erro durante o cadastro.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If already logged in, show a message or redirect
  if (!loading && user && profile) {
    return (
      <div className="text-center">
        <p className="text-gold-400 text-lg font-semibold mb-4">
          Você já está conectado como {profile.user_type === 'paciente' ? 'Paciente' : 'Médico'}
        </p>
        <Button 
          onClick={() => redirectBasedOnUserType(profile.user_type)}
          className="bg-gradient-to-r from-darkblue-600 to-darkblue-800 hover:from-darkblue-700 hover:to-darkblue-900 text-white"
        >
          Ir para Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Tabs defaultValue="paciente" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="paciente" className="flex items-center gap-2">
            <User size={16} />
            <span>Paciente</span>
          </TabsTrigger>
          <TabsTrigger value="medico" className="flex items-center gap-2">
            <UserCog size={16} />
            <span>Médico</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="paciente">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6">
              Área do <span className="gold-text">Paciente</span>
            </h2>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-darkblue-900/50 border-darkblue-700 focus:border-gold-400"
              />
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-darkblue-900/50 border-darkblue-700 focus:border-gold-400"
              />
              <Button 
                className="w-full bg-gradient-to-r from-darkblue-600 to-darkblue-800 hover:from-darkblue-700 hover:to-darkblue-900 text-white border border-darkblue-500"
                onClick={() => handleLogin('paciente')}
                disabled={isLoading}
              >
                {isLoading ? 'Processando...' : 'Entrar como Paciente'}
              </Button>
              <div className="text-sm text-center mt-2 text-muted-foreground">
                Não tem uma conta?{' '}
                <button 
                  onClick={() => handleSignUp('paciente')} 
                  className="text-gold-400 hover:underline"
                  disabled={isLoading}
                >
                  Cadastre-se
                </button>
              </div>
              <div className="text-sm text-center mt-4 text-muted-foreground">
                <a href="#" className="text-gold-400 hover:underline">Esqueceu sua senha?</a>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="medico">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6">
              Área do <span className="gold-text">Médico</span>
            </h2>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-darkblue-900/50 border-darkblue-700 focus:border-gold-400"
              />
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-darkblue-900/50 border-darkblue-700 focus:border-gold-400"
              />
              <Button 
                className="w-full bg-gradient-to-r from-darkblue-600 to-darkblue-800 hover:from-darkblue-700 hover:to-darkblue-900 text-white border border-darkblue-500"
                onClick={() => handleLogin('medico')}
                disabled={isLoading}
              >
                {isLoading ? 'Processando...' : 'Entrar como Médico'}
              </Button>
              <div className="text-sm text-center mt-2 text-muted-foreground">
                Não tem uma conta?{' '}
                <button 
                  onClick={() => handleSignUp('medico')} 
                  className="text-gold-400 hover:underline"
                  disabled={isLoading}
                >
                  Cadastre-se
                </button>
              </div>
              <div className="text-sm text-center mt-4 text-muted-foreground">
                <a href="#" className="text-gold-400 hover:underline">Esqueceu sua senha?</a>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoginForm;
