
import React, { useState, useEffect, useContext } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { AuthContext } from '@/App';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, FilePlus2, FilePen, Calendar, Clock, Download, 
  Search, Loader2, Upload, Filter, SortDesc 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock document types for initial implementation
const DOCUMENT_TYPES = [
  "Nota Clínica",
  "Receita",
  "Atestado",
  "Exame",
  "Relatório",
  "Outro"
];

// Document interface
interface Document {
  id: string;
  name: string;
  type: string;
  patient_name: string;
  patient_id: string;
  created_at: string;
  status?: string;
}

const DoctorDocuments = () => {
  const { user, profile } = useContext(AuthContext);
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Mock fetch documents - to be replaced with real data later
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Fetch patient assessments that contain documents
        const { data, error } = await supabase
          .from('patient_assessments')
          .select('id, patient_name, prontuario_id, created_at, clinical_note, prescription, summary')
          .eq('doctor_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        if (data) {
          // Transform patient assessments into documents
          const docs: Document[] = [];
          
          data.forEach(assessment => {
            if (assessment.clinical_note) {
              docs.push({
                id: `${assessment.id}-note`,
                name: "Nota Clínica",
                type: "Nota Clínica",
                patient_name: assessment.patient_name,
                patient_id: assessment.prontuario_id,
                created_at: assessment.created_at,
              });
            }
            
            if (assessment.prescription) {
              docs.push({
                id: `${assessment.id}-prescription`,
                name: "Receita",
                type: "Receita",
                patient_name: assessment.patient_name,
                patient_id: assessment.prontuario_id,
                created_at: assessment.created_at,
              });
            }
            
            if (assessment.summary) {
              docs.push({
                id: `${assessment.id}-summary`,
                name: "Resumo",
                type: "Resumo",
                patient_name: assessment.patient_name,
                patient_id: assessment.prontuario_id,
                created_at: assessment.created_at,
              });
            }
          });
          
          setDocuments(docs);
          setFilteredDocuments(docs);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar documentos",
          description: "Não foi possível carregar a lista de documentos. Tente novamente mais tarde."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocuments();
  }, [user, toast]);
  
  // Filter documents based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = documents.filter(
      doc => 
        doc.name.toLowerCase().includes(query) ||
        doc.patient_name.toLowerCase().includes(query) ||
        doc.type.toLowerCase().includes(query) ||
        doc.patient_id.toLowerCase().includes(query)
    );
    
    setFilteredDocuments(filtered);
  }, [searchQuery, documents]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setIsUploading(true);
      
      // Mock document creation logic
      // In a real implementation, this would upload to Supabase storage
      setTimeout(() => {
        toast({
          title: "Documento carregado",
          description: "O documento foi carregado com sucesso."
        });
        setIsUploading(false);
      }, 1500);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar documento",
        description: "Não foi possível carregar o documento. Tente novamente mais tarde."
      });
      setIsUploading(false);
    }
  };
  
  const handleDownload = (doc: Document) => {
    toast({
      title: "Download iniciado",
      description: `Baixando ${doc.name} para o paciente ${doc.patient_name}.`
    });
  };
  
  return (
    <Layout userType="medico">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Documentos Médicos</h1>
        <p className="text-gray-400">
          Gerencie os documentos de seus pacientes
        </p>
      </div>
      
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="search"
            placeholder="Buscar por nome, tipo ou paciente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-darkblue-800/50 border-darkblue-700"
          />
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-darkblue-700">
                <Filter size={16} className="mr-2" />
                Filtrar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Todos os documentos</DropdownMenuItem>
              <DropdownMenuItem>Criados hoje</DropdownMenuItem>
              <DropdownMenuItem>Criados nesta semana</DropdownMenuItem>
              <DropdownMenuItem>Notas clínicas</DropdownMenuItem>
              <DropdownMenuItem>Receitas</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-darkblue-700">
                <SortDesc size={16} className="mr-2" />
                Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Mais recentes primeiro</DropdownMenuItem>
              <DropdownMenuItem>Mais antigos primeiro</DropdownMenuItem>
              <DropdownMenuItem>Nome (A-Z)</DropdownMenuItem>
              <DropdownMenuItem>Nome (Z-A)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            className="bg-gold-500 hover:bg-gold-600 text-black relative"
            disabled={isUploading}
          >
            <Upload size={16} className="mr-2" />
            {isUploading ? 'Enviando...' : 'Enviar Documento'}
            <Input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
            />
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 bg-darkblue-800/50">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="clinical">Notas Clínicas</TabsTrigger>
          <TabsTrigger value="prescriptions">Receitas</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="certificates">Atestados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card className="card-gradient p-8 text-center">
              <h3 className="text-xl font-medium mb-2">Nenhum documento encontrado</h3>
              {searchQuery ? (
                <p className="text-gray-400">Nenhum resultado para "{searchQuery}". Tente outra busca ou crie um novo documento.</p>
              ) : (
                <p className="text-gray-400">Você ainda não possui nenhum documento. Clique em "Enviar Documento" para começar.</p>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="card-gradient p-4 hover:bg-darkblue-800/50 transition-colors">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-darkblue-700 rounded-full p-3">
                        {doc.type === "Nota Clínica" && <FileText className="h-6 w-6 text-gold-500" />}
                        {doc.type === "Receita" && <FilePen className="h-6 w-6 text-gold-500" />}
                        {doc.type === "Resumo" && <FilePlus2 className="h-6 w-6 text-gold-500" />}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold">{doc.name}</h3>
                        <p className="text-sm text-gray-400">Paciente: {doc.patient_name}</p>
                        <p className="text-sm text-gray-400">ID: {doc.patient_id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      className="ml-auto md:ml-0"
                    >
                      <Download size={14} className="mr-2" />
                      Baixar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="clinical">
          {/* Filtered view for clinical notes */}
          <div className="grid grid-cols-1 gap-4">
            {filteredDocuments
              .filter(doc => doc.type === "Nota Clínica")
              .map((doc) => (
                <Card key={doc.id} className="card-gradient p-4 hover:bg-darkblue-800/50 transition-colors">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-darkblue-700 rounded-full p-3">
                        <FileText className="h-6 w-6 text-gold-500" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold">{doc.name}</h3>
                        <p className="text-sm text-gray-400">Paciente: {doc.patient_name}</p>
                        <p className="text-sm text-gray-400">ID: {doc.patient_id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      className="ml-auto md:ml-0"
                    >
                      <Download size={14} className="mr-2" />
                      Baixar
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </TabsContent>
        
        {/* Similar TabsContent for other document types */}
        <TabsContent value="prescriptions">
          {/* Content for prescriptions tab */}
          <div className="grid grid-cols-1 gap-4">
            {filteredDocuments
              .filter(doc => doc.type === "Receita")
              .map((doc) => (
                <Card key={doc.id} className="card-gradient p-4 hover:bg-darkblue-800/50 transition-colors">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-darkblue-700 rounded-full p-3">
                        <FilePen className="h-6 w-6 text-gold-500" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold">{doc.name}</h3>
                        <p className="text-sm text-gray-400">Paciente: {doc.patient_name}</p>
                        <p className="text-sm text-gray-400">ID: {doc.patient_id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      className="ml-auto md:ml-0"
                    >
                      <Download size={14} className="mr-2" />
                      Baixar
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </TabsContent>
        
        <TabsContent value="reports">
          {/* Content for reports tab */}
          <div className="grid grid-cols-1 gap-4">
            {filteredDocuments
              .filter(doc => doc.type === "Resumo")
              .map((doc) => (
                <Card key={doc.id} className="card-gradient p-4 hover:bg-darkblue-800/50 transition-colors">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-darkblue-700 rounded-full p-3">
                        <FilePlus2 className="h-6 w-6 text-gold-500" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold">{doc.name}</h3>
                        <p className="text-sm text-gray-400">Paciente: {doc.patient_name}</p>
                        <p className="text-sm text-gray-400">ID: {doc.patient_id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      className="ml-auto md:ml-0"
                    >
                      <Download size={14} className="mr-2" />
                      Baixar
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </TabsContent>
        
        <TabsContent value="certificates">
          <Card className="card-gradient p-8 text-center">
            <h3 className="text-xl font-medium mb-2">Nenhum atestado encontrado</h3>
            <p className="text-gray-400">Você ainda não possui nenhum atestado. Clique em "Enviar Documento" para adicionar.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default DoctorDocuments;
