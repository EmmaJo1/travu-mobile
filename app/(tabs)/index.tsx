/**
 * Home based on Figma Home_Component / node 1941:2308.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import {
  setStatusBarBackgroundColor,
  setStatusBarStyle,
  setStatusBarTranslucent,
  StatusBar,
} from 'expo-status-bar';
import React from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import DestinationSearchModal from '@/components/home/DestinationSearchModal';
import EndTripCompleteModal from '@/components/home/EndTripCompleteModal';
import EndTripConfirmModal from '@/components/home/EndTripConfirmModal';
import HomeIdleState from '@/components/home/HomeIdleState';
import PhotoImportSavedModal from '@/components/home/PhotoImportSavedModal';
import StartTripConfirmModal from '@/components/home/StartTripConfirmModal';
import StartTripSetupModal, {
  type StartTripSetupValue,
} from '@/components/home/StartTripSetupModal';
import TodayTimelineSection, {
  type TodayTimelineItem,
} from '@/components/home/TodayTimelineSection';
import TravelStatusButton from '@/components/home/TravelStatusButton';
import TravelStatusSheet from '@/components/home/TravelStatusSheet';
import TripDatePickerModal from '@/components/home/TripDatePickerModal';
import PlaceCreateModal, {
  type PlaceCreateInput,
} from '@/components/record/PlaceCreateModal';
import TodaySummary from '@/components/trip/TodaySummary';
import { setActiveTraveling } from '@/constants/activeTravelSession';
import { HOME_MOCK_DATA } from '@/constants/mockHome';
import {
  HOME_TIMELINE_ITEMS,
  generateHomeTimelineItemsForDay,
} from '@/constants/mockHomeTimeline';
import type { DestinationOption } from '@/constants/mockTripDestinations';
import { addSavedCompletedTrip } from '@/constants/savedMyPageTrips';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useCompleteTrip } from '@/hooks/useCompleteTrip';
import { useCreateTrip } from '@/hooks/useCreateTrip';
import { useActiveTrip, useMyTrips, useRecentTrips } from '@/hooks/useMyTrips';
import { usePhotoImportFlow } from '@/hooks/usePhotoImportFlow';
import { useAuth } from '@/providers/AuthProvider';
import { ActiveTripExistsError, type TripRow } from '@/services/supabase/trips';
import {
  mapSupabaseTripsToHomeSummaryTrips,
  mapSupabaseTripsToIdleRecentTrips,
} from '@/utils/supabaseTripMappers';

const HERO_HEIGHT = 336;
const HERO_IMAGE_FRAME_TOP = -139;
const HERO_IMAGE_FRAME_HEIGHT = 508;
const HERO_IMAGE_TOP = 8;
const HERO_IMAGE_HEIGHT = 492;
const HEADER_HEIGHT = 52;
const HEADER_DIM_HEIGHT = 129;
const HERO_MASK_TOP = 180;
const HERO_MASK_HEIGHT = HERO_HEIGHT - HERO_MASK_TOP;
const SUMMARY_HEIGHT = 136;
const SUMMARY_OVERLAP = 104;
const WARM_WHITE = Colors.warm.white;
const FIGMA_POINT_EN = 'Sansita Swashed';
const DAY_MS = 24 * 60 * 60 * 1000;
const SCHEDULE_SHEET_OPEN_DURATION = 240;
const SCHEDULE_SHEET_CLOSE_DURATION = 200;
const SCHEDULE_SHEET_ENTER_TRANSLATE_Y = 48;
const SCHEDULE_SHEET_EXIT_TRANSLATE_Y = 360;
const SCHEDULE_DAY_ROW_HEIGHT = 68;
const SCHEDULE_DAY_CENTER_OFFSET = 160;

const HEADER_DIM_COLORS = [
  'rgba(38,38,38,0.4)',
  'rgba(134,134,134,0.3)',
  'rgba(143,143,143,0.15)',
  'rgba(153,153,153,0)',
] as const;

const HEADER_DIM_LOCATIONS = [0.0028, 0.7428, 0.8538, 0.9301] as const;

const HERO_MASK_COLORS = [
  'rgba(115,115,115,0)',
  'rgba(147,147,147,0.22)',
  'rgba(249,245,243,0.28)',
  'rgba(249,245,243,0.72)',
  WARM_WHITE,
] as const;

const HERO_MASK_LOCATIONS = [0, 0.34, 0.58, 0.82, 1] as const;

function getHomeHeaderTop(safeAreaTop: number) {
  return Platform.OS === 'web' ? 0 : safeAreaTop;
}
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const ENGLISH_DESTINATION_LABELS: Record<string, string> = {
  'city-jeju-kr': 'Jeju',
  'city-seoul-kr': 'Seoul',
  'city-busan-kr': 'Busan',
  'city-gyeongju-kr': 'Gyeongju',
  'city-gangneung-kr': 'Gangneung',
  'city-osaka-jp': 'Osaka',
  'city-kyoto-jp': 'Kyoto',
  'city-tokyo-jp': 'Tokyo',
  'city-paris-fr': 'Paris',
  'country-france': 'France',
  'country-japan': 'Japan',
  paris: 'Paris',
  프랑스: 'France',
  france: 'France',
  교토: 'Kyoto',
  kyoto: 'Kyoto',
  일본: 'Japan',
  japan: 'Japan',
  jeju: 'Jeju',
  '\uC81C\uC8FC\uB3C4': 'Jeju',
  '\uACBD\uC8FC': 'Gyeongju',
  '\uAC15\uB989': 'Gangneung',
  '\uC624\uC0AC\uCE74': 'Osaka',
  '\uB3C4\uCFC4': 'Tokyo',
  '\uD30C\uB9AC': 'Paris',
  시드니: 'Sydney',
  sydney: 'Sydney',
  호주: 'Australia',
  australia: 'Australia',
  뉴욕: 'New York',
  'new york': 'New York',
  대한민국: 'Korea',
  한국: 'Korea',
  서울: 'Seoul',
  광주: 'Gwangju',
  부산: 'Busan',
  대구: 'Daegu',
  인천: 'Incheon',
  대전: 'Daejeon',
  울산: 'Ulsan',
  제주: 'Jeju',
  '위치 미정': 'Set location',
  미국: 'USA',
};

type PendingTravelStatusAction = 'date' | 'destination' | 'endTrip' | null;
type PhotoImportHomeFlowStatus = 'idle' | 'analyzing' | 'completed';
type DestinationSource = 'currentLocation' | 'manual' | 'unknown';

interface ActiveTripState {
  destination: DestinationOption;
  visitedDestinations: DestinationOption[];
  startDate: string;
  endDate: string | null;
  openEnded: boolean;
  destinationSource: DestinationSource;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  updatedAt?: string;
  isEndDateUndecided: boolean;
  dayNumber: number;
  isRecording: boolean;
}

type EditableTimelineItem = TodayTimelineItem & {
  dayDateKey?: string;
  hidden?: boolean;
  records?: PlaceRecord[];
  memoEntries?: string[];
  addedPhotoUris?: string[];
};

type TripDay = {
  dayNumber: number;
  dateKey: string;
};

type TripTotalStats = {
  photoCount: number;
  placeCount: number;
  recordCount: number;
};

type DayScheduleSummary = {
  photoCount: number;
  placeCount: number;
};

type PlaceRecord = {
  id: string;
  tripId: string;
  dayId: string;
  placeId: string;
  text?: string;
  photoIds?: string[];
  createdAt: string;
  updatedAt?: string;
};

function getDestinationDisplayName(destination: DestinationOption) {
  return destination.name ?? destination.displayName;
}

function getDestinationCountryName(destination: DestinationOption) {
  return destination.country ?? destination.countryName ?? '';
}

function getDestinationKey(destination: DestinationOption) {
  const name = getDestinationDisplayName(destination).trim().toLowerCase();
  const country = getDestinationCountryName(destination).trim().toLowerCase();

  return `${name}|${country}`;
}

function mergeVisitedDestinations(
  currentDestinations: DestinationOption[],
  nextDestinations: DestinationOption[],
) {
  const destinationMap = new Map<string, DestinationOption>();

  [...currentDestinations, ...nextDestinations].forEach((destination) => {
    destinationMap.set(getDestinationKey(destination), destination);
  });

  return [...destinationMap.values()];
}

function getUniqueTravelValues(values: string[]) {
  const valueMap = new Map<string, string>();

  values.forEach((value) => {
    const normalizedValue = value.trim();

    if (!normalizedValue) return;

    valueMap.set(normalizedValue.toLowerCase(), normalizedValue);
  });

  return [...valueMap.values()];
}

const INITIAL_ACTIVE_DESTINATION: DestinationOption = {
  id: 'city-paris-fr',
  name: 'Paris',
  country: 'France',
  displayName: 'Paris',
  countryName: 'France',
  type: 'city',
};

const INITIAL_ACTIVE_TRIP: ActiveTripState = {
  destination: INITIAL_ACTIVE_DESTINATION,
  visitedDestinations: [INITIAL_ACTIVE_DESTINATION],
  startDate: '2025-11-02',
  endDate: '2025-11-12',
  openEnded: false,
  destinationSource: 'manual',
  isEndDateUndecided: false,
  dayNumber: 1,
  isRecording: true,
};

const DEFAULT_START_TRIP_SETUP: StartTripSetupValue = {
  destinationName: '',
  countryName: '',
  startDate: '2020-03-02',
  endDate: '2020-03-14',
};

type CurrentLocationDestination = {
  destination: DestinationOption;
  latitude: number;
  longitude: number;
};

type ReverseGeocodeAddress = {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
};

type ReverseGeocodeResponse = {
  address?: ReverseGeocodeAddress;
};

function getTodayDateKey(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function createDestinationId(prefix: string, displayName: string): string {
  const normalizedName = displayName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

  return `${prefix}-${normalizedName || 'unknown'}`;
}

function createPlaceId(prefix: string, dateKey: string, placeName: string, timestamp: number): string {
  const normalizedPlaceName = placeName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

  return `${prefix}-${dateKey}-${normalizedPlaceName || 'place'}-${timestamp}`;
}

function createUnknownDestination(): DestinationOption {
  return {
    id: 'unknown-location',
    name: '위치 미정',
    country: '',
    displayName: '위치 미정',
    countryName: '',
    type: 'city',
  };
}

function requestBrowserCoordinates(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    const geolocation = globalThis.navigator?.geolocation;

    if (!geolocation) {
      reject(new Error('Geolocation is unavailable.'));
      return;
    }

    geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      reject,
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 8000,
      },
    );
  });
}

async function reverseGeocodeCurrentLocation(
  latitude: number,
  longitude: number,
): Promise<DestinationOption> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=ko`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Reverse geocoding failed.');
  }

  const result = (await response.json()) as ReverseGeocodeResponse;
  const address = result.address ?? {};
  const displayName =
    address.city ?? address.town ?? address.village ?? address.county ?? address.state;

  if (!displayName) {
    throw new Error('City-level location is unavailable.');
  }

  return {
    id: createDestinationId('current-location', displayName),
    name: displayName,
    country: address.country ?? '',
    displayName,
    countryName: address.country ?? '',
    type: 'city',
  };
}

async function resolveCurrentLocationDestination(): Promise<CurrentLocationDestination> {
  const coords = await requestBrowserCoordinates();
  const destination = await reverseGeocodeCurrentLocation(coords.latitude, coords.longitude);

  return {
    destination,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatHeroDateLabel(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return `${date.getMonth() + 1}.${date.getDate()} ${WEEKDAY_LABELS[date.getDay()]}`;
}

function formatTimelineFallbackTimeLabel(date = new Date()): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  if (minutes === 0) {
    return `${hour12} ${period}`;
  }

  return `${hour12}:${`${minutes}`.padStart(2, '0')} ${period}`;
}

function getTimelineTimeSortMinutes(timeLabel: string): number {
  const match = timeLabel.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  const rawHour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const period = match[3].toUpperCase();
  const hour = period === 'PM'
    ? rawHour === 12 ? 12 : rawHour + 12
    : rawHour === 12 ? 0 : rawHour;

  return hour * 60 + minute;
}

function addDaysToDateKey(dateKey: string, dayOffset: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + dayOffset);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isSameDateKey(firstDateKey: string, secondDateKey: string): boolean {
  return firstDateKey === secondDateKey;
}

function getTimelineRecordCount(item: EditableTimelineItem): number {
  if (item.records && item.records.length > 0) {
    return item.records.length;
  }

  if (item.memoEntries && item.memoEntries.length > 0) {
    return item.memoEntries.length;
  }

  return item.memoCount;
}

function getTripTotalStats(
  timelineItems: EditableTimelineItem[],
  tripDays: TripDay[],
): TripTotalStats {
  const tripDayKeys = new Set(tripDays.map((day) => day.dateKey));

  return timelineItems.reduce<TripTotalStats>(
    (stats, item) => {
      if (item.hidden) {
        return stats;
      }

      if (item.dayDateKey && !tripDayKeys.has(item.dayDateKey)) {
        return stats;
      }

      return {
        photoCount: stats.photoCount + item.photoCount,
        placeCount: stats.placeCount + 1,
        recordCount: stats.recordCount + getTimelineRecordCount(item),
      };
    },
    {
      photoCount: 0,
      placeCount: 0,
      recordCount: 0,
    },
  );
}

function getDayScheduleSummary(
  timelineItems: EditableTimelineItem[],
  dateKey: string,
  fallbackDateKey: string,
): DayScheduleSummary {
  return timelineItems.reduce<DayScheduleSummary>(
    (summary, item) => {
      if (item.hidden) {
        return summary;
      }

      const itemDateKey = item.dayDateKey ?? fallbackDateKey;
      if (itemDateKey !== dateKey) {
        return summary;
      }

      return {
        photoCount: summary.photoCount + item.photoCount,
        placeCount: summary.placeCount + 1,
      };
    },
    {
      photoCount: 0,
      placeCount: 0,
    },
  );
}

function formatSheetDateLabel(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getInclusiveDayCount(startDate: string, endDate: string | null): number {
  const start = parseDateKey(startDate).getTime();
  const end = parseDateKey(endDate ?? startDate).getTime();
  return Math.max(1, Math.round((end - start) / DAY_MS) + 1);
}

function formatDateRangeDescription(
  startDate: string,
  endDate: string | null,
  isEndDateUndecided = false,
): string {
  const start = parseDateKey(startDate);

  if (isEndDateUndecided) {
    return `${start.getMonth() + 1}월 ${start.getDate()}일 시작 · 종료일 미정`;
  }

  const end = parseDateKey(endDate ?? startDate);
  const days = getInclusiveDayCount(startDate, endDate);

  return `${start.getMonth() + 1}월 ${start.getDate()}일~${end.getMonth() + 1}월 ${end.getDate()}일 (${days}일)`;
}

function getEnglishLocationLabel(destination: DestinationOption): string {
  const candidates = [
    destination.englishDisplayName,
    destination.englishCountryName,
    destination.id,
    destination.displayName,
    destination.countryName,
  ].filter(Boolean) as string[];

  for (const value of candidates) {
    const normalized = value.trim().toLowerCase();
    const label = ENGLISH_DESTINATION_LABELS[normalized] ?? ENGLISH_DESTINATION_LABELS[value];

    if (label) {
      return label;
    }
  }

  if (/^[\x00-\x7F]+$/.test(destination.displayName)) {
    return destination.displayName;
  }

  const koreanCityLabels: [string, string][] = [
    ['서울', 'Seoul'],
    ['광주', 'Gwangju'],
    ['부산', 'Busan'],
    ['대구', 'Daegu'],
    ['인천', 'Incheon'],
    ['대전', 'Daejeon'],
    ['울산', 'Ulsan'],
    ['제주', 'Jeju'],
  ];
  const matchedKoreanCity = koreanCityLabels.find(([cityName]) =>
    destination.displayName.includes(cityName),
  );

  if (matchedKoreanCity) {
    return matchedKoreanCity[1];
  }

  if (/^[\x00-\x7F]+$/.test(destination.countryName)) {
    return destination.countryName;
  }

  return 'Travel';
}

function getEnglishCountryLabel(countryName: string): string {
  const normalized = countryName.trim().toLowerCase();

  if (!normalized) {
    return '';
  }

  return ENGLISH_DESTINATION_LABELS[normalized] ?? ENGLISH_DESTINATION_LABELS[countryName] ?? countryName;
}

function createDestinationFromTrip(trip: TripRow): DestinationOption {
  const displayName = trip.destination_city ?? trip.destination_city_ko ?? trip.title;
  const countryName = trip.destination_country ?? trip.destination_country_ko ?? '';

  return {
    id: trip.id,
    name: displayName,
    country: countryName,
    displayName,
    countryName,
    type: 'city',
  };
}

function createActiveTripStateFromSupabaseTrip(trip: TripRow): ActiveTripState {
  const destination = createDestinationFromTrip(trip);

  return {
    ...INITIAL_ACTIVE_TRIP,
    destination,
    visitedDestinations: [destination],
    startDate: trip.start_date ?? getTodayDateKey(),
    endDate: trip.end_date,
    openEnded: trip.is_end_date_undecided,
    isEndDateUndecided: trip.is_end_date_undecided,
    isRecording: true,
    createdAt: trip.created_at,
    updatedAt: trip.updated_at,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    photoImportPreview?: string;
    action?: string;
    actionId?: string;
  }>();
  const { canUseSupabaseUserData } = useAuth();
  const createTripMutation = useCreateTrip();
  const completeTripMutation = useCompleteTrip();
  const { data: supabaseActiveTrip } = useActiveTrip();
  const { data: supabaseTrips } = useMyTrips();
  const { data: supabaseRecentTrips } = useRecentTrips(3);
  const { currentTrip, todaySummary } = HOME_MOCK_DATA;
  const {
    status: photoImportStatus,
    progress: photoImportProgress,
    candidates: photoImportCandidates,
    hasOpenedPhotoImportResults,
    hasDeferredPhotoImportResults,
    hasSavedPhotoImportResults,
    lastSavedTripCount,
    openPhotoImportResults,
    deferPhotoImportResults,
    closePhotoImportCompleteModal,
    dismissPhotoImportSavedModal,
  } = usePhotoImportFlow();

  const [isTraveling, setIsTraveling] = React.useState(false);
  const [activeTrip, setActiveTrip] = React.useState(INITIAL_ACTIVE_TRIP);
  const [isTravelStatusSheetVisible, setTravelStatusSheetVisible] = React.useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = React.useState(false);
  const [isDestinationSearchVisible, setDestinationSearchVisible] = React.useState(false);
  const [isEndTripConfirmVisible, setEndTripConfirmVisible] = React.useState(false);
  const [isEndTripCompleteVisible, setEndTripCompleteVisible] = React.useState(false);
  const [isStartTripConfirmVisible, setStartTripConfirmVisible] = React.useState(false);
  const [isStartTripSetupVisible, setStartTripSetupVisible] = React.useState(false);
  const [isQuickStartingTrip, setQuickStartingTrip] = React.useState(false);
  const [isFirstUserEmptyState, setIsFirstUserEmptyState] = React.useState(false);
  const [photoImportHomeFlowStatus, setPhotoImportHomeFlowStatus] =
    React.useState<PhotoImportHomeFlowStatus>('idle');
  const [showPhotoImportCompleteModal, setShowPhotoImportCompleteModal] =
    React.useState(false);
  const [hasDismissedPhotoImportCompleteModal, setHasDismissedPhotoImportCompleteModal] =
    React.useState(false);
  const [pendingTravelStatusAction, setPendingTravelStatusAction] =
    React.useState<PendingTravelStatusAction>(null);
  const [timelineItems, setTimelineItems] =
    React.useState<EditableTimelineItem[]>(HOME_TIMELINE_ITEMS);
  const [selectedTripDayIndex, setSelectedTripDayIndex] = React.useState(
    Math.max(0, INITIAL_ACTIVE_TRIP.dayNumber - 1),
  );
  const [isTravelHomeRefreshing, setTravelHomeRefreshing] = React.useState(false);
  const [isScheduleSheetVisible, setScheduleSheetVisible] = React.useState(false);
  const scheduleSheetTranslateY = React.useRef(
    new Animated.Value(SCHEDULE_SHEET_EXIT_TRANSLATE_Y),
  ).current;
  const scheduleDayScrollRef = React.useRef<ScrollView | null>(null);
  const [isPlaceCreateModalVisible, setPlaceCreateModalVisible] = React.useState(false);
  const handledTabActionIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (params.photoImportPreview !== 'analyzing') {
      return;
    }

    setIsFirstUserEmptyState(true);
    setPhotoImportHomeFlowStatus('analyzing');
    setShowPhotoImportCompleteModal(false);
    setHasDismissedPhotoImportCompleteModal(false);
  }, [params.photoImportPreview]);

  React.useEffect(() => {
    if (params.action !== 'startTrip' && params.action !== 'endTrip') {
      return;
    }

    const actionKey = params.actionId ?? params.action;
    if (handledTabActionIdRef.current === actionKey) {
      return;
    }

    handledTabActionIdRef.current = actionKey;

    if (params.action === 'startTrip') {
      setStartTripConfirmVisible(true);
      return;
    }

    if (isTraveling) {
      setEndTripConfirmVisible(true);
    }
  }, [isTraveling, params.action, params.actionId]);

  React.useEffect(() => {
    setActiveTraveling(isTraveling);
  }, [isTraveling]);

  React.useEffect(() => {
    if (isTraveling || !supabaseActiveTrip) {
      return;
    }

    setActiveTrip(createActiveTripStateFromSupabaseTrip(supabaseActiveTrip));
    setIsTraveling(true);
  }, [isTraveling, supabaseActiveTrip]);

  React.useEffect(() => {
    if (photoImportHomeFlowStatus !== 'analyzing') {
      return undefined;
    }

    const timer = setTimeout(() => {
      setPhotoImportHomeFlowStatus('completed');
      setShowPhotoImportCompleteModal(true);
    }, 1600);

    return () => clearTimeout(timer);
  }, [photoImportHomeFlowStatus]);

  const closeSheetThenOpen = React.useCallback((action: Exclude<PendingTravelStatusAction, null>) => {
    setPendingTravelStatusAction(action);
    setTravelStatusSheetVisible(false);
  }, []);

  const handleTravelStatusSheetDismiss = React.useCallback(() => {
    if (!pendingTravelStatusAction) {
      return;
    }

    const nextAction = pendingTravelStatusAction;
    setPendingTravelStatusAction(null);

    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        if (nextAction === 'date') {
          setDatePickerVisible(true);
        }

        if (nextAction === 'destination') {
          setDestinationSearchVisible(true);
        }

        if (nextAction === 'endTrip') {
          setEndTripConfirmVisible(true);
        }
      });
    });
  }, [pendingTravelStatusAction]);

  const handleOpenPhotoImportResults = React.useCallback(() => {
    setShowPhotoImportCompleteModal(false);
    openPhotoImportResults();
    // TODO: Replace onboarding results route with the final imported-trip
    // review route when the real media-library analysis flow is connected.
    router.push('/onboarding/results' as Href);
  }, [openPhotoImportResults, router]);

  const handleOpenPhotoImportProgress = React.useCallback(() => {
    router.push('/find-trips-loading' as Href);
  }, [router]);

  const handleClosePhotoImportCompleteModal = React.useCallback(() => {
    setShowPhotoImportCompleteModal(false);
    setHasDismissedPhotoImportCompleteModal(true);
    closePhotoImportCompleteModal();
    deferPhotoImportResults();
  }, [closePhotoImportCompleteModal, deferPhotoImportResults]);

  const handlePressViewCompletedImportResults = React.useCallback(() => {
    handleOpenPhotoImportResults();
  }, [handleOpenPhotoImportResults]);

  const handlePressTravelStatus = React.useCallback(() => {
    setTravelStatusSheetVisible(true);
  }, []);

  const handleCloseTravelStatusSheet = React.useCallback(() => {
    setTravelStatusSheetVisible(false);
  }, []);

  const reopenTravelStatusSheet = React.useCallback(() => {
    requestAnimationFrame(() => {
      setTravelStatusSheetVisible(true);
    });
  }, []);

  const handlePressEditPeriod = React.useCallback(() => {
    closeSheetThenOpen('date');
  }, [closeSheetThenOpen]);

  const handlePressChangeDestination = React.useCallback(() => {
    closeSheetThenOpen('destination');
  }, [closeSheetThenOpen]);

  const handlePressEndTrip = React.useCallback(() => {
    closeSheetThenOpen('endTrip');
  }, [closeSheetThenOpen]);

  const handleSaveDateRange = React.useCallback((range: {
    startDate: string;
    endDate: string;
    isEndDateUndecided?: boolean;
  }) => {
    setActiveTrip((prev) => ({
      ...prev,
      startDate: range.startDate,
      endDate: range.endDate,
      openEnded: range.isEndDateUndecided ?? false,
      isEndDateUndecided: range.isEndDateUndecided ?? false,
      updatedAt: new Date().toISOString(),
    }));
    setDatePickerVisible(false);
    reopenTravelStatusSheet();
  }, [reopenTravelStatusSheet]);

  const handleSaveDestination = React.useCallback((destination: DestinationOption) => {
    setActiveTrip((prev) => ({
      ...prev,
      destination,
      visitedDestinations: mergeVisitedDestinations(
        prev.visitedDestinations,
        destination.type === 'country' ? [] : [destination],
      ),
      destinationSource: 'manual',
      latitude: undefined,
      longitude: undefined,
      updatedAt: new Date().toISOString(),
    }));
    setDestinationSearchVisible(false);
    reopenTravelStatusSheet();
  }, [reopenTravelStatusSheet]);

  const tripDayCount = Math.max(
    activeTrip.dayNumber,
    getInclusiveDayCount(activeTrip.startDate, activeTrip.endDate),
  );
  const tripDays = React.useMemo(
    () =>
      Array.from({ length: tripDayCount }, (_, index) => ({
        dayNumber: index + 1,
        dateKey: addDaysToDateKey(activeTrip.startDate, index),
      })),
    [activeTrip.startDate, tripDayCount],
  );
  const selectedTripDay = tripDays[selectedTripDayIndex] ?? tripDays[0];
  const selectedDateKey = selectedTripDay?.dateKey ?? activeTrip.startDate;
  const todayDateKey = getTodayDateKey();
  const tripDayLabels = React.useMemo(
    () =>
      tripDays.map((day) =>
        isSameDateKey(day.dateKey, todayDateKey) ? 'TODAY' : `DAY ${day.dayNumber}`,
      ),
    [todayDateKey, tripDays],
  );
  const visibleTimelineItems = React.useMemo(
    () =>
      generateHomeTimelineItemsForDay({
        selectedDateKey,
        // TODO: Pass the selected day's real photo metadata once EXIF/GPS import is connected.
        photos: [],
        fallbackItems: timelineItems.filter((item) => !item.hidden),
      }),
    [selectedDateKey, timelineItems],
  );
  const recordedPhotoCount = visibleTimelineItems.reduce(
    (sum, item) => sum + item.photoCount,
    0,
  );
  const tripTotalStats = React.useMemo(
    () => getTripTotalStats(timelineItems, tripDays),
    [timelineItems, tripDays],
  );
  const isSelectedTripDayToday = isSameDateKey(selectedDateKey, todayDateKey);
  const selectedTimelineTitle = isSelectedTripDayToday
    ? '오늘의 타임라인'
    : `${selectedTripDayIndex + 1}일차 타임라인`;
  const selectedSummaryDateLabel = formatHeroDateLabel(selectedDateKey);
  const selectedSummary = {
    distanceKm: visibleTimelineItems.length > 0 ? todaySummary.distanceKm : 0,
    placeCount: visibleTimelineItems.length,
    photoCount: recordedPhotoCount,
  };

  const handlePressTimelinePlace = React.useCallback((item: TodayTimelineItem) => {
    const timelineItem = item as EditableTimelineItem;
    const firstRecord = timelineItem.records?.[0];

    router.push({
      pathname: '/place-detail',
      params: {
        tripId: activeTrip.destination.id,
        dayId: selectedDateKey,
        placeId: item.id,
        entryPoint: 'activeTripTimeline',
        placeName: item.placeName,
        cityName: item.cityLabel,
        countryName: activeTrip.destination.countryName,
        categoryLabel: item.categoryLabel,
        dateLabel: selectedSummaryDateLabel,
        timeLabel: item.timeLabel,
        recordText: firstRecord?.text,
        photoUris: JSON.stringify(timelineItem.addedPhotoUris ?? []),
      },
    });
  }, [
    activeTrip.destination.countryName,
    activeTrip.destination.id,
    router,
    selectedDateKey,
    selectedSummaryDateLabel,
  ]);

  React.useEffect(() => {
    setSelectedTripDayIndex((prev) => Math.min(prev, Math.max(0, tripDays.length - 1)));
  }, [tripDays.length]);

  const handleSelectPreviousTripDay = React.useCallback(() => {
    setSelectedTripDayIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSelectNextTripDay = React.useCallback(() => {
    setSelectedTripDayIndex((prev) => Math.min(Math.max(0, tripDays.length - 1), prev + 1));
  }, [tripDays.length]);

  const handleRefreshTravelHome = React.useCallback(() => {
    setTravelHomeRefreshing(true);
    requestAnimationFrame(() => {
      setTravelHomeRefreshing(false);
    });
  }, []);

  const scrollScheduleToSelectedDay = React.useCallback(() => {
    const targetY = Math.max(
      0,
      selectedTripDayIndex * SCHEDULE_DAY_ROW_HEIGHT - SCHEDULE_DAY_CENTER_OFFSET,
    );

    scheduleDayScrollRef.current?.scrollTo({
      y: targetY,
      animated: false,
    });
  }, [selectedTripDayIndex]);

  const openScheduleSheet = React.useCallback(() => {
    scheduleSheetTranslateY.setValue(SCHEDULE_SHEET_ENTER_TRANSLATE_Y);
    setScheduleSheetVisible(true);

    requestAnimationFrame(() => {
      scrollScheduleToSelectedDay();

      Animated.timing(scheduleSheetTranslateY, {
        toValue: 0,
        duration: SCHEDULE_SHEET_OPEN_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [scheduleSheetTranslateY, scrollScheduleToSelectedDay]);

  const closeScheduleSheet = React.useCallback(() => {
    Animated.timing(scheduleSheetTranslateY, {
      toValue: SCHEDULE_SHEET_EXIT_TRANSLATE_Y,
      duration: SCHEDULE_SHEET_CLOSE_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setScheduleSheetVisible(false);
      }
    });
  }, [scheduleSheetTranslateY]);

  const handleOpenManualPlaceCreate = React.useCallback(() => {
    setPlaceCreateModalVisible(true);
  }, []);

  const handleCloseManualPlaceCreate = React.useCallback(() => {
    setPlaceCreateModalVisible(false);
  }, []);

  const handleSubmitManualPlace = React.useCallback((input: PlaceCreateInput) => {
    const createdAt = Date.now();
    const photoCount = (input.photoUris?.length ?? 0) + (input.photoSources?.length ?? 0);
    const firstPhotoUri = input.photoUris?.[0];
    const firstPhotoSource = input.photoSources?.[0];
    const placeName = input.placeName ?? input.place;
    const placeId = createPlaceId('manual', selectedDateKey, placeName, createdAt);

    // TODO: Use selected photos' metadata to derive timeLabel and location group.
    // TODO: Persist manually added places and linked photos to Supabase.
    // TODO: Use placeId as the source of truth for timeline-to-place-detail navigation.
    const newTimelineItem: EditableTimelineItem = {
      id: placeId,
      dayDateKey: selectedDateKey,
      timeLabel: input.time ?? formatTimelineFallbackTimeLabel(),
      placeName,
      categoryLabel: input.category ?? '직접 추가',
      cityLabel: input.cityName ?? input.city ?? activeTrip.destination.displayName,
      memoCount: input.text ? 1 : 0,
      photoCount,
      imageSource: firstPhotoSource ?? (firstPhotoUri ? { uri: firstPhotoUri } : currentTrip.heroImage),
      records: input.text
        ? [
            {
              id: `manual-record-${createdAt}`,
              tripId: activeTrip.destination.id,
              dayId: selectedDateKey,
              placeId,
              text: input.text,
              photoIds: input.photoUris,
              createdAt: new Date().toISOString(),
            },
          ]
        : undefined,
      memoEntries: input.text ? [input.text] : undefined,
      addedPhotoUris: input.photoUris,
    };

    setTimelineItems((current) =>
      [...current, newTimelineItem].sort((a, b) => {
        const dayCompare = (a.dayDateKey ?? '').localeCompare(b.dayDateKey ?? '');
        if (dayCompare !== 0) return dayCompare;

        return getTimelineTimeSortMinutes(a.timeLabel) - getTimelineTimeSortMinutes(b.timeLabel);
      }),
    );
    setPlaceCreateModalVisible(false);
  }, [activeTrip.destination.displayName, activeTrip.destination.id, currentTrip.heroImage, selectedDateKey]);

  const handleConfirmEndTrip = React.useCallback(async () => {
    const destinationName = getEnglishLocationLabel(activeTrip.destination);
    const completedEndDate = activeTrip.endDate ?? getTodayDateKey();
    const visitedCities = getUniqueTravelValues(
      activeTrip.visitedDestinations
        .filter((destination) => destination.type !== 'country')
        .map(getEnglishLocationLabel),
    );
    const visitedCountries = getUniqueTravelValues([
      ...activeTrip.visitedDestinations.map(getDestinationCountryName),
      activeTrip.destination.countryName,
    ]);

    if (canUseSupabaseUserData) {
      try {
        await completeTripMutation.mutateAsync();
      } catch (error) {
        console.warn('Failed to complete active trip in Supabase.', error);
        Alert.alert('여행을 종료하지 못했어요.', '잠시 후 다시 시도해주세요.');
        return;
      }
    }

    addSavedCompletedTrip({
      id: `${activeTrip.destination.id}-${activeTrip.startDate}-${completedEndDate}`,
      destinationName,
      countryName: activeTrip.destination.countryName,
      visitedCities,
      visitedCountries,
      startDate: activeTrip.startDate,
      endDate: completedEndDate,
      coverImage: currentTrip.heroImage,
      daysCount: getInclusiveDayCount(activeTrip.startDate, completedEndDate),
      photoCount: tripTotalStats.photoCount,
    });
    setActiveTrip((prev) => ({
      ...prev,
      isRecording: false,
    }));
    setEndTripConfirmVisible(false);
    setTravelStatusSheetVisible(false);
    setEndTripCompleteVisible(true);
  }, [
    activeTrip,
    canUseSupabaseUserData,
    completeTripMutation,
    currentTrip.heroImage,
    tripTotalStats.photoCount,
  ]);

  const handleCloseEndTripComplete = React.useCallback(() => {
    setEndTripCompleteVisible(false);
    setIsTraveling(false);
  }, []);

  const handleViewCompletedTrip = React.useCallback(() => {
    setEndTripCompleteVisible(false);
    setIsTraveling(false);
    router.push('/day-archive-detail' as Href);
  }, [router]);

  const handleCancelDatePicker = React.useCallback(() => {
    setDatePickerVisible(false);
    reopenTravelStatusSheet();
  }, [reopenTravelStatusSheet]);

  const handleCancelDestinationSearch = React.useCallback(() => {
    setDestinationSearchVisible(false);
    reopenTravelStatusSheet();
  }, [reopenTravelStatusSheet]);

  const handleCancelEndTripConfirm = React.useCallback(() => {
    setEndTripConfirmVisible(false);
    setTravelStatusSheetVisible(false);
    setPendingTravelStatusAction(null);
    router.replace('/(tabs)' as Href);
  }, [router]);

  const handlePressStartTripFromIdle = React.useCallback(() => {
    setStartTripConfirmVisible(true);
  }, []);

  const handleCancelStartTripConfirm = React.useCallback(() => {
    setStartTripConfirmVisible(false);
  }, []);

  const handleConfirmStartTrip = React.useCallback(() => {
    setStartTripConfirmVisible(false);
    requestAnimationFrame(() => {
      setStartTripSetupVisible(true);
    });
  }, []);

  const startOpenEndedTrip = React.useCallback((params: {
    destination: DestinationOption;
    destinationSource: DestinationSource;
    latitude?: number;
    longitude?: number;
  }) => {
    const now = new Date().toISOString();
    const today = getTodayDateKey();

    setActiveTrip((prev) => ({
      ...prev,
      destination: params.destination,
      visitedDestinations: mergeVisitedDestinations(
        [],
        params.destination.type === 'country' ? [] : [params.destination],
      ),
      destinationSource: params.destinationSource,
      latitude: params.latitude,
      longitude: params.longitude,
      startDate: today,
      endDate: null,
      openEnded: true,
      isEndDateUndecided: true,
      dayNumber: 1,
      isRecording: true,
      createdAt: now,
      updatedAt: now,
    }));
    setStartTripSetupVisible(false);
    setIsTraveling(true);
  }, []);

  const startTripWithSetup = React.useCallback(async (setup: StartTripSetupValue) => {
    const now = new Date().toISOString();
    const hasSetupDestination = setup.destinationName.trim().length > 0;
    const setupDestination: DestinationOption = hasSetupDestination
      ? {
          id: `manual-${setup.destinationName.toLowerCase().replace(/\s+/g, '-')}`,
          name: setup.destinationName,
          country: setup.countryName,
          displayName: setup.destinationName,
          countryName: setup.countryName,
          type: 'city',
        }
      : createUnknownDestination();
    const setupDestinations = setup.destinations?.length
      ? setup.destinations
      : hasSetupDestination
        ? [setupDestination]
        : [];
    const primaryDestination = setupDestinations[0] ?? setupDestination;
    const destinationCity = getEnglishLocationLabel(primaryDestination);
    const destinationCountry = getEnglishCountryLabel(primaryDestination.countryName);

    if (canUseSupabaseUserData) {
      try {
        await createTripMutation.mutateAsync({
          destinationCity,
          destinationCityKo: primaryDestination.displayName,
          destinationCountry,
          destinationCountryKo: primaryDestination.countryName,
          endDate: setup.endDate,
          isEndDateUndecided: setup.isEndDateUndecided ?? false,
          startDate: setup.startDate,
          status: 'active',
          title: `${destinationCity} 여행`,
        });
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

    setStartTripSetupVisible(false);
    setActiveTrip((prev) => ({
      ...prev,
      destination: primaryDestination,
      visitedDestinations: mergeVisitedDestinations(
        [],
        setupDestinations.filter((destination) => destination.type !== 'country'),
      ),
      startDate: setup.startDate,
      endDate: setup.endDate,
      openEnded: setup.isEndDateUndecided ?? false,
      destinationSource: 'manual',
      latitude: undefined,
      longitude: undefined,
      isEndDateUndecided: setup.isEndDateUndecided ?? false,
      dayNumber: 1,
      isRecording: true,
      createdAt: now,
      updatedAt: now,
    }));
    setIsTraveling(true);
  }, [canUseSupabaseUserData, createTripMutation]);

  const handleCancelStartTripSetup = React.useCallback(() => {
    setStartTripSetupVisible(false);
  }, []);

  const startTripWithoutLocation = React.useCallback(() => {
    startOpenEndedTrip({
      destination: createUnknownDestination(),
      destinationSource: 'unknown',
    });
  }, [startOpenEndedTrip]);

  const startTripThenSelectDestination = React.useCallback(() => {
    startTripWithoutLocation();
    requestAnimationFrame(() => {
      setDestinationSearchVisible(true);
    });
  }, [startTripWithoutLocation]);

  const showQuickStartLocationFallback = React.useCallback(() => {
    Alert.alert(
      '위치를 확인할 수 없어요',
      '여행지를 직접 선택하거나, 위치 없이 시작할 수 있어요.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '위치 없이 시작',
          onPress: startTripWithoutLocation,
        },
        {
          text: '여행지 선택하기',
          onPress: startTripThenSelectDestination,
        },
      ],
    );
  }, [startTripThenSelectDestination, startTripWithoutLocation]);

  const handleQuickStartWithCurrentLocation = React.useCallback(async () => {
    if (isQuickStartingTrip) {
      return;
    }

    setQuickStartingTrip(true);

    try {
      const currentLocation = await resolveCurrentLocationDestination();

      startOpenEndedTrip({
        destination: currentLocation.destination,
        destinationSource: 'currentLocation',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
    } catch {
      showQuickStartLocationFallback();
    } finally {
      setQuickStartingTrip(false);
    }
  }, [isQuickStartingTrip, showQuickStartLocationFallback, startOpenEndedTrip]);

  const statusButtonLabel = activeTrip.isRecording ? '여행 중' : '종료됨';
  const statusBadgeLabel = activeTrip.isRecording ? '여행 기록 중' : '여행 종료됨';
  const statusDotColor = activeTrip.isRecording ? '#D13434' : Colors.foundation.grey500;
  const sheetDateLabel = formatSheetDateLabel(activeTrip.startDate);
  const dateRangeDescription = formatDateRangeDescription(
    activeTrip.startDate,
    activeTrip.endDate,
    activeTrip.isEndDateUndecided,
  );
  const headerLocationLabel = getEnglishLocationLabel(activeTrip.destination);
  const homeHeaderTop = getHomeHeaderTop(insets.top);
  const photoImportResultCount = photoImportCandidates.length;
  const idleRecentTrips = React.useMemo(
    () => supabaseRecentTrips && supabaseRecentTrips.length > 0
      ? mapSupabaseTripsToIdleRecentTrips(supabaseRecentTrips)
      : undefined,
    [supabaseRecentTrips],
  );
  const idleSummaryTrips = React.useMemo(
    () => supabaseTrips && supabaseTrips.length > 0
      ? mapSupabaseTripsToHomeSummaryTrips(supabaseTrips)
      : undefined,
    [supabaseTrips],
  );
  const shouldShowPhotoTripDetectionProgressCard =
    !hasSavedPhotoImportResults &&
    photoImportStatus === 'analyzing' &&
    hasDeferredPhotoImportResults;
  const shouldShowPhotoImportResultsCard =
    !hasSavedPhotoImportResults &&
    !shouldShowPhotoTripDetectionProgressCard &&
    (photoImportHomeFlowStatus === 'completed' ||
      photoImportStatus === 'results_ready' ||
      hasDeferredPhotoImportResults ||
      hasOpenedPhotoImportResults) &&
    (showPhotoImportCompleteModal ||
      hasDismissedPhotoImportCompleteModal ||
      hasDeferredPhotoImportResults ||
      hasOpenedPhotoImportResults);

  useFocusEffect(
    React.useCallback(() => {
      if (!isTraveling) {
        return;
      }

      setStatusBarStyle('light');
      setStatusBarTranslucent(true);
      setStatusBarBackgroundColor('transparent');
    }, [isTraveling]),
  );

  if (!isTraveling) {
    return (
      <>
        <HomeIdleState
          onPressStartTrip={handlePressStartTripFromIdle}
          headerTop={homeHeaderTop}
          isFirstUserEmptyState={isFirstUserEmptyState}
          showPhotoImportResultsCard={shouldShowPhotoImportResultsCard}
          showPhotoTripDetectionProgressCard={shouldShowPhotoTripDetectionProgressCard}
          photoTripDetectionProgress={photoImportProgress}
          photoImportTripCount={photoImportResultCount}
          onPressViewPhotoImportResults={handleOpenPhotoImportResults}
          onPressPhotoTripDetectionProgress={handleOpenPhotoImportProgress}
          showImportCompleteModal={showPhotoImportCompleteModal && !hasSavedPhotoImportResults}
          onCloseImportCompleteModal={handleClosePhotoImportCompleteModal}
          onPressViewImportResults={handlePressViewCompletedImportResults}
          supabaseRecentTrips={idleRecentTrips}
          supabaseSummaryTrips={idleSummaryTrips}
        />
        <PhotoImportSavedModal
          visible={lastSavedTripCount > 0}
          savedTripCount={lastSavedTripCount}
          onClose={dismissPhotoImportSavedModal}
        />
        <StartTripConfirmModal
          visible={isStartTripConfirmVisible}
          onCancel={handleCancelStartTripConfirm}
          onConfirm={handleConfirmStartTrip}
        />
        <StartTripSetupModal
          visible={isStartTripSetupVisible}
          initialValue={DEFAULT_START_TRIP_SETUP}
          onCancel={handleCancelStartTripSetup}
          onSkip={handleQuickStartWithCurrentLocation}
          isQuickStarting={isQuickStartingTrip}
          onStart={startTripWithSetup}
        />
      </>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <View style={styles.travelHomeContent}>
        <View style={styles.hero}>
          <View style={styles.heroImageFrame}>
            <Image
              source={currentTrip.heroImage}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>

          <LinearGradient
            colors={[...HERO_MASK_COLORS]}
            locations={[...HERO_MASK_LOCATIONS]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.heroMask}
          />

          <View style={styles.heroHeaderWrap}>
            <LinearGradient
              colors={[...HEADER_DIM_COLORS]}
              locations={[...HEADER_DIM_LOCATIONS]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.heroHeaderDim}
            />

            <View style={[styles.heroHeader, { top: homeHeaderTop }]}>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={Colors.foundation.white} />
                <Text
                  style={styles.locationLabel}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {headerLocationLabel}
                </Text>
              </View>

              <TravelStatusButton
                backdropImage={currentTrip.heroImage}
                label={statusButtonLabel}
                dotColor={statusDotColor}
                onPress={handlePressTravelStatus}
              />
            </View>
          </View>
        </View>

        <View style={styles.summaryOverlap}>
          <TodaySummary
            distanceKm={selectedSummary.distanceKm}
            placeCount={selectedSummary.placeCount}
            momentCount={selectedSummary.photoCount}
            selectedDayIndex={selectedTripDayIndex}
            totalDays={tripDays.length}
            dayLabels={tripDayLabels}
            selectedDateLabel={selectedSummaryDateLabel}
            isSelectedToday={isSelectedTripDayToday}
            onSelectPreviousDay={selectedTripDayIndex > 0 ? handleSelectPreviousTripDay : undefined}
            onSelectNextDay={
              selectedTripDayIndex < tripDays.length - 1 ? handleSelectNextTripDay : undefined
            }
          />
        </View>

        <TodayTimelineSection
          items={visibleTimelineItems}
          title={selectedTimelineTitle}
          isSelectedToday={isSelectedTripDayToday}
          onPressItem={handlePressTimelinePlace}
          onPressViewAll={openScheduleSheet}
          onPressAddManually={handleOpenManualPlaceCreate}
          refreshControl={
            <RefreshControl
              refreshing={isTravelHomeRefreshing}
              onRefresh={handleRefreshTravelHome}
              tintColor={Colors.foundation.black}
            />
          }
          listContentBottomInset={120 + insets.bottom}
        />
      </View>

      <PlaceCreateModal
        visible={isPlaceCreateModalVisible}
        mode="create"
        tripId={activeTrip.destination.id}
        dayId={selectedDateKey}
        tripDestinationName={activeTrip.destination.displayName}
        tripDestinationCountry={activeTrip.destination.countryName}
        tripLatitude={activeTrip.latitude}
        tripLongitude={activeTrip.longitude}
        onClose={handleCloseManualPlaceCreate}
        onSubmit={handleSubmitManualPlace}
      />

      <Modal
        visible={isScheduleSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={closeScheduleSheet}
      >
        <View style={styles.scheduleSheetOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="전체 일정 닫기"
            style={StyleSheet.absoluteFill}
            onPress={closeScheduleSheet}
          />
          <Animated.View
            style={[
              styles.scheduleSheet,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                transform: [{ translateY: scheduleSheetTranslateY }],
              },
            ]}
          >
            <View style={styles.scheduleSheetHandle} />
            <Text style={styles.scheduleSheetTitle}>전체 일정</Text>
            <ScrollView
              ref={scheduleDayScrollRef}
              style={styles.scheduleDayScroll}
              contentContainerStyle={styles.scheduleDayList}
              showsVerticalScrollIndicator={false}
            >
              {tripDays.map((day, index) => {
                const isSelected = index === selectedTripDayIndex;
                const daySummary = getDayScheduleSummary(
                  timelineItems,
                  day.dateKey,
                  activeTrip.startDate,
                );
                const weekdayLabel = WEEKDAY_LABELS[parseDateKey(day.dateKey).getDay()];
                const dateLabel = formatSheetDateLabel(day.dateKey);
                const isTodayDate = isSameDateKey(day.dateKey, todayDateKey);

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={day.dateKey}
                    onPress={() => {
                      setSelectedTripDayIndex(index);
                      closeScheduleSheet();
                    }}
                    style={[
                      styles.scheduleDayRow,
                      isSelected && styles.scheduleDayRowSelected,
                    ]}
                  >
                    <View style={styles.scheduleDayTextGroup}>
                    <View style={styles.scheduleDayHeaderRow}>
                      <Text
                        style={[
                          styles.scheduleDayTitle,
                          isSelected && styles.scheduleDayTitleSelected,
                        ]}
                      >
                        {day.dayNumber}일차
                      </Text>

                      <Text
                        style={[
                          styles.scheduleDaySubLabel,
                          isSelected && styles.scheduleDaySubLabelSelected,
                        ]}
                      >
                        {dateLabel}
                      </Text>

                      <Text
                        style={[
                          styles.scheduleDaySubLabel,
                          isSelected && styles.scheduleDaySubLabelSelected,
                        ]}
                      >
                        {weekdayLabel}
                      </Text>
                    </View>
                      <View style={styles.scheduleDayMetaRow}>
                        <View style={styles.scheduleDayMetaGroup}>
                          <Text
                            style={[
                              styles.scheduleDayMeta,
                              isSelected && styles.scheduleDayMetaSelected,
                            ]}
                          >
                            {daySummary.placeCount}
                          </Text>
                          <Text
                            style={[
                              styles.scheduleDayMeta,
                              isSelected && styles.scheduleDayMetaSelected,
                            ]}
                          >
                            곳
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.scheduleDayMeta,
                            isSelected && styles.scheduleDayMetaSelected,
                          ]}
                        >
                          ·
                        </Text>
                        <View style={styles.scheduleDayMetaGroup}>
                          <Text
                            style={[
                              styles.scheduleDayMeta,
                              isSelected && styles.scheduleDayMetaSelected,
                            ]}
                          >
                            {daySummary.photoCount}
                          </Text>
                          <Text
                            style={[
                              styles.scheduleDayMeta,
                              isSelected && styles.scheduleDayMetaSelected,
                            ]}
                          >
                            장
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.scheduleDayAccessoryRow}>
                      {isTodayDate && (
                        <View style={styles.scheduleTodayPill}>
                          <Text style={styles.scheduleTodayPillText}>오늘</Text>
                        </View>
                      )}

                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={Colors.foundation.grey500}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <TravelStatusSheet
        visible={isTravelStatusSheetVisible}
        onClose={handleCloseTravelStatusSheet}
        onDismiss={handleTravelStatusSheetDismiss}
        title={`${activeTrip.destination.displayName} 여행`}
        dateLabel={sheetDateLabel}
        weekdayLabel={WEEKDAY_LABELS[parseDateKey(activeTrip.startDate).getDay()]}
        dayLabel={`Day ${activeTrip.dayNumber}`}
        statusLabel={statusBadgeLabel}
        statusDotColor={statusDotColor}
        dateRangeDescription={dateRangeDescription}
        onPressEditPeriod={handlePressEditPeriod}
        onPressChangeDestination={handlePressChangeDestination}
        onPressEndTrip={handlePressEndTrip}
      />

      <TripDatePickerModal
        visible={isDatePickerVisible}
        startDate={activeTrip.startDate}
        endDate={activeTrip.endDate ?? activeTrip.startDate}
        isEndDateUndecided={activeTrip.isEndDateUndecided}
        onCancel={handleCancelDatePicker}
        onSave={handleSaveDateRange}
      />

      <DestinationSearchModal
        visible={isDestinationSearchVisible}
        currentDestination={activeTrip.destination}
        onCancel={handleCancelDestinationSearch}
        onSave={handleSaveDestination}
      />

      <EndTripConfirmModal
        visible={isEndTripConfirmVisible}
        photoCount={tripTotalStats.photoCount}
        placeCount={tripTotalStats.placeCount}
        momentCount={tripTotalStats.recordCount}
        onCancel={handleCancelEndTripConfirm}
        onConfirm={handleConfirmEndTrip}
      />

      <EndTripCompleteModal
        visible={isEndTripCompleteVisible}
        destinationName={activeTrip.destination.displayName}
        dateRangeDescription={dateRangeDescription}
        photoCount={tripTotalStats.photoCount}
        placeCount={tripTotalStats.placeCount}
        momentCount={tripTotalStats.recordCount}
        onClose={handleCloseEndTripComplete}
        onViewMyTrips={handleViewCompletedTrip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WARM_WHITE,
  },
  travelHomeContent: {
    flex: 1,
    backgroundColor: WARM_WHITE,
  },
  hero: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
    backgroundColor: WARM_WHITE,
  },
  heroImageFrame: {
    position: 'absolute',
    top: HERO_IMAGE_FRAME_TOP,
    left: 0,
    right: 0,
    height: HERO_IMAGE_FRAME_HEIGHT,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    top: HERO_IMAGE_TOP,
    left: 0,
    right: 0,
    width: '100%',
    height: HERO_IMAGE_HEIGHT,
  },
  heroMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: HERO_MASK_TOP,
    height: HERO_MASK_HEIGHT,
    zIndex: 1,
  },
  heroHeaderWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_DIM_HEIGHT,
    zIndex: 2,
  },
  heroHeaderDim: {
    ...StyleSheet.absoluteFillObject,
  },
  heroHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
  },
  locationRow: {
    flex: 1,
    minWidth: 0,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 12,
    zIndex: 1,
  },
  locationLabel: {
    flexShrink: 1,
    minWidth: 0,
    height: 24,
    fontFamily: FIGMA_POINT_EN,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: Colors.foundation.white,
  },
  summaryOverlap: {
    minHeight: SUMMARY_HEIGHT,
    marginTop: -SUMMARY_OVERLAP,
    marginHorizontal: 27,
    marginBottom: 28,
  },
  scheduleSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  scheduleSheet: {
    maxHeight: '72%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.foundation.white,
  },
  scheduleSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: Colors.foundation.grey100,
  },
  scheduleSheetTitle: {
    marginTop: 20,
    marginBottom: 16,
    ...Typography.title2,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  scheduleDayList: {
    gap: 8,
    paddingBottom: 8,
  },
  scheduleDayScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scheduleDayRow: {
    minHeight: 60,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleDayRowSelected: {
    backgroundColor: '#E9E9E9',
  },
  scheduleDayAccessoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  scheduleDayTextGroup: {
    gap: 2,
  },
  scheduleDayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scheduleDayTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  scheduleDayTitleSelected: {
    color: Colors.foundation.black,
  },
  scheduleDaySubLabel: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
  },
  scheduleDaySubLabelSelected: {
    color: Colors.foundation.grey800,
  },
  scheduleTodayPill: {
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.grey800,
  },
  scheduleTodayPillText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: Colors.foundation.white,
  },
  scheduleDayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scheduleDayMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  scheduleDayMeta: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey500,
  },
  scheduleDayMetaSelected: {
    color: Colors.foundation.grey800,
  },
});
