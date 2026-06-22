/**
 * day-archive-detail
 * Figma: 506:704
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image as RNImage,
  Platform,
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
import MapPlaceholderCard from '@/components/common/MapPlaceholderCard';
import ScreenHeader from '@/components/nav/ScreenHeader';
import DaySelectorSheet, { type DaySelectorItem } from '@/components/record/DaySelectorSheet';
import DayCard from '@/components/trip/DayCard';
import PlaceEntryCard, { type PlaceEntry } from '@/components/trip/PlaceEntryCard';
import TravelStatsCard from '@/components/trip/TravelStatsCard';
import {
  ARCHIVE_DAY_OPTIONS,
  MOCK_ARCHIVE_DETAIL,
  formatArchiveDayLabel,
  toPlaceEntries,
} from '@/constants/mockArchiveDetail';
import { FontFamily, Spacing } from '@/constants/theme';

/** Figma 506:704 — scroll content starts below status bar(59) + header(40) */
const SCROLL_ORIGIN_Y = 99;

/** Figma y positions (header 아래 요소 상향 조정 반영) */
const FIGMA_Y = {
  blurTop: 92,
  blurHeight: 745,
  parisTop: 134,
  photoFrameTop: 199,
  dayCardTop: 810,
} as const;

const BLUR_TOP = FIGMA_Y.blurTop - SCROLL_ORIGIN_Y;
const BLUR_HEIGHT = FIGMA_Y.blurHeight;
const PARIS_TOP = FIGMA_Y.parisTop - SCROLL_ORIGIN_Y;
const PHOTO_FRAME_TOP = FIGMA_Y.photoFrameTop - SCROLL_ORIGIN_Y;
const HERO_HEIGHT = FIGMA_Y.dayCardTop - 10 - SCROLL_ORIGIN_Y;
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
    dateLabel: '2025.8.25',
    weekdayLabel: '월',
    photoCount: 0,
  };
}

function getEntryPlaceId(entry: PlaceEntry): string {
  return entry.googlePlaceId ?? entry.id;
}

export default function DayArchiveDetailScreen() {
  const router = useRouter();
  const { dayId, dayNumber } = useLocalSearchParams<{
    tripId?: string;
    dayId?: string;
    dayNumber?: string;
    placeId?: string;
  }>();
  const { width: screenWidth } = useWindowDimensions();
  const detail = MOCK_ARCHIVE_DETAIL;
  const entries = useMemo(() => toPlaceEntries(detail.places), [detail.places]);
  const [selectedDay, setSelectedDay] = useState<DaySelectorItem>(() =>
    resolveInitialArchiveDay(dayId, dayNumber),
  );
  const [sheetVisible, setSheetVisible] = useState(false);

  const photoFrameLeft = (screenWidth - PHOTO_FRAME_WIDTH) / 2;
  const parisLeft = (screenWidth - PARIS_WIDTH) / 2 + PARIS_OFFSET_X;

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

  const showArchiveQuickAction = (label: string) => {
    Alert.alert(label, '저장된 여행 편집 기능으로 연결될 예정입니다.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader onBackPress={() => router.back()} style={styles.header} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
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

          <Text
            style={[
              styles.parisTitle,
              { left: parisLeft, top: PARIS_TOP - PARIS_CLIP_PADDING_TOP },
            ]}
          >
            {detail.heroTitle}
          </Text>
        </View>

        <View style={styles.dayStatsRow}>
          <DayCard
            align="left"
            dayNumber={selectedDay.dayNumber}
            date={formatArchiveDayLabel(selectedDay)}
            onPress={() => setSheetVisible(true)}
            style={styles.dayCard}
          />
          <TravelStatsCard
            placeCount={detail.stats.placeCount}
            distanceKm={detail.stats.distanceKm}
            style={styles.travelStatsCard}
          />
        </View>

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
                onQuickEdit={() => showArchiveQuickAction('장소 정보 수정')}
                onQuickAddPhoto={() => showArchiveQuickAction('사진 추가')}
                onQuickDelete={() => showArchiveQuickAction('장소 삭제')}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <DaySelectorSheet
        visible={sheetVisible}
        days={ARCHIVE_DAY_OPTIONS}
        selectedId={selectedDay.id}
        onSelectDay={(day) => {
          setSelectedDay(day);
          setSheetVisible(false);
        }}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9F5F3',
  },
  header: {
    width: '100%',
    backgroundColor: '#F9F5F3',
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
    backgroundColor: '#F9F5F3',
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
    color: '#000000',
    textAlign: 'center',
  },
  frameImage: {
    position: 'absolute',
    top: FRAME_IMAGE_TOP,
    left: FRAME_IMAGE_LEFT,
    width: FRAME_IMAGE_WIDTH,
    height: FRAME_IMAGE_HEIGHT,
  },
  parisTitle: {
    position: 'absolute',
    width: PARIS_WIDTH,
    height: PARIS_HEIGHT,
    paddingTop: PARIS_CLIP_PADDING_TOP,
    fontFamily: FontFamily.prata,
    fontSize: 96,
    lineHeight: 112,
    color: '#000000',
    includeFontPadding: true,
    overflow: 'visible',
    textAlign: 'left',
    textAlignVertical: 'top',
    zIndex: 2,
  },
  dayStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: Spacing.xl,
    paddingRight: 23,
    marginTop: 10,
  },
  dayCard: {
    width: 98,
  },
  travelStatsCard: {
    marginTop: 12,
  },
  recordSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: 20,
    gap: 28,
  },
  entries: {
    gap: 40,
  },
});
