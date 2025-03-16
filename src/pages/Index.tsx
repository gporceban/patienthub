
import React from 'react';
import Layout from '@/components/Layout';
import Logo from '@/components/Logo';
import LoginForm from '@/components/LoginForm';
import StarBackground from '@/components/StarBackground';
import { Card } from '@/components/ui/card';

const Index = () => {
  return (
    <Layout>
      <StarBackground />
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <Logo size="large" />
          <h1 className="mt-6 text-3xl md:text-4xl font-bold">
            <span className="text-white">Cuidado Ortopédico</span>{' '}
            <span className="gold-text">Unificado</span>
          </h1>
          <p className="mt-3 text-gray-400 max-w-md mx-auto">
            Plataforma completa para gerenciamento de saúde ortopédica, conectando médicos e pacientes.
          </p>
        </div>
        
        <Card className="card-gradient w-full max-w-md p-6">
          <LoginForm />
        </Card>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2023 OrthoCareMosaic. Todos os direitos reservados.</p>
          <div className="mt-2 space-x-4">
            <a href="#" className="text-gold-400 hover:underline">Termos de Uso</a>
            <a href="#" className="text-gold-400 hover:underline">Política de Privacidade</a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
