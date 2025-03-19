
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const CAL_COM_API_URL = "https://api.cal.com/v1";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("cal-com-bookings function called");
    
    // Get the request body
    const body = await req.json();
    const { token, action } = body;

    if (!token) {
      console.error("No Cal.com token provided");
      return new Response(
        JSON.stringify({ error: 'Cal.com token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different actions
    switch(action) {
      case 'get-bookings':
        return await getBookings(token);
      case 'get-event-types':
        return await getEventTypes(token);
      case 'create-availability':
        return await createAvailability(token, body.availability);
      case 'create-booking':
        return await createBooking(token, body.eventTypeId, body.startTime, body.attendee);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
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

async function getBookings(token: string) {
  try {
    console.log("Getting Cal.com bookings");
    
    const response = await fetch(`${CAL_COM_API_URL}/bookings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error fetching Cal.com bookings:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookings', details: errorData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("Successfully fetched bookings");
    
    // Transform data to match the expected format
    const bookings = data.bookings || [];
    
    return new Response(
      JSON.stringify({ bookings }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error getting bookings:", error);
    return new Response(
      JSON.stringify({ error: 'Error getting bookings', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getEventTypes(token: string) {
  try {
    console.log("Getting Cal.com event types");
    
    const response = await fetch(`${CAL_COM_API_URL}/event-types`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error fetching Cal.com event types:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch event types', details: errorData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("Successfully fetched event types");
    
    return new Response(
      JSON.stringify({ eventTypes: data.event_types || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error getting event types:", error);
    return new Response(
      JSON.stringify({ error: 'Error getting event types', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function createAvailability(token: string, availability: any) {
  try {
    console.log("Creating Cal.com availability");
    
    if (!availability || !availability.days || !availability.startTime || !availability.endTime) {
      return new Response(
        JSON.stringify({ error: 'Invalid availability data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // First get user's schedules to find the default one
    const schedulesResponse = await fetch(`${CAL_COM_API_URL}/schedules`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!schedulesResponse.ok) {
      const errorData = await schedulesResponse.json();
      console.error('Error fetching Cal.com schedules:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch schedules', details: errorData }),
        { status: schedulesResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const schedulesData = await schedulesResponse.json();
    if (!schedulesData.schedules || schedulesData.schedules.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No schedules found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Find the default schedule or use the first one
    const defaultSchedule = schedulesData.schedules.find((s: any) => s.name === 'Default Schedule') || schedulesData.schedules[0];
    
    // Format the availability data for Cal.com API
    const availabilityInput = {
      name: 'Working Hours',
      timeZone: availability.timezone,
      availability: availability.days.map((day: number) => ({
        days: [day],
        startTime: availability.startTime,
        endTime: availability.endTime
      }))
    };
    
    // Update the schedule with the new availability
    const response = await fetch(`${CAL_COM_API_URL}/schedules/${defaultSchedule.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(availabilityInput)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error creating Cal.com availability:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create availability', details: errorData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("Successfully created availability");
    
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error creating availability:", error);
    return new Response(
      JSON.stringify({ error: 'Error creating availability', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function createBooking(token: string, eventTypeId: number, startTime: string, attendee: any) {
  try {
    console.log("Creating Cal.com booking");
    
    if (!eventTypeId || !startTime || !attendee || !attendee.email || !attendee.name) {
      return new Response(
        JSON.stringify({ error: 'Invalid booking data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Format the booking data for Cal.com API
    const bookingInput = {
      eventTypeId,
      start: startTime,
      end: '', // Cal.com will calculate the end time based on event type duration
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone || 'America/Sao_Paulo',
      language: 'pt',
      metadata: {}
    };
    
    const response = await fetch(`${CAL_COM_API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bookingInput)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error creating Cal.com booking:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create booking', details: errorData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("Successfully created booking");
    
    return new Response(
      JSON.stringify({ success: true, booking: data.booking }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error creating booking:", error);
    return new Response(
      JSON.stringify({ error: 'Error creating booking', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
