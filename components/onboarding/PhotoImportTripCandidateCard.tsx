import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/common/AppText';
import type { PhotoImportTripCandidate } from '@/services/photoImport/types';
import { Colors, Radius, Typography } from '@/constants/theme';

interface PhotoImportTripCandidateCardProps {
  candidate: PhotoImportTripCandidate;
  selected: boolean;
  onToggleSelect: (candidateId: string) => void;
}

export default function PhotoImportTripCandidateCard({
  candidate,
  selected,
  onToggleSelect,
}: PhotoImportTripCandidateCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${candidate.city} 여행 후보 ${selected ? '선택됨' : '선택 안 됨'}`}
      style={[styles.card, selected && styles.selectedCard]}
      onPress={() => onToggleSelect(candidate.id)}
    >
      <Image source={candidate.image} style={styles.thumbnail} resizeMode="cover" />

      <View style={styles.cardBody}>
        <View style={styles.cityRow}>
          <Text style={styles.city}>{candidate.city}</Text>
          <Text style={styles.country}>· {candidate.country}</Text>
          {selected ? (
            <View style={styles.selectedBadge}>
              <Feather name="check" size={13} color={Colors.foundation.white} />
              <Text style={styles.selectedBadgeText}>선택됨</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.dateRange}>{candidate.dateRange}</Text>

        <View style={styles.photoRow}>
          <Feather name="image" size={16} color={Colors.foundation.grey600} />
          <Text style={styles.photoText}>사진 {candidate.photoCount}장</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 96,
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(201, 201, 201, 0.30)',
  },
  selectedCard: {
    borderColor: Colors.foundation.black,
    borderWidth: 1.5,
  },
  thumbnail: {
    width: 96,
    height: 96,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  city: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  country: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  selectedBadge: {
    marginLeft: 'auto',
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.black,
  },
  selectedBadgeText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
  },
  dateRange: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    marginTop: 5,
  },
  photoRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  photoText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
});
