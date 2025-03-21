
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-name",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  console.log("transcribe-audio function called");
  console.log("Request method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request with CORS headers");
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

    // Get OpenAI API Key
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log("Sending audio to OpenAI's Whisper API...");
    
    // Create a buffer from the base64 string
    const binaryData = atob(audio);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }

    // Create a Blob from the Uint8Array
    const blob = new Blob([bytes], { type: 'audio/webm' });

    // Create FormData to send to OpenAI
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "pt");
    formData.append("prompt", "Vocabulário médico, terminologia ortopédica");
    
    // Call OpenAI's Whisper API
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`
        // No Content-Type header as FormData sets it automatically with the boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("OpenAI API response:", result);
    
    if (!result.text) {
      throw new Error("No transcription returned from OpenAI");
    }

    console.log("Transcription result:", result.text.substring(0, 100) + "...");
    
    // Return the transcription
    return new Response(
      JSON.stringify({ text: result.text }),
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
