import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import AppText from '@/components/common/AppText';
import AppTextInput from '@/components/common/AppTextInput';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import type { PlaceSearchSuggestion } from '@/services/placeSearch/types';

interface PlaceSearchViewProps {
  query: string;
  results: PlaceSearchSuggestion[];
  onQueryChange: (query: string) => void;
  onSelect: (place: PlaceSearchSuggestion) => void;
  onManualPress: () => void;
}

export default function PlaceSearchView({
  query,
  results,
  onQueryChange,
  onSelect,
  onManualPress,
}: PlaceSearchViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchField}>
        <Ionicons color={Colors.foundation.grey500} name="search" size={18} />
        <AppTextInput
          autoFocus
          onChangeText={onQueryChange}
          placeholder="장소명을 검색하세요"
          placeholderTextColor={Colors.foundation.grey500}
          style={styles.searchInput}
          value={query}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.results}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {results.length > 0 ? (
          results.map((place) => (
            <TouchableOpacity
              key={place.googlePlaceId ?? `${place.placeName}-${place.formattedAddress}`}
              activeOpacity={0.7}
              onPress={() => onSelect(place)}
              style={styles.resultRow}
            >
              <AppText style={styles.placeName}>{place.placeName}</AppText>
              <AppText style={styles.address}>
                {place.formattedAddress ?? [place.cityName, place.countryName].filter(Boolean).join(', ')}
              </AppText>
            </TouchableOpacity>
          ))
        ) : (
          <AppText style={styles.emptyText}>검색 결과가 없습니다.</AppText>
        )}
      </ScrollView>

      <View style={styles.manualRow}>
        <AppText style={styles.manualHint}>찾는 장소가 없나요?</AppText>
        <TouchableOpacity activeOpacity={0.7} onPress={onManualPress}>
          <AppText style={styles.manualAction}>직접 입력하기</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 460,
    gap: Spacing.md,
  },
  searchField: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.foundation.grey500,
    borderRadius: Radius.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: Colors.foundation.black,
    ...Typography.body2Regular,
  },
  results: {
    flexGrow: 1,
  },
  resultRow: {
    minHeight: 60,
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderDefault,
  },
  placeName: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  address: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
  },
  emptyText: {
    paddingVertical: Spacing.xl,
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
    textAlign: 'center',
  },
  manualRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  manualHint: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
  },
  manualAction: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
});
