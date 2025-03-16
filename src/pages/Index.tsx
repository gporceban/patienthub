
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
      <div className="hero-section">
        <div className="title-container">
          <Logo size="large" />
          <h1 className="heading-text mt-8">
            Assuma o controle total de seu tratamento
          </h1>
          <p className="text-gray-400 mt-4 mb-10 max-w-xl text-center">
            Nossa plataforma oferece uma experiência integrada para seu tratamento ortopédico, 
            com acesso às recomendações médicas e acompanhamento personalizado.
          </p>
        </div>
        
        <LoginForm />
        
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Patient Hub by Dr. Porceban. Todos os direitos reservados.</p>
          <div className="mt-2 space-x-4">
            <a href="#" className="text-amber-400/70 hover:text-amber-300 hover:underline">Termos de Uso</a>
            <a href="#" className="text-amber-400/70 hover:text-amber-300 hover:underline">Política de Privacidade</a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
