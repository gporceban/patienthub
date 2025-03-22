
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-name",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request with CORS headers");
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Requesting transcription session token from OpenAI");
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Request a transcription session token from OpenAI
    console.log("Sending request to OpenAI Realtime Transcription API...");
    const response = await fetch("https://api.openai.com/v1/realtime/transcription_sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input_audio_format: "pcm16",
        input_audio_transcription: {
          model: "gpt-4o-transcribe",
          language: "pt",
          prompt: "Vocabulário médico, terminologia ortopédica"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000,
        },
        input_audio_noise_reduction: {
          type: "near_field"
        }
      })
    });

    // Add detailed logging for troubleshooting
    console.log("OpenAI API response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error response:", errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        console.error("OpenAI API error details:", errorData);
        throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
      } catch (e) {
        // If JSON parsing fails, just use the text
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    console.log("Transcription session created successfully");
    
    // Check for valid token and expiration
    if (!data.client_secret?.value || !data.expires_at) {
      console.error("Invalid token data received:", data);
      throw new Error('Invalid token data received from OpenAI API');
    }
    
    // If expires_at is 0 or invalid, set a default expiration (10 minutes)
    if (data.expires_at === 0 || !data.expires_at) {
      console.log("Setting default expiration time for token");
      data.expires_at = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
    }
    
    // Log the structure of the response for debugging
    console.log("Session data structure:", JSON.stringify(Object.keys(data)));
    console.log("Session data received:", data);
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });
  } catch (error) {
    console.error("Error in realtime-transcription-token function:", error.message);
    console.error("Error stack:", error.stack);
    
    // Return a more detailed error response
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 500 
      }
    );
  }
});
