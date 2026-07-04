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

import { supabase } from '@/lib/supabase';
import {
  ensureUserProfile,
  getCurrentSession,
  getMyProfile,
  signInWithApple as signInWithAppleService,
  signInWithGoogle as signInWithGoogleService,
  signOut as signOutService,
  type AuthProfile,
} from '@/services/supabase/auth';

type AuthContextValue = {
  canUseSupabaseUserData: boolean;
  isAuthenticated: boolean;
  isDevBypass: boolean;
  isLoading: boolean;
  profile: AuthProfile | null;
  refreshProfile: () => Promise<AuthProfile | null>;
  session: Session | null;
  signInWithApple: () => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const isMountedRef = useRef(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevBypass, setIsDevBypass] = useState(false);

  const setAuthState = useCallback(async (nextSession: Session | null) => {
    setIsDevBypass(false);
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setProfile(null);
      return null;
    }

    const nextProfile = await ensureUserProfile(nextSession.user);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    const nextProfile = await getMyProfile();

    if (isMountedRef.current) {
      setProfile(nextProfile);
    }

    return nextProfile;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await signInWithGoogleService();

      if (result.devBypass) {
        if (isMountedRef.current) {
          setIsDevBypass(true);
          setSession(null);
          setUser(null);
          setProfile(null);
        }

        return true;
      }

      if (isMountedRef.current && (result.session || result.user || result.profile)) {
        setIsDevBypass(false);
        setSession(result.session);
        setUser(result.user);
        setProfile(result.profile);
      }

      return Boolean(result.session?.user || result.devBypass);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await signInWithAppleService();

      if (result.devBypass) {
        if (isMountedRef.current) {
          setIsDevBypass(true);
          setSession(null);
          setUser(null);
          setProfile(null);
        }

        return true;
      }

      if (isMountedRef.current && (result.session || result.user || result.profile)) {
        setIsDevBypass(false);
        setSession(result.session);
        setUser(result.user);
        setProfile(result.profile);
      }

      return Boolean(result.session?.user || result.devBypass);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);

    try {
      await signOutService();

      if (isMountedRef.current) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsDevBypass(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const hydrateSession = async () => {
      setIsLoading(true);

      try {
        const currentSession = await getCurrentSession();

        if (isMountedRef.current) {
          await setAuthState(currentSession);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    void hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void setAuthState(nextSession);
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [setAuthState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      canUseSupabaseUserData: Boolean(session?.user && !isDevBypass),
      isAuthenticated: Boolean(session?.user),
      isDevBypass,
      isLoading,
      profile,
      refreshProfile,
      session,
      signInWithApple,
      signInWithGoogle,
      signOut,
      user,
    }),
    [
      isDevBypass,
      isLoading,
      profile,
      refreshProfile,
      session,
      signInWithApple,
      signInWithGoogle,
      signOut,
      user,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return value;
}
