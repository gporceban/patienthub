
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

// Function to seed test notifications if none exist
export const seedTestNotifications = async (supabase: any, userType: string, userId: string) => {
  try {
    // First check if notifications already exist
    const { data: existingData, error: checkError } = await getNotifications(supabase, userType, userId);
    
    if (checkError) throw checkError;
    
    // If notifications already exist, don't seed
    if (existingData && existingData.length > 0) {
      console.log('Notifications already exist, not seeding test data');
      return;
    }
    
    console.log('No notifications found, seeding test data');
    
    const testNotifications = [];
    const now = new Date();
    
    if (userType === 'medico') {
      testNotifications.push({
        doctor_id: userId,
        title: 'Nova solicitação de consulta',
        message: 'Nova solicitação de consulta de Rodrigo Alves.',
        icon_type: 'calendar',
        read: false
      });
      
      testNotifications.push({
        doctor_id: userId,
        title: 'Consulta reagendada',
        message: 'Consulta com Maria Silva reagendada para 28/11.',
        icon_type: 'calendar',
        read: false
      });
      
      testNotifications.push({
        doctor_id: userId,
        title: 'Novo paciente cadastrado',
        message: 'Novo paciente cadastrado: João Pereira.',
        icon_type: 'patient',
        read: false
      });
      
      for (const notification of testNotifications) {
        const { error } = await fromDoctorNotifications(supabase).insert(notification);
        if (error) throw error;
      }
    } else if (userType === 'paciente') {
      testNotifications.push({
        patient_id: userId,
        title: 'Consulta confirmada',
        message: 'Sua consulta para o dia 15/11 foi confirmada.',
        icon_type: 'calendar',
        read: false
      });
      
      testNotifications.push({
        patient_id: userId,
        title: 'Resultados disponíveis',
        message: 'Seus resultados de exames estão disponíveis para visualização.',
        icon_type: 'info',
        read: false
      });
      
      for (const notification of testNotifications) {
        const { error } = await fromPatientNotifications(supabase).insert(notification);
        if (error) throw error;
      }
    }
    
    console.log('Test notifications seeded successfully');
  } catch (error) {
    console.error('Error seeding test notifications:', error);
  }
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
