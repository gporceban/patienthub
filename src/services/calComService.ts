
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
    console.log("Exchanging code for token with redirectUri:", redirectUri);
    
    const response = await fetch('https://api.cal.com/v1/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: 'cm8cfb46t00dtp81l5a5yre86',
        client_secret: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcmVEZWZhdWx0RXZlbnRUeXBlc0VuYWJsZWQiOmZhbHNlLCJuYW1lIjoiRHIuIFBvcmNlYmFuIiwicGVybWlzc2lvbnMiOjEwMjMsInJlZGlyZWN0VXJpcyI6WyJodHRwczovL2FpLmRyZ3VpbGhlcm1lcG9yY2ViYW4uY29tLmJyL3BhY2llbnRlL2NhbGVuZGFyaW8iXSwiYm9va2luZ1JlZGlyZWN0VXJpIjoiaHR0cHM6Ly9haS5kcmd1aWxoZXJtZXBvcmNlYmFuLmNvbS5ici9wYWNpZW50ZS9jYWxlbmRhcmlvIiwiYm9va2luZ0NhbmNlbFJlZGlyZWN0VXJpIjoiaHR0cHM6Ly9haS5kcmd1aWxoZXJtZXBvcmNlYmFuLmNvbS5ici9wYWNpZW50ZS9jYWxlbmRhcmlvL2NhbmNlbCIsImJvb2tpbmdSZXNjaGVkdWxlUmVkaXJlY3RVcmkiOiJodHRwczovL2FpLmRyZ3VpbGhlcm1lcG9yY2ViYW4uY29tLmJyL3BhY2llbnRlL2NhbGVuZGFyaW8vYXNzZXNzbWVudCIsImFyZUVtYWlsc0VuYWJsZWQiOnRydWUsImlhdCI6MTc0MjE3NzE3NX0.ruccBtCPGcDWwuuDBkBYOdraCPNHnvdCrr6OPZQw0KU',
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

    const tokenData = await response.json();
    console.log("Token data received:", tokenData);
    
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in || 3600
    };
  } catch (error) {
    console.error('Failed to exchange code for token:', error);
    return null;
  }
};

/**
 * Check if a specific column exists in a table
 */
async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('get_columns_for_table', { table_name: tableName });
    
    if (error) {
      console.error('Error checking column existence:', error);
      return false;
    }
    
    return data?.some(column => column.column_name === columnName) || false;
  } catch (error) {
    console.error('Error in checkColumnExists:', error);
    return false;
  }
}

/**
 * Store Cal.com token in Supabase
 */
export const storeCalComToken = async (userId: string, tokenData: CalComTokenResponse): Promise<void> => {
  try {
    console.log("Storing Cal.com token for user:", userId);
    
    // Check if the cal_com_token_expires_at column exists
    const hasExpiresAtColumn = await checkColumnExists('profiles', 'cal_com_token_expires_at');
    
    // Create a base update object with the columns we know exist
    const updateData: Record<string, any> = { 
      cal_com_token: tokenData.access_token,
      cal_com_refresh_token: tokenData.refresh_token,
    };
    
    // Only add the expires_at field if the column exists
    if (hasExpiresAtColumn) {
      updateData.cal_com_token_expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    }
    
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Error storing Cal.com token:', error);
      throw error;
    }
    
    console.log("Cal.com token stored successfully");
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
    // Check if the cal_com_token_expires_at column exists
    const hasExpiresAtColumn = await checkColumnExists('profiles', 'cal_com_token_expires_at');
    
    // Select only the necessary fields
    const query = supabase
      .from('profiles')
      .select(hasExpiresAtColumn ? 'cal_com_token, cal_com_token_expires_at' : 'cal_com_token')
      .eq('id', userId)
      .maybeSingle();
    
    const { data, error } = await query;

    if (error) {
      console.error('Error getting Cal.com token:', error);
      return null;
    }
    
    if (!data || !data.cal_com_token) {
      console.log("No Cal.com token found for user:", userId);
      return null;
    }

    // Check if token is expired (if we have expiration data)
    if (hasExpiresAtColumn && data.cal_com_token_expires_at) {
      const expiresAt = new Date(data.cal_com_token_expires_at);
      if (expiresAt <= new Date()) {
        console.log("Cal.com token expired, refreshing...");
        return refreshCalComToken(userId);
      }
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
      console.error('No refresh token found for user:', error || 'No refresh token in data');
      return null;
    }

    console.log("Refreshing Cal.com token using refresh token");
    
    // Call the edge function to refresh the token
    const { data: tokenData, error: functionError } = await supabase.functions.invoke('cal-com-refresh', {
      body: { refreshToken: data.cal_com_refresh_token }
    });

    if (functionError || !tokenData || !tokenData.accessToken) {
      console.error('Error refreshing token:', functionError || 'Invalid response');
      return null;
    }

    console.log("Received new access token from refresh");
    
    // Check if the cal_com_token_expires_at column exists
    const hasExpiresAtColumn = await checkColumnExists('profiles', 'cal_com_token_expires_at');
    
    // Create update object based on available columns
    const updateData: Record<string, any> = {
      cal_com_token: tokenData.accessToken,
      cal_com_refresh_token: tokenData.refreshToken,
    };
    
    if (hasExpiresAtColumn && tokenData.expiresIn) {
      updateData.cal_com_token_expires_at = new Date(Date.now() + tokenData.expiresIn * 1000).toISOString();
    }
    
    // Store the refreshed tokens
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
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
 * Generate Cal.com OAuth URL
 */
export const getCalComOAuthUrl = (redirectUri: string): string => {
  const clientId = 'cm8cfb46t00dtp81l5a5yre86'; 
  const scope = 'availability calendar bookings profile'; 
  
  const authUrl = `https://app.cal.com/auth/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
  console.log("Generated Cal.com OAuth URL:", authUrl);
  
  return authUrl;
};

/**
 * Check if user has an active Cal.com connection
 */
export const hasCalComConnection = async (userId: string): Promise<boolean> => {
  try {
    console.log("Checking Cal.com connection for user:", userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('cal_com_token, cal_com_refresh_token')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking Cal.com connection:', error);
      return false;
    }
    
    const hasConnection = !!data?.cal_com_token && !!data?.cal_com_refresh_token;
    console.log("Cal.com connection status:", hasConnection);
    
    return hasConnection;
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
