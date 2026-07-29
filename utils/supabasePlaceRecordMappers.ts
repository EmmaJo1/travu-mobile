import type { PlaceEntry } from '@/components/trip/PlaceEntryCard';
import type { ResolvedPhotoRow } from '@/services/supabase/photos';
import type { PlaceRow } from '@/services/supabase/places';
import type { RecordRow } from '@/services/supabase/records';

function formatTimeLabel(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const minuteLabel = minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : '';

  return `${hour12}${minuteLabel} ${period}`;
}

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
    if (!photo.place_id || !photo.displayUrl) {
      return map;
    }

    const nextPhotos = map.get(photo.place_id) ?? [];
    nextPhotos.push(photo.displayUrl);
    map.set(photo.place_id, nextPhotos);
    return map;
  }, new Map<string, string[]>());

  return places.map((place) => {
    const placeRecords = recordsByPlaceId.get(place.id) ?? [];
    const placePhotoUris = photosByPlaceId.get(place.id) ?? [];
    const firstRecord = placeRecords[0];
    const time = formatTimeLabel(place.visited_at ?? firstRecord?.visited_at);
    const text = firstRecord?.text ?? place.memo ?? undefined;

    return {
      city: place.city ?? undefined,
      cityName: place.city ?? undefined,
      countryName: place.country ?? undefined,
      dataSource: 'supabase',
      dateKey: place.visited_at?.slice(0, 10) ?? firstRecord?.visited_at?.slice(0, 10),
      formattedAddress: place.address ?? undefined,
      googlePlaceId: place.google_place_id ?? undefined,
      id: place.id,
      latitude: place.latitude ?? undefined,
      longitude: place.longitude ?? undefined,
      photoCount: placePhotoUris.length,
      photoUris: placePhotoUris,
      place: place.custom_name ?? place.name,
      placeId: place.id,
      placeName: place.custom_name ?? place.name,
      recordId: firstRecord?.id,
      recordCount: placeRecords.length,
      source: 'manual',
      text,
      time,
      tripDayId: place.trip_day_id ?? firstRecord?.trip_day_id ?? undefined,
      tripId: place.trip_id,
    };
  });
}
