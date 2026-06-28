import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import FrostedGlassSurface from '@/components/common/FrostedGlassSurface';
import Text from '@/components/common/AppText';
import type { DetectedTrip } from '@/constants/mockIdleHomeData';
import { Colors, FontFamily, Radius, Typography } from '@/constants/theme';

interface DetectedTripSectionProps {
  trip: DetectedTrip;
  saved?: boolean;
  onPressTrip?: (trip: DetectedTrip) => void;
  onSave: (trip: DetectedTrip) => void;
}

export default function DetectedTripSection({
  trip,
  saved = false,
  onPressTrip,
  onSave,
}: DetectedTripSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{'\uC0AC\uC9C4\uC5D0\uC11C \uC815\uB9AC\uD55C \uC5EC\uD589\uC744 \uCC3E\uC544\uC694'}</Text>

      <FrostedGlassSurface
        mode="translucent"
        style={styles.cardSurface}
        contentStyle={styles.cardClip}
        borderRadius={Radius.sm}
        fillColor="rgba(255, 255, 255, 0.10)"
        borderColor="rgba(201, 201, 201, 0.30)"
      >
        <View style={styles.cardContent}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${trip.city} ${trip.dateRange}`}
            disabled={!onPressTrip}
            onPress={() => onPressTrip?.(trip)}
            style={({ pressed }) => [styles.cardBody, pressed && styles.cardBodyPressed]}
          >
            <Image source={trip.image} style={styles.thumbnail} resizeMode="cover" />

            <View style={styles.info}>
              <View style={styles.cityRow}>
                <Text style={styles.city} numberOfLines={1}>
                  {trip.city}
                </Text>
                <Text style={styles.country} numberOfLines={1}>
                  {trip.country}
                </Text>
              </View>
              <Text style={styles.date} numberOfLines={1}>
                {trip.dateRange}
              </Text>
              <View style={styles.photoRow}>
                <Feather name="image" size={16} color={Colors.foundation.grey700} />
                <Text style={styles.photoText}>
                  {'\uC0AC\uC9C4 '}
                  <Text style={styles.photoCount}>{trip.photoCount}</Text>
                  {' \uC7A5'}
                </Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              saved
                ? '\uAC10\uC9C0\uB41C \uC5EC\uD589 \uC800\uC7A5\uB428'
                : '\uAC10\uC9C0\uB41C \uC5EC\uD589 \uC800\uC7A5'
            }
            disabled={saved}
            hitSlop={8}
            style={[styles.saveButton, saved && styles.saveButtonSaved]}
            onPress={saved ? undefined : () => onSave(trip)}
          >
            <Text style={styles.saveLabel}>{saved ? '\uC800\uC7A5\uB428' : '\uC800\uC7A5'}</Text>
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
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  cardSurface: {
    width: '100%',
    height: 99,
    borderRadius: Radius.sm,
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
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
    paddingRight: 16,
    paddingBottom: 12,
    paddingLeft: 12,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardBodyPressed: {
    opacity: 0.82,
  },
  thumbnail: {
    width: 94,
    height: 75,
    borderRadius: Radius.xs,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
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
  date: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey700,
  },
  photoCount: {
    fontFamily: FontFamily.pretendardSemiBold,
    color: Colors.foundation.grey900,
  },
  saveButton: {
    width: 56,
    height: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.grey500,
  },
  saveButtonSaved: {
    backgroundColor: Colors.foundation.grey400,
  },
  saveLabel: {
    ...Typography.captionRegular,
    color: Colors.foundation.white,
  },
});
