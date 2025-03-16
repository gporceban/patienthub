
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, TableHeader, TableBody, TableRow, 
  TableHead, TableCell 
} from '@/components/ui/table';
import { 
  FileText, Search, Download, ArrowUpDown, 
  Upload, Eye, File, FilePlus, Calendar 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PatientRecords = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock data
  const assessments = [
    { 
      id: 1, 
      date: '10/10/2023', 
      doctor: 'Dr. Paulo Oliveira', 
      title: 'Avaliação Inicial',
      type: 'Avaliação Completa' 
    },
    { 
      id: 2, 
      date: '25/10/2023', 
      doctor: 'Dra. Ana Medeiros', 
      title: 'Consulta de Rotina',
      type: 'Consulta de Retorno' 
    },
    { 
      id: 3, 
      date: '15/11/2023', 
      doctor: 'Dr. Paulo Oliveira', 
      title: 'Avaliação de Progresso',
      type: 'Avaliação Completa' 
    },
  ];
  
  const documents = [
    { 
      id: 1, 
      name: 'Resultado de Raio-X.pdf', 
      date: '12/10/2023', 
      size: '2.4 MB',
      type: 'Exame' 
    },
    { 
      id: 2, 
      name: 'Receita Médica.pdf', 
      date: '25/10/2023', 
      size: '1.1 MB',
      type: 'Receita' 
    },
    { 
      id: 3, 
      name: 'Programa de Exercícios.pdf', 
      date: '15/11/2023', 
      size: '3.7 MB',
      type: 'Tratamento' 
    },
  ];
  
  const prescriptions = [
    { 
      id: 1, 
      date: '10/10/2023', 
      doctor: 'Dr. Paulo Oliveira', 
      medications: 'Ibuprofeno 600mg, Paracetamol 750mg',
      duration: '7 dias' 
    },
    { 
      id: 2, 
      date: '25/10/2023', 
      doctor: 'Dra. Ana Medeiros', 
      medications: 'Diclofenaco 50mg',
      duration: '5 dias' 
    },
  ];
  
  // Filter function for search
  const filterItems = (items, query) => {
    if (!query) return items;
    
    return items.filter(item => {
      return Object.values(item).some(
        value => value && value.toString().toLowerCase().includes(query.toLowerCase())
      );
    });
  };
  
  const filteredAssessments = filterItems(assessments, searchQuery);
  const filteredDocuments = filterItems(documents, searchQuery);
  const filteredPrescriptions = filterItems(prescriptions, searchQuery);
  
  return (
    <Layout userType="paciente">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          Meu Prontuário
        </h1>
        <p className="text-gray-400">
          Seus registros médicos, documentos e receitas
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="search"
            placeholder="Buscar registros, documentos, receitas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-darkblue-800/50 border-darkblue-700"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="border-darkblue-700 hover:bg-darkblue-800 flex-1 md:flex-none"
          >
            <Download size={16} className="mr-2" />
            Exportar
          </Button>
          <Button 
            className="bg-gold-500 hover:bg-gold-600 text-black flex-1 md:flex-none"
          >
            <Upload size={16} className="mr-2" />
            Enviar Documento
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="assessments" className="w-full">
        <TabsList className="bg-darkblue-800 border border-darkblue-700 mb-6">
          <TabsTrigger 
            value="assessments"
            className="data-[state=active]:bg-darkblue-700 data-[state=active]:text-gold-400"
          >
            <FileText size={16} className="mr-2" />
            Avaliações
          </TabsTrigger>
          <TabsTrigger 
            value="documents"
            className="data-[state=active]:bg-darkblue-700 data-[state=active]:text-gold-400"
          >
            <File size={16} className="mr-2" />
            Documentos
          </TabsTrigger>
          <TabsTrigger 
            value="prescriptions"
            className="data-[state=active]:bg-darkblue-700 data-[state=active]:text-gold-400"
          >
            <FilePlus size={16} className="mr-2" />
            Receitas
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="assessments">
          <Card className="card-gradient">
            <div className="p-6">
              <div className="rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-darkblue-800/50">
                    <TableRow className="hover:bg-darkblue-700/50 border-darkblue-700">
                      <TableHead className="text-gold-400">
                        <div className="flex items-center">
                          Data
                          <ArrowUpDown size={14} className="ml-1" />
                        </div>
                      </TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssessments.length > 0 ? (
                      filteredAssessments.map((assessment) => (
                        <TableRow key={assessment.id} className="hover:bg-darkblue-700/30 border-darkblue-700/50">
                          <TableCell className="font-medium">{assessment.date}</TableCell>
                          <TableCell>{assessment.title}</TableCell>
                          <TableCell>{assessment.type}</TableCell>
                          <TableCell>{assessment.doctor}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-gold-400 hover:text-gold-300 hover:bg-darkblue-700"
                              >
                                <Eye size={16} />
                                <span className="sr-only">Visualizar</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-darkblue-700"
                              >
                                <Download size={16} />
                                <span className="sr-only">Baixar</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <FileText size={32} className="mb-2" />
                            <p>Nenhuma avaliação encontrada</p>
                            {searchQuery && (
                              <p className="text-sm mt-1">Tente outros termos de busca</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents">
          <Card className="card-gradient">
            <div className="p-6">
              <div className="rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-darkblue-800/50">
                    <TableRow className="hover:bg-darkblue-700/50 border-darkblue-700">
                      <TableHead className="text-gold-400">
                        <div className="flex items-center">
                          Nome do Arquivo
                          <ArrowUpDown size={14} className="ml-1" />
                        </div>
                      </TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.length > 0 ? (
                      filteredDocuments.map((document) => (
                        <TableRow key={document.id} className="hover:bg-darkblue-700/30 border-darkblue-700/50">
                          <TableCell className="font-medium">{document.name}</TableCell>
                          <TableCell>{document.type}</TableCell>
                          <TableCell>{document.date}</TableCell>
                          <TableCell>{document.size}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-gold-400 hover:text-gold-300 hover:bg-darkblue-700"
                              >
                                <Eye size={16} />
                                <span className="sr-only">Visualizar</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-darkblue-700"
                              >
                                <Download size={16} />
                                <span className="sr-only">Baixar</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <File size={32} className="mb-2" />
                            <p>Nenhum documento encontrado</p>
                            {searchQuery && (
                              <p className="text-sm mt-1">Tente outros termos de busca</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="prescriptions">
          <Card className="card-gradient">
            <div className="p-6">
              <div className="rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-darkblue-800/50">
                    <TableRow className="hover:bg-darkblue-700/50 border-darkblue-700">
                      <TableHead className="text-gold-400">
                        <div className="flex items-center">
                          Data
                          <ArrowUpDown size={14} className="ml-1" />
                        </div>
                      </TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead>Medicamentos</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPrescriptions.length > 0 ? (
                      filteredPrescriptions.map((prescription) => (
                        <TableRow key={prescription.id} className="hover:bg-darkblue-700/30 border-darkblue-700/50">
                          <TableCell className="font-medium">{prescription.date}</TableCell>
                          <TableCell>{prescription.doctor}</TableCell>
                          <TableCell>{prescription.medications}</TableCell>
                          <TableCell>{prescription.duration}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-gold-400 hover:text-gold-300 hover:bg-darkblue-700"
                              >
                                <Eye size={16} />
                                <span className="sr-only">Visualizar</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-darkblue-700"
                              >
                                <Download size={16} />
                                <span className="sr-only">Baixar</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center text-gray-400">
                            <FilePlus size={32} className="mb-2" />
                            <p>Nenhuma receita encontrada</p>
                            {searchQuery && (
                              <p className="text-sm mt-1">Tente outros termos de busca</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default PatientRecords;
