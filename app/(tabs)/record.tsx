import { type Href, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '@/components/common/PrimaryButton';
import ScreenHeader from '@/components/nav/ScreenHeader';
import TripCreateModal from '@/components/record/TripCreateModal';
import TripCreatedModal from '@/components/record/TripCreatedModal';
import TripCard from '@/components/trip/TripCard';
import {
  MOCK_DETECTED_TRIPS,
  toTripCardData,
  type DetectedTrip,
} from '@/constants/mockDetectedTrips';
import { addSavedDetectedTrips } from '@/constants/savedMyPageTrips';
import { Colors, Spacing } from '@/constants/theme';

export default function RecordScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<DetectedTrip[]>(MOCK_DETECTED_TRIPS);
  const [isRefreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createdModalVisible, setCreatedModalVisible] = useState(false);

  const tripCards = useMemo(() => trips.map(toTripCardData), [trips]);

  const handleSavedChange = useCallback((tripId: string, saved: boolean) => {
    setTrips((prev) =>
      prev.map((trip) => (trip.id === tripId ? { ...trip, isSaved: saved } : trip)),
    );
  }, []);

  const handleRefresh = useCallback(() => {
    const savedTrips = trips.filter((trip) => trip.isSaved);

    setRefreshing(true);

    if (savedTrips.length > 0) {
      addSavedDetectedTrips(savedTrips);
      setTrips((prev) => prev.filter((trip) => !trip.isSaved));
    }

    requestAnimationFrame(() => {
      setRefreshing(false);
    });
  }, [trips]);

  const navigateToDayDetail = useCallback(
    (tripId: string, dayId: string) => {
      router.push({
        pathname: '/record-day-detail',
        params: { tripId, dayId },
      } as Href);
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="자동 분류 기록"
        onBackPress={() => router.push('/(tabs)/' as Href)}
        rightSlot={
          <PrimaryButton
            label="직접 추가"
            onPress={() => setCreateModalVisible(true)}
          />
        }
        style={styles.header}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={Colors.foundation.grey600}
            colors={[Colors.foundation.grey600]}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.list}>
          {tripCards.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              isSaved={trip.isSaved}
              onPress={() => {
                const firstDayId = trip.days?.[0]?.id;
                if (firstDayId) {
                  navigateToDayDetail(trip.id, firstDayId);
                  return;
                }
                router.push('/record-day-detail' as Href);
              }}
              onDayPress={(dayId) => navigateToDayDetail(trip.id, dayId)}
              onSavedChange={(saved) => handleSavedChange(trip.id, saved)}
            />
          ))}
        </View>
      </ScrollView>

      <TripCreateModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={() => {
          setCreateModalVisible(false);
          setCreatedModalVisible(true);
        }}
      />

      <TripCreatedModal
        visible={createdModalVisible}
        onClose={() => setCreatedModalVisible(false)}
        onStartDayOne={() => {
          setCreatedModalVisible(false);
          router.push('/record-day-detail' as Href);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  header: {
    width: '100%',
    height: 44,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  list: {
    alignItems: 'stretch',
    gap: Spacing['3xl'],
  },
});
