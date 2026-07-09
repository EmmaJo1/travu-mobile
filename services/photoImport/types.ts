import type { ImageSourcePropType } from 'react-native';

export type PhotoImportStatus =
  | 'not_started'
  | 'analyzing'
  | 'results_ready'
  | 'reviewed'
  | 'skipped';

export type PhotoImportDetectionState =
  | 'idle'
  | 'detecting'
  | 'success'
  | 'empty'
  | 'error'
  | 'permissionDenied';

export type PhotoLibraryPermissionResult = 'granted' | 'denied';

export type PhotoImportConfidenceLevel = 'high' | 'medium' | 'low';

export type PhotoImportCandidateSplitReason =
  | 'date_gap'
  | 'max_days_exceeded'
  | 'max_photos_exceeded'
  | 'distance_exceeded'
  | 'gps_mixed_with_no_gps'
  | 'long_trip_post_merged'
  | 'final_chunk';

export interface PhotoImportCandidateDebugMetadata {
  candidateId: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  photoCount: number;
  screenshotPhotoCount: number;
  savedImageCount: number;
  savedImageRatio: number;
  realPhotoCount: number;
  gpsPhotoCount: number;
  gpsActiveDayCount: number;
  noGpsPhotoCount: number;
  displayablePhotoCount: number;
  locationClusterCount: number;
  centroidLat?: number;
  centroidLng?: number;
  maxDistanceKm: number;
  dateGapSplitCount: number;
  oversizedSplitCount: number;
  mergedFromCandidateCount?: number;
  isLongTripCandidate?: boolean;
  splitReason: PhotoImportCandidateSplitReason;
  confidenceScore: number;
  confidenceLevel: PhotoImportConfidenceLevel;
  warningReasons: string[];
}

export interface PhotoImportTripCandidate {
  id: string;
  city: string;
  country: string;
  dateRange: string;
  photoCount: number;
  image: ImageSourcePropType;
  debugMetadata?: PhotoImportCandidateDebugMetadata;
  initiallySelected?: boolean;
}

export interface PhotoImportProvider {
  requestPhotoLibraryAccess(): Promise<PhotoLibraryPermissionResult>;
  startAnalysis(): Promise<void>;
  getStatus(): Promise<PhotoImportStatus>;
  getCandidates(): Promise<PhotoImportTripCandidate[]>;
  saveCandidates(candidateIds: string[]): Promise<void>;
  skipOnboarding(): Promise<void>;
}
