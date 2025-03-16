
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Mail, Lock, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const PatientRegisterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [prontuarioId, setProntuarioId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRegister = async () => {
    // Validations
    if (!email || !password || !fullName || !prontuarioId) {
      toast({
        variant: "destructive",
        title: "Preencha todos os campos",
        description: "Todos os campos são obrigatórios para realizar o cadastro.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Format the prontuario_id by removing any hyphens for consistency
      const formattedProntuarioId = prontuarioId.replace(/-/g, '');
      
      console.log(`Checking prontuario with normalized ID: ${formattedProntuarioId} and email: ${email}`);
      
      // First check if a patient record with this email and prontuario_id exists
      // Use both the formatted and original prontuarioId to handle different input formats
      const { data: existingAssessment, error: checkError } = await supabase
        .from('patient_assessments')
        .select('id')
        .or(`prontuario_id.eq.${formattedProntuarioId},prontuario_id.eq.${prontuarioId}`)
        .eq('patient_email', email)
        .maybeSingle();

      if (checkError) {
        console.error("Database check error:", checkError);
        throw checkError;
      }

      console.log("Assessment check result:", existingAssessment);

      if (!existingAssessment) {
        throw new Error(`Não encontramos nenhum prontuário com ID ${prontuarioId} associado ao email ${email}. Verifique as informações ou entre em contato com seu médico.`);
      }

      // Register the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: 'paciente',
            prontuario_id: prontuarioId
          }
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Você será redirecionado para a área do paciente.",
      });

      // Give a small delay for the user to see the success message
      setTimeout(() => {
        navigate('/paciente');
      }, 1500);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro durante o cadastro. Verifique suas informações.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full form-section">
      <h2 className="text-lg gold-text font-medium mb-4 text-center">
        Criar conta de paciente
      </h2>
      <p className="mb-6 text-sm text-gray-400 text-center">
        Preencha os dados abaixo para criar sua conta
      </p>
      
      <div className="space-y-4 w-full">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 text-gray-400" size={16} />
            <Input
              id="fullName"
              type="text"
              placeholder="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="dark-input pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
            <Input
              id="email"
              type="email"
              placeholder="seu-email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="dark-input pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prontuarioId">Código do Prontuário</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 text-gray-400" size={16} />
            <Input
              id="prontuarioId"
              type="text"
              placeholder="ORTHO-XXXX"
              value={prontuarioId}
              onChange={(e) => setProntuarioId(e.target.value)}
              className="dark-input pl-10"
            />
          </div>
          <p className="text-xs text-gray-500">Fornecido pelo seu médico</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={16} />
            <Input
              id="password"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="dark-input pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={16} />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="dark-input pl-10"
            />
          </div>
        </div>

        <Button 
          className="button-gold-gradient w-full px-6 py-2 rounded-lg font-semibold transition-all"
          onClick={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : 'Criar Conta'}
        </Button>
      </div>
    </div>
  );
};

export default PatientRegisterForm;
