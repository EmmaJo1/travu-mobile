import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import Text from '@/components/common/AppText';
import type { IdleRecentTrip } from '@/constants/mockIdleHomeData';
import { Colors, FontFamily, Typography } from '@/constants/theme';

interface RecentTripsSectionProps {
  trips: IdleRecentTrip[];
  onPressTrip?: (trip: IdleRecentTrip) => void;
}

export default function RecentTripsSection({ trips, onPressTrip }: RecentTripsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>최근 여행을 살펴보세요</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {trips.map((trip) => (
          <Pressable
            key={trip.id}
            accessibilityRole="button"
            disabled={!onPressTrip}
            onPress={() => onPressTrip?.(trip)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Image source={trip.image} style={styles.image} resizeMode="cover" />
            <LinearGradient
              colors={[
                'rgba(206, 206, 206, 0)',
                'rgba(153, 153, 153, 0.07)',
                'rgba(91, 91, 91, 0.15)',
                'rgba(85, 85, 85, 0.25)',
                'rgba(72, 72, 72, 0.35)',
                'rgba(51, 51, 51, 0.40)',
              ]}
              locations={[0, 0.08, 0.19, 0.31, 0.42, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.dim}
            />
            <Text style={styles.city}>{trip.city}</Text>
            <Text style={styles.date}>{trip.dateRange}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaGroup}>
                <Text style={styles.metaLabel}>장소</Text>
                <Text style={styles.metaValue}>{trip.placeCount ?? 11}</Text>
              </View>
              <Text style={styles.metaSeparator}>·</Text>
              <View style={styles.metaGroup}>
                <Text style={styles.metaLabel}>사진</Text>
                <Text style={styles.metaValue}>{trip.photoCount ?? 32}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  title: {
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.foundation.black,
  },
  listContent: {
    gap: 8,
    paddingRight: 20,
  },
  card: {
    width: 200,
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.foundation.grey100,
  },
  cardPressed: {
    opacity: 0.88,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  dim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '36%',
  },
  city: {
    position: 'absolute',
    left: 12,
    top: 180  ,
    ...Typography.body1Emphasized,
    color: Colors.foundation.white,
  },
  date: {
    position: 'absolute',
    left: 12,
    top: 202,
    ...Typography.body2Regular,
    color: Colors.foundation.white,
  },
  metaRow: {
    position: 'absolute',
    left: 12,
    top: 222,
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaGroup: {
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaLabel: {
    ...Typography.captionRegular,
    color: Colors.foundation.white,
  },
  metaValue: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
  },
  metaSeparator: {
    width: 12,
    fontFamily: FontFamily.pretendard,
    fontSize: 16,
    lineHeight: 19,
    textAlign: 'center',
    color: Colors.foundation.white,
  },
});
