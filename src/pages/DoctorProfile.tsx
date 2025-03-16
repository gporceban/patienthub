
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AuthContext } from '@/App';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, UserCog } from 'lucide-react';

interface DoctorProfile {
  id: string;
  license_number: string;
  specialty: string;
  biography: string | null;
}

const DoctorProfile = () => {
  const { user, profile } = useContext(AuthContext);
  const navigate = useNavigate();
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    license_number: '',
    specialty: '',
    biography: '',
  });

  // Redirect if not logged in or not a doctor
  useEffect(() => {
    if (!user || profile?.user_type !== 'medico') {
      navigate('/');
    }
  }, [user, profile, navigate]);

  // Fetch doctor profile data
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          // If the doctor profile doesn't exist yet, we'll handle this case
          console.log('Error fetching doctor profile:', error);
          if (error.code === 'PGRST116') {
            // This is the error code when no rows are returned by .single()
            // We'll just set the doctorProfile to null
            setDoctorProfile(null);
          } else {
            toast({
              variant: "destructive",
              title: "Erro ao carregar perfil",
              description: error.message,
            });
          }
        } else {
          setDoctorProfile(data);
          // Initialize form with doctor data
          setFormData({
            license_number: data.license_number || '',
            specialty: data.specialty || '',
            biography: data.biography || '',
          });
        }
      } catch (error: any) {
        console.error('Error fetching doctor profile:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar perfil",
          description: "Não foi possível carregar o perfil do médico.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctorProfile();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setIsSaving(true);
    
    try {
      if (doctorProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('doctors')
          .update({
            license_number: formData.license_number,
            specialty: formData.specialty,
            biography: formData.biography,
          })
          .eq('id', user.id);
          
        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('doctors')
          .insert({
            id: user.id,
            license_number: formData.license_number,
            specialty: formData.specialty,
            biography: formData.biography,
          });
          
        if (error) throw error;
        
        // Update local state with new profile
        setDoctorProfile({
          id: user.id,
          license_number: formData.license_number,
          specialty: formData.specialty,
          biography: formData.biography,
        });
      }
      
      toast({
        title: "Perfil salvo com sucesso",
        description: "Suas informações foram atualizadas.",
      });
    } catch (error: any) {
      console.error('Error saving doctor profile:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar perfil",
        description: error.message || "Ocorreu um erro ao salvar as informações.",
      });
    } finally {
      setIsSaving(false);
    }
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
          Perfil do <span className="gold-text">Médico</span>
        </h1>
        <p className="text-gray-400">
          Atualize suas informações profissionais
        </p>
      </div>
      
      <Card className="card-gradient">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="license_number">Número de Registro (CRM)</Label>
                  <Input
                    id="license_number"
                    name="license_number"
                    placeholder="Número de CRM"
                    value={formData.license_number}
                    onChange={handleInputChange}
                    required
                    className="bg-darkblue-900/50 border-darkblue-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialty">Especialidade</Label>
                  <Input
                    id="specialty"
                    name="specialty"
                    placeholder="Ex: Ortopedia, Cirurgia da Coluna"
                    value={formData.specialty}
                    onChange={handleInputChange}
                    required
                    className="bg-darkblue-900/50 border-darkblue-700"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="biography">Biografia Profissional</Label>
                <Textarea
                  id="biography"
                  name="biography"
                  placeholder="Descreva sua formação, experiência e áreas de atuação..."
                  value={formData.biography || ''}
                  onChange={handleInputChange}
                  rows={5}
                  className="bg-darkblue-900/50 border-darkblue-700 resize-none"
                />
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gold-500 hover:bg-gold-600 text-black"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Perfil
                </>
              )}
            </Button>
          </form>
        </div>
      </Card>
    </Layout>
  );
};

export default DoctorProfile;
