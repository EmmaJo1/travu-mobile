import { useQuery } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { getMyProfile } from '@/services/supabase/auth';
import { useAuth } from '@/providers/AuthProvider';

export function useMyProfile() {
  const { canUseSupabaseUserData, user } = useAuth();

  return useQuery({
    enabled: canUseSupabaseUserData,
    queryFn: getMyProfile,
    queryKey: supabaseQueryKeys.myProfile(user?.id),
  });
}
