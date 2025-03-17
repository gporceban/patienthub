
import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "@/contexts/AuthContext";
import { useContext } from "react";

// Cal.com API base URL
const CAL_COM_API_URL = "https://api.cal.com/v2";
const CAL_COM_API_KEY = "cal_live_5247aff40f6b3e5b267eff4ed6a9f8be";

// Cal.com OAuth Client credentials
const CAL_COM_CLIENT_ID = "your-cal-com-client-id"; // Replace with your actual client ID
const CAL_COM_CLIENT_SECRET = "your-cal-com-client-secret"; // Replace with your actual client secret

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

// Interface for Cal.com managed user
export interface CalComManagedUser {
  id: number;
  email: string;
  username: string;
  accessToken: string;
  refreshToken: string;
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
      .update({ cal_com_token: calComToken }) // Now this field exists in the DB
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
      .select('cal_com_token') // Now this field exists in the DB
      .eq('id', userId)
      .maybeSingle(); // Changed from single() to maybeSingle() to avoid errors
      
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
  return `https://api.cal.com/oauth/authorize?client_id=${CAL_COM_CLIENT_ID}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code`;
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
        client_id: CAL_COM_CLIENT_ID,
        client_secret: CAL_COM_CLIENT_SECRET,
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

// Create a managed user in Cal.com
export const createCalComManagedUser = async (userData: {
  email: string;
  name?: string;
  timeFormat?: 12 | 24;
  weekStart?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  timeZone?: string;
}) => {
  try {
    const response = await fetch(`${CAL_COM_API_URL}/oauth-clients/${CAL_COM_CLIENT_ID}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cal-secret-key": CAL_COM_CLIENT_SECRET
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create managed user');
    }
    
    const data = await response.json();
    return data.data as { 
      user: { id: number; email: string; username: string }; 
      accessToken: string; 
      refreshToken: string; 
    };
  } catch (error) {
    console.error("Error creating Cal.com managed user:", error);
    return null;
  }
};

// Store Cal.com managed user info in Supabase
export const storeCalComManagedUser = async (
  userId: string, 
  calComUserId: number, 
  accessToken: string, 
  refreshToken: string
) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        cal_com_token: accessToken,
        cal_com_user_id: calComUserId,
        cal_com_refresh_token: refreshToken
      })
      .eq('id', userId);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error storing Cal.com managed user info:", error);
    return { success: false, error };
  }
};

// Refresh Cal.com access token
export const refreshCalComToken = async (refreshToken: string) => {
  try {
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
      throw new Error(errorData.message || 'Failed to refresh token');
    }
    
    const data = await response.json();
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken
    };
  } catch (error) {
    console.error("Error refreshing Cal.com token:", error);
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
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch appointments');
    }
    
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

// Create a token refresh endpoint for Cal.com
export const setupCalComRefreshEndpoint = () => {
  const handleRefreshToken = async (accessToken: string) => {
    try {
      // Fetch the user info from the database using the access token
      const { data, error } = await supabase
        .from('profiles')
        .select('cal_com_refresh_token')
        .eq('cal_com_token', accessToken)
        .maybeSingle();
        
      if (error || !data) {
        throw new Error('Failed to find user with this access token');
      }
      
      const refreshToken = data.cal_com_refresh_token;
      if (!refreshToken) {
        throw new Error('Refresh token not found');
      }
      
      // Get a new token
      const tokens = await refreshCalComToken(refreshToken);
      if (!tokens) {
        throw new Error('Failed to refresh token');
      }
      
      // Update the token in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          cal_com_token: tokens.accessToken,
          cal_com_refresh_token: tokens.refreshToken
        })
        .eq('cal_com_refresh_token', refreshToken);
        
      if (updateError) {
        throw updateError;
      }
      
      return { accessToken: tokens.accessToken };
    } catch (error) {
      console.error('Error in refreshing token:', error);
      throw error;
    }
  };
  
  return handleRefreshToken;
};
