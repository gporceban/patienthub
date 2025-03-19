
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
    insert: (values: Omit<Notification, 'id' | 'created_at'>) => {
      return supabase.from('doctor_notifications').insert(values) as any;
    }
  };
};

// Get notifications based on user type
export const getNotifications = (supabase: any, userType: string, userId: string) => {
  if (userType === 'medico') {
    return fromDoctorNotifications(supabase).getByDoctorId(userId);
  }
  
  // Future implementation for patient notifications
  // For now, return empty array for patients
  return Promise.resolve({ data: [], error: null });
};
