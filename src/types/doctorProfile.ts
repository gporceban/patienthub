
import { Database } from "@/integrations/supabase/types";

// This is your custom Doctor Profile type
export type DoctorProfile = {
  id: string;
  license_number: string;
  specialty: string;
  biography: string;
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
      biography: string;
    }) => {
      return supabase.from('doctors').insert(values) as any;
    },
    update: (values: Partial<Omit<DoctorProfile, 'id' | 'created_at' | 'updated_at'>>, id: string) => {
      return supabase.from('doctors').update(values).eq('id', id) as any;
    }
  };
};
