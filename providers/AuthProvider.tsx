import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import {
  ensureUserProfile,
  getCurrentSession,
  getMyProfile,
  signInWithApple as signInWithAppleService,
  signInWithGoogle as signInWithGoogleService,
  signOut as signOutService,
  type AuthProfile,
  type AuthSessionResult,
} from '@/services/supabase/auth';

export type AuthInitializationStatus = 'initializing' | 'ready' | 'error';
export type AuthProfileStatus = 'idle' | 'loading' | 'resolved' | 'error';
export type AuthSignInResult = {
  profile: AuthProfile | null;
  status: 'authenticated' | 'cancelled' | 'dev-bypass' | 'profile-error' | 'in-progress';
};

type AuthContextValue = {
  canUseSupabaseUserData: boolean;
  initializationError: Error | null;
  initializationStatus: AuthInitializationStatus;
  isAuthenticated: boolean;
  isDevBypass: boolean;
  isLoading: boolean;
  profile: AuthProfile | null;
  profileError: Error | null;
  profileStatus: AuthProfileStatus;
  refreshProfile: () => Promise<AuthProfile | null>;
  retryInitialization: () => Promise<void>;
  retryProfile: () => Promise<AuthProfile | null>;
  setProfileSnapshot: (profile: AuthProfile) => void;
  session: Session | null;
  signInWithApple: () => Promise<AuthSignInResult>;
  signInWithGoogle: () => Promise<AuthSignInResult>;
  signOut: () => Promise<void>;
  user: User | null;
};

function normalizeAuthError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function isSupabaseUserQuery(queryKey: readonly unknown[]) {
  return queryKey[0] === 'supabase';
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const isMountedRef = useRef(true);
  const authStateVersionRef = useRef(0);
  const initializationStatusRef = useRef<AuthInitializationStatus>('initializing');
  const signInInFlightRef = useRef(false);
  const profileResolutionRef = useRef<{
    promise: Promise<AuthProfile>;
    userId: string;
  } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevBypass, setIsDevBypass] = useState(false);
  const [initializationStatus, setInitializationStatus] =
    useState<AuthInitializationStatus>('initializing');
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const [profileStatus, setProfileStatus] = useState<AuthProfileStatus>('idle');
  const [profileError, setProfileError] = useState<Error | null>(null);

  const updateInitializationStatus = useCallback((nextStatus: AuthInitializationStatus) => {
    initializationStatusRef.current = nextStatus;
    setInitializationStatus(nextStatus);
  }, []);

  const resolveUserProfile = useCallback((
    nextUser: User,
    suggestedProfileName?: string | null,
  ) => {
    const currentResolution = profileResolutionRef.current;

    if (currentResolution?.userId === nextUser.id) {
      return currentResolution.promise;
    }

    const promise = ensureUserProfile(nextUser, suggestedProfileName);
    profileResolutionRef.current = { promise, userId: nextUser.id };
    void promise.then(
      () => {
        if (profileResolutionRef.current?.promise === promise) {
          profileResolutionRef.current = null;
        }
      },
      () => {
        if (profileResolutionRef.current?.promise === promise) {
          profileResolutionRef.current = null;
        }
      },
    );
    return promise;
  }, []);

  const setAuthState = useCallback(async (
    nextSession: Session | null,
    suggestedProfileName?: string | null,
  ) => {
    const authStateVersion = authStateVersionRef.current + 1;
    authStateVersionRef.current = authStateVersion;
    setIsDevBypass(false);
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      if (isMountedRef.current && authStateVersionRef.current === authStateVersion) {
        setProfile(null);
        setProfileError(null);
        setProfileStatus('idle');
      }
      return null;
    }

    setProfileError(null);
    setProfileStatus('loading');

    try {
      const nextProfile = await resolveUserProfile(nextSession.user, suggestedProfileName);

      if (isMountedRef.current && authStateVersionRef.current === authStateVersion) {
        setProfile(nextProfile);
        setProfileStatus('resolved');
      }
      return nextProfile;
    } catch (error) {
      if (isMountedRef.current && authStateVersionRef.current === authStateVersion) {
        setProfile(null);
        setProfileError(normalizeAuthError(error));
        setProfileStatus('error');
      }
      throw error;
    }
  }, [resolveUserProfile]);

  const refreshProfile = useCallback(async () => {
    const nextProfile = await getMyProfile();

    if (isMountedRef.current) {
      authStateVersionRef.current += 1;
      setProfile(nextProfile);
      if (nextProfile) {
        setProfileError(null);
        setProfileStatus('resolved');
      }
    }

    return nextProfile;
  }, []);

  const setProfileSnapshot = useCallback((nextProfile: AuthProfile) => {
    if (isMountedRef.current) {
      authStateVersionRef.current += 1;
      setProfile(nextProfile);
      setProfileError(null);
      setProfileStatus('resolved');
    }
  }, []);

  const completeProviderSignIn = useCallback(async (
    signIn: () => Promise<AuthSessionResult>,
  ): Promise<AuthSignInResult> => {
    if (signInInFlightRef.current) {
      return { profile: null, status: 'in-progress' };
    }

    signInInFlightRef.current = true;
    setIsLoading(true);

    try {
      const result = await signIn();

      if (result.devBypass) {
        if (isMountedRef.current) {
          authStateVersionRef.current += 1;
          setIsDevBypass(true);
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileError(null);
          setProfileStatus('idle');
        }

        return { profile: null, status: 'dev-bypass' };
      }

      if (!result.session?.user) {
        return { profile: null, status: 'cancelled' };
      }

      try {
        const nextProfile = await setAuthState(result.session, result.suggestedProfileName);
        return { profile: nextProfile, status: 'authenticated' };
      } catch {
        return { profile: null, status: 'profile-error' };
      }
    } finally {
      signInInFlightRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [setAuthState]);

  const signInWithGoogle = useCallback(
    () => completeProviderSignIn(signInWithGoogleService),
    [completeProviderSignIn],
  );

  const signInWithApple = useCallback(
    () => completeProviderSignIn(signInWithAppleService),
    [completeProviderSignIn],
  );

  const signOut = useCallback(async () => {
    setIsLoading(true);

    try {
      await queryClient.cancelQueries({
        predicate: (query) => isSupabaseUserQuery(query.queryKey),
      });
      await signOutService();

      if (isMountedRef.current) {
        authStateVersionRef.current += 1;
        profileResolutionRef.current = null;
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setProfileStatus('idle');
        setIsDevBypass(false);
      }

      queryClient.removeQueries({
        predicate: (query) => isSupabaseUserQuery(query.queryKey),
      });
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const retryProfile = useCallback(async () => {
    if (!session?.user) {
      return null;
    }

    setIsLoading(true);
    try {
      return await setAuthState(session);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [session, setAuthState]);

  const initializeAuth = useCallback(async () => {
    updateInitializationStatus('initializing');
    setInitializationError(null);
    setIsLoading(true);

    let currentSession: Session | null;
    try {
      currentSession = await getCurrentSession();
    } catch (error) {
      if (isMountedRef.current && initializationStatusRef.current === 'initializing') {
        setInitializationError(normalizeAuthError(error));
        updateInitializationStatus('error');
      }
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    try {
      await setAuthState(currentSession);
    } catch {
      // setAuthState records profile bootstrap failures separately.
    } finally {
      if (isMountedRef.current) {
        updateInitializationStatus('ready');
        setIsLoading(false);
      }
    }
  }, [setAuthState, updateInitializationStatus]);

  useEffect(() => {
    isMountedRef.current = true;
    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (signInInFlightRef.current && nextSession?.user) {
        return;
      }

      void setAuthState(nextSession).catch(() => undefined).finally(() => {
        if (isMountedRef.current && initializationStatusRef.current === 'initializing') {
          setInitializationError(null);
          updateInitializationStatus('ready');
        }
      });
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [initializeAuth, setAuthState, updateInitializationStatus]);

  const value = useMemo<AuthContextValue>(
    () => ({
      canUseSupabaseUserData: Boolean(session?.user && !isDevBypass),
      initializationError,
      initializationStatus,
      isAuthenticated: Boolean(session?.user),
      isDevBypass,
      isLoading,
      profile,
      profileError,
      profileStatus,
      refreshProfile,
      retryInitialization: initializeAuth,
      retryProfile,
      setProfileSnapshot,
      session,
      signInWithApple,
      signInWithGoogle,
      signOut,
      user,
    }),
    [
      initializationError,
      initializationStatus,
      initializeAuth,
      isDevBypass,
      isLoading,
      profile,
      profileError,
      profileStatus,
      refreshProfile,
      retryProfile,
      session,
      setProfileSnapshot,
      signInWithApple,
      signInWithGoogle,
      signOut,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return value;
}
