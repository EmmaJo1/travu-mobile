import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { AuthError, Provider, Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/types/supabase';
import {
  fetchMyProfile,
  fetchUserById,
  upsertUserProfile as upsertUserProfileRow,
} from '@/services/supabase/users';

WebBrowser.maybeCompleteAuthSession();

export type AuthProfile = Tables<'users'>;

type OAuthResult = {
  profile: AuthProfile | null;
  session: Session | null;
  user: User | null;
};

type UserMetadata = {
  avatar_url?: unknown;
  full_name?: unknown;
  name?: unknown;
  picture?: unknown;
};

const AUTH_CALLBACK_PATH = 'auth/callback';

function throwIfError(error: AuthError | Error | null) {
  if (error) {
    throw error;
  }
}

function getStringMetadataValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function getEmailPrefix(email?: string | null) {
  const prefix = email?.split('@')[0]?.trim();
  return prefix && prefix.length > 0 ? prefix : null;
}

function getDefaultProfileName(user: User) {
  const metadata = user.user_metadata as UserMetadata;

  return (
    getStringMetadataValue(metadata.full_name) ??
    getStringMetadataValue(metadata.name) ??
    getEmailPrefix(user.email) ??
    'User_name'
  );
}

function getDefaultProfileImageUrl(user: User) {
  const metadata = user.user_metadata as UserMetadata;

  return (
    getStringMetadataValue(metadata.avatar_url) ??
    getStringMetadataValue(metadata.picture)
  );
}

function getRedirectTo() {
  return Linking.createURL(AUTH_CALLBACK_PATH);
}

function getAuthCodeFromUrl(url: string) {
  const parsedUrl = new URL(url);
  return parsedUrl.searchParams.get('code');
}

function getSessionTokensFromUrl(url: string) {
  const [, hashParams = ''] = url.split('#');
  const searchParams = new URLSearchParams(hashParams);
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

async function exchangeOAuthCallback(url: string) {
  const tokens = getSessionTokensFromUrl(url);

  if (tokens) {
    const { data, error } = await supabase.auth.setSession(tokens);
    throwIfError(error);
    return data.session;
  }

  const code = getAuthCodeFromUrl(url);

  if (!code) {
    return null;
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  throwIfError(error);
  return data.session;
}

async function signInWithOAuthProvider(provider: Provider): Promise<OAuthResult> {
  const redirectTo = getRedirectTo();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  throwIfError(error);

  if (!data.url) {
    return {
      profile: null,
      session: null,
      user: null,
    };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success') {
    return {
      profile: null,
      session: null,
      user: null,
    };
  }

  const session = await exchangeOAuthCallback(result.url);
  const user = session?.user ?? null;
  const profile = user ? await ensureUserProfile(user) : null;

  return {
    profile,
    session,
    user,
  };
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  throwIfError(error);
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  throwIfError(error);
  return data.user;
}

export function signInWithGoogle() {
  return signInWithOAuthProvider('google');
}

export function signInWithApple() {
  return signInWithOAuthProvider('apple');
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  throwIfError(error);
}

export async function ensureUserProfile(user: User): Promise<AuthProfile> {
  const existingProfile = await fetchUserById(user.id);

  if (existingProfile) {
    return existingProfile;
  }

  return upsertUserProfile({
    id: user.id,
    name: getDefaultProfileName(user),
    profile_image_url: getDefaultProfileImageUrl(user),
  });
}

export function upsertUserProfile(profile: TablesInsert<'users'>) {
  return upsertUserProfileRow(profile);
}

export function getMyProfile() {
  return fetchMyProfile();
}
