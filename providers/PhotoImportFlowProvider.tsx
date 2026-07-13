import React from 'react';

import { addSavedPhotoImportCandidates } from '@/constants/savedMyPageTrips';
import { useUserProfile } from '@/providers/UserProfileProvider';
import {
  createLivingAreaFromProfile,
  type LivingArea,
} from '@/services/location/livingAreas';
import {
  hydrateLocalDetectedTripDraftCovers,
  scanEntirePhotoLibraryForTrips,
  type PhotoLibraryScanProgress,
  type PhotoLibraryScanResult,
} from '@/services/photoImport/localDetectedTripDraftStore';
import type {
  PhotoImportDetectionState,
  PhotoImportStatus,
  PhotoImportTripCandidate,
} from '@/services/photoImport/types';

type PhotoImportRunOptions = {
  livingArea?: LivingArea | null;
  source?: 'home' | 'onboarding';
};

interface PhotoImportFlowContextValue {
  status: PhotoImportStatus;
  detectionState: PhotoImportDetectionState;
  errorMessage?: string;
  progress: number;
  candidates: PhotoImportTripCandidate[];
  selectedCandidateIds: string[];
  hasOpenedPhotoImportResults: boolean;
  hasDeferredPhotoImportResults: boolean;
  hasSavedPhotoImportResults: boolean;
  lastSavedTripCount: number;
  lastScanResult?: PhotoLibraryScanResult;
  scanProgress?: PhotoLibraryScanProgress;
  startPhotoImportAnalysis: () => void;
  requestAccessAndStartAnalysis: (options?: PhotoImportRunOptions) => Promise<void>;
  runPhotoImportDetection: (options?: PhotoImportRunOptions) => Promise<PhotoImportDetectionState>;
  hydrateCandidateCovers: (candidateIds: string[]) => Promise<void>;
  toggleCandidate: (candidateId: string) => void;
  openPhotoImportResults: () => void;
  deferPhotoImportResults: () => void;
  closePhotoImportCompleteModal: () => void;
  dismissPhotoImportSavedModal: () => void;
  saveSelectedPhotoImportResults: (candidateIds?: string[]) => Promise<void>;
  saveSelectedCandidates: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
}

const PhotoImportFlowContext = React.createContext<PhotoImportFlowContextValue | null>(null);

export function PhotoImportFlowProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useUserProfile();
  const [status, setStatus] = React.useState<PhotoImportStatus>('not_started');
  const [detectionState, setDetectionState] =
    React.useState<PhotoImportDetectionState>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const [candidates, setCandidates] = React.useState<PhotoImportTripCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = React.useState<string[]>([]);
  const [lastScanResult, setLastScanResult] = React.useState<PhotoLibraryScanResult>();
  const [scanProgress, setScanProgress] = React.useState<PhotoLibraryScanProgress>();
  const [hasOpenedPhotoImportResults, setHasOpenedPhotoImportResults] =
    React.useState(false);
  const [hasDeferredPhotoImportResults, setHasDeferredPhotoImportResults] =
    React.useState(false);
  const [hasSavedPhotoImportResults, setHasSavedPhotoImportResults] =
    React.useState(false);
  const [lastSavedTripCount, setLastSavedTripCount] = React.useState(0);

  const startPhotoImportAnalysis = React.useCallback(() => {
    setStatus('analyzing');
    setDetectionState('detecting');
    setErrorMessage(undefined);
    setHasOpenedPhotoImportResults(false);
    setHasDeferredPhotoImportResults(false);
    setHasSavedPhotoImportResults(false);
    setLastSavedTripCount(0);
    setLastScanResult(undefined);
    setScanProgress(undefined);
  }, []);

  const runPhotoImportDetection = React.useCallback(async (options: PhotoImportRunOptions = {}) => {
    startPhotoImportAnalysis();
    const resolvedLivingArea = options.livingArea === undefined
      ? createLivingAreaFromProfile(profile.basedIn, profile.basedInPlace)
      : options.livingArea;

    try {
      const scanResult = await scanEntirePhotoLibraryForTrips({
        livingArea: resolvedLivingArea,
        onCandidatesUpdated: (updatedCandidates) => {
          setCandidates(updatedCandidates);
          setSelectedCandidateIds(
            updatedCandidates
              .filter((candidate) => candidate.initiallySelected)
              .map((candidate) => candidate.id),
          );
        },
        onProgress: setScanProgress,
        source: options.source ?? 'home',
      });

      if (scanResult.permissionState === 'denied') {
        setStatus('not_started');
        setDetectionState('permissionDenied');
        setLastScanResult(scanResult);
        return 'permissionDenied';
      }

      const detectedCandidates = scanResult.candidates;
      const hasVisibleOrPendingCandidates =
        detectedCandidates.length > 0 || scanResult.pendingEnrichmentCandidateCount > 0;
      const nextState: PhotoImportDetectionState =
        hasVisibleOrPendingCandidates ? 'success' : 'empty';

      setCandidates(detectedCandidates);
      setLastScanResult(scanResult);
      setSelectedCandidateIds(
        detectedCandidates
          .filter((candidate) => candidate.initiallySelected)
          .map((candidate) => candidate.id),
      );
      setStatus('results_ready');
      setDetectionState(nextState);

      return nextState;
    } catch (error) {
      setStatus('not_started');
      setDetectionState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Photo import detection failed');
      return 'error';
    } finally {
      if (__DEV__) {
        console.info('[photo-import scan] cleanup executed');
      }
    }
  }, [profile.basedIn, profile.basedInPlace, startPhotoImportAnalysis]);

  const requestAccessAndStartAnalysis = React.useCallback(async (options?: PhotoImportRunOptions) => {
    await runPhotoImportDetection(options);
  }, [runPhotoImportDetection]);

  const hydrateCandidateCovers = React.useCallback(async (candidateIds: string[]) => {
    await hydrateLocalDetectedTripDraftCovers(candidateIds, {
      onCandidatesUpdated: (updatedCandidates) => {
        setCandidates(updatedCandidates);
        setSelectedCandidateIds((current) => {
          const availableIds = new Set(updatedCandidates.map((candidate) => candidate.id));
          const retainedIds = current.filter((candidateId) => availableIds.has(candidateId));

          if (retainedIds.length > 0) {
            return retainedIds;
          }

          return updatedCandidates
            .filter((candidate) => candidate.initiallySelected)
            .map((candidate) => candidate.id);
        });
      },
    });
  }, []);

  const toggleCandidate = React.useCallback((candidateId: string) => {
    setSelectedCandidateIds((current) => {
      if (current.includes(candidateId)) {
        return current.filter((id) => id !== candidateId);
      }

      return [...current, candidateId];
    });
  }, []);

  const openPhotoImportResults = React.useCallback(() => {
    setHasOpenedPhotoImportResults(true);
  }, []);

  const deferPhotoImportResults = React.useCallback(() => {
    setHasDeferredPhotoImportResults(true);
  }, []);

  const closePhotoImportCompleteModal = React.useCallback(() => {
    setHasDeferredPhotoImportResults(true);
  }, []);

  const dismissPhotoImportSavedModal = React.useCallback(() => {
    setLastSavedTripCount(0);
  }, []);

  const saveSelectedPhotoImportResults = React.useCallback(async (candidateIds?: string[]) => {
    const idsToSave = candidateIds ?? selectedCandidateIds;

    if (idsToSave.length === 0) {
      return;
    }

    const selectedCandidates = candidates.filter((candidate) =>
      idsToSave.includes(candidate.id),
    );
    addSavedPhotoImportCandidates(selectedCandidates);
    setHasSavedPhotoImportResults(true);
    setLastSavedTripCount(idsToSave.length);
    setHasDeferredPhotoImportResults(false);
    setStatus('reviewed');
  }, [candidates, selectedCandidateIds]);

  const saveSelectedCandidates = React.useCallback(async () => {
    await saveSelectedPhotoImportResults(selectedCandidateIds);
  }, [saveSelectedPhotoImportResults, selectedCandidateIds]);

  const skipOnboarding = React.useCallback(async () => {
    setStatus('skipped');
  }, []);

  const value = React.useMemo(
    () => ({
      status,
      detectionState,
      errorMessage,
      progress:
        detectionState === 'detecting'
          ? scanProgress?.totalAssetCount
            ? scanProgress.hasNextPage
              ? Math.min(99, Math.round((scanProgress.scannedAssetCount / scanProgress.totalAssetCount) * 100))
              : 100
            : 1
          : status === 'results_ready'
            ? 100
            : 0,
      candidates,
      selectedCandidateIds,
      hasOpenedPhotoImportResults,
      hasDeferredPhotoImportResults,
      hasSavedPhotoImportResults,
      lastSavedTripCount,
      lastScanResult,
      scanProgress,
      startPhotoImportAnalysis,
      requestAccessAndStartAnalysis,
      runPhotoImportDetection,
      hydrateCandidateCovers,
      toggleCandidate,
      openPhotoImportResults,
      deferPhotoImportResults,
      closePhotoImportCompleteModal,
      dismissPhotoImportSavedModal,
      saveSelectedPhotoImportResults,
      saveSelectedCandidates,
      skipOnboarding,
    }),
    [
      candidates,
      closePhotoImportCompleteModal,
      deferPhotoImportResults,
      dismissPhotoImportSavedModal,
      detectionState,
      errorMessage,
      hasDeferredPhotoImportResults,
      hasOpenedPhotoImportResults,
      hasSavedPhotoImportResults,
      hydrateCandidateCovers,
      lastSavedTripCount,
      lastScanResult,
      scanProgress,
      openPhotoImportResults,
      requestAccessAndStartAnalysis,
      runPhotoImportDetection,
      saveSelectedCandidates,
      saveSelectedPhotoImportResults,
      selectedCandidateIds,
      startPhotoImportAnalysis,
      skipOnboarding,
      status,
      toggleCandidate,
    ],
  );

  return (
    <PhotoImportFlowContext.Provider value={value}>
      {children}
    </PhotoImportFlowContext.Provider>
  );
}

export function usePhotoImportFlowContext() {
  const context = React.useContext(PhotoImportFlowContext);

  if (!context) {
    throw new Error('usePhotoImportFlow must be used within PhotoImportFlowProvider');
  }

  return context;
}
