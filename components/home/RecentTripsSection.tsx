import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import Text from '@/components/common/AppText';
import type { IdleRecentTrip } from '@/constants/mockIdleHomeData';
import { Colors, FontFamily } from '@/constants/theme';

interface RecentTripsSectionProps {
  trips: IdleRecentTrip[];
}

export default function RecentTripsSection({ trips }: RecentTripsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>최근 여행을 살펴보세요</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {trips.map((trip) => (
          <View key={trip.id} style={styles.card}>
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
          </View>
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
    bottom: 38,
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.foundation.white,
  },
  date: {
    position: 'absolute',
    left: 12,
    bottom: 18,
    fontFamily: FontFamily.pretendard,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.foundation.white,
  },
});
