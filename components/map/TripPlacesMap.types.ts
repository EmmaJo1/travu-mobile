import type { StyleProp, ViewStyle } from 'react-native';

import type { TripMapMarker } from '@/services/maps/tripMapData';

export interface TripPlacesMapProps {
  emptyDescription?: string;
  emptyTitle?: string;
  distanceKm?: number;
  errorDescription?: string;
  excludedCoordinateCount?: number;
  height?: number;
  isError?: boolean;
  isLoading?: boolean;
  markers: readonly TripMapMarker[];
  onMarkerPress?: (marker: TripMapMarker) => void;
  onRetry?: () => void;
  selectedMarkerId?: string | null;
  style?: StyleProp<ViewStyle>;
}
