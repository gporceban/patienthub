
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, FilePen, FilePlus2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useContext } from 'react';
import { AuthContext } from '@/App';

const PatientAssessment = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user, profile } = useContext(AuthContext);
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!id || !user) return;

      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('patient_assessments')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          setError("Avaliação não encontrada ou você não tem permissão para acessá-la.");
          return;
        }
        
        // Check if the current user is authorized (either as the patient via email or the doctor)
        if (profile?.user_type === 'paciente' && data.patient_email !== profile.email) {
          setError("Você não tem permissão para acessar esta avaliação.");
          return;
        }
        
        setAssessment(data);
      } catch (error) {
        console.error('Error fetching assessment:', error);
        setError("Ocorreu um erro ao buscar os dados da avaliação.");
        toast({
          variant: "destructive",
          title: "Erro ao carregar avaliação",
          description: "Não foi possível carregar os dados da avaliação solicitada."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [id, user, profile, toast]);

  if (loading) {
    return (
      <Layout userType={profile?.user_type || 'paciente'} userName={profile?.full_name || 'Paciente'}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-gold-400">Carregando dados da avaliação...</div>
        </div>
      </Layout>
    );
  }

  if (error || !assessment) {
    return (
      <Layout userType={profile?.user_type || 'paciente'} userName={profile?.full_name || 'Paciente'}>
        <Card className="card-gradient p-6">
          <div className="flex flex-col items-center text-center p-6">
            <AlertCircle size={48} className="text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Erro ao Carregar Avaliação</h2>
            <p className="text-gray-400">{error || "Não foi possível encontrar a avaliação solicitada."}</p>
          </div>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout userType={profile?.user_type || 'paciente'} userName={profile?.full_name || 'Paciente'}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Avaliação Médica
        </h1>
        <p className="text-gray-400">
          {`Avaliação realizada em ${new Date(assessment.created_at).toLocaleDateString('pt-BR')}`}
        </p>
      </div>
      
      <Card className="card-gradient p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
          <h2 className="text-xl font-semibold">Informações do Paciente</h2>
          <div className="text-sm text-gray-400">
            ID do Prontuário: {assessment.prontuario_id}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-gray-400">Nome Completo</p>
            <p className="text-base">{assessment.patient_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400">Email</p>
            <p className="text-base">{assessment.patient_email}</p>
          </div>
        </div>
      </Card>
      
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <FilePlus2 size={16} />
            <span>Resumo</span>
          </TabsTrigger>
          <TabsTrigger value="clinical_note" className="flex items-center gap-2">
            <FileText size={16} />
            <span>Nota Clínica</span>
          </TabsTrigger>
          <TabsTrigger value="prescription" className="flex items-center gap-2">
            <FilePen size={16} />
            <span>Receita</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary">
          <Card className="card-gradient p-6">
            <h3 className="text-lg font-semibold mb-4">Resumo da Consulta</h3>
            {assessment.summary ? (
              <div className="whitespace-pre-wrap bg-darkblue-900/30 p-4 rounded-md">
                {assessment.summary}
              </div>
            ) : (
              <div className="text-center p-6 text-gray-400">
                Nenhum resumo disponível para esta consulta.
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="clinical_note">
          <Card className="card-gradient p-6">
            <h3 className="text-lg font-semibold mb-4">Nota Clínica</h3>
            {assessment.clinical_note ? (
              <div className="whitespace-pre-wrap bg-darkblue-900/30 p-4 rounded-md">
                {assessment.clinical_note}
              </div>
            ) : (
              <div className="text-center p-6 text-gray-400">
                Nenhuma nota clínica disponível para esta consulta.
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="prescription">
          <Card className="card-gradient p-6">
            <h3 className="text-lg font-semibold mb-4">Receita Médica</h3>
            {assessment.prescription ? (
              <div className="whitespace-pre-wrap bg-darkblue-900/30 p-4 rounded-md">
                {assessment.prescription}
              </div>
            ) : (
              <div className="text-center p-6 text-gray-400">
                Nenhuma receita disponível para esta consulta.
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default PatientAssessment;
