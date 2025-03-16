import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const DoctorAssessment = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [prontuarioId, setProntuarioId] = useState('');
  const [summary, setSummary] = useState('');
  const [clinicalNote, setClinicalNote] = useState('');
  const [prescription, setPrescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      const { data, error } = await supabase
        .from('patient_assessments')
        .insert([
          {
            id: uuidv4(),
            doctor_id: user.id,
            patient_name: patientName,
            patient_email: patientEmail,
            prontuario_id: prontuarioId,
            summary: summary,
            clinical_note: clinicalNote,
            prescription: prescription,
            created_at: new Date().toISOString(),
          },
        ]);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Avaliação salva com sucesso",
        description: "A avaliação do paciente foi salva com sucesso."
      });
      
      // Clear form fields
      setPatientName('');
      setPatientEmail('');
      setProntuarioId('');
      setSummary('');
      setClinicalNote('');
      setPrescription('');
      
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar avaliação",
        description: "Não foi possível salvar a avaliação do paciente. Tente novamente mais tarde."
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Layout userType="medico">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Nova Avaliação</h1>
        <p className="text-gray-400">
          Preencha os dados do paciente e a avaliação
        </p>
      </div>
      
      <Card className="card-gradient p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="patientName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                  Nome do Paciente
                </label>
                <Input
                  id="patientName"
                  placeholder="Nome completo do paciente"
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="bg-darkblue-800/50 border-darkblue-700"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="patientEmail" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                  Email do Paciente
                </label>
                <Input
                  id="patientEmail"
                  placeholder="Email do paciente"
                  type="email"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  className="bg-darkblue-800/50 border-darkblue-700"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="prontuarioId" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                ID do Prontuário
              </label>
              <Input
                id="prontuarioId"
                placeholder="ID do prontuário do paciente"
                type="text"
                value={prontuarioId}
                onChange={(e) => setProntuarioId(e.target.value)}
                className="bg-darkblue-800/50 border-darkblue-700"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="summary" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                Resumo da Avaliação
              </label>
              <Textarea
                id="summary"
                placeholder="Resumo da avaliação do paciente"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="h-24 bg-darkblue-800/50 border-darkblue-700"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="clinicalNote" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                Nota Clínica
              </label>
              <Textarea
                id="clinicalNote"
                placeholder="Nota clínica sobre o paciente"
                value={clinicalNote}
                onChange={(e) => setClinicalNote(e.target.value)}
                className="h-32 bg-darkblue-800/50 border-darkblue-700"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="prescription" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                Prescrição
              </label>
              <Textarea
                id="prescription"
                placeholder="Prescrição para o paciente"
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                className="h-32 bg-darkblue-800/50 border-darkblue-700"
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={isSaving}
            className="bg-gold-500 hover:bg-gold-600 text-black"
          >
            {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
          </Button>
        </form>
      </Card>
    </Layout>
  );
};

export default DoctorAssessment;
