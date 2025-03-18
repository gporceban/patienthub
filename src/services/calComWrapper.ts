
import { supabase } from '@/integrations/supabase/client';

/**
 * Type for Cal.com OAuth token response
 */
type CalComTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

/**
 * Type for Cal.com user creation response
 */
type CalComUserResponse = {
  success: boolean;
  calComUserId?: number;
  error?: string;
};

/**
 * Type for Cal.com booking data
 */
export type CalComBooking = {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees: Array<{
    email: string;
    name: string;
  }>;
  status: string;
  location?: string;
};

/**
 * Type for the mock booking data structure
 */
type BookingResponseData = {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees: Array<{
    email: string;
    name: string;
  }>;
  status: string;
  location?: string;
  object?: string;
};

/**
 * Cal.com integration wrapper class
 * Provides a simplified interface for interacting with Cal.com API
 * and integrates with Supabase database
 */
class CalComWrapper {
  private clientId = 'cm8cfb46t00dtp81l5a5yre86';
  private clientSecret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcmVEZWZhdWx0RXZlbnRUeXBlc0VuYWJsZWQiOmZhbHNlLCJuYW1lIjoiRHIuIFBvcmNlYmFuIiwicGVybWlzc2lvbnMiOjEwMjMsInJlZGlyZWN0VXJpcyI6WyJodHRwczovL2FpLmRyZ3VpbGhlcm1lcG9yY2ViYW4uY29tLmJyL3BhY2llbnRlL2NhbGVuZGFyaW8iXSwiYm9va2luZ1JlZGlyZWN0VXJpIjoiaHR0cHM6Ly9haS5kcmd1aWxoZXJtZXBvcmNlYmFuLmNvbS5ici9wYWNpZW50ZS9jYWxlbmRhcmlvIiwiYm9va2luZ0NhbmNlbFJlZGlyZWN0VXJpIjoiaHR0cHM6Ly9haS5kcmd1aWxoZXJtZXBvcmNlYmFuLmNvbS5ici9wYWNpZW50ZS9jYWxlbmRhcmlvL2NhbmNlbCIsImJvb2tpbmdSZXNjaGVkdWxlUmVkaXJlY3RVcmkiOiJodHRwczovL2FpLmRyZ3VpbGhlcm1lcG9yY2ViYW4uY29tLmJyL3BhY2llbnRlL2NhbGVuZGFyaW8vYXNzZXNzbWVudCIsImFyZUVtYWlsc0VuYWJsZWQiOnRydWUsImlhdCI6MTc0MjE3NzE3NX0.ruccBtCPGcDWwuuDBkBYOdraCPNHnvdCrr6OPZQw0KU';
  private scope = 'availability calendar bookings profile';

  /**
   * Generate Cal.com OAuth URL
   */
  public getOAuthUrl(redirectUri: string): string {
    return `https://api.cal.com/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${this.scope}&response_type=code`;
  }

  /**
   * Exchange authorization code for access token
   */
  public async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<CalComTokenResponse | null> {
    try {
      console.log('Exchanging code for token with redirect URI:', redirectUri);
      
      const response = await fetch('https://api.cal.com/v2/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
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
      console.log('Successfully obtained token data');
      return tokenData;
    } catch (error) {
      console.error('Failed to exchange code for token:', error);
      return null;
    }
  }

  /**
   * Store Cal.com token in Supabase
   */
  public async storeTokens(userId: string, tokens: CalComTokenResponse): Promise<boolean> {
    try {
      console.log('Storing Cal.com tokens for user:', userId);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          cal_com_token: tokens.access_token,
          cal_com_refresh_token: tokens.refresh_token
        })
        .eq('id', userId);

      if (error) {
        console.error('Error storing Cal.com tokens:', error);
        return false;
      }
      
      console.log('Successfully stored Cal.com tokens');
      return true;
    } catch (error) {
      console.error('Error storing Cal.com token:', error);
      return false;
    }
  }

  /**
   * Get Cal.com token for a user
   */
  public async getToken(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('cal_com_token')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data || !data.cal_com_token) {
        if (error) {
          console.error('Error fetching Cal.com token:', error);
        }
        return null;
      }

      return data.cal_com_token;
    } catch (error) {
      console.error('Error getting Cal.com token:', error);
      return null;
    }
  }

  /**
   * Refresh Cal.com access token using refresh token
   */
  public async refreshToken(userId: string): Promise<string | null> {
    try {
      console.log('Attempting to refresh token for user:', userId);
      
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
      const response = await supabase.functions.invoke('cal-com-refresh', {
        body: { refreshToken: data.cal_com_refresh_token }
      });

      if (response.error) {
        console.error('Error invoking cal-com-refresh function:', response.error);
        return null;
      }

      const newTokenData = response.data;
      
      if (!newTokenData || !newTokenData.accessToken) {
        console.error('Invalid response from cal-com-refresh function:', newTokenData);
        return null;
      }

      // Update stored tokens
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          cal_com_token: newTokenData.accessToken,
          cal_com_refresh_token: newTokenData.refreshToken
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating tokens after refresh:', updateError);
        return null;
      }

      console.log('Successfully refreshed Cal.com token');
      return newTokenData.accessToken;
    } catch (error) {
      console.error('Failed to refresh Cal.com token:', error);
      return null;
    }
  }

  /**
   * Create a Cal.com managed user
   */
  public async createManagedUser(
    userId: string,
    userData: {
      email: string;
      name?: string;
      timeFormat?: 12 | 24;
      weekStart?: string;
      timeZone?: string;
    }
  ): Promise<CalComUserResponse> {
    try {
      console.log('Creating Cal.com managed user for user:', userId);
      
      const response = await supabase.functions.invoke('cal-com-create-user', {
        body: {
          userId,
          userData,
        },
      });

      if (response.error || !response.data) {
        console.error('Error creating Cal.com user:', response.error || 'No data returned');
        return { success: false, error: response.error?.message || 'Unknown error' };
      }

      console.log('Successfully created Cal.com managed user:', response.data);
      return { 
        success: true, 
        calComUserId: response.data.calComUser?.id 
      };
    } catch (error: any) {
      console.error('Failed to create Cal.com managed user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has a Cal.com connection
   */
  public async isConnected(userId: string): Promise<boolean> {
    console.log('Checking Cal.com connection for user:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('cal_com_token')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking Cal.com connection:', error);
        return false;
      }

      return !!data?.cal_com_token;
    } catch (error) {
      console.error('Error checking Cal.com connection:', error);
      return false;
    }
  }

  /**
   * Get bookings from Cal.com 
   * Note: This method uses the Supabase REST API to query bookings
   * due to the auth.user table not being directly accessible via the default client
   */
  public async getBookings(): Promise<CalComBooking[] | null> {
    try {
      console.log('Fetching Cal.com bookings');
      
      // Instead of querying the auth.user table directly (which isn't available in types),
      // let's fetch bookings using a custom RPC function or emulate with a mock response
      
      // For development purposes, return mock data until proper integration is established
      // In production, this should be replaced with actual API calls or RPC functions
      
      // Sample mock data that matches the CalComBooking type
      const mockBookings: CalComBooking[] = [
        {
          id: 1001,
          title: 'Consulta Ortopédica',
          startTime: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(), // tomorrow + 1 hour
          attendees: [
            { email: 'paciente@example.com', name: 'João Silva' }
          ],
          status: 'confirmado',
          location: 'Consultório 3',
          description: 'Avaliação inicial de dor no joelho'
        },
        {
          id: 1002,
          title: 'Acompanhamento Pós-Cirúrgico',
          startTime: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
          endTime: new Date(Date.now() + 172800000 + 1800000).toISOString(), // day after tomorrow + 30 min
          attendees: [
            { email: 'maria@example.com', name: 'Maria Oliveira' }
          ],
          status: 'pendente',
          location: 'Consultório 2',
          description: 'Verificação de pontos e avaliação de recuperação'
        }
      ];

      console.log('Successfully fetched mock Cal.com bookings');
      return mockBookings;
      
      // In a real implementation, we would use an RPC function or edge function
      // that has the necessary permissions to query the foreign table
      /*
      const { data, error } = await supabase.rpc('get_calcom_bookings');
      
      if (error) {
        console.error('Error fetching bookings from Cal.com:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log('No bookings found in Cal.com');
        return [];
      }
      
      return data;
      */
    } catch (error) {
      console.error('Error fetching Cal.com bookings:', error);
      return null;
    }
  }

  /**
   * Create availability for a doctor
   */
  public async createAvailability(
    userId: string, 
    schedule: { 
      days: number[], 
      startTime: string, 
      endTime: string,
      timezone?: string
    }
  ): Promise<boolean> {
    try {
      console.log('Creating availability for user:', userId, 'with schedule:', schedule);
      
      // For now, this is a placeholder. In a real implementation, we would:
      // 1. Get the Cal.com token for the user
      // 2. Call the Cal.com API to create availability
      
      // Simulate a successful response
      // In production, this should call an actual API or edge function
      console.log('Successfully created mock availability for doctor');
      return true;
    } catch (error) {
      console.error('Error creating Cal.com availability:', error);
      return false;
    }
  }
}

// Export as a singleton instance
export const calComWrapper = new CalComWrapper();
