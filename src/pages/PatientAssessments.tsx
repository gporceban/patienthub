
import React, { useContext, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { AuthContext } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const PatientAssessments = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAssessments = async () => {
      try {
        const { data, error } = await supabase
          .from('assessments')
          .select('*')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAssessments(data || []);
      } catch (error) {
        console.error('Error fetching assessments:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar avaliações",
          description: "Não foi possível carregar suas avaliações. Tente novamente."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, [user, toast]);

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-gold-400">Minhas Avaliações</h1>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
          </div>
        ) : assessments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((assessment) => (
              <Card key={assessment.id} className="card-gradient p-4">
                <div className="mb-2">
                  <h3 className="text-lg font-medium text-gold-400">{assessment.title || 'Avaliação'}</h3>
                  <p className="text-sm text-gray-400">
                    Data: {new Date(assessment.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <p className="mb-4 text-gray-300 line-clamp-2">
                  {assessment.description || 'Sem descrição'}
                </p>
                <Button 
                  onClick={() => navigate(`/avaliacao/${assessment.id}`)}
                  variant="outline"
                  className="w-full border-gold-500 text-gold-400 hover:bg-gold-500 hover:text-black"
                >
                  Ver Detalhes
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-8">
            <p className="text-lg text-gray-400 mb-4">Você ainda não tem avaliações registradas.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PatientAssessments;
