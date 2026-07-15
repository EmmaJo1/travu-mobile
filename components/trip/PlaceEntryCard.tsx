import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import CountryFlag, { isSupportedCountryFlagCode } from '@/components/common/CountryFlag';
import FullScreenImageViewer from '@/components/common/FullScreenImageViewer';
import HorizontalEdgeScrollView, {
  PLACE_ENTRY_SCROLL_LEADING_BLEED,
} from '@/components/common/HorizontalEdgeScrollView';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { resolveCountryCodeFromPlace } from '@/services/location/countryCodes';

export interface PlaceEntry {
  id: string;
  source?: 'mock' | 'manual' | 'detected';
  dataSource?: 'local' | 'mock' | 'supabase' | 'detected';
  placeId?: string;
  recordId?: string;
  tripId?: string;
  tripDayId?: string;
  googlePlaceId?: string;
  placeName?: string;
  formattedAddress?: string;
  cityName?: string;
  countryCode?: string;
  countryName?: string;
  latitude?: number;
  longitude?: number;
  time?: string;
  place: string;
  category?: string;
  city?: string;
  rating?: number;
  text?: string;
  photoUris?: string[];
  photoSources?: ImageSourcePropType[];
  dayId?: string;
  dayNumber?: number;
  dateKey?: string;
  dateLabel?: string;
  weekdayLabel?: string;
  photoCount?: number;
  recordCount?: number;
  onEdit?: () => void;
}

export type PlaceEntryCardVariant = 'archive' | 'recordReview' | 'recordPhotoReview';

interface PlaceEntryCardProps {
  entry: PlaceEntry;
  style?: StyleProp<ViewStyle>;
  showRating?: boolean;
  variant?: PlaceEntryCardVariant;
  photoDisplayMode?: 'scroll' | 'limited';
  onPress?: () => void;
  onLongPress?: () => void;
  onPhotoGridOpen?: () => void;
  onPhotoDelete?: (photoIndex: number) => void;
  onQuickEdit?: () => void;
  onQuickAddPhoto?: () => void;
  onQuickDelete?: () => void;
  flagScreen?: 'detected_record_day_detail' | 'saved_day_archive_detail';
}

interface QuickMenuRowProps {
  destructive?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}

const DESTRUCTIVE = '#EB524D';
const LABEL_RECORD = '\uAE30\uB85D';
const LABEL_PHOTO = '\uC0AC\uC9C4';
const LABEL_EDIT = '\uC218\uC815';
const LABEL_CLOSE_PLACE_MENU = '\uC7A5\uC18C \uBA54\uB274 \uB2EB\uAE30';
const LABEL_EDIT_PLACE_INFO = '\uC7A5\uC18C \uC815\uBCF4 \uC218\uC815';
const LABEL_ADD_PHOTO = '\uC0AC\uC9C4 \uCD94\uAC00';
const LABEL_DELETE_PLACE = '\uC7A5\uC18C \uC0AD\uC81C';
const LABEL_PHOTO_GRID_TITLE = '\uC0AC\uC9C4';
const LABEL_PLACE_MORE = '\uC7A5\uC18C \uBA54\uB274';
const QUICK_MENU_TOP_OFFSET = 34;

function getPhotoSources(entry: PlaceEntry): ImageSourcePropType[] {
  return [
    ...(entry.photoSources ?? []),
    ...(entry.photoUris ?? []).map((uri) => ({ uri })),
  ];
}

function getTimeParts(time?: string) {
  const trimmed = time?.trim() ?? '';
  const matched = trimmed.match(/^(.+?)\s+(AM|PM)$/i);

  if (!matched) {
    return {
      period: '',
      shouldStack: false,
      timeText: trimmed,
    };
  }

  const timeText = matched[1].trim();

  return {
    period: matched[2].toUpperCase(),
    shouldStack: false,
    timeText,
  };
}

function QuickMenuRow({ destructive = false, icon, label, onPress }: QuickMenuRowProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.quickMenuRow}>
      <Feather name={icon} size={18} color={destructive ? DESTRUCTIVE : Colors.foundation.black} />
      <Text style={[styles.quickMenuLabel, destructive && styles.quickMenuLabelDestructive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function PlaceEntryCard({
  entry,
  style,
  showRating = true,
  variant = 'archive',
  photoDisplayMode = 'scroll',
  onPress,
  onLongPress,
  onPhotoGridOpen,
  onPhotoDelete,
  onQuickEdit,
  onQuickAddPhoto,
  onQuickDelete,
  flagScreen,
}: PlaceEntryCardProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isQuickMenuOpen, setQuickMenuOpen] = useState(false);
  const [quickMenuAnchor, setQuickMenuAnchor] = useState<{ right: number; top: number }>({
    right: Spacing.xl,
    top: 0,
  });
  const [isPhotoGridOpen, setPhotoGridOpen] = useState(false);
  const moreButtonRef = useRef<View>(null);
  const photoSources = getPhotoSources(entry);
  const isArchive = variant === 'archive';
  const isPhotoReview = variant === 'recordPhotoReview';
  const usesReviewLayout = variant === 'recordReview';
  const hasQuickMenuActions = Boolean(onQuickEdit || onQuickAddPhoto || onQuickDelete);
  const recordCount = entry.recordCount ?? (entry.text ? 1 : 0);
  const photoCount = isPhotoReview ? photoSources.length : entry.photoCount ?? photoSources.length;
  const timeParts = getTimeParts(entry.time);
  const shouldLimitPhotos = photoDisplayMode === 'limited';
  const hasOverflowPhotos = shouldLimitPhotos && photoSources.length > 5;
  const visiblePhotoSources = hasOverflowPhotos ? photoSources.slice(0, 5) : photoSources;
  const remainingPhotoCount = Math.max(photoSources.length - visiblePhotoSources.length, 0);
  const countryResolution = resolveCountryCodeFromPlace({
    countryCode: entry.countryCode,
    countryName: entry.countryName,
  });
  const countryCode = countryResolution.countryCode;
  const canRenderCountryFlag = isSupportedCountryFlagCode(countryCode);

  useEffect(() => {
    if (!__DEV__ || !flagScreen) {
      return;
    }

    if (countryCode && canRenderCountryFlag) {
      console.info('[place country flag] resolved', {
        countryCode,
        placeCountryFlagResolved: true,
        placeCountryFlagFallbackUsed:
          countryResolution.source !== 'countryCode' &&
          countryResolution.source !== 'country_code',
        placeId: entry.placeId ?? entry.id,
        rendered: true,
        screen: flagScreen,
        source: countryResolution.source,
      });
      return;
    }

    if (countryCode && !canRenderCountryFlag) {
      console.info('[place country flag] asset missing', {
        countryCode,
        placeCountryFlagAssetMissing: true,
        placeId: entry.placeId ?? entry.id,
        screen: flagScreen,
        source: countryResolution.source,
      });
      return;
    }

    if (entry.countryCode || entry.countryName) {
      console.warn('[place country flag] invalid code', {
        receivedValue: entry.countryCode ?? entry.countryName,
        placeCountryFlagInvalidCode: true,
        placeId: entry.placeId ?? entry.id,
        screen: flagScreen,
      });
    } else {
      console.info('[place country flag] missing', {
        placeCountryFlagMissing: true,
        placeId: entry.placeId ?? entry.id,
        reason: 'missing_country_metadata',
        screen: flagScreen,
      });
    }
  }, [
    countryCode,
    canRenderCountryFlag,
    countryResolution.source,
    entry.countryCode,
    entry.countryName,
    entry.id,
    entry.placeId,
    flagScreen,
  ]);

  const closeQuickMenu = () => setQuickMenuOpen(false);

  const toggleQuickMenu = () => {
    if (isQuickMenuOpen) {
      closeQuickMenu();
      return;
    }

    moreButtonRef.current?.measureInWindow((x, y, measuredWidth) => {
      setQuickMenuAnchor({
        right: Math.max(Spacing.xl, width - x - measuredWidth),
        top: Math.max(insets.top, y + QUICK_MENU_TOP_OFFSET),
      });
    });
    setQuickMenuOpen(true);
  };

  const renderQuickMenuRows = () => (
    <>
      <QuickMenuRow
        icon="image"
        label={LABEL_ADD_PHOTO}
        onPress={() => {
          closeQuickMenu();
          onQuickAddPhoto?.();
        }}
      />
      <View style={styles.quickMenuDivider} />
      <QuickMenuRow
        icon="edit-3"
        label={LABEL_EDIT_PLACE_INFO}
        onPress={() => {
          closeQuickMenu();
          onQuickEdit?.();
        }}
      />
      <QuickMenuRow
        destructive
        icon="trash-2"
        label={LABEL_DELETE_PLACE}
        onPress={() => {
          closeQuickMenu();
          onQuickDelete?.();
        }}
      />
    </>
  );

  const handlePressPlaceInfo = () => {
    closeQuickMenu();
    onPress?.();
  };

  const openPhotoGrid = () => {
    closeQuickMenu();
    if (onPhotoGridOpen) {
      onPhotoGridOpen();
      return;
    }

    setPhotoGridOpen(true);
  };

  const openPhotoViewerFromGrid = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  useEffect(() => {
    if (selectedPhotoIndex == null) {
      return;
    }

    if (photoSources.length === 0) {
      setSelectedPhotoIndex(null);
      return;
    }

    if (selectedPhotoIndex > photoSources.length - 1) {
      setSelectedPhotoIndex(photoSources.length - 1);
    }
  }, [photoSources.length, selectedPhotoIndex]);

  const handleDeleteCurrentPhoto = (photoIndex: number) => {
    onPhotoDelete?.(photoIndex);
  };

  return (
    <>
      <View style={[styles.card, style]}>
        <View style={[styles.timeline, isPhotoReview && styles.timelinePhotoReview]}>
          <View style={timeParts.shouldStack ? styles.timeStacked : styles.timeInline}>
            <Text
              lineBreakStrategyIOS="push-out"
              numberOfLines={1}
              style={styles.time}
            >
              {timeParts.timeText}
            </Text>
            {timeParts.period ? (
              <Text
                lineBreakStrategyIOS="push-out"
                numberOfLines={1}
                style={styles.time}
              >
                {timeParts.period}
              </Text>
            ) : null}
          </View>
          <View style={[styles.timelineLine, isPhotoReview && styles.timelineLinePhotoReview]} />
        </View>

        <View style={[styles.content, isPhotoReview && styles.contentPhotoReview]}>
          {isPhotoReview ? (
            <View style={styles.photoReviewHeader}>
              <Pressable
                accessibilityRole={onPress ? 'button' : undefined}
                disabled={!onPress}
                delayLongPress={320}
                onLongPress={onLongPress}
                onPress={handlePressPlaceInfo}
                style={styles.photoReviewInfo}
              >
                <View style={styles.placeTitlePressArea}>
                  <Text numberOfLines={1} ellipsizeMode="tail" style={styles.placeName}>
                    {entry.place}
                  </Text>
                  <CountryFlag countryCode={countryCode} />
                </View>

                {(entry.category || entry.city) ? (
                  <View style={styles.tagRow}>
                    {entry.category ? <Text style={styles.tag}>{entry.category}</Text> : null}
                    {entry.category && entry.city ? <View style={styles.tagDot} /> : null}
                    {entry.city ? <Text style={styles.tag}>{entry.city}</Text> : null}
                  </View>
                ) : null}
              </Pressable>

              <Pressable
                ref={moreButtonRef}
                accessibilityRole="button"
                accessibilityLabel={LABEL_PLACE_MORE}
                hitSlop={8}
                onPress={toggleQuickMenu}
                style={styles.moreButton}
              >
                <Feather name="more-horizontal" size={20} color={Colors.foundation.grey800} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole={onPress ? 'button' : undefined}
              disabled={!onPress}
              delayLongPress={320}
              onLongPress={onLongPress}
              onPress={handlePressPlaceInfo}
              style={[styles.header, isArchive && styles.headerArchive]}
            >
              <View style={[styles.headerLeft, isArchive && styles.headerLeftArchive]}>
                <View style={styles.placeNameRow}>
                  <View style={styles.placeTitlePressArea}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.placeName}>
                      {entry.place}
                    </Text>
                    <CountryFlag countryCode={countryCode} />
                  </View>
                </View>

                <View style={styles.infoPressArea}>
                  {(entry.category || entry.city) ? (
                    <View style={styles.tagRow}>
                      {entry.category ? <Text style={styles.tag}>{entry.category}</Text> : null}
                      {entry.category && entry.city ? <View style={styles.tagDot} /> : null}
                      {entry.city ? <Text style={styles.tag}>{entry.city}</Text> : null}
                    </View>
                  ) : null}

                  {usesReviewLayout ? (
                    <View style={styles.reviewMetaRow}>
                      <Text style={styles.reviewMetaText}>{LABEL_RECORD}</Text>
                      <Text style={styles.reviewMetaText}>{recordCount}</Text>
                      <View style={styles.reviewMetaDot} />
                      <Text style={styles.reviewMetaText}>{LABEL_PHOTO}</Text>
                      <Text style={styles.reviewMetaText}>{photoCount}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {hasQuickMenuActions ? (
                <Pressable
                  ref={moreButtonRef}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={(event) => {
                    event.stopPropagation();
                    toggleQuickMenu();
                  }}
                  style={styles.moreButton}
                >
                  <Feather name="more-horizontal" size={16} color={Colors.foundation.black} />
                </Pressable>
              ) : entry.onEdit ? (
                <TouchableOpacity onPress={entry.onEdit} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Text style={styles.editText}>{LABEL_EDIT}</Text>
                </TouchableOpacity>
              ) : isArchive && onPress ? (
                <Feather name="chevron-right" size={24} color={Colors.foundation.grey700} />
              ) : null}

            </Pressable>
          )}

          {showRating && entry.rating != null && entry.rating > 0 ? (
            <Text style={styles.stars}>{'\u2605'.repeat(Math.min(entry.rating, 5))}</Text>
          ) : null}

          {visiblePhotoSources.length > 0 ? (
            <HorizontalEdgeScrollView
              leadingBleed={PLACE_ENTRY_SCROLL_LEADING_BLEED}
              contentContainerStyle={styles.photoStrip}
            >
              {visiblePhotoSources.map((source, index) => {
                const isOverlay = hasOverflowPhotos && index === 4;

                return (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    key={`photo-${index}`}
                    onPress={() => {
                      closeQuickMenu();
                      if (isOverlay) {
                        openPhotoGrid();
                        return;
                      }
                      setSelectedPhotoIndex(index);
                    }}
                    style={styles.photoItem}
                  >
                    <Image source={source} style={styles.photo} resizeMode="cover" />
                    {isOverlay ? (
                      <View style={styles.photoOverlay}>
                        <Text style={styles.photoOverlayText}>+{remainingPhotoCount}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </HorizontalEdgeScrollView>
          ) : null}

          {variant === 'archive' && entry.text ? (
            <Text style={styles.noteText}>
              {entry.text}
            </Text>
          ) : null}
        </View>
      </View>

      <FullScreenImageViewer
        images={photoSources}
        initialIndex={selectedPhotoIndex ?? 0}
        leadingAction={onPhotoDelete ? {
          destructive: true,
          icon: 'trash-outline',
          key: 'delete-photo',
          label: '\uC0AC\uC9C4 \uC0AD\uC81C',
          onPress: handleDeleteCurrentPhoto,
        } : undefined}
        onClose={() => setSelectedPhotoIndex(null)}
        visible={selectedPhotoIndex != null}
      />

      {hasQuickMenuActions ? (
        <Modal
          animationType="none"
          onRequestClose={closeQuickMenu}
          transparent
          visible={isQuickMenuOpen}
        >
          <View style={styles.quickMenuOverlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={LABEL_CLOSE_PLACE_MENU}
              onPress={closeQuickMenu}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                styles.quickMenu,
                {
                  right: quickMenuAnchor.right,
                  top: quickMenuAnchor.top,
                },
              ]}
            >
              {renderQuickMenuRows()}
            </View>
          </View>
        </Modal>
      ) : null}

      <Modal
        animationType="slide"
        onRequestClose={() => setPhotoGridOpen(false)}
        statusBarTranslucent={false}
        visible={isPhotoGridOpen}
      >
        <View style={[styles.gridScreen, { paddingTop: insets.top }]}>
          <View style={styles.gridHeader}>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setPhotoGridOpen(false)}
              style={styles.gridHeaderButton}
            >
              <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
            </Pressable>
            <Text style={styles.gridTitle}>
              {LABEL_PHOTO_GRID_TITLE} {photoSources.length}
            </Text>
            <View style={styles.gridHeaderButton} />
          </View>

          <ScrollView contentContainerStyle={styles.gridContent}>
            {photoSources.map((source, index) => (
              <Pressable
                accessibilityRole="imagebutton"
                key={`grid-photo-${index}`}
                onPress={() => openPhotoViewerFromGrid(index)}
                style={[
                  styles.gridPhoto,
                  { width: (width - Spacing.xl * 2 - Spacing.xs * 2) / 3 },
                ]}
              >
                <Image source={source} style={styles.gridPhotoImage} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeline: {
    width: 40,
    alignItems: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.xs,
    flexShrink: 0,
  },
  timeInline: {
    minHeight: 14,
    width: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  timeStacked: {
    minHeight: 28,
    width: 40,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
  },
  time: {
    ...Typography.captionEmphasized,
    lineHeight: 14,
    color: Colors.foundation.grey500,
    textAlign: 'center',
    flexShrink: 0,
    includeFontPadding: false,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    minHeight: 24,
    backgroundColor: Colors.foundation.grey100,
  },
  timelinePhotoReview: {
    height: 196,
  },
  timelineLinePhotoReview: {
    minHeight: 162,
  },
  content: {
    flex: 1,
    alignSelf: 'stretch',
    gap: Spacing.lg,
  },
  contentPhotoReview: {
    gap: Spacing.md,
  },
  header: {
    height: 74,
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(212, 212, 212, 0.30)',
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
    zIndex: 2,
  },
  headerArchive: {
    height: 38,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    height: 58,
    justifyContent: 'center',
    gap: 2,
  },
  headerLeftArchive: {
    height: 38,
    justifyContent: 'flex-start',
  },
  infoPressArea: {
    alignSelf: 'stretch',
    gap: 2,
  },
  placeTitlePressArea: {
    minWidth: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  placeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  placeName: {
    ...Typography.body1Emphasized,
    flexShrink: 1,
    color: Colors.foundation.black,
  },
  moreButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    flexShrink: 0,
    marginTop: -Spacing.sm,
    marginRight: -Spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tag: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey500,
  },
  tagDot: {
    width: 2,
    height: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey500,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reviewMetaText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey800,
  },
  reviewMetaDot: {
    width: 2,
    height: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey800,
  },
  editText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey400,
    flexShrink: 0,
  },
  photoReviewHeader: {
    height: 38,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  photoReviewInfo: {
    flex: 1,
    minWidth: 0,
  },
  photoCountButton: {
    minHeight: 22,
    justifyContent: 'center',
    paddingLeft: Spacing.sm,
  },
  photoCountLink: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey400,
  },
  stars: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
    letterSpacing: 1,
  },
  photoStrip: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  photoItem: {
    width: 110,
    height: 146,
    overflow: 'hidden',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
  },
  photoOverlayText: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
  },
  noteText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  quickMenuOverlay: {
    flex: 1,
  },
  quickMenu: {
    position: 'absolute',
    top: 34,
    right: 0,
    width: 174,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    zIndex: 10,
    ...Shadows.modal,
  },
  quickMenuDivider: {
    height: 1,
    marginVertical: Spacing.xs,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.light.borderStrong,
  },
  quickMenuRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  quickMenuLabel: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  quickMenuLabelDestructive: {
    color: DESTRUCTIVE,
  },
  gridScreen: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  gridHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.light.bgScreen,
  },
  gridHeaderButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  gridPhoto: {
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.white,
  },
  gridPhotoImage: {
    width: '100%',
    height: '100%',
  },
});
