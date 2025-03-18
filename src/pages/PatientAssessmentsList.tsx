
import React, { useContext, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import { FileText, Search, Calendar, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

interface PatientAssessment {
  id: string;
  patient_name: string;
  prontuario_id: string;
  created_at: string;
  doctor_id: string | null;
  summary: string | null;
}

const PatientAssessmentsList = () => {
  const { user, profile, isLoading: authLoading } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [assessments, setAssessments] = useState<PatientAssessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<PatientAssessment[]>([]);
  
  // Fetch patient assessments
  useEffect(() => {
    const fetchPatientAssessments = async () => {
      if (!profile || authLoading) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('patient_assessments')
          .select('*')
          .eq('patient_email', profile.email)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setAssessments(data as PatientAssessment[]);
          setFilteredAssessments(data as PatientAssessment[]);
        }
      } catch (error) {
        console.error('Error fetching patient assessments:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar avaliações",
          description: "Não foi possível carregar suas avaliações. Tente novamente mais tarde."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPatientAssessments();
  }, [profile, toast, authLoading]);
  
  // Filter assessments based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAssessments(assessments);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = assessments.filter(
      assessment => {
        const dateStr = formatDate(assessment.created_at);
        return dateStr.includes(query) ||
               (assessment.summary && assessment.summary.toLowerCase().includes(query)) ||
               assessment.prontuario_id.toLowerCase().includes(query);
      }
    );
    
    setFilteredAssessments(filtered);
  }, [searchQuery, assessments]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  return (
    <Layout userType="paciente">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Minhas Avaliações</h1>
        <p className="text-gray-400">
          Consulte todas as suas avaliações médicas
        </p>
      </div>
      
      <div className="mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="search"
            placeholder="Buscar por data ou tipo de avaliação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-darkblue-800/50 border-darkblue-700"
          />
        </div>
      </div>
      
      {isLoading || authLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
        </div>
      ) : filteredAssessments.length === 0 ? (
        <Card className="card-gradient p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gold-400" />
          {searchQuery ? (
            <>
              <h3 className="text-xl font-medium mb-2">Nenhum resultado encontrado</h3>
              <p className="text-gray-400">Nenhuma avaliação corresponde à sua busca "{searchQuery}"</p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-medium mb-2">Nenhuma avaliação encontrada</h3>
              <p className="text-gray-400">
                Você ainda não possui nenhuma avaliação médica registrada.
                Entre em contato com seu médico para mais informações.
              </p>
            </>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAssessments.map((assessment) => (
            <Card key={assessment.id} className="card-gradient p-4 hover:bg-darkblue-800/60 transition-colors">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-darkblue-700 rounded-full p-3">
                    <FileText className="h-6 w-6 text-gold-500" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold">Avaliação de {formatDate(assessment.created_at)}</h3>
                    <p className="text-sm text-gray-400">Prontuário: {assessment.prontuario_id}</p>
                    {assessment.summary && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                        {assessment.summary}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar size={14} />
                    <span>{formatDate(assessment.created_at)}</span>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    asChild
                    className="ml-auto"
                  >
                    <Link to={`/paciente/avaliacoes/${assessment.id}`}>
                      Ver Detalhes
                      <ArrowRight size={14} className="ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default PatientAssessmentsList;
