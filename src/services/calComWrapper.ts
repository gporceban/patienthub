
import { supabase } from '@/integrations/supabase/client';
import { 
  exchangeCodeForToken, 
  getCalComOAuthUrl, 
  getCalComToken, 
  hasCalComConnection, 
  refreshCalComToken, 
  storeCalComToken, 
  getCalComBookings,
  updateCalComAvailability,
  createCalComEventType
} from './calComService';

export interface CalComBooking {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: string;
  attendees?: { email: string; name: string; }[];
  location?: string;
}

export interface CalComAvailability {
  days: number[];
  startTime: string;
  endTime: string;
  timezone: string;
}

class CalComWrapper {
  // OAuth integration
  getOAuthUrl(redirectUri: string): string {
    return getCalComOAuthUrl(redirectUri);
  }

  async exchangeCodeForToken(code: string, redirectUri: string) {
    return await exchangeCodeForToken(code, redirectUri);
  }

  async storeTokens(userId: string, tokenData: any): Promise<boolean> {
    try {
      await storeCalComToken(userId, tokenData);
      return true;
    } catch (error) {
      console.error('Error storing Cal.com tokens:', error);
      return false;
    }
  }

  async isConnected(userId: string): Promise<boolean> {
    return await hasCalComConnection(userId);
  }

  // Bookings management
  async getBookings(forceRefresh = false): Promise<CalComBooking[] | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error('No authenticated user found');
        return null;
      }

      // Try using the function invocation approach with params in the body
      const { data, error } = await supabase.functions.invoke('cal-com-bookings', {
        method: 'GET',
        body: { userId: session.user.id }
      });

      if (error) {
        console.error('Error invoking cal-com-bookings function:', error);
        return null;
      }

      // Transform the bookings into a standardized format
      if (data && data.bookings) {
        return data.bookings.map((booking: any) => ({
          id: booking.id,
          title: booking.title || 'No Title',
          description: booking.description,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          attendees: booking.attendees,
          location: booking.location
        }));
      }

      return null;
    } catch (error) {
      console.error('Error getting bookings:', error);
      return null;
    }
  }

  async getBookingsByDateRange(startDate: Date, endDate: Date): Promise<CalComBooking[] | null> {
    try {
      const bookings = await this.getBookings();
      if (!bookings) return null;
      
      // Filter bookings to those within the date range
      return bookings.filter(booking => {
        const bookingDate = new Date(booking.startTime);
        return bookingDate >= startDate && bookingDate <= endDate;
      });
    } catch (error) {
      console.error('Error getting bookings by date range:', error);
      return null;
    }
  }

  async getBookingsForDate(date: Date): Promise<CalComBooking[] | null> {
    try {
      const bookings = await this.getBookings();
      if (!bookings) return null;
      
      // Set start and end times for the provided date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Filter bookings to those within the specified date
      return bookings.filter(booking => {
        const bookingDate = new Date(booking.startTime);
        return bookingDate >= startOfDay && bookingDate <= endOfDay;
      });
    } catch (error) {
      console.error('Error getting bookings for date:', error);
      return null;
    }
  }

  // Availability management
  async createAvailability(userId: string, availability: CalComAvailability): Promise<boolean> {
    try {
      const token = await getCalComToken(userId);
      if (!token) {
        console.error('Cal.com token not found');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('cal-com-bookings', {
        method: 'POST',
        body: { userId, action: 'availability', availability }
      });

      if (error) {
        console.error('Error creating availability:', error);
        return false;
      }

      return data && data.success;
    } catch (error) {
      console.error('Error creating availability:', error);
      return false;
    }
  }

  // Event types management
  async getEventTypes(): Promise<any[] | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error('No authenticated user found');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('cal-com-bookings', {
        method: 'GET',
        body: { userId: session.user.id, action: 'event-types' }
      });

      if (error) {
        console.error('Error fetching event types:', error);
        return null;
      }

      return data && data.eventTypes ? data.eventTypes : null;
    } catch (error) {
      console.error('Error getting event types:', error);
      return null;
    }
  }

  // Calendar integration
  async createBooking(eventTypeId: number, startTime: string, attendeeDetails: { name: string, email: string, timeZone?: string }): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.error('No authenticated user found');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('cal-com-bookings', {
        method: 'POST',
        body: { 
          userId: session.user.id, 
          action: 'create-booking',
          eventTypeId, 
          startTime, 
          attendee: attendeeDetails 
        }
      });

      if (error) {
        console.error('Error creating booking:', error);
        return false;
      }

      return data && data.success;
    } catch (error) {
      console.error('Error creating booking:', error);
      return false;
    }
  }
}

export const calComWrapper = new CalComWrapper();
