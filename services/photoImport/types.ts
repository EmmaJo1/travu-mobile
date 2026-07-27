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

export type PhotoImportCandidateQualityType =
  | 'high_confidence_trip'
  | 'review_needed_candidate'
  | 'daily_life_candidate'
  | 'weak_candidate'
  | 'long_stay_candidate'
  | 'extended_journey_candidate';

export type PhotoImportCandidateTitleCoordinateSource =
  | 'candidate_centroid'
  | 'first_located_group_centroid'
  | 'first_located_group_representative_gps'
  | 'largest_located_group_centroid'
  | 'representative_gps_photo'
  | 'none';

export type PhotoImportCandidateTitleLocationSource =
  | 'candidate_location_label'
  | 'first_located_group_label'
  | 'first_located_group_centroid'
  | 'first_located_group_representative_gps'
  | 'largest_located_group_label'
  | 'largest_located_group_centroid'
  | 'reverse_geocode_candidate_centroid'
  | 'reverse_geocode_representative_photo'
  | 'fallback'
  | 'unresolved_region_fallback'
  | 'pending';

export type PhotoImportOverseasTitleSource =
  | 'placemark_city'
  | 'major_city_bbox'
  | 'major_city_alias'
  | 'region_fallback'
  | 'country_fallback';

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
  scanAttemptId?: string;
  candidateQualityScore?: number;
  candidateQualityType?: PhotoImportCandidateQualityType;
  candidateMetadataLookupCompleted?: boolean;
  candidateMetadataLocationFound?: boolean;
  candidateMetadataDisplayUriFound?: boolean;
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
  distanceFromHomeFarthestKm?: number;
  distanceFromHomeNearestKm?: number;
  excludedBecauseHomeRegion?: boolean;
  homeRegionFilterApplied?: boolean;
  homeRegionHiddenReason?: string;
  homeRegionInsideGroupCount?: number;
  homeRegionLocatedGroupCount?: number;
  homeRegionMeaningfulOutsideGroupCount?: number;
  homeRegionOutsideGroupCount?: number;
  homeRegionUnknownGroupCount?: number;
  repeatedLocalClusterActiveMonthCount?: number;
  repeatedLocalClusterCandidateCount?: number;
  repeatedLocalClusterDateSpanDays?: number;
  repeatedLocalClusterKey?: string;
  representativeGpsLat?: number;
  representativeGpsLng?: number;
  representativeGroupPhotoCount?: number;
  maxDistanceKm: number;
  dateGapSplitCount: number;
  oversizedSplitCount: number;
  mergedFromCandidateCount?: number;
  isLongTripCandidate?: boolean;
  splitReason: PhotoImportCandidateSplitReason;
  confidenceScore: number;
  confidenceLevel: PhotoImportConfidenceLevel;
  candidateTitleCoordinateSource?: PhotoImportCandidateTitleCoordinateSource;
  candidateTitleLocationSource?: PhotoImportCandidateTitleLocationSource;
  firstLocatedGroupCentroidLat?: number;
  firstLocatedGroupCentroidLng?: number;
  firstLocatedGroupLabel?: string;
  firstLocatedGroupPhotoCount?: number;
  firstLocatedGroupRepresentativeGpsLat?: number;
  firstLocatedGroupRepresentativeGpsLng?: number;
  hasLocationTitle?: boolean;
  hiddenReasons?: string[];
  isHighConfidenceTrip?: boolean;
  isLikelyDailyLifeCandidate?: boolean;
  isLocationTitlePending?: boolean;
  isLowMobilityCandidate?: boolean;
  isOverseasCandidate?: boolean;
  normalizedCityName?: string;
  overseasTitleSource?: PhotoImportOverseasTitleSource;
  rawLocationLabel?: string;
  rawPlacemarkCity?: string;
  rawPlacemarkCountry?: string;
  rawPlacemarkDistrict?: string;
  rawPlacemarkRegion?: string;
  rawPlacemarkSubregion?: string;
  reviewNeededReasons?: string[];
  genericFallbackSuppressed?: boolean;
  titleEnrichmentElapsedMs?: number;
  titleEnrichmentFinalizedAt?: string;
  titleEnrichmentStartedAt?: string;
  titleFinalizeReason?: string;
  titleGeocodingQueued?: boolean;
  titleGeocodingInFlight?: boolean;
  titleGeocodingRetryable?: boolean;
  titleGeocodingSkippedReason?: string;
  titleResolveState?: string;
  unresolvedRegionFallbackTitle?: string;
  unresolvedTitleFallbackSource?: string;
  wasMergedFromDailyEvents?: boolean;
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
