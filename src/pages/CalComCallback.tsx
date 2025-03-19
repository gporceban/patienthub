
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { exchangeCodeForToken, storeCalComToken } from '@/services/calComService';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const CalComCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userType } = useContext(AuthContext);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processOAuthCallback = async () => {
      if (!user) {
        setError("Você precisa estar autenticado para conectar sua conta Cal.com");
        setIsLoading(false);
        return;
      }

      try {
        // Extract authorization code from URL
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get('code');

        if (!code) {
          setError("Código de autorização não encontrado na URL");
          setIsLoading(false);
          return;
        }

        console.log("Authorization code obtained:", code);

        // Exchange code for token
        const redirectUri = `${window.location.origin}/calcom/callback`;
        console.log("Using redirect URI for token exchange:", redirectUri);
        
        const tokenData = await exchangeCodeForToken(code, redirectUri);

        if (!tokenData || !tokenData.access_token) {
          setError("Falha ao obter token de acesso");
          setIsLoading(false);
          return;
        }

        console.log("Token obtained, storing in database...");

        // Store the tokens in Supabase
        await storeCalComToken(user.id, tokenData);
        
        console.log("Cal.com integration successful!");
        toast({
          title: "Conexão bem-sucedida",
          description: "Sua conta Cal.com foi conectada com sucesso.",
          variant: "default"
        });

        // Redirect based on user type
        const redirectPath = userType === 'medico' 
          ? '/medico/calendario' 
          : '/paciente/calendario';

        setIsLoading(false);
        navigate(redirectPath);
      } catch (err) {
        console.error("Cal.com OAuth error:", err);
        setError("Erro ao processar autenticação Cal.com");
        setIsLoading(false);
        
        toast({
          title: "Erro de conexão",
          description: "Ocorreu um erro ao conectar com o Cal.com. Por favor, tente novamente.",
          variant: "destructive"
        });
      }
    };

    processOAuthCallback();
  }, [location, navigate, user, toast, userType]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="card-gradient p-8 rounded-lg w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Conectando com Cal.com</h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          </div>
          <p className="text-center mt-4 text-gray-400">Aguarde enquanto processamos sua autenticação...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="card-gradient p-8 rounded-lg w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Erro de Conexão</h1>
          <p className="text-red-500 text-center mb-6">{error}</p>
          <div className="flex justify-center">
            <Button onClick={() => navigate(-1)}>
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="card-gradient p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Conectado com Sucesso!</h1>
        <p className="text-center mb-6 text-gray-400">
          Sua conta Cal.com foi conectada com sucesso. Agora você pode gerenciar suas consultas diretamente pelo OrthoCareMosaic.
        </p>
        <div className="flex justify-center">
          <Button onClick={() => navigate(-1)}>
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CalComCallback;
