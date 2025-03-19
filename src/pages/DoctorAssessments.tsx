
import React, { useContext, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { AuthContext } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const DoctorAssessments = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchAssessments = async () => {
      try {
        const { data, error } = await supabase
          .from('assessments')
          .select(`
            *,
            patients:patient_id (id, full_name, email)
          `)
          .eq('doctor_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAssessments(data || []);
        setFilteredAssessments(data || []);
      } catch (error) {
        console.error('Error fetching assessments:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar avaliações",
          description: "Não foi possível carregar as avaliações. Tente novamente."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, [user, toast]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAssessments(assessments);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = assessments.filter(
      (assessment) => 
        assessment.patients?.full_name?.toLowerCase().includes(query) ||
        assessment.title?.toLowerCase().includes(query) ||
        assessment.description?.toLowerCase().includes(query)
    );
    
    setFilteredAssessments(filtered);
  }, [searchQuery, assessments]);

  const handleCreateAssessment = () => {
    navigate('/medico/avaliacao/novo');
  };

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gold-400 mb-4 md:mb-0">Avaliações dos Pacientes</h1>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar avaliações..."
                className="pl-8 bg-darkblue-800 border-darkblue-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={handleCreateAssessment}
              className="bg-gold-500 text-black hover:bg-gold-600"
            >
              Nova Avaliação
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          </div>
        ) : filteredAssessments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssessments.map((assessment) => (
              <Card key={assessment.id} className="card-gradient p-4">
                <div className="mb-2">
                  <h3 className="text-lg font-medium text-gold-400">{assessment.title || 'Avaliação'}</h3>
                  <p className="text-sm text-gray-400">
                    Paciente: {assessment.patients?.full_name || 'Desconhecido'}
                  </p>
                  <p className="text-sm text-gray-400">
                    Data: {new Date(assessment.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <p className="mb-4 text-gray-300 line-clamp-2">
                  {assessment.description || 'Sem descrição'}
                </p>
                <Button 
                  onClick={() => navigate(`/medico/avaliacao/${assessment.id}`)}
                  variant="outline"
                  className="w-full border-gold-500 text-gold-400 hover:bg-gold-500 hover:text-black"
                >
                  Ver/Editar
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-8">
            <p className="text-lg text-gray-400 mb-4">
              {searchQuery ? 'Nenhuma avaliação encontrada para esta busca.' : 'Nenhuma avaliação registrada.'}
            </p>
            
            {!searchQuery && (
              <Button 
                onClick={handleCreateAssessment}
                className="bg-gold-500 text-black hover:bg-gold-600"
              >
                Criar Primeira Avaliação
              </Button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DoctorAssessments;
