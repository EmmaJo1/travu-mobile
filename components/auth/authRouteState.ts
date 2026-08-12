import type { AuthProfile } from '@/services/supabase/auth';
import type {
  AuthInitializationStatus,
  AuthProfileStatus,
} from '@/providers/AuthProvider';

export type AuthRouteMode = 'resolving' | 'error' | 'auth' | 'onboarding' | 'app';

export function getProfileRouteMode(profile: AuthProfile): Exclude<AuthRouteMode, 'resolving'> {
  if (profile.onboarding_status === 'completed' || profile.onboarding_status === 'skipped') {
    return 'app';
  }

  if (profile.onboarding_status === 'pending') {
    return profile.terms_accepted_at && profile.privacy_accepted_at
      ? 'onboarding'
      : 'auth';
  }

  return 'error';
}

export function resolveAuthRouteMode(input: {
  initializationStatus: AuthInitializationStatus;
  isAuthenticated: boolean;
  isDevBypass: boolean;
  profile: AuthProfile | null;
  profileStatus: AuthProfileStatus;
}): AuthRouteMode {
  if (input.initializationStatus === 'initializing') {
    return 'resolving';
  }

  if (input.initializationStatus === 'error') {
    return 'error';
  }

  if (input.isDevBypass) {
    return 'app';
  }

  if (!input.isAuthenticated) {
    return 'auth';
  }

  if (input.profileStatus === 'error') {
    return 'error';
  }

  if (input.profileStatus !== 'resolved' || !input.profile) {
    return 'resolving';
  }

  return getProfileRouteMode(input.profile);
}
