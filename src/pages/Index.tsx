
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Logo from '@/components/Logo';
import LoginForm from '@/components/LoginForm';
import { Card } from '@/components/ui/card';
import PatientRegisterForm from '@/components/PatientRegisterForm';

const Index = () => {
  const [activeTab, setActiveTab] = useState("login");
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="medium" />
          <h1 className="mt-4 text-2xl font-bold">OrthoCareMosaic</h1>
          <p className="mt-2 text-gray-400">
            Plataforma de acompanhamento ortopédico do Dr. Guilherme Porceban
          </p>
        </div>
        
        <Card className="card-gradient p-6">
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar Conta</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            
            <TabsContent value="register">
              <PatientRegisterForm />
            </TabsContent>
          </Tabs>
        </Card>
        
        <p className="text-center text-xs text-gray-500 mt-6">
          © 2025 OrthoCareMosaic. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default Index;
