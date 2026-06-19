/**
 * Home based on Figma Home_Component / node 1941:2308.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Alert,
  Image,
  InteractionManager,
  Platform,
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
import TripDatePickerModal from '@/components/home/TripDatePickerModal';
import TravelStatusButton from '@/components/home/TravelStatusButton';
import TravelStatusSheet from '@/components/home/TravelStatusSheet';
import TodaySummary from '@/components/trip/TodaySummary';
import { HOME_MOCK_DATA } from '@/constants/mockHome';
import { HOME_TIMELINE_ITEMS } from '@/constants/mockHomeTimeline';
import type { DestinationOption } from '@/constants/mockTripDestinations';
import { addSavedCompletedTrip } from '@/constants/savedMyPageTrips';
import { Colors, Typography } from '@/constants/theme';
import { usePhotoImportFlow } from '@/hooks/usePhotoImportFlow';

const HERO_HEIGHT = 336;
const HERO_IMAGE_FRAME_TOP = -139;
const HERO_IMAGE_FRAME_HEIGHT = 508;
const HERO_IMAGE_TOP = 8;
const HERO_IMAGE_HEIGHT = 492;
const HEADER_HEIGHT = 52;
const HEADER_DIM_HEIGHT = 129;
const HERO_MASK_TOP = 180;
const HERO_MASK_HEIGHT = HERO_HEIGHT - HERO_MASK_TOP;
const SUMMARY_HEIGHT = 104;
const WARM_WHITE = Colors.warm.white;
const FIGMA_POINT_EN = 'Sansita Swashed';

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
  'city-paris-fr': 'Paris',
  'country-france': 'France',
  'city-kyoto-jp': 'Kyoto',
  'country-japan': 'Japan',
  paris: 'Paris',
  프랑스: 'France',
  france: 'France',
  교토: 'Kyoto',
  kyoto: 'Kyoto',
  일본: 'Japan',
  japan: 'Japan',
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
  미국: 'United States',
};

type PendingTravelStatusAction = 'date' | 'destination' | 'endTrip' | null;
type PhotoImportHomeFlowStatus = 'idle' | 'analyzing' | 'completed';
type DestinationSource = 'currentLocation' | 'manual' | 'unknown';

interface ActiveTripState {
  destination: DestinationOption;
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
  hidden?: boolean;
  records?: PlaceRecord[];
  memoEntries?: string[];
  addedPhotoUris?: string[];
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

const INITIAL_ACTIVE_TRIP: ActiveTripState = {
  destination: {
    id: 'city-paris-fr',
    name: 'Paris',
    country: 'France',
    displayName: 'Paris',
    countryName: 'France',
    type: 'city',
  },
  startDate: '2025-11-02',
  endDate: '2025-11-12',
  openEnded: false,
  destinationSource: 'manual',
  isEndDateUndecided: false,
  dayNumber: 1,
  isRecording: true,
};

const DEFAULT_START_TRIP_SETUP: StartTripSetupValue = {
  destinationName: '시드니',
  countryName: '호주',
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

function formatSheetDateLabel(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getInclusiveDayCount(startDate: string, endDate: string | null): number {
  const start = parseDateKey(startDate).getTime();
  const end = parseDateKey(endDate ?? startDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end - start) / dayMs) + 1);
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
    destination.id,
    destination.displayName,
    destination.countryName,
  ];

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

  const koreanCityLabels: Array<[string, string]> = [
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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    photoImportPreview?: string;
  }>();
  const { currentTrip, todaySummary } = HOME_MOCK_DATA;
  const {
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
  const [timelineItems] =
    React.useState<EditableTimelineItem[]>(HOME_TIMELINE_ITEMS);

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

  const handlePressTimelinePlace = React.useCallback((item: TodayTimelineItem) => {
    router.push({
      pathname: '/place-detail',
      params: {
        tripId: 'active-paris-trip',
        dayId: `active-paris-day-${activeTrip.dayNumber}`,
        placeId: item.id,
        entryPoint: 'activeTripTimeline',
      },
    });
  }, [activeTrip.dayNumber, router]);

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
      destinationSource: 'manual',
      latitude: undefined,
      longitude: undefined,
      updatedAt: new Date().toISOString(),
    }));
    setDestinationSearchVisible(false);
    reopenTravelStatusSheet();
  }, [reopenTravelStatusSheet]);

  const visibleTimelineItems = React.useMemo(
    () => timelineItems.filter((item) => !item.hidden),
    [timelineItems],
  );

  const recordedPhotoCount = visibleTimelineItems.reduce(
    (sum, item) => sum + item.photoCount,
    0,
  );
  const visibleTimelineRecordCount = visibleTimelineItems.reduce(
    (sum, item) => sum + item.memoCount,
    0,
  );

  const handleConfirmEndTrip = React.useCallback(() => {
    const destinationName = getEnglishLocationLabel(activeTrip.destination);
    const completedEndDate = activeTrip.endDate ?? getTodayDateKey();

    addSavedCompletedTrip({
      id: `${activeTrip.destination.id}-${activeTrip.startDate}-${completedEndDate}`,
      destinationName,
      countryName: activeTrip.destination.countryName,
      startDate: activeTrip.startDate,
      endDate: completedEndDate,
      coverImage: currentTrip.heroImage,
      daysCount: getInclusiveDayCount(activeTrip.startDate, completedEndDate),
      photoCount: recordedPhotoCount,
    });
    setActiveTrip((prev) => ({
      ...prev,
      isRecording: false,
    }));
    setEndTripConfirmVisible(false);
    setTravelStatusSheetVisible(false);
    setEndTripCompleteVisible(true);
  }, [activeTrip, currentTrip.heroImage, recordedPhotoCount]);

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
    reopenTravelStatusSheet();
  }, [reopenTravelStatusSheet]);

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

  const startTripWithSetup = React.useCallback((setup: StartTripSetupValue) => {
    const now = new Date().toISOString();

    setStartTripSetupVisible(false);
    setActiveTrip((prev) => ({
      ...prev,
      destination: {
        id: `manual-${setup.destinationName.toLowerCase().replace(/\s+/g, '-')}`,
        name: setup.destinationName,
        country: setup.countryName,
        displayName: setup.destinationName,
        countryName: setup.countryName,
        type: 'city',
      },
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
  }, []);

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
  const heroDateLabel = formatHeroDateLabel(activeTrip.startDate);
  const sheetDateLabel = formatSheetDateLabel(activeTrip.startDate);
  const dateRangeDescription = formatDateRangeDescription(
    activeTrip.startDate,
    activeTrip.endDate,
    activeTrip.isEndDateUndecided,
  );
  const headerLocationLabel = getEnglishLocationLabel(activeTrip.destination);
  const homeHeaderTop = getHomeHeaderTop(insets.top);
  const photoImportResultCount = photoImportCandidates.length;
  const shouldShowPhotoImportResultsCard =
    !hasSavedPhotoImportResults &&
    (photoImportHomeFlowStatus === 'completed' ||
      hasDeferredPhotoImportResults ||
      hasOpenedPhotoImportResults) &&
    (showPhotoImportCompleteModal ||
      hasDismissedPhotoImportCompleteModal ||
      hasDeferredPhotoImportResults ||
      hasOpenedPhotoImportResults);

  if (!isTraveling) {
    return (
      <>
        <HomeIdleState
          onPressStartTrip={handlePressStartTripFromIdle}
          headerTop={homeHeaderTop}
          isFirstUserEmptyState={isFirstUserEmptyState}
          showPhotoImportResultsCard={shouldShowPhotoImportResultsCard}
          photoImportTripCount={photoImportResultCount}
          onPressViewPhotoImportResults={handleOpenPhotoImportResults}
          showImportCompleteModal={showPhotoImportCompleteModal && !hasSavedPhotoImportResults}
          onCloseImportCompleteModal={handleClosePhotoImportCompleteModal}
          onPressViewImportResults={handlePressViewCompletedImportResults}
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
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
                <Text style={styles.locationLabel}>{headerLocationLabel}</Text>
              </View>

              <View style={styles.headerCenter}>
                <Text style={styles.dayLabel}>Day {activeTrip.dayNumber}</Text>
                <Text style={styles.dateLabel}>{heroDateLabel}</Text>
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
            distanceKm={todaySummary.distanceKm}
            placeCount={todaySummary.visitedPlacesCount}
            momentCount={visibleTimelineRecordCount}
          />
        </View>

        <TodayTimelineSection
          items={visibleTimelineItems}
          onPressItem={handlePressTimelinePlace}
        />
      </ScrollView>

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
        photoCount={recordedPhotoCount}
        placeCount={todaySummary.visitedPlacesCount}
        momentCount={todaySummary.recordedMomentsCount}
        onCancel={handleCancelEndTripConfirm}
        onConfirm={handleConfirmEndTrip}
      />

      <EndTripCompleteModal
        visible={isEndTripCompleteVisible}
        destinationName={activeTrip.destination.displayName}
        dateRangeDescription={dateRangeDescription}
        photoCount={recordedPhotoCount}
        placeCount={todaySummary.visitedPlacesCount}
        momentCount={todaySummary.recordedMomentsCount}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
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
  },
  locationRow: {
    width: 90,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  locationLabel: {
    maxWidth: 70,
    height: 24,
    fontFamily: FIGMA_POINT_EN,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: Colors.foundation.white,
  },
  headerCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {
    ...Typography.title2,
    color: Colors.foundation.white,
    textAlign: 'center',
  },
  dateLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
  },
  summaryOverlap: {
    minHeight: SUMMARY_HEIGHT,
    marginTop: -SUMMARY_HEIGHT,
    marginHorizontal: 27,
    marginBottom: 32,
  },
});
