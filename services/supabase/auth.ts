import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert } from '@/types/supabase';
import {
  fetchMyProfile,
  fetchUserById,
  upsertUserProfile as upsertUserProfileRow,
} from '@/services/supabase/users';

export type AuthProfile = Tables<'users'>;

type NativeSignInResult = {
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

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let hasConfiguredGoogleSignIn = false;

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

function createEmptySignInResult(): NativeSignInResult {
  return {
    profile: null,
    session: null,
    user: null,
  };
}

function isGoogleSignInCancel(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (
      error.code === statusCodes.SIGN_IN_CANCELLED ||
      error.code === statusCodes.IN_PROGRESS
    )
  );
}

function isAppleSignInCancel(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ERR_REQUEST_CANCELED'
  );
}

function configureGoogleSignIn() {
  if (hasConfiguredGoogleSignIn) {
    return true;
  }

  if (!GOOGLE_WEB_CLIENT_ID) {
    console.warn('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID for Google native sign-in.');
    return false;
  }

  GoogleSignin.configure({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ['email', 'profile'],
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
  hasConfiguredGoogleSignIn = true;

  return true;
}

async function signInWithNativeIdToken(
  provider: 'google' | 'apple',
  token: string,
): Promise<NativeSignInResult> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider,
    token,
  });

  throwIfError(error);

  const session = data.session;
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

export async function signInWithGoogle() {
  if (!configureGoogleSignIn()) {
    return createEmptySignInResult();
  }

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const result = await GoogleSignin.signIn();

    if (result.type !== 'success' || !result.data.idToken) {
      return createEmptySignInResult();
    }

    return signInWithNativeIdToken('google', result.data.idToken);
  } catch (error) {
    if (isGoogleSignInCancel(error)) {
      return createEmptySignInResult();
    }

    throw error;
  }
}

export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    console.warn('Apple sign-in is only available on iOS.');
    return createEmptySignInResult();
  }

  const isAvailable = await AppleAuthentication.isAvailableAsync();

  if (!isAvailable) {
    return createEmptySignInResult();
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return createEmptySignInResult();
    }

    return signInWithNativeIdToken('apple', credential.identityToken);
  } catch (error) {
    if (isAppleSignInCancel(error)) {
      return createEmptySignInResult();
    }

    throw error;
  }
}

export async function signOut() {
  if (hasConfiguredGoogleSignIn) {
    await GoogleSignin.signOut().catch(() => {});
  }

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
