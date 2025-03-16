
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define system prompts for specialized "agents"
const specializedAgents = {
  // Patient Info extractor
  patientInfoExtractor: `You are an AI specialized in extracting patient information.
  Extract ONLY the patient's basic information from the text, including:
  - Patient name (if available)
  - Patient ID (if available)
  - Age
  - Gender
  - Date of consultation
  Format your response in clean, professional medical terminology.`,

  // Symptom extractor
  symptomExtractor: `You are an AI specialized in identifying patient symptoms.
  Extract ONLY the symptoms mentioned in the text, including:
  - Chief complaints
  - Duration of symptoms
  - Severity indicators
  - Related symptoms
  List these symptoms in a clear, organized format using professional medical terminology.`,

  // Exam findings extractor
  examExtractor: `You are an AI specialized in extracting physical examination findings.
  Extract ONLY the physical examination results from the text, including:
  - Vital signs
  - General appearance
  - Systemic examination findings
  - Abnormal findings
  Format these in a structured clinical format using professional medical terminology.`,

  // Diagnosis extractor
  diagnosisExtractor: `You are an AI specialized in extracting medical diagnoses.
  Extract ONLY the diagnoses mentioned in the text, including:
  - Primary diagnosis
  - Differential diagnoses
  - Confirmed vs. suspected diagnoses
  Format these using proper medical terminology and classification.`,

  // Treatment extractor
  treatmentExtractor: `You are an AI specialized in extracting treatment plans.
  Extract ONLY the treatment plans from the text, including:
  - Medications prescribed
  - Procedures recommended
  - Follow-up instructions
  - Lifestyle modifications
  Format these in a clear, actionable format using professional medical terminology.`,

  // Clinical history extractor
  historyExtractor: `You are an AI specialized in extracting patient clinical history.
  Extract ONLY the relevant clinical history from the text, including:
  - Past medical history
  - Family history
  - Social history
  - Medication history
  Format this in a structured format using professional medical terminology.`,
}

// Define each document type "orchestrator"
const documentOrchestrators = {
  clinical_note: `You are a medical assistant generating a structured clinical note in Dr. Porceban's style.
  Using the extracted information, compile a COMPLETE clinical note with these sections:
  1. PATIENT INFO: Name, ID, date, and demographic data
  2. SUBJECTIVE: Patient's history, complaints, and symptoms
  3. OBJECTIVE: Physical examination findings, vital signs, and test results
  4. ASSESSMENT: Diagnoses (primary and differential)
  5. PLAN: Treatment plan, medications, and follow-up

  Format as a formal clinical note using professional medical terminology.
  Maintain Dr. Porceban's writing style throughout the document.
  The note must be comprehensive and adhere to medical documentation standards.`,

  prescription: `You are a medical assistant generating a formal prescription in Dr. Porceban's style.
  Using the extracted information, compile a COMPLETE prescription with:
  1. Patient details
  2. Date
  3. Medications with precise dosage, frequency, and duration
  4. Special instructions
  5. Doctor's signature line

  Format as a formal prescription using professional medical terminology.
  Follow Brazilian prescription standards and use Dr. Porceban's concise style.`,

  summary: `You are a medical assistant generating a concise patient summary in Dr. Porceban's style.
  Using the extracted information, compile a BRIEF yet COMPLETE summary with:
  1. Patient details
  2. Key complaints
  3. Principal findings
  4. Primary diagnosis
  5. Main treatment elements

  Use Dr. Porceban's efficient, clear style while maintaining medical accuracy.
  The summary should be brief but include all essential clinical information.`,

  structured_data: `You are a medical assistant extracting structured medical data in JSON format.
  Using all available information, extract and structure the following data points:
  {
    "patient": {
      "id": string or null,
      "demographics": { age, gender, etc. } or null
    },
    "visit": {
      "date": string or null,
      "reason": string or null
    },
    "symptoms": [array of symptoms] or [],
    "examination": {
      "vitalSigns": { bp, hr, temp, etc. } or null,
      "findings": [array of findings] or []
    },
    "diagnoses": [array of diagnoses] or [],
    "treatments": {
      "medications": [array of medications] or [],
      "procedures": [array of procedures] or [],
      "followUp": string or null
    }
  }

  The JSON must be valid, complete, and follow this exact schema.`,

  evolution: `You are a medical assistant generating a patient evolution note in Dr. Porceban's style.
  Using both historical records AND new information, compile a COMPLETE evolution note with:
  1. Patient identification
  2. Date and time
  3. Interval history (changes since last visit)
  4. Current examination findings
  5. Assessment of progress
  6. Updated plan

  Explicitly compare current status with previous visits.
  Follow Dr. Porceban's concise yet thorough style for evolution notes.
  Maintain continuity with previous documentation.`,

  medical_report: `You are a medical assistant generating a formal medical report in Dr. Porceban's style.
  Using the extracted information, compile a COMPREHENSIVE medical report with:
  1. Patient demographics
  2. Detailed history
  3. Comprehensive examination findings
  4. Diagnostic studies
  5. Assessment and clinical reasoning
  6. Detailed recommendations

  Format as a formal medical report suitable for official purposes.
  Follow Dr. Porceban's structured, thorough style for official documentation.
  Ensure the report is complete, precise, and professionally formatted.`
}

// Main function to coordinate the "agents" workflow
async function runAgentBasedProcessing(text: string, mode: string, patientHistory: any = null) {
  console.log(`Running agent-based processing for mode: ${mode}`);
  
  // Initialize OpenAI API key
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Step 1: Prepare final prompt with history if available
  let contextPrompt = '';
  if (patientHistory && patientHistory.length > 0) {
    const historyText = patientHistory.map((record: any) => {
      return `Data: ${new Date(record.created_at).toLocaleDateString('pt-BR')}\n` +
             `Resumo: ${record.summary || 'Não disponível'}\n` +
             `Nota Clínica: ${record.clinical_note || 'Não disponível'}\n` + 
             `Prescrição: ${record.prescription || 'Não disponível'}\n\n`;
    }).join('---\n');
    
    contextPrompt = `HISTÓRICO DO PACIENTE:\n${historyText}\n\nNOVA CONSULTA:\n${text}`;
  } else {
    contextPrompt = text;
  }

  // Step 2: Run specialized extractions as needed for the document type
  const extractors = [];
  
  // Select which extractors to use based on document type
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
  }

  console.log(`Selected extractors: ${extractors.join(', ')}`);
  
  // Step 3: Run extractors in parallel for efficiency
  const extractionPromises = extractors.map(async (extractor) => {
    try {
      console.log(`Running extractor: ${extractor}`);
      
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          input: contextPrompt,
          instructions: specializedAgents[extractor as keyof typeof specializedAgents],
          temperature: 0.3, // Lower temperature for more deterministic extraction
          text: {
            format: {
              type: 'text'
            }
          }
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
      let extractedContent = '';
      
      // Find the text content in the response structure
      if (result.output && result.output.length > 0) {
        const messageOutput = result.output.find((item: any) => item.type === 'message');
        if (messageOutput && messageOutput.content && messageOutput.content.length > 0) {
          const textContent = messageOutput.content.find((content: any) => content.type === 'output_text');
          if (textContent) {
            extractedContent = textContent.text;
          }
        }
      }
      
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
  
  // Wait for all extractions to complete
  const extractionResults = await Promise.all(extractionPromises);
  console.log(`Completed ${extractionResults.length} extractions`);
  
  // Check if any extractions failed
  const failedExtractions = extractionResults.filter(result => result.error);
  if (failedExtractions.length > 0) {
    console.warn(`${failedExtractions.length} extractions failed`);
  }
  
  // Step 4: Compile the extracted information
  const compiledExtractions = extractionResults.reduce((acc, result) => {
    const extractorName = result.extractor.replace('Extractor', '').toUpperCase();
    return acc + `\n\n### ${extractorName} INFORMATION:\n${result.content}`;
  }, '');
  
  // Step 5: Run the final orchestrator to generate the complete document
  console.log(`Running orchestrator for ${mode}`);
  
  // Prepare the final prompt for the orchestrator
  const orchestratorPrompt = `
CONSULTATION TRANSCRIPT:
${text}

EXTRACTED INFORMATION:
${compiledExtractions}

${patientHistory && patientHistory.length > 0 ? `
PATIENT HISTORY:
${patientHistory.map((record: any) => {
  return `Data: ${new Date(record.created_at).toLocaleDateString('pt-BR')}\n` +
         `Resumo: ${record.summary || 'Não disponível'}\n` +
         `Nota Clínica: ${record.clinical_note || 'Não disponível'}\n` + 
         `Prescrição: ${record.prescription || 'Não disponível'}\n\n`;
}).join('---\n')}` : ''}
`;

  // Run the orchestrator to generate the final document
  const orchestratorResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      input: orchestratorPrompt,
      instructions: documentOrchestrators[mode as keyof typeof documentOrchestrators],
      temperature: 0.7,
      text: {
        format: {
          type: mode === 'structured_data' ? 'json' : 'text'
        }
      }
    }),
  });
  
  if (!orchestratorResponse.ok) {
    const errorText = await orchestratorResponse.text();
    console.error(`Error from OpenAI orchestrator:`, errorText);
    throw new Error(`OpenAI API error in orchestrator: ${errorText}`);
  }
  
  const orchestratorResult = await orchestratorResponse.json();
  let finalDocument = '';
  
  // Extract the final document from the response
  if (orchestratorResult.output && orchestratorResult.output.length > 0) {
    const messageOutput = orchestratorResult.output.find((item: any) => item.type === 'message');
    if (messageOutput && messageOutput.content && messageOutput.content.length > 0) {
      const textContent = messageOutput.content.find((content: any) => content.type === 'output_text');
      if (textContent) {
        finalDocument = textContent.text;
      }
    }
  }
  
  // Process structured data if needed
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
        // Try to parse directly
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
      } else {
        console.log('No previous history found for patient');
      }
    }

    // Add review notice if review is required
    const reviewInstructions = reviewRequired 
      ? "IMPORTANTE: Esta é uma versão preliminar que requer revisão médica antes da finalização. Destaque áreas que necessitam de especial atenção ou confirmação pelo médico." 
      : "";

    console.log(`Starting agent-based processing for ${mode} mode, review required: ${!!reviewRequired}`);
    
    // Run the agent-based processing
    const processingResult = await runAgentBasedProcessing(text, mode, patientHistory);
    
    // Add review notice to the final text if required
    let finalText = processingResult.text;
    if (reviewRequired && finalText) {
      finalText = `${finalText}\n\n${reviewInstructions}`;
    }

    let formattedResponse: any = { 
      text: finalText,
      isReviewRequired: !!reviewRequired,
      wasGeneratedWithHistory: !!patientHistory,
      historyCount: patientHistory ? patientHistory.length : 0
    };
    
    if (mode === 'structured_data' && processingResult.structuredData) {
      formattedResponse = { 
        ...formattedResponse,
        structuredData: processingResult.structuredData 
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
