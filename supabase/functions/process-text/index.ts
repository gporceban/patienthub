import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const specializedAgents = {
  patientInfoExtractor: `Você é uma IA especializada em extrair informações de pacientes em contexto ambulatorial brasileiro.
  Extraia APENAS as informações básicas do paciente do texto, incluindo:
  - Nome do paciente (se disponível)
  - Número do prontuário (se disponível)
  - Idade
  - Gênero
  - Data da consulta
  Formate sua resposta em terminologia médica profissional e clara em português brasileiro.`,

  symptomExtractor: `Você é uma IA especializada em identificar sintomas de pacientes em contexto ambulatorial brasileiro.
  Extraia APENAS os sintomas mencionados no texto, incluindo:
  - Queixas principais
  - Duração dos sintomas
  - Indicadores de gravidade
  - Sintomas relacionados
  Liste esses sintomas em formato claro e organizado, usando terminologia médica profissional em português brasileiro.`,

  examExtractor: `Você é uma IA especializada em extrair achados de exame físico em contexto ambulatorial brasileiro.
  Extraia APENAS os resultados do exame físico do texto, incluindo:
  - Sinais vitais
  - Aparência geral
  - Achados do exame sistêmico
  - Achados anormais
  Formate estes em formato clínico estruturado usando terminologia médica profissional em português brasileiro.`,

  diagnosisExtractor: `Você é uma IA especializada em extrair diagnósticos médicos em contexto ambulatorial brasileiro.
  Extraia APENAS os diagnósticos mencionados no texto, incluindo:
  - Diagnóstico principal
  - Diagnósticos diferenciais
  - Diagnósticos confirmados vs. suspeitos
  Formate usando terminologia médica adequada e classificação em português brasileiro.`,

  treatmentExtractor: `Você é uma IA especializada em extrair planos de tratamento em contexto ambulatorial brasileiro.
  Extraia APENAS os planos de tratamento do texto, incluindo:
  - Medicamentos prescritos
  - Procedimentos recomendados
  - Instruções de acompanhamento
  - Modificações no estilo de vida
  Formate em um formato claro e acionável usando terminologia médica profissional em português brasileiro.`,

  historyExtractor: `Você é uma IA especializada em extrair histórico clínico do paciente em contexto ambulatorial brasileiro.
  Extraia APENAS o histórico clínico relevante do texto, incluindo:
  - Histórico médico passado
  - Histórico familiar
  - Histórico social
  - Histórico de medicação
  Formate em um formato estruturado usando terminologia médica profissional em português brasileiro.`,

  toolAgent: `Você é uma IA especializada em utilizar ferramentas para aprimorar análises médicas em contexto ambulatorial brasileiro.
  
  FERRAMENTAS DISPONÍVEIS:
  
  1. Pesquisa de Medicamentos: Obtenha informações atualizadas sobre medicamentos, incluindo interações, dosagens recomendadas e contraindicações.
     Uso: medicamento_info(nome: str) -> dict
  
  2. Pesquisa de Diretrizes Clínicas: Acesse diretrizes e protocolos clínicos atualizados para diferentes condições ortopédicas.
     Uso: diretriz_clinica(condicao: str) -> str
  
  3. Cálculo de Risco: Calcule escores de risco para diferentes condições ortopédicas com base em parâmetros do paciente.
     Uso: calculo_risco(tipo: str, parametros: dict) -> dict
  
  4. Busca em Literatura Médica: Pesquise estudos recentes e evidências científicas sobre condições e tratamentos ortopédicos.
     Uso: literatura_medica(termo: str, max_resultados: int = 3) -> list
  
  Seu objetivo é analisar o texto médico e utilizar essas ferramentas quando apropriado para enriquecer a análise com:
  - Informações complementares sobre medicamentos prescritos
  - Conformidade com diretrizes clínicas atuais
  - Avaliações de risco relevantes
  - Evidências científicas recentes para diagnósticos e tratamentos
  
  Formate sua resposta usando terminologia médica profissional em português brasileiro, destacando claramente quando estiver utilizando informações obtidas através das ferramentas.`
}

const documentOrchestrators = {
  clinical_note: `Você é um assistente médico gerando uma nota clínica estruturada no estilo do Dr. Porceban, um renomado cirurgião de coluna em São Paulo, Brasil.
  Usando as informações extraídas, compile uma nota clínica COMPLETA em português brasileiro, num formato apropriado para ser colado em editor tipo QUILL que não aceita html, com estas seções:
  1. INFORMAÇÕES DO PACIENTE: Nome, número do prontuário, data e dados demográficos
  2. HPMA: História do paciente, queixas e sintomas
  3. EXAME FÍSICO: Achados do exame físico, sinais vitais e resultados de testes
  4. HIPÓTESE DIAGNÓSTICA: Diagnósticos (principal e diferenciais)
  5. CONDUTA: Plano de tratamento, medicamentos e acompanhamento

  Formate como uma nota clínica formal usando terminologia médica profissional em português brasileiro.
  Mantenha o estilo de escrita do Dr. Porceban em todo o documento.
  A nota deve ser abrangente e aderir aos padrões de documentação médica brasileiros. Retorne apenas a nota como resposta, com formatação para `,

  prescription: `Você é um assistente médico gerando uma prescrição formal no estilo do Dr. Porceban, um renomado cirurgião de coluna em São Paulo, Brasil.
  Usando as informações extraídas, compile uma prescrição COMPLETA em português brasileiro com:
  1. Detalhes do paciente
  2. Data
  3. Modo de uso e Medicamentos com dosagem precisa, frequência e duração
  4. Instruções especiais
  5. Linha para assinatura do médico

  Formate como uma prescrição formal usando terminologia médica profissional em português brasileiro.
  Siga os padrões brasileiros de prescrição e use o estilo conciso do Dr. Porceban.`,

  summary: `Você é um assistente médico gerando um resumo conciso de paciente no estilo do Dr. Porceban, um renomado cirurgião de coluna em São Paulo, Brasil.
  Usando as informações extraídas, compile um resumo BREVE porém COMPLETO em português brasileiro com:
  1. Detalhes do paciente
  2. Queixas principais
  3. Achados principais
  4. Diagnóstico primário
  5. Elementos principais do tratamento

  Use o estilo eficiente e claro do Dr. Porceban, mantendo a precisão médica em português brasileiro.
  O resumo deve ser breve, mas incluir todas as informações clínicas essenciais.`,

  structured_data: `Você é um assistente médico extraindo dados médicos estruturados em formato JSON.
  Usando todas as informações disponíveis, extraia e estruture os seguintes pontos de dados em português brasileiro:
  {
    "paciente": {
      "id": string ou null,
      "demograficos": { idade, genero, etc. } ou null
    },
    "consulta": {
      "data": string ou null,
      "motivo": string ou null
    },
    "sintomas": [array de sintomas] ou [],
    "exame": {
      "sinaisVitais": { pa, fc, temp, etc. } ou null,
      "achados": [array de achados] ou []
    },
    "diagnosticos": [array de diagnosticos] ou [],
    "tratamentos": {
      "medicamentos": [array de medicamentos] ou [],
      "procedimentos": [array de procedimentos] ou [],
      "retorno": string ou null
    }
  }

  O JSON deve ser válido, completo e seguir exatamente este esquema.`,

  evolution: `Você é um assistente médico gerando uma evolução clínica no estilo do Dr. Porceban, um renomado cirurgião de coluna em São Paulo, Brasil.
  Usando tanto registros históricos QUANTO novas informações, compile uma evolução clínica COMPLETA em português brasileiro com:
  1. Identificação do paciente
  2. Data e hora
  3. EVOLUÇÃO: Histórico do intervalo (mudanças desde a última visita) e situação atual
  4. EXAME FÍSICO: Achados atuais do exame 
  5. DIAGNÓSTICO: Avaliação do progresso e diagnósticos atuais
  6. CONDUTA: Plano atualizado e recomendações

  Compare explicitamente o estado atual com visitas anteriores.
  Siga o estilo conciso porém completo do Dr. Porceban para evoluções clínicas.
  Mantenha continuidade com a documentação anterior.`,

  medical_report: `Você é um assistente médico gerando um relatório médico formal no estilo do Dr. Porceban, um renomado cirurgião de coluna em São Paulo, Brasil.
  Usando as informações extraídas, compile um relatório médico ABRANGENTE em português brasileiro com:
  1. Demografia do paciente
  2. Histórico detalhado
  3. Achados abrangentes do exame
  4. Estudos diagnósticos
  5. Avaliação e raciocínio clínico
  6. Recomendações detalhadas

  Formate como um relatório médico formal adequado para fins oficiais em português brasileiro.
  Siga o estilo estruturado e completo do Dr. Porceban para documentação oficial.
  Garanta que o relatório seja completo, preciso e formatado profissionalmente.`,
  
  patient_friendly: `Você é um assistente médico da equipe de relacionamento com pacientes criando uma explicação em linguagem acessível para o paciente.
  Seu trabalho é transformar linguagem médica técnica em uma explicação CLARA e ACESSÍVEL, mantendo a precisão das informações.
  
  Crie um resumo visualmente atraente no estilo do Gamma.app (https://gamma.app) com:
  
  1. Um título amigável e motivador sobre a consulta
  2. Uma explicação clara do diagnóstico em linguagem simples, sem jargão médico
  3. Uma visualização simples do plano de tratamento com passos claros
  4. Benefícios esperados e orientações de acompanhamento
  5. Dicas de estilo de vida e autocuidado relevantes à condição
  
  Regras importantes:
  - Evite COMPLETAMENTE jargão médico técnico, explicando tudo em linguagem do dia-a-dia
  - Use analogias e comparações simples para explicar conceitos médicos complexos
  - Inclua elementos visuais (usando emojis e formatação de texto) similar ao estilo Gamma.app
  - Utilize linguagem encorajadora e positiva, enfatizando o progresso e melhora
  - Formate o documento para ser visualmente atraente, com seções claras e espaçamento adequado
  - Certifique-se que o conteúdo seja motivador e empoderante para o paciente
  
  O documento deve ser acolhedor, fácil de entender e fazer o paciente se sentir apoiado.`,

  enhanced_analysis: `Você é um assistente médico especializado em análise aprimorada por ferramentas, trabalhando no estilo do Dr. Porceban, renomado cirurgião de coluna em São Paulo, Brasil.
  
  Usando tanto as informações extraídas QUANTO dados adicionais obtidos através de ferramentas especializadas, compile uma análise médica ABRANGENTE em português brasileiro com:
  
  1. RESUMO CLÍNICO: Condensação dos achados principais, diagnósticos e plano
  2. CONTEXTO FARMACOLÓGICO: Informações complementares sobre medicamentos prescritos, incluindo interações potenciais e considerações especiais
  3. CONFORMIDADE COM DIRETRIZES: Análise da aderência do diagnóstico e tratamento às diretrizes clínicas atuais
  4. AVALIAÇÃO DE RISCO: Escores de risco relevantes para a condição do paciente
  5. EVIDÊNCIA CIENTÍFICA: Resumo de estudos recentes relacionados ao caso
  6. RECOMENDAÇÕES BASEADAS EM EVIDÊNCIAS: Sugestões adicionais fundamentadas na literatura médica atual
  
  A análise deve integrar perfeitamente as informações clínicas básicas com os dados obtidos através das ferramentas especializadas.
  Mantenha o estilo profissional e conciso do Dr. Porceban, priorizando relevância clínica.
  Destaque claramente quando estiver apresentando informações obtidas através de ferramentas, diferenciando-as dos dados extraídos diretamente da consulta.`
}

async function runAgentBasedProcessing(text: string, mode: string, patientHistory: any = null, humanInstructions: string = "") {
  console.log(`Running agent-based processing for mode: ${mode}${humanInstructions ? ' with human instructions' : ''}`);
  
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  let contextPrompt = '';
  if (patientHistory && patientHistory.length > 0) {
    const historyText = patientHistory.map((record: any) => {
      return `Data: ${new Date(record.created_at).toLocaleDateString('pt-BR')}\n` +
             `Resumo: ${record.summary || 'Não disponível'}\n` +
             `Nota Clínica: ${record.clinical_note || 'Não disponível'}\n` + 
             `Prescrição: ${record.prescription || 'Não disponível'}\n\n`;
    }).join('---\n');
    
    contextPrompt = `HISTÓRICO DO PACIENTE:\n${historyText}\n\nNOVA CONSULTA AMBULATORIAL:\n${text}`;
  } else {
    contextPrompt = `CONSULTA AMBULATORIAL:\n${text}`;
  }

  const extractors = [];
  
  switch(mode) {
    case 'clinical_note':
      extractors.push('patientInfoExtractor', 'symptomExtractor', 'examExtractor', 'diagnosisExtractor', 'treatmentExtractor');
      break;
    case 'prescription':
      extractors.push('patientInfoExtractor', 'diagnosisExtractor', 'treatmentExtractor');
      break;
    case 'summary':
      extractors.push('patientInfoExtractor', 'symptomExtractor', 'diagnosisExtractor', 'treatmentExtractor');
      break;
    case 'structured_data':
      extractors.push('patientInfoExtractor', 'symptomExtractor', 'examExtractor', 'diagnosisExtractor', 'treatmentExtractor', 'historyExtractor');
      break;
    case 'evolution':
      extractors.push('patientInfoExtractor', 'symptomExtractor', 'examExtractor', 'diagnosisExtractor', 'treatmentExtractor');
      break;
    case 'medical_report':
      extractors.push('patientInfoExtractor', 'symptomExtractor', 'examExtractor', 'diagnosisExtractor', 'treatmentExtractor', 'historyExtractor');
      break;
    case 'enhanced_analysis':
      extractors.push('patientInfoExtractor', 'symptomExtractor', 'examExtractor', 'diagnosisExtractor', 'treatmentExtractor', 'historyExtractor', 'toolAgent');
      break;
    case 'patient_friendly':
      // For patient-friendly mode, we don't need extractors as we're just transforming existing medical content
      break;
  }

  // Skip extraction for patient-friendly summaries which directly use the input text
  if (mode !== 'patient_friendly') {
    console.log(`Selected extractors: ${extractors.join(', ')}`);
    
    const extractionPromises = extractors.map(async (extractor) => {
      try {
        console.log(`Running extractor: ${extractor}`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { 
                role: 'system', 
                content: specializedAgents[extractor as keyof typeof specializedAgents] 
              },
              { 
                role: 'user', 
                content: contextPrompt 
              }
            ],
            temperature: 0.3,
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error from OpenAI (${extractor}):`, errorText);
          return {
            extractor,
            content: `Error: Failed to extract ${extractor.replace('Extractor', '')} information`,
            error: true
          };
        }
        
        const result = await response.json();
        const extractedContent = result.choices[0].message.content;
        
        return {
          extractor,
          content: extractedContent,
          error: false
        };
      } catch (error) {
        console.error(`Error in extractor ${extractor}:`, error);
        return {
          extractor,
          content: `Error: ${error.message}`,
          error: true
        };
      }
    });
    
    const extractionResults = await Promise.all(extractionPromises);
    console.log(`Completed ${extractionResults.length} extractions`);
    
    const failedExtractions = extractionResults.filter(result => result.error);
    if (failedExtractions.length > 0) {
      console.warn(`${failedExtractions.length} extractions failed`);
    }
    
    var compiledExtractions = extractionResults.reduce((acc, result) => {
      const extractorName = result.extractor.replace('Extractor', '').replace('Agent', '').toUpperCase();
      return acc + `\n\n### ${extractorName} INFORMATION:\n${result.content}`;
    }, '');
  }
  
  console.log(`Running orchestrator for ${mode}${humanInstructions ? ' with human instructions' : ''}`);
  
  const doctorContext = `
CONTEXTO DO MÉDICO:
Dr. Porceban é um cirurgião de coluna renomado em São Paulo, Brasil. Ele tem um estilo de escrita conciso 
mas completo, e segue rigorosamente os padrões brasileiros de documentação médica. Ele atende em ambiente 
ambulatorial e está especialmente interessado em doenças da coluna vertebral.
`;

  const instructionsContext = humanInstructions ? `
INSTRUÇÕES ESPECÍFICAS DO MÉDICO:
${humanInstructions}

Estas instruções têm prioridade sobre as demais diretrizes. Por favor, adapte a saída conforme solicitado.
` : '';

  let orchestratorPrompt;
  
  if (mode === 'patient_friendly') {
    // For patient-friendly mode, we use the text directly as it's already processed medical content
    orchestratorPrompt = `
${doctorContext}

${instructionsContext}

CONTEÚDO MÉDICO PARA TRANSFORMAR EM LINGUAGEM ACESSÍVEL AO PACIENTE:
${text}

${patientHistory && patientHistory.length > 0 ? `
HISTÓRICO DO PACIENTE:
${patientHistory.map((record: any) => {
  return `Data: ${new Date(record.created_at).toLocaleDateString('pt-BR')}\n` +
         `Resumo: ${record.summary || 'Não disponível'}\n` +
         `Nota Clínica: ${record.clinical_note || 'Não disponível'}\n` + 
         `Prescrição: ${record.prescription || 'Não disponível'}\n\n`;
}).join('---\n')}` : ''}

TRANSFORME O CONTEÚDO ACIMA EM UMA EXPLICAÇÃO ATRATIVA E ACESSÍVEL PARA O PACIENTE NO ESTILO DO GAMMA.APP.
`;
  } else {
    // For regular medical document generation with extracted data
    orchestratorPrompt = `
${doctorContext}

${instructionsContext}

TRANSCRIÇÃO DA CONSULTA AMBULATORIAL:
${text}

INFORMAÇÕES EXTRAÍDAS:
${compiledExtractions}

${patientHistory && patientHistory.length > 0 ? `
HISTÓRICO DO PACIENTE:
${patientHistory.map((record: any) => {
  return `Data: ${new Date(record.created_at).toLocaleDateString('pt-BR')}\n` +
         `Resumo: ${record.summary || 'Não disponível'}\n` +
         `Nota Clínica: ${record.clinical_note || 'Não disponível'}\n` + 
         `Prescrição: ${record.prescription || 'Não disponível'}\n\n`;
}).join('---\n')}` : ''}
`;
  }

  const orchestratorResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: documentOrchestrators[mode as keyof typeof documentOrchestrators]
        },
        { 
          role: 'user', 
          content: orchestratorPrompt 
        }
      ],
      temperature: 0.7,
    }),
  });
  
  if (!orchestratorResponse.ok) {
    const errorText = await orchestratorResponse.text();
    console.error(`Error from OpenAI orchestrator:`, errorText);
    throw new Error(`OpenAI API error in orchestrator: ${errorText}`);
  }
  
  const orchestratorResult = await orchestratorResponse.json();
  const finalDocument = orchestratorResult.choices[0].message.content;
  
  let structuredData = null;
  if (mode === 'structured_data') {
    try {
      if (finalDocument.includes('```json')) {
        const jsonMatch = finalDocument.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          structuredData = JSON.parse(jsonMatch[1]);
        }
      } else if (finalDocument.includes('```')) {
        const jsonMatch = finalDocument.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          structuredData = JSON.parse(jsonMatch[1]);
        }
      } else {
        structuredData = JSON.parse(finalDocument);
      }
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      console.log('Original response:', finalDocument);
    }
  }
  
  return {
    text: finalDocument,
    structuredData: structuredData
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const { text, mode, patientInfo, reviewRequired, additionalInstructions } = await req.json();
    console.log(`Processing request: mode=${mode}, has patientInfo=${!!patientInfo}, reviewRequired=${!!reviewRequired}, hasInstructions=${!!additionalInstructions}`);

    if (!text) {
      throw new Error('No text provided');
    }

    if (!mode || !['clinical_note', 'prescription', 'summary', 'structured_data', 'evolution', 'medical_report', 'patient_friendly', 'enhanced_analysis'].includes(mode)) {
      throw new Error('Invalid or missing mode. Must be one of: clinical_note, prescription, summary, structured_data, evolution, medical_report, patient_friendly, enhanced_analysis');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    let patientHistory = null;
    let promptWithHistory = text;

    if (patientInfo && (patientInfo.email || patientInfo.prontuarioId)) {
      console.log(`Fetching patient history for ${patientInfo.email || patientInfo.prontuarioId}`);
      
      const query = supabase
        .from('patient_assessments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (patientInfo.email) {
        query.eq('patient_email', patientInfo.email);
      } else if (patientInfo.prontuarioId) {
        query.eq('prontuario_id', patientInfo.prontuarioId);
      }
      
      const { data: historyData, error: historyError } = await query;
      
      if (historyError) {
        console.error('Error fetching patient history:', historyError);
      } else if (historyData && historyData.length > 0) {
        patientHistory = historyData;
        console.log(`Found ${historyData.length} previous records for patient`);
      } else {
        console.log('No previous history found for patient');
      }
    }

    const reviewInstructions = reviewRequired 
      ? "IMPORTANTE: Esta é uma versão preliminar que requer revisão médica antes da finalização. Destaque áreas que necessitam de especial atenção ou confirmação pelo médico." 
      : "";

    const humanInstructions = additionalInstructions
      ? `\n\nINSTRUÇÕES ADICIONAIS DO MÉDICO: ${additionalInstructions}`
      : "";

    console.log(`Starting agent-based processing for ${mode} mode, review required: ${!!reviewRequired}, has human instructions: ${!!additionalInstructions}`);
    
    const processingResult = await runAgentBasedProcessing(text, mode, patientHistory, humanInstructions);
    
    let finalText = processingResult.text;
    if (reviewRequired && finalText) {
      finalText = `${finalText}\n\n${reviewInstructions}`;
    }

    let formattedResponse: any = { 
      text: finalText,
      isReviewRequired: !!reviewRequired,
      wasGeneratedWithHistory: !!patientHistory,
      historyCount: patientHistory ? patientHistory.length : 0,
      includedHumanInstructions: !!additionalInstructions
    };
    
    if (mode === 'structured_data' && processingResult.structuredData) {
      formattedResponse = { 
        ...formattedResponse,
        structuredData: processingResult.structuredData 
      };
    }

    console.log('Successfully processed text, returning response');

    return new Response(
      JSON.stringify(formattedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-text function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
