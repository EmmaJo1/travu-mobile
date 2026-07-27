import {
  createTripWithDays,
  fetchTripById,
  softDeleteTrip,
  type TripRow,
} from '@/services/supabase/trips';
import { fetchTripDaysByTripId, type TripDayRow } from '@/services/supabase/tripDays';
import {
  createPlaceForTripDay,
  fetchPlacesByTripDayId,
  type PlaceRow,
} from '@/services/supabase/places';
import { uploadPhotoAsset } from '@/services/supabase/photos';
import {
  getLocalDetectedPhotoStableIdentifier,
  prepareLocalDetectedPhotoForUpload,
  type LocalDetectedPhoto,
  type LocalDetectedPlaceGroup,
  type LocalDetectedTripDraft,
} from '@/services/photoImport/localDetectedTripDraftStore';

const PHOTO_UPLOAD_CONCURRENCY = 3;
const PHOTO_PREPARATION_CONCURRENCY = 4;
const activeDetectedTripSaveOperations =
  new Map<string, Promise<SaveDetectedTripDraftResult>>();

export interface DetectedTripPhotoSaveProgress {
  completedCount: number;
  phase: 'preparing' | 'uploading';
  totalCount: number;
}

export interface DetectedTripSavePlaceInput {
  cityName?: string | null;
  countryName?: string | null;
  dateKey?: string | null;
  dayId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  name: string;
  photoCount?: number | null;
  sourceGroupId?: string | null;
  time?: string | null;
}

export interface SaveDetectedTripDraftOptions {
  onPhotoProgress?: (progress: DetectedTripPhotoSaveProgress) => void;
  places?: DetectedTripSavePlaceInput[];
  saveAttemptId?: string;
}

export interface SaveDetectedTripDraftResult {
  photoReferenceCreatedCount: number;
  photoUploadFailedCount: number;
  photoUploadTotalCount: number;
  placeCreatedCount: number;
  places: PlaceRow[];
  trip: TripRow;
  tripDayCreatedCount: number;
  tripDays: TripDayRow[];
}

type DetectedTripSaveStage =
  | 'validate_draft'
  | 'create_trip'
  | 'fetch_trip_days'
  | 'validate_trip_day_count'
  | 'map_draft_days'
  | 'insert_places'
  | 'validate_place_count'
  | 'upload_photos'
  | 'rollback';

export class DetectedTripSaveError extends Error {
  code: string;
  details?: Record<string, unknown>;
  originalSupabaseCode?: string;
  rollbackAttempted?: boolean;
  rollbackSucceeded?: boolean;
  stage: DetectedTripSaveStage;

  constructor(
    message: string,
    {
      code = 'detected_trip_save_failed',
      details,
      originalSupabaseCode,
      rollbackAttempted,
      rollbackSucceeded,
      stage,
    }: {
      code?: string;
      details?: Record<string, unknown>;
      originalSupabaseCode?: string;
      rollbackAttempted?: boolean;
      rollbackSucceeded?: boolean;
      stage: DetectedTripSaveStage;
    },
  ) {
    super(message);
    this.name = 'DetectedTripSaveError';
    this.code = code;
    this.details = details;
    this.originalSupabaseCode = originalSupabaseCode;
    this.rollbackAttempted = rollbackAttempted;
    this.rollbackSucceeded = rollbackSucceeded;
    this.stage = stage;
  }
}

export function getDetectedTripSaveUserMessage(error: unknown) {
  if (error instanceof DetectedTripSaveError && error.stage === 'upload_photos') {
    return {
      message: error.message,
      title: '사진을 모두 저장하지 못했어요',
    };
  }

  return {
    message: '잠시 후 다시 시도해주세요.',
    title: '여행을 저장하지 못했어요',
  };
}

const FORBIDDEN_TRIP_TITLES = new Set([
  '\uC9C0\uC5ED \uD655\uC778 \uC911',
  '\uC9C0\uC5ED \uD655\uC778 \uC911 \uC5EC\uD589',
  '\uC9C0\uC5ED \uBBF8\uD655\uC778 \uC5EC\uD589',
  '\uC704\uCE58 \uAE30\uBC18 \uC5EC\uD589',
  '\uD574\uC678 \uC5EC\uD589',
  '\uC0AC\uC9C4\uCCA9 \uC5EC\uD589 \uD6C4\uBCF4',
  '\uC5EC\uD589 \uD6C4\uBCF4',
]);

function normalizeText(value?: string | null) {
  return value?.trim() ?? '';
}

function normalizeTripTitle(draft: LocalDetectedTripDraft) {
  const candidates = [
    draft.displayTitle,
    draft.title,
    draft.locationLabel ? `${draft.locationLabel} \uC5EC\uD589` : undefined,
  ];

  for (const candidate of candidates) {
    const value = normalizeText(candidate);

    if (value && !FORBIDDEN_TRIP_TITLES.has(value)) {
      return value;
    }
  }

  return '\uC9C0\uC5ED \uBBF8\uD655\uC778 \uC5EC\uD589';
}

function getDestinationCity(title: string) {
  return title.replace(/\s*\uC5EC\uD589$/u, '').trim() || title;
}

function parseDateLabelToDateKey(dateLabel?: string | null) {
  const matched = dateLabel?.replace(/\s+/g, '').match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/);

  if (!matched) {
    return null;
  }

  return `${matched[1]}-${String(Number(matched[2])).padStart(2, '0')}-${String(
    Number(matched[3]),
  ).padStart(2, '0')}`;
}

function parseTimeLabel(timeLabel?: string | null) {
  const trimmedTime = timeLabel?.trim();
  const matchedTime = trimmedTime?.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (!matchedTime) {
    return { hour: 0, minute: 0 };
  }

  const hour12 = Number(matchedTime[1]);
  const minute = Number(matchedTime[2] ?? 0);
  const period = matchedTime[3].toUpperCase();
  const hour = period === 'AM'
    ? hour12 % 12
    : (hour12 % 12) + 12;

  return { hour, minute };
}

function buildVisitedAt(dateKey?: string | null, timeLabel?: string | null) {
  if (!dateKey) {
    return null;
  }

  const { hour, minute } = parseTimeLabel(timeLabel);

  return `${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(
    2,
    '0',
  )}:00.000Z`;
}

function getDateKeyTime(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
    return NaN;
  }

  return Date.UTC(year, month - 1, day);
}

function getInclusiveDateRangeDayCount(startDate: string, endDate: string) {
  const startTime = getDateKeyTime(startDate);
  const endTime = getDateKeyTime(endDate);

  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) {
    return null;
  }

  return Math.floor((endTime - startTime) / 86_400_000) + 1;
}

function getErrorCode(error: unknown) {
  return typeof error === 'object' && error && 'code' in error
    ? String(error.code)
    : undefined;
}

function getErrorDetails(error: unknown) {
  return typeof error === 'object' && error && 'details' in error
    ? String(error.details)
    : undefined;
}

function getErrorHint(error: unknown) {
  return typeof error === 'object' && error && 'hint' in error
    ? String(error.hint)
    : undefined;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function logStageStarted(stage: DetectedTripSaveStage, draftId: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  console.info('[detected trip save] stage started', {
    detectedTripSaveStageStarted: true,
    draftId,
    stage,
    ...details,
  });
}

function logStageCompleted(stage: DetectedTripSaveStage, draftId: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  console.info('[detected trip save] stage completed', {
    detectedTripSaveStageCompleted: true,
    draftId,
    stage,
    ...details,
  });
}

function logStageFailed(
  stage: DetectedTripSaveStage,
  draftId: string,
  error: unknown,
  details?: Record<string, unknown>,
) {
  console.warn('[detected trip save] stage failed', {
    detectedTripSaveStageFailed: true,
    details: getErrorDetails(error),
    draftId,
    errorCode: getErrorCode(error),
    hint: getErrorHint(error),
    message: getErrorMessage(error),
    stage,
    ...details,
  });
}

function getGroupLatitude(group: LocalDetectedPlaceGroup) {
  return group.centroidLat ?? group.latitude ?? group.photos.find((photo) => (
    Number.isFinite(photo.latitude) && Number.isFinite(photo.longitude)
  ))?.latitude ?? null;
}

function getGroupLongitude(group: LocalDetectedPlaceGroup) {
  return group.centroidLng ?? group.longitude ?? group.photos.find((photo) => (
    Number.isFinite(photo.latitude) && Number.isFinite(photo.longitude)
  ))?.longitude ?? null;
}

function createPlaceInputsFromDraft(draft: LocalDetectedTripDraft): DetectedTripSavePlaceInput[] {
  return draft.days.flatMap((day) =>
    day.groups.map((group: LocalDetectedPlaceGroup, groupIndex) => {
      const latitude = getGroupLatitude(group);
      const longitude = getGroupLongitude(group);
      const fallbackName = Number.isFinite(latitude) && Number.isFinite(longitude)
        ? `\uC704\uCE58 \uADF8\uB8F9 ${groupIndex + 1}`
        : '\uC704\uCE58 \uC815\uBCF4 \uC5C6\uB294 \uC0AC\uC9C4';

      return {
        countryName: Number.isFinite(latitude) && Number.isFinite(longitude)
          ? draft.debugMetadata.rawPlacemarkCountry
          : null,
        dateKey: day.dateKey,
        latitude,
        longitude,
        name: group.groupDisplayName || group.label || fallbackName,
        photoCount: group.photos.length,
        sourceGroupId: group.id,
        time: group.time,
      };
    }),
  );
}

function resolvePlaceDateKey(place: DetectedTripSavePlaceInput) {
  return place.dateKey ?? parseDateLabelToDateKey(place.dayId);
}

function isInsertablePlaceInput(place: DetectedTripSavePlaceInput) {
  return normalizeText(place.name).length > 0 && (place.photoCount ?? 1) > 0;
}

interface DetectedTripPhotoUploadTarget {
  dateKey: string;
  groupId: string;
  identifier: string;
  photo: LocalDetectedPhoto;
}

function createDetectedTripPhotoUploadTargets(
  draft: LocalDetectedTripDraft,
): DetectedTripPhotoUploadTarget[] {
  const targetsByIdentifier = new Map<string, DetectedTripPhotoUploadTarget>();

  for (const day of draft.days) {
    for (const group of day.groups) {
      for (const photo of group.photos) {
        if (photo.isScreenshot) {
          continue;
        }

        const identifier = getLocalDetectedPhotoStableIdentifier(photo);

        if (!targetsByIdentifier.has(identifier)) {
          targetsByIdentifier.set(identifier, {
            dateKey: day.dateKey,
            groupId: group.id,
            identifier,
            photo,
          });
        }
      }
    }
  }

  return [...targetsByIdentifier.values()];
}

function createUploadExif(photo: LocalDetectedPhoto) {
  if (photo.orientation == null) {
    return photo.exif ?? null;
  }

  return {
    ...(photo.exif ?? {}),
    Orientation: photo.orientation,
  };
}

async function fetchPlacesForTripDays(tripDays: TripDayRow[]) {
  const placeGroups = await Promise.all(
    tripDays.map((tripDay) => fetchPlacesByTripDayId(tripDay.id)),
  );

  return placeGroups.flat();
}

async function uploadDetectedTripPhotos(
  draft: LocalDetectedTripDraft,
  trip: TripRow,
  tripDays: TripDayRow[],
  places: PlaceRow[],
  saveAttemptId: string,
  onPhotoProgress?: (progress: DetectedTripPhotoSaveProgress) => void,
): Promise<SaveDetectedTripDraftResult> {
  const targets = createDetectedTripPhotoUploadTargets(draft);
  const tripDayByDate = new Map(tripDays.map((tripDay) => [tripDay.date, tripDay]));
  const state = draft.photoSaveState;

  if (!state || state.tripId !== trip.id) {
    throw new DetectedTripSaveError('사진 저장 상태를 확인할 수 없어요. 다시 시도해주세요.', {
      code: 'photo_upload_state_missing',
      stage: 'upload_photos',
    });
  }

  const confirmedState = state;
  confirmedState.totalPhotoCount = targets.length;
  const isRetry = (confirmedState.saveAttemptCount ?? 0) > 0;
  confirmedState.saveAttemptCount = (confirmedState.saveAttemptCount ?? 0) + 1;
  const failedIdentifiers: string[] = [];
  const pendingTargets = targets.filter(
    (target) => !confirmedState.savedPhotoResultsByIdentifier[target.identifier],
  );
  const alreadySavedPhotoCount = targets.length - pendingTargets.length;
  const preparedTargets: DetectedTripPhotoUploadTarget[] = [];
  const preparationPromiseCache =
    new Map<string, Promise<LocalDetectedPhoto | null>>();
  let nextPreparationTargetIndex = 0;
  let preparedCompletedCount = 0;
  let nextTargetIndex = 0;
  let photoRowCreatedCount = 0;
  let rollbackObjectDeleteCount = 0;
  let uploadedPhotoCount = 0;

  logStageStarted('upload_photos', draft.id, {
    alreadySavedPhotoCount,
    attemptedPhotoCount: pendingTargets.length,
    expectedPhotoCount: targets.length,
    photoUploadTotalCount: targets.length,
    retryTargetCount: isRetry ? pendingTargets.length : 0,
    saveAttemptId,
    tripId: trip.id,
  });

  onPhotoProgress?.({
    completedCount: 0,
    phase: 'preparing',
    totalCount: pendingTargets.length,
  });

  async function prepareNextTarget() {
    while (nextPreparationTargetIndex < pendingTargets.length) {
      const target = pendingTargets[nextPreparationTargetIndex];
      nextPreparationTargetIndex += 1;
      let preparationPromise = preparationPromiseCache.get(target.identifier);

      if (!preparationPromise) {
        preparationPromise = prepareLocalDetectedPhotoForUpload(target.photo);
        preparationPromiseCache.set(target.identifier, preparationPromise);
      }

      const preparedPhoto = await preparationPromise;

      if (preparedPhoto) {
        preparedTargets.push(target);
      } else {
        failedIdentifiers.push(target.identifier);
      }

      preparedCompletedCount += 1;
      onPhotoProgress?.({
        completedCount: preparedCompletedCount,
        phase: 'preparing',
        totalCount: pendingTargets.length,
      });
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          PHOTO_PREPARATION_CONCURRENCY,
          pendingTargets.length,
        ),
      },
      () => prepareNextTarget(),
    ),
  );

  onPhotoProgress?.({
    completedCount: 0,
    phase: 'uploading',
    totalCount: preparedTargets.length,
  });

  let uploadCompletedCount = 0;
  async function uploadNextTarget() {
    while (nextTargetIndex < preparedTargets.length) {
      const target = preparedTargets[nextTargetIndex];
      nextTargetIndex += 1;

      const tripDay = tripDayByDate.get(target.dateKey);
      const preparedPhoto = target.photo;

      if (
        !tripDay ||
        preparedPhoto.preparationStatus !== 'ready' ||
        !preparedPhoto.localUri
      ) {
        failedIdentifiers.push(target.identifier);
        continue;
      }

      try {
        const result = await uploadPhotoAsset({
          exif: createUploadExif(preparedPhoto),
          fileName: preparedPhoto.filename,
          fileSize: preparedPhoto.fileSize,
          height: preparedPhoto.height,
          latitude: preparedPhoto.latitude,
          localUri: preparedPhoto.localUri,
          longitude: preparedPhoto.longitude,
          mimeType: preparedPhoto.mimeType,
          onLifecycleEvent: (event) => {
            if (event === 'storage_object_uploaded') {
              uploadedPhotoCount += 1;
            } else if (event === 'photo_row_created') {
              photoRowCreatedCount += 1;
            } else if (event === 'storage_object_deleted') {
              rollbackObjectDeleteCount += 1;
            }
          },
          placeId: confirmedState.placeIdsByGroupId[target.groupId] ?? null,
          takenAt: preparedPhoto.takenAt,
          tripDayId: tripDay.id,
          tripId: trip.id,
          width: preparedPhoto.width,
        });

        confirmedState.savedPhotoResultsByIdentifier[target.identifier] = {
          photoId: result.photo.id,
          storagePath: result.storagePath,
        };
      } catch (error) {
        failedIdentifiers.push(target.identifier);
        if (__DEV__) {
          console.warn('[detected trip save] photo upload failed', {
            draftId: draft.id,
            errorCode: getErrorCode(error),
            saveAttemptId,
          });
        }
      }
      uploadCompletedCount += 1;
      onPhotoProgress?.({
        completedCount: uploadCompletedCount,
        phase: 'uploading',
        totalCount: preparedTargets.length,
      });
    }
  }

  const workerCount = Math.min(PHOTO_UPLOAD_CONCURRENCY, preparedTargets.length);
  await Promise.all(
    Array.from({ length: workerCount }, () => uploadNextTarget()),
  );

  confirmedState.failedPhotoIdentifiers = failedIdentifiers;
  const savedPhotoCount = Object.keys(confirmedState.savedPhotoResultsByIdentifier).length;

  logStageCompleted('upload_photos', draft.id, {
    alreadySavedPhotoCount,
    attemptedPhotoCount: pendingTargets.length,
    expectedPhotoCount: targets.length,
    failedPhotoCount: failedIdentifiers.length,
    finalSavedPhotoCount: savedPhotoCount,
    photoRowCreatedCount,
    photoPreparationConcurrency: PHOTO_PREPARATION_CONCURRENCY,
    photoPreparationFailedCount: pendingTargets.length - preparedTargets.length,
    photoPreparationSuccessCount: preparedTargets.length,
    photoUploadAttemptedCount: pendingTargets.length,
    photoUploadConcurrency: PHOTO_UPLOAD_CONCURRENCY,
    photoUploadFailedCount: failedIdentifiers.length,
    photoUploadSuccessCount: savedPhotoCount,
    photoUploadTotalCount: targets.length,
    retryTargetCount: isRetry ? pendingTargets.length : 0,
    rollbackObjectDeleteCount,
    saveAttemptId,
    uploadedPhotoCount,
  });

  if (targets.length === 0 || failedIdentifiers.length > 0 || savedPhotoCount !== targets.length) {
    const failedCount = targets.length === 0
      ? draft.photoCount
      : Math.max(failedIdentifiers.length, targets.length - savedPhotoCount);

    throw new DetectedTripSaveError(
      `사진 ${failedCount}장을 저장하지 못했어요. 연결 상태를 확인한 뒤 다시 시도해주세요.`,
      {
        code: savedPhotoCount > 0 ? 'photo_upload_partial_failed' : 'photo_upload_all_failed',
        details: {
          photoUploadFailedCount: failedCount,
          photoUploadSuccessCount: savedPhotoCount,
          photoUploadTotalCount: targets.length,
          saveAttemptId,
        },
        stage: 'upload_photos',
      },
    );
  }

  return {
    photoReferenceCreatedCount: savedPhotoCount,
    photoUploadFailedCount: 0,
    photoUploadTotalCount: targets.length,
    placeCreatedCount: places.length,
    places,
    trip,
    tripDayCreatedCount: tripDays.length,
    tripDays,
  };
}

async function executeDetectedTripDraftSave(
  draft: LocalDetectedTripDraft,
  options: SaveDetectedTripDraftOptions = {},
): Promise<SaveDetectedTripDraftResult> {
  const startedAt = Date.now();
  const saveAttemptId = options.saveAttemptId ?? `save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const title = normalizeTripTitle(draft);
  const destinationCity = getDestinationCity(title);
  const saveableDays = draft.days.filter((day) => (
    Boolean(day.dateKey) &&
    day.groups.some((group) => group.photos.length > 0)
  ));
  const saveStartDate = saveableDays[0]?.dateKey ?? draft.startDate;
  const saveEndDate = saveableDays[saveableDays.length - 1]?.dateKey ?? draft.endDate;
  const expectedTripDayCount =
    getInclusiveDateRangeDayCount(saveStartDate, saveEndDate) ?? saveableDays.length;
  const expectedDraftDayDateKeys = [...new Set(saveableDays.map((day) => day.dateKey).filter(Boolean))];
  const expectedPlaces = options.places?.length
    ? options.places
    : createPlaceInputsFromDraft(draft);
  const expectedInsertablePlaces = expectedPlaces.filter(isInsertablePlaceInput);
  const expectedPlaceCount = expectedInsertablePlaces.length;
  const coverAvailable = Boolean(draft.coverPhotoUri);

  if (__DEV__) {
    console.info('[detected trip save] started', {
      detectedTripExpectedDayCount: expectedTripDayCount,
      detectedTripDraftDayCount: draft.days.length,
      detectedTripExpectedPlaceCount: expectedPlaceCount,
      detectedTripSaveCoverAvailable: coverAvailable,
      detectedTripSaveProceedingWithoutCover: !coverAvailable,
      detectedTripSaveBlockedByCoverRequirement: false,
      detectedTripSaveStarted: true,
      draftId: draft.id,
      saveAttemptId,
      endDate: draft.endDate,
      saveEndDate,
      saveStartDate,
      startDate: draft.startDate,
      title,
    });
  }

  logStageStarted('validate_draft', draft.id, {
    dayCount: draft.days.length,
    expectedPlaceCount,
    photoCount: draft.photoCount,
    saveAttemptId,
    saveableDayCount: saveableDays.length,
  });

  if (!draft.startDate || !draft.endDate || draft.photoCount <= 0) {
    const error = new DetectedTripSaveError('Detected trip draft is not saveable.', {
      code: 'invalid_detected_trip_draft',
      details: {
        endDate: draft.endDate,
        photoCount: draft.photoCount,
        startDate: draft.startDate,
      },
      stage: 'validate_draft',
    });
    logStageFailed('validate_draft', draft.id, error);
    throw error;
  }

  logStageCompleted('validate_draft', draft.id, { saveAttemptId });

  if (draft.photoSaveState?.tripId) {
    const existingTrip = await fetchTripById(draft.photoSaveState.tripId);

    if (!existingTrip) {
      throw new DetectedTripSaveError('저장 중인 여행 정보를 찾을 수 없어요.', {
        code: 'photo_retry_trip_missing',
        stage: 'upload_photos',
      });
    }

    const existingTripDays = await fetchTripDaysByTripId(existingTrip.id);
    const existingPlaces = await fetchPlacesForTripDays(existingTripDays);

    if (__DEV__) {
      console.info('[detected trip save] resuming failed photos', {
        draftId: draft.id,
        failedPhotoCount: draft.photoSaveState.failedPhotoIdentifiers.length,
        saveAttemptId,
        savedPhotoCount: Object.keys(
          draft.photoSaveState.savedPhotoResultsByIdentifier,
        ).length,
        tripId: existingTrip.id,
      });
    }

    return uploadDetectedTripPhotos(
      draft,
      existingTrip,
      existingTripDays,
      existingPlaces,
      saveAttemptId,
      options.onPhotoProgress,
    );
  }

  logStageStarted('create_trip', draft.id, { saveAttemptId });
  let trip: TripRow;

  try {
    trip = await createTripWithDays({
      destinationCity,
      endDate: saveEndDate,
      startDate: saveStartDate,
      status: 'detected',
      title,
    });
    logStageCompleted('create_trip', draft.id, {
      deletedAt: trip.deleted_at,
      endDate: trip.end_date,
      saveAttemptId,
      startDate: trip.start_date,
      tripId: trip.id,
      userId: trip.user_id,
    });
  } catch (error) {
    logStageFailed('create_trip', draft.id, error, {
      functionName: 'createTripWithDays',
      saveAttemptId,
    });
    throw new DetectedTripSaveError(getErrorMessage(error), {
      code: 'create_trip_failed',
      originalSupabaseCode: getErrorCode(error),
      stage: 'create_trip',
    });
  }

  if (__DEV__) {
    console.info('[detected trip save] trip created', {
      deletedAt: trip.deleted_at,
      detectedTripSaveTripCreated: true,
      detectedTripSavedTripId: trip.id,
      draftId: draft.id,
      saveAttemptId,
      endDate: trip.end_date,
      startDate: trip.start_date,
      userId: trip.user_id,
    });
  }

  let fetchedTripDays: TripDayRow[] = [];

  try {
    logStageStarted('fetch_trip_days', draft.id, {
      saveAttemptId,
      tripId: trip.id,
    });
    const tripDays = await fetchTripDaysByTripId(trip.id);
    fetchedTripDays = tripDays;
    logStageCompleted('fetch_trip_days', draft.id, {
      tripDayCount: tripDays.length,
      saveAttemptId,
      tripId: trip.id,
    });
    const tripDayByDate = new Map(tripDays.map((day) => [day.date, day]));
    const createdPlaces: PlaceRow[] = [];
    const placeIdsByGroupId: Record<string, string> = {};
    let placeInsertAttemptCount = 0;
    let placeInsertFailureCount = 0;
    const placeMappingByDate = new Map<string, {
      draftDayDate: string;
      entryCount: number;
      matchedTripDayId: string | null;
    }>();

    logStageStarted('validate_trip_day_count', draft.id, {
      createdTripDayCount: tripDays.length,
      expectedTripDayCount,
      saveAttemptId,
    });

    if (tripDays.length !== expectedTripDayCount) {
      const error = new DetectedTripSaveError('Detected trip day creation count mismatch.', {
        code: 'trip_day_count_mismatch',
        details: {
          detectedTripCreatedDayCount: tripDays.length,
          detectedTripExpectedDayCount: expectedTripDayCount,
          saveAttemptId,
        },
        stage: 'validate_trip_day_count',
      });
      logStageFailed('validate_trip_day_count', draft.id, error, { saveAttemptId });
      throw error;
    }

    logStageCompleted('validate_trip_day_count', draft.id, { saveAttemptId });
    logStageStarted('map_draft_days', draft.id, {
      draftDayDateKeys: expectedDraftDayDateKeys,
      saveAttemptId,
      tripDayDates: tripDays.map((day) => day.date),
    });

    const missingDraftDayDateKeys = expectedDraftDayDateKeys.filter((dateKey) => !tripDayByDate.has(dateKey));

    if (missingDraftDayDateKeys.length > 0) {
      const error = new DetectedTripSaveError('Detected trip draft days did not map to trip_days.', {
        code: 'draft_day_mapping_failed',
        details: {
          missingDraftDayDateKeys,
          saveAttemptId,
          tripDayDates: tripDays.map((day) => day.date),
        },
        stage: 'map_draft_days',
      });
      logStageFailed('map_draft_days', draft.id, error, { saveAttemptId });
      throw error;
    }

    logStageCompleted('map_draft_days', draft.id, {
      matchedDraftDayCount: expectedDraftDayDateKeys.length,
      saveAttemptId,
    });

    logStageStarted('insert_places', draft.id, {
      expectedPlaceCount,
      saveAttemptId,
      tripId: trip.id,
    });

    for (const [index, place] of expectedPlaces.entries()) {
      const willInsert = isInsertablePlaceInput(place);
      const dateKey = resolvePlaceDateKey(place);
      const tripDay = dateKey ? tripDayByDate.get(dateKey) : undefined;
      const placeName = normalizeText(place.name);

      if (__DEV__) {
        console.info('[detected trip save] place group evaluated', {
          dayDateKey: dateKey,
          detectedTripPlaceGroupEvaluated: true,
          groupIndex: index,
          hasCentroid: Number.isFinite(place.latitude) && Number.isFinite(place.longitude),
          hasDisplayName: Boolean(placeName),
          photoCount: place.photoCount ?? null,
          saveAttemptId,
          skipReason: willInsert
            ? tripDay ? null : 'missing_trip_day'
            : placeName ? 'empty_or_synthetic_group' : 'missing_place_name',
          willInsert: willInsert && Boolean(tripDay),
        });
      }

      if (!willInsert) {
        continue;
      }

      if (!tripDay) {
        placeInsertFailureCount += 1;
        if (__DEV__) {
          console.warn('[detected trip save] place day mapping failed', {
            dateKey,
            detectedTripSavedTripId: trip.id,
            placeName: place.name,
            saveAttemptId,
          });
        }
        continue;
      }

      if (dateKey) {
        const current = placeMappingByDate.get(dateKey) ?? {
          draftDayDate: dateKey,
          entryCount: 0,
          matchedTripDayId: tripDay.id,
        };
        current.entryCount += 1;
        current.matchedTripDayId = tripDay.id;
        placeMappingByDate.set(dateKey, current);
      }

      placeInsertAttemptCount += 1;

      try {
        const createdPlace = await createPlaceForTripDay({
          city: place.cityName ?? destinationCity,
          country: place.countryName ?? null,
          latitude: place.latitude ?? null,
          longitude: place.longitude ?? null,
          name: placeName,
          source: 'photo_cluster',
          tripDayId: tripDay.id,
          tripId: trip.id,
          visitedAt: buildVisitedAt(dateKey, place.time),
        });

        createdPlaces.push(createdPlace);
        if (place.sourceGroupId) {
          placeIdsByGroupId[place.sourceGroupId] = createdPlace.id;
        }
      } catch (error) {
        placeInsertFailureCount += 1;
        logStageFailed('insert_places', draft.id, error, {
          dateKey,
          functionName: 'createPlaceForTripDay',
          saveAttemptId,
          tableName: 'places',
          tripId: trip.id,
        });
      }
    }

    logStageCompleted('insert_places', draft.id, {
      detectedTripPlaceInsertAttemptCount: placeInsertAttemptCount,
      detectedTripPlaceInsertFailureCount: placeInsertFailureCount,
      detectedTripPlaceInsertSuccessCount: createdPlaces.length,
      saveAttemptId,
    });

    logStageStarted('validate_place_count', draft.id, {
      expectedPlaceCount,
      placeInsertAttemptCount,
      placeInsertFailureCount,
      placeInsertSuccessCount: createdPlaces.length,
      saveAttemptId,
    });

    const savedWithoutPlacesReason = expectedPlaceCount === 0
      ? 'draft_has_no_insertable_place_groups'
      : undefined;

    const successCriteriaMet =
      tripDays.length === expectedTripDayCount &&
      missingDraftDayDateKeys.length === 0 &&
      (expectedPlaceCount === 0 || createdPlaces.length > 0) &&
      createdPlaces.length === placeInsertAttemptCount &&
      placeInsertFailureCount === 0;

    if (__DEV__) {
      console.info('[detected trip save] place summary', {
        detectedTripCreatedDayCount: tripDays.length,
        detectedTripExpectedDayCount: expectedTripDayCount,
        detectedTripExpectedPlaceCount: expectedPlaceCount,
        detectedTripPlaceInsertAttemptCount: placeInsertAttemptCount,
        detectedTripPlaceInsertFailureCount: placeInsertFailureCount,
        detectedTripPlaceInsertSuccessCount: createdPlaces.length,
        detectedTripPlaceMapping: [...placeMappingByDate.values()],
        detectedTripSaveSuccessCriteriaMet: successCriteriaMet,
        detectedTripSavedWithoutPlacesReason: savedWithoutPlacesReason,
        detectedTripSavedTripId: trip.id,
        saveAttemptId,
      });
    }

    if (!successCriteriaMet) {
      const error = new DetectedTripSaveError('Detected trip places were not fully saved.', {
        code: 'place_count_validation_failed',
        details: {
          detectedTripCreatedDayCount: tripDays.length,
          detectedTripExpectedDayCount: expectedTripDayCount,
          detectedTripExpectedPlaceCount: expectedPlaceCount,
          detectedTripPlaceInsertAttemptCount: placeInsertAttemptCount,
          detectedTripPlaceInsertFailureCount: placeInsertFailureCount,
          detectedTripPlaceInsertSuccessCount: createdPlaces.length,
          saveAttemptId,
        },
        stage: 'validate_place_count',
      });
      logStageFailed('validate_place_count', draft.id, error, { saveAttemptId });
      throw error;
    }

    logStageCompleted('validate_place_count', draft.id, {
      detectedTripSavedWithoutPlacesReason: savedWithoutPlacesReason,
      saveAttemptId,
    });

    const photoUploadTargets = createDetectedTripPhotoUploadTargets(draft);
    draft.photoSaveState = {
      failedPhotoIdentifiers: photoUploadTargets.map((target) => target.identifier),
      placeIdsByGroupId,
      saveAttemptCount: 0,
      savedPhotoResultsByIdentifier: {},
      totalPhotoCount: photoUploadTargets.length,
      tripDayIdsByDate: Object.fromEntries(
        tripDays.map((tripDay) => [tripDay.date, tripDay.id]),
      ),
      tripId: trip.id,
    };

    const result = await uploadDetectedTripPhotos(
      draft,
      trip,
      tripDays,
      createdPlaces,
      saveAttemptId,
      options.onPhotoProgress,
    );

    if (__DEV__) {
      console.info('[detected trip save] completed', {
        detectedTripSaveCompleted: true,
        detectedTripSaveElapsedMs: Date.now() - startedAt,
        detectedTripSavePhotoReferenceCreatedCount: result.photoReferenceCreatedCount,
        detectedTripSavePlaceCreatedCount: createdPlaces.length,
        detectedTripSaveTripDayCreatedCount: tripDays.length,
        detectedTripSavedTripId: trip.id,
        saveAttemptId,
      });
    }

    return result;
  } catch (error) {
    if (error instanceof DetectedTripSaveError && error.stage === 'upload_photos') {
      if (__DEV__) {
        console.warn('[detected trip save] photo upload incomplete', {
          detectedTripSaveElapsedMs: Date.now() - startedAt,
          detectedTripSavedTripId: trip.id,
          draftId: draft.id,
          errorCode: error.code,
          saveAttemptId,
        });
      }
      throw error;
    }

    const rollbackReason = error instanceof Error ? error.message : String(error);

    logStageStarted('rollback', draft.id, {
      detectedTripSaveRollbackReason: rollbackReason,
      rollbackTripId: trip.id,
      saveAttemptId,
    });

    let rollbackSucceeded = false;

    try {
      await softDeleteTrip(trip.id);
      rollbackSucceeded = true;
      if (__DEV__) {
        console.info('[detected trip save] rollback completed', {
          detectedTripSaveRollbackCompleted: true,
          rollbackTripId: trip.id,
          saveAttemptId,
        });
      }
    } catch (rollbackError) {
      logStageFailed('rollback', draft.id, rollbackError, {
        detectedTripSaveRollbackFailed: true,
        rollbackTripId: trip.id,
        saveAttemptId,
      });
    }

    if (__DEV__) {
      console.warn('[detected trip save] failed', {
        detectedTripSaveElapsedMs: Date.now() - startedAt,
        detectedTripSaveFailed: true,
        detectedTripSaveRollbackReason: rollbackReason,
        detectedTripSavedTripId: trip.id,
        draftId: draft.id,
        errorCode: getErrorCode(error),
        errorMessage: getErrorMessage(error),
        errorStage: error instanceof DetectedTripSaveError ? error.stage : undefined,
        rollbackAttempted: true,
        rollbackSucceeded,
        saveAttemptId,
      });
    }

    if (error instanceof DetectedTripSaveError) {
      error.rollbackAttempted = true;
      error.rollbackSucceeded = rollbackSucceeded;
      throw error;
    }

    throw new DetectedTripSaveError(getErrorMessage(error), {
      code: 'detected_trip_save_failed',
      details: {
        detectedTripCreatedDayCount: fetchedTripDays.length,
        detectedTripExpectedDayCount: expectedTripDayCount,
        saveAttemptId,
      },
      originalSupabaseCode: getErrorCode(error),
      rollbackAttempted: true,
      rollbackSucceeded,
      stage: 'insert_places',
    });
  }
}

export function saveDetectedTripDraftToSupabase(
  draft: LocalDetectedTripDraft,
  options: SaveDetectedTripDraftOptions = {},
): Promise<SaveDetectedTripDraftResult> {
  const operationKey = draft.candidateFingerprint ?? draft.id;
  const activeOperation = activeDetectedTripSaveOperations.get(operationKey);

  if (activeOperation) {
    if (__DEV__) {
      console.info('[detected trip save] duplicate operation blocked', {
        draftId: draft.id,
        saveOperationDuplicateBlocked: true,
      });
    }
    return activeOperation;
  }

  if (__DEV__) {
    console.info('[detected trip save] operation started', {
      draftId: draft.id,
      saveOperationStarted: true,
    });
  }

  const operation = executeDetectedTripDraftSave(draft, options)
    .finally(() => {
      if (activeDetectedTripSaveOperations.get(operationKey) === operation) {
        activeDetectedTripSaveOperations.delete(operationKey);
      }
    });
  activeDetectedTripSaveOperations.set(operationKey, operation);

  return operation;
}
