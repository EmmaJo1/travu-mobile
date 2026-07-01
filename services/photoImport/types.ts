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

export interface PhotoImportTripCandidate {
  id: string;
  city: string;
  country: string;
  dateRange: string;
  photoCount: number;
  image: ImageSourcePropType;
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
