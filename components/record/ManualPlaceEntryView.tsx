import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AuthActionButton from '@/components/common/AuthActionButton';
import AppText from '@/components/common/AppText';
import AppTextInput from '@/components/common/AppTextInput';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import type { SelectedPlace } from '@/services/placeSearch/types';

interface ManualPlaceEntryViewProps {
  initialPlaceName?: string;
  initialCityName?: string;
  countryName?: string;
  onApply: (place: SelectedPlace) => void;
}

export default function ManualPlaceEntryView({
  initialPlaceName,
  initialCityName,
  countryName,
  onApply,
}: ManualPlaceEntryViewProps) {
  const [placeName, setPlaceName] = useState(initialPlaceName ?? '');
  const [cityName, setCityName] = useState(initialCityName ?? '');

  useEffect(() => {
    setPlaceName(initialPlaceName ?? '');
    setCityName(initialCityName ?? '');
  }, [initialCityName, initialPlaceName]);

  const trimmedPlaceName = placeName.trim();
  const trimmedCityName = cityName.trim();

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <AppText style={styles.label}>장소명</AppText>
        <AppTextInput
          autoFocus
          onChangeText={setPlaceName}
          placeholder="장소명을 입력하세요"
          placeholderTextColor={Colors.foundation.grey500}
          style={styles.input}
          value={placeName}
        />
      </View>

      <View style={styles.field}>
        <AppText style={styles.label}>도시 또는 지역</AppText>
        <AppTextInput
          onChangeText={setCityName}
          placeholder="예: 시드니"
          placeholderTextColor={Colors.foundation.grey500}
          style={styles.input}
          value={cityName}
        />
      </View>

      <AuthActionButton
        label="적용하기"
        onPress={() => {
          if (!trimmedPlaceName) {
            return;
          }

          onApply({
            source: 'manual',
            placeName: trimmedPlaceName,
            cityName: trimmedCityName || undefined,
            countryName,
          });
        }}
        state={trimmedPlaceName ? 'on' : 'off'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xl,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  input: {
    height: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: 0,
    textAlignVertical: 'center',
    borderWidth: 1,
    borderColor: Colors.foundation.grey500,
    borderRadius: Radius.sm,
    color: Colors.foundation.black,
    ...Typography.body2Regular,
  },
});
