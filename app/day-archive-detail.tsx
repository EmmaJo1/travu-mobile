/**
 * day-archive-detail
 * Figma: 506:704
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
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
  TextInput,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import StartTripSetupModal, {
  type StartTripSetupValue,
} from '@/components/home/StartTripSetupModal';
import MapPlaceholderCard from '@/components/common/MapPlaceholderCard';
import DaySelectorSheet, { type DaySelectorItem } from '@/components/record/DaySelectorSheet';
import PlaceEntryCard, { type PlaceEntry } from '@/components/trip/PlaceEntryCard';
import type { DestinationOption } from '@/constants/mockTripDestinations';
import {
  ARCHIVE_DAY_OPTIONS,
  MOCK_ARCHIVE_DETAIL,
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
const PARIS_TOP = FIGMA_Y.parisTop - SCROLL_ORIGIN_Y;
const PHOTO_FRAME_TOP = FIGMA_Y.photoFrameTop - SCROLL_ORIGIN_Y;
const HERO_HEIGHT = FIGMA_Y.daySelectorTop - SCROLL_ORIGIN_Y;
const HERO_MARGIN_TOP = BLUR_TOP < 0 ? BLUR_TOP : 0;
const BLUR_REGION_TOP = BLUR_TOP - HERO_MARGIN_TOP;
const PHOTO_FRAME_WIDTH = 350;
const PHOTO_FRAME_HEIGHT = 505;
const PARIS_WIDTH = 298;
const PARIS_CLIP_PADDING_TOP = 18;
const PARIS_HEIGHT = 128;
const PARIS_OFFSET_X = 11;
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

function resolveImageUri(source: ImageSourcePropType): string | undefined {
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
  source: ImageSourcePropType;
  width: number;
  height: number;
}) {
  const uri = resolveImageUri(source);

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
  const matchedNumber = dayId?.match(/day-(\d+)/i)?.[1];
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
  return entry.googlePlaceId ?? entry.id;
}

type ArchiveHeaderActionId = 'cover' | 'title' | 'info' | 'place' | 'delete';

const ARCHIVE_HEADER_ACTIONS: {
  destructive?: boolean;
  icon: keyof typeof Feather.glyphMap;
  id: ArchiveHeaderActionId;
  label: string;
}[] = [
  { id: 'cover', icon: 'image', label: '\uB300\uD45C \uC0AC\uC9C4 \uBCC0\uACBD' },
  { id: 'title', icon: 'edit-3', label: '\uC5EC\uD589 \uC774\uB984 \uC218\uC815' },
  { id: 'info', icon: 'settings', label: '\uC5EC\uD589 \uC815\uBCF4 \uC218\uC815' },
  { id: 'place', icon: 'map-pin', label: '\uC7A5\uC18C \uCD94\uAC00' },
  { id: 'delete', destructive: true, icon: 'trash-2', label: '\uC5EC\uD589 \uC0AD\uC81C' },
];

const LABEL_EDIT_TRIP_TITLE = '\uC5EC\uD589 \uC774\uB984 \uC218\uC815';
const LABEL_CANCEL = '\uCDE8\uC18C';
const LABEL_SAVE = '\uC800\uC7A5';
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

function createArchiveDetailFromTrip(trip?: MyPageTrip) {
  if (!trip) {
    return MOCK_ARCHIVE_DETAIL;
  }

  return {
    ...MOCK_ARCHIVE_DETAIL,
    id: trip.id,
    city: trip.city,
    country: trip.country,
    dateRangeLabel: trip.dateRangeLabel,
    heroTitle: resolveArchiveHeroTitle(trip),
    photoFrameImage: trip.coverImage,
    stats: {
      ...MOCK_ARCHIVE_DETAIL.stats,
      daysCount: trip.daysCount,
      photoCount: trip.photoCount,
    },
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
                color={action.destructive ? '#D13434' : Colors.foundation.grey800}
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
export default function DayArchiveDetailScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{
    tripId?: string;
    dayId?: string;
    dayNumber?: string;
    placeId?: string;
  }>();
  const { width: screenWidth } = useWindowDimensions();
  const savedTrips = useSavedMyPageTrips();
  const routeTripId = getArchiveDetailTripId(tripId);
  const tripFromSaved = savedTrips.find((trip) => trip.id === routeTripId);
  const fallbackTrip =
    tripFromSaved ??
    MOCK_MY_PAGE_TRIPS.find((trip) => trip.id === routeTripId) ??
    savedTrips[0];
  const [localTripPatch, setLocalTripPatch] = useState<Partial<MyPageTrip>>({});
  const [isTitleEditorVisible, setTitleEditorVisible] = useState(false);
  const [isTripInfoEditorVisible, setTripInfoEditorVisible] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const activeTrip = fallbackTrip ? { ...fallbackTrip, ...localTripPatch } : undefined;
  const detail = createArchiveDetailFromTrip(activeTrip);
  const dayOptions = useMemo(() => createArchiveDayOptionsFromTrip(activeTrip), [activeTrip]);
  const entries = useMemo(() => toPlaceEntries(detail.places), [detail.places]);
  const tripInfoInitialValue = useMemo(
    () => createArchiveTripSetupValue(activeTrip, detail),
    [activeTrip, detail],
  );
  const [selectedDay, setSelectedDay] = useState<DaySelectorItem>(() =>
    dayOptions[0] ?? resolveInitialArchiveDay(),
  );
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isFixedHeaderVisible, setFixedHeaderVisible] = useState(false);
  const [isHeaderMenuVisible, setHeaderMenuVisible] = useState(false);
  const [isScrollEnabled, setScrollEnabled] = useState(true);

  const photoFrameLeft = (screenWidth - PHOTO_FRAME_WIDTH) / 2;


  const triggerSelectionHaptic = React.useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const handleSelectArchiveDay = React.useCallback(
    (day: DaySelectorItem) => {
      if (day.id === selectedDay.id) {
        return;
      }

      setSelectedDay(day);
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
    router.push({
      pathname: '/place-detail',
      params: {
        tripId: detail.id,
        dayId: selectedDay.id,
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

  const handleOpenPlacePhotoGrid = (entry: PlaceEntry) => {
    router.push({
      pathname: '/place-detail',
      params: {
        tripId: detail.id,
        dayId: selectedDay.id,
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

  const updateArchiveTrip = React.useCallback(
    (patch: Partial<MyPageTrip>) => {
      setLocalTripPatch((current) => ({ ...current, ...patch }));

      if (tripFromSaved) {
        updateSavedMyPageTrip(tripFromSaved.id, patch);
      }
    },
    [tripFromSaved],
  );

  const handleChangeCoverImage = React.useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        '\uC0AC\uC9C4 \uAD8C\uD55C\uC774 \uD544\uC694\uD574\uC694',
        '\uC0AC\uC9C4\uCCA9\uC5D0\uC11C \uB300\uD45C \uC0AC\uC9C4\uC744 \uC120\uD0DD\uD558\uB824\uBA74 \uAD8C\uD55C\uC774 \uD544\uC694\uD574\uC694.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    updateArchiveTrip({ coverImage: { uri: result.assets[0].uri } });
  }, [updateArchiveTrip]);

  const openTitleEditor = React.useCallback(() => {
    setTitleDraft(resolveArchiveHeroTitle(activeTrip));
    setTitleEditorVisible(true);
  }, [activeTrip]);

  const handleSaveTitle = React.useCallback(() => {
    const nextTitle = titleDraft.trim();

    if (!nextTitle) {
      return;
    }

    updateArchiveTrip({
      title: nextTitle.toUpperCase(),
      titleEn: nextTitle,
    });
    setTitleEditorVisible(false);
  }, [titleDraft, updateArchiveTrip]);

  const handleSaveTripInfo = React.useCallback(
    (value: StartTripSetupValue) => {
      const primaryDestination = value.destinations?.[0];
      const destinationName = value.destinationName.trim();
      const countryName = value.countryName.trim();
      const englishTitle =
        primaryDestination?.englishDisplayName ??
        (isEnglishLike(destinationName) ? destinationName : activeTrip?.titleEn ?? activeTrip?.title);
      const nextDateRangeLabel = formatArchiveDateRangeLabel(value.startDate, value.endDate);

      // TODO: Persist edited archive trip info to Supabase when backend sync is connected.
      updateArchiveTrip({
        city: destinationName,
        country: countryName,
        dateRangeLabel: nextDateRangeLabel,
        daysCount: getInclusiveArchiveDays(value.startDate, value.endDate),
        title: englishTitle ? englishTitle.toUpperCase() : activeTrip?.title,
        titleEn: englishTitle,
        visitedCities: value.visitedCities ?? [],
        visitedCountries: value.visitedCountries ?? [],
      });
      setTripInfoEditorVisible(false);
    },
    [activeTrip?.title, activeTrip?.titleEn, updateArchiveTrip],
  );

  const handleDeleteTrip = React.useCallback(() => {
    Alert.alert(LABEL_DELETE_TRIP_TITLE, LABEL_DELETE_TRIP_MESSAGE, [
      { style: 'cancel', text: LABEL_CANCEL },
      {
        style: 'destructive',
        text: '\uC0AD\uC81C',
        onPress: () => {
          if (activeTrip) {
            removeSavedMyPageTrip(activeTrip.id);
          }
          router.back();
        },
      },
    ]);
  }, [activeTrip, router]);

  const showArchiveQuickAction = (label: string) => {
    Alert.alert(label, '\uC774 \uAE30\uB2A5\uC740 \uC5EC\uD589 \uD3B8\uC9D1 \uD50C\uB85C\uC6B0\uB85C \uC5F0\uACB0\uB420 \uC608\uC815\uC785\uB2C8\uB2E4.');
  };

  const handleSelectHeaderAction = (actionId: ArchiveHeaderActionId) => {
    setHeaderMenuVisible(false);

    if (actionId === 'cover') {
      void handleChangeCoverImage();
      return;
    }

    if (actionId === 'title') {
      openTitleEditor();
      return;
    }

    if (actionId === 'delete') {
      handleDeleteTrip();
      return;
    }

    if (actionId === 'info') {
      setTripInfoEditorVisible(true);
      return;
    }

    const action = ARCHIVE_HEADER_ACTIONS.find((item) => item.id === actionId);
    showArchiveQuickAction(action?.label ?? '');
  };

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
            source={detail.photoFrameImage}
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
            <Image
              source={detail.photoFrameImage}
              style={styles.frameImage}
              contentFit="cover"
              contentPosition="center"
            />
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
          <MapPlaceholderCard align="top" />

          <View style={styles.entries}>
            {entries.map((entry) => (
              <PlaceEntryCard
                key={entry.id}
                entry={entry}
                showRating={false}
                variant="archive"
                onPress={() => handleOpenPlaceDetail(entry)}
                onPhotoGridOpen={() => handleOpenPlacePhotoGrid(entry)}
              />
            ))}
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
      <ArchiveHeaderMenu
        visible={isHeaderMenuVisible}
        onClose={() => setHeaderMenuVisible(false)}
        onSelectAction={handleSelectHeaderAction}
      />
      <Modal
        animationType="fade"
        transparent
        visible={isTitleEditorVisible}
        onRequestClose={() => setTitleEditorVisible(false)}
      >
        <Pressable style={styles.titleEditorOverlay} onPress={() => setTitleEditorVisible(false)}>
          <Pressable style={styles.titleEditorCard}>
            <Text style={styles.titleEditorTitle}>{LABEL_EDIT_TRIP_TITLE}</Text>
            <TextInput
              autoCapitalize="words"
              autoFocus
              onChangeText={setTitleDraft}
              placeholder="Paris"
              placeholderTextColor={Colors.foundation.grey500}
              style={styles.titleEditorInput}
              value={titleDraft}
            />
            <View style={styles.titleEditorActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTitleEditorVisible(false)}
                style={styles.titleEditorSecondaryButton}
              >
                <Text style={styles.titleEditorSecondaryText}>{LABEL_CANCEL}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleSaveTitle}
                style={styles.titleEditorPrimaryButton}
              >
                <Text style={styles.titleEditorPrimaryText}>{LABEL_SAVE}</Text>
              </Pressable>
            </View>
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
    left: '50%',
    width: 132,
    height: 22,
    marginLeft: -66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  archiveHeaderDateText: {
    ...Typography.body1Regular,
    color: Colors.foundation.black,
    flexShrink: 1,
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
  entries: {
    gap: 40,
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
    color: '#D13434',
  },
  titleEditorOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  titleEditorCard: {
    width: '100%',
    maxWidth: 340,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    ...Shadows.modal,
  },
  titleEditorTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  titleEditorInput: {
    height: 48,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.sm,
    ...Typography.body1Regular,
    color: Colors.foundation.black,
  },
  titleEditorActions: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  titleEditorSecondaryButton: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  titleEditorSecondaryText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey700,
  },
  titleEditorPrimaryButton: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  titleEditorPrimaryText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
});
