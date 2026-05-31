import React, { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import AppText from '@/components/common/AppText';
import AppTextInput from '@/components/common/AppTextInput';
import {
  DESTINATION_CONTINENT_FILTERS,
  MOCK_DESTINATIONS,
  searchDestinations,
  sortDestinations,
  type DestinationContinent,
  type MockDestination,
} from '@/constants/mockDestinations';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface DestinationSelectViewProps {
  query: string;
  selectedContinent: 'all' | DestinationContinent;
  onBack: () => void;
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onContinentChange: (continent: 'all' | DestinationContinent) => void;
  onSelect: (destination: MockDestination) => void;
}

function DestinationRow({
  destination,
  onPress,
}: {
  destination: MockDestination;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.listRow} onPress={onPress} activeOpacity={0.65}>
      <AppText style={styles.destinationName}>{destination.city}</AppText>
      {destination.type === 'city' && (
        <AppText style={styles.countryName}>{destination.country}</AppText>
      )}
    </TouchableOpacity>
  );
}

export default function DestinationSelectView({
  query,
  selectedContinent,
  onBack,
  onClose,
  onQueryChange,
  onContinentChange,
  onSelect,
}: DestinationSelectViewProps) {
  const trimmedQuery = query.trim();
  const destinations = useMemo(() => {
    if (trimmedQuery) return searchDestinations(trimmedQuery);
    return sortDestinations(
      selectedContinent === 'all'
        ? MOCK_DESTINATIONS
        : MOCK_DESTINATIONS.filter(
            (destination) => destination.continent === selectedContinent,
          ),
    );
  }, [selectedContinent, trimmedQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={8}>
          <Image
            source={require('../../assets/images/screenheader-back.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <AppText style={styles.title}>여행지 선택</AppText>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={20} color={Colors.foundation.black} />
        </TouchableOpacity>
      </View>

      <AppTextInput
        style={styles.searchInput}
        placeholder="도시 또는 국가 검색"
        placeholderTextColor={Colors.foundation.grey500}
        value={query}
        onChangeText={onQueryChange}
        autoFocus
      />

      {!trimmedQuery && (
        <>
          <AppText style={styles.filterTitle}>대륙별 보기</AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          >
            {DESTINATION_CONTINENT_FILTERS.map((filter) => {
              const active = selectedContinent === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => onContinentChange(filter.id)}
                  activeOpacity={0.7}
                >
                  <AppText
                    style={[styles.filterLabel, active && styles.filterLabelActive]}
                  >
                    {filter.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppText style={styles.sectionTitle}>
          {trimmedQuery ? '검색 결과' : '여행지 목록'}
        </AppText>
        <View style={styles.destinationList}>
          {destinations.map((destination) => (
            <DestinationRow
              key={destination.id}
              destination={destination}
              onPress={() => onSelect(destination)}
            />
          ))}
          {destinations.length === 0 && (
            <AppText style={styles.emptyText}>검색 결과가 없습니다.</AppText>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 520,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 28,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  searchInput: {
    ...Typography.body2Regular,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.foundation.grey400,
    paddingHorizontal: Spacing.md,
    color: Colors.foundation.black,
    marginBottom: Spacing.md,
  },
  content: {
    maxHeight: 440,
  },
  contentContainer: {
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey600,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  filterTitle: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey600,
    marginBottom: Spacing.xs,
  },
  filterList: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  filterChip: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    backgroundColor: Colors.foundation.white,
  },
  filterChipActive: {
    borderColor: Colors.foundation.black,
  },
  filterLabel: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey600,
  },
  filterLabelActive: {
    color: Colors.foundation.black,
  },
  destinationList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.foundation.grey100,
  },
  listRow: {
    minHeight: 54,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.foundation.grey100,
  },
  destinationName: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  countryName: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
    marginTop: 2,
  },
  emptyText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
    paddingVertical: Spacing.xl,
    textAlign: 'center',
  },
});
