
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "@/contexts/AuthContext";
import { useContext } from "react";

// Cal.com API base URL
const CAL_COM_API_URL = "https://api.cal.com/v2";
const CAL_COM_API_KEY = "cal_live_5247aff40f6b3e5b267eff4ed6a9f8be";

// Interface for appointment data
export interface CalComAppointment {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees: {
    email: string;
    name: string;
  }[];
  location?: string;
  status: "ACCEPTED" | "PENDING" | "CANCELLED" | "REJECTED";
}

// Helper function to format headers with authentication
const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${CAL_COM_API_KEY}`,
  };
  
  if (token) {
    headers["X-Cal-User-Token"] = token;
  }
  
  return headers;
};

// Store Cal.com user token in Supabase
export const storeCalComToken = async (userId: string, calComToken: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ cal_com_token: calComToken })
      .eq('id', userId);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error storing Cal.com token:", error);
    return { success: false, error };
  }
};

// Get Cal.com user token from Supabase
export const getCalComToken = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('cal_com_token')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return { success: true, token: data?.cal_com_token };
  } catch (error) {
    console.error("Error fetching Cal.com token:", error);
    return { success: false, error };
  }
};

// Hook to get the current user's Cal.com token
export const useCalComToken = () => {
  const { user } = useContext(AuthContext);
  
  const fetchToken = async () => {
    if (!user) return null;
    const { success, token } = await getCalComToken(user.id);
    return success ? token : null;
  };
  
  return { fetchToken };
};

// OAuth redirect URL handler
export const getOAuthRedirectUrl = (callbackUrl: string) => {
  const clientId = "your-cal-com-client-id"; // Replace with your Cal.com Client ID
  const redirectUri = encodeURIComponent(callbackUrl);
  return `https://api.cal.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
};

// Exchange authorization code for token
export const exchangeCodeForToken = async (code: string, redirectUri: string) => {
  try {
    const response = await fetch(`${CAL_COM_API_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: "your-cal-com-client-id", // Replace with your Cal.com Client ID
        client_secret: "your-cal-com-client-secret", // Replace with your Cal.com Client Secret
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    return null;
  }
};

// Get user's appointments
export const fetchUserAppointments = async (token: string) => {
  try {
    const response = await fetch(`${CAL_COM_API_URL}/bookings`, {
      method: "GET",
      headers: getHeaders(token),
    });
    
    const data = await response.json();
    return data.bookings;
  } catch (error) {
    console.error("Error fetching user appointments:", error);
    return [];
  }
};

// Reschedule appointment
export const rescheduleAppointment = async (token: string, bookingId: string, newTime: string) => {
  try {
    const response = await fetch(`${CAL_COM_API_URL}/bookings/${bookingId}/reschedule`, {
      method: "PATCH",
      headers: getHeaders(token),
      body: JSON.stringify({
        start: newTime,
      }),
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    return { success: false, error };
  }
};

// Cancel appointment
export const cancelAppointment = async (token: string, bookingId: string, reason?: string) => {
  try {
    const response = await fetch(`${CAL_COM_API_URL}/bookings/${bookingId}/cancel`, {
      method: "PATCH",
      headers: getHeaders(token),
      body: JSON.stringify({
        reason,
      }),
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    return { success: false, error };
  }
};

// Create new appointment (for doctors)
export const createAppointment = async (token: string, appointmentData: {
  eventTypeId: string;
  inviteeEmail: string;
  inviteeName: string;
  startTime: string;
  endTime: string;
  timeZone: string;
}) => {
  try {
    const response = await fetch(`${CAL_COM_API_URL}/bookings`, {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify(appointmentData),
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error creating appointment:", error);
    return { success: false, error };
  }
};
