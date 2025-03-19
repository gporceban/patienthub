
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

const CAL_COM_API_URL = "https://api.cal.com/v2";
const CAL_COM_CLIENT_ID = "cm8cfb46t00dtp81l5a5yre86";
const CAL_COM_CLIENT_SECRET = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcmVEZWZhdWx0RXZlbnRUeXBlc0VuYWJsZWQiOmZhbHNlLCJuYW1lIjoiRHIuIFBvcmNlYmFuIiwicGVybWlzc2lvbnMiOjEwMjMsInJlZGlyZWN0VXJpcyI6WyJodHRwczovL2FpLmRyZ3VpbGhlcm1lcG9yY2ViYW4uY29tLmJyL3BhY2llbnRlL2NhbGVuZGFyaW8iXSwiYm9va2luZ1JlZGlyZWN0VXJpIjoiaHR0cHM6Ly9haS5kcmd1aWxoZXJtZXBvcmNlYmFuLmNvbS5ici9wYWNpZW50ZS9jYWxlbmRhcmlvIiwiYm9va2luZ0NhbmNlbFJlZGlyZWN0VXJpIjoiaHR0cHM6Ly9haS5kcmd1aWxoZXJtZXBvcmNlYmFuLmNvbS5ici9wYWNpZW50ZS9jYWxlbmRhcmlvL2NhbmNlbCIsImJvb2tpbmdSZXNjaGVkdWxlUmVkaXJlY3RVcmkiOiJodHRwczovL2FpLmRyZ3VpbGhlcm1lcG9yY2ViYW4uY29tLmJyL3BhY2llbnRlL2NhbGVuZGFyaW8vYXNzZXNzbWVudCIsImFyZUVtYWlsc0VuYWJsZWQiOnRydWUsImlhdCI6MTc0MjE3NzE3NX0.ruccBtCPGcDWwuuDBkBYOdraCPNHnvdCrr6OPZQw0KU";

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

    // Parse the URL to get the action and ID if applicable
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];
    
    // Get query parameters
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's Cal.com token
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('cal_com_token, cal_com_refresh_token')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userData || !userData.cal_com_token) {
      console.error("Error finding user Cal.com tokens:", userError || "No tokens found");
      return new Response(
        JSON.stringify({ error: 'User Cal.com access not set up' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body if available
    let requestBody = {};
    if (req.method !== 'GET') {
      try {
        requestBody = await req.json();
      } catch (e) {
        // If body is empty or invalid JSON, use empty object
      }
    }

    // Handle different actions
    switch (action) {
      case 'bookings': {
        // GET /bookings - Get all bookings
        if (req.method === 'GET') {
          console.log("Fetching all bookings for user");
          
          const response = await fetch(`${CAL_COM_API_URL}/bookings`, {
            method: 'GET',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userData.cal_com_token}`
            }
          });

          if (!response.ok) {
            // Try to refresh token if unauthorized
            if (response.status === 401 && userData.cal_com_refresh_token) {
              console.log("Token expired, attempting to refresh...");
              // Call the refresh token function
              const refreshResponse = await fetch(`${req.url.replace('/bookings', '/refresh')}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: userData.cal_com_refresh_token })
              });
              
              if (!refreshResponse.ok) {
                return new Response(
                  JSON.stringify({ error: 'Failed to refresh token' }),
                  { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const refreshData = await refreshResponse.json();
              
              // Retry the original request with the new token
              const retryResponse = await fetch(`${CAL_COM_API_URL}/bookings`, {
                method: 'GET',
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${refreshData.accessToken}`
                }
              });

              if (!retryResponse.ok) {
                const errorData = await retryResponse.json();
                console.error("Error fetching bookings after token refresh:", errorData);
                return new Response(
                  JSON.stringify({ error: 'Failed to fetch bookings after token refresh' }),
                  { status: retryResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

              const bookingsData = await retryResponse.json();
              return new Response(
                JSON.stringify(bookingsData),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            const errorData = await response.json();
            console.error("Error fetching bookings:", errorData);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch bookings', details: errorData }),
              { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const data = await response.json();
          return new Response(
            JSON.stringify(data),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // POST /bookings - Create a new booking
        if (req.method === 'POST') {
          console.log("Creating a new booking");
          const response = await fetch(`${CAL_COM_API_URL}/bookings`, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userData.cal_com_token}`
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Error creating booking:", errorData);
            return new Response(
              JSON.stringify({ error: 'Failed to create booking', details: errorData }),
              { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const data = await response.json();
          return new Response(
            JSON.stringify(data),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }
      
      case 'event-types': {
        // GET /event-types - Get all event types
        if (req.method === 'GET') {
          console.log("Fetching event types for user");
          
          const response = await fetch(`${CAL_COM_API_URL}/event-types`, {
            method: 'GET',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userData.cal_com_token}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Error fetching event types:", errorData);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch event types', details: errorData }),
              { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const data = await response.json();
          return new Response(
            JSON.stringify(data),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // POST /event-types - Create a new event type
        if (req.method === 'POST') {
          console.log("Creating a new event type");
          const response = await fetch(`${CAL_COM_API_URL}/event-types`, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userData.cal_com_token}`
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Error creating event type:", errorData);
            return new Response(
              JSON.stringify({ error: 'Failed to create event type', details: errorData }),
              { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const data = await response.json();
          return new Response(
            JSON.stringify(data),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }
      
      case 'schedules': {
        // GET /schedules - Get all schedules
        if (req.method === 'GET') {
          console.log("Fetching schedules for user");
          
          const response = await fetch(`${CAL_COM_API_URL}/schedules`, {
            method: 'GET',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userData.cal_com_token}`
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Error fetching schedules:", errorData);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch schedules', details: errorData }),
              { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const data = await response.json();
          return new Response(
            JSON.stringify(data),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Endpoint not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // If we get here, the action/method combination wasn't handled
    return new Response(
      JSON.stringify({ error: 'Method not allowed for this endpoint' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
