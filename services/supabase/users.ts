import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';

export function getCurrentUserProfile(userId: string) {
  return supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();
}

export function upsertUserProfile(profile: TablesInsert<'users'>) {
  return supabase
    .from('users')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();
}

export function updateUserProfile(userId: string, patch: TablesUpdate<'users'>) {
  return supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
}
