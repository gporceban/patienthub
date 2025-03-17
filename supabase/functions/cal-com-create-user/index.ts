
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the request body
    const requestData = await req.json();
    const { userId, userData } = requestData;

    if (!userId || !userData || !userData.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and userData.email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First fetch the user from the database to make sure they exist
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userProfile) {
      console.error("Error finding user:", userError || "User not found");
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare data for Cal.com
    const calComUserData = {
      email: userData.email || userProfile.email,
      name: userData.name || userProfile.full_name,
      timeFormat: userData.timeFormat || 24,
      weekStart: userData.weekStart || "Monday",
      timeZone: userData.timeZone || "America/Sao_Paulo", // Default timezone for Brazil
    };

    // Create the managed user in Cal.com
    console.log("Creating Cal.com managed user with data:", calComUserData);
    const response = await fetch(`${CAL_COM_API_URL}/oauth-clients/${CAL_COM_CLIENT_ID}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cal-secret-key": CAL_COM_CLIENT_SECRET
      },
      body: JSON.stringify(calComUserData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error creating Cal.com user:", errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create Cal.com user: ' + (errorData.message || response.statusText) }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calComResponse = await response.json();
    const { data: calComData } = calComResponse;

    if (!calComData || !calComData.user || !calComData.accessToken || !calComData.refreshToken) {
      console.error("Invalid response from Cal.com:", calComResponse);
      return new Response(
        JSON.stringify({ error: 'Invalid response from Cal.com' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the Cal.com user info in the database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        cal_com_token: calComData.accessToken,
        cal_com_refresh_token: calComData.refreshToken,
        cal_com_user_id: calComData.user.id
      })
      .eq('id', userId);

    if (updateError) {
      console.error("Error updating user with Cal.com info:", updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update user with Cal.com info' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the Cal.com user info
    return new Response(
      JSON.stringify({
        success: true,
        calComUser: {
          id: calComData.user.id,
          email: calComData.user.email,
          username: calComData.user.username
        }
      }),
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
