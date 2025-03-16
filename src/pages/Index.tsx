
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
        <div className="text-center mb-12">
          <Logo size="large" />
          <h1 className="mt-8 text-3xl md:text-4xl font-bold">
            <span className="text-amber-300/90">Assuma o controle total</span>{' '}
            <span className="text-amber-300/90">de seu tratamento</span>
          </h1>
        </div>
        
        <Card className="card-gradient w-full max-w-md p-6 border-gold-400/20 bg-black/40 backdrop-blur-lg">
          <div className="mb-6 text-center">
            <h2 className="text-lg text-amber-300/90 font-medium">
              Área exclusiva para pacientes do Dr. Porceban
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              O acesso se dará através do link recebido no email de pós consulta. Veja como proceder:
            </p>
            <ul className="mt-4 text-xs text-gray-400 text-left list-decimal pl-5 space-y-1">
              <li>Insira o email no qual obteve as orientações pós consulta (email cadastrado)</li>
              <li>É necessário que este página tenha sido acessada com o link enviado pelo email</li>
            </ul>
          </div>
          
          <LoginForm />
          
          <div className="mt-4 text-center">
            <button className="text-amber-300/90 hover:text-amber-200 text-sm">
              Recuperar Link
            </button>
          </div>
        </Card>
        
        <div className="mt-8 text-center text-sm text-gray-500">
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
