
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Logo from '@/components/Logo';
import LoginForm from '@/components/LoginForm';
import { Card } from '@/components/ui/card';
import PatientRegisterForm from '@/components/PatientRegisterForm';
import StarBackground from '@/components/StarBackground';

const Index = () => {
  const [activeTab, setActiveTab] = useState("login");
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-8 relative overflow-hidden">
      {/* Space background with stars */}
      <StarBackground />
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center mb-4">
          <Logo size="medium" />
          <p className="mt-2 text-gray-400">
            Plataforma de acompanhamento ortopédico do Dr. Guilherme Porceban
          </p>
        </div>
        
        <Card className="card-gradient p-6 shadow-lg border border-darkblue-700/50 backdrop-blur-md">
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar Conta</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 mt-2">
              <LoginForm />
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4 mt-2">
              <PatientRegisterForm />
            </TabsContent>
          </Tabs>
        </Card>
        
        <p className="text-center text-xs text-gray-500 mt-6">
          © 2025 OrthoCareMosaic. Todos os direitos reservados.
        </p>
      </div>
      
      {/* Horizon effect for bottom of page */}
      <div className="planet-horizon absolute bottom-0 left-0 w-full"></div>
    </div>
  );
};

export default Index;
