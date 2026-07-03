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
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: AuthProfile | null;
  refreshProfile: () => Promise<AuthProfile | null>;
  session: Session | null;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
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

  const setAuthState = useCallback(async (nextSession: Session | null) => {
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

      if (isMountedRef.current && (result.session || result.user || result.profile)) {
        setSession(result.session);
        setUser(result.user);
        setProfile(result.profile);
      }
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

      if (isMountedRef.current && (result.session || result.user || result.profile)) {
        setSession(result.session);
        setUser(result.user);
        setProfile(result.profile);
      }
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
      isAuthenticated: Boolean(session?.user),
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
