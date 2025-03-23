
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-name',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Track requests to implement rate limiting
const requestTracker = new Map<string, { count: number, timestamp: number }>();

serve(async (req) => {
  // Get client IP or a unique identifier from the request
  const clientId = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown-client';
  
  console.log("Realtime transcription token function called");
  console.log("Request method:", req.method);
  console.log("Client identifier:", clientId);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request with CORS headers");
    return new Response('ok', { headers: corsHeaders, status: 204 })
  }
  
  // Implement basic rate limiting
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  const maxRequests = 5; // Maximum requests per window
  
  // Clean up old entries
  for (const [id, data] of requestTracker.entries()) {
    if (now - data.timestamp > windowMs) {
      requestTracker.delete(id);
    }
  }
  
  // Check if client is rate limited
  const clientData = requestTracker.get(clientId) || { count: 0, timestamp: now };
  if (now - clientData.timestamp > windowMs) {
    // Reset if window has passed
    clientData.count = 1;
    clientData.timestamp = now;
  } else {
    // Increment count
    clientData.count++;
  }
  requestTracker.set(clientId, clientData);
  
  // If rate limit exceeded, return 429
  if (clientData.count > maxRequests) {
    console.error(`Rate limit exceeded for client ${clientId}: ${clientData.count} requests in the last minute`);
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Please try again later.'
      }),
      {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      },
    )
  }
  
  try {
    // Get OpenAI API key from environment variables
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!apiKey) {
      console.error('OpenAI API key not found in environment variables');
      throw new Error('OpenAI API key not found in environment variables')
    }
    
    console.log("Sending request to OpenAI Realtime Transcription API...");
    
    // Get a speech-to-text token from OpenAI API
    const response = await fetch('https://api.openai.com/v1/audio/speech-recognition/realtime/tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'whisper-1',
        language: 'pt'
      })
    })
    
    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI token request failed:', errorData);
      console.error('Response status:', response.status);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      throw new Error(`Failed to get token: ${response.status} ${response.statusText} - ${errorData}`)
    }
    
    const data = await response.json()
    
    console.log(`Token received successfully. Will expire at: ${new Date(data.expires_at * 1000).toISOString()}`);
    
    return new Response(
      JSON.stringify({
        token: data.token,
        expires_at: data.expires_at
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      },
    )
  } catch (error) {
    console.error('Error getting transcription token:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
