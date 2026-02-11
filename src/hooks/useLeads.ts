import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type DbLead = Tables<'leads'>;
export type DbLeadInsert = TablesInsert<'leads'>;
export type DbLeadUpdate = TablesUpdate<'leads'>;

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates, auditEntries }: {
      id: string;
      updates: DbLeadUpdate;
      auditEntries?: { field_name: string; old_value: string | null; new_value: string | null }[];
    }) => {
      const { error } = await supabase.from('leads').update(updates).eq('id', id);
      if (error) throw error;

      if (auditEntries?.length && user) {
        const entries = auditEntries.map((e) => ({
          lead_id: id,
          user_id: user.id,
          field_name: e.field_name,
          old_value: e.old_value,
          new_value: e.new_value,
        }));
        await supabase.from('lead_audit_log').insert(entries);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: DbLeadInsert) => {
      const { error } = await supabase.from('leads').insert(lead);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useLeadAuditLog(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-audit', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_audit_log')
        .select('*')
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
