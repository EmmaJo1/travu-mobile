import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';

export type UserProfileRow = Tables<'users'>;
export type OnboardingStatus = UserProfileRow['onboarding_status'];

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

async function getAuthenticatedUserId() {
  const { data, error } = await supabase.auth.getUser();
  throwIfError(error);

  if (!data.user) {
    throw new Error('An authenticated user is required.');
  }

  return data.user.id;
}

export async function acceptRequiredLegalDocuments(): Promise<UserProfileRow> {
  const userId = await getAuthenticatedUserId();
  const profile = await fetchUserById(userId);

  if (!profile) {
    throw new Error('User profile was not found.');
  }

  if (profile.terms_accepted_at && profile.privacy_accepted_at) {
    return profile;
  }

  const acceptedAt = new Date().toISOString();

  return updateUserProfile(userId, {
    privacy_accepted_at: profile.privacy_accepted_at ?? acceptedAt,
    terms_accepted_at: profile.terms_accepted_at ?? acceptedAt,
    updated_at: acceptedAt,
  });
}

export async function updateMyOnboardingStatus(
  status: Exclude<OnboardingStatus, 'pending'>,
): Promise<UserProfileRow> {
  const userId = await getAuthenticatedUserId();
  const completedAt = new Date().toISOString();

  return updateUserProfile(userId, {
    onboarding_completed_at: completedAt,
    onboarding_status: status,
    updated_at: completedAt,
  });
}
