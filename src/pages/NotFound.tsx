
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import StarBackground from "@/components/StarBackground";
import Logo from "@/components/Logo";
import { AuthContext } from "@/App";

const NotFound = () => {
  const location = useLocation();
  const { user, profile } = useContext(AuthContext);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
      "User auth state:", user ? "Logged in" : "Not logged in"
    );
  }, [location.pathname, user]);

  // Determine the correct redirect path based on authentication status
  const getRedirectPath = () => {
    if (!user) return "/";
    if (profile?.user_type === "paciente") return "/paciente";
    if (profile?.user_type === "medico") return "/medico";
    return "/";
  };

  const redirectPath = getRedirectPath();

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
          <Link to={redirectPath}>
            <Home size={16} className="mr-2" />
            Voltar para a página inicial
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
