import type { TripMapMarker } from '@/services/maps/tripMapData';

export const NATIVE_MAP_MARKER_BUDGET = 8;

export interface NativeMarkerRenderPlan {
  displayedMarkers: readonly TripMapMarker[];
  hasOverflow: boolean;
  hiddenMarkerCount: number;
}

export function getNativeMarkerRenderPlan(
  markers: readonly TripMapMarker[],
): NativeMarkerRenderPlan {
  const displayedMarkers = markers.slice(0, NATIVE_MAP_MARKER_BUDGET);

  return {
    displayedMarkers,
    hasOverflow: displayedMarkers.length < markers.length,
    hiddenMarkerCount: markers.length - displayedMarkers.length,
  };
}
