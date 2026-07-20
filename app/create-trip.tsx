import { Feather } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useCreateTrip } from '@/hooks/useCreateTrip';
import { useAuth } from '@/providers/AuthProvider';
import { ActiveTripExistsError } from '@/services/supabase/trips';

const BACKGROUND = Colors.light.bgScreen;
const GREY_700 = '#595959';
const TRIP_TITLE_MAX_LENGTH = 40;

let pendingTripTitle = '';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateLabel(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return '';

  const start = startDate.split('-').map(Number);
  const end = endDate.split('-').map(Number);
  if (start.length !== 3 || end.length !== 3) return '';

  if (startDate === endDate) {
    return `${start[0]}. ${start[1]}. ${start[2]}`;
  }

  return `${start[0]}. ${start[1]}. ${start[2]} - ${end[1]}. ${end[2]}`;
}

export default function CreateTripScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { canUseSupabaseUserData } = useAuth();
  const createTripMutation = useCreateTrip();

  const destinationId = firstParam(params.destinationId);
  const destinationName = firstParam(params.destinationName);
  const destinationCountry = firstParam(params.destinationCountry);
  const destinationLabel = firstParam(params.destinationLabel);
  const startDate = firstParam(params.startDate);
  const endDate = firstParam(params.endDate);
  const routeTripTitle = firstParam(params.tripTitle);
  const hasRouteSelections = Boolean(destinationName || startDate || endDate);
  const [tripTitle, setTripTitle] = React.useState(() => {
    const initialTitle = routeTripTitle ?? (hasRouteSelections ? pendingTripTitle : '');
    pendingTripTitle = initialTitle;
    return initialTitle;
  });

  React.useEffect(() => {
    if (routeTripTitle !== undefined) {
      pendingTripTitle = routeTripTitle;
      setTripTitle(routeTripTitle);
      return;
    }

    if (!hasRouteSelections) {
      pendingTripTitle = '';
      setTripTitle('');
    }
  }, [hasRouteSelections, routeTripTitle]);

  const normalizedTripTitle = tripTitle.trim();
  const dateLabel = formatDateLabel(startDate, endDate);
  const canCreate = Boolean(normalizedTripTitle && destinationName && startDate && endDate);
  const ctaBottom = Math.max(insets.bottom + 32, 64);

  const sharedParams = React.useMemo(() => ({
    destinationId,
    destinationName,
    destinationCountry,
    destinationLabel,
    startDate,
    endDate,
    tripTitle,
  }), [
    destinationCountry,
    destinationId,
    destinationLabel,
    destinationName,
    endDate,
    startDate,
    tripTitle,
  ]);

  const handleChangeTripTitle = React.useCallback((value: string) => {
    pendingTripTitle = value;
    setTripTitle(value);
  }, []);

  const handleBack = React.useCallback(() => {
    pendingTripTitle = '';
    router.back();
  }, [router]);

  const handleOpenDestination = React.useCallback(() => {
    router.push({
      pathname: '/select-trip-destination',
      params: sharedParams,
    } as Href);
  }, [router, sharedParams]);

  const handleOpenDate = React.useCallback(() => {
    router.push({
      pathname: '/select-trip-date',
      params: sharedParams,
    } as Href);
  }, [router, sharedParams]);

  const handleCreate = React.useCallback(async () => {
    if (!canCreate) return;

    const nextTripTitle = tripTitle.trim();
    const nextDestinationName = destinationName;
    const nextStartDate = startDate;
    const nextEndDate = endDate;

    if (!nextTripTitle || !nextDestinationName || !nextStartDate || !nextEndDate) {
      return;
    }

    let createdTripId: string | undefined;

    if (canUseSupabaseUserData) {
      try {
        const trip = await createTripMutation.mutateAsync({
          destinationCity: nextDestinationName,
          destinationCityKo: nextDestinationName,
          destinationCountry,
          destinationCountryKo: destinationCountry,
          endDate: nextEndDate,
          isEndDateUndecided: false,
          startDate: nextStartDate,
          status: 'draft',
          title: nextTripTitle,
        });
        createdTripId = trip.id;
      } catch (error) {
        if (error instanceof ActiveTripExistsError) {
          Alert.alert('이미 진행 중인 여행이 있어요.', '기존 여행을 종료한 뒤 새 여행을 시작해주세요.');
          return;
        }

        console.warn('Failed to create trip in Supabase.', error);
        Alert.alert('여행을 저장하지 못했어요.', '잠시 후 다시 시도해주세요.');
        return;
      }
    }

    pendingTripTitle = '';
    router.replace({
      pathname: '/trip-created',
      params: {
        destinationId,
        destinationName,
        destinationCountry,
        destinationLabel,
        startDate: nextStartDate,
        endDate: nextEndDate,
        tripId: createdTripId,
        tripTitle: nextTripTitle,
      },
    } as Href);
  }, [
    canCreate,
    canUseSupabaseUserData,
    createTripMutation,
    destinationCountry,
    destinationId,
    destinationLabel,
    destinationName,
    endDate,
    router,
    startDate,
    tripTitle,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader title="직접 여행 만들기" onBackPress={handleBack} style={styles.header} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: ctaBottom + 48 + Spacing['4xl'] },
        ]}
      >
        <View style={styles.copyBlock}>
          <Text style={styles.title}>어떤 여행을 정리할까요?</Text>
          <Text style={styles.description}>여행 제목과 여행지, 기간을 입력하여 직접 여행을 생성해보세요</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>여행 제목</Text>
            <View style={styles.titleInputContainer}>
              <Feather name="edit-3" size={18} color={Colors.foundation.grey600} />
              <TextInput
                accessibilityLabel="여행 제목"
                autoCorrect={false}
                maxLength={TRIP_TITLE_MAX_LENGTH}
                onChangeText={handleChangeTripTitle}
                placeholder="여행 제목을 입력해주세요"
                placeholderTextColor={Colors.foundation.grey500}
                returnKeyType="done"
                selectionColor={Colors.foundation.black}
                style={styles.titleInput}
                value={tripTitle}
              />
            </View>
          </View>

          <CreateTripField
            icon="map-pin"
            label="여행지"
            value={destinationLabel ?? ''}
            placeholder="도시나 국가를 선택해주세요"
            onPress={handleOpenDestination}
          />
          <CreateTripField
            icon="calendar"
            label="여행 기간"
            value={dateLabel}
            placeholder="여행 날짜를 선택해주세요"
            onPress={handleOpenDate}
          />
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        disabled={!canCreate}
        onPress={handleCreate}
        style={({ pressed }) => [
          styles.cta,
          { bottom: ctaBottom },
          canCreate ? styles.ctaActive : styles.ctaDisabled,
          pressed && canCreate && styles.ctaPressed,
        ]}
      >
        <Text style={[styles.ctaLabel, !canCreate && styles.ctaLabelDisabled]}>여행 만들기</Text>
      </Pressable>
    </SafeAreaView>
  );
}

interface CreateTripFieldProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}

function CreateTripField({ icon, label, value, placeholder, onPress }: CreateTripFieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.fieldInput, pressed && styles.fieldInputPressed]}
      >
        <View style={styles.fieldTextRow}>
          <Feather name={icon} size={18} color={Colors.foundation.grey600} />
          <Text style={[styles.fieldValue, !value && styles.fieldPlaceholder]}>
            {value || placeholder}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={Colors.foundation.grey500} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    height: 44,
  },
  scrollContent: {
    paddingTop: Spacing['4xl'] * 3,
    paddingHorizontal: Spacing.xl,
  },
  copyBlock: {
    width: 270,
  },
  title: {
    ...Typography.title1,
    color: Colors.foundation.black,
  },
  description: {
    width: 210,
    marginTop: Spacing.lg,
    ...Typography.body1Regular,
    color: GREY_700,
  },
  form: {
    marginTop: Spacing['4xl'] * 2,
    gap: Spacing['3xl'],
  },
  fieldBlock: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  titleInputContainer: {
    height: 56,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  fieldInput: {
    height: 56,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldInputPressed: {
    opacity: 0.86,
  },
  fieldTextRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fieldValue: {
    flex: 1,
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  fieldPlaceholder: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
  },
  cta: {
    position: 'absolute',
    left: 35,
    right: 35,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  ctaActive: {
    backgroundColor: Colors.foundation.black,
  },
  ctaDisabled: {
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    backgroundColor: Colors.foundation.white,
  },
  ctaPressed: {
    opacity: 0.84,
  },
  ctaLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  ctaLabelDisabled: {
    color: Colors.light.textDisabled,
  },
});