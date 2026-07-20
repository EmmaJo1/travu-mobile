import React from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { useUserProfile } from '@/providers/UserProfileProvider';
import {
  createLivingAreaFromProfile,
  type LivingArea,
} from '@/services/location/livingAreas';
import {
  getLocalDetectedTripCandidates,
  getLocalDetectedTripDraft,
  hydrateSavedDetectedCandidateRegistry,
  hydrateLocalDetectedTripDraftCovers,
  markLocalDetectedTripDraftSaveFailed,
  markLocalDetectedTripDraftSaved,
  markLocalDetectedTripDraftSaving,
  recordSavedDetectedTripDraft,
  scanEntirePhotoLibraryForTrips,
  sortDetectedCandidatesOldestFirst,
  type PhotoLibraryScanProgress,
  type PhotoLibraryScanResult,
} from '@/services/photoImport/localDetectedTripDraftStore';
import { saveDetectedTripDraftToSupabase } from '@/services/photoImport/saveDetectedTripDraft';
import type {
  PhotoImportDetectionState,
  PhotoImportStatus,
  PhotoImportTripCandidate,
} from '@/services/photoImport/types';

type PhotoImportRunOptions = {
  homeRegionFilterSkipReason?: 'not_configured' | 'skipped_by_user' | 'invalid_coordinates' | 'storage_not_ready';
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

function getCandidateOutOfOrderPairCount(candidates: PhotoImportTripCandidate[]) {
  let outOfOrderPairCount = 0;

  for (let index = 1; index < candidates.length; index += 1) {
    const previous = candidates[index - 1]?.debugMetadata;
    const current = candidates[index]?.debugMetadata;
    const previousKey = `${previous?.startDate ?? ''}|${previous?.endDate ?? ''}`;
    const currentKey = `${current?.startDate ?? ''}|${current?.endDate ?? ''}`;

    if (previousKey > currentKey) {
      outOfOrderPairCount += 1;
    }
  }

  return outOfOrderPairCount;
}

function logProviderCandidateDelivery(
  stage: string,
  candidatesToLog: PhotoImportTripCandidate[],
  scanAttemptId?: string,
) {
  if (!__DEV__) {
    return;
  }

  const outOfOrderPairCount = getCandidateOutOfOrderPairCount(candidatesToLog);

  console.info('[detectedCandidateStableSortSummary]', {
    candidateCount: candidatesToLog.length,
    firstStartDate: candidatesToLog[0]?.debugMetadata?.startDate,
    isAscending: outOfOrderPairCount === 0,
    lastStartDate: candidatesToLog[candidatesToLog.length - 1]?.debugMetadata?.startDate,
    outOfOrderPairCount,
    scanAttemptId,
    stage,
  });
}

function getCandidatesForScanAttempt(
  candidatesToFilter: PhotoImportTripCandidate[],
  scanAttemptId?: string,
) {
  if (!scanAttemptId) {
    return [];
  }

  return candidatesToFilter.filter(
    (candidate) => candidate.debugMetadata?.scanAttemptId === scanAttemptId,
  );
}

function getCandidateIdentityKey(candidatesToCompare: PhotoImportTripCandidate[]) {
  return candidatesToCompare
    .map((candidate) => [
      candidate.id,
      candidate.city,
      candidate.photoCount,
      candidate.debugMetadata?.scanAttemptId ?? '',
      JSON.stringify(candidate.image),
    ].join(':'))
    .join('|');
}

export function PhotoImportFlowProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { canUseSupabaseUserData, user } = useAuth();
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
  const activeScanAttemptIdRef = React.useRef<string | undefined>(undefined);
  const scanInvocationIdRef = React.useRef(0);

  const startPhotoImportAnalysis = React.useCallback(() => {
    setStatus('analyzing');
    setDetectionState('detecting');
    setErrorMessage(undefined);
    setCandidates([]);
    setSelectedCandidateIds([]);
    setHasOpenedPhotoImportResults(false);
    setHasDeferredPhotoImportResults(false);
    setHasSavedPhotoImportResults(false);
    setLastSavedTripCount(0);
    setLastScanResult(undefined);
    setScanProgress(undefined);
  }, []);

  const runPhotoImportDetection = React.useCallback(async (options: PhotoImportRunOptions = {}) => {
    const invocationId = scanInvocationIdRef.current + 1;
    scanInvocationIdRef.current = invocationId;
    activeScanAttemptIdRef.current = undefined;
    startPhotoImportAnalysis();
    const resolvedLivingArea = options.livingArea === undefined
      ? createLivingAreaFromProfile(profile.basedIn, profile.basedInPlace)
      : options.livingArea;

    try {
      if (__DEV__) {
        console.info('[photo-import provider] scan request', {
          entryPoint: options.source ?? 'home',
          hasHomeRegion: Boolean(resolvedLivingArea),
          hasValidHomeCoordinates: Boolean(
            resolvedLivingArea &&
              Number.isFinite(resolvedLivingArea.latitude) &&
              Number.isFinite(resolvedLivingArea.longitude),
          ),
          homeRegionFilterSkipReason: options.homeRegionFilterSkipReason,
          livingAreaDisplayName: resolvedLivingArea?.displayName,
          profileBasedIn: profile.basedIn,
          profileBasedInPlaceExists: Boolean(profile.basedInPlace),
        });
      }

      await hydrateSavedDetectedCandidateRegistry(user?.id);
      const scanResult = await scanEntirePhotoLibraryForTrips({
        homeRegionFilterSkipReason: options.homeRegionFilterSkipReason,
        livingArea: resolvedLivingArea,
        onCandidatesUpdated: (updatedCandidates) => {
          if (scanInvocationIdRef.current !== invocationId) {
            return;
          }

          const activeScanAttemptId = activeScanAttemptIdRef.current;
          const scopedCandidates = getCandidatesForScanAttempt(
            updatedCandidates,
            activeScanAttemptId,
          );

          if (!activeScanAttemptId || scopedCandidates.length === 0) {
            if (__DEV__) {
              console.info('[photo-import provider] candidate update ignored', {
                activeScanAttemptId,
                candidateCountBeforeScope: updatedCandidates.length,
                reason: activeScanAttemptId ? 'no_candidates_for_active_attempt' : 'active_attempt_not_ready',
                stage: 'provider_on_candidates_updated',
              });
            }
            return;
          }

          const sortedUpdatedCandidates = sortDetectedCandidatesOldestFirst(scopedCandidates);

          logProviderCandidateDelivery(
            'provider_on_candidates_updated',
            sortedUpdatedCandidates,
            activeScanAttemptId,
          );
          setCandidates((current) => (
            getCandidateIdentityKey(current) === getCandidateIdentityKey(sortedUpdatedCandidates)
              ? current
              : sortedUpdatedCandidates
          ));
          setSelectedCandidateIds(
            sortedUpdatedCandidates
              .filter((candidate) => candidate.initiallySelected)
              .map((candidate) => candidate.id),
          );
        },
        onProgress: (nextProgress) => {
          if (scanInvocationIdRef.current !== invocationId) {
            return;
          }

          if (nextProgress.scanAttemptId) {
            activeScanAttemptIdRef.current = nextProgress.scanAttemptId;
          }
          setScanProgress(nextProgress);
        },
        savedRegistryUserId: user?.id,
        source: options.source ?? 'home',
      });

      if (scanInvocationIdRef.current !== invocationId) {
        return 'error';
      }

      activeScanAttemptIdRef.current = scanResult.scanAttemptId;

      if (scanResult.permissionState === 'denied') {
        setStatus('not_started');
        setDetectionState('permissionDenied');
        setLastScanResult(scanResult);
        return 'permissionDenied';
      }

      const detectedCandidates = sortDetectedCandidatesOldestFirst(
        getCandidatesForScanAttempt(scanResult.candidates, scanResult.scanAttemptId),
      );
      logProviderCandidateDelivery(
        'provider_scan_result_candidates',
        detectedCandidates,
        scanResult.scanAttemptId,
      );
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
      if (scanInvocationIdRef.current === invocationId) {
        setStatus('not_started');
        setDetectionState('error');
        setErrorMessage(error instanceof Error ? error.message : 'Photo import detection failed');
      }
      return 'error';
    } finally {
      if (__DEV__) {
        console.info('[photo-import scan] cleanup executed');
      }
    }
  }, [profile.basedIn, profile.basedInPlace, startPhotoImportAnalysis, user?.id]);

  const requestAccessAndStartAnalysis = React.useCallback(async (options?: PhotoImportRunOptions) => {
    await runPhotoImportDetection(options);
  }, [runPhotoImportDetection]);

  const hydrateCandidateCovers = React.useCallback(async (candidateIds: string[]) => {
    const requestedScanAttemptId = activeScanAttemptIdRef.current;

    if (!requestedScanAttemptId) {
      return;
    }

    await hydrateLocalDetectedTripDraftCovers(candidateIds, {
      onCandidatesUpdated: (updatedCandidates) => {
        const activeScanAttemptId = activeScanAttemptIdRef.current;

        if (!activeScanAttemptId || activeScanAttemptId !== requestedScanAttemptId) {
          if (__DEV__) {
            console.info('[photo-import provider] cover update ignored', {
              activeScanAttemptId,
              reason: 'scan_attempt_changed',
              requestedScanAttemptId,
            });
          }
          return;
        }

        const scopedCandidates = getCandidatesForScanAttempt(
          updatedCandidates,
          activeScanAttemptId,
        );

        if (scopedCandidates.length === 0) {
          return;
        }

        const sortedUpdatedCandidates = sortDetectedCandidatesOldestFirst(scopedCandidates);

        logProviderCandidateDelivery(
          'provider_cover_hydration_candidates',
          sortedUpdatedCandidates,
          activeScanAttemptId,
        );
        setCandidates((current) => (
          getCandidateIdentityKey(current) === getCandidateIdentityKey(sortedUpdatedCandidates)
            ? current
            : sortedUpdatedCandidates
        ));
        setSelectedCandidateIds((current) => {
          const availableIds = new Set(sortedUpdatedCandidates.map((candidate) => candidate.id));
          const retainedIds = current.filter((candidateId) => availableIds.has(candidateId));

          if (retainedIds.length > 0) {
            return retainedIds;
          }

          return sortedUpdatedCandidates
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

    if (!canUseSupabaseUserData || !user?.id) {
      throw new Error('A Supabase session is required to save detected trips.');
    }

    let savedCount = 0;
    const savedTripIds: string[] = [];
    const savedTripDayIds: string[] = [];

    for (const candidateId of idsToSave) {
      const draft = getLocalDetectedTripDraft(candidateId);
      const saveAttemptId = `detected-save-${candidateId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      if (!draft) {
        continue;
      }

      if (draft.saveStatus === 'saved' && draft.savedTripId) {
        savedCount += 1;
        continue;
      }

      if (draft.saveStatus === 'saving') {
        if (__DEV__) {
          console.info('[detected trip save] duplicate blocked', {
            detectedTripSaveBlockedDuplicate: true,
            draftId: draft.id,
          });
        }
        continue;
      }

      markLocalDetectedTripDraftSaving(draft.id);

      try {
        const result = await saveDetectedTripDraftToSupabase(draft, {
          saveAttemptId,
        });
        await recordSavedDetectedTripDraft(user.id, draft.id, result.trip.id);
        markLocalDetectedTripDraftSaved(draft.id, result.trip.id);
        savedTripIds.push(result.trip.id);
        savedTripDayIds.push(...result.tripDays.map((tripDay) => tripDay.id));
        savedCount += 1;
      } catch (error) {
        markLocalDetectedTripDraftSaveFailed(
          draft.id,
          error instanceof Error ? error.message : 'Detected trip save failed',
        );
        throw error;
      }
    }

    const activeScanAttemptId = activeScanAttemptIdRef.current;
    const nextCandidates = sortDetectedCandidatesOldestFirst(
      getCandidatesForScanAttempt(getLocalDetectedTripCandidates(), activeScanAttemptId),
    );
    logProviderCandidateDelivery(
      'provider_after_save_candidates',
      nextCandidates,
      activeScanAttemptId,
    );
    setCandidates(nextCandidates);
    setSelectedCandidateIds((current) => {
      const availableIds = new Set(nextCandidates.map((candidate) => candidate.id));
      return current.filter((candidateId) => availableIds.has(candidateId));
    });

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.myTrips(user.id) }),
      queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.recentTripsRoot(user.id) }),
      queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.activeTrip(user.id) }),
      ...savedTripIds.flatMap((tripId) => [
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.tripDetail(user.id, tripId) }),
        queryClient.invalidateQueries({ queryKey: supabaseQueryKeys.tripDays(user.id, tripId) }),
      ]),
      ...savedTripDayIds.map((tripDayId) =>
        queryClient.invalidateQueries({
          queryKey: supabaseQueryKeys.tripDayPlaces(user.id, tripDayId),
        }),
      ),
    ]).catch((error: unknown) => {
      console.warn('[PhotoImportFlowProvider] detected trip save invalidate failed', error);
    });

    setHasSavedPhotoImportResults(true);
    setLastSavedTripCount(savedCount);
    setHasDeferredPhotoImportResults(false);
    setStatus('reviewed');
  }, [
    canUseSupabaseUserData,
    queryClient,
    selectedCandidateIds,
    user?.id,
  ]);

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
