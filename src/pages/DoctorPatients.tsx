import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AuthContext } from '@/App';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Loader2, Plus, Search, UserRound } from 'lucide-react';

interface PatientAssessment {
  id: string;
  patient_name: string;
  patient_email: string;
  prontuario_id: string;
  created_at: string;
}

const DoctorPatients = () => {
  const { user, profile } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientAssessments, setPatientAssessments] = useState<PatientAssessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<PatientAssessment[]>([]);

  // Redirect if not logged in or not a doctor
  useEffect(() => {
    if (!user || profile?.user_type !== 'medico') {
      navigate('/');
    }
  }, [user, profile, navigate]);

  // Fetch patient assessments
  useEffect(() => {
    const fetchPatientAssessments = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('patient_assessments')
          .select('id, patient_name, patient_email, prontuario_id, created_at')
          .eq('doctor_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          toast({
            variant: "destructive",
            title: "Erro ao carregar pacientes",
            description: error.message,
          });
        } else if (data) {
          // Cast data to the correct type
          const typedData = data as unknown as PatientAssessment[];
          setPatientAssessments(typedData);
          setFilteredAssessments(typedData);
        }
      } catch (error: any) {
        console.error('Error fetching patient assessments:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar pacientes",
          description: "Não foi possível carregar a lista de pacientes.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientAssessments();
  }, [user]);

  // Filter assessments when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAssessments(patientAssessments);
    } else {
      const filtered = patientAssessments.filter(assessment => 
        assessment.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        assessment.patient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.prontuario_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssessments(filtered);
    }
  }, [searchTerm, patientAssessments]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Layout userType="medico">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout userType="medico">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Meus <span className="gold-text">Pacientes</span>
        </h1>
        <p className="text-gray-400">
          Gerencie seus pacientes e avaliações clínicas
        </p>
      </div>
      
      <Card className="card-gradient mb-6">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar paciente..." 
                className="pl-10 bg-darkblue-900/50 border-darkblue-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={() => navigate('/medico/avaliacao')}
              className="bg-gold-500 hover:bg-gold-600 text-black"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Avaliação
            </Button>
          </div>
          
          {filteredAssessments.length === 0 ? (
            <div className="text-center py-12">
              <UserRound className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {searchTerm ? (
                <p className="text-gray-400">Nenhum paciente encontrado com este termo de busca.</p>
              ) : (
                <>
                  <p className="text-gray-400 mb-2">Você ainda não tem pacientes cadastrados.</p>
                  <p className="text-gray-400 mb-4">Comece criando uma nova avaliação clínica.</p>
                  <Button 
                    onClick={() => navigate('/medico/avaliacao')}
                    className="bg-gold-500 hover:bg-gold-600 text-black"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Avaliação
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-darkblue-700 overflow-hidden">
              <Table>
                <TableHeader className="bg-darkblue-800/50">
                  <TableRow>
                    <TableHead>Nome do Paciente</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Prontuário</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment) => (
                    <TableRow key={assessment.id} className="hover:bg-darkblue-800/30">
                      <TableCell className="font-medium">{assessment.patient_name}</TableCell>
                      <TableCell className="hidden md:table-cell">{assessment.patient_email}</TableCell>
                      <TableCell className="hidden md:table-cell">{assessment.prontuario_id}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(assessment.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/medico/pacientes/${assessment.id}`}>
                          <Button variant="outline" size="sm" className="border-darkblue-700 hover:bg-darkblue-800">
                            <FileText className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Ver</span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Card>
    </Layout>
  );
};

export default DoctorPatients;
