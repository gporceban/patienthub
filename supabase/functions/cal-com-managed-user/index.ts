import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
};

// Cal.com API v2 constants
const CAL_COM_API_URL = "https://api.cal.com/v2";
const CAL_COM_CLIENT_ID = "cm8cfb46t00dtp81l5a5yre86";
const CAL_COM_CLIENT_SECRET = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcmVEZWZhdWx0RXZlbnRUeXBlc0VuYWJsZWQiOmZhbHNlLCJuYW1lIjoiRHIuIFBvcmNlYmFuIiwicGVybWlzc2lvbnMiOjEwMjMsInJlZGlyZWN0VXJpcyI6WyJodHRwczovL2FpLmRyZ3VpbGhlcm1lcG9yY2ViYW4uY29tLmJyL3BhY2llbnRlL2NhbGVuZGFyaW8iXSwiYm9va2luZ1JlZGlyZWN0VXJpIjoiaHR0cHM6Ly9haS5kcmd1aWxoZXJtZXBvcmNlYmFuLmNvbS5ici9wYWNpZW50ZS9jYWxlbmRhcmlvIiwiYm9va2luZ0NhbmNlbFJlZGlyZWN0VXJpIjoiaHR0cHM6Ly9haS5kcmd1aWxoZXJtZXBvcmNlYmFuLmNvbS5ici9wYWNpZW50ZS9jYWxlbmRhcmlvL2NhbmNlbCIsImJvb2tpbmdSZXNjaGVkdWxlUmVkaXJlY3RVcmkiOiJodHRwczovL2FpLmRyZ3VpbGhlcm1lcG9yY2ViYW4uY29tLmJyL3BhY2llbnRlL2NhbGVuZGFyaW8vYXNzZXNzbWVudCIsImFyZUVtYWlsc0VuYWJsZWQiOnRydWUsImlhdCI6MTc0MjE3NzE3NX0.ruccBtCPGcDWwuuDBkBYOdraCPNHnvdCrr6OPZQw0KU";
const CAL_API_VERSION = "2024-08-13";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
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
    const { userId, action } = requestData;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user profile to get necessary information
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name, user_type, cal_com_user_id, cal_com_token')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userProfile) {
      console.error("Error finding user:", userError || "User not found");
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different actions
    switch (action) {
      case 'create-managed-user':
        return await handleCreateManagedUser(userProfile, supabase, corsHeaders);
      case 'get-bookings':
        return await handleGetBookings(userProfile, requestData, corsHeaders);
      case 'get-available-slots':
        return await handleGetAvailableSlots(userProfile, requestData, corsHeaders);
      case 'reschedule-booking':
        return await handleRescheduleBooking(userProfile, requestData, corsHeaders);
      case 'create-booking':
        return await handleCreateBooking(userProfile, requestData, corsHeaders);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action specified' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCreateManagedUser(userProfile, supabase, corsHeaders) {
  // Check if the user already has a Cal.com managed user ID
  if (userProfile.cal_com_user_id) {
    console.log(`User ${userProfile.id} already has a Cal.com managed user with ID: ${userProfile.cal_com_user_id}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User already has a Cal.com managed user account',
        calComUserId: userProfile.cal_com_user_id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Prepare data for Cal.com
    const calComUserData = {
      email: userProfile.email,
      name: userProfile.full_name,
      timeFormat: 24,
      weekStart: "Monday",
      timeZone: "America/Sao_Paulo", // Default timezone for Brazil
      language: "pt",
      metadata: {
        userType: userProfile.user_type,
        supabaseUserId: userProfile.id
      }
    };

    console.log("Creating Cal.com managed user with data:", calComUserData);
    
    // Call Cal.com API to create a managed user
    const response = await fetch(`${CAL_COM_API_URL}/oauth-clients/${CAL_COM_CLIENT_ID}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cal-client-id": CAL_COM_CLIENT_ID,
        "x-cal-secret-key": CAL_COM_CLIENT_SECRET,
        "cal-api-version": CAL_API_VERSION
      },
      body: JSON.stringify(calComUserData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error creating Cal.com managed user:", errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create Cal.com user', details: errorData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calComResponse = await response.json();
    console.log("Cal.com response:", calComResponse);

    if (!calComResponse.data || !calComResponse.data.accessToken || !calComResponse.data.refreshToken) {
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
        cal_com_token: calComResponse.data.accessToken,
        cal_com_refresh_token: calComResponse.data.refreshToken,
        cal_com_user_id: calComResponse.data.user.id,
        cal_com_token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 60 minutes from now
      })
      .eq('id', userProfile.id);

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
          id: calComResponse.data.user.id,
          email: calComResponse.data.user.email,
          username: calComResponse.data.user.username,
          name: calComResponse.data.user.name
        },
        accessToken: calComResponse.data.accessToken,
        refreshToken: calComResponse.data.refreshToken
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in handleCreateManagedUser:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to create managed user', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleGetBookings(userProfile, requestData, corsHeaders) {
  try {
    // Get access token - could be passed in request or fetched from database
    let accessToken = requestData.accessToken || userProfile.cal_com_token;
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token available for this user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optional parameters
    const status = requestData.status || 'upcoming'; // 'upcoming', 'past', 'cancelled', etc.
    
    // Call Cal.com API to get bookings
    const response = await fetch(`${CAL_COM_API_URL}/bookings?status=${status}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "cal-api-version": CAL_API_VERSION
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error fetching Cal.com bookings:", errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookings', details: errorData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bookingsResponse = await response.json();
    
    // Transform booking data to a more friendly format for the frontend
    const transformedBookings = bookingsResponse.data.map(booking => ({
      id: booking.uid,
      title: booking.title,
      description: booking.description,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      attendees: booking.attendees || [],
      location: booking.location,
      eventTypeId: booking.eventTypeId,
      cancellationReason: booking.cancellationReason,
      rejectionReason: booking.rejectionReason,
      organizer: booking.organizer
    }));

    return new Response(
      JSON.stringify({
        success: true,
        bookings: transformedBookings
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in handleGetBookings:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to get bookings', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleGetAvailableSlots(userProfile, requestData, corsHeaders) {
  try {
    // Get access token
    let accessToken = requestData.accessToken || userProfile.cal_com_token;
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token available for this user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Required parameters
    const { startTime, endTime, eventTypeId } = requestData;
    
    if (!startTime || !endTime || !eventTypeId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: startTime, endTime, eventTypeId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Cal.com API to get available slots
    const response = await fetch(
      `${CAL_COM_API_URL}/slots/available?startTime=${startTime}&endTime=${endTime}&eventTypeId=${eventTypeId}`, 
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "cal-api-version": CAL_API_VERSION
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error fetching available slots:", errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch available slots', details: errorData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const slotsResponse = await response.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        slots: slotsResponse.data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in handleGetAvailableSlots:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to get available slots', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleRescheduleBooking(userProfile, requestData, corsHeaders) {
  try {
    // Get access token
    let accessToken = requestData.accessToken || userProfile.cal_com_token;
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token available for this user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Required parameters
    const { bookingId, startTime, reason } = requestData;
    
    if (!bookingId || !startTime) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: bookingId, startTime' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Cal.com API to reschedule booking
    const response = await fetch(`${CAL_COM_API_URL}/bookings/${bookingId}/reschedule`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "cal-api-version": CAL_API_VERSION
      },
      body: JSON.stringify({
        start: startTime,
        reschedulingReason: reason || "User requested reschedule"
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error rescheduling booking:", errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to reschedule booking', details: errorData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rescheduleResponse = await response.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        booking: rescheduleResponse.data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in handleRescheduleBooking:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to reschedule booking', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleCreateBooking(userProfile, requestData, corsHeaders) {
  try {
    // Get access token
    let accessToken = requestData.accessToken || userProfile.cal_com_token;
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token available for this user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Required parameters
    const { eventTypeId, startTime, endTime, name, email, timeZone, language, metadata } = requestData;
    
    if (!eventTypeId || !startTime || !name || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: eventTypeId, startTime, name, email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Cal.com API to create booking
    const bookingData = {
      eventTypeId,
      start: startTime,
      end: endTime, // Optional
      name,
      email,
      timeZone: timeZone || "America/Sao_Paulo",
      language: language || "pt",
      metadata: metadata || {}
    };

    const response = await fetch(`${CAL_COM_API_URL}/bookings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "cal-api-version": CAL_API_VERSION
      },
      body: JSON.stringify(bookingData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error creating booking:", errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create booking', details: errorData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bookingResponse = await response.json();
    
    return new Response(
      JSON.stringify({
        success: true,
        booking: bookingResponse.data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in handleCreateBooking:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to create booking', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
