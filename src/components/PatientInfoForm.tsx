
import React from 'react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const patientInfoSchema = z.object({
  name: z.string().min(3, { message: "Nome do paciente deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  prontuarioId: z.string().min(1, { message: "ID do prontuário é obrigatório" }),
});

export type PatientInfo = z.infer<typeof patientInfoSchema>;

interface PatientInfoFormProps {
  onSubmit: (data: PatientInfo) => void;
  isLoading?: boolean;
}

const PatientInfoForm: React.FC<PatientInfoFormProps> = ({ onSubmit, isLoading = false }) => {
  const form = useForm<PatientInfo>({
    resolver: zodResolver(patientInfoSchema),
    defaultValues: {
      name: "",
      email: "",
      prontuarioId: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Paciente</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Nome completo do paciente" 
                  {...field} 
                  className="bg-darkblue-900/50 border-darkblue-700"
                />
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
                <Input 
                  type="email" 
                  placeholder="email@exemplo.com" 
                  {...field} 
                  className="bg-darkblue-900/50 border-darkblue-700"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="prontuarioId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID do Prontuário</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Número de identificação do prontuário" 
                  {...field} 
                  className="bg-darkblue-900/50 border-darkblue-700"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full bg-gold-500 hover:bg-gold-600 text-black"
          disabled={isLoading}
        >
          {isLoading ? "Processando..." : "Continuar para Gravação"}
        </Button>
      </form>
    </Form>
  );
};

export default PatientInfoForm;
