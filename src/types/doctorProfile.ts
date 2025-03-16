
import { Database } from "@/integrations/supabase/types";

// This is your custom Doctor Profile type
export type DoctorProfile = {
  id: string;
  license_number: string;
  specialty: string;
  biography: string | null;
  created_at?: string;
  updated_at?: string;
};

// Type-safe query helper for doctors table
export const fromDoctors = (supabase: any) => {
  return {
    select: () => {
      return supabase.from('doctors').select('*') as any;
    },
    insert: (values: { 
      id: string; 
      license_number: string; 
      specialty: string; 
      biography?: string | null;
    }) => {
      return supabase.from('doctors').insert(values) as any;
    },
    update: (values: Partial<Omit<DoctorProfile, 'id' | 'created_at' | 'updated_at'>>, id: string) => {
      return supabase.from('doctors').update(values).eq('id', id) as any;
    },
    getById: (id: string) => {
      return supabase.from('doctors').select('*').eq('id', id).maybeSingle() as any;
    },
    getWithStats: (id: string) => {
      return supabase.rpc('get_doctor_stats', { doctor_id: id }) as any;
    }
  };
};

// Additional type for appointments
export type Appointment = {
  id: string;
  doctor_id: string;
  patient_id: string;
  date_time: string;
  location: string;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

// Helper for working with appointments
export const fromAppointments = (supabase: any) => {
  return {
    select: () => {
      return supabase.from('appointments').select('*') as any;
    },
    getByDoctorId: (doctorId: string) => {
      return supabase.from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('date_time', { ascending: true }) as any;
    },
    getByPatientId: (patientId: string) => {
      return supabase.from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('date_time', { ascending: true }) as any;
    },
    getTodayByDoctorId: (doctorId: string) => {
      const today = new Date().toISOString().split('T')[0];
      return supabase.from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('date_time', `${today}T00:00:00`)
        .lte('date_time', `${today}T23:59:59`)
        .order('date_time', { ascending: true }) as any;
    },
    insert: (values: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => {
      return supabase.from('appointments').insert(values) as any;
    },
    update: (values: Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at'>>, id: string) => {
      return supabase.from('appointments').update(values).eq('id', id) as any;
    },
    delete: (id: string) => {
      return supabase.from('appointments').delete().eq('id', id) as any;
    }
  };
};
