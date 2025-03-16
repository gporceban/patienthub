import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useContext } from 'react';
import { AuthContext } from '@/App';
import { Calendar, FileText, ChevronRight, AlertCircle } from 'lucide-react';
import { fromPatientAssessments, PatientAssessment } from '@/types/patientAssessments';

const PatientAssessmentsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useContext(AuthContext);
  const [assessments, setAssessments] = useState<PatientAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssessments = async () => {
      if (!user || !profile) return;

      try {
        setLoading(true);
        
        const { data, error } = await fromPatientAssessments(supabase)
          .select()
          .eq('patient_email', profile.email)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setAssessments(data || []);
      } catch (error) {
        console.error('Error fetching assessments:', error);
        setError("Ocorreu um erro ao buscar suas avaliações médicas.");
        toast({
          variant: "destructive",
          title: "Erro ao carregar avaliações",
          description: "Não foi possível carregar suas avaliações médicas."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, [user, profile, toast]);

  const viewAssessment = (id: string) => {
    navigate(`/paciente/avaliacoes/${id}`);
  };

  if (loading) {
    return (
      <Layout userType="paciente" userName={profile?.full_name || 'Paciente'}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-gold-400">Carregando suas avaliações...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userType="paciente" userName={profile?.full_name || 'Paciente'}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Minhas Avaliações Médicas
        </h1>
        <p className="text-gray-400">
          Visualize todas as suas avaliações médicas realizadas
        </p>
      </div>
      
      {error ? (
        <Card className="card-gradient p-6">
          <div className="flex flex-col items-center text-center p-6">
            <AlertCircle size={48} className="text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Erro ao Carregar Avaliações</h2>
            <p className="text-gray-400">{error}</p>
          </div>
        </Card>
      ) : assessments.length === 0 ? (
        <Card className="card-gradient p-6">
          <div className="flex flex-col items-center text-center p-6">
            <FileText size={48} className="text-gold-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Nenhuma Avaliação Encontrada</h2>
            <p className="text-gray-400">Você ainda não possui avaliações médicas registradas.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {assessments.map((assessment) => (
            <Card key={assessment.id} className="card-gradient p-4 hover:bg-darkblue-800/50 transition-colors">
              <div className="flex justify-between items-center">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-darkblue-700/50 rounded-full">
                    <Calendar size={20} className="text-gold-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      Avaliação de {new Date(assessment.created_at).toLocaleDateString('pt-BR')}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Prontuário: {assessment.prontuario_id}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gold-400 hover:text-gold-300 hover:bg-darkblue-700"
                  onClick={() => viewAssessment(assessment.id)}
                >
                  <span className="mr-1">Ver</span>
                  <ChevronRight size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default PatientAssessmentsList;
