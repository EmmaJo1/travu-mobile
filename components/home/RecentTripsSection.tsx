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

const KOREAN_CITY_LABELS: Record<string, string> = {
  bangkok: '\uBC29\uCF55',
  busan: '\uBD80\uC0B0',
  florence: '\uD53C\uB80C\uCCB4',
  hongkong: '\uD64D\uCF69',
  'hong kong': '\uD64D\uCF69',
  kyoto: '\uAD50\uD1A0',
  macao: '\uB9C8\uCE74\uC624',
  osaka: '\uC624\uC0AC\uCE74',
  paris: '\uD30C\uB9AC',
  rome: '\uB85C\uB9C8',
  seoul: '\uC11C\uC6B8',
  singapore: '\uC2F1\uAC00\uD3EC\uB974',
  sydney: '\uC2DC\uB4DC\uB2C8',
  tokyo: '\uB3C4\uCFC4',
  venice: '\uBCA0\uB124\uCE58\uC544',
  vienna: '\uBE48',
};

const KOREAN_CITY_LABELS_BY_TRIP_ID: Record<string, string> = {
  'recent-paris': '\uD30C\uB9AC',
  'recent-sydney': '\uC2DC\uB4DC\uB2C8',
};

function getRecentTripCityLabel(trip: IdleRecentTrip) {
  const extendedTrip = trip as IdleRecentTrip & {
    cityKo?: string;
    cityNameKo?: string;
    localizedName?: { ko?: string };
  };
  const localizedCity = extendedTrip.cityNameKo ?? extendedTrip.cityKo ?? extendedTrip.localizedName?.ko;

  if (localizedCity?.trim()) {
    return localizedCity.trim();
  }

  const idLabel = KOREAN_CITY_LABELS_BY_TRIP_ID[trip.tripId ?? trip.id] ?? KOREAN_CITY_LABELS_BY_TRIP_ID[trip.id];

  if (idLabel) {
    return idLabel;
  }

  const normalizedCity = trip.city.trim().toLowerCase();

  return KOREAN_CITY_LABELS[normalizedCity] ?? trip.city;
}

export default function RecentTripsSection({ trips, onPressTrip }: RecentTripsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{'\uCD5C\uADFC \uC5EC\uD589\uC744 \uC0B4\uD3B4\uBCF4\uC138\uC694'}</Text>

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
            {trip.image ? (
              <Image source={trip.image} style={styles.image} resizeMode="cover" />
            ) : null}
            <LinearGradient
              colors={[
                'rgba(206, 206, 206, 0)',
                'rgba(153, 153, 153, 0.07)',
                'rgba(91, 91, 91, 0.15)',
                'rgba(85, 85, 85, 0.25)',
                'rgba(72, 72, 72, 0.35)',
                'rgba(51, 51, 51, 0.40)',
              ]}
              locations={[0.6446, 0.6725, 0.7106, 0.7455, 0.7924, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.dim}
            />
            <Text style={styles.city}>{getRecentTripCityLabel(trip)}</Text>
            <Text style={styles.date}>{trip.dateRange}</Text>
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
    width: 160,
    height: 200,
    borderRadius: 4,
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
    ...StyleSheet.absoluteFillObject,
  },
  city: {
    position: 'absolute',
    left: 12,
    bottom: 32,
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  date: {
    position: 'absolute',
    left: 12,
    bottom: 14,
    ...Typography.captionRegular,
    color: Colors.foundation.white,
  },
});
