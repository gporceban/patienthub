
// Type definition for doctor notifications
export interface Notification {
  id: string;
  doctor_id: string;
  title: string;
  message: string;
  icon_type: string;
  created_at: string;
  read: boolean;
}

// Helper for working with notifications
export const fromNotifications = (supabase: any) => {
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
    markAsRead: (doctorId: string) => {
      return supabase.from('doctor_notifications')
        .update({ read: true })
        .eq('doctor_id', doctorId)
        .eq('read', false) as any;
    },
    insert: (values: Omit<Notification, 'id' | 'created_at'>) => {
      return supabase.from('doctor_notifications').insert(values) as any;
    }
  };
};
