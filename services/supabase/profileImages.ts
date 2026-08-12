import { supabase } from '@/lib/supabase';

const AVATAR_BUCKET = 'avatars';

type ProfileImageUploadInput = {
  fileName?: string | null;
  localUri: string;
  mimeType?: string | null;
};

type ProfileImageUploadResult = {
  publicUrl: string;
  storagePath: string;
};

const MIME_TYPE_EXTENSION: Record<string, string> = {
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const EXTENSION_MIME_TYPE = Object.fromEntries(
  Object.entries(MIME_TYPE_EXTENSION).map(([mimeType, extension]) => [extension, mimeType]),
) as Record<string, string>;

function getFileExtension(input: ProfileImageUploadInput) {
  const normalizedMimeType = input.mimeType?.toLowerCase();
  const extensionFromMimeType = normalizedMimeType
    ? MIME_TYPE_EXTENSION[normalizedMimeType]
    : undefined;

  if (extensionFromMimeType) {
    return extensionFromMimeType;
  }

  const extensionFromName = input.fileName?.split('.').pop()?.toLowerCase();
  return extensionFromName && EXTENSION_MIME_TYPE[extensionFromName]
    ? extensionFromName
    : 'jpg';
}

function getMimeType(input: ProfileImageUploadInput) {
  const normalizedMimeType = input.mimeType?.toLowerCase();
  if (normalizedMimeType && MIME_TYPE_EXTENSION[normalizedMimeType]) {
    return normalizedMimeType;
  }

  return EXTENSION_MIME_TYPE[getFileExtension(input)] ?? 'image/jpeg';
}

export function getOwnedAvatarStoragePath(publicUrl?: string | null) {
  if (!publicUrl) {
    return null;
  }

  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex < 0) {
    return null;
  }

  return decodeURIComponent(publicUrl.slice(markerIndex + marker.length));
}

export async function uploadMyProfileImage(
  input: ProfileImageUploadInput,
): Promise<ProfileImageUploadResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    throw new Error('An authenticated user is required.');
  }

  const response = await fetch(input.localUri);

  if (!response.ok) {
    throw new Error('The selected profile image could not be prepared.');
  }

  const fileData = await response.arrayBuffer();
  const extension = getFileExtension(input);
  const storagePath = `${authData.user.id}/profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, fileData, {
      contentType: getMimeType(input),
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath);

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
}

export async function removeMyProfileImage(storagePath: string) {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!authData.user || !storagePath.startsWith(`${authData.user.id}/`)) {
    return;
  }

  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([storagePath]);

  if (error) {
    throw error;
  }
}
