import { Feather } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { usePrimaryLivingArea } from '@/hooks/usePrimaryLivingArea';
import { searchLivingAreas, type LivingArea } from '@/services/location/livingAreas';

const BACKGROUND = Colors.light.bgScreen;
const GREY_700 = '#595959';

export default function FindTripsStartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { livingArea, saveLivingArea } = usePrimaryLivingArea();
  const [isEditingArea, setIsEditingArea] = React.useState(!livingArea);
  const [query, setQuery] = React.useState('');
  const [selectedArea, setSelectedArea] = React.useState<LivingArea | null>(livingArea);
  const [isSaving, setIsSaving] = React.useState(false);
  const debouncedQuery = useDebouncedValue(query, 250);
  const results = React.useMemo(() => searchLivingAreas(debouncedQuery), [debouncedQuery]);
  const hasSavedArea = Boolean(livingArea);
  const canStart = !isSaving && (!isEditingArea || Boolean(selectedArea));

  React.useEffect(() => {
    if (!livingArea || isEditingArea) {
      return;
    }

    setSelectedArea(livingArea);
  }, [isEditingArea, livingArea]);

  const handleSelectArea = React.useCallback((area: LivingArea) => {
    setSelectedArea(area);
    setQuery(area.displayName);
  }, []);

  const navigateToLoading = React.useCallback((skipLivingArea = false) => {
    router.replace({
      pathname: '/find-trips-loading',
      params: {
        source: 'home',
        ...(skipLivingArea ? { skipLivingArea: 'true' } : null),
      },
    } as Href);
  }, [router]);

  const handleStart = React.useCallback(async () => {
    if (!canStart) {
      return;
    }

    if (!isEditingArea) {
      navigateToLoading(false);
      return;
    }

    if (!selectedArea) {
      return;
    }

    setIsSaving(true);

    try {
      await saveLivingArea(selectedArea);
      navigateToLoading(false);
    } catch (error) {
      console.warn('[find trips start] failed to save living area', error);
      Alert.alert('생활 지역을 저장하지 못했어요', '잠시 후 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  }, [canStart, isEditingArea, navigateToLoading, saveLivingArea, selectedArea]);

  const handleSecondary = React.useCallback(() => {
    if (hasSavedArea) {
      router.back();
      return;
    }

    navigateToLoading(true);
  }, [hasSavedArea, navigateToLoading, router]);

  const handleChangeArea = React.useCallback(() => {
    setIsEditingArea(true);
    setSelectedArea(livingArea);
    setQuery(livingArea?.displayName ?? '');
  }, [livingArea]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader onBackPress={() => router.back()} style={styles.header} />

      <View style={styles.content}>
        <Text style={styles.title}>
          {hasSavedArea ? '사진에서 여행 찾기' : '여행을 더 정확하게 찾아볼게요'}
        </Text>
        <Text style={styles.description}>
          {hasSavedArea
            ? '사진첩의 촬영 위치와 날짜를 바탕으로\n새로운 여행을 찾아드려요'
            : '주로 생활하는 지역을 설정하면\n일상 사진을 제외하고 여행을 찾을 수 있어요'}
        </Text>

        <View style={styles.fieldBlock}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldLabel}>주 생활 지역</Text>
            {hasSavedArea && !isEditingArea ? (
              <Pressable accessibilityRole="button" hitSlop={8} onPress={handleChangeArea}>
                <Text style={styles.changeText}>변경</Text>
              </Pressable>
            ) : null}
          </View>

          {isEditingArea ? (
            <>
              <View style={styles.searchBox}>
                <Feather name="search" size={18} color={Colors.foundation.grey600} />
                <TextInput
                  value={query}
                  onChangeText={(nextQuery) => {
                    setQuery(nextQuery);
                    setSelectedArea(null);
                  }}
                  placeholder="도시 또는 지역 검색"
                  placeholderTextColor={Colors.foundation.grey500}
                  style={styles.input}
                  autoCorrect={false}
                  returnKeyType="search"
                  allowFontScaling={false}
                />
              </View>

              {selectedArea ? (
                <View style={styles.selectedPill}>
                  <Feather name="map-pin" size={14} color={Colors.foundation.black} />
                  <Text style={styles.selectedText} numberOfLines={1}>
                    {selectedArea.displayName}
                  </Text>
                </View>
              ) : null}

              {query.trim().length >= 2 && !selectedArea ? (
                <View style={styles.results}>
                  {results.length > 0 ? (
                    results.map((area) => (
                      <Pressable
                        key={area.id}
                        accessibilityRole="button"
                        onPress={() => handleSelectArea(area)}
                        style={({ pressed }) => [
                          styles.resultRow,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Feather name="map-pin" size={16} color={Colors.foundation.grey600} />
                        <View style={styles.resultTextBlock}>
                          <Text style={styles.resultTitle}>{area.displayName}</Text>
                          <Text style={styles.resultMeta}>
                            {[area.administrativeArea, area.countryName].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={Colors.foundation.grey500} />
                      </Pressable>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>검색 결과가 없어요</Text>
                  )}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.savedField}>
              <Feather name="map-pin" size={16} color={Colors.foundation.grey600} />
              <Text style={styles.savedFieldText} numberOfLines={1}>
                {livingArea?.displayName}
              </Text>
            </View>
          )}

          <Text style={styles.guideText}>
            {hasSavedArea
              ? '선택한 생활 지역의 사진은 자동 여행 후보에서 제외할게요.\n직접 여행으로 만드는 건 언제든 가능해요'
              : '정확한 주소는 필요하지 않아요'}
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}>
        <Pressable
          accessibilityRole="button"
          disabled={!canStart}
          onPress={handleStart}
          style={({ pressed }) => [
            styles.primaryButton,
            !canStart && styles.primaryButtonDisabled,
            pressed && canStart && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.primaryButtonText, !canStart && styles.primaryButtonTextDisabled]}>
            {hasSavedArea ? '여행 찾기 시작' : '설정하고 여행 찾기'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={handleSecondary}
          hitSlop={8}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            {hasSavedArea ? '취소' : '설정 없이 찾기'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    height: 44,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 132,
  },
  title: {
    ...Typography.title1,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  description: {
    marginTop: Spacing.lg,
    ...Typography.body1Regular,
    color: GREY_700,
    letterSpacing: 0,
  },
  fieldBlock: {
    marginTop: 96,
    gap: Spacing.sm,
  },
  fieldHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  changeText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textDecorationLine: 'underline',
    letterSpacing: 0,
  },
  searchBox: {
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
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingHorizontal: 0,
    paddingVertical: 0,
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
    textAlignVertical: 'center',
  },
  savedField: {
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
  savedFieldText: {
    flex: 1,
    minWidth: 0,
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  selectedPill: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },
  selectedText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  results: {
    maxHeight: 220,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.foundation.white,
  },
  resultRow: {
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderDefault,
  },
  resultTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  resultMeta: {
    marginTop: 2,
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
    letterSpacing: 0,
  },
  emptyText: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
    textAlign: 'center',
    letterSpacing: 0,
  },
  guideText: {
    marginTop: Spacing.sm,
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
    letterSpacing: 0,
  },
  footer: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    bottom: 0,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.black,
  },
  primaryButtonDisabled: {
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    backgroundColor: Colors.foundation.white,
  },
  primaryButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    letterSpacing: 0,
  },
  primaryButtonTextDisabled: {
    color: Colors.light.textDisabled,
  },
  secondaryButton: {
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textDecorationLine: 'underline',
    letterSpacing: 0,
  },
  buttonPressed: {
    opacity: 0.84,
  },
});
