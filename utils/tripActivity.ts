import type { Tables } from '@/types/supabase';

type TripActivityFields = Pick<
  Tables<'trips'>,
  | 'deleted_at'
  | 'end_date'
  | 'is_end_date_undecided'
  | 'start_date'
  | 'status'
>;

export type TripHomeActivityReason =
  | 'active_date_bounded'
  | 'active_open_ended'
  | 'active_period_unset'
  | 'inactive_deleted'
  | 'inactive_expired'
  | 'inactive_invalid_date'
  | 'inactive_scheduled'
  | 'inactive_status';

export type TripHomeActivityEvaluation = {
  isActive: boolean;
  reason: TripHomeActivityReason;
};

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function getCurrentLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDateKeyOrdinal(value: string): number | null {
  const match = value.match(DATE_KEY_PATTERN);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const localDate = new Date(year, month - 1, day);

  if (
    localDate.getFullYear() !== year
    || localDate.getMonth() !== month - 1
    || localDate.getDate() !== day
  ) {
    return null;
  }

  return (year * 10_000) + (month * 100) + day;
}

export function evaluateTripActivityForHome(
  trip: TripActivityFields,
  currentLocalDateKey = getCurrentLocalDateKey(),
): TripHomeActivityEvaluation {
  if (trip.deleted_at) {
    return { isActive: false, reason: 'inactive_deleted' };
  }

  if (trip.status !== 'active') {
    return { isActive: false, reason: 'inactive_status' };
  }

  const currentDateOrdinal = getDateKeyOrdinal(currentLocalDateKey);
  const startDateOrdinal = trip.start_date
    ? getDateKeyOrdinal(trip.start_date)
    : null;
  const endDateOrdinal = trip.end_date
    ? getDateKeyOrdinal(trip.end_date)
    : null;

  if (
    currentDateOrdinal === null
    || (trip.start_date !== null && startDateOrdinal === null)
    || (trip.end_date !== null && endDateOrdinal === null)
    || (
      startDateOrdinal !== null
      && endDateOrdinal !== null
      && startDateOrdinal > endDateOrdinal
    )
  ) {
    return { isActive: false, reason: 'inactive_invalid_date' };
  }

  if (startDateOrdinal !== null && currentDateOrdinal < startDateOrdinal) {
    return { isActive: false, reason: 'inactive_scheduled' };
  }

  if (trip.is_end_date_undecided) {
    return { isActive: true, reason: 'active_open_ended' };
  }

  if (startDateOrdinal === null && endDateOrdinal === null) {
    return { isActive: true, reason: 'active_period_unset' };
  }

  if (startDateOrdinal === null || endDateOrdinal === null) {
    return { isActive: false, reason: 'inactive_invalid_date' };
  }

  if (endDateOrdinal !== null && currentDateOrdinal > endDateOrdinal) {
    return { isActive: false, reason: 'inactive_expired' };
  }

  return { isActive: true, reason: 'active_date_bounded' };
}

export function isTripActiveForHome(
  trip: TripActivityFields,
  currentLocalDateKey = getCurrentLocalDateKey(),
): boolean {
  return evaluateTripActivityForHome(trip, currentLocalDateKey).isActive;
}
