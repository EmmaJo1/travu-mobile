import { useQuery } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { fetchArchivedTravelMoments } from '@/services/supabase/travelMoments';

export function useArchivedTravelMoments() {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData,
    queryFn: fetchArchivedTravelMoments,
    queryKey: supabaseQueryKeys.archivedTravelMoments(user?.id),
  });
}
