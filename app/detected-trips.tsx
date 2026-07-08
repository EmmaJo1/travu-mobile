import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import DetectedTripCandidateCard from '@/components/photo-import/DetectedTripCandidateCard';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { usePhotoImportFlow } from '@/hooks/usePhotoImportFlow';
import type { PhotoImportTripCandidate } from '@/services/photoImport/types';

const BACKGROUND = Colors.light.bgScreen;
const GREY_700 = '#595959';
const MOCK_SAVE_DELAY_MS = 650;
const CARD_HEIGHT = 99;
const CARD_GAP = 8;
const LIST_TOP = 195;
const LINK_HEIGHT = 20;
const LINK_DEFAULT_GAP = 32;
const LINK_MIN_GAP = 16;
const LINK_TO_CTA_GAP = 24;
const CTA_HEIGHT = 48;
const CTA_BOTTOM_MIN = 16;
const INITIAL_COVER_HYDRATION_LIMIT = 15;
const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 40,
};

export default function DetectedTrips() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const {
    candidates,
    selectedCandidateIds,
    toggleCandidate,
    hydrateCandidateCovers,
    openPhotoImportResults,
    saveSelectedPhotoImportResults,
  } = usePhotoImportFlow();
  const [isSaving, setIsSaving] = React.useState(false);
  const initialHydrationCandidateIds = React.useMemo(
    () => candidates
      .slice(0, INITIAL_COVER_HYDRATION_LIMIT)
      .map((candidate) => candidate.id),
    [candidates],
  );
  const initialHydrationCandidateKey = initialHydrationCandidateIds.join('|');
  const requestedInitialHydrationKeyRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    openPhotoImportResults();
  }, [openPhotoImportResults]);

  React.useEffect(() => {
    if (initialHydrationCandidateIds.length === 0) {
      return;
    }

    if (requestedInitialHydrationKeyRef.current === initialHydrationCandidateKey) {
      return;
    }

    requestedInitialHydrationKeyRef.current = initialHydrationCandidateKey;
    void hydrateCandidateCovers(initialHydrationCandidateIds);
  }, [hydrateCandidateCovers, initialHydrationCandidateIds, initialHydrationCandidateKey]);

  const selectedCount = selectedCandidateIds.length;
  const canSave = selectedCount > 0;
  const ctaBottom = Math.max(insets.bottom + 8, CTA_BOTTOM_MIN);
  const ctaTop = screenHeight - ctaBottom - CTA_HEIGHT;
  const maxLinkTop = ctaTop - LINK_TO_CTA_GAP - LINK_HEIGHT;
  const listNaturalHeight = Math.max(
    0,
    candidates.length * CARD_HEIGHT + Math.max(0, candidates.length - 1) * CARD_GAP,
  );
  const maxListHeight = Math.max(CARD_HEIGHT, maxLinkTop - LIST_TOP - LINK_MIN_GAP);
  const listHeight = Math.min(listNaturalHeight, maxListHeight);
  const isListScrollable = listNaturalHeight > maxListHeight;
  const linkTop = Math.min(
    LIST_TOP + listHeight + (isListScrollable ? LINK_MIN_GAP : LINK_DEFAULT_GAP),
    maxLinkTop,
  );

  const handleSave = React.useCallback(async () => {
    if (!canSave || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await Promise.all([
        saveSelectedPhotoImportResults(selectedCandidateIds),
        wait(MOCK_SAVE_DELAY_MS),
      ]);
      router.replace('/(tabs)' as Href);
    } catch {
      setIsSaving(false);
    }
  }, [canSave, isSaving, router, saveSelectedPhotoImportResults, selectedCandidateIds]);

  const handleOpenCandidate = React.useCallback(
    (candidateId: string) => {
      const candidateTitle = candidates.find((candidate) => candidate.id === candidateId)?.city;

      router.push({
        pathname: '/record-day-detail',
        params: {
          cityName: candidateTitle,
          displayTitle: candidateTitle,
          entryPoint: 'detectedTrips',
          tripTitle: candidateTitle,
          tripId: candidateId,
        },
      } as Href);
    },
    [candidates, router],
  );

  const handleOpenManualCreate = React.useCallback(() => {
    router.push('/create-trip' as Href);
  }, [router]);

  const renderCandidate = React.useCallback(
    ({ item }: { item: PhotoImportTripCandidate }) => (
      <DetectedTripCandidateCard
        city={item.city}
        country={item.country}
        dateRange={item.dateRange}
        photoCount={item.photoCount}
        image={item.image}
        selected={selectedCandidateIds.includes(item.id)}
        disabled={isSaving}
        onPress={() => handleOpenCandidate(item.id)}
        onToggle={() => toggleCandidate(item.id)}
      />
    ),
    [handleOpenCandidate, isSaving, selectedCandidateIds, toggleCandidate],
  );

  const handleViewableItemsChanged = React.useRef(({
    viewableItems,
  }: {
    viewableItems: { item?: PhotoImportTripCandidate }[];
  }) => {
    const visibleCandidateIds = viewableItems
      .map((viewableItem) => viewableItem.item?.id)
      .filter((candidateId): candidateId is string => Boolean(candidateId));

    if (visibleCandidateIds.length > 0) {
      void hydrateCandidateCovers(visibleCandidateIds);
    }
  }).current;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader title="발견된 여행" onBackPress={() => router.back()} style={styles.header} />

      <View style={styles.copyBlock}>
        <Text style={styles.title}>{candidates.length} 개의 여행 후보</Text>
        <Text style={styles.description}>저장하고 싶은 여행을 선택해주세요</Text>
      </View>

      <View style={[styles.listFrame, { height: listHeight }]}>
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.id}
          renderItem={renderCandidate}
          ItemSeparatorComponent={CandidateSeparator}
          onViewableItemsChanged={handleViewableItemsChanged}
          showsVerticalScrollIndicator={false}
          viewabilityConfig={VIEWABILITY_CONFIG}
          bounces={isListScrollable}
          scrollEnabled={isListScrollable}
        />
      </View>

      <View style={[styles.manualLinkRow, { top: linkTop }]}>
        <Text style={styles.manualText}>찾는 여행이 없나요?</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={handleOpenManualCreate}>
          <Text style={styles.manualLink}>직접 여행 추가하기</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!canSave || isSaving}
        onPress={handleSave}
        style={({ pressed }) => [
          styles.fixedButton,
          { bottom: ctaBottom },
          canSave ? styles.fixedButtonActive : styles.fixedButtonDisabled,
          pressed && canSave && styles.buttonPressed,
        ]}
      >
        {isSaving ? (
          <View style={styles.savingContent}>
            <ActivityIndicator size="small" color={Colors.foundation.grey600} />
            <Text style={styles.fixedButtonSavingLabel}>저장하는 중...</Text>
          </View>
        ) : (
          <Text style={[styles.fixedButtonLabel, !canSave && styles.fixedButtonLabelDisabled]}>
            선택한 여행 {selectedCount}개 저장하기
          </Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

function CandidateSeparator() {
  return <View style={styles.cardSeparator} />;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
    top: 127,
    left: Spacing.xl,
    right: Spacing.xl,
  },
  title: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  description: {
    marginTop: 2,
    ...Typography.body2Regular,
    color: GREY_700,
  },
  listFrame: {
    position: 'absolute',
    top: LIST_TOP,
    left: Spacing.xl,
    right: Spacing.xl,
    overflow: 'hidden',
  },
  cardSeparator: {
    height: CARD_GAP,
  },
  manualLinkRow: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    height: LINK_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  manualText: {
    ...Typography.body2Regular,
    color: GREY_700,
  },
  manualLink: {
    ...Typography.body2Emphasized,
    color: GREY_700,
    textDecorationLine: 'underline',
  },
  fixedButton: {
    position: 'absolute',
    left: 35,
    right: 35,
    height: CTA_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  fixedButtonActive: {
    backgroundColor: Colors.foundation.black,
  },
  fixedButtonDisabled: {
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    backgroundColor: Colors.foundation.white,
  },
  fixedButtonLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
  },
  fixedButtonLabelDisabled: {
    color: Colors.light.textDisabled,
  },
  fixedButtonSavingLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
  },
  savingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  buttonPressed: {
    opacity: 0.84,
  },
});
