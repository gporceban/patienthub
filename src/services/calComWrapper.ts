
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
 * Cal.com integration wrapper class
 * Provides a simplified interface for interacting with Cal.com API
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

      return await response.json();
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
          'Authorization': `Bearer ${data.cal_com_refresh_token}`,
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
      const response = await supabase.functions.invoke('cal-com-create-user', {
        body: {
          userId,
          userData,
        },
      });

      if (!response.data) {
        console.error('Error creating Cal.com user:', response.error);
        return { success: false, error: response.error?.message || 'Unknown error' };
      }

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
    const token = await this.getToken(userId);
    return !!token;
  }
}

// Export as a singleton instance
export const calComWrapper = new CalComWrapper();
