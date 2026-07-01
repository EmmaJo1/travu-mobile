import React from 'react';

import { addSavedPhotoImportCandidates } from '@/constants/savedMyPageTrips';
import {
  MOCK_PHOTO_IMPORT_CANDIDATES,
  mockPhotoImportProvider,
} from '@/services/photoImport/mockPhotoImportProvider';
import type {
  PhotoImportDetectionState,
  PhotoImportStatus,
  PhotoImportTripCandidate,
} from '@/services/photoImport/types';

const MOCK_ANALYSIS_DELAY_MS = 1600;
const MOCK_ANALYSIS_PROGRESS = 62;

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
  startPhotoImportAnalysis: () => void;
  requestAccessAndStartAnalysis: () => Promise<void>;
  runPhotoImportDetection: () => Promise<PhotoImportDetectionState>;
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
  const [status, setStatus] = React.useState<PhotoImportStatus>('not_started');
  const [detectionState, setDetectionState] =
    React.useState<PhotoImportDetectionState>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const [candidates, setCandidates] = React.useState<PhotoImportTripCandidate[]>(
    MOCK_PHOTO_IMPORT_CANDIDATES,
  );
  const [selectedCandidateIds, setSelectedCandidateIds] = React.useState<string[]>(
    MOCK_PHOTO_IMPORT_CANDIDATES
      .filter((candidate) => candidate.initiallySelected)
      .map((candidate) => candidate.id),
  );
  const [hasOpenedPhotoImportResults, setHasOpenedPhotoImportResults] =
    React.useState(false);
  const [hasDeferredPhotoImportResults, setHasDeferredPhotoImportResults] =
    React.useState(false);
  const [hasSavedPhotoImportResults, setHasSavedPhotoImportResults] =
    React.useState(false);
  const [lastSavedTripCount, setLastSavedTripCount] = React.useState(0);

  React.useEffect(() => {
    if (status !== 'analyzing') {
      return undefined;
    }

    // TODO: Replace mock delay with real photo library analysis status.
    const timer = setTimeout(() => {
      setStatus('results_ready');
    }, MOCK_ANALYSIS_DELAY_MS);

    return () => clearTimeout(timer);
  }, [status]);

  const startPhotoImportAnalysis = React.useCallback(() => {
    setStatus('analyzing');
    setDetectionState('detecting');
    setErrorMessage(undefined);
    setHasOpenedPhotoImportResults(false);
    setHasDeferredPhotoImportResults(false);
    setHasSavedPhotoImportResults(false);
    setLastSavedTripCount(0);
  }, []);

  const runPhotoImportDetection = React.useCallback(async () => {
    startPhotoImportAnalysis();

    try {
      const permission = await mockPhotoImportProvider.requestPhotoLibraryAccess();

      if (permission !== 'granted') {
        setStatus('not_started');
        setDetectionState('permissionDenied');
        return 'permissionDenied';
      }

      await mockPhotoImportProvider.startAnalysis();
      const detectedCandidates = await mockPhotoImportProvider.getCandidates();
      const nextState: PhotoImportDetectionState =
        detectedCandidates.length > 0 ? 'success' : 'empty';

      setCandidates(detectedCandidates);
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
    }
  }, [startPhotoImportAnalysis]);

  const requestAccessAndStartAnalysis = React.useCallback(async () => {
    await runPhotoImportDetection();
  }, [runPhotoImportDetection]);

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

    await mockPhotoImportProvider.saveCandidates(idsToSave);
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
    await mockPhotoImportProvider.skipOnboarding();
    setStatus('skipped');
  }, []);

  const value = React.useMemo(
    () => ({
      status,
      detectionState,
      errorMessage,
      progress:
        detectionState === 'detecting'
          ? MOCK_ANALYSIS_PROGRESS
          : status === 'results_ready'
            ? 100
            : 0,
      candidates,
      selectedCandidateIds,
      hasOpenedPhotoImportResults,
      hasDeferredPhotoImportResults,
      hasSavedPhotoImportResults,
      lastSavedTripCount,
      startPhotoImportAnalysis,
      requestAccessAndStartAnalysis,
      runPhotoImportDetection,
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
      lastSavedTripCount,
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
