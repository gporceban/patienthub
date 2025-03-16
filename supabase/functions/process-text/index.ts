
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, mode, patientInfo, reviewRequired } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    if (!mode || !['clinical_note', 'prescription', 'summary', 'structured_data', 'evolution', 'medical_report'].includes(mode)) {
      throw new Error('Invalid or missing mode. Must be one of: clinical_note, prescription, summary, structured_data, evolution, medical_report');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch patient history if patient info is provided
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
        
        // Prepare history for prompt
        const historyText = historyData.map(record => {
          return `Data: ${new Date(record.created_at).toLocaleDateString('pt-BR')}\n` +
                 `Resumo: ${record.summary || 'Não disponível'}\n` +
                 `Nota Clínica: ${record.clinical_note || 'Não disponível'}\n` + 
                 `Prescrição: ${record.prescription || 'Não disponível'}\n\n`;
        }).join('---\n');
        
        promptWithHistory = `Histórico do Paciente:\n${historyText}\n\nNova Consulta:\n${text}`;
      } else {
        console.log('No previous history found for patient');
      }
    }

    // Different system prompts based on mode with Dr. Porceban style
    const systemPrompts = {
      clinical_note: "Você é um assistente médico especializado em criar notas clínicas detalhadas no estilo do Dr. Porceban. Formate a nota clínica de maneira estruturada com seções como: Dados do Paciente, Queixa Principal, História da Doença Atual, Exame Físico, Diagnósticos, Plano de Tratamento, e Recomendações. Mantenha um tom profissional e use terminologia médica apropriada. A nota deve ser escrita em português do Brasil.",
      prescription: "Você é um assistente médico especializado em criar receitas médicas no estilo do Dr. Porceban. Formate a receita de maneira clara com o nome do medicamento, dosagem, via de administração, frequência, duração do tratamento e quaisquer instruções especiais. A receita deve ser escrita em português do Brasil e seguir o formato padrão usado no Brasil, incluindo nome do paciente e data no topo.",
      summary: "Você é um assistente médico que cria resumos concisos de consultas no estilo do Dr. Porceban. Extraia apenas as informações mais importantes da transcrição e crie um resumo breve, estruturado e objetivo da consulta médica. Destaque os pontos principais da queixa, diagnóstico e plano de tratamento. O resumo deve ser escrito em português do Brasil.",
      structured_data: "Você é um assistente médico que extrai informações estruturadas de consultas médicas no estilo do Dr. Porceban. Analise o texto e extraia as seguintes informações em formato JSON: diagnósticos (array de strings), medicamentos prescritos (array de objetos com nome, dosagem, frequência), alergias (array de strings), sinais vitais (objeto com pressão arterial, frequência cardíaca, temperatura, etc), exames solicitados (array de strings) e recomendações (array de strings). Se alguma informação não estiver presente no texto, retorne um array ou objeto vazio para esse campo. Você DEVE retornar apenas um objeto JSON válido, sem texto adicional.",
      evolution: "Você é um assistente médico especializado em criar evoluções médicas no estilo do Dr. Porceban. Com base no histórico do paciente e na consulta atual, crie uma evolução clínica detalhada que demonstre a progressão do paciente ao longo do tempo. Destaque alterações nos sintomas, resposta ao tratamento anterior, novos achados no exame físico, e ajustes no plano terapêutico. A evolução deve ser escrita em português do Brasil, manter continuidade com registros anteriores e seguir um formato estruturado e profissional.",
      medical_report: "Você é um assistente médico especializado em criar relatórios médicos detalhados no estilo do Dr. Porceban. Com base nas informações do paciente, elabore um relatório médico formal e abrangente adequado para fins de documentação oficial. O relatório deve incluir histórico relevante, achados clínicos significativos, diagnósticos confirmados, tratamentos realizados e recomendações futuras. Use terminologia médica precisa, mantenha um tom objetivo e profissional, e estruture o documento de acordo com os padrões médicos brasileiros."
    };

    // Add review notice if review is required
    const reviewInstructions = reviewRequired 
      ? "IMPORTANTE: Esta é uma versão preliminar que requer revisão médica antes da finalização. Destaque áreas que necessitam de especial atenção ou confirmação pelo médico." 
      : "";

    // Combine system prompt with review instructions
    const finalSystemPrompt = systemPrompts[mode] + (reviewInstructions ? "\n\n" + reviewInstructions : "");

    // Send to OpenAI API using the new responses endpoint
    console.log(`Sending request to OpenAI API in ${mode} mode, with review: ${!!reviewRequired}`);
    console.log('OPENAI_API_KEY present:', !!Deno.env.get('OPENAI_API_KEY'));
    
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        input: promptWithHistory,
        instructions: finalSystemPrompt,
        temperature: 0.7,
        text: {
          format: {
            type: mode === 'structured_data' ? 'json' : 'text'
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    console.log('API Response Status:', result.status);

    // Extract the output text from the response
    let processedText = '';
    let structuredData = null;

    // Extract the content from the assistant message in the output
    if (result.output && result.output.length > 0) {
      // Find the message output
      const messageOutput = result.output.find(item => item.type === 'message');
      
      if (messageOutput && messageOutput.content && messageOutput.content.length > 0) {
        // Find the text content
        const textContent = messageOutput.content.find(content => content.type === 'output_text');
        
        if (textContent) {
          processedText = textContent.text;
          
          // If structured_data mode, try to parse the JSON
          if (mode === 'structured_data') {
            try {
              if (processedText.includes('```json')) {
                const jsonMatch = processedText.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                  structuredData = JSON.parse(jsonMatch[1]);
                }
              } else if (processedText.includes('```')) {
                const jsonMatch = processedText.match(/```\n([\s\S]*?)\n```/);
                if (jsonMatch && jsonMatch[1]) {
                  structuredData = JSON.parse(jsonMatch[1]);
                }
              } else {
                // Try to parse directly
                structuredData = JSON.parse(processedText);
              }
            } catch (jsonError) {
              console.error('Error parsing JSON response:', jsonError);
              console.log('Original response:', processedText);
              // Continue with the original text response
            }
          }
        }
      }
    }

    let formattedResponse = { 
      text: processedText,
      isReviewRequired: !!reviewRequired,
      wasGeneratedWithHistory: !!patientHistory,
      historyCount: patientHistory ? patientHistory.length : 0
    };
    
    if (mode === 'structured_data' && structuredData) {
      formattedResponse = { 
        ...formattedResponse,
        structuredData: structuredData 
      };
    }

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
