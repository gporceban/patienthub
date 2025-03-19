
import { supabase } from '@/integrations/supabase/client';
import { fromDoctorNotifications, fromPatientNotifications } from '@/types/notifications';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seeds test notifications for a doctor
 * @param doctorId - The doctor's UUID
 */
export const seedDoctorNotifications = async (doctorId: string) => {
  if (!doctorId) return;
  
  const notifications = [
    {
      doctor_id: doctorId,
      title: "Bem-vindo à OrthoCareMosaic",
      message: "Agradecemos por se juntar à nossa plataforma. Explore os recursos disponíveis para médicos.",
      icon_type: "info",
      read: false
    },
    {
      doctor_id: doctorId,
      title: "Novo agendamento",
      message: "Um novo paciente agendou uma consulta para a próxima semana.",
      icon_type: "calendar",
      read: false
    },
    {
      doctor_id: doctorId,
      title: "Atualização do sistema",
      message: "Novos recursos foram adicionados à plataforma. Clique para saber mais.",
      icon_type: "info",
      read: false
    }
  ];
  
  try {
    // Fix: Process each notification individually
    for (const notification of notifications) {
      const { error } = await fromDoctorNotifications(supabase).insert(notification);
      
      if (error) {
        console.error('Erro ao criar notificação de teste para médico:', error);
        return { success: false, error };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar notificações de teste para médico:', error);
    return { success: false, error };
  }
};

/**
 * Seeds test notifications for a patient
 * @param patientId - The patient's UUID
 */
export const seedPatientNotifications = async (patientId: string) => {
  if (!patientId) return;
  
  const notifications = [
    {
      patient_id: patientId,
      title: "Bem-vindo ao OrthoCareMosaic",
      message: "Estamos felizes em tê-lo como paciente. Explore os recursos disponíveis para acompanhar seu tratamento.",
      icon_type: "info",
      read: false
    },
    {
      patient_id: patientId,
      title: "Lembrete de consulta",
      message: "Você tem uma consulta agendada para breve. Não se esqueça de comparecer.",
      icon_type: "calendar",
      read: false
    },
    {
      patient_id: patientId,
      title: "Novo exercício recomendado",
      message: "Seu médico adicionou uma nova recomendação de exercício ao seu plano de tratamento.",
      icon_type: "alert",
      read: false
    }
  ];
  
  try {
    // Fix: Process each notification individually
    for (const notification of notifications) {
      const { error } = await fromPatientNotifications(supabase).insert(notification);
      
      if (error) {
        console.error('Erro ao criar notificação de teste para paciente:', error);
        return { success: false, error };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar notificações de teste para paciente:', error);
    return { success: false, error };
  }
};

/**
 * Creates a notification for a doctor
 */
export const createDoctorNotification = async (doctorId: string, title: string, message: string, iconType: string = 'info') => {
  if (!doctorId) return { success: false, error: 'Doctor ID is required' };
  
  try {
    const { error } = await fromDoctorNotifications(supabase).insert({
      doctor_id: doctorId,
      title,
      message,
      icon_type: iconType,
      read: false
    });
    
    if (error) {
      console.error('Erro ao criar notificação para médico:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar notificação para médico:', error);
    return { success: false, error };
  }
};

/**
 * Creates a notification for a patient
 */
export const createPatientNotification = async (patientId: string, title: string, message: string, iconType: string = 'info') => {
  if (!patientId) return { success: false, error: 'Patient ID is required' };
  
  try {
    const { error } = await fromPatientNotifications(supabase).insert({
      patient_id: patientId,
      title,
      message,
      icon_type: iconType,
      read: false
    });
    
    if (error) {
      console.error('Erro ao criar notificação para paciente:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar notificação para paciente:', error);
    return { success: false, error };
  }
};
