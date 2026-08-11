import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearLocalDetectedTripDataForUser } from '@/services/photoImport/localDetectedTripDraftStore';

const LOCAL_USER_DATA_CLEANUP_MAX_ATTEMPTS = 2;
const PENDING_LOCAL_USER_CLEANUPS_KEY = 'travu:pending-local-user-cleanups:v1';

interface PendingLocalUserCleanup {
  requestedAt: string;
  userId: string;
}

export class LocalUserDataCleanupError extends Error {
  readonly code = 'LOCAL_USER_CLEANUP_RECOVERY_PREPARE_FAILED';

  constructor() {
    super('LOCAL_USER_CLEANUP_RECOVERY_PREPARE_FAILED');
  }
}

let pendingCleanupQueueOperation: Promise<void> = Promise.resolve();

function normalizeUserId(userId: string) {
  return userId.trim();
}

function parsePendingLocalUserCleanups(value: string | null): PendingLocalUserCleanup[] {
  if (!value) {
    return [];
  }

  const parsed = JSON.parse(value) as unknown;

  if (!Array.isArray(parsed)) {
    return [];
  }

  const entriesByUserId = new Map<string, PendingLocalUserCleanup>();

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const candidate = entry as Partial<PendingLocalUserCleanup>;
    const userId = typeof candidate.userId === 'string'
      ? normalizeUserId(candidate.userId)
      : '';

    if (!userId || typeof candidate.requestedAt !== 'string') {
      continue;
    }

    entriesByUserId.set(userId, {
      requestedAt: candidate.requestedAt,
      userId,
    });
  }

  return [...entriesByUserId.values()];
}

function runPendingCleanupQueueOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = pendingCleanupQueueOperation.then(operation, operation);
  pendingCleanupQueueOperation = result.then(() => undefined, () => undefined);
  return result;
}

async function readPendingLocalUserCleanups() {
  return parsePendingLocalUserCleanups(
    await AsyncStorage.getItem(PENDING_LOCAL_USER_CLEANUPS_KEY),
  );
}

async function writePendingLocalUserCleanups(entries: PendingLocalUserCleanup[]) {
  if (entries.length === 0) {
    await AsyncStorage.removeItem(PENDING_LOCAL_USER_CLEANUPS_KEY);
    return;
  }

  await AsyncStorage.setItem(PENDING_LOCAL_USER_CLEANUPS_KEY, JSON.stringify(entries));
}

async function retryQueueMutation(operation: () => Promise<void>) {
  for (let attempt = 0; attempt < LOCAL_USER_DATA_CLEANUP_MAX_ATTEMPTS; attempt += 1) {
    try {
      await operation();
      return true;
    } catch {
      // A later attempt or the next app start can retry the same idempotent operation.
    }
  }

  return false;
}

async function removePendingLocalUserCleanup(userId: string) {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return false;
  }

  return runPendingCleanupQueueOperation(() => retryQueueMutation(async () => {
    const entries = await readPendingLocalUserCleanups();
    await writePendingLocalUserCleanups(
      entries.filter((entry) => entry.userId !== normalizedUserId),
    );
  }));
}

export async function prepareLocalUserDataCleanup(userId: string) {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    throw new LocalUserDataCleanupError();
  }

  const didPrepare = await runPendingCleanupQueueOperation(() => retryQueueMutation(async () => {
    const entries = await readPendingLocalUserCleanups();

    if (entries.some((entry) => entry.userId === normalizedUserId)) {
      return;
    }

    await writePendingLocalUserCleanups([
      ...entries,
      {
        requestedAt: new Date().toISOString(),
        userId: normalizedUserId,
      },
    ]);
  }));

  if (!didPrepare) {
    throw new LocalUserDataCleanupError();
  }
}

export function cancelPendingLocalUserDataCleanup(userId: string) {
  return removePendingLocalUserCleanup(userId);
}

export async function clearLocalUserData(userId: string): Promise<boolean> {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return false;
  }

  for (let attempt = 0; attempt < LOCAL_USER_DATA_CLEANUP_MAX_ATTEMPTS; attempt += 1) {
    try {
      await clearLocalDetectedTripDataForUser(normalizedUserId);
      await removePendingLocalUserCleanup(normalizedUserId);
      return true;
    } catch {
      // Account deletion must continue while the durable marker remains for startup recovery.
    }
  }

  return false;
}

export async function recoverPendingLocalUserDataCleanups() {
  let entries: PendingLocalUserCleanup[];

  try {
    entries = await runPendingCleanupQueueOperation(readPendingLocalUserCleanups);
  } catch {
    return;
  }

  for (const entry of entries) {
    await clearLocalUserData(entry.userId);
  }
}
