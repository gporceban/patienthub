
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const CAL_COM_API_URL = "https://api.cal.com/v2";
const CAL_COM_CLIENT_ID = "your-cal-com-client-id"; // Replace with your actual client ID
const CAL_COM_CLIENT_SECRET = "your-cal-com-client-secret"; // Replace with your actual client secret

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract the access token from the request
    const authHeader = req.headers.get('Authorization') || '';
    const accessToken = authHeader.replace('Bearer ', '');

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Access token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the user with this access token
    const { data, error } = await supabase
      .from('profiles')
      .select('id, cal_com_refresh_token')
      .eq('cal_com_token', accessToken)
      .maybeSingle();

    if (error || !data) {
      console.error("Error finding user:", error || "No user found");
      return new Response(
        JSON.stringify({ error: 'Failed to find user with this access token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refreshToken = data.cal_com_refresh_token;
    if (!refreshToken) {
      console.error("Refresh token not found for user:", data.id);
      return new Response(
        JSON.stringify({ error: 'Refresh token not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get a new token from Cal.com
    const response = await fetch(`${CAL_COM_API_URL}/oauth/${CAL_COM_CLIENT_ID}/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cal-secret-key": CAL_COM_CLIENT_SECRET
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error refreshing token:", errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to refresh token' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokens = await response.json();

    // Update the tokens in the database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        cal_com_token: tokens.accessToken,
        cal_com_refresh_token: tokens.refreshToken
      })
      .eq('id', data.id);

    if (updateError) {
      console.error("Error updating tokens:", updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update tokens in database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the new access token
    return new Response(
      JSON.stringify({ accessToken: tokens.accessToken }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
