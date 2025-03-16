
import React, { useState, useEffect, useContext } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save } from 'lucide-react';
import { DoctorProfile as DoctorProfileType, fromDoctors } from '@/types/doctorProfile';

const DoctorProfile = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [biography, setBiography] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<DoctorProfileType | null>(null);
  
  // Fetch doctor profile
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await fromDoctors(supabase)
          .select()
          .eq('id', user.id)
          .maybeSingle();
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setProfile(data as DoctorProfileType);
          setLicenseNumber(data.license_number || '');
          setSpecialty(data.specialty || '');
          setBiography(data.biography || '');
        }
      } catch (error) {
        console.error('Error fetching doctor profile:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar perfil",
          description: "Não foi possível carregar os dados do seu perfil. Tente novamente mais tarde."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDoctorProfile();
  }, [user, toast]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      const profileData = {
        license_number: licenseNumber,
        specialty: specialty,
        biography: biography
      };
      
      let response;
      
      if (profile) {
        // Update existing profile
        response = await fromDoctors(supabase)
          .update(profileData, user.id);
      } else {
        // Create new profile
        response = await fromDoctors(supabase)
          .insert({ id: user.id, ...profileData });
      }
      
      if (response.error) {
        throw response.error;
      }
      
      toast({
        title: "Perfil salvo com sucesso",
        description: "Suas informações foram atualizadas."
      });
      
      // Update local state
      setProfile({
        id: user.id,
        license_number: licenseNumber,
        specialty: specialty,
        biography: biography
      });
      
    } catch (error) {
      console.error('Error saving doctor profile:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar perfil",
        description: "Não foi possível salvar as alterações. Tente novamente mais tarde."
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Layout userType="medico">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Meu Perfil Médico</h1>
        <p className="text-gray-400">
          Atualize suas informações profissionais
        </p>
      </div>
      
      <Card className="card-gradient p-6 max-w-2xl">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license">Número de Registro (CRM)</Label>
                  <Input
                    id="license"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="Ex: CRM/SP 123456"
                    className="bg-darkblue-800/50 border-darkblue-700"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="specialty">Especialidade</Label>
                  <Input
                    id="specialty"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Ex: Ortopedia e Traumatologia"
                    className="bg-darkblue-800/50 border-darkblue-700"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="biography">Biografia Profissional</Label>
                <Textarea
                  id="biography"
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  placeholder="Descreva sua formação, experiência e áreas de atuação..."
                  className="h-40 bg-darkblue-800/50 border-darkblue-700"
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={isSaving}
              className="bg-gold-500 hover:bg-gold-600 text-black"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Salvar Perfil
                </>
              )}
            </Button>
          </form>
        )}
      </Card>
    </Layout>
  );
};

export default DoctorProfile;
