
import { supabase } from '@/integrations/supabase/client';

// Type for OAuth token response
type CalComTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

/**
 * Exchange authorization code for access token
 */
export const exchangeCodeForToken = async (
  code: string,
  redirectUri: string
): Promise<CalComTokenResponse | null> => {
  try {
    const response = await fetch('https://api.cal.com/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: 'cm8cfb46t00dtp81l5a5yre86', // Updated with provided client ID
        client_secret: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcmVEZWZhdWx0RXZlbnRUeXBlc0VuYWJsZWQiOmZhbHNlLCJuYW1lIjoiRHIuIFBvcmNlYmFuIiwicGVybWlzc2lvbnMiOjEwMjMsInJlZGlyZWN0VXJpcyI6WyJodHRwczovL2FpLmRyZ3VpbGhlcm1lcG9yY2ViYW4uY29tLmJyL3BhY2llbnRlL2NhbGVuZGFyaW8iXSwiYm9va2luZ1JlZGlyZWN0VXJpIjoiaHR0cHM6Ly9haS5kcmd1aWxoZXJtZXBvcmNlYmFuLmNvbS5ici9wYWNpZW50ZS9jYWxlbmRhcmlvIiwiYm9va2luZ0NhbmNlbFJlZGlyZWN0VXJpIjoiaHR0cHM6Ly9haS5kcmd1aWxoZXJtZXBvcmNlYmFuLmNvbS5ici9wYWNpZW50ZS9jYWxlbmRhcmlvL2NhbmNlbCIsImJvb2tpbmdSZXNjaGVkdWxlUmVkaXJlY3RVcmkiOiJodHRwczovL2FpLmRyZ3VpbGhlcm1lcG9yY2ViYW4uY29tLmJyL3BhY2llbnRlL2NhbGVuZGFyaW8vYXNzZXNzbWVudCIsImFyZUVtYWlsc0VuYWJsZWQiOnRydWUsImlhdCI6MTc0MjE3NzE3NX0.ruccBtCPGcDWwuuDBkBYOdraCPNHnvdCrr6OPZQw0KU', // Updated with provided client secret
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error exchanging code for token:', errorData);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to exchange code for token:', error);
    return null;
  }
};

/**
 * Store Cal.com token in Supabase
 */
export const storeCalComToken = async (userId: string, tokenData: CalComTokenResponse): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        cal_com_token: tokenData.access_token,
        cal_com_refresh_token: tokenData.refresh_token
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error storing Cal.com token:', error);
    throw error;
  }
};

/**
 * Get Cal.com token for a user
 */
export const getCalComToken = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('cal_com_token')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data || !data.cal_com_token) {
      return null;
    }

    return data.cal_com_token;
  } catch (error) {
    console.error('Error getting Cal.com token:', error);
    return null;
  }
};

/**
 * Refresh Cal.com access token using refresh token
 */
export const refreshCalComToken = async (userId: string): Promise<string | null> => {
  try {
    // Get user refresh token
    const { data, error } = await supabase
      .from('profiles')
      .select('cal_com_refresh_token')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data || !data.cal_com_refresh_token) {
      console.error('No refresh token found for user');
      return null;
    }

    // Call the edge function to refresh the token
    const { data: tokenData, error: functionError } = await supabase.functions.invoke('cal-com-refresh', {
      body: { refreshToken: data.cal_com_refresh_token }
    });

    if (functionError || !tokenData || !tokenData.accessToken) {
      console.error('Error refreshing token:', functionError || 'Invalid response');
      return null;
    }

    // Store the refreshed tokens
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        cal_com_token: tokenData.accessToken,
        cal_com_refresh_token: tokenData.refreshToken
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating tokens:', updateError);
      return null;
    }

    return tokenData.accessToken;
  } catch (error) {
    console.error('Failed to refresh Cal.com token:', error);
    return null;
  }
};

/**
 * Create a Cal.com managed user
 */
export const createCalComManagedUser = async (
  userId: string,
  userData: {
    email: string;
    name?: string;
    timeFormat?: 12 | 24;
    weekStart?: string;
    timeZone?: string;
  }
): Promise<{ success: boolean; calComUserId?: number }> => {
  try {
    const { data, error } = await supabase.functions.invoke('cal-com-create-user', {
      body: {
        userId,
        userData,
      },
    });

    if (error || !data) {
      console.error('Error creating Cal.com user:', error || 'No data returned');
      return { success: false };
    }

    return { 
      success: true, 
      calComUserId: data.calComUser?.id 
    };
  } catch (error) {
    console.error('Failed to create Cal.com managed user:', error);
    return { success: false };
  }
};

/**
 * Generate Cal.com OAuth URL
 */
export const getCalComOAuthUrl = (redirectUri: string): string => {
  const clientId = 'cm8cfb46t00dtp81l5a5yre86'; // Updated with provided client ID
  const scope = 'availability calendar bookings profile'; // Adjust scopes as needed
  
  return `https://api.cal.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
};

/**
 * Check if user has an active Cal.com connection
 */
export const hasCalComConnection = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('cal_com_token, cal_com_refresh_token')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return !!data.cal_com_token && !!data.cal_com_refresh_token;
  } catch (error) {
    console.error('Error checking Cal.com connection:', error);
    return false;
  }
};

/**
 * Get Cal.com bookings for a user
 * Makes an API call to fetch bookings from Cal.com
 */
export const getCalComBookings = async (token: string): Promise<any[] | null> => {
  try {
    const response = await fetch('https://api.cal.com/v2/bookings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error fetching Cal.com bookings:', errorData);
      return null;
    }

    const data = await response.json();
    return data.bookings || [];
  } catch (error) {
    console.error('Failed to fetch Cal.com bookings:', error);
    return null;
  }
};

/**
 * Create a new event type in Cal.com
 */
export const createCalComEventType = async (
  token: string,
  eventType: {
    title: string;
    slug: string;
    length: number; // in minutes
    description?: string;
    locations?: Array<{type: string}>;
  }
): Promise<any | null> => {
  try {
    const response = await fetch('https://api.cal.com/v2/event-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(eventType)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error creating Cal.com event type:', errorData);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create Cal.com event type:', error);
    return null;
  }
};

/**
 * Update availability for a Cal.com user
 */
export const updateCalComAvailability = async (
  token: string,
  scheduleId: number,
  availability: {
    name: string;
    timeZone: string;
    schedule: Array<{
      days: number[];
      startTime: string; // format: HH:MM
      endTime: string;   // format: HH:MM
    }>
  }
): Promise<any | null> => {
  try {
    const response = await fetch(`https://api.cal.com/v2/schedules/${scheduleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(availability)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error updating Cal.com availability:', errorData);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to update Cal.com availability:', error);
    return null;
  }
};
