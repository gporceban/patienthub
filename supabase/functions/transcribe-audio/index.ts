
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  console.log("transcribe-audio function called");
  console.log("Request method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Content-Type:", req.headers.get("content-type"));
    console.log("Parsing request body");
    const requestData = await req.json();
    const { audio } = requestData;

    if (!audio) {
      console.error("Missing audio data in request");
      return new Response(
        JSON.stringify({ error: "Missing audio data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Received audio data of length:", audio.length);
    console.log("First 50 characters of audio data:", audio.substring(0, 50));

    // Validate base64 format (allow both standard and URL-safe base64)
    const base64Regex = /^[A-Za-z0-9+/=_-]+$/;
    if (!base64Regex.test(audio)) {
      console.error("Invalid base64 audio data");
      console.log("Invalid characters:", audio.match(/[^A-Za-z0-9+/=_-]/g)?.slice(0, 10));
      return new Response(
        JSON.stringify({ 
          error: "Invalid base64 audio data",
          details: "The audio data contains invalid characters for base64 encoding."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Here we'd normally send the audio to a speech-to-text API
    // For now we're just returning a mock response

    // In a production environment, you would use OpenAI's Whisper API or similar
    // const whisperResponse = await callWhisperAPI(audio);
    // const text = whisperResponse.text;
    
    // Mock response for development
    const text = "Esta é uma transcrição simulada do arquivo de áudio enviado. Em um ambiente de produção, usaríamos uma API real de transcrição de fala para texto.";

    console.log("Returning transcription text of length:", text.length);
    
    // Return the transcription
    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in transcribe-audio function:", error.message);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
