export const supabaseQueryKeys = {
  activeTrip: (userId?: string | null) => ['supabase', 'trips', 'active', userId ?? 'no-user'] as const,
  myProfile: (userId?: string | null) => ['supabase', 'users', 'profile', userId ?? 'no-user'] as const,
  myTrips: (userId?: string | null) => ['supabase', 'trips', 'mine', userId ?? 'no-user'] as const,
  recentTrips: (userId?: string | null, limit?: number) =>
    ['supabase', 'trips', 'recent', userId ?? 'no-user', limit] as const,
  recentTripsRoot: (userId?: string | null) =>
    ['supabase', 'trips', 'recent', userId ?? 'no-user'] as const,
  tripDetail: (userId?: string | null, tripId?: string | null) =>
    ['supabase', 'trips', 'detail', userId ?? 'no-user', tripId ?? 'no-trip'] as const,
  tripDays: (userId?: string | null, tripId?: string | null) =>
    ['supabase', 'trip-days', userId ?? 'no-user', tripId ?? 'no-trip'] as const,
};
