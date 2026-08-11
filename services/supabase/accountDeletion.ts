import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type AccountDeletionErrorCode =
  | 'ACCOUNT_DELETION_INCONSISTENT_STATE'
  | 'APPLE_IDENTITY_MISMATCH'
  | 'APPLE_REAUTH_FAILED'
  | 'APPLE_REAUTH_REQUIRED'
  | 'AUTH_DELETE_FAILED'
  | 'DATABASE_DELETE_FAILED'
  | 'INTERNAL_ERROR'
  | 'INVALID_REQUEST'
  | 'METHOD_NOT_ALLOWED'
  | 'SERVER_CONFIGURATION_ERROR'
  | 'STORAGE_CLEANUP_FAILED'
  | 'UNAUTHORIZED'
  | 'UNKNOWN';

export type AppleRevocationStatus = 'manual_required' | 'not_applicable' | 'revoked';

type AccountDeletionResponse = {
  appleRevocation?: unknown;
  deleted: boolean;
  recovered?: unknown;
};

export type AccountDeletionResponseResult = {
  appleRevocation: AppleRevocationStatus | null;
  recovered: boolean;
};

type AccountDeletionErrorResponse = {
  code?: unknown;
};

export class AccountDeletionError extends Error {
  constructor(
    readonly code: AccountDeletionErrorCode,
    readonly status: number | null,
  ) {
    super(code);
  }
}

const ACCOUNT_DELETION_ERRORS_SAFE_TO_CANCEL_LOCAL_CLEANUP = new Set<AccountDeletionErrorCode>([
  'APPLE_IDENTITY_MISMATCH',
  'APPLE_REAUTH_FAILED',
  'APPLE_REAUTH_REQUIRED',
  'AUTH_DELETE_FAILED',
  'DATABASE_DELETE_FAILED',
  'INVALID_REQUEST',
  'METHOD_NOT_ALLOWED',
  'SERVER_CONFIGURATION_ERROR',
  'STORAGE_CLEANUP_FAILED',
  'UNAUTHORIZED',
]);

export function shouldCancelPendingLocalCleanupAfterDeletionError(error: unknown) {
  return (
    error instanceof AccountDeletionError &&
    ACCOUNT_DELETION_ERRORS_SAFE_TO_CANCEL_LOCAL_CLEANUP.has(error.code)
  );
}

function normalizeErrorCode(value: unknown): AccountDeletionErrorCode {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim() as AccountDeletionErrorCode
    : 'UNKNOWN';
}

function normalizeAppleRevocation(value: unknown): AppleRevocationStatus | null {
  return value === 'manual_required' || value === 'not_applicable' || value === 'revoked'
    ? value
    : null;
}

async function createAccountDeletionError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    let body: AccountDeletionErrorResponse = {};

    try {
      body = await response.clone().json() as AccountDeletionErrorResponse;
    } catch {
      // The status still distinguishes an HTTP failure if the body is unavailable.
    }

    return new AccountDeletionError(normalizeErrorCode(body.code), response.status ?? null);
  }

  return new AccountDeletionError('UNKNOWN', null);
}

export async function requestAccountDeletion(input: {
  appleAuthorizationCode?: string;
}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await supabase.functions.invoke<AccountDeletionResponse>(
      'delete-account',
      { body: input },
    );

    if (error instanceof FunctionsHttpError) {
      throw await createAccountDeletionError(error);
    }

    if (error) {
      // supabase-js represents explicit non-2xx responses as FunctionsHttpError.
      // Any remaining invoke error is transport, relay, or response parsing failure.
      if (attempt === 0) {
        continue;
      }

      throw await createAccountDeletionError(error);
    }

    if (data?.deleted) {
      return {
        appleRevocation: normalizeAppleRevocation(data.appleRevocation),
        recovered: data.recovered === true,
      } satisfies AccountDeletionResponseResult;
    }

    if (attempt === 1) {
      throw new AccountDeletionError('UNKNOWN', null);
    }
  }
}
