
import React from 'react';
import Layout from '@/components/Layout';
import { PatientInvitation } from '@/components/PatientInvitation';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const DoctorCreateTestPatient = () => {
  return (
    <Layout userType="medico">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Criar Paciente de Teste</h1>
        <p className="text-gray-400">
          Crie uma conta de paciente de teste vinculada ao Dr. Guilherme Porceban
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <PatientInvitation 
            patientName="Paciente de Teste" 
            patientEmail="teste@orthocaremosaic.com"
          />
        </div>
        
        <div className="md:col-span-1">
          <Card className="bg-darkblue-800/50 p-6 h-full">
            <h3 className="text-lg font-semibold mb-4 text-gold-400">Instruções</h3>
            
            <Alert className="bg-darkblue-900/60 border-gold-800/50 mb-4">
              <Info className="h-4 w-4 text-gold-400" />
              <AlertTitle className="text-gold-400">Conta de Teste</AlertTitle>
              <AlertDescription className="text-sm">
                Esta página cria um paciente de teste vinculado automaticamente ao 
                Dr. Guilherme Porceban (gporceban@gmail.com).
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">1. Enviar Convite</h4>
                <p className="text-sm text-gray-400">
                  Preencha o formulário e clique em "Enviar Convite". Isto criará um prontuário
                  para o paciente no sistema.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">2. Anote o Código do Prontuário</h4>
                <p className="text-sm text-gray-400">
                  Um código de prontuário será gerado (formato ORTHO-XXXX). 
                  Guarde este código pois será necessário para cadastrar o paciente.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">3. Criar Conta do Paciente</h4>
                <p className="text-sm text-gray-400">
                  Na página inicial, crie uma nova conta como paciente, 
                  usando o email e o código de prontuário fornecidos no passo anterior.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default DoctorCreateTestPatient;
