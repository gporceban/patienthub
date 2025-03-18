
import React, { useState, useEffect, useContext } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, User, Calendar, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fromPatientAssessments, PatientAssessment } from '@/types/patientAssessments';

const DoctorPatients = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [assessments, setAssessments] = useState<PatientAssessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<PatientAssessment[]>([]);
  
  // Fetch patient assessments
  useEffect(() => {
    const fetchPatientAssessments = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await fromPatientAssessments(supabase)
          .select()
          .eq('doctor_id', user.id)
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
          title: "Erro ao carregar pacientes",
          description: "Não foi possível carregar a lista de pacientes. Tente novamente mais tarde."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPatientAssessments();
  }, [user, toast]);
  
  // Filter assessments based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAssessments(assessments);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = assessments.filter(
      assessment => 
        assessment.patient_name.toLowerCase().includes(query) ||
        assessment.patient_email.toLowerCase().includes(query) ||
        assessment.prontuario_id.toLowerCase().includes(query)
    );
    
    setFilteredAssessments(filtered);
  }, [searchQuery, assessments]);
  
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
  
  return (
    <Layout userType="medico">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold mb-2">Meus Pacientes</h1>
        <p className="text-sm md:text-base text-gray-400">
          Gerencie os pacientes e avaliações
        </p>
      </div>
      
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="search"
            placeholder="Buscar por nome, email ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-darkblue-800/50 border-darkblue-700"
          />
        </div>
        
        <Button 
          asChild
          className="w-full md:w-auto bg-gold-500 hover:bg-gold-600 text-black"
        >
          <Link to="/medico/avaliacao">
            <FileText size={18} className="mr-2" />
            Nova Avaliação
          </Link>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
        </div>
      ) : filteredAssessments.length === 0 ? (
        <Card className="card-gradient p-6 md:p-8 text-center">
          <h3 className="text-lg md:text-xl font-medium mb-2">Nenhum paciente encontrado</h3>
          {searchQuery ? (
            <p className="text-sm md:text-base text-gray-400">Nenhum resultado para "{searchQuery}". Tente outra busca ou crie uma nova avaliação.</p>
          ) : (
            <p className="text-sm md:text-base text-gray-400">Você ainda não possui nenhuma avaliação de paciente. Clique em "Nova Avaliação" para começar.</p>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAssessments.map((assessment) => (
            <Card key={assessment.id} className="card-gradient p-4 hover:bg-darkblue-800/50 transition-colors">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-darkblue-700 rounded-full p-3 flex-shrink-0">
                    <User className="h-6 w-6 text-gold-500" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{assessment.patient_name}</h3>
                    <p className="text-sm text-gray-400 truncate">{assessment.patient_email}</p>
                    <p className="text-sm text-gray-400">ID: {assessment.prontuario_id}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar size={14} />
                    <span>{formatDate(assessment.created_at)}</span>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    asChild
                  >
                    <Link to={`/medico/avaliacoes/${assessment.id}`}>
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

export default DoctorPatients;
