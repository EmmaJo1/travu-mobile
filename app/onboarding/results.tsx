import { Feather } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import Text from '@/components/common/AppText';
import OnboardingSwipeContainer from '@/components/onboarding/OnboardingSwipeContainer';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { usePhotoImportFlow } from '@/hooks/usePhotoImportFlow';

const BACKGROUND = Colors.warm.white;
const MOCK_SAVE_DELAY_MS = 650;
const GREY_200 = '#C3C3C3';
const GREY_700 = '#595959';
const GREY_900 = '#353535';
const BUTTON_SELECTED_BG = '#1F1F1F';
const BUTTON_UNSELECTED_BG = '#C5C5C5';

interface ResultTripCardProps {
  city: string;
  country: string;
  dateRange: string;
  photoCount: number;
  image: ImageSourcePropType;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export default function OnboardingResultsScreen() {
  const router = useRouter();
  const {
    candidates,
    selectedCandidateIds,
    toggleCandidate,
    openPhotoImportResults,
    deferPhotoImportResults,
    saveSelectedPhotoImportResults,
  } = usePhotoImportFlow();
  const [isSaving, setIsSaving] = React.useState(false);
  const selectedCount = selectedCandidateIds.length;
  const canSave = selectedCount > 0;

  React.useEffect(() => {
    openPhotoImportResults();
  }, [openPhotoImportResults]);

  const goHome = React.useCallback(() => {
    router.replace('/(tabs)' as Href);
  }, [router]);

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
      goHome();
    } catch {
      setIsSaving(false);
    }
  }, [canSave, goHome, isSaving, saveSelectedPhotoImportResults, selectedCandidateIds]);

  const handleSkip = React.useCallback(() => {
    if (isSaving) {
      return;
    }

    deferPhotoImportResults();
    goHome();
  }, [deferPhotoImportResults, goHome, isSaving]);

  return (
    <OnboardingSwipeContainer currentStep="results" style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.pageIndicator}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pageDot,
              index === 3 && styles.pageDotActive,
            ]}
          />
        ))}
      </View>

      <Text style={styles.title}>지난 여행을 찾았어요</Text>
      <Text style={styles.description}>
        사진첩에서 발견한 여행을 확인하고{'\n'}
        내 여행에 저장해보세요
      </Text>
      <Text style={styles.countLabel}>총 {candidates.length}개의 여행 후보</Text>

      <ScrollView
        style={styles.listViewport}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {candidates.map((candidate) => {
          const selected = selectedCandidateIds.includes(candidate.id);

          return (
            <ResultTripCard
              key={candidate.id}
              city={candidate.city}
              country={candidate.country}
              dateRange={candidate.dateRange}
              photoCount={candidate.photoCount}
              image={candidate.image}
              selected={selected}
              disabled={isSaving}
              onToggle={() => toggleCandidate(candidate.id)}
            />
          );
        })}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`선택한 여행 ${selectedCount}개 저장하기`}
        disabled={!canSave || isSaving}
        onPress={handleSave}
        style={[
          styles.primaryButton,
          canSave && styles.primaryButtonActive,
          isSaving && styles.primaryButtonSaving,
        ]}
      >
        {isSaving ? (
          <View style={styles.savingButtonContent}>
            <ActivityIndicator size="small" color={GREY_700} />
            <Text
              style={[
                styles.primaryButtonLabel,
                styles.primaryButtonLabelActive,
                styles.primaryButtonLabelSaving,
              ]}
            >
              저장하는 중...
            </Text>
          </View>
        ) : (
          <Text
            style={[
              styles.primaryButtonLabel,
              canSave && styles.primaryButtonLabelActive,
            ]}
          >
            선택한 여행 {selectedCount}개 저장하기
          </Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="나중에 할게요"
        disabled={isSaving}
        hitSlop={8}
        onPress={handleSkip}
        style={styles.skipButton}
      >
        <Text style={styles.skipLabel}>나중에 할게요</Text>
      </Pressable>

      <View style={styles.helperRow}>
        <Feather name="info" size={12} color={Colors.foundation.grey400} />
        <Text style={styles.helperText}>언제든 홈화면 내에서 추가할 수 있어요</Text>
      </View>
    </OnboardingSwipeContainer>
  );
}

function ResultTripCard({
  city,
  country,
  dateRange,
  photoCount,
  image,
  selected,
  disabled = false,
  onToggle,
}: ResultTripCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${city} 여행 ${selected ? '선택 해제' : '선택'}`}
      disabled={disabled}
      hitSlop={4}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.tripCard,
        selected && styles.tripCardSelected,
        pressed && styles.tripCardPressed,
      ]}
    >
      <View style={styles.tripContent}>
        <Image source={image} style={styles.tripImage} resizeMode="cover" />

        <View style={styles.tripInfo}>
          <View style={styles.cityRow}>
            <Text style={styles.cityText} numberOfLines={1}>
              {city}
            </Text>
            <Text style={styles.countryText} numberOfLines={1}>
              {country}
            </Text>
          </View>

          <Text style={styles.dateText} numberOfLines={1}>
            {dateRange}
          </Text>

          <View style={styles.photoRow}>
            <Feather name="image" size={16} color={GREY_700} />
            <View style={styles.photoCopyRow}>
              <Text style={styles.photoText}>사진</Text>
              <Text style={styles.photoCountText}>{photoCount}</Text>
              <Text style={styles.photoText}>장</Text>
            </View>
          </View>
        </View>
      </View>

      <View
        pointerEvents="none"
        style={[
          styles.selectButton,
          selected ? styles.selectButtonSelected : styles.selectButtonUnselected,
        ]}
      >
        <Text
          style={[
            styles.selectButtonLabel,
            selected && styles.selectButtonLabelSelected,
          ]}
        >
          {selected ? '선택됨' : '선택'}
        </Text>
      </View>
    </Pressable>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  pageIndicator: {
    position: 'absolute',
    top: 88,
    left: 0,
    right: 0,
    height: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  pageDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#C3C3C3',
    backgroundColor: Colors.foundation.white,
  },
  pageDotActive: {
    borderColor: Colors.foundation.black,
    backgroundColor: Colors.foundation.black,
  },
  title: {
    position: 'absolute',
    top: 133,
    left: Spacing.xl,
    right: Spacing.xl,
    ...Typography.title1,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  description: {
    position: 'absolute',
    top: 188,
    left: Spacing.xl,
    right: Spacing.xl,
    width: 220,
    ...Typography.body1Regular,
    color: GREY_700,
    letterSpacing: 0,
  },
  countLabel: {
    position: 'absolute',
    top: 269,
    left: Spacing.xl,
    width: 105,
    height: 20,
    ...Typography.body2Regular,
    color: GREY_700,
    letterSpacing: 0,
  },
  listViewport: {
    position: 'absolute',
    top: 305,
    left: Spacing.xl,
    right: Spacing.xl,
    height: 313,
  },
  listContent: {
    gap: Spacing.sm,
  },
  tripCard: {
    width: '100%',
    height: 99,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingRight: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingLeft: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(201, 201, 201, 0.30)',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  tripCardSelected: {
    borderColor: 'rgba(145, 144, 144, 0.50)',
    backgroundColor: 'rgba(166, 166, 166, 0.20)',
  },
  tripCardPressed: {
    opacity: 0.82,
  },
  tripContent: {
    width: 220,
    height: 75,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  tripImage: {
    width: 94,
    height: 75,
    flexShrink: 0,
    borderRadius: Radius.xs,
    backgroundColor: '#AFAFAF',
  },
  tripInfo: {
    width: 110,
    height: 70,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  cityRow: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cityText: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  countryText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    letterSpacing: 0,
  },
  dateText: {
    width: 110,
    height: 20,
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    letterSpacing: 0,
  },
  photoRow: {
    width: 93,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  photoCopyRow: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  photoText: {
    ...Typography.body2Regular,
    color: GREY_700,
    textAlign: 'center',
    letterSpacing: 0,
  },
  photoCountText: {
    ...Typography.body2Emphasized,
    color: GREY_900,
    textAlign: 'center',
    letterSpacing: 0,
  },
  selectButton: {
    height: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
  },
  selectButtonSelected: {
    width: 56,
    backgroundColor: BUTTON_SELECTED_BG,
  },
  selectButtonUnselected: {
    width: 45,
    backgroundColor: BUTTON_UNSELECTED_BG,
  },
  selectButtonLabel: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
    letterSpacing: 0,
  },
  selectButtonLabelSelected: {
    ...Typography.captionRegular,
    color: Colors.foundation.white,
    letterSpacing: 0,
  },
  primaryButton: {
    position: 'absolute',
    top: 700,
    left: 35,
    width: 320,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    backgroundColor: Colors.foundation.white,
  },
  primaryButtonActive: {
    borderColor: Colors.foundation.black,
    backgroundColor: Colors.foundation.black,
  },
  primaryButtonSaving: {
    borderColor: GREY_200,
    backgroundColor: GREY_200,
  },
  savingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryButtonLabel: {
    ...Typography.body2Emphasized,
    color: Colors.light.textDisabled,
    textAlign: 'center',
    letterSpacing: 0,
  },
  primaryButtonLabelActive: {
    color: Colors.foundation.white,
  },
  primaryButtonLabelSaving: {
    color: GREY_700,
  },
  skipButton: {
    position: 'absolute',
    top: 764,
    left: 0,
    right: 0,
    height: 20,
    alignItems: 'center',
  },
  skipLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    textDecorationLine: 'underline',
    letterSpacing: 0,
  },
  helperRow: {
    position: 'absolute',
    top: 792,
    left: 0,
    right: 0,
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  helperText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey400,
    letterSpacing: 0,
  },
});
