import { type Href, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
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
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function RecordScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<DetectedTrip[]>(MOCK_DETECTED_TRIPS);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createdModalVisible, setCreatedModalVisible] = useState(false);

  const tripCards = useMemo(() => trips.map(toTripCardData), [trips]);

  const handleSavedChange = useCallback((tripId: string, saved: boolean) => {
    setTrips((prev) =>
      prev.map((trip) => (trip.id === tripId ? { ...trip, isSaved: saved } : trip)),
    );
  }, []);

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
      >
        <Text style={styles.helper}>
          사진과 위치 정보를 기반으로 감지된 여행 후보예요.
        </Text>

        <View style={styles.list}>
          {tripCards.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              isSaved={trip.isSaved}
              onPress={() => router.push('/record-day-detail' as Href)}
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
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  helper: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  list: {
    gap: Spacing['2xl'],
    alignItems: 'center',
  },
});
