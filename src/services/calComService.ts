
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
export const storeCalComToken = async (userId: string, token: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ cal_com_token: token })
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
    const response = await fetch('/api/cal-com-refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.cal_com_refresh_token}`, // Fixed: using cal_com_refresh_token instead of non-existent cal_com_token
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error refreshing token:', errorData);
      return null;
    }

    const newTokenData = await response.json();
    return newTokenData.accessToken;
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
    const response = await fetch('/functions/v1/cal-com-create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabase.auth.getSession()}`,
      },
      body: JSON.stringify({
        userId,
        userData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error creating Cal.com user:', errorData);
      return { success: false };
    }

    const data = await response.json();
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
