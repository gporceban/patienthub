
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

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
    const { text, mode, patientInfo } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    if (!mode || !['clinical_note', 'prescription', 'summary', 'structured_data'].includes(mode)) {
      throw new Error('Invalid or missing mode. Must be one of: clinical_note, prescription, summary, structured_data');
    }

    // Different system prompts based on mode
    const systemPrompts = {
      clinical_note: "Você é um assistente médico especializado em criar notas clínicas detalhadas. Formate a nota clínica de maneira estruturada com seções como: Dados do Paciente, Queixa Principal, História da Doença Atual, Exame Físico, Diagnósticos, Plano de Tratamento, e Recomendações. Mantenha um tom profissional e use terminologia médica apropriada. A nota deve ser escrita em português do Brasil.",
      prescription: "Você é um assistente médico especializado em criar receitas médicas. Formate a receita de maneira clara com o nome do medicamento, dosagem, via de administração, frequência, duração do tratamento e quaisquer instruções especiais. A receita deve ser escrita em português do Brasil e seguir o formato padrão usado no Brasil, incluindo nome do paciente e data no topo.",
      summary: "Você é um assistente médico que cria resumos concisos de consultas. Extraia apenas as informações mais importantes da transcrição e crie um resumo breve, estruturado e objetivo da consulta médica. Destaque os pontos principais da queixa, diagnóstico e plano de tratamento. O resumo deve ser escrito em português do Brasil.",
      structured_data: "Você é um assistente médico que extrai informações estruturadas de consultas médicas. Analise o texto e extraia as seguintes informações em formato JSON: diagnósticos (array de strings), medicamentos prescritos (array de objetos com nome, dosagem, frequência), alergias (array de strings), sinais vitais (objeto com pressão arterial, frequência cardíaca, temperatura, etc), exames solicitados (array de strings) e recomendações (array de strings). Se alguma informação não estiver presente no texto, retorne um array ou objeto vazio para esse campo. Você DEVE retornar apenas um objeto JSON válido, sem texto adicional."
    };

    let promptContent = text;
    
    // If it's a structured data request and we have patient info, include it
    if (mode === 'structured_data' && patientInfo) {
      promptContent = `Informações do paciente: Nome: ${patientInfo.name}, Email: ${patientInfo.email}, ID do Prontuário: ${patientInfo.prontuarioId}\n\nTranscrição da consulta: ${text}`;
    }

    // Send to OpenAI API using the new responses endpoint
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: systemPrompts[mode],
        input: promptContent,
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
    console.log('API Response:', JSON.stringify(result, null, 2));

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

    let formattedResponse = { text: processedText };
    
    if (mode === 'structured_data' && structuredData) {
      formattedResponse = { 
        text: processedText,
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
