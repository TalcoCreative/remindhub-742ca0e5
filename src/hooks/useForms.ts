import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DbForm = {
  id: string;
  name: string;
  slug: string;
  platform: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DbFormSubmission = {
  id: string;
  form_id: string;
  form_name: string;
  platform: string;
  source_platform: string | null;
  campaign_name: string | null;
  lead_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
};

export function useForms() {
  return useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('forms').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbForm[];
    },
  });
}

export function useCreateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (form: { name: string; slug: string; platform: string }) => {
      const { error } = await supabase.from('forms').insert(form);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
}

export function useToggleForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('forms').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
}

export function useFormSubmissions(filters?: {
  formId?: string;
  platform?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ['form-submissions', filters],
    queryFn: async () => {
      let q = supabase.from('form_submissions').select('*').order('created_at', { ascending: false });
      if (filters?.formId) q = q.eq('form_id', filters.formId);
      if (filters?.platform) q = q.eq('platform', filters.platform);
      if (filters?.source) q = q.eq('source_platform', filters.source);
      if (filters?.dateFrom) q = q.gte('created_at', filters.dateFrom);
      if (filters?.dateTo) q = q.lte('created_at', filters.dateTo);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbFormSubmission[];
    },
  });
}
