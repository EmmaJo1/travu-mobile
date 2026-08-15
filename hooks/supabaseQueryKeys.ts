export const supabaseQueryKeys = {
  archivedTravelMoments: (userId?: string | null) =>
    ['supabase', 'travel-moments', 'archived', userId ?? 'no-user'] as const,
  activeTrip: (userId?: string | null) => ['supabase', 'trips', 'active', userId ?? 'no-user'] as const,
  myProfile: (userId?: string | null) => ['supabase', 'users', 'profile', userId ?? 'no-user'] as const,
  myTrips: (userId?: string | null) => ['supabase', 'trips', 'mine', userId ?? 'no-user'] as const,
  myTravelMapPlaces: (userId?: string | null) =>
    ['supabase', 'places', 'my-travel-map', userId ?? 'no-user'] as const,
  recentTrips: (userId?: string | null, limit?: number) =>
    ['supabase', 'trips', 'recent', userId ?? 'no-user', limit] as const,
  recentTripsRoot: (userId?: string | null) =>
    ['supabase', 'trips', 'recent', userId ?? 'no-user'] as const,
  tripDetail: (userId?: string | null, tripId?: string | null) =>
    ['supabase', 'trips', 'detail', userId ?? 'no-user', tripId ?? 'no-trip'] as const,
  placeDetail: (userId?: string | null, placeId?: string | null) =>
    ['supabase', 'places', 'detail', userId ?? 'no-user', placeId ?? 'no-place'] as const,
  tripDays: (userId?: string | null, tripId?: string | null) =>
    ['supabase', 'trip-days', userId ?? 'no-user', tripId ?? 'no-trip'] as const,
  tripDestinations: (userId?: string | null, tripId?: string | null) =>
    ['supabase', 'trip-destinations', userId ?? 'no-user', tripId ?? 'no-trip'] as const,
  tripDayPlaces: (userId?: string | null, tripDayId?: string | null) =>
    ['supabase', 'places', 'trip-day', userId ?? 'no-user', tripDayId ?? 'no-trip-day'] as const,
  tripDayRecords: (userId?: string | null, tripDayId?: string | null) =>
    ['supabase', 'records', 'trip-day', userId ?? 'no-user', tripDayId ?? 'no-trip-day'] as const,
  tripDayPhotos: (userId?: string | null, tripDayId?: string | null) =>
    ['supabase', 'photos', 'trip-day', userId ?? 'no-user', tripDayId ?? 'no-trip-day'] as const,
  tripPlaces: (userId?: string | null, tripId?: string | null) =>
    ['supabase', 'places', 'trip', userId ?? 'no-user', tripId ?? 'no-trip'] as const,
  tripRecords: (userId?: string | null, tripId?: string | null) =>
    ['supabase', 'records', 'trip', userId ?? 'no-user', tripId ?? 'no-trip'] as const,
  tripPhotos: (userId?: string | null, tripId?: string | null) =>
    ['supabase', 'photos', 'trip', userId ?? 'no-user', tripId ?? 'no-trip'] as const,
  tripCoverCandidates: (userId?: string | null, tripId?: string | null) =>
    [
      'supabase',
      'photos',
      'trip',
      userId ?? 'no-user',
      tripId ?? 'no-trip',
      'cover-candidates',
    ] as const,
  placePhotos: (userId?: string | null, placeId?: string | null) =>
    ['supabase', 'photos', 'place', userId ?? 'no-user', placeId ?? 'no-place'] as const,
};
