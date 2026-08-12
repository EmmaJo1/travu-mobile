import type { IdlePastMoment } from '@/constants/mockIdleHomeData';
import { fetchPhotosByTripId } from '@/services/supabase/photos';
import { fetchPlacesByTripId } from '@/services/supabase/places';
import { fetchRecordsByTripId } from '@/services/supabase/records';
import { fetchTripDaysByTripId } from '@/services/supabase/tripDays';
import { fetchRecentTrips } from '@/services/supabase/trips';

const ARCHIVED_TRIP_LOOKUP_LIMIT = 12;

function formatMomentDate(dateKey?: string | null) {
  const [year, month, day] = (dateKey?.slice(0, 10) ?? '').split('-').map(Number);
  return year && month && day ? `${year}. ${month}. ${day}` : '';
}

export async function fetchArchivedTravelMoments(): Promise<IdlePastMoment[]> {
  const trips = await fetchRecentTrips(ARCHIVED_TRIP_LOOKUP_LIMIT);
  const tripMoments = await Promise.all(trips.map(async (trip) => {
    const [tripDays, places, records, photos] = await Promise.all([
      fetchTripDaysByTripId(trip.id),
      fetchPlacesByTripId(trip.id),
      fetchRecordsByTripId(trip.id),
      fetchPhotosByTripId(trip.id),
    ]);
    const dayDateById = new Map(tripDays.map((day) => [day.id, day.date]));
    const recordsByPlaceId = new Map<string, typeof records>();
    const photosByPlaceId = new Map<string, typeof photos>();

    records.forEach((record) => {
      if (record.place_id) {
        recordsByPlaceId.set(record.place_id, [
          ...(recordsByPlaceId.get(record.place_id) ?? []),
          record,
        ]);
      }
    });
    photos.forEach((photo) => {
      if (photo.place_id && photo.displayUrl) {
        photosByPlaceId.set(photo.place_id, [
          ...(photosByPlaceId.get(photo.place_id) ?? []),
          photo,
        ]);
      }
    });

    return places.flatMap((place): IdlePastMoment[] => {
      const placePhotos = photosByPlaceId.get(place.id) ?? [];
      const coverPhoto = placePhotos[0];

      if (!coverPhoto?.displayUrl) {
        return [];
      }

      const placeRecords = recordsByPlaceId.get(place.id) ?? [];
      const dateKey = dayDateById.get(place.trip_day_id ?? '')
        ?? coverPhoto.taken_at?.slice(0, 10)
        ?? place.visited_at?.slice(0, 10);
      const cityName = trip.destination_city_ko?.trim()
        || trip.destination_city?.trim()
        || trip.title.trim();

      return [{
        cityName,
        date: formatMomentDate(dateKey),
        dayId: place.trip_day_id ?? undefined,
        id: `supabase-moment-${place.id}`,
        image: { uri: coverPhoto.displayUrl },
        memoText: placeRecords.find((record) => record.text?.trim())?.text ?? undefined,
        momentId: coverPhoto.id,
        photoCount: placePhotos.length,
        placeId: place.id,
        placeName: place.custom_name?.trim() || place.name.trim(),
        takenAt: coverPhoto.taken_at ?? dateKey,
        tripId: trip.id,
      }];
    });
  }));

  return tripMoments.flat();
}
