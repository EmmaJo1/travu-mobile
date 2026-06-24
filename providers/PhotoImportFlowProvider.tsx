import React from 'react';

import { addSavedPhotoImportCandidates } from '@/constants/savedMyPageTrips';
import {
  MOCK_PHOTO_IMPORT_CANDIDATES,
  mockPhotoImportProvider,
} from '@/services/photoImport/mockPhotoImportProvider';
import type {
  PhotoImportStatus,
  PhotoImportTripCandidate,
} from '@/services/photoImport/types';

const MOCK_ANALYSIS_DELAY_MS = 1600;
const MOCK_ANALYSIS_PROGRESS = 62;

interface PhotoImportFlowContextValue {
  status: PhotoImportStatus;
  progress: number;
  candidates: PhotoImportTripCandidate[];
  selectedCandidateIds: string[];
  hasOpenedPhotoImportResults: boolean;
  hasDeferredPhotoImportResults: boolean;
  hasSavedPhotoImportResults: boolean;
  lastSavedTripCount: number;
  startPhotoImportAnalysis: () => void;
  requestAccessAndStartAnalysis: () => Promise<void>;
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
  const [candidates] = React.useState<PhotoImportTripCandidate[]>(MOCK_PHOTO_IMPORT_CANDIDATES);
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
    setHasOpenedPhotoImportResults(false);
    setHasDeferredPhotoImportResults(false);
    setHasSavedPhotoImportResults(false);
    setLastSavedTripCount(0);
  }, []);

  const requestAccessAndStartAnalysis = React.useCallback(async () => {
    const permission = await mockPhotoImportProvider.requestPhotoLibraryAccess();

    if (permission !== 'granted') {
      return;
    }

    await mockPhotoImportProvider.startAnalysis();
    startPhotoImportAnalysis();
  }, [startPhotoImportAnalysis]);

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
      progress:
        status === 'analyzing' ? MOCK_ANALYSIS_PROGRESS : status === 'results_ready' ? 100 : 0,
      candidates,
      selectedCandidateIds,
      hasOpenedPhotoImportResults,
      hasDeferredPhotoImportResults,
      hasSavedPhotoImportResults,
      lastSavedTripCount,
      startPhotoImportAnalysis,
      requestAccessAndStartAnalysis,
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
      hasDeferredPhotoImportResults,
      hasOpenedPhotoImportResults,
      hasSavedPhotoImportResults,
      lastSavedTripCount,
      openPhotoImportResults,
      requestAccessAndStartAnalysis,
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
