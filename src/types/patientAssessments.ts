
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
  structured_data: any | null;
  created_at: string;
  updated_at: string;
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
      structured_data?: any | null;
      id?: string;
    }) => {
      return supabase.from('patient_assessments').insert(values as any) as any;
    },
    update: (values: Partial<Omit<PatientAssessment, 'id' | 'created_at' | 'updated_at'>>, id: string) => {
      return supabase.from('patient_assessments').update(values as any).eq('id', id) as any;
    }
  };
};
