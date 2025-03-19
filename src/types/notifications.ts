
// Type definition for notifications
export interface Notification {
  id: string;
  doctor_id?: string;
  patient_id?: string;
  title: string;
  message: string;
  icon_type: string;
  created_at: string;
  read: boolean;
}

// Helper for working with doctor notifications
export const fromDoctorNotifications = (supabase: any) => {
  return {
    select: () => {
      return supabase.from('doctor_notifications').select('*') as any;
    },
    getByDoctorId: (doctorId: string) => {
      return supabase.from('doctor_notifications')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false }) as any;
    },
    markAsRead: (doctorId: string, notificationId?: string) => {
      const query = supabase.from('doctor_notifications')
        .update({ read: true });
        
      if (notificationId) {
        return query.eq('id', notificationId).eq('doctor_id', doctorId) as any;
      }
      
      return query.eq('doctor_id', doctorId).eq('read', false) as any;
    },
    insert: (values: Omit<{
      doctor_id: string;
      title: string;
      message: string;
      icon_type: string;
      read: boolean;
    }, 'id' | 'created_at'>) => {
      return supabase.from('doctor_notifications').insert(values) as any;
    }
  };
};

// Helper for working with patient notifications
export const fromPatientNotifications = (supabase: any) => {
  return {
    select: () => {
      return supabase.from('patient_notifications').select('*') as any;
    },
    getByPatientId: (patientId: string) => {
      return supabase.from('patient_notifications')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }) as any;
    },
    markAsRead: (patientId: string, notificationId?: string) => {
      const query = supabase.from('patient_notifications')
        .update({ read: true });
        
      if (notificationId) {
        return query.eq('id', notificationId).eq('patient_id', patientId) as any;
      }
      
      return query.eq('patient_id', patientId).eq('read', false) as any;
    },
    insert: (values: Omit<{
      patient_id: string;
      title: string;
      message: string;
      icon_type: string;
      read: boolean;
    }, 'id' | 'created_at'>) => {
      return supabase.from('patient_notifications').insert(values) as any;
    }
  };
};

// Get notifications based on user type
export const getNotifications = (supabase: any, userType: string, userId: string) => {
  if (userType === 'medico') {
    return fromDoctorNotifications(supabase).getByDoctorId(userId);
  } else if (userType === 'paciente') {
    return fromPatientNotifications(supabase).getByPatientId(userId);
  }
  
  // Return empty array if userType is neither doctor nor patient
  return Promise.resolve({ data: [], error: null });
};

// Mark notifications as read based on user type
export const markNotificationsAsRead = (supabase: any, userType: string, userId: string, notificationId?: string) => {
  if (userType === 'medico') {
    return fromDoctorNotifications(supabase).markAsRead(userId, notificationId);
  } else if (userType === 'paciente') {
    return fromPatientNotifications(supabase).markAsRead(userId, notificationId);
  }
  
  return Promise.resolve({ data: null, error: null });
};
