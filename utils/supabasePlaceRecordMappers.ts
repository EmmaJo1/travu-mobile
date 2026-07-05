import type { PlaceEntry } from '@/components/trip/PlaceEntryCard';
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
  fallbackCountryName?: string,
): PlaceEntry[] {
  const recordsByPlaceId = records.reduce((map, record) => {
    const nextRecords = map.get(record.place_id) ?? [];
    nextRecords.push(record);
    map.set(record.place_id, nextRecords);
    return map;
  }, new Map<string, RecordRow[]>());

  return places.map((place) => {
    const placeRecords = recordsByPlaceId.get(place.id) ?? [];
    const firstRecord = placeRecords[0];
    const time = formatTimeLabel(firstRecord?.visited_at ?? place.visited_at);
    const text = firstRecord?.text ?? place.memo ?? undefined;

    return {
      city: place.city ?? undefined,
      cityName: place.city ?? undefined,
      countryName: place.country ?? fallbackCountryName,
      dateKey: firstRecord?.visited_at?.slice(0, 10) ?? place.visited_at?.slice(0, 10),
      formattedAddress: place.address ?? undefined,
      googlePlaceId: place.google_place_id ?? undefined,
      id: place.id,
      latitude: place.latitude ?? undefined,
      longitude: place.longitude ?? undefined,
      photoCount: 0,
      place: place.custom_name ?? place.name,
      placeName: place.custom_name ?? place.name,
      recordCount: placeRecords.length,
      source: 'manual',
      text,
      time,
    };
  });
}
