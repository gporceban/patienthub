
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text, mode } = await req.json()
    
    if (!text) {
      throw new Error('No text provided')
    }

    if (!mode) {
      throw new Error('No processing mode specified')
    }

    let systemPrompt = '';
    
    // Define system prompts based on the mode
    switch (mode) {
      case 'clinical_note':
        systemPrompt = `Você é um assistente médico especializado em criar notas clínicas estruturadas a partir de transcrições de consultas médicas. 
        Siga o formato SOAP (Subjetivo, Objetivo, Avaliação, Plano). 
        Organize de forma clara e profissional, utilizando linguagem médica apropriada.
        Inclua apenas informações presentes na transcrição.`;
        break;
      case 'prescription':
        systemPrompt = `Você é um assistente médico especializado em formatar prescrições médicas a partir de transcrições de consultas.
        Siga o formato padrão de prescrição médica brasileira.
        Inclua: Nome do medicamento, Dosagem, Via de administração, Frequência, Duração do tratamento.
        Organize de forma clara e profissional, utilizando linguagem médica apropriada.
        Inclua apenas medicamentos mencionados na transcrição.`;
        break;
      case 'summary':
        systemPrompt = `Você é um assistente médico especializado em criar resumos concisos de consultas médicas.
        Extraia os pontos principais da consulta incluindo: queixa principal, histórico relevante, achados do exame, diagnóstico e plano de tratamento.
        Seja objetivo e use linguagem médica apropriada.
        Limite o resumo a no máximo 150 palavras.`;
        break;
      default:
        throw new Error(`Unsupported processing mode: ${mode}`);
    }

    // Send to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const result = await response.json()
    const processedText = result.choices[0].message.content;
    console.log(`${mode} processing successful`);

    return new Response(
      JSON.stringify({ text: processedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-text function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
