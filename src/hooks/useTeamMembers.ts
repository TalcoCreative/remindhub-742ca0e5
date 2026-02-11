import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .order('display_name');
      if (error) throw error;
      return data?.map((p) => p.display_name).filter(Boolean) as string[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
