import { supabase } from '@/lib/supabase';

const PHOTO_STORAGE_BUCKET = 'photos';
const CLEANUP_BATCH_LIMIT = 1000;
const MAX_CLEANUP_BATCHES = 100;

export interface PhotoStorageCleanupResult {
  attemptedObjectCount: number;
  batchCount: number;
  deletedObjectCount: number;
  incomplete: boolean;
}

const activeCleanupOperations = new Map<string, Promise<PhotoStorageCleanupResult>>();

function createIncompleteResult(
  attemptedObjectCount: number,
  batchCount: number,
  deletedObjectCount: number,
): PhotoStorageCleanupResult {
  return {
    attemptedObjectCount,
    batchCount,
    deletedObjectCount,
    incomplete: true,
  };
}

async function executePendingPhotoStorageCleanup(
  userId: string,
): Promise<PhotoStorageCleanupResult> {
  let attemptedObjectCount = 0;
  let batchCount = 0;
  let deletedObjectCount = 0;
  let previousBatchSignature: string | null = null;

  while (batchCount < MAX_CLEANUP_BATCHES) {
    const { data, error } = await supabase.rpc('list_pending_photo_storage_cleanup', {
      p_limit: CLEANUP_BATCH_LIMIT,
    });

    if (error) {
      console.warn('[photo storage cleanup] pending lookup failed', {
        batchCount,
        stage: 'list_pending',
      });
      return createIncompleteResult(attemptedObjectCount, batchCount, deletedObjectCount);
    }

    const storagePaths = [
      ...new Set(
        (data ?? [])
          .map((row) => row.storage_path?.trim())
          .filter((path): path is string => Boolean(path)),
      ),
    ];

    if (storagePaths.length === 0) {
      return {
        attemptedObjectCount,
        batchCount,
        deletedObjectCount,
        incomplete: false,
      };
    }

    if (storagePaths.some((path) => path.split('/')[0] !== userId)) {
      console.warn('[photo storage cleanup] rejected an unexpected object path', {
        batchCount,
        stage: 'validate_paths',
      });
      return createIncompleteResult(attemptedObjectCount, batchCount, deletedObjectCount);
    }

    const batchSignature = storagePaths.slice().sort().join('\n');
    if (batchSignature === previousBatchSignature) {
      console.warn('[photo storage cleanup] repeated batch stopped', {
        batchCount,
        stage: 'repeat_guard',
      });
      return createIncompleteResult(attemptedObjectCount, batchCount, deletedObjectCount);
    }
    previousBatchSignature = batchSignature;

    batchCount += 1;
    attemptedObjectCount += storagePaths.length;

    const { data: deletedObjects, error: removeError } = await supabase.storage
      .from(PHOTO_STORAGE_BUCKET)
      .remove(storagePaths);

    if (removeError) {
      console.warn('[photo storage cleanup] object removal failed', {
        attemptedObjectCount,
        batchCount,
        stage: 'remove_objects',
      });
      return createIncompleteResult(attemptedObjectCount, batchCount, deletedObjectCount);
    }

    deletedObjectCount += deletedObjects?.length ?? 0;
  }

  const { data: remainingRows, error: finalProbeError } = await supabase.rpc(
    'list_pending_photo_storage_cleanup',
    {
      p_limit: CLEANUP_BATCH_LIMIT,
    },
  );

  if (finalProbeError) {
    console.warn('[photo storage cleanup] final pending probe failed', {
      attemptedObjectCount,
      batchCount,
      stage: 'final_probe',
    });
    return createIncompleteResult(attemptedObjectCount, batchCount, deletedObjectCount);
  }

  const incomplete = (remainingRows ?? []).length > 0;
  if (incomplete) {
    console.warn('[photo storage cleanup] batch limit reached with pending objects', {
      attemptedObjectCount,
      batchCount,
      stage: 'batch_guard',
    });
  }

  return {
    attemptedObjectCount,
    batchCount,
    deletedObjectCount,
    incomplete,
  };
}

export async function drainPendingPhotoStorageCleanup(): Promise<PhotoStorageCleanupResult> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.id) {
    return {
      attemptedObjectCount: 0,
      batchCount: 0,
      deletedObjectCount: 0,
      incomplete: true,
    };
  }

  const userId = data.user.id;
  const activeOperation = activeCleanupOperations.get(userId);
  if (activeOperation) {
    return activeOperation;
  }

  const operation = executePendingPhotoStorageCleanup(userId);
  activeCleanupOperations.set(userId, operation);

  try {
    return await operation;
  } finally {
    if (activeCleanupOperations.get(userId) === operation) {
      activeCleanupOperations.delete(userId);
    }
  }
}
