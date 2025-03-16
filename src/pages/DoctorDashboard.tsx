
import React from 'react';
import Layout from '@/components/Layout';
import DashboardCard from '@/components/DashboardCard';
import AppointmentCard from '@/components/AppointmentCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, LineChart, Plus, ArrowRight, BellRing, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const DoctorDashboard = () => {
  const doctorName = "Dr. Paulo Oliveira";
  
  return (
    <Layout userType="medico" userName={doctorName}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Bem-vindo, <span className="gold-text">{doctorName}</span>
        </h1>
        <p className="text-gray-400">
          Gerencie seus pacientes e consultas
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <DashboardCard 
          title="Pacientes Ativos" 
          value="42" 
          icon={Users} 
        />
        <DashboardCard 
          title="Consultas Hoje" 
          value="8" 
          icon={Calendar} 
          color="gold"
        />
        <DashboardCard 
          title="Total de Atendimentos" 
          value="156" 
          icon={LineChart} 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="card-gradient mb-6">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Agenda do Dia</h2>
                <Button variant="ghost" className="text-gold-400 hover:text-gold-300">
                  Ver agenda completa <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
              
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar paciente..." 
                    className="pl-10 bg-darkblue-900/50 border-darkblue-700"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <AppointmentCard 
                  date="Hoje"
                  time="14:30"
                  patient="Maria Silva"
                  location="Clínica Ortopédica Central - Sala 302"
                  status="upcoming"
                  userType="medico"
                />
                
                <AppointmentCard 
                  date="Hoje"
                  time="16:00"
                  patient="Carlos Mendes"
                  location="Clínica Ortopédica Central - Sala 302"
                  status="upcoming"
                  userType="medico"
                />
                
                <AppointmentCard 
                  date="Hoje"
                  time="10:15"
                  patient="Ana Oliveira"
                  location="Clínica Ortopédica Central - Sala 302"
                  status="completed"
                  userType="medico"
                />
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button className="bg-darkblue-700 hover:bg-darkblue-800 text-white">
                  <Plus size={16} className="mr-2" />
                  Adicionar Consulta
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
                    <BellRing size={20} className="text-gold-400 mt-1" />
                  </div>
                  <div>
                    <p className="text-sm">Nova solicitação de consulta de Rodrigo Alves.</p>
                    <p className="text-xs text-gray-400 mt-1">Há 30 minutos</p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 rounded-lg bg-darkblue-800/50 border border-darkblue-700/30">
                  <div className="flex-shrink-0">
                    <Calendar size={20} className="text-gold-400 mt-1" />
                  </div>
                  <div>
                    <p className="text-sm">Consulta com Maria Silva reagendada para 28/11.</p>
                    <p className="text-xs text-gray-400 mt-1">Há 2 horas</p>
                  </div>
                </div>
                
                <div className="flex gap-3 p-3 rounded-lg bg-darkblue-800/50 border border-darkblue-700/30">
                  <div className="flex-shrink-0">
                    <Users size={20} className="text-gold-400 mt-1" />
                  </div>
                  <div>
                    <p className="text-sm">Novo paciente cadastrado: João Pereira.</p>
                    <p className="text-xs text-gray-400 mt-1">Ontem</p>
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
              <h2 className="text-xl font-semibold mb-4">Pacientes Recentes</h2>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-darkblue-800/50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-darkblue-700 to-darkblue-900 flex items-center justify-center">
                    <span className="text-white font-medium">MS</span>
                  </div>
                  <div>
                    <p className="font-medium">Maria Silva</p>
                    <p className="text-xs text-gray-400">Consulta: Hoje, 14:30</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-darkblue-800/50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-darkblue-700 to-darkblue-900 flex items-center justify-center">
                    <span className="text-white font-medium">CM</span>
                  </div>
                  <div>
                    <p className="font-medium">Carlos Mendes</p>
                    <p className="text-xs text-gray-400">Consulta: Hoje, 16:00</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-darkblue-800/50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-darkblue-700 to-darkblue-900 flex items-center justify-center">
                    <span className="text-white font-medium">AO</span>
                  </div>
                  <div>
                    <p className="font-medium">Ana Oliveira</p>
                    <p className="text-xs text-gray-400">Última consulta: Hoje, 10:15</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-center">
                <Button variant="outline" className="border-darkblue-700 w-full hover:bg-darkblue-800">
                  Ver Todos os Pacientes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default DoctorDashboard;
