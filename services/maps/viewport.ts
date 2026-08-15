export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export type MapViewport =
  | { type: 'empty' }
  | { type: 'single'; coordinate: MapCoordinate; latitudeDelta: number; longitudeDelta: number }
  | { type: 'bounds'; coordinates: MapCoordinate[] };

const SINGLE_POINT_LATITUDE_DELTA = 0.018;
const SINGLE_POINT_LONGITUDE_DELTA = 0.018;

export function getMapViewport(coordinates: readonly MapCoordinate[]): MapViewport {
  if (coordinates.length === 0) {
    return { type: 'empty' };
  }

  if (coordinates.length === 1) {
    return {
      type: 'single',
      coordinate: coordinates[0],
      latitudeDelta: SINGLE_POINT_LATITUDE_DELTA,
      longitudeDelta: SINGLE_POINT_LONGITUDE_DELTA,
    };
  }

  return { type: 'bounds', coordinates: [...coordinates] };
}
