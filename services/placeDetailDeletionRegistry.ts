const deletedPlaceDetailIds = new Set<string>();

export function getPlaceDetailKey(placeId?: string | null) {
  return typeof placeId === 'string' ? placeId.trim() : '';
}

export function markPlaceDetailDeleted(placeId?: string | null) {
  const key = getPlaceDetailKey(placeId);

  if (key) {
    deletedPlaceDetailIds.add(key);
  }
}

export function isPlaceDetailDeleted(placeId?: string | null) {
  const key = getPlaceDetailKey(placeId);
  return key ? deletedPlaceDetailIds.has(key) : false;
}
