
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

    // Send to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompts[mode] },
          { role: 'user', content: promptContent }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const processedText = result.choices[0].message.content;

    let formattedResponse = { text: processedText };

    // If structured_data mode, try to parse JSON from the response
    if (mode === 'structured_data') {
      try {
        // If the response is already a JSON object (no backticks), parse it
        // If it contains markdown backticks for code formatting, extract and parse the JSON
        let jsonData;
        if (processedText.includes('```json')) {
          const jsonMatch = processedText.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch && jsonMatch[1]) {
            jsonData = JSON.parse(jsonMatch[1]);
          } else {
            throw new Error('Could not extract JSON from the response');
          }
        } else if (processedText.includes('```')) {
          const jsonMatch = processedText.match(/```\n([\s\S]*?)\n```/);
          if (jsonMatch && jsonMatch[1]) {
            jsonData = JSON.parse(jsonMatch[1]);
          } else {
            throw new Error('Could not extract JSON from the response');
          }
        } else {
          // Try to parse directly
          jsonData = JSON.parse(processedText);
        }
        
        formattedResponse = { 
          text: processedText,
          structuredData: jsonData 
        };
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        console.log('Original response:', processedText);
        // Continue with the original text response
      }
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
