export const PLACE_CATEGORY_OPTIONS = [
  { label: '관광명소', value: 'attraction' },
  { label: '음식점', value: 'restaurant' },
  { label: '카페', value: 'cafe' },
  { label: '숙소', value: 'lodging' },
  { label: '쇼핑', value: 'shopping' },
  { label: '기타', value: 'other' },
] as const;

export type PlaceCategoryValue = (typeof PLACE_CATEGORY_OPTIONS)[number]['value'];

export function normalizePlaceCategoryValue(value?: string | null): PlaceCategoryValue | undefined {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  return PLACE_CATEGORY_OPTIONS.find(
    (option) => option.value === normalized || option.label === value?.trim(),
  )?.value;
}

export function getPlaceCategoryLabel(value?: string | null) {
  const normalized = normalizePlaceCategoryValue(value);
  return PLACE_CATEGORY_OPTIONS.find((option) => option.value === normalized)?.label ?? '';
}

export function getPlaceCategoryDisplayLabel(value?: string | null) {
  return getPlaceCategoryLabel(value) || getPlaceCategoryLabel('other');
}
