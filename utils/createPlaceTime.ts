import {
  convertDateToPlaceEntryTime,
  formatPlaceEntryTime,
} from './placeEntryTime.ts';

/**
 * For newly created place entries, an explicit/manual/photo-derived time wins.
 * If the user leaves visit time empty, use the clock time at the moment the
 * create mutation runs. Edit flows intentionally do not use this fallback.
 */
export function resolveCreatePlaceTimeLabel(
  timeLabel?: string | null,
  now = new Date(),
) {
  const explicitTime = timeLabel?.trim();
  return explicitTime || formatPlaceEntryTime(convertDateToPlaceEntryTime(now));
}
