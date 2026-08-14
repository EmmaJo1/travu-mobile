import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import AppTextInput from '@/components/common/AppTextInput';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  autocompleteGooglePlaces,
  geocodeGooglePlace,
  MIN_PLACE_QUERY_LENGTH,
  PLACE_SEARCH_DEBOUNCE_MS,
} from '@/services/placeSearch/googlePlaces';
import type { PlaceSearchResult } from '@/services/placeSearch/types';
import {
  PlaceRequestSequence,
  shouldShowGoogleMapsAttribution,
} from '@/services/placeSearch/mappers';

export type PlaceOption = {
  id: string;
  name: string;
  googleDisplayName?: string;
  address?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  source: 'google' | 'manual';
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

export function createManualPlaceFromSearchText(
  searchText: string,
  context: PlaceSearchContext,
): PlaceOption {
  const name = searchText.trim();
  return {
    id: `manual-${Date.now()}`,
    name,
    city: context.tripDestinationName,
    country: context.tripDestinationCountry,
    source: 'manual',
  };
}

function PlaceResultRow({
  place,
  disabled,
  onPress,
}: {
  place: PlaceSearchResult;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.placeRow, pressed && styles.pressedRow]}
    >
      <View style={styles.pinWrap}>
        <Feather name="map-pin" size={18} color={Colors.foundation.grey700} />
      </View>
      <View style={styles.placeTextBlock}>
        <Text numberOfLines={1} style={styles.placeName}>{place.displayName}</Text>
        {place.secondaryText ? (
          <Text numberOfLines={2} style={styles.placeAddress}>{place.secondaryText}</Text>
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
  onSelectPlace,
  autoFocus = false,
}: PlaceSearchContentProps) {
  const [searchText, setSearchText] = React.useState('');
  const [results, setResults] = React.useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectingPlaceId, setSelectingPlaceId] = React.useState<string>();
  const [errorMessage, setErrorMessage] = React.useState<string>();
  const requestSequence = React.useRef(new PlaceRequestSequence());
  const selectionSequence = React.useRef(new PlaceRequestSequence());
  const trimmedSearchText = searchText.trim();
  const canSearch = trimmedSearchText.length >= MIN_PLACE_QUERY_LENGTH;

  const context = React.useMemo(() => ({
    tripId,
    dayId,
    tripDestinationName,
    tripDestinationCountry,
    tripLatitude,
    tripLongitude,
  }), [dayId, tripDestinationCountry, tripDestinationName, tripId, tripLatitude, tripLongitude]);

  React.useEffect(() => {
    const sequence = requestSequence.current.begin();
    selectionSequence.current.begin();
    setSelectingPlaceId(undefined);
    setErrorMessage(undefined);

    if (!canSearch) {
      setResults([]);
      setLoading(false);
      return;
    }

    setResults([]);
    setLoading(true);
    const timeout = setTimeout(() => {
      void autocompleteGooglePlaces(
        trimmedSearchText,
        typeof tripLatitude === 'number' && typeof tripLongitude === 'number'
          ? { latitude: tripLatitude, longitude: tripLongitude }
          : undefined,
      ).then((nextResults) => {
        if (!requestSequence.current.isLatest(sequence)) return;
        setResults(nextResults);
      }).catch((error: unknown) => {
        if (!requestSequence.current.isLatest(sequence)) return;
        setResults([]);
        setErrorMessage(error instanceof Error ? error.message : '장소 검색을 사용할 수 없어요.');
      }).finally(() => {
        if (requestSequence.current.isLatest(sequence)) setLoading(false);
      });
    }, PLACE_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [canSearch, trimmedSearchText, tripLatitude, tripLongitude]);

  const handleGoogleSelect = async (result: PlaceSearchResult) => {
    const sequence = selectionSequence.current.begin();
    setSelectingPlaceId(result.placeId);
    setErrorMessage(undefined);

    try {
      const selected = await geocodeGooglePlace(result.placeId);
      if (!selectionSequence.current.isLatest(sequence)) return;
      onSelectPlace({
        id: selected.googlePlaceId,
        name: trimmedSearchText,
        googleDisplayName: result.displayName,
        address: selected.formattedAddress,
        city: selected.cityName,
        country: selected.countryName,
        countryCode: selected.countryCode,
        placeId: selected.googlePlaceId,
        latitude: selected.latitude,
        longitude: selected.longitude,
        source: 'google',
      });
    } catch (error) {
      if (!selectionSequence.current.isLatest(sequence)) return;
      setErrorMessage(error instanceof Error ? error.message : '장소 정보를 불러오지 못했어요.');
    } finally {
      if (selectionSequence.current.isLatest(sequence)) setSelectingPlaceId(undefined);
    }
  };

  const handleManualSelect = () => {
    if (trimmedSearchText) onSelectPlace(createManualPlaceFromSearchText(trimmedSearchText, context));
  };

  return (
    <View style={styles.contentWrap}>
      <View style={styles.searchBox}>
        <Feather name="search" size={22} color={Colors.foundation.black} />
        <AppTextInput
          autoFocus={autoFocus}
          onChangeText={setSearchText}
          placeholder="장소명이나 주소를 검색하세요"
          placeholderTextColor={Colors.foundation.grey500}
          returnKeyType="search"
          style={styles.searchInput}
          value={searchText}
        />
        {loading ? <ActivityIndicator color={Colors.foundation.grey700} size="small" /> : null}
        {searchText ? (
          <Pressable accessibilityLabel="검색어 지우기" hitSlop={8} onPress={() => setSearchText('')}>
            <Feather name="x-circle" size={18} color={Colors.foundation.grey500} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.resultsScroll}
      >
        {!canSearch ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>두 글자 이상 입력해주세요</Text>
            <Text style={styles.emptyDescription}>검색이 어려우면 장소를 직접 추가할 수 있어요.</Text>
          </View>
        ) : results.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>검색 결과</Text>
            <View style={styles.resultList}>
              {results.map((place, index) => (
                <React.Fragment key={place.placeId}>
                  <PlaceResultRow
                    disabled={Boolean(selectingPlaceId)}
                    onPress={() => void handleGoogleSelect(place)}
                    place={place}
                  />
                  {index < results.length - 1 ? <View style={styles.divider} /> : null}
                </React.Fragment>
              ))}
              {shouldShowGoogleMapsAttribution(results) ? (
                <View style={styles.attributionRow}>
                  <Text numberOfLines={1} style={styles.attributionText}>Google Maps</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : !loading ? (
          <View style={styles.emptyState}>
            <Feather name="search" size={24} color={Colors.foundation.grey300} />
            <Text style={styles.emptyTitle}>{errorMessage ?? '검색 결과가 없어요'}</Text>
            <Text style={styles.emptyDescription}>입력한 이름으로 직접 추가할 수 있어요.</Text>
          </View>
        ) : null}

        {trimmedSearchText ? (
          <Pressable accessibilityRole="button" onPress={handleManualSelect} style={styles.manualButton}>
            <Text style={styles.manualButtonText}>‘{trimmedSearchText}’ 직접 추가하기</Text>
          </Pressable>
        ) : null}
        {selectingPlaceId ? (
          <View style={styles.selectionLoading}>
            <ActivityIndicator color={Colors.foundation.black} />
            <Text style={styles.emptyDescription}>주소를 확인하고 있어요</Text>
          </View>
        ) : null}
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
  const handleSelect = (place: PlaceOption) => {
    onSelectPlace(place);
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
          <View style={styles.header}>
            <Pressable accessibilityLabel={onBack ? '이전 화면' : '닫기'} hitSlop={8} onPress={onBack ?? onClose} style={styles.headerButton}>
              <Feather name={onBack ? 'chevron-left' : 'x'} size={28} color={Colors.foundation.black} />
            </Pressable>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.headerButton} />
          </View>
          <PlaceSearchContent {...context} autoFocus onSelectPlace={handleSelect} selectedPlace={selectedPlace} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.bgScreen },
  keyboardView: { flex: 1 },
  header: { height: 56, paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.body1Emphasized, color: Colors.foundation.black },
  contentWrap: { flex: 1, paddingHorizontal: Spacing.xl, overflow: 'hidden' },
  searchBox: { height: 48, borderRadius: Radius.sm, paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.foundation.white },
  searchInput: { ...Typography.body1Regular, flex: 1, minWidth: 0, paddingVertical: 0, color: Colors.foundation.black },
  resultsScroll: { flex: 1 },
  scrollContent: { paddingTop: Spacing['2xl'], paddingBottom: Spacing['3xl'] },
  sectionTitle: { ...Typography.body1Emphasized, marginBottom: Spacing.md, color: Colors.foundation.black },
  resultList: { overflow: 'hidden', borderRadius: Radius.sm, backgroundColor: Colors.foundation.white, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.light.borderDefault },
  placeRow: { minHeight: 72, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.foundation.white },
  pressedRow: { backgroundColor: Colors.light.bgScreen },
  pinWrap: { width: 32, height: 32, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.bgScreen },
  placeTextBlock: { flex: 1, gap: Spacing.xs },
  placeName: { ...Typography.body2Emphasized, color: Colors.foundation.black },
  placeAddress: { ...Typography.captionRegular, color: Colors.foundation.grey600 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56, backgroundColor: Colors.light.borderDefault },
  attributionRow: { alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.light.borderDefault },
  attributionText: {
    ...Typography.captionRegular,
    // Google Maps text attribution permits this exact gray on a light background.
    color: '#5E5E5E',
  },
  emptyState: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing['3xl'] },
  emptyTitle: { ...Typography.body2Emphasized, color: Colors.foundation.grey700, textAlign: 'center' },
  emptyDescription: { ...Typography.captionRegular, color: Colors.foundation.grey500, textAlign: 'center' },
  manualButton: { minHeight: 44, marginTop: Spacing.lg, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.light.borderDefault, backgroundColor: Colors.foundation.white },
  manualButtonText: { ...Typography.body2Emphasized, color: Colors.foundation.grey700 },
  selectionLoading: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xl },
});
