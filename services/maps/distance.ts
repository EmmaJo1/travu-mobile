import { hasUsableCoordinates, type TripMapPlaceLike } from './tripMapData';

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

export function getHaversineDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function getCumulativePlaceDistanceMeters(places: readonly TripMapPlaceLike[]) {
  let distanceMeters = 0;

  for (let index = 1; index < places.length; index += 1) {
    const previous = places[index - 1];
    const current = places[index];

    if (!hasUsableCoordinates(previous) || !hasUsableCoordinates(current)) {
      continue;
    }

    distanceMeters += getHaversineDistanceMeters(previous, current);
  }

  return distanceMeters;
}

export function getCumulativePlaceDistanceKm(places: readonly TripMapPlaceLike[]) {
  return Math.round((getCumulativePlaceDistanceMeters(places) / 1000) * 10) / 10;
}
