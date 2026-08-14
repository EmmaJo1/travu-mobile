import type { PlaceEntry } from '@/components/trip/PlaceEntryCard';
import { getPlaceCategoryLabel } from '@/constants/placeCategories';
import type { ResolvedPhotoRow } from '@/services/supabase/photos';
import type { PlaceRow } from '@/services/supabase/places';
import type { RecordRow } from '@/services/supabase/records';
import { normalizePersistedPlaceSource } from '@/services/placeSearch/mappers';
import {
  formatLocalDateKeyFromTimestamp,
  formatVisitedAtTimeLabel,
} from '@/utils/placeEntryTime';

export function mapSupabasePlacesToPlaceEntries(
  places: PlaceRow[],
  records: RecordRow[],
  _fallbackCountryName?: string,
  photos: ResolvedPhotoRow[] = [],
): PlaceEntry[] {
  const recordsByPlaceId = records.reduce((map, record) => {
    const nextRecords = map.get(record.place_id) ?? [];
    nextRecords.push(record);
    map.set(record.place_id, nextRecords);
    return map;
  }, new Map<string, RecordRow[]>());
  const photosByPlaceId = photos.reduce((map, photo) => {
    if (!photo.place_id || photo.deleted_at !== null) {
      return map;
    }

    const nextPhotos = map.get(photo.place_id) ?? [];
    nextPhotos.push(photo);
    map.set(photo.place_id, nextPhotos);
    return map;
  }, new Map<string, ResolvedPhotoRow[]>());

  return places.map((place) => {
    const placeRecords = recordsByPlaceId.get(place.id) ?? [];
    const placePhotos = photosByPlaceId.get(place.id) ?? [];
    const orderedPlacePhotos = place.cover_photo_id
      ? [
        ...placePhotos.filter((photo) => photo.id === place.cover_photo_id),
        ...placePhotos.filter((photo) => photo.id !== place.cover_photo_id),
      ]
      : placePhotos;
    const placePhotoUris = orderedPlacePhotos
      .map((photo) => photo.displayUrl)
      .filter((uri): uri is string => Boolean(uri));
    const firstRecord = placeRecords[0];
    const visitedAt = place.visited_at ?? firstRecord?.visited_at;
    const time = formatVisitedAtTimeLabel(visitedAt) ?? '';
    const text = firstRecord?.text ?? place.memo ?? undefined;

    return {
      category: getPlaceCategoryLabel(place.category) || undefined,
      city: place.city ?? undefined,
      cityName: place.city ?? undefined,
      countryName: place.country ?? undefined,
      dataSource: 'supabase',
      dateKey: formatLocalDateKeyFromTimestamp(visitedAt),
      formattedAddress: place.address ?? undefined,
      googlePlaceId: place.google_place_id ?? undefined,
      id: place.id,
      latitude: place.latitude ?? undefined,
      longitude: place.longitude ?? undefined,
      photoCount: orderedPlacePhotos.length,
      photoUris: placePhotoUris,
      place: place.custom_name ?? place.name,
      placeId: place.id,
      placeName: place.custom_name ?? place.name,
      recordId: firstRecord?.id,
      recordCount: placeRecords.length,
      source: normalizePersistedPlaceSource(place.source),
      text,
      time,
      tripDayId: place.trip_day_id ?? firstRecord?.trip_day_id ?? undefined,
      tripId: place.trip_id,
    };
  });
}
