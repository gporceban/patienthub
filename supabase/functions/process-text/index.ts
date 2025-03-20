
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Process-text function called");
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Parse request body
    const { text, mode, reviewRequired, additionalInstructions, patientInfo } = await req.json();

    console.log("Request parameters:", { mode, reviewRequired, patientInfo: !!patientInfo });

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: text" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // For now, our "AI processing" just returns structured data based on the text
    // In a real implementation, this would call an actual AI model
    const processedText = processTextWithAI(text, mode, additionalInstructions, patientInfo);

    console.log("Processing complete for mode:", mode);

    // Handle different modes (clinical_note, prescription, summary, etc.)
    let result;
    if (mode === 'structured_data') {
      result = { 
        text: processedText.text,
        structuredData: processedText.structuredData 
      };
    } else {
      result = { text: processedText.text };
    }

    // Return the processed text
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// This is a simplified AI processing function
// In a real implementation, this would call an actual AI model API
function processTextWithAI(text, mode, additionalInstructions, patientInfo) {
  // Include patient history in context if available
  let context = '';
  if (patientInfo && patientInfo.prontuarioId) {
    context = `This patient (ID: ${patientInfo.prontuarioId}) has previous medical history that should be considered.`;
  }

  // Include additional instructions if provided
  let instructions = '';
  if (additionalInstructions) {
    instructions = `Additional instructions: ${additionalInstructions}`;
  }

  // Basic processing based on mode
  let processedText = '';
  let structuredData = null;

  switch (mode) {
    case 'clinical_note':
      processedText = generateClinicalNote(text, context, instructions);
      break;
    case 'prescription':
      processedText = generatePrescription(text, context, instructions);
      break;
    case 'summary':
      processedText = generateSummary(text, context, instructions);
      break;
    case 'patient_friendly':
      processedText = generatePatientFriendlySummary(text, context, instructions);
      break;
    case 'structured_data':
      const result = generateStructuredData(text, context, instructions);
      processedText = text;
      structuredData = result;
      break;
    default:
      processedText = text;
  }

  return { text: processedText, structuredData };
}

function generateClinicalNote(text, context, instructions) {
  // Simplified implementation
  return `**NOTA CLÍNICA**

**1. INFORMAÇÕES DO PACIENTE:**
- Nome: [Nome do Paciente]
- Número do Prontuário: [Número do Prontuário]
- Data: [Data da Consulta]
- Dados Demográficos: [Idade, Sexo, Estado Civil, Ocupação, Endereço]

**2. SUBJETIVO:**
${text}

**3. OBJETIVO:**
Os dados do exame físico do paciente não estão disponíveis no momento desta consulta. Sinais vitais e resultados de exames adicionais não foram incluídos no fornecimento de informações. Recomenda-se a realização de uma nova avaliação física detalhada e a obtenção de exames de imagem atualizados para melhor elucidação do quadro clínico.

**4. AVALIAÇÃO:**
- Diagnóstico Principal: A ser determinado após avaliação completa.
- Diagnósticos Diferenciais: Considerar possibilidade de diversas condições com base nos sintomas apresentados.

**5. PLANO:**
- Exames: Solicitar exames de imagem/laboratório conforme necessidade.
- Medicamentos: Prescrever medicamentos conforme indicação.
- Acompanhamento: Agendar retorno para reavaliação.
${context ? '\n**HISTÓRICO DO PACIENTE:**\n' + context : ''}
${instructions ? '\n**INSTRUÇÕES ADICIONAIS:**\n' + instructions : ''}

**Assinado:**
Dr. [Nome do Médico]
CRM: [Número do CRM]

IMPORTANTE: Esta é uma versão preliminar que requer revisão médica antes da finalização. Destaque áreas que necessitam de especial atenção ou confirmação pelo médico.`;
}

function generatePrescription(text, context, instructions) {
  // Simplified implementation
  return `**PRESCRIÇÃO MÉDICA**

**Paciente:** [Nome do Paciente]
**Data:** [Data Atual]

**Diagnóstico:** [Diagnóstico Principal]

**Prescrição Médica:**

1. **Medicamento 1:**
   - **Nome:** [Nome do Medicamento]
   - **Posologia:** [Posologia]
   - **Duração:** [Duração do tratamento]

2. **Medicamento 2:**
   - **Nome:** [Nome do Medicamento]
   - **Posologia:** [Posologia]
   - **Duração:** [Duração do tratamento]

**Instruções Especiais:**
- [Instruções especiais para o paciente]

**Assinatura do Médico:**

_____________________________
Dr. [Nome do Médico]
CRM: [Número do CRM]

**Observações:**
- A data e o nome do paciente devem ser preenchidos conforme o cadastro médico.
- Seguir rigorosamente as instruções fornecidas e retornar ao ambulatório conforme orientação.

IMPORTANTE: Esta é uma versão preliminar que requer revisão médica antes da finalização. Destaque áreas que necessitam de especial atenção ou confirmação pelo médico.`;
}

function generateSummary(text, context, instructions) {
  // Simplified implementation
  return `**Resumo do Paciente**

1. **Detalhes do Paciente:** [Nome, Idade, Gênero]

2. **Queixas Principais:** 
${text}

3. **Achados Principais:** 
[Resumo dos achados principais do exame físico e testes diagnósticos]

4. **Diagnóstico Primário:** 
[Diagnóstico principal]

5. **Elementos Principais do Tratamento:** 
[Resumo do plano de tratamento]

IMPORTANTE: Esta é uma versão preliminar que requer revisão médica antes da finalização. Destaque áreas que necessitam de especial atenção ou confirmação pelo médico.`;
}

function generatePatientFriendlySummary(text, context, instructions) {
  // Simplified implementation
  return `**Resumo da Sua Consulta Médica**

Olá! 

Aqui está um resumo simples da sua consulta de hoje:

**O que observamos:**
- [Versão simplificada dos sintomas e achados]

**O que isso significa:**
- [Explicação em linguagem simples do diagnóstico]

**Próximos passos:**
1. [Medicação prescrita em termos simples]
2. [Exames recomendados]
3. [Mudanças no estilo de vida recomendadas]

**Quando voltar:**
- [Data de retorno e sinais de alerta]

Se tiver dúvidas sobre qualquer aspecto do seu tratamento, por favor, entre em contato com nosso consultório.

Desejamos uma rápida recuperação!`;
}

function generateStructuredData(text, context, instructions) {
  // Simplified implementation - in a real app, this would use NLP to extract structured data
  return {
    paciente: {
      id: "",
      demograficos: null
    },
    consulta: {
      data: null,
      motivo: text.substring(0, 100) + "..."
    },
    sintomas: [text.substring(0, 50) + "..."],
    diagnosticos: ["A ser determinado"],
    exame: {
      sinaisVitais: null,
      achados: []
    },
    tratamentos: {
      medicamentos: [],
      procedimentos: ["A ser determinado"],
      retorno: null
    }
  };
}
