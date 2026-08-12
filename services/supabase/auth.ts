import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
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

export type AuthSessionResult = {
  devBypass?: boolean;
  suggestedProfileName?: string | null;
  session: Session | null;
  user: User | null;
};

export type AppleAccountDeletionAuthorizationResult =
  | { status: 'cancelled' }
  | { authorizationCode: string; status: 'authorized' };

type UserMetadata = {
  avatar_url?: unknown;
  full_name?: unknown;
  name?: unknown;
  picture?: unknown;
};

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE;
const AUTH_CALLBACK_URL = 'travumobile://auth/callback';

let hasConfiguredGoogleSignIn = false;

WebBrowser.maybeCompleteAuthSession();

type GoogleSignInResponse =
  | {
      type: 'success';
      data: {
        idToken: string | null;
      };
    }
  | {
      type: 'cancelled';
      data: null;
    };

type GoogleSignInModule = {
  configure: (options: {
    iosClientId?: string;
    scopes?: string[];
    webClientId: string;
  }) => void;
  hasPlayServices: (options: { showPlayServicesUpdateDialog: boolean }) => Promise<boolean>;
  signIn: () => Promise<GoogleSignInResponse>;
  signOut: () => Promise<null>;
};

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

function createEmptySignInResult(): AuthSessionResult {
  return {
    session: null,
    user: null,
  };
}

function getAppleCredentialName(fullName: AppleAuthentication.AppleAuthenticationFullName | null) {
  if (!fullName) {
    return null;
  }

  const name = [fullName.givenName, fullName.middleName, fullName.familyName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim())
    .join(' ');

  return name || null;
}

function isGoogleSignInCancel(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (
      error.code === 'SIGN_IN_CANCELLED' ||
      error.code === 'IN_PROGRESS'
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

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

function shouldUseOAuthInExpoGo() {
  if (AUTH_MODE === 'native') {
    return false;
  }

  return isExpoGo();
}

async function loadGoogleSignInModule(): Promise<GoogleSignInModule> {
  const { GoogleSignin } = await import(
    '@react-native-google-signin/google-signin/lib/module/signIn/GoogleSignin'
  );

  return GoogleSignin;
}

async function configureGoogleSignIn(googleSignIn: GoogleSignInModule) {
  if (hasConfiguredGoogleSignIn) {
    return true;
  }

  if (!GOOGLE_WEB_CLIENT_ID) {
    console.warn('Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID for Google native sign-in.');
    return false;
  }

  googleSignIn.configure({
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
): Promise<AuthSessionResult> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider,
    token,
  });

  throwIfError(error);

  const session = data.session;
  const user = session?.user ?? null;

  return {
    session,
    user,
  };
}

function getUrlParam(url: string, key: string) {
  const parsedUrl = new URL(url);
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
  return parsedUrl.searchParams.get(key) ?? hashParams.get(key);
}

async function completeOAuthSession(callbackUrl: string): Promise<AuthSessionResult> {
  const code = getUrlParam(callbackUrl, 'code');

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    throwIfError(error);

    const session = data.session;
    const user = session?.user ?? null;

    return {
      session,
      user,
    };
  }

  const accessToken = getUrlParam(callbackUrl, 'access_token');
  const refreshToken = getUrlParam(callbackUrl, 'refresh_token');

  if (!accessToken || !refreshToken) {
    return createEmptySignInResult();
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  throwIfError(error);

  const session = data.session;
  const user = session?.user ?? null;

  return {
    session,
    user,
  };
}

async function signInWithGoogleOAuth(): Promise<AuthSessionResult> {
  const redirectTo = AUTH_CALLBACK_URL;
  console.info(`Expo Go OAuth redirectTo: ${redirectTo}`);

  const { data, error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
    provider: 'google',
  });
  throwIfError(error);

  if (!data.url) {
    return createEmptySignInResult();
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_CALLBACK_URL);

  if (result.type !== 'success') {
    return createEmptySignInResult();
  }

  return completeOAuthSession(result.url);
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
  if (shouldUseOAuthInExpoGo()) {
    console.info('Expo Go OAuth mode: starting Supabase Google OAuth sign-in.');
    return signInWithGoogleOAuth();
  }

  const googleSignIn = await loadGoogleSignInModule();

  if (!(await configureGoogleSignIn(googleSignIn))) {
    return createEmptySignInResult();
  }

  try {
    if (Platform.OS === 'android') {
      await googleSignIn.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const result = await googleSignIn.signIn();

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
  if (isExpoGo()) {
    console.info('Apple native login is skipped in Expo Go. Use Google OAuth for Supabase session testing.');
    return createEmptySignInResult();
  }

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

    const result = await signInWithNativeIdToken('apple', credential.identityToken);

    return {
      ...result,
      suggestedProfileName: getAppleCredentialName(credential.fullName),
    };
  } catch (error) {
    if (isAppleSignInCancel(error)) {
      return createEmptySignInResult();
    }

    throw error;
  }
}

export async function getAppleAccountDeletionAuthorizationCode(): Promise<
  AppleAccountDeletionAuthorizationResult
> {
  if (isExpoGo() || Platform.OS !== 'ios') {
    throw new Error('APPLE_REAUTH_UNAVAILABLE');
  }

  if (!(await AppleAuthentication.isAvailableAsync())) {
    throw new Error('APPLE_REAUTH_UNAVAILABLE');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [],
    });
    const authorizationCode = credential.authorizationCode?.trim();

    if (!authorizationCode) {
      throw new Error('APPLE_REAUTH_FAILED');
    }

    return { authorizationCode, status: 'authorized' };
  } catch (error) {
    if (isAppleSignInCancel(error)) {
      return { status: 'cancelled' };
    }

    throw error;
  }
}

export async function clearLocalAuthSession() {
  if (hasConfiguredGoogleSignIn) {
    const googleSignIn = await loadGoogleSignInModule().catch(() => null);
    await googleSignIn?.signOut().catch(() => {});
  }

  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}

export async function signOut() {
  if (hasConfiguredGoogleSignIn) {
    const googleSignIn = await loadGoogleSignInModule().catch(() => null);
    await googleSignIn?.signOut().catch(() => {});
  }

  const { error } = await supabase.auth.signOut();
  throwIfError(error);
}

export async function ensureUserProfile(
  user: User,
  suggestedProfileName?: string | null,
): Promise<AuthProfile> {
  const existingProfile = await fetchUserById(user.id);

  if (existingProfile) {
    return existingProfile;
  }

  return upsertUserProfile({
    id: user.id,
    name: suggestedProfileName?.trim() || getDefaultProfileName(user),
    profile_image_url: getDefaultProfileImageUrl(user),
  });
}

export function upsertUserProfile(profile: TablesInsert<'users'>) {
  return upsertUserProfileRow(profile);
}

export function getMyProfile() {
  return fetchMyProfile();
}
