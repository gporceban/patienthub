
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
    const action = url.searchParams.get('action') || 'bookings';
    
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
      .select('cal_com_token, cal_com_refresh_token, email')
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
              
              // Transform the data to a standardized format
              const transformedBookings = bookingsData.bookings ? bookingsData.bookings.map((booking: any) => ({
                id: booking.id,
                title: booking.title || 'Consulta',
                description: booking.description,
                startTime: booking.startTime,
                endTime: booking.endTime,
                status: booking.status,
                attendees: booking.attendees,
                location: booking.location,
              })) : [];
              
              return new Response(
                JSON.stringify({ bookings: transformedBookings }),
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
          
          // Transform the data to a standardized format
          const transformedBookings = data.bookings ? data.bookings.map((booking: any) => ({
            id: booking.id,
            title: booking.title || 'Consulta',
            description: booking.description,
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status,
            attendees: booking.attendees,
            location: booking.location,
          })) : [];
          
          return new Response(
            JSON.stringify({ bookings: transformedBookings }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // POST /bookings - Create a new booking
        if (req.method === 'POST') {
          console.log("Creating a new booking");
          
          const { eventTypeId, startTime, attendee } = requestBody as any;
          
          if (!eventTypeId || !startTime || !attendee) {
            return new Response(
              JSON.stringify({ error: 'Missing required fields: eventTypeId, startTime, or attendee' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const bookingData = {
            eventTypeId,
            start: startTime,
            end: null, // Cal.com will calculate this based on event type duration
            attendees: [{
              email: attendee.email,
              name: attendee.name,
              timeZone: attendee.timeZone || 'America/Sao_Paulo'
            }],
            timeZone: attendee.timeZone || 'America/Sao_Paulo'
          };
          
          const response = await fetch(`${CAL_COM_API_URL}/bookings`, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userData.cal_com_token}`
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

          const data = await response.json();
          return new Response(
            JSON.stringify({ success: true, booking: data }),
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
            JSON.stringify({ eventTypes: data.event_types || [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // POST /event-types - Create a new event type
        if (req.method === 'POST') {
          console.log("Creating a new event type");
          const { title, slug, length, description, locations } = requestBody as any;
          
          if (!title || !slug || !length) {
            return new Response(
              JSON.stringify({ error: 'Missing required fields: title, slug, or length' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const eventTypeData = {
            title,
            slug,
            length, // in minutes
            description: description || "",
            locations: locations || [{ type: "inPerson" }]
          };
          
          const response = await fetch(`${CAL_COM_API_URL}/event-types`, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userData.cal_com_token}`
            },
            body: JSON.stringify(eventTypeData)
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
            JSON.stringify({ success: true, eventType: data }),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }
      
      case 'availability': {
        // POST /availability - Create or update availability
        if (req.method === 'POST') {
          console.log("Creating/updating availability");
          const { availability } = requestBody as any;
          
          if (!availability || !availability.days || !availability.startTime || !availability.endTime) {
            return new Response(
              JSON.stringify({ error: 'Missing required availability fields: days, startTime, or endTime' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // First, get schedules to find ID or create a new one
          const schedulesResponse = await fetch(`${CAL_COM_API_URL}/schedules`, {
            method: 'GET',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userData.cal_com_token}`
            }
          });
          
          if (!schedulesResponse.ok) {
            const errorData = await schedulesResponse.json();
            console.error("Error fetching schedules:", errorData);
            return new Response(
              JSON.stringify({ error: 'Failed to fetch schedules', details: errorData }),
              { status: schedulesResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const schedulesData = await schedulesResponse.json();
          let scheduleId = schedulesData.schedules && schedulesData.schedules.length > 0 
                            ? schedulesData.schedules[0].id 
                            : null;
          
          // If no schedule exists, create one
          if (!scheduleId) {
            const createScheduleResponse = await fetch(`${CAL_COM_API_URL}/schedules`, {
              method: 'POST',
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${userData.cal_com_token}`
              },
              body: JSON.stringify({
                name: "Default Schedule",
                timeZone: availability.timezone
              })
            });
            
            if (!createScheduleResponse.ok) {
              const errorData = await createScheduleResponse.json();
              console.error("Error creating schedule:", errorData);
              return new Response(
                JSON.stringify({ error: 'Failed to create schedule', details: errorData }),
                { status: createScheduleResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            const createScheduleData = await createScheduleResponse.json();
            scheduleId = createScheduleData.id;
          }
          
          // Now update the schedule with availability
          const availabilityData = {
            timeZone: availability.timezone,
            name: "Default Schedule",
            schedule: availability.days.map((day: number) => ({
              days: [day],
              startTime: availability.startTime,
              endTime: availability.endTime
            }))
          };
          
          const updateResponse = await fetch(`${CAL_COM_API_URL}/schedules/${scheduleId}`, {
            method: 'PUT',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userData.cal_com_token}`
            },
            body: JSON.stringify(availabilityData)
          });
          
          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error("Error updating availability:", errorData);
            return new Response(
              JSON.stringify({ error: 'Failed to update availability', details: errorData }),
              { status: updateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const updateData = await updateResponse.json();
          return new Response(
            JSON.stringify({ success: true, schedule: updateData }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }
      
      case 'create-booking': {
        // POST /create-booking - Create a new booking directly
        if (req.method === 'POST') {
          const { eventTypeId, startTime, attendee } = requestBody as any;
          
          if (!eventTypeId || !startTime || !attendee || !attendee.email || !attendee.name) {
            return new Response(
              JSON.stringify({ error: 'Missing required booking details' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const bookingData = {
            start: startTime,
            eventTypeId: eventTypeId,
            attendee: {
              name: attendee.name,
              email: attendee.email,
              timeZone: attendee.timeZone || 'America/Sao_Paulo'
            }
          };
          
          const response = await fetch(`${CAL_COM_API_URL}/bookings`, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userData.cal_com_token}`
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

          const data = await response.json();
          return new Response(
            JSON.stringify({ success: true, booking: data }),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
