import {
  normalizePlaceCategoryValue,
  type PlaceCategoryValue,
} from '../../constants/placeCategories';
import type { PlaceSource } from './types';

const LODGING_TYPES = new Set([
  'bed_and_breakfast',
  'campground',
  'extended_stay_hotel',
  'guest_house',
  'hostel',
  'hotel',
  'inn',
  'japanese_inn',
  'lodging',
  'motel',
  'resort_hotel',
]);

const ATTRACTION_TYPES = new Set([
  'amusement_park',
  'aquarium',
  'art_gallery',
  'art_museum',
  'botanical_garden',
  'buddhist_temple',
  'church',
  'city_park',
  'cultural_landmark',
  'historical_landmark',
  'historical_place',
  'history_museum',
  'hindu_temple',
  'monument',
  'mosque',
  'museum',
  'national_park',
  'observation_deck',
  'park',
  'place_of_worship',
  'shinto_shrine',
  'state_park',
  'synagogue',
  'tourist_attraction',
  'water_park',
  'wildlife_park',
  'zoo',
]);

const SHOPPING_ANCHOR_TYPES = new Set([
  'department_store',
  'farmers_market',
  'flea_market',
  'hypermarket',
  'market',
  'shopping_mall',
  'supermarket',
]);

const CAFE_TYPES = new Set([
  'acai_shop',
  'bagel_shop',
  'bakery',
  'cafe',
  'cake_shop',
  'cat_cafe',
  'coffee_roastery',
  'coffee_shop',
  'coffee_stand',
  'confectionery',
  'dessert_shop',
  'dog_cafe',
  'donut_shop',
  'ice_cream_shop',
  'juice_shop',
  'pastry_shop',
  'tea_house',
]);

const RESTAURANT_TYPES = new Set([
  'bar',
  'bar_and_grill',
  'bistro',
  'diner',
  'food_court',
  'meal_delivery',
  'meal_takeaway',
  'pub',
  'restaurant',
]);

const GENERAL_SHOPPING_TYPES = new Set([
  'florist',
  'store',
  'wholesaler',
]);

function normalizeTypes(types: readonly string[]) {
  return new Set(types.map((type) => type.trim().toLowerCase()).filter(Boolean));
}

function hasAnyType(types: Set<string>, candidates: Set<string>) {
  return [...types].some((type) => candidates.has(type));
}

export function mapGooglePlaceTypesToCategory(
  googleTypes: readonly string[],
): PlaceCategoryValue {
  const types = normalizeTypes(googleTypes);

  if (hasAnyType(types, LODGING_TYPES)) return 'lodging';
  if (hasAnyType(types, ATTRACTION_TYPES)) return 'attraction';
  if (hasAnyType(types, SHOPPING_ANCHOR_TYPES)) return 'shopping';
  if (hasAnyType(types, CAFE_TYPES)) return 'cafe';
  if ([...types].some((type) => RESTAURANT_TYPES.has(type) || type.endsWith('_restaurant'))) {
    return 'restaurant';
  }
  if ([...types].some((type) => GENERAL_SHOPPING_TYPES.has(type) || type.endsWith('_store'))) {
    return 'shopping';
  }

  return 'other';
}

export function resolvePlaceCategoryAfterSelection(
  currentCategory: string | null | undefined,
  selection: { source: PlaceSource; googleTypes?: readonly string[] },
): PlaceCategoryValue | undefined {
  if (selection.source === 'google') {
    return mapGooglePlaceTypesToCategory(selection.googleTypes ?? []);
  }

  return normalizePlaceCategoryValue(currentCategory);
}
