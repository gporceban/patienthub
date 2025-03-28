
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    console.log('Processing transcription token request')
    
    // Get OpenAI API key from environment variables
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!apiKey) {
      console.error('OpenAI API key not found in environment variables')
      throw new Error('OpenAI API key not found in environment variables')
    }
    
    console.log('Requesting ephemeral token from OpenAI for transcription...')
    
    // According to OpenAI docs, the correct endpoint for transcription sessions
    const response = await fetch('https://api.openai.com/v1/realtime/transcription_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      // Send an empty body as per the documentation
      body: JSON.stringify({})
    })
    
    console.log('OpenAI response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI token request failed:', errorText)
      throw new Error(`Failed to get token: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Response data from OpenAI:', JSON.stringify(data, null, 2))
    
    if (!data.client_secret?.value || !data.client_secret?.expires_at) {
      throw new Error('Invalid response format from OpenAI API')
    }
    
    console.log(`Token will expire at: ${new Date(data.client_secret.expires_at * 1000).toISOString()}`)
    
    return new Response(
      JSON.stringify({
        token: data.client_secret.value,
        expires_at: data.client_secret.expires_at,
        id: data.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error getting transcription token:', error)
    
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
