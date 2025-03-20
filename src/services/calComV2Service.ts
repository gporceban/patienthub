
import { supabase } from '@/integrations/supabase/client';

interface CalComManagedUserResponse {
  success: boolean;
  calComUser?: {
    id: number;
    email: string;
    username: string;
    name: string;
  };
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  message?: string;
}

interface CalComBooking {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: string;
  attendees?: { email: string; name: string; }[];
  location?: string;
  eventTypeId: number;
}

interface CalComAvailableSlot {
  start: string;
  end: string;
  attendees?: number;
  bookingUid?: string;
}

/**
 * Creates a managed user in Cal.com for the specified Supabase user
 */
export const createCalComManagedUser = async (userId: string): Promise<CalComManagedUserResponse> => {
  try {
    console.log("Creating Cal.com managed user for:", userId);
    
    const { data, error } = await supabase.functions.invoke('cal-com-managed-user', {
      method: 'POST',
      body: {
        userId,
        action: 'create-managed-user'
      }
    });

    if (error) {
      console.error('Error creating Cal.com managed user:', error);
      return { success: false, error: error.message };
    }

    console.log("Cal.com managed user created successfully:", data);
    return data;
  } catch (error: any) {
    console.error('Error in createCalComManagedUser:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Gets bookings for a Cal.com managed user
 */
export const getCalComBookings = async (
  userId: string, 
  status: 'upcoming' | 'past' | 'cancelled' | 'all' = 'upcoming'
): Promise<{ success: boolean; bookings?: CalComBooking[]; error?: string }> => {
  try {
    console.log(`Getting ${status} Cal.com bookings for user:`, userId);
    
    const { data, error } = await supabase.functions.invoke('cal-com-managed-user', {
      method: 'POST',
      body: {
        userId,
        action: 'get-bookings',
        status
      }
    });

    if (error) {
      console.error('Error getting Cal.com bookings:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error: any) {
    console.error('Error in getCalComBookings:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Gets available slots for a specific event type
 */
export const getCalComAvailableSlots = async (
  userId: string,
  eventTypeId: number,
  startTime: string,
  endTime: string
): Promise<{ success: boolean; slots?: CalComAvailableSlot[]; error?: string }> => {
  try {
    console.log(`Getting available slots for event type ${eventTypeId} between ${startTime} and ${endTime}`);
    
    const { data, error } = await supabase.functions.invoke('cal-com-managed-user', {
      method: 'POST',
      body: {
        userId,
        action: 'get-available-slots',
        eventTypeId,
        startTime,
        endTime
      }
    });

    if (error) {
      console.error('Error getting available slots:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error: any) {
    console.error('Error in getCalComAvailableSlots:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reschedules an existing booking
 */
export const rescheduleCalComBooking = async (
  userId: string,
  bookingId: string,
  startTime: string,
  reason?: string
): Promise<{ success: boolean; booking?: any; error?: string }> => {
  try {
    console.log(`Rescheduling booking ${bookingId} to ${startTime}`);
    
    const { data, error } = await supabase.functions.invoke('cal-com-managed-user', {
      method: 'POST',
      body: {
        userId,
        action: 'reschedule-booking',
        bookingId,
        startTime,
        reason
      }
    });

    if (error) {
      console.error('Error rescheduling booking:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error: any) {
    console.error('Error in rescheduleCalComBooking:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Creates a new booking
 */
export const createCalComBooking = async (
  userId: string,
  eventTypeId: number,
  startTime: string,
  endTime: string,
  name: string,
  email: string,
  timeZone?: string,
  language?: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; booking?: any; error?: string }> => {
  try {
    console.log(`Creating booking for event type ${eventTypeId} at ${startTime}`);
    
    const { data, error } = await supabase.functions.invoke('cal-com-managed-user', {
      method: 'POST',
      body: {
        userId,
        action: 'create-booking',
        eventTypeId,
        startTime,
        endTime,
        name,
        email,
        timeZone,
        language,
        metadata
      }
    });

    if (error) {
      console.error('Error creating booking:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error: any) {
    console.error('Error in createCalComBooking:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if a user has a Cal.com managed user account
 */
export const hasCalComManagedUser = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('cal_com_user_id')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking Cal.com managed user:', error);
      return false;
    }
    
    return !!data?.cal_com_user_id;
  } catch (error) {
    console.error('Error in hasCalComManagedUser:', error);
    return false;
  }
};
