import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import FrostedGlassSurface from '@/components/common/FrostedGlassSurface';
import Text from '@/components/common/AppText';
import type { DetectedTrip } from '@/constants/mockIdleHomeData';
import { Colors, FontFamily } from '@/constants/theme';

interface DetectedTripSectionProps {
  trip: DetectedTrip;
  saved?: boolean;
  onSave: (trip: DetectedTrip) => void;
}

export default function DetectedTripSection({
  trip,
  saved = false,
  onSave,
}: DetectedTripSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>자동으로 감지된 여행이 있어요</Text>

      <FrostedGlassSurface
        mode="translucent"
        style={styles.cardSurface}
        contentStyle={styles.cardClip}
        borderRadius={8}
        fillColor="rgba(255, 255, 255, 0.40)"
        borderColor="rgba(199, 199, 199, 0.30)"
      >
        <View style={styles.cardContent}>
          <Image source={trip.image} style={styles.thumbnail} resizeMode="cover" />

          <View style={styles.info}>
            <View style={styles.cityRow}>
              <Text style={styles.city}>{trip.city}</Text>
              <Text style={styles.country}>{trip.country}</Text>
            </View>
            <Text style={styles.date}>{trip.dateRange}</Text>
            <View style={styles.photoRow}>
              <Feather name="image" size={16} color="#595959" />
              <Text style={styles.photoText}>
                사진 <Text style={styles.photoCount}>{trip.photoCount}</Text> 장
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? '감지된 여행 저장됨' : '감지된 여행 저장'}
            disabled={saved}
            hitSlop={8}
            style={[styles.saveButton, saved && styles.saveButtonSaved]}
            onPress={saved ? undefined : () => onSave(trip)}
          >
            <Text style={styles.saveLabel}>{saved ? '저장됨' : '저장'}</Text>
          </Pressable>
        </View>
      </FrostedGlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  title: {
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.foundation.black,
  },
  cardSurface: {
    width: '100%',
    height: 99,
    borderRadius: 8,
  },
  cardClip: {
    height: 99,
  },
  cardContent: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    paddingRight: 16,
    paddingBottom: 12,
    paddingLeft: 12,
  },
  thumbnail: {
    width: 94,
    height: 75,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  city: {
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.foundation.black,
  },
  country: {
    fontFamily: FontFamily.pretendard,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.foundation.grey600,
  },
  date: {
    fontFamily: FontFamily.pretendard,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.foundation.grey600,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoText: {
    fontFamily: FontFamily.pretendard,
    fontSize: 14,
    lineHeight: 20,
    color: '#595959',
  },
  photoCount: {
    fontFamily: FontFamily.pretendardSemiBold,
    color: '#353535',
  },
  saveButton: {
    height: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#1F1F1F',
  },
  saveButtonSaved: {
    backgroundColor: Colors.foundation.grey500,
  },
  saveLabel: {
    fontFamily: FontFamily.pretendard,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.foundation.white,
  },
});
