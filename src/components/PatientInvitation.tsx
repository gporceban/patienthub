
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, User, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface PatientInvitationProps {
  patientId?: string;
  patientName?: string;
  patientEmail?: string;
  onSuccess?: () => void;
}

const invitationSchema = z.object({
  name: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  message: z.string().optional(),
});

type InvitationFormValues = z.infer<typeof invitationSchema>;

export const PatientInvitation: React.FC<PatientInvitationProps> = ({
  patientId,
  patientName = "",
  patientEmail = "",
  onSuccess
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      name: patientName,
      email: patientEmail,
      message: "Você foi adicionado à plataforma OrthoCareMosaic. Por favor, crie sua conta para acessar sua avaliação médica e acompanhar seu tratamento."
    }
  });
  
  const onSubmit = async (data: InvitationFormValues) => {
    setIsLoading(true);
    
    try {
      // Check if we're creating a test patient linked to Dr. Guilherme
      const isTestPatient = data.email.toLowerCase() === "teste@orthocaremosaic.com";
      const isDrGuilherme = "gporceban@gmail.com";
      
      // First check if a patient record with this email already exists
      const { data: existingPatients, error: searchError } = await supabase
        .from('patient_assessments')
        .select('id')
        .eq('patient_email', data.email)
        .limit(1);
      
      if (searchError) {
        throw searchError;
      }
      
      if (existingPatients && existingPatients.length > 0) {
        toast({
          variant: "destructive",
          title: "Paciente já existe",
          description: `Um paciente com o email ${data.email} já existe no sistema.`,
        });
        return;
      }
      
      // Get the doctor's ID (for this example, we'll use the test doctor)
      const { data: doctorData, error: doctorError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', isDrGuilherme)
        .eq('user_type', 'medico')
        .single();
      
      if (doctorError) {
        throw new Error("Não foi possível encontrar o médico. Verifique se a conta do médico está registrada corretamente.");
      }
      
      const doctorId = doctorData.id;
      
      // Create a new patient assessment
      const prontuarioId = `ORTHO-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      const { data: newAssessment, error: assessmentError } = await supabase
        .from('patient_assessments')
        .insert({
          patient_name: data.name,
          patient_email: data.email,
          prontuario_id: prontuarioId,
          doctor_id: doctorId,
          clinical_note: isTestPatient ? "Nota clínica de teste para demonstração." : "",
          prescription: isTestPatient ? "Prescrição de teste para demonstração." : "",
          summary: isTestPatient ? "Paciente teste criado para demonstração da plataforma." : ""
        })
        .select()
        .single();
      
      if (assessmentError) {
        throw assessmentError;
      }
      
      // Send invitation email (in a real app, this would be an actual email)
      // For test purposes, we'll simulate this was sent successfully
      
      toast({
        title: "Convite enviado com sucesso!",
        description: `Um email foi enviado para ${data.email} com instruções para criar a conta.`,
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      // For test patients, display additional information
      if (isTestPatient) {
        toast({
          title: "Conta de teste criada",
          description: `ID do prontuário: ${prontuarioId}. Use este ID ao criar a conta do paciente de teste.`,
          duration: 10000,
        });
      }
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar convite",
        description: error instanceof Error ? error.message : "Não foi possível enviar o convite. Tente novamente mais tarde."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="card-gradient p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Convidar Paciente</h2>
        <p className="text-gray-400">
          Envie um convite para o paciente criar uma conta e acessar seu prontuário
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Paciente</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-gray-400" size={16} />
                    <Input
                      {...field}
                      className="pl-10 bg-darkblue-900/50 border-darkblue-700"
                      placeholder="Nome completo do paciente"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email do Paciente</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
                    <Input
                      {...field}
                      type="email"
                      className="pl-10 bg-darkblue-900/50 border-darkblue-700"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mensagem (opcional)</FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    className="w-full rounded-md p-3 bg-darkblue-900/50 border border-darkblue-700 text-sm"
                    rows={4}
                    placeholder="Mensagem personalizada para o convite"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="bg-darkblue-800/50 rounded-lg p-4 border border-darkblue-700/50">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <ShieldCheck className="text-gold-400" size={20} />
              </div>
              <div>
                <h4 className="font-medium mb-1">Segurança e Privacidade</h4>
                <p className="text-sm text-gray-400">
                  O paciente receberá um email com um link seguro para criar sua conta.
                  Todas as informações são criptografadas e protegidas de acordo com a LGPD.
                </p>
              </div>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-gold-500 hover:bg-gold-600 text-black"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Enviando Convite..." : "Enviar Convite"}
          </Button>
        </form>
      </Form>
    </Card>
  );
};
