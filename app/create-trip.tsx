import { Feather } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const BACKGROUND = Colors.light.bgScreen;
const GREY_700 = '#595959';

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

  const destinationId = firstParam(params.destinationId);
  const destinationName = firstParam(params.destinationName);
  const destinationCountry = firstParam(params.destinationCountry);
  const destinationLabel = firstParam(params.destinationLabel);
  const startDate = firstParam(params.startDate);
  const endDate = firstParam(params.endDate);

  const dateLabel = formatDateLabel(startDate, endDate);
  const canCreate = Boolean(destinationName && startDate && endDate);
  const ctaBottom = Math.max(insets.bottom + 32, 64);

  const sharedParams = {
    destinationId,
    destinationName,
    destinationCountry,
    destinationLabel,
    startDate,
    endDate,
  };

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

  const handleCreate = React.useCallback(() => {
    if (!canCreate) return;

    router.replace({
      pathname: '/trip-created',
      params: {
        destinationId,
        destinationName,
        destinationCountry,
        destinationLabel,
        startDate,
        endDate,
      },
    } as Href);
  }, [
    canCreate,
    destinationCountry,
    destinationId,
    destinationLabel,
    destinationName,
    endDate,
    router,
    startDate,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader title="직접 여행 만들기" onBackPress={() => router.back()} style={styles.header} />

      <View style={styles.copyBlock}>
        <Text style={styles.title}>어떤 여행을 정리할까요?</Text>
        <Text style={styles.description}>여행지와 기간을 입력하여 직접 여행을 생성해보세요</Text>
      </View>

      <View style={styles.form}>
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
  copyBlock: {
    position: 'absolute',
    top: 163,
    left: Spacing.xl,
    width: 270,
  },
  title: {
    ...Typography.title1,
    color: Colors.foundation.black,
  },
  description: {
    width: 165,
    marginTop: Spacing.lg,
    ...Typography.body1Regular,
    color: GREY_700,
  },
  form: {
    position: 'absolute',
    top: 360,
    left: Spacing.xl,
    right: Spacing.xl,
    gap: Spacing['3xl'],
  },
  fieldBlock: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.body1Emphasized,
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
