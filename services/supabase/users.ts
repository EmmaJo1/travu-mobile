import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

export type UserProfileRow = Tables<'users'>;

function throwIfError(error: Error | null) {
  if (error) {
    throw error;
  }
}

function assertProfile(data: UserProfileRow | null): UserProfileRow {
  if (!data) {
    throw new Error('User profile was not returned from Supabase.');
  }

  return data;
}

export async function fetchMyProfile(): Promise<UserProfileRow | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  throwIfError(authError);

  if (!authData.user) {
    return null;
  }

  return fetchUserById(authData.user.id);
}

export async function fetchUserById(userId: string): Promise<UserProfileRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  throwIfError(error);
  return data;
}

export async function createUserProfile(input: TablesInsert<'users'>): Promise<UserProfileRow> {
  const { data, error } = await supabase
    .from('users')
    .insert(input)
    .select()
    .single();

  throwIfError(error);
  return assertProfile(data);
}

export async function upsertUserProfile(input: TablesInsert<'users'>): Promise<UserProfileRow> {
  const { data, error } = await supabase
    .from('users')
    .upsert(input, { onConflict: 'id' })
    .select()
    .single();

  throwIfError(error);
  return assertProfile(data);
}

export async function updateUserProfile(
  userId: string,
  patch: TablesUpdate<'users'>,
): Promise<UserProfileRow> {
  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .is('deleted_at', null)
    .select()
    .single();

  throwIfError(error);
  return assertProfile(data);
}

export async function softDeleteUserProfile(userId: string): Promise<UserProfileRow> {
  return updateUserProfile(userId, { deleted_at: new Date().toISOString() });
}
