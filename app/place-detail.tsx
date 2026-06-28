import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AppTextInput from '@/components/common/AppTextInput';
import Text from '@/components/common/AppText';
import FullScreenImageViewer from '@/components/common/FullScreenImageViewer';
import TimeWheelPickerModal from '@/components/record/TimeWheelPickerModal';
import {
  getMockPlaceDetail,
  type PlaceDetailPhoto,
  type PlaceDetailRecord,
  type PlaceDetailData,
} from '@/constants/mockPlaceDetails';
import { MOCK_ARCHIVE_DETAIL } from '@/constants/mockArchiveDetail';
import { RECORD_DAY_ENTRIES } from '@/constants/mockRecordDayDetail';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import {
  convertDateToPlaceEntryTime,
  formatPlaceEntryTime,
  parsePlaceEntryTime,
} from '@/utils/placeEntryTime';

type PlaceDetailRouteParams = {
  tripId?: string;
  dayId?: string;
  placeId?: string;
  entryPoint?: 'dailyMoment' | 'activeTripTimeline' | 'recordDayDetail' | 'archiveDayDetail';
  openPhotoGrid?: string;
  photoGridMode?: 'viewOnly' | 'recordCreate';
  photoSourceIndexes?: string;
  placeName?: string;
  cityName?: string;
  countryName?: string;
  categoryLabel?: string;
  dateLabel?: string;
  timeLabel?: string;
  recordText?: string;
  photoUris?: string;
};

const DESTRUCTIVE = '#D13434';
const DATE_LABEL_PATTERN = /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})(?:\s*(.*))?$/;

function makePhotoId() {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCurrentTimeLabel() {
  return formatPlaceEntryTime(convertDateToPlaceEntryTime(new Date()));
}

function formatSpacedDateLabel(label?: string) {
  const trimmedLabel = label?.trim();

  if (!trimmedLabel) {
    return '';
  }

  const matched = trimmedLabel.match(DATE_LABEL_PATTERN);

  if (!matched) {
    return trimmedLabel;
  }

  const suffix = matched[4]?.trim();
  return `${matched[1]}. ${Number(matched[2])}. ${Number(matched[3])}${suffix ? ` ${suffix}` : ''}`;
}

function getRecordSortValue(record: PlaceDetailRecord) {
  return new Date(record.createdAt).getTime();
}

function getParamValue(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseRoutePhotoUris(photoUris?: string | string[]): string[] {
  const rawValue = getParamValue(photoUris);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.filter((uri): uri is string => typeof uri === 'string' && uri.length > 0)
      : [];
  } catch {
    return [];
  }
}

function parseNumberArrayParam(value?: string | string[]): number[] {
  const rawValue = getParamValue(value);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is number => Number.isInteger(item) && item >= 0)
      : [];
  } catch {
    return [];
  }
}

function getSerializablePhotoUris(photos: PlaceDetailPhoto[]): string[] {
  return photos
    .map((photo) => (
      typeof photo.source === 'object' && photo.source && 'uri' in photo.source
        ? photo.source.uri
        : undefined
    ))
    .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);
}

function getRecordDayEntry(placeId?: string) {
  if (!placeId) {
    return undefined;
  }

  return RECORD_DAY_ENTRIES.find((entry) => (
    entry.id === placeId || entry.googlePlaceId === placeId
  ));
}

function getArchiveDayPlace(placeId?: string) {
  if (!placeId) {
    return undefined;
  }

  return MOCK_ARCHIVE_DETAIL.places.find((place) => place.id === placeId);
}

function createRecordDayFallbackDetail(params: PlaceDetailRouteParams): PlaceDetailData | undefined {
  const isRecordOrArchiveEntry =
    params.entryPoint === 'recordDayDetail' || params.entryPoint === 'archiveDayDetail';
  const canUseTimelineFallback =
    params.entryPoint === 'activeTripTimeline' &&
    Boolean(params.placeId) &&
    Boolean(getParamValue(params.placeName));

  if ((!isRecordOrArchiveEntry && !canUseTimelineFallback) || !params.placeId) {
    return undefined;
  }

  const recordEntry = getRecordDayEntry(params.placeId);
  const archivePlace = getArchiveDayPlace(params.placeId);
  const routePhotoUris = parseRoutePhotoUris(params.photoUris);
  const routePhotoSourceIndexes = parseNumberArrayParam(params.photoSourceIndexes);
  const hasRoutePhotoSourceIndexes = getParamValue(params.photoSourceIndexes) !== undefined;
  const recordPhotoSources = recordEntry?.photoSources ?? [];
  const recordPhotoSourceEntries = routePhotoSourceIndexes.length > 0
    ? routePhotoSourceIndexes
      .map((sourceIndex) => ({ source: recordPhotoSources[sourceIndex], sourceIndex }))
      .filter((entry): entry is { source: ImageSourcePropType; sourceIndex: number } => Boolean(entry.source))
    : hasRoutePhotoSourceIndexes
      ? []
      : recordPhotoSources.map((source, sourceIndex) => ({ source, sourceIndex }));
  const photos: PlaceDetailPhoto[] = [
    ...recordPhotoSourceEntries.map(({ source, sourceIndex }) => ({
      id: `${params.placeId}-source-${sourceIndex}`,
      source,
    })),
    ...(archivePlace?.images ?? []).map((source, index) => ({
      id: `${params.placeId}-archive-${index}`,
      source,
    })),
    ...routePhotoUris.map((uri, index) => ({
      id: `${params.placeId}-uri-${index}`,
      source: { uri },
    })),
  ];
  const firstPhotoId = photos[0]?.id;
  const recordText = (
    getParamValue(params.recordText)
    ?? recordEntry?.text
    ?? archivePlace?.records?.[0]
    ?? archivePlace?.memo
  )?.trim();
  const records: PlaceDetailRecord[] = recordText
    ? [
      {
        id: `${params.placeId}-record-1`,
        tripId: params.tripId ?? (params.entryPoint === 'archiveDayDetail' ? MOCK_ARCHIVE_DETAIL.id : 'record-trip'),
        dayId: params.dayId ?? (params.entryPoint === 'archiveDayDetail' ? 'archive-day-1' : 'record-day'),
        placeId: params.placeId,
        time: getParamValue(params.timeLabel) ?? recordEntry?.time ?? archivePlace?.timeLabel,
        text: recordText,
        photoIds: firstPhotoId ? [firstPhotoId] : [],
        createdAt: new Date(0).toISOString(),
      },
    ]
    : [];

  return {
    // TODO: Generate place detail records from photo metadata groups when media analysis is connected.
    // TODO: Use placeId as the source of truth for timeline-to-place-detail navigation.
    tripId: params.tripId ?? (params.entryPoint === 'archiveDayDetail' ? MOCK_ARCHIVE_DETAIL.id : 'record-trip'),
    dayId: params.dayId ?? (params.entryPoint === 'archiveDayDetail' ? 'archive-day-1' : 'record-day'),
    placeId: params.placeId,
    placeName: getParamValue(params.placeName) ?? recordEntry?.place ?? archivePlace?.name ?? '',
    cityName: getParamValue(params.cityName) ?? recordEntry?.city ?? archivePlace?.city ?? '',
    countryName: getParamValue(params.countryName) ?? (archivePlace ? MOCK_ARCHIVE_DETAIL.country : ''),
    dateLabel: getParamValue(params.dateLabel) ?? MOCK_ARCHIVE_DETAIL.selectedDay.dateLabel ?? '',
    timeLabel: getParamValue(params.timeLabel) ?? recordEntry?.time ?? archivePlace?.timeLabel,
    categoryLabel: getParamValue(params.categoryLabel) ?? recordEntry?.category ?? archivePlace?.category,
    tripName: params.entryPoint === 'archiveDayDetail'
      ? MOCK_ARCHIVE_DETAIL.heroTitle
      : params.entryPoint === 'activeTripTimeline'
        ? (getParamValue(params.cityName) ?? getParamValue(params.placeName) ?? 'Active Trip')
        : 'Record Trip',
    tripDateRange: params.entryPoint === 'archiveDayDetail'
      ? MOCK_ARCHIVE_DETAIL.dateRangeLabel
      : getParamValue(params.dateLabel) ?? '',
    photos,
    records,
  };
}

export default function PlaceDetailScreen() {
  const params = useLocalSearchParams<PlaceDetailRouteParams>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const screenWidth = Math.max(320, width);

  const initialDetail = React.useMemo(
    () => (
      getMockPlaceDetail(params.tripId, params.dayId, params.placeId)
      ?? createRecordDayFallbackDetail(params)
    ),
    [params],
  );

  const [placeName] = React.useState(initialDetail?.placeName ?? '');
  const [photos, setPhotos] = React.useState<PlaceDetailPhoto[]>(initialDetail?.photos ?? []);
  const [records, setRecords] = React.useState<PlaceDetailRecord[]>(
    [...(initialDetail?.records ?? [])].sort((a, b) => getRecordSortValue(a) - getRecordSortValue(b)),
  );
  const [heroIndex, setHeroIndex] = React.useState(0);
  const [isMoreOpen, setMoreOpen] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState(0);
  const [viewerPhotoIds, setViewerPhotoIds] = React.useState<string[] | null>(null);
  const [isViewerViewOnly, setViewerViewOnly] = React.useState(false);
  const [shouldReopenGridAfterViewer, setShouldReopenGridAfterViewer] = React.useState(false);
  const [isViewerOpen, setViewerOpen] = React.useState(false);
  const [isGridOpen, setGridOpen] = React.useState(false);
  const [isGridViewOnly, setGridViewOnly] = React.useState(false);
  const [isGridSelectionInitiallyEnabled, setGridSelectionInitiallyEnabled] = React.useState(false);
  const [gridSelectionPurpose, setGridSelectionPurpose] = React.useState<'recordCreate' | 'linkRecord'>('recordCreate');
  const [isRecordModalOpen, setRecordModalOpen] = React.useState(false);
  const [recordModalMode, setRecordModalMode] = React.useState<'sheet' | 'screen'>('sheet');
  const [selectedRecordPhotoIds, setSelectedRecordPhotoIds] = React.useState<string[]>([]);
  const [recordDraft, setRecordDraft] = React.useState('');
  const [recordTimeLabel, setRecordTimeLabel] = React.useState(initialDetail?.timeLabel ?? '');
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [isPhotoDeleteConfirmOpen, setPhotoDeleteConfirmOpen] = React.useState(false);
  const [pendingDeletePhotoIds, setPendingDeletePhotoIds] = React.useState<string[]>([]);
  const [gridSelectionResetSignal, setGridSelectionResetSignal] = React.useState(0);

  React.useEffect(() => {
    if (params.openPhotoGrid === '1' && initialDetail) {
      setGridViewOnly(params.photoGridMode !== 'recordCreate');
      setGridSelectionInitiallyEnabled(false);
      setGridOpen(true);
    }
  }, [initialDetail, params.openPhotoGrid, params.photoGridMode]);

  const viewerPhotos = React.useMemo<PlaceDetailPhoto[]>(() => {
    if (!viewerPhotoIds) {
      return photos;
    }

    const scopedPhotos = viewerPhotoIds
      .map((photoId) => photos.find((photo) => photo.id === photoId))
      .filter((photo): photo is PlaceDetailPhoto => Boolean(photo));

    return scopedPhotos.length > 0 ? scopedPhotos : photos;
  }, [photos, viewerPhotoIds]);

  const viewerImages = React.useMemo<ImageSourcePropType[]>(
    () => viewerPhotos.map((photo) => photo.source),
    [viewerPhotos],
  );
  const selectedRecordPhotos = React.useMemo(
    () => selectedRecordPhotoIds
      .map((photoId) => photos.find((photo) => photo.id === photoId))
      .filter((photo): photo is PlaceDetailPhoto => Boolean(photo)),
    [photos, selectedRecordPhotoIds],
  );

  if (!initialDetail) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()} style={styles.headerButton}>
            <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>장소를 찾을 수 없어요</Text>
          <Text style={styles.emptyDescription}>이전 화면으로 돌아가 다시 시도해 주세요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const openViewer = (index: number, photoIds?: string[], viewOnly = false) => {
    const nextViewerPhotos = photoIds
      ? photoIds
        .map((photoId) => photos.find((photo) => photo.id === photoId))
        .filter((photo): photo is PlaceDetailPhoto => Boolean(photo))
      : photos;

    if (nextViewerPhotos.length === 0) {
      return;
    }

    setViewerPhotoIds(photoIds ?? null);
    setViewerViewOnly(viewOnly);
    setViewerIndex(Math.max(0, Math.min(index, nextViewerPhotos.length - 1)));
    setViewerOpen(true);
  };

  const openPhotoGrid = (selectionMode = false, viewOnly = false) => {
    setGridViewOnly(viewOnly);
    setGridSelectionInitiallyEnabled(selectionMode);
    setGridOpen(true);
  };

  const handleClosePhotoGrid = () => {
    if (gridSelectionPurpose === 'linkRecord') {
      setGridOpen(false);
      setGridSelectionPurpose('recordCreate');
      requestAnimationFrame(() => setRecordModalOpen(true));
      return;
    }

    if (params.entryPoint === 'recordDayDetail' && params.openPhotoGrid === '1') {
      const remainingPhotoIds = new Set(photos.map((photo) => photo.id));
      const deletedSourceIndexes = initialDetail.photos
        .map((photo) => {
          const matched = photo.id.match(/-source-(\d+)$/);
          return matched && !remainingPhotoIds.has(photo.id) ? Number(matched[1]) : undefined;
        })
        .filter((index): index is number => Number.isInteger(index));

      setGridSelectionInitiallyEnabled(false);
      setGridViewOnly(false);
      router.replace({
        pathname: '/record-day-detail',
        params: {
          tripId: params.tripId ?? initialDetail.tripId,
          dayId: params.dayId ?? initialDetail.dayId,
          updatedPlaceId: initialDetail.placeId,
          updatedPhotoUris: JSON.stringify(getSerializablePhotoUris(photos)),
          deletedSourceIndexes: JSON.stringify(deletedSourceIndexes),
        },
      });
      return;
    }

    if (params.entryPoint === 'archiveDayDetail' && params.openPhotoGrid === '1') {
      setGridSelectionInitiallyEnabled(false);
      setGridViewOnly(false);
      router.replace({
        pathname: '/day-archive-detail',
        params: {
          dayId: params.dayId ?? initialDetail.dayId,
        },
      });
      return;
    }

    setGridOpen(false);
  };

  const openRecordComposer = (photoIds: string[], mode: 'sheet' | 'screen') => {
    setSelectedRecordPhotoIds(photoIds);
    setRecordModalMode(mode);
    setRecordDraft('');
    setRecordTimeLabel(createCurrentTimeLabel());
    setRecordModalOpen(true);
  };

  const handleHeroScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setHeroIndex(Math.round(event.nativeEvent.contentOffset.x / screenWidth));
  };

  const handleAddPhoto = async () => {
    setMoreOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    const addedPhotos = result.assets.map((asset) => ({
      id: makePhotoId(),
      source: { uri: asset.uri },
    }));

    setPhotos((currentPhotos) => [...currentPhotos, ...addedPhotos]);
  };

  const handleSaveRecord = () => {
    const trimmedText = recordDraft.trim();
    if (!trimmedText) {
      return;
    }

    setRecords((currentRecords) => [
      ...currentRecords,
      {
        id: `record-${Date.now()}`,
        tripId: initialDetail.tripId,
        dayId: initialDetail.dayId,
        placeId: initialDetail.placeId,
        time: recordTimeLabel,
        text: trimmedText,
        photoIds: selectedRecordPhotoIds,
        createdAt: new Date().toISOString(),
      },
    ]);
    setRecordDraft('');
    setSelectedRecordPhotoIds([]);
    setRecordTimeLabel(createCurrentTimeLabel());
    setRecordModalOpen(false);
    setViewerOpen(false);
    setGridOpen(false);
  };

  const handlePressAddRecord = () => {
    setMoreOpen(false);
    openRecordComposer([], 'sheet');
  };

  const handleOpenRecordPhotoPicker = () => {
    setGridSelectionPurpose('linkRecord');
    setGridViewOnly(false);
    setGridSelectionInitiallyEnabled(true);
    setRecordModalOpen(false);
    requestAnimationFrame(() => setGridOpen(true));
  };

  const handleUnlinkRecordPhoto = (photoId: string) => {
    setSelectedRecordPhotoIds((currentIds) => currentIds.filter((id) => id !== photoId));
  };

  const handlePressEditPlace = () => {
    setMoreOpen(false);
    // TODO: Reuse the record-day-detail place search modal here when it is extracted as a shared component.
    Alert.alert('장소 정보 수정', '장소 검색 모달로 연결할 예정입니다.');
  };

  const handlePressChangeCover = () => {
    setMoreOpen(false);
    if (photos.length <= 1) {
      return;
    }

    setPhotos((currentPhotos) => {
      const [firstPhoto, ...restPhotos] = currentPhotos;
      return [...restPhotos, firstPhoto];
    });
    setHeroIndex(0);
  };

  const handleSetCoverPhoto = (photoIndex: number) => {
    const targetPhoto = viewerPhotos[photoIndex];
    if (!targetPhoto) {
      return;
    }

    setPhotos((currentPhotos) => [
      targetPhoto,
      ...currentPhotos.filter((photo) => photo.id !== targetPhoto.id),
    ]);
    setHeroIndex(0);
    setViewerIndex(0);
  };

  const handleDeleteViewerPhoto = (photoIndex: number) => {
    const targetPhoto = viewerPhotos[photoIndex];
    if (!targetPhoto) {
      return;
    }

    Alert.alert('사진을 삭제할까요?', '장소의 사진 목록에서 제거돼요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          const remainingViewerPhotoIds = (viewerPhotoIds ?? photos.map((photo) => photo.id))
            .filter((photoId) => photoId !== targetPhoto.id);

          setPhotos((currentPhotos) => currentPhotos.filter((photo) => photo.id !== targetPhoto.id));
          setRecords((currentRecords) => currentRecords.map((record) => ({
            ...record,
            photoIds: (record.photoIds ?? []).filter((photoId) => photoId !== targetPhoto.id),
          })));
          setViewerPhotoIds((currentIds) => (
            currentIds ? currentIds.filter((photoId) => photoId !== targetPhoto.id) : null
          ));
          setHeroIndex(0);
          if (remainingViewerPhotoIds.length === 0) {
            setViewerOpen(false);
            return;
          }

          setViewerIndex(Math.min(photoIndex, remainingViewerPhotoIds.length - 1));
        },
      },
    ]);
  };

  const handleDeleteGridPhotos = (photoIds: string[]) => {
    if (photoIds.length === 0) {
      return;
    }

    const photoIdSet = new Set(photoIds);
    setPhotos((currentPhotos) => currentPhotos.filter((photo) => !photoIdSet.has(photo.id)));
    setRecords((currentRecords) => currentRecords.map((record) => ({
      ...record,
      photoIds: (record.photoIds ?? []).filter((photoId) => !photoIdSet.has(photoId)),
    })));
    setViewerPhotoIds((currentIds) => (
      currentIds ? currentIds.filter((photoId) => !photoIdSet.has(photoId)) : null
    ));
    setHeroIndex(0);
  };

  const requestDeleteGridPhotos = (photoIds: string[]) => {
    if (photoIds.length === 0) {
      return;
    }

    setPendingDeletePhotoIds(photoIds);
    setPhotoDeleteConfirmOpen(true);
  };

  const confirmDeleteGridPhotos = () => {
    handleDeleteGridPhotos(pendingDeletePhotoIds);
    setPendingDeletePhotoIds([]);
    setPhotoDeleteConfirmOpen(false);
    setGridSelectionResetSignal((signal) => signal + 1);
  };

  const navigateToDay = () => {
    setMoreOpen(false);
    router.push({
      pathname: '/day-archive-detail',
      params: {
        tripId: initialDetail.tripId,
        dayId: initialDetail.dayId,
        placeId: initialDetail.placeId,
        highlightPlaceId: initialDetail.placeId,
      },
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()} style={styles.headerButton}>
          <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setMoreOpen((visible) => !visible)}
          style={styles.headerButton}
        >
          <Feather name="more-horizontal" size={26} color={Colors.foundation.black} />
        </Pressable>

        {isMoreOpen ? (
          <View style={styles.moreMenu}>
            <MenuRow icon="image" label="사진 추가" onPress={handleAddPhoto} />
            <MenuRow icon="edit-3" label="기록 추가" onPress={handlePressAddRecord} />
            <MenuRow icon="map-pin" label="장소 정보 수정" onPress={handlePressEditPlace} />
            <MenuRow icon="star" label="대표사진 변경" onPress={handlePressChangeCover} />
            <View style={styles.menuDivider} />
            <MenuRow icon="calendar" label="해당 날짜 전체보기" onPress={navigateToDay} />
            <View style={styles.menuDivider} />
            <MenuRow
              destructive
              icon="trash-2"
              label="삭제"
              onPress={() => {
                setMoreOpen(false);
                setDeleteConfirmOpen(true);
              }}
            />
          </View>
        ) : null}
      </View>

      {isMoreOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="더보기 메뉴 닫기"
          style={styles.menuDismissLayer}
          onPress={() => setMoreOpen(false)}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topGroup}>
          <View style={[styles.hero, { height: screenWidth }]}>
            {photos.length > 0 ? (
              <ScrollView
                horizontal
                onMomentumScrollEnd={handleHeroScrollEnd}
                pagingEnabled
                showsHorizontalScrollIndicator={false}
              >
                {photos.map((photo, index) => (
                  <Pressable
                    accessibilityRole="imagebutton"
                    key={photo.id}
                    onPress={() => openViewer(index)}
                    style={[styles.heroPage, { width: screenWidth }]}
                  >
                    <Image source={photo.source} style={styles.heroImage} resizeMode="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.heroPlaceholder} />
            )}

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {photos.length > 0 ? heroIndex + 1 : 0} / {photos.length}
              </Text>
            </View>
          </View>

          <View style={styles.placeInfo}>
            <Text style={styles.placeTitle}>{placeName}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.placeMeta}>{initialDetail.cityName}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.placeMeta}>{initialDetail.countryName}</Text>
            </View>
            <Text style={styles.dateText}>{formatSpacedDateLabel(initialDetail.dateLabel)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>사진</Text>
              <Text style={styles.sectionCount}>{photos.length}장</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => openPhotoGrid(false)} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>전체보기</Text>
              <Feather name="chevron-right" size={18} color={Colors.foundation.black} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailScroll}>
            <View style={styles.thumbnailRow}>
              <Pressable
                accessibilityRole="button"
                onPress={handleAddPhoto}
                style={[styles.photoThumb, styles.photoAddThumb]}
              >
                <Feather name="plus" size={24} color={Colors.foundation.grey600} />
                <Text style={styles.photoAddThumbText}>사진 추가</Text>
              </Pressable>
              {photos.map((photo, index) => (
                <Pressable key={photo.id} onPress={() => openViewer(index)} style={styles.photoThumb}>
                  <Image source={photo.source} style={styles.photoThumbImage} resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>기록</Text>
              <Text style={styles.sectionCount}>{records.length}개</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={handlePressAddRecord} style={styles.addRecordButton}>
              <Feather name="plus" size={16} color={Colors.foundation.black} />
              <Text style={styles.addRecordButtonText}>기록 추가</Text>
            </Pressable>
          </View>

          <View style={styles.recordList}>
            {records.map((record, index) => {
              const recordPhoto = record.photoIds?.[0]
                ? photos.find((photo) => photo.id === record.photoIds?.[0])
                : undefined;
              const extraPhotoCount = Math.max((record.photoIds?.length ?? 0) - 1, 0);

              return (
                <View key={record.id} style={styles.recordItem}>
                  <View style={styles.recordTimeColumn}>
                    <Text style={styles.recordTime}>{record.time ?? initialDetail.timeLabel ?? ''}</Text>
                    <View style={[styles.recordLine, index === records.length - 1 && styles.recordLineLast]} />
                  </View>

                  <View style={styles.recordBody}>
                    {record.text ? <Text style={styles.recordText}>{record.text}</Text> : null}
                    {recordPhoto ? (
                      <Pressable onPress={() => openViewer(0, record.photoIds)} style={styles.recordPhoto}>
                        <Image source={recordPhoto.source} style={styles.recordPhotoImage} resizeMode="cover" />
                        {extraPhotoCount > 0 ? (
                          <View style={styles.recordPhotoCountBadge}>
                            <Text style={styles.recordPhotoCountText}>+{extraPhotoCount}</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <FullScreenImageViewer
        actionLabel="이 순간 기록하기"
        actions={isViewerViewOnly ? [] : [
          {
            key: 'share',
            icon: 'share-outline',
            label: '공유하기',
            onPress: () => Alert.alert('공유하기', '사진 공유 기능은 추후 연결 예정입니다.'),
          },
          {
            key: 'cover',
            icon: 'image-outline',
            label: '대표사진으로 설정',
            onPress: (index) => {
              const targetPhoto = viewerPhotos[index];
              const photoIndex = photos.findIndex((photo) => photo.id === targetPhoto?.id);
              handleSetCoverPhoto(photoIndex);
            },
          },
          {
            key: 'info',
            icon: 'information-circle-outline',
            label: '사진 정보 보기',
            onPress: () => Alert.alert('사진 정보', '사진 촬영 정보는 추후 연결 예정입니다.'),
          },
          {
            key: 'delete',
            icon: 'trash-outline',
            label: '삭제',
            destructive: true,
            onPress: (index) => {
              handleDeleteViewerPhoto(index);
            },
          },
        ]}
        images={viewerImages}
        initialIndex={viewerIndex}
        leadingAction={isViewerViewOnly ? {
          key: 'delete',
          icon: 'trash-outline',
          label: '사진 삭제',
          destructive: true,
          onPress: handleDeleteViewerPhoto,
        } : undefined}
        onClose={() => {
          setViewerOpen(false);
          setViewerPhotoIds(null);
          setViewerViewOnly(false);
          if (shouldReopenGridAfterViewer) {
            setShouldReopenGridAfterViewer(false);
            requestAnimationFrame(() => setGridOpen(true));
          }
        }}
        onPressAction={isViewerViewOnly ? undefined : (index) => {
          const targetPhoto = viewerPhotos[index];
          if (targetPhoto) {
            setViewerOpen(false);
            requestAnimationFrame(() => openRecordComposer([targetPhoto.id], 'sheet'));
          }
        }}
        visible={isViewerOpen}
      />

      <PhotoGridModal
        clearSelectionSignal={gridSelectionResetSignal}
        initialSelectionMode={isGridSelectionInitiallyEnabled}
        onAddPhoto={handleAddPhoto}
        onClose={handleClosePhotoGrid}
        onRequestDeletePhotos={requestDeleteGridPhotos}
        onPressPhoto={(index) => {
          setShouldReopenGridAfterViewer(true);
          setGridOpen(false);
          requestAnimationFrame(() => openViewer(index, undefined, isGridViewOnly));
        }}
        onStartRecord={(photoIds) => {
          if (gridSelectionPurpose === 'linkRecord') {
            setSelectedRecordPhotoIds(photoIds);
            setGridOpen(false);
            setGridSelectionPurpose('recordCreate');
            requestAnimationFrame(() => setRecordModalOpen(true));
            return;
          }

          setGridOpen(false);
          requestAnimationFrame(() => openRecordComposer(photoIds, 'sheet'));
        }}
        photos={photos}
        visible={isGridOpen}
      />

      <RecordCreateModal
        draft={recordDraft}
        mode={recordModalMode}
        onChangeDraft={setRecordDraft}
        onChangeTime={setRecordTimeLabel}
        onClose={() => setRecordModalOpen(false)}
        onOpenPhotoPicker={handleOpenRecordPhotoPicker}
        onRemovePhoto={handleUnlinkRecordPhoto}
        onSave={handleSaveRecord}
        photos={selectedRecordPhotos}
        timeLabel={recordTimeLabel}
        visible={isRecordModalOpen}
      />

      <ConfirmDeleteModal
        onCancel={() => setDeleteConfirmOpen(false)}
        onDelete={() => {
          setDeleteConfirmOpen(false);
          router.back();
        }}
        visible={isDeleteConfirmOpen}
      />

      <ConfirmPhotoDeleteModal
        count={pendingDeletePhotoIds.length}
        onCancel={() => {
          setPendingDeletePhotoIds([]);
          setPhotoDeleteConfirmOpen(false);
        }}
        onDelete={confirmDeleteGridPhotos}
        visible={isPhotoDeleteConfirmOpen}
      />
    </SafeAreaView>
  );
}

interface MenuRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

function MenuRow({ icon, label, destructive = false, onPress }: MenuRowProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.menuRow}>
      <Feather name={icon} size={18} color={destructive ? DESTRUCTIVE : Colors.foundation.black} />
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>{label}</Text>
    </Pressable>
  );
}

interface PhotoGridModalProps {
  visible: boolean;
  photos: PlaceDetailPhoto[];
  clearSelectionSignal: number;
  initialSelectionMode: boolean;
  onAddPhoto: () => void;
  onClose: () => void;
  onRequestDeletePhotos: (photoIds: string[]) => void;
  onPressPhoto: (index: number) => void;
  onStartRecord: (photoIds: string[]) => void;
}

function PhotoGridModal({
  visible,
  photos,
  clearSelectionSignal,
  initialSelectionMode,
  onAddPhoto,
  onClose,
  onRequestDeletePhotos,
  onPressPhoto,
  onStartRecord,
}: PhotoGridModalProps) {
  const insets = useSafeAreaInsets();
  const [isSelectionMode, setSelectionMode] = React.useState(initialSelectionMode);
  const [selectedPhotoIds, setSelectedPhotoIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (visible) {
      setSelectionMode(initialSelectionMode);
      setSelectedPhotoIds([]);
    }
  }, [initialSelectionMode, visible]);

  React.useEffect(() => {
    setSelectionMode(false);
    setSelectedPhotoIds([]);
  }, [clearSelectionSignal]);

  const togglePhoto = (photoId: string) => {
    setSelectedPhotoIds((currentIds) => (
      currentIds.includes(photoId)
        ? currentIds.filter((id) => id !== photoId)
        : [...currentIds, photoId]
    ));
  };

  const selectedCount = selectedPhotoIds.length;
  const showSelectionActionBar = isSelectionMode && selectedCount > 0;

  const handleToggleSelectionMode = () => {
    setSelectionMode((current) => !current);
    setSelectedPhotoIds([]);
  };

  const handlePressDeleteSelected = () => {
    if (selectedPhotoIds.length === 0) {
      return;
    }

    onRequestDeletePhotos(selectedPhotoIds);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View style={[styles.modalScreen, { paddingTop: insets.top }]}>
        <View style={styles.modalHeader}>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.headerButton}>
            <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
          </Pressable>
          <Text style={styles.modalTitle}>
            {isSelectionMode ? `${selectedCount}개 선택` : `사진 ${photos.length}장`}
          </Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={handleToggleSelectionMode}
            style={styles.gridSelectButton}
          >
            <Text style={styles.gridSelectText}>{isSelectionMode ? '취소' : '선택'}</Text>
          </Pressable>
        </View>

        <Text style={styles.gridHint}>
          {isSelectionMode ? '사진을 선택해 기록에 연결하거나 삭제할 수 있어요.' : '사진을 눌러 크게 확인해보세요.'}
        </Text>

        <ScrollView
          contentContainerStyle={[
            styles.photoGrid,
            { paddingBottom: showSelectionActionBar ? insets.bottom + 96 : Spacing.xl },
          ]}
        >
          {!isSelectionMode ? (
            <Pressable
              accessibilityRole="button"
              onPress={onAddPhoto}
              style={[styles.gridPhoto, styles.gridAddPhoto]}
            >
              <Feather name="plus" size={28} color={Colors.foundation.grey500} />
              <Text style={styles.gridAddPhotoText}>사진 추가</Text>
            </Pressable>
          ) : null}
          {photos.length === 0 ? (
            <View style={styles.gridEmptyState}>
              <Text style={styles.gridEmptyText}>사진이 없어요</Text>
            </View>
          ) : null}
          {photos.map((photo, index) => {
            const isSelected = selectedPhotoIds.includes(photo.id);
            return (
              <Pressable
                key={photo.id}
                onPress={() => {
                  if (isSelectionMode) {
                    togglePhoto(photo.id);
                    return;
                  }

                  onPressPhoto(index);
                }}
                style={styles.gridPhoto}
              >
                <Image source={photo.source} style={styles.gridPhotoImage} resizeMode="cover" />
                {isSelectionMode && isSelected ? <View style={styles.gridSelectedOverlay} /> : null}
                {isSelectionMode ? (
                  <View style={[styles.gridCheck, isSelected && styles.gridCheckSelected]}>
                    {isSelected ? <Feather name="check" size={14} color={Colors.foundation.white} /> : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {showSelectionActionBar ? (
          <View style={[styles.gridBottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.gridActionRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onStartRecord(selectedPhotoIds)}
                style={styles.gridRecordButton}
              >
                <Text style={styles.gridRecordButtonText}>기록 추가</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handlePressDeleteSelected}
                style={styles.gridDeleteButton}
              >
                <Text style={styles.gridDeleteButtonText}>삭제</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

interface RecordCreateModalProps {
  visible: boolean;
  draft: string;
  mode: 'sheet' | 'screen';
  photos: PlaceDetailPhoto[];
  timeLabel?: string;
  onChangeDraft: (value: string) => void;
  onChangeTime: (value: string) => void;
  onClose: () => void;
  onOpenPhotoPicker: () => void;
  onRemovePhoto: (photoId: string) => void;
  onSave: () => void;
}

function RecordCreateModal({
  visible,
  draft,
  mode,
  photos,
  timeLabel,
  onChangeDraft,
  onChangeTime,
  onClose,
  onOpenPhotoPicker,
  onRemovePhoto,
  onSave,
}: RecordCreateModalProps) {
  const insets = useSafeAreaInsets();
  const [isTimePickerOpen, setTimePickerOpen] = React.useState(false);
  const isScreenMode = mode === 'screen';
  const saveDisabled = !draft.trim();

  const content = (
    <View style={isScreenMode ? styles.recordScreenContent : styles.recordSheetContent}>
      <View style={styles.recordModalHeader}>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.recordCloseButton}>
          {isScreenMode ? (
            <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
          ) : (
            <Feather name="x" size={24} color={Colors.foundation.black} />
          )}
        </Pressable>
        <Text style={styles.recordModalTitle}>기록 추가</Text>
        <View style={styles.recordCloseButton} />
      </View>

      <View style={styles.selectedPhotosBlock}>
        <View style={styles.selectedPhotosHeader}>
          <Text style={styles.selectedPhotosLabel}>사진 연결</Text>
          <Text style={styles.selectedPhotosOptional}>선택 사항</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.selectedPhotoRow}>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenPhotoPicker}
              style={[styles.selectedPhotoThumb, styles.linkPhotoButton]}
            >
              <Feather name="plus" size={20} color={Colors.foundation.grey600} />
              <Text style={styles.linkPhotoButtonText}>사진 선택</Text>
            </Pressable>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.linkedPhotoThumbWrap}>
                <Image resizeMode="cover" source={photo.source} style={styles.selectedPhotoThumb} />
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => onRemovePhoto(photo.id)}
                  style={styles.unlinkPhotoButton}
                >
                  <Feather name="x" size={12} color={Colors.foundation.white} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setTimePickerOpen(true)}
        style={styles.timeRow}
      >
        <Text style={styles.timeLabel}>시간</Text>
        <View style={styles.timeValueRow}>
          <Text style={styles.timeValue}>{timeLabel ?? '시간 미정'}</Text>
          <Feather name="chevron-right" size={18} color={Colors.foundation.grey500} />
        </View>
      </Pressable>

      <View style={styles.memoBlock}>
        <Text style={styles.memoLabel}>기록</Text>
        <AppTextInput
          multiline
          maxLength={1000}
          onChangeText={onChangeDraft}
          placeholder="이 장소에서 어떤 순간을 기억하나요?"
          placeholderTextColor={Colors.foundation.grey500}
          style={styles.recordInput}
          value={draft}
        />
        <Text style={styles.memoCount}>{draft.length}/1000</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={saveDisabled}
        onPress={onSave}
        style={[styles.saveButton, saveDisabled && styles.saveButtonDisabled]}
      >
        <Text style={styles.saveButtonText}>저장하기</Text>
      </Pressable>
      <TimeWheelPickerModal
        onClose={() => setTimePickerOpen(false)}
        onConfirm={(nextTime) => {
          onChangeTime(formatPlaceEntryTime(nextTime));
          setTimePickerOpen(false);
        }}
        value={parsePlaceEntryTime(timeLabel)}
        visible={isTimePickerOpen}
      />
    </View>
  );

  if (isScreenMode) {
    return (
      <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
        <SafeAreaView style={styles.recordScreen}>{content}</SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.recordSheet, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <View style={styles.sheetHandle} />
          {content}
        </View>
      </View>
    </Modal>
  );
}

interface ConfirmDeleteModalProps {
  visible: boolean;
  onCancel: () => void;
  onDelete: () => void;
}

function ConfirmDeleteModal({ visible, onCancel, onDelete }: ConfirmDeleteModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.deleteModal}>
          <Text style={styles.deleteTitle}>이 장소를 삭제할까요?</Text>
          <Text style={styles.deleteDescription}>
            연결된 사진과 기록은 함께 정리될 수 있어요.
          </Text>
          <View style={styles.deleteButtonRow}>
            <Pressable onPress={onCancel} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>취소</Text>
            </Pressable>
            <Pressable onPress={onDelete} style={styles.destructiveButton}>
              <Text style={styles.destructiveButtonText}>삭제</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface ConfirmPhotoDeleteModalProps {
  visible: boolean;
  count: number;
  onCancel: () => void;
  onDelete: () => void;
}

function ConfirmPhotoDeleteModal({ visible, count, onCancel, onDelete }: ConfirmPhotoDeleteModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.deleteModal}>
          <Text style={styles.deleteTitle}>선택한 사진을 삭제할까요?</Text>
          <Text style={styles.deleteDescription}>
            {count}장의 사진은 기기 사진첩에서는 삭제되지 않고, Travu의 현재 장소 사진 목록에서만 삭제됩니다.
          </Text>
          <View style={styles.deleteButtonRow}>
            <Pressable onPress={onCancel} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>취소</Text>
            </Pressable>
            <Pressable onPress={onDelete} style={styles.destructiveButton}>
              <Text style={styles.destructiveButtonText}>삭제</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xl,
    backgroundColor: Colors.light.bgScreen,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreMenu: {
    position: 'absolute',
    right: Spacing.xl,
    top: 44,
    width: 220,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    zIndex: 30,
    ...Shadows.card,
  },
  menuDismissLayer: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  menuRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  menuLabel: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  menuLabelDestructive: {
    color: DESTRUCTIVE,
  },
  menuDivider: {
    height: 1,
    marginVertical: Spacing.xs,
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.foundation.grey100,
  },
  scrollContent: {
    gap: Spacing['3xl'],
  },
  topGroup: {
    gap: Spacing['2xl'],
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Colors.foundation.grey100,
  },
  heroPage: {
    height: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    backgroundColor: Colors.foundation.grey100,
  },
  heroBadge: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xl,
    height: 24,
    minWidth: 47,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(87, 87, 87, 0.50)',
  },
  heroBadgeText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
  },
  placeInfo: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  placeTitle: {
    fontFamily: Typography.title2.fontFamily,
    fontSize: 20,
    lineHeight: 24,
    color: Colors.foundation.black,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey600,
  },
  placeMeta: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
  },
  dateText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey500,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  sectionCount: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey500,
  },
  viewAllButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  thumbnailScroll: {
    marginHorizontal: -Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.xl,
  },
  photoThumb: {
    width: 80,
    height: 96,
    overflow: 'hidden',
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.grey100,
  },
  photoAddThumb: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    backgroundColor: Colors.foundation.white,
  },
  photoAddThumbText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey600,
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
  },
  addRecordButton: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.white,
  },
  addRecordButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  recordList: {
    gap: Spacing.xl,
  },
  recordItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  recordTimeColumn: {
    width: 38,
    alignItems: 'center',
    gap: Spacing.lg,
    alignSelf: 'stretch',
    paddingTop: Spacing.xs,
  },
  recordTime: {
    ...Typography.captionEmphasized,
    lineHeight: 14,
    color: Colors.foundation.grey500,
  },
  recordLine: {
    width: 2,
    flex: 1,
    minHeight: 56,
    backgroundColor: Colors.foundation.grey100,
  },
  recordLineLast: {
    minHeight: 36,
  },
  recordBody: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.md,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  recordText: {
    ...Typography.body2Regular,
    flex: 1,
    color: Colors.foundation.black,
    textAlign: 'justify',
  },
  recordPhoto: {
    width: 72,
    height: 90,
    overflow: 'hidden',
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.grey100,
  },
  recordPhotoImage: {
    width: '100%',
    height: '100%',
  },
  recordPhotoCountBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    minWidth: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  recordPhotoCountText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  modalHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  modalTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  gridSelectButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  gridSelectText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  hiddenGridControl: {
    opacity: 0,
  },
  gridHint: {
    ...Typography.captionRegular,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
    color: Colors.foundation.grey500,
    textAlign: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
  },
  gridEmptyState: {
    width: '100%',
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridEmptyText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
  },
  gridPhoto: {
    width: '32%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.grey100,
  },
  gridAddPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  gridAddPhotoText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey600,
  },
  gridPhotoImage: {
    width: '100%',
    height: '100%',
  },
  gridSelectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  gridCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.foundation.white,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  gridCheckSelected: {
    backgroundColor: Colors.foundation.black,
  },
  gridBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.light.bgScreen,
  },
  gridActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  gridRecordButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  gridRecordButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  gridDeleteButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: DESTRUCTIVE,
  },
  gridDeleteButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  recordSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Colors.foundation.white,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    marginTop: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey300,
  },
  recordSheetContent: {
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  recordScreen: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  recordScreenContent: {
    flex: 1,
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  recordModalHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordModalTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  selectedPhotosBlock: {
    gap: Spacing.sm,
  },
  selectedPhotosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  selectedPhotosLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  selectedPhotosOptional: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
  },
  selectedPhotoRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  selectedPhotoThumb: {
    width: 64,
    height: 64,
    borderRadius: Radius.xs,
  },
  linkPhotoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    backgroundColor: Colors.foundation.white,
  },
  linkPhotoButtonText: {
    ...Typography.captionSmall,
    color: Colors.foundation.grey600,
  },
  linkedPhotoThumbWrap: {
    position: 'relative',
  },
  unlinkPhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  timeRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.foundation.grey100,
  },
  timeLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeValue: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  memoBlock: {
    gap: Spacing.sm,
  },
  memoLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  recordInput: {
    minHeight: 150,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.sm,
    ...Typography.body2Regular,
    color: Colors.foundation.black,
    textAlignVertical: 'top',
  },
  memoCount: {
    ...Typography.captionRegular,
    alignSelf: 'flex-end',
    color: Colors.foundation.grey500,
  },
  saveButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.foundation.grey300,
  },
  saveButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  deleteModal: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
  },
  deleteTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  deleteDescription: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  deleteButtonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryButton: {
    width: 120,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.sm,
  },
  secondaryButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  destructiveButton: {
    width: 120,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: DESTRUCTIVE,
  },
  destructiveButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  emptyDescription: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
});
