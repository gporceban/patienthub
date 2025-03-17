
import { Database } from "@/integrations/supabase/types";

// This is your custom Patient Assessment type
export type PatientAssessment = {
  id: string;
  patient_name: string;
  patient_email: string;
  prontuario_id: string;
  doctor_id: string | null;
  transcription: string | null;
  clinical_note: string | null;
  prescription: string | null;
  summary: string | null;
  patient_friendly_summary: string | null; // New field for patient-friendly summary
  structured_data: any | null;
  created_at: string;
  updated_at: string;
  // Additional fields for the UI
  status?: 'completed' | 'scheduled' | 'canceled';
  appointment_date?: string;
};

// Type-safe query helper for patient_assessments
export const fromPatientAssessments = (supabase: any) => {
  return {
    select: () => {
      return supabase.from('patient_assessments').select('*') as any;
    },
    insert: (values: { 
      patient_email: string; 
      patient_name: string; 
      prontuario_id: string; 
      doctor_id?: string | null;
      transcription?: string | null;
      clinical_note?: string | null;
      prescription?: string | null;
      summary?: string | null;
      patient_friendly_summary?: string | null; // Add to insert type
      structured_data?: any | null;
      id?: string;
    }) => {
      return supabase.from('patient_assessments').insert(values as any) as any;
    },
    update: (values: Partial<Omit<PatientAssessment, 'id' | 'created_at' | 'updated_at'>>, id: string) => {
      return supabase.from('patient_assessments').update(values as any).eq('id', id) as any;
    },
    getByPatientEmail: (email: string) => {
      return supabase
        .from('patient_assessments')
        .select('*')
        .eq('patient_email', email)
        .order('created_at', { ascending: false }) as any;
    },
    getByDoctorId: (doctorId: string) => {
      return supabase
        .from('patient_assessments')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false }) as any;
    },
    getByProntuarioId: (prontuarioId: string) => {
      return supabase
        .from('patient_assessments')
        .select('*')
        .eq('prontuario_id', prontuarioId)
        .order('created_at', { ascending: false }) as any;
    }
  };
};
