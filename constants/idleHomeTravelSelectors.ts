import type { MyPageTrip } from '@/constants/mockMyPageTrips';
import type { DetectedTrip, IdlePastMoment, IdleRecentTrip } from '@/constants/mockIdleHomeData';

const RECENT_TRIP_LIMIT = 3;
const MOMENT_LIMIT = 5;
const MAX_MOMENTS_PER_TRIP = 2;

type ParsedRange = {
  startTime: number;
  endTime: number;
};

function parseISODateTime(value?: string): number {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function parseDateRangeLabel(dateRangeLabel: string): ParsedRange {
  const normalized = dateRangeLabel.replace(/\s+/g, '');
  const match = normalized.match(
    /^(\d{4})\.(\d{1,2})\.(\d{1,2})-(?:(\d{4})\.)?(\d{1,2})\.(\d{1,2})$/,
  );

  if (!match) {
    return { startTime: 0, endTime: 0 };
  }

  const [, startYear, startMonth, startDay, endYear, endMonth, endDay] = match;
  const start = new Date(Number(startYear), Number(startMonth) - 1, Number(startDay)).getTime();
  const end = new Date(
    Number(endYear ?? startYear),
    Number(endMonth) - 1,
    Number(endDay),
  ).getTime();

  return {
    startTime: Number.isNaN(start) ? 0 : start,
    endTime: Number.isNaN(end) ? 0 : end,
  };
}

function getRecentTripSortTime(trip: IdleRecentTrip): number {
  const explicitEndTime = parseISODateTime(trip.endDate);
  const explicitStartTime = parseISODateTime(trip.startDate);
  const parsed = parseDateRangeLabel(trip.dateRange);

  return explicitEndTime || parsed.endTime || explicitStartTime || parsed.startTime;
}

export function getPendingDetectedTrip(trips: DetectedTrip[]): DetectedTrip | null {
  return (
    trips
      .filter((trip) => (trip.status ?? 'pending') === 'pending')
      .sort((a, b) => parseISODateTime(b.createdAt) - parseISODateTime(a.createdAt))[0] ?? null
  );
}

export function getRecentTrips(trips: IdleRecentTrip[], limit = RECENT_TRIP_LIMIT): IdleRecentTrip[] {
  return trips
    .filter((trip) => trip.status !== undefined)
    .sort((a, b) => getRecentTripSortTime(b) - getRecentTripSortTime(a))
    .slice(0, limit);
}

export function getMomentDateMatchScore(moment: IdlePastMoment, today = new Date()): number {
  const takenAt = parseISODateTime(moment.takenAt);

  if (!takenAt) {
    return moment.dateMatchScore ?? 0;
  }

  const momentDate = new Date(takenAt);
  const dayDistance =
    Math.abs(today.getMonth() - momentDate.getMonth()) * 31 +
    Math.abs(today.getDate() - momentDate.getDate());

  return Math.max(0, 100 - dayDistance);
}

export function sortMomentCandidates(
  candidates: IdlePastMoment[],
  today = new Date(),
): IdlePastMoment[] {
  return [...candidates].sort((a, b) => {
    const aHasMemo = Boolean(a.memoText?.trim());
    const bHasMemo = Boolean(b.memoText?.trim());

    if (aHasMemo !== bHasMemo) {
      return aHasMemo ? -1 : 1;
    }

    if (aHasMemo && bHasMemo) {
      return (b.memoText?.length ?? 0) - (a.memoText?.length ?? 0);
    }

    const photoDiff = (b.photoCount ?? 0) - (a.photoCount ?? 0);
    if (photoDiff !== 0) {
      return photoDiff;
    }

    return getMomentDateMatchScore(b, today) - getMomentDateMatchScore(a, today);
  });
}

export function applyMomentDiversityLimit(
  candidates: IdlePastMoment[],
  recentTripIds: string[],
  limit = MOMENT_LIMIT,
): IdlePastMoment[] {
  const selected: IdlePastMoment[] = [];
  const seenKeys = new Set<string>();
  const tripCounts = new Map<string, number>();
  const recentTripIdSet = new Set(recentTripIds);

  for (const candidate of candidates) {
    if (!candidate.image) {
      continue;
    }

    const uniqueKey = candidate.momentId ?? candidate.placeId ?? candidate.id;
    const tripId = candidate.tripId ?? 'unknown';
    const currentTripCount = tripCounts.get(tripId) ?? 0;
    const maxForTrip = recentTripIdSet.has(tripId) ? 1 : MAX_MOMENTS_PER_TRIP;

    if (seenKeys.has(uniqueKey) || currentTripCount >= maxForTrip) {
      continue;
    }

    seenKeys.add(uniqueKey);
    tripCounts.set(tripId, currentTripCount + 1);
    selected.push(candidate);

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

export function getTravelMoments(
  candidates: IdlePastMoment[],
  recentTripIds: string[],
  limit = MOMENT_LIMIT,
): IdlePastMoment[] {
  return applyMomentDiversityLimit(sortMomentCandidates(candidates), recentTripIds, limit);
}

export function toIdleRecentTripFromSavedTrip(trip: MyPageTrip): IdleRecentTrip {
  const parsed = parseDateRangeLabel(trip.dateRangeLabel);

  return {
    id: `saved-${trip.id}`,
    tripId: trip.id,
    city: trip.city,
    country: trip.country,
    dateRange: trip.dateRangeLabel,
    placeCount: trip.daysCount,
    photoCount: trip.photoCount,
    image: trip.coverImage,
    startDate: parsed.startTime ? new Date(parsed.startTime).toISOString() : undefined,
    endDate: parsed.endTime ? new Date(parsed.endTime).toISOString() : undefined,
    status: 'saved',
  };
}
