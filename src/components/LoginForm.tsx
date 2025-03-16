
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from 'react-router-dom';
import { Lock, User, UserCog } from 'lucide-react';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (role: 'paciente' | 'medico') => {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      
      if (email && password) {
        toast({
          title: "Login realizado com sucesso",
          description: `Você entrou como ${role}.`,
        });
        
        // Simulate a redirect based on role
        if (role === 'paciente') {
          navigate('/paciente');
        } else {
          navigate('/medico');
        }
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao fazer login",
          description: "Por favor, preencha todos os campos.",
        });
      }
    }, 1500);
  };

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
