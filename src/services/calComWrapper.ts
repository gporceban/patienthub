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
 * Type for Cal.com event type
 */
export type CalComEventType = {
  id: number;
  title: string;
  slug: string;
  length: number;
  description?: string;
  locations?: Array<{type: string}>;
};

/**
 * Type for Cal.com schedule/availability
 */
export type CalComSchedule = {
  id: number;
  name: string;
  timeZone: string;
  availability: Array<{
    days: number[];
    startTime: string;
    endTime: string;
  }>;
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
    console.log('Generating Cal.com OAuth URL with redirect URI:', redirectUri);
    
    // Make sure the redirectUri is properly encoded
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    
    // Create and return the OAuth URL
    const oauthUrl = `https://cal.com/auth/oauth?client_id=${this.clientId}&redirect_uri=${encodedRedirectUri}&scope=${this.scope}&response_type=code`;
    
    console.log('Generated OAuth URL:', oauthUrl);
    return oauthUrl;
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
   */
  public async getBookings(userId?: string): Promise<CalComBooking[] | null> {
    try {
      console.log('Fetching Cal.com bookings');
      
      // If no userId is provided, use the current mock data
      if (!userId) {
        // Mock data for development purposes
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
      }
      
      // If userId is provided, use the bookings edge function
      const response = await supabase.functions.invoke('cal-com-bookings', {
        body: { action: 'get-bookings', userId }
      });
      
      if (response.error) {
        console.error('Error fetching bookings from Cal.com:', response.error);
        return null;
      }
      
      if (!response.data || !response.data.bookings) {
        console.log('No bookings found in Cal.com');
        return [];
      }
      
      // Transform the response to match the CalComBooking type
      const bookings: CalComBooking[] = response.data.bookings.map((booking: any) => ({
        id: booking.id,
        title: booking.title || booking.eventType?.title || 'Consulta',
        description: booking.description,
        startTime: booking.startTime,
        endTime: booking.endTime,
        attendees: booking.attendees || [],
        status: booking.status,
        location: booking.location || 'Consultório'
      }));
      
      return bookings;
    } catch (error) {
      console.error('Error fetching Cal.com bookings:', error);
      return null;
    }
  }

  /**
   * Get event types from Cal.com
   */
  public async getEventTypes(userId: string): Promise<CalComEventType[] | null> {
    try {
      console.log('Fetching Cal.com event types for user:', userId);
      
      const response = await supabase.functions.invoke('cal-com-bookings', {
        body: { 
          action: 'get-event-types',
          userId
        }
      });
      
      if (response.error) {
        console.error('Error fetching event types from Cal.com:', response.error);
        return null;
      }
      
      if (!response.data || !response.data.eventTypes) {
        console.log('No event types found in Cal.com');
        return [];
      }
      
      return response.data.eventTypes;
    } catch (error) {
      console.error('Error fetching Cal.com event types:', error);
      return null;
    }
  }

  /**
   * Create a new event type in Cal.com
   */
  public async createEventType(
    userId: string,
    eventType: {
      title: string;
      slug: string;
      length: number;
      description?: string;
      locations?: Array<{type: string}>;
    }
  ): Promise<CalComEventType | null> {
    try {
      console.log('Creating Cal.com event type for user:', userId);
      
      const response = await supabase.functions.invoke('cal-com-bookings', {
        body: { 
          action: 'create-event-type',
          userId,
          eventType
        }
      });
      
      if (response.error) {
        console.error('Error creating event type in Cal.com:', response.error);
        return null;
      }
      
      console.log('Successfully created Cal.com event type:', response.data);
      return response.data.eventType;
    } catch (error) {
      console.error('Error creating Cal.com event type:', error);
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
      
      // Call the edge function to set availability
      const response = await supabase.functions.invoke('cal-com-bookings', {
        body: { 
          action: 'create-schedule',
          userId,
          name: 'Default Schedule',
          timeZone: schedule.timezone || 'America/Sao_Paulo',
          availability: [{
            days: schedule.days,
            startTime: schedule.startTime,
            endTime: schedule.endTime
          }]
        }
      });
      
      if (response.error) {
        console.error('Error creating availability in Cal.com:', response.error);
        return false;
      }
      
      console.log('Successfully created Cal.com availability:', response.data);
      return true;
    } catch (error) {
      console.error('Error creating Cal.com availability:', error);
      return false;
    }
  }

  /**
   * Cancel a booking in Cal.com
   */
  public async cancelBooking(userId: string, bookingId: number): Promise<boolean> {
    try {
      console.log('Cancelling booking:', bookingId, 'for user:', userId);
      
      const response = await supabase.functions.invoke('cal-com-bookings', {
        body: { 
          action: 'cancel-booking',
          userId,
          bookingId
        }
      });
      
      if (response.error) {
        console.error('Error cancelling booking in Cal.com:', response.error);
        return false;
      }
      
      console.log('Successfully cancelled Cal.com booking:', response.data);
      return true;
    } catch (error) {
      console.error('Error cancelling Cal.com booking:', error);
      return false;
    }
  }

  /**
   * Reschedule a booking in Cal.com
   */
  public async rescheduleBooking(
    userId: string, 
    bookingId: number,
    newTime: {
      startTime: string;
      endTime: string;
    }
  ): Promise<boolean> {
    try {
      console.log('Rescheduling booking:', bookingId, 'for user:', userId);
      
      const response = await supabase.functions.invoke('cal-com-bookings', {
        body: { 
          action: 'reschedule-booking',
          userId,
          bookingId,
          startTime: newTime.startTime,
          endTime: newTime.endTime
        }
      });
      
      if (response.error) {
        console.error('Error rescheduling booking in Cal.com:', response.error);
        return false;
      }
      
      console.log('Successfully rescheduled Cal.com booking:', response.data);
      return true;
    } catch (error) {
      console.error('Error rescheduling Cal.com booking:', error);
      return false;
    }
  }
}

// Export as a singleton instance
export const calComWrapper = new CalComWrapper();
