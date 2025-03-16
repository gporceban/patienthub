
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Logo from '@/components/Logo';
import LoginForm from '@/components/LoginForm';
import StarBackground from '@/components/StarBackground';
import { Card } from '@/components/ui/card';

const Index = () => {
  const [showContent, setShowContent] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <Layout>
      <StarBackground />
      <div className="hero-section">
        <div className="title-container">
          <Logo size="large" />
          <h1 
            className={`heading-text mt-8 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transition: 'all 0.8s ease-out 0.3s' }}
          >
            Assuma o controle total de seu tratamento
          </h1>
          <p 
            className={`text-gray-400 mt-4 mb-10 max-w-xl text-center ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transition: 'all 0.8s ease-out 0.6s' }}
          >
            Nossa plataforma oferece uma experiência integrada para seu tratamento ortopédico, 
            com acesso às recomendações médicas e acompanhamento personalizado.
          </p>
        </div>
        
        <div 
          className={`${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transition: 'all 0.8s ease-out 0.9s' }}
        >
          <LoginForm />
        </div>
        
        <div 
          className={`mt-12 text-center text-sm text-gray-500 ${showContent ? 'opacity-100' : 'opacity-0'}`}
          style={{ transition: 'opacity 0.8s ease-out 1.2s' }}
        >
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
