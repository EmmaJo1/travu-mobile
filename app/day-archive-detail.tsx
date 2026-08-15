/**
 * day-archive-detail
 * Figma: 506:704
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Image as RNImage,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import PrimaryButton from '@/components/common/PrimaryButton';
import StartTripSetupModal, {
  type StartTripSetupValue,
} from '@/components/home/StartTripSetupModal';
import PlaceCreateModal, {
  type PlaceCreateInput,
  type PlaceEntryDayOption,
} from '@/components/record/PlaceCreateModal';
import TripPlacesMap from '@/components/map/TripPlacesMap';
import DaySelectorSheet, { type DaySelectorItem } from '@/components/record/DaySelectorSheet';
import PlaceEntryCard, { type PlaceEntry } from '@/components/trip/PlaceEntryCard';
import type { DestinationOption } from '@/constants/mockTripDestinations';
import {
  ARCHIVE_DAY_OPTIONS,
  MOCK_ARCHIVE_DETAIL,
  type ArchiveDetailData,
  type ArchiveDetailPlace,
  formatArchiveDayLabel,
  toPlaceEntries,
} from '@/constants/mockArchiveDetail';
import { MOCK_MY_PAGE_TRIPS, type MyPageTrip } from '@/constants/mockMyPageTrips';
import {
  removeSavedMyPageTrip,
  updateSavedMyPageTrip,
  useSavedMyPageTrips,
} from '@/constants/savedMyPageTrips';
import { Colors, FontFamily, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import {
  isPlaceDetailDeleted,
  markPlaceDetailDeleted,
} from '@/services/placeDetailDeletionRegistry';
import { useTripDays } from '@/hooks/useTripDays';
import { useTripDetail } from '@/hooks/useTripDetail';
import { useAuth } from '@/providers/AuthProvider';
import { useCreatePlaceRecord } from '@/hooks/useCreatePlaceRecord';
import { useDeletePlaceRecord } from '@/hooks/useDeletePlaceRecord';
import { useDeleteTrip } from '@/hooks/useDeleteTrip';
import { useTripDayPlaces } from '@/hooks/useTripDayPlaces';
import { useTripDayRecords } from '@/hooks/useTripDayRecords';
import { useResolvedTripPhotos, useTripDayPhotos } from '@/hooks/useSupabasePhotos';
import { supabaseQueryKeys } from '@/hooks/supabaseQueryKeys';
import { useTripPlaces, useTripRecords } from '@/hooks/useTripTimelineData';
import { useUpdatePlaceRecord } from '@/hooks/useUpdatePlaceRecord';
import { isSupabaseUuid } from '@/hooks/usePlaceDetailData';
import type { TripDayRow } from '@/services/supabase/tripDays';
import { setTripCoverPhoto } from '@/services/supabase/photos';
import { isUserSavedTripStatus } from '@/services/supabase/tripStatus';
import type { TripRow } from '@/services/supabase/trips';
import { mapSupabasePlacesToPlaceEntries } from '@/utils/supabasePlaceRecordMappers';
import { mapSupabaseTripToMyPageTrip } from '@/utils/supabaseTripMappers';
import { buildTripMapData, type TripMapMarker } from '@/services/maps/tripMapData';
import { getCumulativePlaceDistanceKm } from '@/services/maps/distance';

/** Figma 506:704 - scroll content starts below status bar(59) + header(40). */
const SCROLL_ORIGIN_Y = 99;

/** Figma y positions for the archive hero and day selector. */
const FIGMA_Y = {
  blurTop: 92,
  blurHeight: 745,
  parisTop: 134,
  photoFrameTop: 199,
  daySelectorTop: 752,
} as const;

const BLUR_TOP = FIGMA_Y.blurTop - SCROLL_ORIGIN_Y;
const BLUR_HEIGHT = FIGMA_Y.blurHeight;
const PHOTO_FRAME_TOP = FIGMA_Y.photoFrameTop - SCROLL_ORIGIN_Y;
const HERO_HEIGHT = FIGMA_Y.daySelectorTop - SCROLL_ORIGIN_Y;
const HERO_MARGIN_TOP = BLUR_TOP < 0 ? BLUR_TOP : 0;
const BLUR_REGION_TOP = BLUR_TOP - HERO_MARGIN_TOP;
const PHOTO_FRAME_WIDTH = 350;
const PHOTO_FRAME_HEIGHT = 505;
const FRAME_IMAGE_WIDTH = 301;
const FRAME_IMAGE_HEIGHT = 400;
const FRAME_DATE_TOP = 33;
const FRAME_IMAGE_TOP = 80;
const FRAME_IMAGE_LEFT = (PHOTO_FRAME_WIDTH - FRAME_IMAGE_WIDTH) / 2;
const DAY_SELECTOR_HEIGHT = 60;
const MAP_TOP_GAP = 32;
const STICKY_HEADER_SCROLL_Y = HERO_HEIGHT + DAY_SELECTOR_HEIGHT - 40;

const BLUR_RADIUS = 15;

const MASK_LOCATIONS = [
  0,
  0.0416,
  0.0961,
  0.1685,
  0.2974,
  0.5416,
  0.5857,
  0.6923,
  0.7816,
  0.8464,
  0.9079,
  1,
] as const;

const MASK_GRADIENT_COLORS = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.0625)',
  'rgba(255,255,255,0.125)',
  'rgba(255,255,255,0.25)',
  'rgba(255,255,255,0.5)',
  'rgba(255,255,255,0.75)',
  'rgba(255,255,255,1)',
  'rgba(255,255,255,0.75)',
  'rgba(255,255,255,0.5)',
  'rgba(255,255,255,0.25)',
  'rgba(255,255,255,0.125)',
  'rgba(255,255,255,0)',
] as const;

function resolveImageUri(source?: ImageSourcePropType): string | undefined {
  if (!source) {
    return undefined;
  }

  return typeof RNImage.resolveAssetSource === 'function'
    ? RNImage.resolveAssetSource(source)?.uri
    : undefined;
}

const WEB_MASK_IMAGE = `linear-gradient(180deg, ${MASK_LOCATIONS.map(
  (loc, index) => `${MASK_GRADIENT_COLORS[index]} ${loc * 100}%`,
).join(', ')})`;

type WebMaskStyle = ViewStyle & {
  WebkitMaskImage: string;
  maskImage: string;
};

function ArchiveBlurBackground({
  source,
  width,
  height,
}: {
  source?: ImageSourcePropType;
  width: number;
  height: number;
}) {
  const uri = resolveImageUri(source);

  if (!source) {
    return <View style={[styles.blurRegion, { width, height }]} />;
  }

  if (Platform.OS === 'web') {
    if (!uri) {
      return <View style={[styles.blurRegion, { width, height }]} />;
    }

    const webMaskStyle: WebMaskStyle = {
      width,
      height,
      backgroundImage: `url(${uri})`,
      WebkitMaskImage: WEB_MASK_IMAGE,
      maskImage: WEB_MASK_IMAGE,
    };

    return (
      <View
        style={[
          styles.blurRegion,
          styles.blurRegionWeb,
          webMaskStyle,
        ]}
      />
    );
  }

  return (
    <View style={[styles.blurRegion, { width, height }]}>
      <MaskedView
        style={{ width, height }}
        maskElement={
          <LinearGradient
            colors={MASK_GRADIENT_COLORS}
            locations={[...MASK_LOCATIONS]}
            style={{ width, height }}
          />
        }
      >
        <Image
          source={source}
          style={{ width, height }}
          contentFit="cover"
          contentPosition="center"
          blurRadius={BLUR_RADIUS}
        />
      </MaskedView>
    </View>
  );
}

function resolveDayNumberFromId(dayId?: string): number | undefined {
  const matchedNumber = dayId?.match(/(?:day|rd)-(\d+)/i)?.[1];
  return matchedNumber ? Number(matchedNumber) : undefined;
}

function resolveInitialArchiveDay(dayId?: string, dayNumberParam?: string): DaySelectorItem {
  const parsedDayNumber = dayNumberParam ? Number(dayNumberParam) : undefined;
  const targetDayNumber = Number.isFinite(parsedDayNumber)
    ? parsedDayNumber
    : resolveDayNumberFromId(dayId);
  const matchedByParam = ARCHIVE_DAY_OPTIONS.find(
    (day) => day.id === dayId || day.dayNumber === targetDayNumber,
  );

  if (matchedByParam) {
    return matchedByParam;
  }

  const matched = ARCHIVE_DAY_OPTIONS.find(
    (day) => day.dayNumber === MOCK_ARCHIVE_DETAIL.selectedDay.dayNumber,
  );
  return matched ?? ARCHIVE_DAY_OPTIONS[0] ?? {
    id: 'archive-day-1',
    dayNumber: 1,
    dateLabel: '2025. 8. 25',
    weekdayLabel: 'Mon',
    photoCount: 0,
  };
}

function getEntryPlaceId(entry: PlaceEntry): string {
  return entry.placeId ?? entry.googlePlaceId ?? entry.id;
}

function formatPlaceCreateDateLabel(dateLabel: string) {
  const compactDateLabel = dateLabel.replace(/\s+/g, '');
  const matched = compactDateLabel.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/);

  if (!matched) {
    return dateLabel.trim();
  }

  return `${matched[1]}.${Number(matched[2])}.${Number(matched[3])}`;
}

function parseArchiveDateLabelToDateKey(dateLabel: string) {
  const matched = dateLabel.replace(/\s+/g, '').match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/);

  if (!matched) {
    return undefined;
  }

  return `${matched[1]}-${String(Number(matched[2])).padStart(2, '0')}-${String(
    Number(matched[3]),
  ).padStart(2, '0')}`;
}

function createArchiveDayOption(day: DaySelectorItem): PlaceEntryDayOption {
  return {
    id: day.id,
    dayNumber: day.dayNumber,
    dateLabel: formatPlaceCreateDateLabel(day.dateLabel),
    weekdayLabel: day.weekdayLabel,
    photoCount: day.photoCount,
  };
}

function createDaySelectorItemFromPlaceDay(input: PlaceCreateInput): DaySelectorItem | undefined {
  if (!input.dayId || !input.dayNumber || !input.dateLabel || !input.weekdayLabel) {
    return undefined;
  }

  return {
    id: input.dayId,
    dayNumber: input.dayNumber,
    dateLabel: input.dateLabel,
    weekdayLabel: input.weekdayLabel,
    photoCount: 0,
  };
}

function getArchivePlacePhotoSources(input: PlaceCreateInput): ImageSourcePropType[] {
  return [
    ...(input.photoSources ?? []),
    ...(input.photoUris ?? []).map((uri) => ({ uri })),
  ];
}

function createArchivePlaceEntry(input: PlaceCreateInput): ArchiveDetailPlace {
  const trimmedPlace = (input.placeName ?? input.place).trim();
  const photos = getArchivePlacePhotoSources(input);
  const recordText = input.text?.trim();

  return {
    id: input.googlePlaceId ?? `archive-place-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    name: trimmedPlace,
    timeLabel: input.time?.trim() ?? '',
    category: input.category,
    city: input.cityName ?? input.city,
    memo: recordText || undefined,
    records: recordText ? [recordText] : undefined,
    images: photos,
  };
}

interface ArchiveCoverPhotoOption {
  id: string;
  photoId?: string;
  placeName: string;
  source: ImageSourcePropType;
}

function createArchiveCoverPhotoOptions(places: ArchiveDetailPlace[]): ArchiveCoverPhotoOption[] {
  return places.flatMap((place) =>
    place.images.map((source, index) => ({
      id: `${place.id}-cover-${index}`,
      placeName: place.name,
      source,
    })),
  );
}

type ArchiveHeaderActionId = 'cover' | 'info' | 'place' | 'delete';

const ARCHIVE_HEADER_ACTIONS: {
  destructive?: boolean;
  icon: keyof typeof Feather.glyphMap;
  id: ArchiveHeaderActionId;
  label: string;
}[] = [
  { id: 'cover', icon: 'image', label: '\uB300\uD45C \uC0AC\uC9C4 \uBCC0\uACBD' },
  { id: 'info', icon: 'settings', label: '\uC5EC\uD589 \uC815\uBCF4 \uC218\uC815' },
  { id: 'place', icon: 'map-pin', label: '\uC7A5\uC18C \uCD94\uAC00' },
  { id: 'delete', destructive: true, icon: 'trash-2', label: '\uC5EC\uD589 \uC0AD\uC81C' },
];

const LABEL_CANCEL = '\uCDE8\uC18C';
const LABEL_DELETE_TRIP_TITLE = '\uC5EC\uD589\uC744 \uC0AD\uC81C\uD560\uAE4C\uC694?';
const LABEL_DELETE_TRIP_MESSAGE =
  '\uC0AD\uC81C\uD55C \uC5EC\uD589\uC740 \uC5EC\uD589 \uB9AC\uC2A4\uD2B8\uC5D0\uC11C \uC0AC\uB77C\uC9D1\uB2C8\uB2E4.';

function getArchiveDetailTripId(tripId?: string | string[]) {
  return Array.isArray(tripId) ? tripId[0] : tripId;
}

function isEnglishLike(value: string) {
  return /^[\x00-\x7F]+$/.test(value.trim());
}

function resolveArchiveHeroTitle(trip?: MyPageTrip) {
  if (!trip) {
    return MOCK_ARCHIVE_DETAIL.heroTitle;
  }

  const candidates = [trip.titleEn, trip.title, trip.city, trip.country].filter(Boolean) as string[];
  const englishTitle = candidates.find((candidate) => isEnglishLike(candidate));

  return (englishTitle ?? 'TRAVEL').trim().toUpperCase();
}

function createArchiveDetailFromTrip(trip?: MyPageTrip): ArchiveDetailData {
  if (!trip) {
    return MOCK_ARCHIVE_DETAIL;
  }

  return {
    id: trip.id,
    city: trip.city,
    country: trip.country,
    dateRangeLabel: trip.dateRangeLabel,
    heroTitle: resolveArchiveHeroTitle(trip),
    photoFrameImage: trip.coverImage,
    selectedDay: {
      dayNumber: 1,
      dateLabel: trip.dateRangeLabel,
    },
    stats: {
      daysCount: trip.daysCount,
      photoCount: trip.photoCount,
      placeCount: 0,
    },
    places: [],
  };
}

function parseArchiveDateRangeStart(dateRangeLabel?: string) {
  const match = dateRangeLabel?.replace(/\s+/g, '').match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/);

  if (!match) {
    return undefined;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function dateKeyToArchiveDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function formatArchiveDateKeyCompact(dateKey: string, includeYear = true) {
  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
    return dateKey;
  }

  return includeYear ? `${year}.${month}.${day}` : `${month}.${day}`;
}

function formatArchiveDateRangeLabel(startDate: string, endDate: string) {
  const startYear = startDate.split('-')[0];
  const endYear = endDate.split('-')[0];

  return `${formatArchiveDateKeyCompact(startDate)}-${formatArchiveDateKeyCompact(
    endDate,
    startYear !== endYear,
  )}`;
}

function getInclusiveArchiveDays(startDate: string, endDate: string) {
  const start = dateKeyToArchiveDate(startDate);
  const end = dateKeyToArchiveDate(endDate);

  if (!start || !end) {
    return 1;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
}

function parseArchiveDateRangeKeys(dateRangeLabel?: string) {
  const normalized = dateRangeLabel?.replace(/\s+/g, '') ?? '';
  const singleDateMatch = normalized.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);

  if (singleDateMatch) {
    const dateKey = `${singleDateMatch[1]}-${String(singleDateMatch[2]).padStart(2, '0')}-${String(
      singleDateMatch[3],
    ).padStart(2, '0')}`;
    return { startDate: dateKey, endDate: dateKey };
  }

  const match = normalized.match(
    /^(\d{4})\.(\d{1,2})\.(\d{1,2})-(?:(\d{4})\.)?(\d{1,2})\.(\d{1,2})$/,
  );

  if (!match) {
    return { startDate: '', endDate: '' };
  }

  const startYear = Number(match[1]);
  const startMonth = Number(match[2]);
  const startDay = Number(match[3]);
  const endYear = Number(match[4] ?? match[1]);
  const endMonth = Number(match[5]);
  const endDay = Number(match[6]);
  const format = (year: number, month: number, day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    startDate: format(startYear, startMonth, startDay),
    endDate: format(endYear, endMonth, endDay),
  };
}

function formatArchiveDateLabelFromDate(date: Date) {
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
}

function formatArchiveDateLabelFromDateKey(dateKey: string) {
  const date = dateKeyToArchiveDate(dateKey);

  if (!date) {
    return dateKey;
  }

  return formatArchiveDateLabelFromDate(date);
}

function createArchiveDayOptionsFromTripDays(tripDays?: TripDayRow[]): DaySelectorItem[] {
  if (!tripDays || tripDays.length === 0) {
    return [];
  }

  return tripDays.map((day) => {
    const date = dateKeyToArchiveDate(day.date);

    return {
      id: day.id,
      dayNumber: day.day_index,
      dateLabel: formatArchiveDateLabelFromDateKey(day.date),
      weekdayLabel: date ? date.toLocaleDateString('en-US', { weekday: 'short' }) : '',
      photoCount: 0,
    };
  });
}

function formatArchiveStickyHeaderDate(day: DaySelectorItem) {
  const koreanWeekday =
    {
      Mon: '월',
      Tue: '화',
      Wed: '수',
      Thu: '목',
      Fri: '금',
      Sat: '토',
      Sun: '일',
      월: '월',
      화: '화',
      수: '수',
      목: '목',
      금: '금',
      토: '토',
      일: '일',
    }[day.weekdayLabel] ?? day.weekdayLabel;

  return `${day.dateLabel} ${koreanWeekday}`;
}

function createArchiveDayOptionsFromTrip(trip?: MyPageTrip): DaySelectorItem[] {
  if (!trip) {
    return ARCHIVE_DAY_OPTIONS;
  }

  const startDate = parseArchiveDateRangeStart(trip.dateRangeLabel);

  if (!startDate) {
    return ARCHIVE_DAY_OPTIONS.slice(0, Math.max(1, trip.daysCount));
  }

  return Array.from({ length: Math.max(1, trip.daysCount) }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      id: `${trip.id}-day-${index + 1}`,
      dayNumber: index + 1,
      dateLabel: formatArchiveDateLabelFromDate(date),
      weekdayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
      photoCount: Math.round(trip.photoCount / Math.max(1, trip.daysCount)),
    };
  });
}

function createArchiveDestinationOption(name: string, country: string): DestinationOption {
  const normalizedName = name.trim();
  const normalizedCountry = country.trim();
  const slug = `${normalizedName}-${normalizedCountry}`
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

  return {
    id: `archive-destination-${slug || 'unknown'}`,
    name: normalizedName,
    country: normalizedCountry,
    type: 'city',
    source: 'custom',
    displayName: normalizedName,
    countryName: normalizedCountry,
    englishDisplayName: isEnglishLike(normalizedName) ? normalizedName : undefined,
    englishCountryName: isEnglishLike(normalizedCountry) ? normalizedCountry : undefined,
  };
}

function createArchiveTripSetupValue(trip: MyPageTrip | undefined, detail: typeof MOCK_ARCHIVE_DETAIL): StartTripSetupValue {
  const dateRange = parseArchiveDateRangeKeys(trip?.dateRangeLabel ?? detail.dateRangeLabel);
  const destinationName = trip?.city ?? detail.city;
  const countryName = trip?.country ?? detail.country;

  return {
    destinationName,
    countryName,
    destinations: destinationName ? [createArchiveDestinationOption(destinationName, countryName)] : [],
    visitedCities: trip?.visitedCities ?? (destinationName ? [destinationName] : []),
    visitedCountries: trip?.visitedCountries ?? (countryName ? [countryName] : []),
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    isEndDateUndecided: false,
  };
}

function getDayOptionIndex(day: DaySelectorItem, dayOptions = ARCHIVE_DAY_OPTIONS) {
  return dayOptions.findIndex((option) => option.id === day.id);
}

function ArchiveDaySelector({
  dayOptions,
  selectedDay,
  onSelectPreviousDay,
  onSelectNextDay,
  onSwipeStart,
  onSwipeEnd,
  onOpenSheet,
}: {
  dayOptions: DaySelectorItem[];
  selectedDay: DaySelectorItem;
  onSelectPreviousDay: () => void;
  onSelectNextDay: () => void;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  onOpenSheet: () => void;
}) {
  const selectedIndex = getDayOptionIndex(selectedDay, dayOptions);
  const previousDay = selectedIndex > 0 ? dayOptions[selectedIndex - 1] : undefined;
  const nextDay =
    selectedIndex >= 0 && selectedIndex < dayOptions.length - 1
      ? dayOptions[selectedIndex + 1]
      : undefined;
  const dragX = useRef(new Animated.Value(0)).current;

  const resetDragX = React.useCallback(() => {
    Animated.spring(dragX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  }, [dragX]);

  const selectPreviousDay = React.useCallback(() => {
    if (previousDay) {
      onSelectPreviousDay();
    }
  }, [onSelectPreviousDay, previousDay]);

  const selectNextDay = React.useCallback(() => {
    if (nextDay) {
      onSelectNextDay();
    }
  }, [nextDay, onSelectNextDay]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onPanResponderGrant: () => {
          onSwipeStart?.();
        },
        onPanResponderMove: (_, gesture) => {
          const blockedDirection =
            (!previousDay && gesture.dx > 0) || (!nextDay && gesture.dx < 0);
          const resistance = blockedDirection ? 0.18 : 0.35;
          const clampedDx = Math.max(-28, Math.min(28, gesture.dx * resistance));

          dragX.setValue(clampedDx);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -32 && nextDay) {
            selectNextDay();
          } else if (gesture.dx > 32 && previousDay) {
            selectPreviousDay();
          }

          onSwipeEnd?.();
          resetDragX();
        },
        onPanResponderTerminate: () => {
          onSwipeEnd?.();
          resetDragX();
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [
      dragX,
      nextDay,
      onSwipeEnd,
      onSwipeStart,
      previousDay,
      resetDragX,
      selectNextDay,
      selectPreviousDay,
    ],
  );

  return (
    <View style={styles.daySelector} {...panResponder.panHandlers}>
      <Animated.View style={[styles.daySelectorInner, { transform: [{ translateX: dragX }] }]}>
        <Pressable
          accessibilityRole={previousDay ? 'button' : undefined}
          disabled={!previousDay}
          onPress={selectPreviousDay}
          style={[styles.adjacentDaySlot, styles.previousDaySlot]}
        >
          <Text style={[styles.adjacentDayText, !previousDay && styles.hiddenDayText]}>
            {previousDay ? `DAY ${previousDay.dayNumber}` : 'DAY'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onOpenSheet}
          style={styles.currentDaySlot}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.currentDayText}>
            DAY {selectedDay.dayNumber}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.currentDateText}>
            {formatArchiveDayLabel(selectedDay)}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole={nextDay ? 'button' : undefined}
          disabled={!nextDay}
          onPress={selectNextDay}
          style={[styles.adjacentDaySlot, styles.nextDaySlot]}
        >
          <Text style={[styles.adjacentDayText, !nextDay && styles.hiddenDayText]}>
            {nextDay ? `DAY ${nextDay.dayNumber}` : 'DAY'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ArchiveHeaderMenu({
  visible,
  onClose,
  onSelectAction,
}: {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (actionId: ArchiveHeaderActionId) => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <View style={styles.headerQuickMenu}>
          {ARCHIVE_HEADER_ACTIONS.map((action) => (
            <Pressable
              accessibilityRole="button"
              key={action.id}
              onPress={() => onSelectAction(action.id)}
              style={styles.headerQuickMenuRow}
            >
              <Feather
                name={action.icon}
                size={18}
                color={action.destructive ? '#EB524D' : Colors.foundation.grey800}
              />
              <Text
                style={[
                  styles.headerQuickMenuText,
                  action.destructive && styles.headerQuickMenuTextDestructive,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

function ArchiveEmptyState({
  actionLabel,
  description,
  onAction,
  title,
}: {
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
}) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.archiveHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.archiveHeaderIconButton}
        >
          <RNImage
            source={require('../assets/images/screenheader-back.png')}
            style={styles.archiveHeaderBackIcon}
            resizeMode="contain"
          />
        </Pressable>
        <View style={styles.archiveHeaderIconButton} />
      </View>
      <View style={styles.archiveEmptyState}>
        <Text style={styles.archiveEmptyTitle}>{title}</Text>
        <Text style={styles.archiveEmptyDescription}>{description}</Text>
        {actionLabel && onAction ? (
          <PrimaryButton label={actionLabel} onPress={onAction} style={styles.archiveEmptyAction} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export default function DayArchiveDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { dayId, dayNumber, placeId: routePlaceId, tripId } = useLocalSearchParams<{
    tripId?: string;
    dayId?: string;
    dayNumber?: string;
    placeId?: string;
  }>();
  const { width: screenWidth } = useWindowDimensions();
  const savedTrips = useSavedMyPageTrips();
  const { canUseSupabaseUserData, user } = useAuth();
  const routeTripId = getArchiveDetailTripId(tripId);
  const isSupabaseArchiveTrip = isSupabaseUuid(routeTripId);
  const shouldRejectLegacyArchiveRoute = canUseSupabaseUserData && !isSupabaseArchiveTrip;
  const supabaseRouteTripId = isSupabaseArchiveTrip ? routeTripId : undefined;
  const {
    data: supabaseTrip,
    isError: isSupabaseTripError,
    isFetched: hasFetchedSupabaseTrip,
    refetch: refetchSupabaseTrip,
  } = useTripDetail(supabaseRouteTripId);
  const {
    data: supabaseTripDays,
    isError: isSupabaseTripDaysError,
    isFetched: hasFetchedSupabaseTripDays,
    refetch: refetchSupabaseTripDays,
  } = useTripDays(supabaseRouteTripId);
  const createPlaceRecordMutation = useCreatePlaceRecord();
  const updatePlaceRecordMutation = useUpdatePlaceRecord();
  const deletePlaceRecordMutation = useDeletePlaceRecord();
  const deleteTripMutation = useDeleteTrip();
  const tripFromSaved = savedTrips.find((trip) => trip.id === routeTripId);
  const fallbackTrip = isSupabaseArchiveTrip || shouldRejectLegacyArchiveRoute
    ? undefined
    : tripFromSaved ??
      MOCK_MY_PAGE_TRIPS.find((trip) => trip.id === routeTripId) ??
      savedTrips[0];
  const [localTripPatch, setLocalTripPatch] = useState<Partial<MyPageTrip>>({});
  const [isTripInfoEditorVisible, setTripInfoEditorVisible] = useState(false);
  const activeTrip = useMemo(
    () => {
      const sourceTrip = isSupabaseArchiveTrip
        ? supabaseTrip ? mapSupabaseTripToMyPageTrip(supabaseTrip, supabaseTripDays) : undefined
        : fallbackTrip;
      return sourceTrip ? { ...sourceTrip, ...localTripPatch } : undefined;
    },
    [fallbackTrip, isSupabaseArchiveTrip, localTripPatch, supabaseTrip, supabaseTripDays],
  );
  const detail = useMemo(() => createArchiveDetailFromTrip(activeTrip), [activeTrip]);
  const supabaseDayOptions = useMemo(
    () => createArchiveDayOptionsFromTripDays(supabaseTripDays),
    [supabaseTripDays],
  );
  const baseDayOptions = useMemo(
    () =>
      isSupabaseArchiveTrip
        ? supabaseDayOptions
        : supabaseDayOptions.length > 0
        ? supabaseDayOptions
        : createArchiveDayOptionsFromTrip(activeTrip),
    [activeTrip, isSupabaseArchiveTrip, supabaseDayOptions],
  );
  const [customArchiveDays, setCustomArchiveDays] = useState<DaySelectorItem[]>([]);
  const dayOptions = useMemo(
    () =>
      [...baseDayOptions, ...customArchiveDays].sort(
        (left, right) => left.dayNumber - right.dayNumber,
      ),
    [baseDayOptions, customArchiveDays],
  );
  const tripInfoInitialValue = useMemo(
    () => createArchiveTripSetupValue(activeTrip, detail),
    [activeTrip, detail],
  );
  const [selectedDay, setSelectedDay] = useState<DaySelectorItem>(() =>
    dayOptions.find((day) => day.id === dayId) ??
    resolveInitialArchiveDay(dayId, dayNumber) ??
    dayOptions[0] ??
    resolveInitialArchiveDay(),
  );
  const [addedPlacesByDay, setAddedPlacesByDay] = useState<Record<string, ArchiveDetailPlace[]>>(
    {},
  );
  const [deletedArchivePlaceIds, setDeletedArchivePlaceIds] = useState<Set<string>>(() => new Set());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isPlaceCreateModalVisible, setPlaceCreateModalVisible] = useState(false);
  const [editingArchiveEntry, setEditingArchiveEntry] = useState<PlaceEntry | null>(null);
  const [isCoverPhotoPickerVisible, setCoverPhotoPickerVisible] = useState(false);
  const [coverPhotoPickerKey, setCoverPhotoPickerKey] = useState(0);
  const [isUpdatingTripCoverPhoto, setUpdatingTripCoverPhoto] = useState(false);
  const [isFixedHeaderVisible, setFixedHeaderVisible] = useState(false);
  const [isHeaderMenuVisible, setHeaderMenuVisible] = useState(false);
  const [isScrollEnabled, setScrollEnabled] = useState(true);
  const [isAllTripSelected, setAllTripSelected] = useState(false);
  const [selectedMapMarkerId, setSelectedMapMarkerId] = useState<string | null>(
    routePlaceId ?? null,
  );
  const scrollRef = useRef<ScrollView>(null);
  const entriesContentOffsetRef = useRef(0);
  const entryOffsetsRef = useRef(new Map<string, number>());
  const placeCreateDayOptions = useMemo(() => {
    const options = dayOptions.map(createArchiveDayOption);
    return options.length > 0 ? options : [createArchiveDayOption(selectedDay)];
  }, [dayOptions, selectedDay]);
  const selectedSupabaseTripDay = useMemo(
    () => {
      if (!isSupabaseArchiveTrip) {
        return undefined;
      }

      const selectedDateKey = parseArchiveDateLabelToDateKey(selectedDay.dateLabel);
      return supabaseTripDays?.find((day) => day.id === selectedDay.id) ??
        supabaseTripDays?.find((day) => day.day_index === selectedDay.dayNumber) ??
        supabaseTripDays?.find((day) => day.date === selectedDateKey);
    },
    [isSupabaseArchiveTrip, selectedDay.dateLabel, selectedDay.dayNumber, selectedDay.id, supabaseTripDays],
  );
  const selectedSupabaseTripDayId = useMemo(
    () =>
      isSupabaseArchiveTrip
        ? selectedSupabaseTripDay?.id ?? null
        : null,
    [isSupabaseArchiveTrip, selectedSupabaseTripDay?.id],
  );
  const selectedRouteDayId = selectedSupabaseTripDayId ?? selectedDay.id;
  const selectedRouteDayIndex = selectedSupabaseTripDay?.day_index ?? selectedDay.dayNumber;
  const selectedRouteDate = selectedSupabaseTripDay?.date ?? formatPlaceCreateDateLabel(selectedDay.dateLabel);
  const placeCreateInitialValue = useMemo(
    () =>
      editingArchiveEntry
        ? {
          ...editingArchiveEntry,
          source: editingArchiveEntry.source === 'google' ? ('google' as const) : ('manual' as const),
          dayId: editingArchiveEntry.dayId ?? editingArchiveEntry.tripDayId ?? selectedRouteDayId,
          dayNumber: editingArchiveEntry.dayNumber ?? selectedRouteDayIndex,
          dateLabel:
            editingArchiveEntry.dateLabel ?? formatPlaceCreateDateLabel(selectedDay.dateLabel),
          weekdayLabel: editingArchiveEntry.weekdayLabel ?? selectedDay.weekdayLabel,
        }
        : {
          dayId: selectedRouteDayId,
          dayNumber: selectedRouteDayIndex,
          dateLabel: formatPlaceCreateDateLabel(selectedDay.dateLabel),
          weekdayLabel: selectedDay.weekdayLabel,
          photoUris: [],
          photoSources: [],
        },
    [editingArchiveEntry, selectedDay.dateLabel, selectedDay.weekdayLabel, selectedRouteDayId, selectedRouteDayIndex],
  );
  const {
    data: supabasePlaces,
    isError: isSupabasePlacesError,
    isPending: isSupabasePlacesPending,
    isSuccess: isSupabasePlacesSuccess,
    refetch: refetchSupabasePlaces,
  } = useTripDayPlaces(isAllTripSelected ? null : selectedSupabaseTripDayId);
  const { data: supabaseRecords } = useTripDayRecords(
    isAllTripSelected ? null : selectedSupabaseTripDayId,
  );
  const {
    data: supabasePhotos,
    isError: isSupabasePhotosError,
    isPending: isSupabasePhotosPending,
    refetch: refetchSupabasePhotos,
  } = useTripDayPhotos(isAllTripSelected ? null : selectedSupabaseTripDayId);
  const {
    data: supabaseTripPlaces,
    isError: isSupabaseTripPlacesError,
    isPending: isSupabaseTripPlacesPending,
    refetch: refetchSupabaseTripPlaces,
  } = useTripPlaces(
    supabaseRouteTripId,
    isCoverPhotoPickerVisible || isAllTripSelected,
  );
  const { data: supabaseTripRecords } = useTripRecords(
    supabaseRouteTripId,
    isAllTripSelected,
  );
  const { data: supabaseTripPhotos } = useResolvedTripPhotos(
    supabaseRouteTripId,
    isCoverPhotoPickerVisible || isAllTripSelected,
  );
  const visibleArchivePlaces = useMemo(
    () =>
      [...detail.places, ...(addedPlacesByDay[selectedDay.id] ?? [])].filter(
        (place) => !deletedArchivePlaceIds.has(place.id) && !isPlaceDetailDeleted(place.id),
      ),
    [addedPlacesByDay, deletedArchivePlaceIds, detail.places, selectedDay.id],
  );
  const fallbackEntries = useMemo(
    () => toPlaceEntries(visibleArchivePlaces),
    [visibleArchivePlaces],
  );
  const supabaseMapData = useMemo(() => buildTripMapData(
    (isAllTripSelected ? (supabaseTripPlaces ?? []) : (supabasePlaces ?? []))
      .filter((place) => !deletedArchivePlaceIds.has(place.id) && !isPlaceDetailDeleted(place.id)),
    supabaseTripDays ?? [],
    isAllTripSelected
      ? { type: 'all' }
      : { type: 'day', tripDayId: selectedSupabaseTripDayId ?? selectedDay.id },
  ), [
    isAllTripSelected,
    deletedArchivePlaceIds,
    selectedDay.id,
    selectedSupabaseTripDayId,
    supabasePlaces,
    supabaseTripDays,
    supabaseTripPlaces,
  ]);
  const supabaseEntries = useMemo(
    () => mapSupabasePlacesToPlaceEntries(
      supabaseMapData.orderedPlaces,
      isAllTripSelected ? (supabaseTripRecords ?? []) : (supabaseRecords ?? []),
      detail.country,
      isAllTripSelected ? (supabaseTripPhotos ?? []) : (supabasePhotos ?? []),
    ),
    [
      detail.country,
      isAllTripSelected,
      supabaseMapData.orderedPlaces,
      supabasePhotos,
      supabaseRecords,
      supabaseTripPhotos,
      supabaseTripRecords,
    ],
  );
  const entries = (
    isSupabaseArchiveTrip
      ? supabaseEntries
      : supabaseEntries.length > 0
        ? supabaseEntries
        : fallbackEntries
  ).filter((entry) => !deletedArchivePlaceIds.has(getEntryPlaceId(entry)));
  const fallbackMapData = useMemo(
    () => buildTripMapData(
      fallbackEntries,
      dayOptions.map((day) => ({ id: day.id, dayIndex: day.dayNumber })),
      { type: 'all' },
    ),
    [dayOptions, fallbackEntries],
  );
  const displayedMapData = isSupabaseArchiveTrip ? supabaseMapData : fallbackMapData;
  const displayedEntries = isSupabaseArchiveTrip ? entries : fallbackMapData.orderedPlaces;
  const failedSupabasePhotoCount = (supabasePhotos ?? []).filter(
    (photo) => photo.displayUrlStatus === 'failed',
  ).length;
  const missingSupabasePhotoCount = (supabasePhotos ?? []).filter(
    (photo) => photo.displayUrlStatus === 'missing',
  ).length;
  const isSupabaseDayEmpty =
    isSupabaseArchiveTrip &&
    !isAllTripSelected &&
    Boolean(selectedSupabaseTripDayId) &&
    isSupabasePlacesSuccess &&
    (supabasePlaces?.length ?? 0) === 0;

  const coverPhotoOptions = useMemo(() => {
    if (!isSupabaseArchiveTrip) {
      return createArchiveCoverPhotoOptions(visibleArchivePlaces);
    }

    const activeTripDaysById = new Map(
      (supabaseTripDays ?? []).map((day) => [day.id, day]),
    );
    const activePlacesById = new Map(
      (supabaseTripPlaces ?? []).map((place) => [place.id, place]),
    );

    return (supabaseTripPhotos ?? [])
      .filter(
        (photo) =>
          photo.deleted_at === null &&
          photo.displayUrlStatus === 'ready' &&
          Boolean(photo.displayUrl) &&
          Boolean(photo.trip_day_id && activeTripDaysById.has(photo.trip_day_id)) &&
          Boolean(photo.place_id && activePlacesById.has(photo.place_id)),
      )
      .sort((left, right) => {
        const leftDay = left.trip_day_id
          ? activeTripDaysById.get(left.trip_day_id)
          : undefined;
        const rightDay = right.trip_day_id
          ? activeTripDaysById.get(right.trip_day_id)
          : undefined;
        const dayComparison =
          (leftDay?.date ?? '').localeCompare(rightDay?.date ?? '') ||
          (leftDay?.day_index ?? 0) - (rightDay?.day_index ?? 0);

        if (dayComparison !== 0) {
          return dayComparison;
        }

        const leftPlace = left.place_id ? activePlacesById.get(left.place_id) : undefined;
        const rightPlace = right.place_id ? activePlacesById.get(right.place_id) : undefined;
        const placeComparison =
          (leftPlace?.visited_at ?? leftPlace?.created_at ?? '').localeCompare(
            rightPlace?.visited_at ?? rightPlace?.created_at ?? '',
          ) || (leftPlace?.id ?? '').localeCompare(rightPlace?.id ?? '');

        if (placeComparison !== 0) {
          return placeComparison;
        }

        return (
          (left.taken_at ?? left.created_at).localeCompare(
            right.taken_at ?? right.created_at,
          ) || left.id.localeCompare(right.id)
        );
      })
      .map((photo) => ({
        id: photo.id,
        photoId: photo.id,
        placeName: photo.place_id
          ? activePlacesById.get(photo.place_id)?.name ?? ''
          : '',
        source: { uri: photo.displayUrl as string },
      }));
  }, [
    isSupabaseArchiveTrip,
    supabaseTripDays,
    supabaseTripPhotos,
    supabaseTripPlaces,
    visibleArchivePlaces,
  ]);
  const supabaseTripCoverImage = useMemo(
    () => supabaseTrip?.cover_display_url
      ? { uri: supabaseTrip.cover_display_url }
      : undefined,
    [supabaseTrip?.cover_display_url],
  );
  const displayedPhotoFrameImage = isSupabaseArchiveTrip
    ? supabaseTripCoverImage
    : detail.photoFrameImage;
  const currentCoverUri = useMemo(
    () => resolveImageUri(displayedPhotoFrameImage),
    [displayedPhotoFrameImage],
  );

  const photoFrameLeft = (screenWidth - PHOTO_FRAME_WIDTH) / 2;

  React.useEffect(() => {
    if (dayOptions.length === 0) {
      return;
    }

    setSelectedDay((current) => {
      if (dayOptions.some((day) => day.id === current.id)) {
        return current;
      }

      const parsedDayNumber = dayNumber ? Number(dayNumber) : resolveDayNumberFromId(dayId);
      const nextDay =
        dayOptions.find((day) => day.id === dayId) ??
        dayOptions.find((day) => day.dayNumber === parsedDayNumber) ??
        dayOptions[0];

      return nextDay ?? current;
    });
  }, [dayId, dayNumber, dayOptions]);

  const triggerSelectionHaptic = React.useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const handleSelectArchiveDay = React.useCallback(
    (day: DaySelectorItem) => {
      if (day.id === selectedDay.id) {
        return;
      }

      setSelectedDay(day);
      setAllTripSelected(false);
      setSelectedMapMarkerId(null);
      triggerSelectionHaptic();
    },
    [selectedDay.id, triggerSelectionHaptic],
  );

  const handleSelectPreviousDay = React.useCallback(() => {
    const selectedIndex = getDayOptionIndex(selectedDay, dayOptions);
    const previousDay = selectedIndex > 0 ? dayOptions[selectedIndex - 1] : undefined;

    if (!previousDay) {
      return;
    }

    handleSelectArchiveDay(previousDay);
  }, [dayOptions, handleSelectArchiveDay, selectedDay]);

  const handleSelectNextDay = React.useCallback(() => {
    const selectedIndex = getDayOptionIndex(selectedDay, dayOptions);
    const nextDay =
      selectedIndex >= 0 && selectedIndex < dayOptions.length - 1
        ? dayOptions[selectedIndex + 1]
        : undefined;

    if (!nextDay) {
      return;
    }

    handleSelectArchiveDay(nextDay);
  }, [dayOptions, handleSelectArchiveDay, selectedDay]);

  const handleArchiveSwipeStart = React.useCallback(() => {
    setScrollEnabled(false);
  }, []);

  const handleArchiveSwipeEnd = React.useCallback(() => {
    setScrollEnabled(true);
  }, []);

  const handleOpenPlaceDetail = (entry: PlaceEntry) => {
    const entryTripDayId = entry.tripDayId ?? selectedSupabaseTripDayId ?? undefined;
    const entryTripDay = supabaseTripDays?.find((day) => day.id === entryTripDayId);

    router.push({
      pathname: '/place-detail',
      params: {
        tripId: detail.id,
        dayId: entryTripDayId ?? selectedRouteDayId,
        tripDayId: entryTripDayId,
        dayIndex: String(entryTripDay?.day_index ?? entry.dayNumber ?? selectedRouteDayIndex),
        date: entryTripDay?.date ?? entry.dateKey ?? selectedRouteDate,
        placeId: getEntryPlaceId(entry),
        entryPoint: 'archiveDayDetail',
        placeName: entry.placeName ?? entry.place,
        cityName: entry.cityName ?? entry.city,
        countryName: entry.countryName,
        categoryLabel: entry.category,
        dateLabel: formatArchiveDayLabel(selectedDay),
        timeLabel: entry.time,
        recordText: entry.text,
      },
    });
  };

  const handleMapMarkerPress = (marker: TripMapMarker) => {
    setSelectedMapMarkerId(marker.id);
    const entryOffset = entryOffsetsRef.current.get(marker.placeId);

    if (entryOffset == null) {
      return;
    }

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(0, entriesContentOffsetRef.current + entryOffset - Spacing.xl),
      });
    });
  };

  const handleOpenPlacePhotoGrid = (entry: PlaceEntry) => {
    router.push({
      pathname: '/place-detail',
      params: {
        tripId: detail.id,
        dayId: selectedRouteDayId,
        tripDayId: selectedSupabaseTripDayId ?? undefined,
        dayIndex: String(selectedRouteDayIndex),
        date: selectedRouteDate,
        placeId: getEntryPlaceId(entry),
        entryPoint: 'archiveDayDetail',
        openPhotoGrid: '1',
        photoGridMode: 'viewOnly',
        placeName: entry.placeName ?? entry.place,
        cityName: entry.cityName ?? entry.city,
        countryName: entry.countryName,
        categoryLabel: entry.category,
        dateLabel: formatArchiveDayLabel(selectedDay),
        timeLabel: entry.time,
        recordText: entry.text,
      },
    });
  };

  const closePlaceCreateModal = React.useCallback(() => {
    setPlaceCreateModalVisible(false);
    setEditingArchiveEntry(null);
  }, []);

  const handleDeleteArchiveEntry = React.useCallback((entry: PlaceEntry) => {
    const targetPlaceId = getEntryPlaceId(entry);

    Alert.alert(
      '\uC774 \uC7A5\uC18C \uAE30\uB85D\uC744 \uC0AD\uC81C\uD560\uAE4C\uC694?',
      '\uC0AD\uC81C\uD558\uBA74 \uC774 \uC7A5\uC18C\uC758 \uC0AC\uC9C4, \uAE30\uB85D, \uC0C1\uC138 \uD398\uC774\uC9C0 \uC5F0\uACB0\uB3C4 \uD568\uAED8 \uC815\uB9AC\uB3FC\uC694.',
      [
        { text: LABEL_CANCEL, style: 'cancel' },
        {
          text: '\uC0AD\uC81C',
          style: 'destructive',
          onPress: () => {
            if (
              entry.dataSource === 'supabase' &&
              entry.placeId &&
              entry.tripDayId &&
              entry.tripId
            ) {
              void deletePlaceRecordMutation.mutateAsync({
                placeId: entry.placeId,
                tripDayId: entry.tripDayId,
                tripId: entry.tripId,
              }).then(() => {
                markPlaceDetailDeleted(targetPlaceId);
                setDeletedArchivePlaceIds((current) => {
                  const next = new Set(current);
                  next.add(targetPlaceId);
                  return next;
                });
              }).catch((error) => {
                console.warn('[day-archive-detail] delete place record failed', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                Alert.alert(
                  '\uC7A5\uC18C\uB97C \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
                  `\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.\n\uAC1C\uBC1C \uC815\uBCF4: ${errorMessage}`,
                );
              });
              return;
            }

            markPlaceDetailDeleted(targetPlaceId);
            setDeletedArchivePlaceIds((current) => {
              const next = new Set(current);
              next.add(targetPlaceId);
              return next;
            });
            setAddedPlacesByDay((current) => {
              const nextPlacesByDay: Record<string, ArchiveDetailPlace[]> = {};

              for (const [dayId, places] of Object.entries(current)) {
                nextPlacesByDay[dayId] = places.filter((place) => place.id !== targetPlaceId);
              }

              return nextPlacesByDay;
            });
          },
        },
      ],
    );
  }, [deletePlaceRecordMutation]);

  const updateArchiveTrip = React.useCallback(
    (patch: Partial<MyPageTrip>) => {
      setLocalTripPatch((current) => ({ ...current, ...patch }));

      if (tripFromSaved) {
        updateSavedMyPageTrip(tripFromSaved.id, patch);
      }
    },
    [tripFromSaved],
  );

  const closeCoverPhotoPicker = React.useCallback(() => {
    setCoverPhotoPickerVisible(false);
  }, []);

  const openCoverPhotoPicker = React.useCallback(() => {
    setCoverPhotoPickerKey((current) => current + 1);
    setCoverPhotoPickerVisible(true);
  }, []);

  const handleSelectCoverPhoto = React.useCallback(
    async (option: ArchiveCoverPhotoOption) => {
      if (!isSupabaseArchiveTrip) {
        updateArchiveTrip({ coverImage: option.source });
        closeCoverPhotoPicker();
        return;
      }

      if (!routeTripId || !option.photoId || isUpdatingTripCoverPhoto) {
        return;
      }

      setUpdatingTripCoverPhoto(true);

      try {
        const result = await setTripCoverPhoto(
          routeTripId,
          option.photoId,
        );
        const coverDisplayUrl = resolveImageUri(option.source) ?? null;
        const updateTripCover = (trip: TripRow): TripRow =>
          trip.id === result.tripId
            ? {
              ...trip,
              book_cover_display_url: coverDisplayUrl,
              book_cover_photo_id: result.coverPhotoId,
              cover_display_url: coverDisplayUrl,
              cover_photo_id: result.coverPhotoId,
            }
            : trip;

        queryClient.setQueryData<TripRow>(
          supabaseQueryKeys.tripDetail(user?.id, routeTripId),
          (current) => current ? updateTripCover(current) : current,
        );
        queryClient.setQueryData<TripRow[]>(
          supabaseQueryKeys.myTrips(user?.id),
          (current) => current?.map(updateTripCover),
        );
        queryClient.setQueriesData<TripRow[]>(
          { queryKey: supabaseQueryKeys.recentTripsRoot(user?.id) },
          (current) => current?.map(updateTripCover),
        );
        closeCoverPhotoPicker();

        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.tripDetail(user?.id, routeTripId),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.myTrips(user?.id),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.recentTripsRoot(user?.id),
          }),
          queryClient.invalidateQueries({
            queryKey: supabaseQueryKeys.archivedTravelMoments(user?.id),
          }),
        ]).catch((error: unknown) => {
          console.warn('[day-archive-detail] invalidate after cover update failed', error);
        });
      } catch (error) {
        console.warn('[day-archive-detail] update cover photo failed', error);
        Alert.alert('대표사진을 변경하지 못했어요', '잠시 후 다시 시도해주세요.');
      } finally {
        setUpdatingTripCoverPhoto(false);
      }
    },
    [
      closeCoverPhotoPicker,
      isSupabaseArchiveTrip,
      isUpdatingTripCoverPhoto,
      queryClient,
      routeTripId,
      updateArchiveTrip,
      user?.id,
    ],
  );

  const handleSaveTripInfo = React.useCallback(
    (value: StartTripSetupValue) => {
      const destinationName = value.destinationName.trim();
      const countryName = value.countryName.trim();
      const nextDateRangeLabel = formatArchiveDateRangeLabel(value.startDate, value.endDate);

      // TODO: Persist edited archive trip info to Supabase when backend sync is connected.
      updateArchiveTrip({
        city: destinationName,
        country: countryName,
        dateRangeLabel: nextDateRangeLabel,
        daysCount: getInclusiveArchiveDays(value.startDate, value.endDate),
        visitedCities: value.visitedCities ?? [],
        visitedCountries: value.visitedCountries ?? [],
      });
      setTripInfoEditorVisible(false);
    },
    [updateArchiveTrip],
  );

  const handleCreateArchivePlace = React.useCallback(
    async (value: PlaceCreateInput) => {
      const targetDayId = value.dayId ?? selectedDay.id;
      const targetSupabaseTripDayId = supabaseDayOptions.some((day) => day.id === targetDayId)
        ? targetDayId
        : null;

      if (
        editingArchiveEntry?.dataSource === 'supabase' &&
        editingArchiveEntry.placeId &&
        routeTripId &&
        targetSupabaseTripDayId
      ) {
        try {
          await updatePlaceRecordMutation.mutateAsync({
            ...value,
            placeId: editingArchiveEntry.placeId,
            recordId: editingArchiveEntry.recordId,
            tripDayId: targetSupabaseTripDayId,
            tripId: routeTripId,
          });
          closePlaceCreateModal();
        } catch (error) {
          console.warn('[day-archive-detail] update place record failed', error);
          Alert.alert(
            '\uC7A5\uC18C\uB97C \uC218\uC815\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
            '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
          );
        }
        return;
      }

      if (canUseSupabaseUserData && routeTripId && targetSupabaseTripDayId) {
        try {
          await createPlaceRecordMutation.mutateAsync({
            ...value,
            tripDayId: targetSupabaseTripDayId,
            tripId: routeTripId,
          });
          closePlaceCreateModal();
        } catch (error) {
          console.warn('[day-archive-detail] create place record failed', error);
          Alert.alert(
            '\uC7A5\uC18C\uB97C \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
            '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
          );
        }
        return;
      }

      const nextPlace = createArchivePlaceEntry(value);
      const nextDay = createDaySelectorItemFromPlaceDay(value);

      if (nextDay && !dayOptions.some((day) => day.id === nextDay.id)) {
        setCustomArchiveDays((current) =>
          current.some((day) => day.id === nextDay.id) ? current : [...current, nextDay],
        );
      }

      // TODO: Persist newly created archive places to Supabase when archive editing sync is connected.
      setAddedPlacesByDay((current) => ({
        ...current,
        [targetDayId]: editingArchiveEntry
          ? [
            ...(current[targetDayId] ?? []).filter(
              (place) => place.id !== editingArchiveEntry.id,
            ),
            { ...nextPlace, id: editingArchiveEntry.id },
          ]
          : [...(current[targetDayId] ?? []), nextPlace],
      }));
      closePlaceCreateModal();
    },
    [
      canUseSupabaseUserData,
      closePlaceCreateModal,
      createPlaceRecordMutation,
      dayOptions,
      editingArchiveEntry,
      routeTripId,
      selectedDay.id,
      supabaseDayOptions,
      updatePlaceRecordMutation,
    ],
  );

  const handleDeleteTrip = React.useCallback(() => {
    if (deleteTripMutation.isPending) {
      return;
    }

    Alert.alert(LABEL_DELETE_TRIP_TITLE, LABEL_DELETE_TRIP_MESSAGE, [
      { style: 'cancel', text: LABEL_CANCEL },
      {
        style: 'destructive',
        text: '\uC0AD\uC81C',
        onPress: () => {
          void (async () => {
            try {
              if (isSupabaseArchiveTrip && routeTripId) {
                await deleteTripMutation.mutateAsync(routeTripId);
              } else if (activeTrip) {
                removeSavedMyPageTrip(activeTrip.id);
              }

              router.back();
            } catch (error) {
              console.warn('[day-archive-detail] delete trip failed', error);
              Alert.alert(
                '\uC5EC\uD589\uC744 \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694',
                '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
              );
            }
          })();
        },
      },
    ]);
  }, [activeTrip, deleteTripMutation, isSupabaseArchiveTrip, routeTripId, router]);

  const showArchiveQuickAction = (label: string) => {
    Alert.alert(label, '\uC774 \uAE30\uB2A5\uC740 \uC5EC\uD589 \uD3B8\uC9D1 \uD50C\uB85C\uC6B0\uB85C \uC5F0\uACB0\uB420 \uC608\uC815\uC785\uB2C8\uB2E4.');
  };

  const openPlaceCreateModal = React.useCallback(() => {
    if (isSupabaseArchiveTrip && !selectedSupabaseTripDayId) {
      return;
    }

    setEditingArchiveEntry(null);
    setPlaceCreateModalVisible(true);
  }, [isSupabaseArchiveTrip, selectedSupabaseTripDayId]);

  const handleSelectHeaderAction = (actionId: ArchiveHeaderActionId) => {
    setHeaderMenuVisible(false);

    if (actionId === 'cover') {
      openCoverPhotoPicker();
      return;
    }

    if (actionId === 'delete') {
      handleDeleteTrip();
      return;
    }

    if (actionId === 'info') {
      if (isSupabaseArchiveTrip) {
        showArchiveQuickAction('\uC5EC\uD589 \uC815\uBCF4 \uC218\uC815');
        return;
      }

      setTripInfoEditorVisible(true);
      return;
    }

    if (actionId === 'place') {
      openPlaceCreateModal();
      return;
    }

    const action = ARCHIVE_HEADER_ACTIONS.find((item) => item.id === actionId);
    showArchiveQuickAction(action?.label ?? '');
  };

  if (shouldRejectLegacyArchiveRoute) {
    return (
      <ArchiveEmptyState
        title={'\uC5EC\uD589\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694'}
        description={'\uC774\uC804 \uD654\uBA74\uC73C\uB85C \uB3CC\uC544\uAC00 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'}
      />
    );
  }

  if (isSupabaseArchiveTrip && !canUseSupabaseUserData) {
    return (
      <ArchiveEmptyState
        title={'\uC5EC\uD589\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694'}
        description={'\uB85C\uADF8\uC778 \uD6C4 \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.'}
      />
    );
  }

  if (
    isSupabaseArchiveTrip &&
    (!hasFetchedSupabaseTrip || !hasFetchedSupabaseTripDays) &&
    !isSupabaseTripError &&
    !isSupabaseTripDaysError
  ) {
    return (
      <ArchiveEmptyState
        title={'\uC5EC\uD589\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC774\uC5D0\uC694'}
        description={'\uC800\uC7A5\uB41C \uC5EC\uD589 \uB370\uC774\uD130\uB97C \uD655\uC778\uD558\uACE0 \uC788\uC5B4\uC694.'}
      />
    );
  }

  if (
    isSupabaseArchiveTrip &&
    (isSupabaseTripError || isSupabaseTripDaysError)
  ) {
    return (
      <ArchiveEmptyState
        actionLabel={'\uB2E4\uC2DC \uC2DC\uB3C4'}
        title={'\uC5EC\uD589\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694'}
        description={'\uB124\uD2B8\uC6CC\uD06C \uC0C1\uD0DC\uB97C \uD655\uC778\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'}
        onAction={() => {
          void Promise.all([refetchSupabaseTrip(), refetchSupabaseTripDays()]);
        }}
      />
    );
  }

  if (
    isSupabaseArchiveTrip &&
    (!supabaseTrip || !isUserSavedTripStatus(supabaseTrip.status))
  ) {
    return (
      <ArchiveEmptyState
        title={'\uC5EC\uD589\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694'}
        description={'\uC774\uC804 \uD654\uBA74\uC73C\uB85C \uB3CC\uC544\uAC00 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'}
      />
    );
  }

  if (isSupabaseArchiveTrip && dayOptions.length === 0) {
    return (
      <ArchiveEmptyState
        title={'\uC5EC\uD589 \uB0A0\uC9DC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694'}
        description={'\uC774\uC804 \uD654\uBA74\uC73C\uB85C \uB3CC\uC544\uAC00 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.archiveHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.archiveHeaderIconButton}
        >
          <RNImage
            source={require('../assets/images/screenheader-back.png')}
            style={styles.archiveHeaderBackIcon}
            resizeMode="contain"
          />
        </Pressable>

        {isFixedHeaderVisible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select date"
            hitSlop={10}
            onPress={() => setSheetVisible(true)}
            style={styles.archiveHeaderDateButton}
          >
            <View style={styles.archiveHeaderDateIconSpacer} />
            <Text numberOfLines={1} style={styles.archiveHeaderDateText}>
              {formatArchiveStickyHeaderDate(selectedDay)}
            </Text>
            <Image
              source={require('../assets/images/daycard-triangle.png')}
              style={styles.archiveHeaderDateIcon}
              contentFit="contain"
            />
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Archive menu"
          hitSlop={10}
          onPress={() => setHeaderMenuVisible(true)}
          style={styles.archiveHeaderIconButton}
        >
          <Feather name="more-horizontal" size={24} color={Colors.foundation.grey800} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        onScroll={(event) => {
          const nextVisible = event.nativeEvent.contentOffset.y > STICKY_HEADER_SCROLL_Y;

          setFixedHeaderVisible((current) => (current === nextVisible ? current : nextVisible));
        }}
        scrollEnabled={isScrollEnabled}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroArea}>
          <ArchiveBlurBackground
            source={displayedPhotoFrameImage}
            width={screenWidth}
            height={BLUR_HEIGHT}
          />

          <View
            style={[
              styles.photoFrame,
              { left: photoFrameLeft, top: PHOTO_FRAME_TOP },
            ]}
          >
            <Text style={styles.frameDate}>{detail.dateRangeLabel}</Text>
            {displayedPhotoFrameImage ? (
              <Image
                source={displayedPhotoFrameImage}
                style={styles.frameImage}
                contentFit="cover"
                contentPosition="center"
              />
            ) : (
              <View style={[styles.frameImage, styles.frameImageFallback]} />
            )}
          </View>

          <View
            style={[
              styles.parisTitleWrap,
              {
                left: 20,
                top: PHOTO_FRAME_TOP - 112 + 32,
                width: screenWidth - 40,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={styles.parisTitle}
            >
              {detail.heroTitle}
            </Text>
          </View>
        </View>

        <ArchiveDaySelector
          dayOptions={dayOptions}
          selectedDay={selectedDay}
          onSelectPreviousDay={handleSelectPreviousDay}
          onSelectNextDay={handleSelectNextDay}
          onSwipeStart={handleArchiveSwipeStart}
          onSwipeEnd={handleArchiveSwipeEnd}
          onOpenSheet={() => setSheetVisible(true)}
        />

        <View style={styles.recordSection}>
          <View style={styles.mapScopeRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAllTripSelected(true);
                setSelectedMapMarkerId(null);
              }}
              style={[styles.mapScopeButton, isAllTripSelected && styles.mapScopeButtonSelected]}
            >
              <Text style={[styles.mapScopeText, isAllTripSelected && styles.mapScopeTextSelected]}>
                전체 여행
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAllTripSelected(false)}
              style={[styles.mapScopeButton, !isAllTripSelected && styles.mapScopeButtonSelected]}
            >
              <Text style={[styles.mapScopeText, !isAllTripSelected && styles.mapScopeTextSelected]}>
                선택 일차
              </Text>
            </Pressable>
          </View>
          <TripPlacesMap
            distanceKm={getCumulativePlaceDistanceKm(displayedMapData.orderedPlaces)}
            excludedCoordinateCount={displayedMapData.excludedCoordinateCount}
            isError={isSupabaseArchiveTrip && (
              isAllTripSelected ? isSupabaseTripPlacesError : isSupabasePlacesError
            )}
            isLoading={isSupabaseArchiveTrip && (
              isAllTripSelected ? isSupabaseTripPlacesPending : isSupabasePlacesPending
            )}
            markers={displayedMapData.markers}
            onMarkerPress={handleMapMarkerPress}
            onRetry={() => {
              if (isAllTripSelected) {
                void refetchSupabaseTripPlaces();
              } else {
                void refetchSupabasePlaces();
              }
            }}
            selectedMarkerId={selectedMapMarkerId}
            style={styles.archiveMapCard}
          />

          <View
            onLayout={(event) => {
              entriesContentOffsetRef.current = event.nativeEvent.layout.y;
            }}
            style={styles.entries}
          >
            {failedSupabasePhotoCount > 0 ? (
              <View style={styles.dayEmptyState}>
                <Text style={styles.dayEmptyTitle}>{'\uC77C\uBD80 \uC0AC\uC9C4\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694'}</Text>
                <Text style={styles.dayEmptyDescription}>
                  {'\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.'}
                </Text>
                <View style={styles.emptyStateButtonWrapper}>
                  <PrimaryButton
                    label={'\uB2E4\uC2DC \uC2DC\uB3C4'}
                    onPress={() => {
                      void refetchSupabasePhotos();
                    }}
                    style={styles.emptyStateAddButton}
                    textStyle={styles.emptyStateAddButtonText}
                  />
                </View>
              </View>
            ) : missingSupabasePhotoCount > 0 ? (
              <View style={styles.dayEmptyState}>
                <Text style={styles.dayEmptyTitle}>{'\uD45C\uC2DC\uD560 \uC218 \uC5C6\uB294 \uC0AC\uC9C4\uC774 \uC788\uC5B4\uC694'}</Text>
                <Text style={styles.dayEmptyDescription}>
                  {'\uC0AC\uC9C4 \uC800\uC7A5 \uC815\uBCF4\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.'}
                </Text>
              </View>
            ) : null}
            {isSupabaseArchiveTrip && !isAllTripSelected && Boolean(selectedSupabaseTripDayId) && isSupabasePhotosPending ? (
              <View style={styles.dayEmptyState}>
                <Text style={styles.dayEmptyTitle}>{'\uC0AC\uC9C4\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC774\uC5D0\uC694'}</Text>
                <Text style={styles.dayEmptyDescription}>
                  {'\uC800\uC7A5\uB41C \uC0AC\uC9C4\uC744 \uD655\uC778\uD558\uACE0 \uC788\uC5B4\uC694.'}
                </Text>
              </View>
            ) : !isAllTripSelected && isSupabasePhotosError ? (
              <View style={styles.dayEmptyState}>
                <Text style={styles.dayEmptyTitle}>{'\uC0AC\uC9C4\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694'}</Text>
                <Text style={styles.dayEmptyDescription}>
                  {'\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.'}
                </Text>
                <View style={styles.emptyStateButtonWrapper}>
                  <PrimaryButton
                    label={'\uB2E4\uC2DC \uC2DC\uB3C4'}
                    onPress={() => {
                      void refetchSupabasePhotos();
                    }}
                    style={styles.emptyStateAddButton}
                    textStyle={styles.emptyStateAddButtonText}
                  />
                </View>
              </View>
            ) : (isAllTripSelected ? isSupabaseTripPlacesError : isSupabasePlacesError) ? (
              <View style={styles.dayEmptyState}>
                <Text style={styles.dayEmptyTitle}>{'\uC7A5\uC18C\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694'}</Text>
                <Text style={styles.dayEmptyDescription}>
                  {'\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.'}
                </Text>
              </View>
            ) : isSupabaseDayEmpty ? (
              <View style={styles.dayEmptyState}>
                <Text style={styles.dayEmptyTitle}>{'\uC774 \uB0A0\uC9DC\uC5D0\uB294 \uC544\uC9C1 \uAE30\uB85D\uB41C \uC7A5\uC18C\uAC00 \uC5C6\uC5B4\uC694'}</Text>
                <Text style={styles.dayEmptyDescription}>
                  {'\uC7A5\uC18C\uB97C \uCD94\uAC00\uD574 \uC5EC\uD589 \uAE30\uB85D\uC744 \uC2DC\uC791\uD574 \uBCF4\uC138\uC694.'}
                </Text>
                <View style={styles.emptyStateButtonWrapper}>
                  <PrimaryButton
                    label={'\uC7A5\uC18C \uCD94\uAC00'}
                    onPress={openPlaceCreateModal}
                    style={styles.emptyStateAddButton}
                    textStyle={styles.emptyStateAddButtonText}
                  />
                </View>
              </View>
            ) : (
              displayedEntries.map((entry) => (
                <View
                  key={entry.id}
                  onLayout={(event) => {
                    entryOffsetsRef.current.set(getEntryPlaceId(entry), event.nativeEvent.layout.y);
                  }}
                >
                  <PlaceEntryCard
                    entry={entry}
                    flagScreen={isSupabaseArchiveTrip ? 'saved_day_archive_detail' : undefined}
                    showRating={false}
                    variant="archive"
                    onLongPress={() => handleDeleteArchiveEntry(entry)}
                    onPress={() => {
                      setSelectedMapMarkerId(getEntryPlaceId(entry));
                      handleOpenPlaceDetail(entry);
                    }}
                    onPhotoGridOpen={() => handleOpenPlacePhotoGrid(entry)}
                  />
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <DaySelectorSheet
        visible={sheetVisible}
        title="?좎쭨 ?좏깮"
        days={dayOptions}
        selectedId={selectedDay.id}
        showPhotoCount
        showTodayChip={false}
        onSelectDay={(day) => {
          handleSelectArchiveDay(day);
          setSheetVisible(false);
        }}
        onClose={() => setSheetVisible(false)}
      />
      <StartTripSetupModal
        visible={isTripInfoEditorVisible}
        mode="edit"
        initialValue={tripInfoInitialValue}
        onCancel={() => setTripInfoEditorVisible(false)}
        onStart={handleSaveTripInfo}
      />
      <PlaceCreateModal
        visible={isPlaceCreateModalVisible}
        mode={editingArchiveEntry ? 'edit' : 'create'}
        initialValue={placeCreateInitialValue}
        dayOptions={placeCreateDayOptions}
        selectedDayId={selectedRouteDayId}
        tripId={detail.id}
        dayId={selectedRouteDayId}
        tripDestinationName={detail.city}
        tripDestinationCountry={detail.country}
        onClose={closePlaceCreateModal}
        onSubmit={handleCreateArchivePlace}
      />
      <ArchiveHeaderMenu
        visible={isHeaderMenuVisible}
        onClose={() => setHeaderMenuVisible(false)}
        onSelectAction={handleSelectHeaderAction}
      />
      <Modal
        key={`cover-photo-picker-${coverPhotoPickerKey}`}
        animationType="fade"
        transparent
        visible={isCoverPhotoPickerVisible}
        onRequestClose={closeCoverPhotoPicker}
      >
        <Pressable style={styles.coverPickerOverlay} onPress={closeCoverPhotoPicker}>
          <Pressable style={styles.coverPickerCard}>
            <View style={styles.coverPickerHeader}>
              <Text style={styles.coverPickerTitle}>대표사진 선택</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="대표사진 선택 닫기"
                hitSlop={8}
                onPress={closeCoverPhotoPicker}
                style={styles.coverPickerCloseButton}
              >
                <Feather name="x" size={20} color={Colors.foundation.black} />
              </Pressable>
            </View>

            {coverPhotoOptions.length > 0 ? (
              <ScrollView
                contentContainerStyle={styles.coverPickerGrid}
                showsVerticalScrollIndicator={false}
              >
                {coverPhotoOptions.map((photo) => {
                  const selected = resolveImageUri(photo.source) === currentCoverUri;

                  return (
                    <Pressable
                      key={photo.id}
                      accessibilityRole="button"
                      disabled={isUpdatingTripCoverPhoto}
                      onPress={() => {
                        void handleSelectCoverPhoto(photo);
                      }}
                      style={styles.coverPickerPhoto}
                    >
                      <Image
                        source={photo.source}
                        style={styles.coverPickerImage}
                        contentFit="cover"
                      />
                      {selected ? (
                        <View style={styles.coverPickerSelectedBadge}>
                          <Feather name="check" size={14} color={Colors.foundation.white} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.coverPickerEmpty}>
                <Text style={styles.coverPickerEmptyTitle}>선택할 사진이 없어요.</Text>
                <Text style={styles.coverPickerEmptyDescription}>
                  이 여행에 사진을 추가한 뒤 대표사진을 변경할 수 있어요.
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.warm.white,
  },
  archiveHeader: {
    width: '100%',
    height: 40,
    paddingLeft: 12,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.warm.white,
  },
  archiveHeaderIconButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveHeaderBackIcon: {
    width: 24,
    height: 24,
  },
  archiveHeaderDateButton: {
    position: 'absolute',
    top: 9,
    left: 64,
    right: 64,
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  archiveHeaderDateText: {
    ...Typography.body1Regular,
    color: Colors.foundation.black,
    flexShrink: 1,
    textAlign: 'center',
  },
  archiveHeaderDateIconSpacer: {
    width: 10,
    height: 10,
  },
  archiveHeaderDateIcon: {
    width: 10,
    height: 10,
    tintColor: Colors.foundation.grey800,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing['4xl'],
  },
  archiveEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  archiveEmptyTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  archiveEmptyDescription: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  heroArea: {
    width: '100%',
    height: HERO_HEIGHT - HERO_MARGIN_TOP,
    marginTop: HERO_MARGIN_TOP,
    position: 'relative',
  },
  blurRegion: {
    position: 'absolute',
    top: BLUR_REGION_TOP,
    left: 0,
    backgroundColor: Colors.warm.white,
    overflow: 'hidden',
  },
  blurRegionWeb: {
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    filter: `blur(${BLUR_RADIUS}px)`,
    transform: [{ scale: 1.08 }],
  },
  photoFrame: {
    position: 'absolute',
    width: PHOTO_FRAME_WIDTH,
    height: PHOTO_FRAME_HEIGHT,
    backgroundColor: '#F9F9F6',
    zIndex: 1,
  },
  frameDate: {
    position: 'absolute',
    top: FRAME_DATE_TOP,
    left: 0,
    right: 0,
    fontFamily: FontFamily.prata,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  frameImage: {
    position: 'absolute',
    top: FRAME_IMAGE_TOP,
    left: FRAME_IMAGE_LEFT,
    width: FRAME_IMAGE_WIDTH,
    height: FRAME_IMAGE_HEIGHT,
  },
  archiveEmptyAction: {
    marginTop: Spacing.lg,
  },
  frameImageFallback: {
    backgroundColor: Colors.foundation.grey100,
  },
  parisTitleWrap: {
    position: 'absolute',
    height: 112,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 2,
  },
  parisTitle: {
    width: '100%',
    fontFamily: FontFamily.prata,
    fontSize: 96,
    color: Colors.foundation.black,
    includeFontPadding: false,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  daySelector: {
    height: DAY_SELECTOR_HEIGHT,
    marginHorizontal: Spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(182, 182, 182, 0.50)',
  },
  daySelectorInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  adjacentDaySlot: {
    flex: 1,
    height: DAY_SELECTOR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousDaySlot: {
    paddingRight: Spacing.sm,
  },
  nextDaySlot: {
    paddingLeft: Spacing.sm,
  },
  adjacentDayText: {
    ...Typography.captionEmphasized,
    color: 'rgba(89, 89, 89, 0.70)',
    letterSpacing: 1.44,
    textAlign: 'center',
  },
  hiddenDayText: {
    opacity: 0,
  },
  currentDaySlot: {
    width: 128,
    height: DAY_SELECTOR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(99, 99, 99, 0.80)',
  },
  currentDayText: {
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 5.76,
    color: Colors.foundation.black,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  currentDateText: {
    ...Typography.body2Regular,
    lineHeight: 16,
    letterSpacing: 0.28,
    color: Colors.foundation.black,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  recordSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: MAP_TOP_GAP,
    gap: 28,
  },
  archiveMapCard: {
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  mapScopeRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.white,
  },
  mapScopeButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
  },
  mapScopeButtonSelected: {
    backgroundColor: Colors.foundation.black,
  },
  mapScopeText: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey700,
  },
  mapScopeTextSelected: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
  },
  entries: {
    gap: 40,
  },
  dayEmptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  dayEmptyTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  dayEmptyDescription: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyStateButtonWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  emptyStateAddButton: {
    width: 220,
    height: 52,
    alignSelf: 'center',
    borderRadius: 28,
  },
  emptyStateAddButtonText: {
    ...Typography.body2Emphasized,
    textAlign: 'center',
  },
  menuOverlay: {
    flex: 1,
  },
  headerQuickMenu: {
    position: 'absolute',
    top: 84,
    right: Spacing.xl,
    width: 196,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    ...Shadows.modal,
  },
  headerQuickMenuRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.lg,
  },
  headerQuickMenuText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  headerQuickMenuTextDestructive: {
    color: '#EB524D',
  },
  coverPickerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  coverPickerCard: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '72%',
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    ...Shadows.modal,
  },
  coverPickerHeader: {
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPickerTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  coverPickerCloseButton: {
    position: 'absolute',
    right: 0,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
  },
  coverPickerPhoto: {
    width: '31%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: Radius.sm,
    backgroundColor: Colors.light.bgScreen,
  },
  coverPickerImage: {
    width: '100%',
    height: '100%',
  },
  coverPickerSelectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.black,
  },
  coverPickerEmpty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.lg,
  },
  coverPickerEmptyTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  coverPickerEmptyDescription: {
    marginTop: Spacing.sm,
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
});
