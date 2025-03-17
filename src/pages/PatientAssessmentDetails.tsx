import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, FileText, Stethoscope, ListChecks, Calendar, History } from 'lucide-react';
import { PatientAssessment } from '@/types/patientAssessments';

const PatientAssessmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, userType } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [assessment, setAssessment] = useState<PatientAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  
  useEffect(() => {
    const fetchAssessmentDetails = async () => {
      if (!id || !profile) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('patient_assessments')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        const isPatientOwner = profile.email.toLowerCase() === data.patient_email.toLowerCase();
        const isDoctorOwner = userType === 'medico' && profile.id === data.doctor_id;
        
        if (!isPatientOwner && !isDoctorOwner) {
          toast({
            variant: "destructive",
            title: "Acesso negado",
            description: "Você não tem permissão para visualizar esta avaliação."
          });
          setIsLoading(false);
          return;
        }
        
        setAssessment(data as PatientAssessment);
      } catch (error) {
        console.error('Erro ao buscar detalhes da avaliação:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os detalhes da avaliação. Tente novamente mais tarde."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAssessmentDetails();
  }, [id, profile, toast, userType]);
  
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
      <Layout userType={userType || "paciente"}>
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Card className="card-gradient">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </Layout>
    );
  }
  
  if (!assessment) {
    return (
      <Layout userType={userType || "paciente"}>
        <div className="flex items-center mb-6">
          <Button asChild variant="ghost" size="icon" className="mr-2">
            <Link to={userType === 'medico' ? "/medico/pacientes" : "/paciente/avaliacoes"}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Avaliação não encontrada</h1>
        </div>
        <Card className="card-gradient p-6 text-center">
          <div className="mb-4">
            <FileText className="h-12 w-12 mx-auto text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Avaliação não disponível</h2>
          <p className="text-gray-400 mb-4">A avaliação solicitada não foi encontrada ou você não tem permissão para acessá-la.</p>
          <Button asChild>
            <Link to={userType === 'medico' ? "/medico/pacientes" : "/paciente/avaliacoes"}>
              Voltar para lista de {userType === 'medico' ? 'pacientes' : 'avaliações'}
            </Link>
          </Button>
        </Card>
      </Layout>
    );
  }
  
  return (
    <Layout userType={userType || "paciente"}>
      <div className="flex items-center mb-6">
        <Button asChild variant="ghost" size="icon" className="mr-2">
          <Link to={userType === 'medico' ? "/medico/pacientes" : "/paciente/avaliacoes"}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Detalhes da Avaliação</h1>
          <p className="text-gray-400">
            Avaliação de {formatDate(assessment.created_at)}
          </p>
        </div>
      </div>
      
      <Card className="card-gradient mb-6 p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <p className="text-sm text-gray-400">Paciente</p>
            <h2 className="text-lg font-semibold">{assessment.patient_name}</h2>
            <p className="text-sm text-gray-400">Prontuário: {assessment.prontuario_id}</p>
          </div>
          <div className="mt-2 md:mt-0">
            <p className="text-sm text-gray-400">Data da Avaliação</p>
            <p className="font-medium">{formatDate(assessment.created_at)}</p>
          </div>
        </div>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="summary" className="flex items-center">
            <ListChecks className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Resumo</span>
          </TabsTrigger>
          <TabsTrigger value="clinical" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Nota Clínica</span>
          </TabsTrigger>
          <TabsTrigger value="prescription" className="flex items-center">
            <Stethoscope className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Prescrição</span>
          </TabsTrigger>
          <TabsTrigger value="transcription" className="flex items-center">
            <History className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Transcrição</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="mt-0">
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center text-gold-300">
                <ListChecks className="h-5 w-5 mr-2" />
                Resumo da Consulta
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userType === 'paciente' && assessment.patient_friendly_summary ? (
                <div className="whitespace-pre-wrap">{assessment.patient_friendly_summary}</div>
              ) : assessment.summary ? (
                <div className="whitespace-pre-wrap">{assessment.summary}</div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <ListChecks className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Resumo não disponível para esta avaliação.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="clinical" className="mt-0">
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center text-gold-300">
                <FileText className="h-5 w-5 mr-2" />
                Nota Clínica
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assessment.clinical_note ? (
                <div className="whitespace-pre-wrap">{assessment.clinical_note}</div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Nota clínica não disponível para esta avaliação.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="prescription" className="mt-0">
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center text-gold-300">
                <Stethoscope className="h-5 w-5 mr-2" />
                Prescrição Médica
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assessment.prescription ? (
                <div className="whitespace-pre-wrap">{assessment.prescription}</div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <Stethoscope className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Prescrição não disponível para esta avaliação.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transcription" className="mt-0">
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle className="flex items-center text-gold-300">
                <History className="h-5 w-5 mr-2" />
                Transcrição da Consulta
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assessment.transcription ? (
                <div className="whitespace-pre-wrap">{assessment.transcription}</div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Transcrição não disponível para esta avaliação.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between mt-8">
        <Button asChild variant="outline">
          <Link to={userType === 'medico' ? "/medico/pacientes" : "/paciente/avaliacoes"}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para lista
          </Link>
        </Button>
        
        {userType === 'paciente' && (
          <Button asChild variant="outline">
            <Link to="/paciente/agenda">
              <Calendar className="h-4 w-4 mr-2" />
              Agendar consulta
            </Link>
          </Button>
        )}
      </div>
    </Layout>
  );
};

export default PatientAssessmentDetails;
