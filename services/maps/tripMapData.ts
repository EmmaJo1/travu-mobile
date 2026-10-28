export interface TripMapPlaceLike {
  id: string;
  trip_id?: string | null;
  tripId?: string | null;
  trip_day_id?: string | null;
  tripDayId?: string | null;
  dayId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  visited_at?: string | null;
  visitedAt?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

export interface TripMapDayLike {
  id: string;
  day_index?: number | null;
  dayIndex?: number | null;
}

export type TripMapScope =
  | { type: 'all' }
  | { type: 'day'; tripDayId: string };

export interface TripMapMarker<TPlace extends TripMapPlaceLike = TripMapPlaceLike> {
  id: string;
  latitude: number;
  longitude: number;
  number: number;
  place: TPlace;
  placeId: string;
  tripDayId: string | null;
  tripId: string | null;
}

export interface TripMapData<TPlace extends TripMapPlaceLike = TripMapPlaceLike> {
  excludedCoordinateCount: number;
  markers: TripMapMarker<TPlace>[];
  orderedPlaces: TPlace[];
}

export function hasUsableCoordinates(
  place: Pick<TripMapPlaceLike, 'latitude' | 'longitude'>,
): place is TripMapPlaceLike & { latitude: number; longitude: number } {
  const { latitude, longitude } = place;

  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

export function getTripMapTripId(place: TripMapPlaceLike) {
  return place.trip_id ?? place.tripId ?? null;
}

export function getTripMapTripDayId(place: TripMapPlaceLike) {
  return place.trip_day_id ?? place.tripDayId ?? place.dayId ?? null;
}

function getDateSortValue(value?: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function getVisitedAt(place: TripMapPlaceLike) {
  return place.visited_at ?? place.visitedAt;
}

function getCreatedAt(place: TripMapPlaceLike) {
  return place.created_at ?? place.createdAt;
}

export function orderTripMapPlaces<TPlace extends TripMapPlaceLike>(
  places: readonly TPlace[],
  tripDays: readonly TripMapDayLike[],
) {
  const dayIndexes = new Map(
    tripDays.map((day) => [day.id, day.day_index ?? day.dayIndex ?? Number.MAX_SAFE_INTEGER]),
  );

  return [...places].sort((left, right) => {
    const leftDayIndex = dayIndexes.get(getTripMapTripDayId(left) ?? '') ?? Number.MAX_SAFE_INTEGER;
    const rightDayIndex = dayIndexes.get(getTripMapTripDayId(right) ?? '') ?? Number.MAX_SAFE_INTEGER;
    const dayComparison = leftDayIndex - rightDayIndex;

    if (dayComparison !== 0) {
      return dayComparison;
    }

    const leftVisit = getDateSortValue(getVisitedAt(left));
    const rightVisit = getDateSortValue(getVisitedAt(right));
    if (leftVisit !== rightVisit) {
      return leftVisit - rightVisit;
    }

    const leftCreated = getDateSortValue(getCreatedAt(left));
    const rightCreated = getDateSortValue(getCreatedAt(right));
    if (leftCreated !== rightCreated) {
      return leftCreated - rightCreated;
    }

    return left.id.localeCompare(right.id);
  });
}

export function buildTripMapData<TPlace extends TripMapPlaceLike>(
  places: readonly TPlace[],
  tripDays: readonly TripMapDayLike[],
  scope: TripMapScope,
): TripMapData<TPlace> {
  const scopedPlaces = scope.type === 'day'
    ? places.filter((place) => getTripMapTripDayId(place) === scope.tripDayId)
    : places;
  const orderedPlaces = orderTripMapPlaces(scopedPlaces, tripDays);
  const coordinatePlaces = orderedPlaces.filter(hasUsableCoordinates);

  return {
    excludedCoordinateCount: orderedPlaces.length - coordinatePlaces.length,
    orderedPlaces,
    markers: coordinatePlaces.map((place, index) => ({
      id: place.id,
      latitude: place.latitude as number,
      longitude: place.longitude as number,
      number: index + 1,
      place,
      placeId: place.id,
      tripDayId: getTripMapTripDayId(place),
      tripId: getTripMapTripId(place),
    })),
  };
}

export const MY_PAGE_TRAVEL_MAP_TRIP_STATUSES = ['archived', 'completed'] as const;

export function isMyPageTravelMapTripStatus(status: string | null | undefined) {
  return MY_PAGE_TRAVEL_MAP_TRIP_STATUSES.some((eligibleStatus) => eligibleStatus === status);
}
