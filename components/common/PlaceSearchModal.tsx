import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import AppTextInput from '@/components/common/AppTextInput';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export type PlaceOption = {
  id: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  country?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  source: 'mock' | 'google' | 'manual';
};

export type PlaceSearchContext = {
  tripId: string;
  dayId: string;
  tripDestinationName?: string;
  tripDestinationCountry?: string;
  tripLatitude?: number;
  tripLongitude?: number;
};

export type PlaceSearchModalProps = PlaceSearchContext & {
  visible: boolean;
  selectedPlace?: PlaceOption | null;
  onSelectPlace: (place: PlaceOption) => void;
  onClose: () => void;
  onBack?: () => void;
  title?: string;
};

export type PlaceSearchContentProps = PlaceSearchContext & {
  selectedPlace?: PlaceOption | null;
  onSelectPlace: (place: PlaceOption) => void;
  autoFocus?: boolean;
};

export type PlaceSearchResult = PlaceOption & {
  thumbnail?: ImageSourcePropType;
  searchKeywords?: string[];
};

const PLACE_IMAGES = {
  osakaCastle: require('@/assets/images/mypage-trips/mypage-trip-osaka.png'),
  osakaPark: require('@/assets/images/record-trip-kyoto-day-3.png'),
  dotonbori: require('@/assets/images/record-trip-kyoto-day-1.png'),
  umeda: require('@/assets/images/record-trip-kyoto-day-5.png'),
  louvre: require('@/assets/images/home-photo-candidate-3.png'),
  notreDame: require('@/assets/images/home-photo-candidate-1.png'),
  eiffel: require('@/assets/images/archive-frame-paris.jpg'),
  sydneyOpera: require('@/assets/images/record-trip-sydney-cover.png'),
  bondi: require('@/assets/images/record-trip-sydney-day-3.png'),
} as const;

const PLACE_DATA: Record<string, PlaceSearchResult[]> = {
  osaka: [
    {
      id: 'osaka-castle',
      name: '오사카성',
      category: '관광명소',
      address: '1-1 Osakajo, Chuo Ward, Osaka 540-0002 Japan',
      city: '오사카',
      country: '일본',
      placeId: 'mock-osaka-castle',
      latitude: 34.6873,
      longitude: 135.5262,
      source: 'mock',
      thumbnail: PLACE_IMAGES.osakaCastle,
      searchKeywords: ['osaka castle', 'castle', '오사카성'],
    },
    {
      id: 'osaka-castle-park',
      name: '오사카성 공원',
      category: '공원',
      address: 'Osakajo, Chuo Ward, Osaka, Japan',
      city: '오사카',
      country: '일본',
      placeId: 'mock-osaka-castle-park',
      latitude: 34.687,
      longitude: 135.527,
      source: 'mock',
      thumbnail: PLACE_IMAGES.osakaPark,
      searchKeywords: ['park', '공원'],
    },
    {
      id: 'dotonbori',
      name: '도톤보리',
      category: '관광명소',
      address: 'Dotonbori, Chuo Ward, Osaka, Japan',
      city: '오사카',
      country: '일본',
      placeId: 'mock-dotonbori',
      latitude: 34.6687,
      longitude: 135.5013,
      source: 'mock',
      thumbnail: PLACE_IMAGES.dotonbori,
      searchKeywords: ['dotonbori', '도톤보리'],
    },
    {
      id: 'umeda-sky-building',
      name: '우메다 스카이 빌딩',
      category: '전망대',
      address: '1 Chome-1-88 Oyodonaka, Kita Ward, Osaka, Japan',
      city: '오사카',
      country: '일본',
      placeId: 'mock-umeda-sky-building',
      latitude: 34.7053,
      longitude: 135.49,
      source: 'mock',
      thumbnail: PLACE_IMAGES.umeda,
      searchKeywords: ['umeda', 'sky building', '우메다'],
    },
  ],
  paris: [
    {
      id: 'notre-dame',
      name: '노트르담 대성당',
      category: '관광명소',
      address: '6 Parvis Notre-Dame, 75004 Paris, France',
      city: '파리',
      country: '프랑스',
      placeId: 'mock-notre-dame',
      latitude: 48.853,
      longitude: 2.3499,
      source: 'mock',
      thumbnail: PLACE_IMAGES.notreDame,
      searchKeywords: ['notre dame', 'cathedral', '노트르담'],
    },
    {
      id: 'louvre',
      name: '루브르 박물관',
      category: '박물관',
      address: 'Rue de Rivoli, 75001 Paris, France',
      city: '파리',
      country: '프랑스',
      placeId: 'mock-louvre',
      latitude: 48.8606,
      longitude: 2.3376,
      source: 'mock',
      thumbnail: PLACE_IMAGES.louvre,
      searchKeywords: ['louvre', 'museum', '루브르'],
    },
    {
      id: 'eiffel-tower',
      name: '에펠탑',
      category: '관광명소',
      address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris',
      city: '파리',
      country: '프랑스',
      placeId: 'mock-eiffel-tower',
      latitude: 48.8584,
      longitude: 2.2945,
      source: 'mock',
      thumbnail: PLACE_IMAGES.eiffel,
      searchKeywords: ['eiffel tower', 'tour eiffel', '에펠탑'],
    },
  ],
  sydney: [
    {
      id: 'sydney-opera-house',
      name: '오페라 하우스',
      category: '관광명소',
      address: 'Bennelong Point, Sydney NSW 2000 Australia',
      city: '시드니',
      country: '오스트레일리아',
      placeId: 'mock-sydney-opera-house',
      latitude: -33.8568,
      longitude: 151.2153,
      source: 'mock',
      thumbnail: PLACE_IMAGES.sydneyOpera,
      searchKeywords: ['opera house', 'sydney opera', '오페라'],
    },
    {
      id: 'bondi-beach',
      name: '본다이 비치',
      category: '해변',
      address: 'Bondi Beach NSW 2026 Australia',
      city: '시드니',
      country: '오스트레일리아',
      placeId: 'mock-bondi-beach',
      latitude: -33.8915,
      longitude: 151.2767,
      source: 'mock',
      thumbnail: PLACE_IMAGES.bondi,
      searchKeywords: ['bondi', 'beach', '본다이'],
    },
  ],
};

function normalize(value?: string) {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function getDestinationKey(context: PlaceSearchContext): keyof typeof PLACE_DATA {
  const target = normalize(
    [context.tripDestinationName, context.tripDestinationCountry].filter(Boolean).join(' '),
  );

  if (target.includes('paris') || target.includes('파리') || target.includes('france') || target.includes('프랑스')) {
    return 'paris';
  }

  if (
    target.includes('sydney') ||
    target.includes('시드니') ||
    target.includes('australia') ||
    target.includes('오스트레일리아') ||
    target.includes('호주')
  ) {
    return 'sydney';
  }

  return 'osaka';
}

function getAllPlaces() {
  return Object.values(PLACE_DATA).flat();
}

export function getRecommendedPlacesByTripContext(context: PlaceSearchContext): PlaceSearchResult[] {
  return PLACE_DATA[getDestinationKey(context)];
}

export function searchPlacesByTripContext(
  query: string,
  context: PlaceSearchContext,
): PlaceSearchResult[] {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return [];
  }

  const destinationPlaces = getRecommendedPlacesByTripContext(context);
  const fallbackPlaces = getAllPlaces().filter((place) => !destinationPlaces.includes(place));
  const results = [...destinationPlaces, ...fallbackPlaces];

  return results.filter((place) => {
    const fields = [
      place.name,
      place.category,
      place.address,
      place.city,
      place.country,
      ...(place.searchKeywords ?? []),
    ].map(normalize);

    return fields.some((field) => field.includes(normalizedQuery));
  });
}

function toPlaceOption(place: PlaceSearchResult): PlaceOption {
  return {
    id: place.id,
    name: place.name,
    category: place.category,
    address: place.address,
    city: place.city,
    country: place.country,
    placeId: place.placeId,
    latitude: place.latitude,
    longitude: place.longitude,
    source: place.source,
  };
}

export function createManualPlaceFromSearchText(
  searchText: string,
  context: PlaceSearchContext,
): PlaceOption {
  const trimmedName = searchText.trim();

  return {
    id: `manual-${Date.now()}`,
    name: trimmedName,
    city: context.tripDestinationName,
    country: context.tripDestinationCountry,
    source: 'manual',
  };
}

function formatPlaceLocation(place: PlaceOption) {
  return [place.category, [place.city, place.country].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ');
}

function PlaceResultRow({
  place,
  selected,
  onPress,
}: {
  place: PlaceSearchResult;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={styles.placeRow}
      onPress={onPress}
    >
      {place.thumbnail ? (
        <Image source={place.thumbnail} resizeMode="cover" style={styles.placeImage} />
      ) : (
        <View style={[styles.placeImage, styles.imagePlaceholder]} />
      )}

      <View style={styles.placeTextBlock}>
        <Text style={styles.placeName} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.placeLocation} numberOfLines={1}>
          {formatPlaceLocation(place)}
        </Text>
        {place.address ? (
          <Text style={styles.placeAddress} numberOfLines={1}>
            {place.address}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function PlaceSearchContent({
  tripId,
  dayId,
  tripDestinationName,
  tripDestinationCountry,
  tripLatitude,
  tripLongitude,
  selectedPlace,
  onSelectPlace,
  autoFocus = false,
}: PlaceSearchContentProps) {
  const [searchText, setSearchText] = React.useState('');

  const context = React.useMemo(
    () => ({
      tripId,
      dayId,
      tripDestinationName,
      tripDestinationCountry,
      tripLatitude,
      tripLongitude,
    }),
    [dayId, tripDestinationCountry, tripDestinationName, tripId, tripLatitude, tripLongitude],
  );

  const trimmedSearchText = searchText.trim();
  const recommendedPlaces = React.useMemo(
    () => getRecommendedPlacesByTripContext(context),
    [context],
  );
  const searchResults = React.useMemo(
    () => searchPlacesByTripContext(trimmedSearchText, context),
    [context, trimmedSearchText],
  );
  const selectedPlaceId = selectedPlace?.id ?? selectedPlace?.placeId;
  const hasSearchText = trimmedSearchText.length > 0;
  const visiblePlaces = hasSearchText ? searchResults : recommendedPlaces;

  const handleManualSelect = () => {
    if (!trimmedSearchText) {
      return;
    }

    onSelectPlace(createManualPlaceFromSearchText(trimmedSearchText, context));
  };

  return (
    <View style={styles.contentWrap}>
      <View style={styles.searchBox}>
        <Feather name="search" size={24} color={Colors.foundation.black} />
        <AppTextInput
          value={searchText}
          onChangeText={setSearchText}
          autoFocus={autoFocus}
          returnKeyType="search"
          placeholder="장소명이나 주소를 검색하세요"
          placeholderTextColor={Colors.foundation.grey500}
          style={styles.searchInput}
        />
        {searchText.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="검색어 지우기"
            hitSlop={8}
            onPress={() => setSearchText('')}
          >
            <Feather name="x-circle" size={18} color={Colors.foundation.grey500} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.resultsScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>
          {hasSearchText ? '검색 결과' : '추천 장소'}
        </Text>

        {visiblePlaces.length > 0 ? (
          <View style={styles.resultList}>
            {visiblePlaces.map((place, index) => (
              <React.Fragment key={place.id}>
                <PlaceResultRow
                  place={place}
                  selected={selectedPlaceId === place.id || selectedPlaceId === place.placeId}
                  onPress={() => onSelectPlace(toPlaceOption(place))}
                />
                {index < visiblePlaces.length - 1 ? <View style={styles.divider} /> : null}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="search" size={24} color={Colors.foundation.grey300} />
            <Text style={styles.emptyTitle}>검색 결과가 없어요</Text>
            <Text style={styles.emptyDescription}>
              입력한 이름으로 장소를 직접 추가할 수 있어요
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.manualButton}
              onPress={handleManualSelect}
            >
              <Text style={styles.manualButtonText}>
                “{trimmedSearchText}” 직접 추가하기
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function PlaceSearchModal({
  visible,
  selectedPlace,
  onSelectPlace,
  onClose,
  onBack,
  title = '장소 검색',
  ...context
}: PlaceSearchModalProps) {
  const handleSelectPlace = (place: PlaceOption) => {
    onSelectPlace(place);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={onBack ? '이전 화면' : '닫기'}
              hitSlop={8}
              style={styles.headerButton}
              onPress={onBack ?? onClose}
            >
              <Feather name={onBack ? 'chevron-left' : 'x'} size={28} color={Colors.foundation.black} />
            </Pressable>

            <Text style={styles.headerTitle}>{title}</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              hitSlop={8}
              style={styles.headerButton}
              onPress={onClose}
            >
              {onBack ? <Feather name="x" size={28} color={Colors.foundation.black} /> : null}
            </Pressable>
          </View>

          <PlaceSearchContent
            {...context}
            selectedPlace={selectedPlace}
            onSelectPlace={handleSelectPlace}
            autoFocus
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 0,
    overflow: 'hidden',
  },
  searchBox: {
    height: 48,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#F2F2F2',
  },
  searchInput: {
    ...Typography.body1Regular,
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: Colors.foundation.black,
  },
  resultsScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
  },
  sectionTitle: {
    ...Typography.body1Emphasized,
    marginBottom: Spacing.md,
    color: Colors.foundation.black,
  },
  resultList: {
    overflow: 'hidden',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.borderDefault,
  },
  placeRow: {
    minHeight: 96,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.foundation.white,
  },
  placeImage: {
    width: 76,
    height: 76,
    borderRadius: Radius.xs,
  },
  imagePlaceholder: {
    backgroundColor: Colors.foundation.grey100,
  },
  placeTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  placeName: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  placeLocation: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  placeAddress: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 100,
    backgroundColor: Colors.foundation.grey100,
  },
  emptyState: {
    minHeight: 180,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
    backgroundColor: Colors.foundation.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.light.borderDefault,
  },
  emptyTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  emptyDescription: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  manualButton: {
    marginTop: Spacing.md,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.black,
  },
  manualButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
});
