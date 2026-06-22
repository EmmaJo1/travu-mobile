import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type ImageSourcePropType,
} from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

const GREY_700 = '#595959';
const GREY_900 = '#353535';
const SELECTED_BG = 'rgba(166, 166, 166, 0.20)';
const SELECTED_BORDER = 'rgba(145, 144, 144, 0.50)';
const UNSELECTED_BG = 'rgba(255, 255, 255, 0.10)';
const UNSELECTED_BORDER = 'rgba(201, 201, 201, 0.30)';
const SELECTED_BUTTON_BG = '#1F1F1F';
const UNSELECTED_BUTTON_BG = '#C5C5C5';

interface DetectedTripCandidateCardProps {
  city: string;
  country: string;
  dateRange: string;
  photoCount: number;
  image: ImageSourcePropType;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  onToggle: () => void;
}

export default function DetectedTripCandidateCard({
  city,
  country,
  dateRange,
  photoCount,
  image,
  selected,
  disabled = false,
  onPress,
  onToggle,
}: DetectedTripCandidateCardProps) {
  const handleToggle = React.useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation();
      onToggle();
    },
    [onToggle],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${city} 여행 상세 확인`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.cardSelected : styles.cardUnselected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.content}>
        <Image source={image} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.city} numberOfLines={1}>
              {city}
            </Text>
            <Text style={styles.country} numberOfLines={1}>
              {country}
            </Text>
          </View>
          <Text style={styles.dateRange} numberOfLines={1}>
            {dateRange}
          </Text>
          <View style={styles.photoRow}>
            <Feather name="image" size={16} color={GREY_700} />
            <Text style={styles.photoLabel}>사진</Text>
            <Text style={styles.photoCount}>{photoCount}</Text>
            <Text style={styles.photoLabel}>장</Text>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${city} 여행 ${selected ? '선택 해제' : '선택'}`}
        disabled={disabled}
        hitSlop={8}
        onPress={handleToggle}
        style={({ pressed }) => [
          styles.selectButton,
          selected ? styles.selectButtonSelected : styles.selectButtonUnselected,
          pressed && styles.selectButtonPressed,
        ]}
      >
        <Text style={selected ? styles.selectButtonLabelSelected : styles.selectButtonLabelUnselected}>
          {selected ? '선택됨' : '선택'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
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
  },
  cardSelected: {
    borderColor: SELECTED_BORDER,
    backgroundColor: SELECTED_BG,
  },
  cardUnselected: {
    borderColor: UNSELECTED_BORDER,
    backgroundColor: UNSELECTED_BG,
  },
  cardPressed: {
    opacity: 0.86,
  },
  content: {
    flex: 1,
    minWidth: 0,
    height: 75,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  thumbnail: {
    width: 94,
    height: 75,
    flexShrink: 0,
    borderRadius: Radius.xs,
    backgroundColor: '#AFAFAF',
  },
  info: {
    flex: 1,
    minWidth: 0,
    height: 70,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  titleRow: {
    maxWidth: '100%',
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  city: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  country: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  dateRange: {
    alignSelf: 'stretch',
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  photoRow: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  photoLabel: {
    ...Typography.body2Regular,
    color: GREY_700,
  },
  photoCount: {
    ...Typography.body2Emphasized,
    color: GREY_900,
  },
  selectButton: {
    height: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    marginLeft: Spacing.sm,
  },
  selectButtonSelected: {
    width: 56,
    backgroundColor: SELECTED_BUTTON_BG,
  },
  selectButtonUnselected: {
    width: 45,
    backgroundColor: UNSELECTED_BUTTON_BG,
  },
  selectButtonPressed: {
    opacity: 0.82,
  },
  selectButtonLabelSelected: {
    ...Typography.captionRegular,
    color: Colors.foundation.white,
  },
  selectButtonLabelUnselected: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
  },
});
