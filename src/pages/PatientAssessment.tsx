import React, { useContext, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Calendar, FileText, User, FileHeart, FileDigit, Loader2 } from 'lucide-react';

interface Assessment {
  id: string;
  patient_name: string;
  patient_email: string;
  prontuario_id: string;
  doctor_id: string | null;
  created_at: string;
  updated_at: string;
  clinical_note: string | null;
  prescription: string | null;
  summary: string | null;
  structured_data: any | null;
}

interface DoctorProfile {
  id: string;
  full_name: string;
  email: string;
}

const PatientAssessment = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAssessment = async () => {
      if (!id || !profile) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('patient_assessments')
          .select('*')
          .eq('id', id)
          .eq('patient_email', profile.email)
          .single();
        
        if (assessmentError) {
          throw new Error('Avaliação não encontrada ou você não tem permissão para visualizá-la');
        }
        
        if (!assessmentData) {
          throw new Error('Avaliação não encontrada');
        }
        
        setAssessment(assessmentData as Assessment);
        
        if (assessmentData.doctor_id) {
          const { data: doctorData, error: doctorError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', assessmentData.doctor_id)
            .single();
          
          if (!doctorError && doctorData) {
            setDoctor(doctorData as DoctorProfile);
          }
        }
      } catch (error) {
        console.error('Error fetching assessment:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar avaliação');
        toast({
          variant: "destructive",
          title: "Erro ao carregar avaliação",
          description: error instanceof Error ? error.message : 'Não foi possível carregar os detalhes da avaliação'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAssessment();
  }, [id, profile, toast]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  if (isLoading) {
    return (
      <Layout userType="paciente">
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="h-12 w-12 text-gold-500 animate-spin mb-4" />
          <p className="text-gray-400">Carregando avaliação...</p>
        </div>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout userType="paciente">
        <div className="p-6 text-center">
          <FileText className="h-16 w-16 text-gold-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erro ao carregar avaliação</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button asChild variant="outline">
            <Link to="/paciente/avaliacoes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para lista de avaliações
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }
  
  if (!assessment) {
    return (
      <Layout userType="paciente">
        <div className="p-6 text-center">
          <FileText className="h-16 w-16 text-gold-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Avaliação não encontrada</h2>
          <p className="text-gray-400 mb-6">A avaliação solicitada não foi encontrada ou você não tem permissão para visualizá-la.</p>
          <Button asChild variant="outline">
            <Link to="/paciente/avaliacoes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para lista de avaliações
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout userType="paciente">
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="mb-4"
        >
          <Link to="/paciente/avaliacoes">
            <ArrowLeft size={16} className="mr-2" />
            Voltar para lista
          </Link>
        </Button>
        
        <h1 className="text-2xl font-bold mb-2">Detalhes da Avaliação</h1>
        <p className="text-gray-400">
          Avaliação realizada em {formatDate(assessment.created_at)}
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="card-gradient p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FileHeart className="mr-2 text-gold-400" />
              Nota Clínica
            </h2>
            {assessment.clinical_note ? (
              <div className="bg-darkblue-800/50 rounded-lg p-4 whitespace-pre-wrap">
                {assessment.clinical_note}
              </div>
            ) : (
              <div className="bg-darkblue-800/50 rounded-lg p-4 text-gray-400 italic">
                Nenhuma nota clínica disponível.
              </div>
            )}
          </Card>
          
          <Card className="card-gradient p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FileDigit className="mr-2 text-gold-400" />
              Prescrição
            </h2>
            {assessment.prescription ? (
              <div className="bg-darkblue-800/50 rounded-lg p-4 whitespace-pre-wrap">
                {assessment.prescription}
              </div>
            ) : (
              <div className="bg-darkblue-800/50 rounded-lg p-4 text-gray-400 italic">
                Nenhuma prescrição disponível.
              </div>
            )}
          </Card>
        </div>
        
        <div>
          <Card className="card-gradient p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Informações</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Nome do Paciente</p>
                <p className="font-medium">{assessment.patient_name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="font-medium">{assessment.patient_email}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">ID do Prontuário</p>
                <p className="font-medium">{assessment.prontuario_id}</p>
              </div>
              
              <Separator className="bg-darkblue-700/50" />
              
              <div>
                <p className="text-sm text-gray-400">Data da Avaliação</p>
                <p className="font-medium">{formatDate(assessment.created_at)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-400">Médico Responsável</p>
                <p className="font-medium">{doctor ? doctor.full_name : 'Não informado'}</p>
              </div>
            </div>
          </Card>
          
          <Card className="card-gradient p-6">
            <h2 className="text-lg font-semibold mb-4">Resumo</h2>
            {assessment.summary ? (
              <div className="bg-darkblue-800/50 rounded-lg p-4 whitespace-pre-wrap">
                {assessment.summary}
              </div>
            ) : (
              <div className="bg-darkblue-800/50 rounded-lg p-4 text-gray-400 italic">
                Nenhum resumo disponível.
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PatientAssessment;
