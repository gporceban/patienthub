
import React from "react";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import StarBackground from "@/components/StarBackground";
import Logo from "@/components/Logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <StarBackground />
      <div className="text-center card-gradient rounded-lg p-10 max-w-md">
        <Logo size="small" />
        <h1 className="text-4xl font-bold mt-6 mb-4">404</h1>
        <p className="text-xl text-gray-300 mb-6">Página não encontrada</p>
        <p className="text-gray-400 mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Button asChild className="bg-darkblue-700 hover:bg-darkblue-800">
          <a href="/">
            <Home size={16} className="mr-2" />
            Voltar para a página inicial
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
