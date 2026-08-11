// @ts-ignore Deno resolves npm specifiers in the Edge Function runtime.
import { createClient } from 'npm:@supabase/supabase-js@2.110.0';
// @ts-ignore Deno resolves npm specifiers in the Edge Function runtime.
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'npm:jose@6.1.0';

declare const Deno: {
  env: { get: (name: string) => string | undefined };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const ACCOUNT_STORAGE_BUCKETS = new Set(['photos', 'avatars']);
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const MAX_STORAGE_CLEANUP_BATCHES = 100;
const STORAGE_CLEANUP_BATCH_SIZE = 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RESPONSE_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

type DeleteAccountRequest = {
  appleAuthorizationCode?: string;
};

type AccountStorageObject = {
  bucket_id: string;
  object_name: string;
};

type AppleTokenResponse = {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
};

type AppleRevocationStatus = 'manual_required' | 'not_applicable' | 'revoked';

class DeleteAccountError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: RESPONSE_HEADERS,
    status,
  });
}

function requireEnvironmentVariable(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new DeleteAccountError('SERVER_CONFIGURATION_ERROR', 500);
  }

  return value;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('Authorization')?.trim();

  if (!authorization?.startsWith('Bearer ')) {
    throw new DeleteAccountError('UNAUTHORIZED', 401);
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    throw new DeleteAccountError('UNAUTHORIZED', 401);
  }

  return token;
}

function getVerifiedJwtSubject(token: string) {
  const tokenParts = token.split('.');

  if (tokenParts.length !== 3 || tokenParts.some((part) => !part)) {
    throw new DeleteAccountError('UNAUTHORIZED', 401);
  }

  try {
    const normalizedPayload = tokenParts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - normalizedPayload.length % 4) % 4),
      '=',
    );
    const binaryPayload = atob(paddedPayload);
    const payloadBytes = Uint8Array.from(binaryPayload, (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as { sub?: unknown };

    if (typeof payload.sub !== 'string' || !UUID_PATTERN.test(payload.sub)) {
      throw new Error('Invalid JWT subject.');
    }

    return payload.sub;
  } catch {
    throw new DeleteAccountError('UNAUTHORIZED', 401);
  }
}

function isAuthUserNotFound(
  error: { code?: string; status?: number } | null,
  user: unknown,
) {
  return (
    !user &&
    error?.status === 404 &&
    error.code === 'user_not_found'
  );
}

function getAppleIdentitySubject(identity: {
  identity_data?: Record<string, unknown> | null;
  provider_id?: string | null;
}) {
  if (typeof identity.provider_id === 'string' && identity.provider_id.trim()) {
    return identity.provider_id.trim();
  }

  const subject = identity.identity_data?.sub;
  return typeof subject === 'string' && subject.trim() ? subject.trim() : null;
}

async function createAppleClientSecret() {
  const teamId = requireEnvironmentVariable('APPLE_TEAM_ID');
  const keyId = requireEnvironmentVariable('APPLE_KEY_ID');
  const clientId = requireEnvironmentVariable('APPLE_CLIENT_ID');
  const privateKey = requireEnvironmentVariable('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  const signingKey = await importPKCS8(privateKey, 'ES256');
  const now = Math.floor(Date.now() / 1000);

  return {
    clientId,
    clientSecret: await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setSubject(clientId)
      .setAudience(APPLE_ISSUER)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(signingKey),
  };
}

async function exchangeAndRevokeAppleAuthorizationCode(
  authorizationCode: string,
  expectedSubject: string,
) {
  const { clientId, clientSecret } = await createAppleClientSecret();
  const tokenResponse = await fetch(`${APPLE_ISSUER}/auth/token`, {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });

  if (!tokenResponse.ok) {
    throw new DeleteAccountError('APPLE_REAUTH_FAILED', 409);
  }

  const tokens = await tokenResponse.json() as AppleTokenResponse;

  if (!tokens.id_token) {
    throw new DeleteAccountError('APPLE_REAUTH_FAILED', 409);
  }

  let appleSubject: string | undefined;
  try {
    const verifiedToken = await jwtVerify(tokens.id_token, APPLE_JWKS, {
      audience: clientId,
      issuer: APPLE_ISSUER,
    });
    appleSubject = verifiedToken.payload.sub;
  } catch {
    throw new DeleteAccountError('APPLE_REAUTH_FAILED', 409);
  }

  if (!appleSubject || appleSubject !== expectedSubject) {
    throw new DeleteAccountError('APPLE_IDENTITY_MISMATCH', 409);
  }

  const tokenToRevoke = tokens.refresh_token ?? tokens.access_token;
  const tokenTypeHint = tokens.refresh_token ? 'refresh_token' : 'access_token';

  if (!tokenToRevoke) {
    throw new DeleteAccountError('APPLE_REAUTH_FAILED', 409);
  }

  const revokeResponse = await fetch(`${APPLE_ISSUER}/auth/revoke`, {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token: tokenToRevoke,
      token_type_hint: tokenTypeHint,
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });

  if (!revokeResponse.ok) {
    throw new DeleteAccountError('APPLE_REAUTH_FAILED', 409);
  }
}

async function attemptAppleRevocation(
  appleIdentity: {
    identity_data?: Record<string, unknown> | null;
    provider_id?: string | null;
  },
  authorizationCode: string | undefined,
): Promise<AppleRevocationStatus> {
  if (!authorizationCode) {
    return 'manual_required';
  }

  const expectedSubject = getAppleIdentitySubject(appleIdentity);

  if (!expectedSubject) {
    console.warn('[delete-account] Apple revocation requires manual cleanup', {
      code: 'APPLE_IDENTITY_MISMATCH',
    });
    return 'manual_required';
  }

  try {
    await exchangeAndRevokeAppleAuthorizationCode(authorizationCode, expectedSubject);
    return 'revoked';
  } catch (error) {
    console.warn('[delete-account] Apple revocation requires manual cleanup', {
      code: error instanceof DeleteAccountError ? error.code : 'APPLE_REAUTH_FAILED',
    });
    return 'manual_required';
  }
}

function normalizeStorageObjects(value: unknown): AccountStorageObject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AccountStorageObject => (
    typeof item === 'object' &&
    item !== null &&
    'bucket_id' in item &&
    typeof item.bucket_id === 'string' &&
    ACCOUNT_STORAGE_BUCKETS.has(item.bucket_id) &&
    'object_name' in item &&
    typeof item.object_name === 'string' &&
    item.object_name.length > 0
  ));
}

async function listAccountStorageObjects(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  limit = STORAGE_CLEANUP_BATCH_SIZE,
) {
  const { data, error } = await supabaseAdmin.rpc('list_account_storage_objects', {
    p_limit: limit,
    p_user_id: userId,
  });

  if (error) {
    throw new DeleteAccountError('STORAGE_CLEANUP_FAILED', 500);
  }

  return normalizeStorageObjects(data);
}

async function confirmPreviouslyDeletedAccount(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
) {
  const pendingStorageObjects = await listAccountStorageObjects(supabaseAdmin, userId, 1);
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new DeleteAccountError('INTERNAL_ERROR', 500);
  }

  if (pendingStorageObjects.length > 0 || profile) {
    throw new DeleteAccountError('ACCOUNT_DELETION_INCONSISTENT_STATE', 500);
  }
}

async function removeAccountStorageObjects(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
) {
  let previousBatchSignature: string | null = null;

  for (let batchIndex = 0; batchIndex < MAX_STORAGE_CLEANUP_BATCHES; batchIndex += 1) {
    const pendingObjects = await listAccountStorageObjects(supabaseAdmin, userId);

    if (pendingObjects.length === 0) {
      return;
    }

    const batchSignature = pendingObjects
      .map((item) => `${item.bucket_id}:${item.object_name}`)
      .join('|');

    if (batchSignature === previousBatchSignature) {
      throw new DeleteAccountError('STORAGE_CLEANUP_FAILED', 500);
    }
    previousBatchSignature = batchSignature;

    const objectsByBucket = new Map<string, string[]>();
    for (const item of pendingObjects) {
      const bucketObjects = objectsByBucket.get(item.bucket_id) ?? [];
      bucketObjects.push(item.object_name);
      objectsByBucket.set(item.bucket_id, bucketObjects);
    }

    for (const [bucketId, objectNames] of objectsByBucket) {
      const { error } = await supabaseAdmin.storage.from(bucketId).remove(objectNames);

      if (error) {
        throw new DeleteAccountError('STORAGE_CLEANUP_FAILED', 500);
      }
    }
  }

  const remainingObjects = await listAccountStorageObjects(supabaseAdmin, userId);
  if (remainingObjects.length > 0) {
    throw new DeleteAccountError('STORAGE_CLEANUP_FAILED', 500);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: RESPONSE_HEADERS, status: 204 });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const token = getBearerToken(request);
    // verify_jwt remains enabled at the Edge Function gateway. Decoding here only
    // reads the subject from the token that the gateway has already verified.
    const userId = getVerifiedJwtSubject(token);
    const supabaseUrl = requireEnvironmentVariable('SUPABASE_URL');
    const anonKey = requireEnvironmentVariable('SUPABASE_ANON_KEY');
    const serviceRoleKey = requireEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY');
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: adminUserData, error: adminUserError } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    const adminUser = adminUserData.user;

    if (isAuthUserNotFound(adminUserError, adminUser)) {
      await confirmPreviouslyDeletedAccount(supabaseAdmin, userId);
      return jsonResponse({ deleted: true, recovered: true }, 200);
    }

    if (adminUserError || !adminUser || adminUser.id !== userId) {
      throw new DeleteAccountError('INTERNAL_ERROR', 500);
    }

    const { data: verifiedUserData, error: verifiedUserError } =
      await userClient.auth.getUser(token);
    const verifiedUser = verifiedUserData.user;

    if (verifiedUserError || !verifiedUser || verifiedUser.id !== userId) {
      throw new DeleteAccountError('UNAUTHORIZED', 401);
    }

    let body: DeleteAccountRequest = {};
    try {
      body = await request.json() as DeleteAccountRequest;
    } catch {
      throw new DeleteAccountError('INVALID_REQUEST', 400);
    }

    const appleIdentity = adminUser.identities?.find(
      (identity: { provider?: string }) => identity.provider === 'apple',
    );
    const appleRevocation: AppleRevocationStatus = appleIdentity
      ? await attemptAppleRevocation(
        appleIdentity,
        body.appleAuthorizationCode?.trim(),
      )
      : 'not_applicable';

    await removeAccountStorageObjects(supabaseAdmin, userId);

    const { error: databaseDeleteError } = await supabaseAdmin.rpc(
      'hard_delete_account_data',
      { p_user_id: userId },
    );

    if (databaseDeleteError) {
      throw new DeleteAccountError('DATABASE_DELETE_FAILED', 500);
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userId,
      false,
    );

    if (authDeleteError) {
      throw new DeleteAccountError('AUTH_DELETE_FAILED', 500);
    }

    return jsonResponse({ appleRevocation, deleted: true }, 200);
  } catch (error) {
    if (error instanceof DeleteAccountError) {
      console.error('[delete-account] request failed', { code: error.code });
      return jsonResponse({ code: error.code }, error.status);
    }

    console.error('[delete-account] request failed', { code: 'INTERNAL_ERROR' });
    return jsonResponse({ code: 'INTERNAL_ERROR' }, 500);
  }
});
