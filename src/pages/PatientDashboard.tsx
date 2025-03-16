
import React from 'react';
import Layout from '@/components/Layout';
import DashboardCard from '@/components/DashboardCard';
import AppointmentCard from '@/components/AppointmentCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, Clock, FileText, Plus, CheckCircle, ArrowRight } from 'lucide-react';

const PatientDashboard = () => {
  const userName = "Maria Silva";
  
  return (
    <Layout userType="paciente" userName={userName}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Bem-vinda, <span className="gold-text">{userName}</span>
        </h1>
        <p className="text-gray-400">
          Confira suas atividades e consultas
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <DashboardCard 
          title="Próxima Consulta" 
          value="28 Nov" 
          icon={Calendar} 
        />
        <DashboardCard 
          title="Total de Consultas" 
          value="8" 
          icon={CheckCircle} 
          color="gold"
        />
        <DashboardCard 
          title="Dias até Revisão" 
          value="14" 
          icon={Clock} 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="card-gradient mb-6">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Próximas Consultas</h2>
                <Button variant="ghost" className="text-gold-400 hover:text-gold-300">
                  Ver todas <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <AppointmentCard 
                  date="28 de Novembro, 2023"
                  time="14:30"
                  doctor="Dr. Paulo Oliveira"
                  location="Clínica Ortopédica Central - Sala 302"
                  status="upcoming"
                  userType="paciente"
                />
                
                <AppointmentCard 
                  date="15 de Dezembro, 2023"
                  time="10:00"
                  doctor="Dra. Ana Medeiros"
                  location="Hospital São Lucas - Ala B"
                  status="upcoming"
                  userType="paciente"
                />
                
                <AppointmentCard 
                  date="10 de Novembro, 2023"
                  time="09:15"
                  doctor="Dr. Paulo Oliveira"
                  location="Clínica Ortopédica Central - Sala 302"
                  status="completed"
                  userType="paciente"
                />
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button className="bg-darkblue-700 hover:bg-darkblue-800 text-white">
                  <Plus size={16} className="mr-2" />
                  Agendar Nova Consulta
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        <div>
          <Card className="card-gradient mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Notificações</h2>
              
              <div className="space-y-4">
                <div className="flex gap-3 p-3 rounded-lg bg-darkblue-800/50 border border-darkblue-700/30">
                  <div className="flex-shrink-0">
                    <Bell size={20} className="text-gold-400 mt-1" />
                  </div>
                  <div>
                    <p className="text-sm">Lembrete: Sua consulta com Dr. Paulo está marcada para amanhã às 14:30.</p>
                    <p className="text-xs text-gray-400 mt-1">Há 3 horas</p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 rounded-lg bg-darkblue-800/50 border border-darkblue-700/30">
                  <div className="flex-shrink-0">
                    <FileText size={20} className="text-gold-400 mt-1" />
                  </div>
                  <div>
                    <p className="text-sm">Seu relatório médico foi atualizado. Clique para visualizar.</p>
                    <p className="text-xs text-gray-400 mt-1">Ontem</p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 rounded-lg bg-darkblue-800/50 border border-darkblue-700/30">
                  <div className="flex-shrink-0">
                    <Bell size={20} className="text-gold-400 mt-1" />
                  </div>
                  <div>
                    <p className="text-sm">Dr. Paulo adicionou novos exercícios ao seu plano de tratamento.</p>
                    <p className="text-xs text-gray-400 mt-1">2 dias atrás</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button variant="outline" className="border-darkblue-700 w-full hover:bg-darkblue-800">
                  Ver Todas Notificações
                </Button>
              </div>
            </div>
          </Card>
          
          <Card className="card-gradient">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Progresso do Tratamento</h2>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Exercícios Realizados</span>
                    <span className="gold-text">75%</span>
                  </div>
                  <div className="w-full bg-darkblue-800 rounded-full h-2">
                    <div className="bg-gold-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Recuperação Estimada</span>
                    <span className="gold-text">60%</span>
                  </div>
                  <div className="w-full bg-darkblue-800 rounded-full h-2">
                    <div className="bg-gold-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button variant="outline" className="border-darkblue-700 w-full hover:bg-darkblue-800">
                  Ver Detalhes do Tratamento
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PatientDashboard;
