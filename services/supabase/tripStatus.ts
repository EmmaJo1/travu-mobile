export const USER_SAVED_TRIP_STATUSES = [
  'draft',
  'active',
  'archived',
  'completed',
] as const;

export type UserSavedTripStatus = (typeof USER_SAVED_TRIP_STATUSES)[number];

export function isUserSavedTripStatus(
  status: string | null | undefined,
): status is UserSavedTripStatus {
  return USER_SAVED_TRIP_STATUSES.some((savedStatus) => savedStatus === status);
}
