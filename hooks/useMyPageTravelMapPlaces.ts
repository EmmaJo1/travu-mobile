import { useQuery } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { fetchMapPlacesByUserId } from '@/services/supabase/places';

export function useMyPageTravelMapPlaces() {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData && Boolean(user?.id),
    queryFn: () => fetchMapPlacesByUserId(user!.id),
    queryKey: supabaseQueryKeys.myTravelMapPlaces(user?.id),
  });
}
