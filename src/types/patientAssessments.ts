
import { Database } from "@/integrations/supabase/types";

// Define the status type explicitly to match what we're using
export type AssessmentStatus = 'completed' | 'in_progress' | 'scheduled' | 'canceled';

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
  patient_friendly_summary: string | null; // Optional field for patient-friendly summary
  structured_data: any | null;
  created_at: string;
  updated_at: string;
  // Change this to accept both string and our specific values
  status: string | AssessmentStatus | null;
  appointment_date?: string;
};

// Type-safe query helper for patient_assessments
export const fromPatientAssessments = (supabase: any) => {
  return {
    select: () => {
      console.log("Selecting all patient assessments");
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
      patient_friendly_summary?: string | null;
      structured_data?: any | null;
      status?: string | AssessmentStatus | null;
      id?: string;
    }) => {
      console.log("Inserting patient assessment with values:", JSON.stringify(values, null, 2));
      return supabase.from('patient_assessments').insert(values as any) as any;
    },
    update: (values: Partial<Omit<PatientAssessment, 'id' | 'created_at' | 'updated_at'>>, id: string) => {
      console.log("Updating patient assessment with id:", id, "values:", JSON.stringify(values, null, 2));
      return supabase.from('patient_assessments').update(values as any).eq('id', id) as any;
    },
    getByPatientEmail: (email: string) => {
      console.log("Getting patient assessments by email:", email);
      return supabase
        .from('patient_assessments')
        .select('*')
        .eq('patient_email', email)
        .order('created_at', { ascending: false }) as any;
    },
    getByDoctorId: (doctorId: string) => {
      console.log("Getting patient assessments by doctor id:", doctorId);
      return supabase
        .from('patient_assessments')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false }) as any;
    },
    getByProntuarioId: (prontuarioId: string) => {
      console.log("Getting patient assessments by prontuario id:", prontuarioId);
      return supabase
        .from('patient_assessments')
        .select('*')
        .eq('prontuario_id', prontuarioId)
        .order('created_at', { ascending: false }) as any;
    },
    getById: (id: string) => {
      console.log("Getting patient assessment by id:", id);
      return supabase
        .from('patient_assessments')
        .select('*')
        .eq('id', id)
        .single() as any;
    }
  };
};
