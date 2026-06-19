import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
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
import {
  getMockPlaceDetail,
  type PlaceDetailPhoto,
  type PlaceDetailRecord,
} from '@/constants/mockPlaceDetails';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

type PlaceDetailRouteParams = {
  tripId?: string;
  dayId?: string;
  placeId?: string;
  entryPoint?: 'dailyMoment' | 'activeTripTimeline' | 'recordDayDetail';
};

const DESTRUCTIVE = '#D13434';

function makePhotoId() {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getRecordSortValue(record: PlaceDetailRecord) {
  return new Date(record.createdAt).getTime();
}

export default function PlaceDetailScreen() {
  const params = useLocalSearchParams<PlaceDetailRouteParams>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const screenWidth = Math.max(320, width);

  const initialDetail = React.useMemo(
    () => getMockPlaceDetail(params.tripId, params.dayId, params.placeId),
    [params.dayId, params.placeId, params.tripId],
  );

  const [placeName, setPlaceName] = React.useState(initialDetail?.placeName ?? '');
  const [photos, setPhotos] = React.useState<PlaceDetailPhoto[]>(initialDetail?.photos ?? []);
  const [records, setRecords] = React.useState<PlaceDetailRecord[]>(
    [...(initialDetail?.records ?? [])].sort((a, b) => getRecordSortValue(a) - getRecordSortValue(b)),
  );
  const [heroIndex, setHeroIndex] = React.useState(0);
  const [isMoreOpen, setMoreOpen] = React.useState(false);
  const [viewerIndex, setViewerIndex] = React.useState(0);
  const [isViewerOpen, setViewerOpen] = React.useState(false);
  const [isGridOpen, setGridOpen] = React.useState(false);
  const [isRecordModalOpen, setRecordModalOpen] = React.useState(false);
  const [recordDraft, setRecordDraft] = React.useState('');
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const viewerImages = React.useMemo<ImageSourcePropType[]>(
    () => photos.map((photo) => photo.source),
    [photos],
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

  const openViewer = (index: number) => {
    if (photos.length === 0) {
      return;
    }

    setViewerIndex(Math.max(0, Math.min(index, photos.length - 1)));
    setViewerOpen(true);
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
        time: initialDetail.timeLabel,
        text: trimmedText,
        createdAt: new Date().toISOString(),
      },
    ]);
    setRecordDraft('');
    setRecordModalOpen(false);
  };

  const handlePressAddRecord = () => {
    setMoreOpen(false);
    setRecordModalOpen(true);
  };

  const handlePressEditPlace = () => {
    setMoreOpen(false);
    if (Platform.OS === 'ios' && Alert.prompt) {
      Alert.prompt(
        '장소 정보 수정',
        '장소 이름을 입력해 주세요.',
        (value) => {
          const nextName = value.trim();
          if (nextName) {
            setPlaceName(nextName);
          }
        },
        'plain-text',
        placeName,
      );
      return;
    }

    Alert.alert('장소 정보 수정', '장소 수정 화면으로 연결될 예정입니다.');
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

  const navigateToDay = () => {
    setMoreOpen(false);
    router.push({
      pathname: '/record-day-detail',
      params: {
        tripId: initialDetail.tripId,
        dayId: initialDetail.dayId,
        placeId: initialDetail.placeId,
        highlightPlaceId: initialDetail.placeId,
      },
    });
  };

  const navigateToTrip = () => {
    setMoreOpen(false);
    router.push({
      pathname: '/day-archive-detail',
      params: {
        tripId: initialDetail.tripId,
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
          <View style={[styles.moreMenu, { top: insets.top + 44 }]}>
            <MenuRow icon="image" label="사진 추가" onPress={handleAddPhoto} />
            <MenuRow icon="edit-3" label="기록 추가" onPress={handlePressAddRecord} />
            <MenuRow icon="map-pin" label="장소 정보 수정" onPress={handlePressEditPlace} />
            <MenuRow icon="star" label="대표사진 변경" onPress={handlePressChangeCover} />
            <View style={styles.menuDivider} />
            <MenuRow icon="calendar" label="해당 날짜 전체 보기" onPress={navigateToDay} />
            <MenuRow icon="briefcase" label="해당 여행 전체 보기" onPress={navigateToTrip} />
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

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={styles.dateText}>{initialDetail.dateLabel}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>사진</Text>
              <Text style={styles.sectionCount}>{photos.length}장</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setGridOpen(true)} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>전체보기</Text>
              <Feather name="chevron-right" size={18} color={Colors.foundation.black} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailScroll}>
            <View style={styles.thumbnailRow}>
              {photos.map((photo, index) => (
                <Pressable key={photo.id} onPress={() => openViewer(index)} style={styles.photoThumb}>
                  <Image source={photo.source} style={styles.photoThumbImage} resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>기록</Text>
            <Text style={styles.sectionCount}>{records.length}개</Text>
          </View>

          <View style={styles.recordList}>
            {records.map((record, index) => {
              const recordPhoto = record.photoIds?.[0]
                ? photos.find((photo) => photo.id === record.photoIds?.[0])
                : undefined;

              return (
                <View key={record.id} style={styles.recordItem}>
                  <View style={styles.recordTimeColumn}>
                    <Text style={styles.recordTime}>{record.time ?? initialDetail.timeLabel ?? ''}</Text>
                    <View style={[styles.recordLine, index === records.length - 1 && styles.recordLineLast]} />
                  </View>

                  <View style={styles.recordBody}>
                    {record.text ? <Text style={styles.recordText}>{record.text}</Text> : null}
                    {recordPhoto ? (
                      <Pressable onPress={() => openViewer(photos.indexOf(recordPhoto))} style={styles.recordPhoto}>
                        <Image source={recordPhoto.source} style={styles.recordPhotoImage} resizeMode="cover" />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.relatedTitle}>연결된 내용</Text>
          <RelatedRow
            icon="calendar"
            title="해당 날짜 전체 보기"
            subtitle={initialDetail.dateLabel}
            onPress={navigateToDay}
          />
          <RelatedRow
            icon="briefcase"
            title="해당 여행 전체 보기"
            subtitle={`${initialDetail.tripName} · ${initialDetail.tripDateRange}`}
            onPress={navigateToTrip}
          />
        </View>
      </ScrollView>

      <FullScreenImageViewer
        images={viewerImages}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
        visible={isViewerOpen}
      />

      <PhotoGridModal
        onClose={() => setGridOpen(false)}
        onPressPhoto={openViewer}
        photos={photos}
        visible={isGridOpen}
      />

      <RecordCreateModal
        draft={recordDraft}
        onChangeDraft={setRecordDraft}
        onClose={() => setRecordModalOpen(false)}
        onSave={handleSaveRecord}
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

interface RelatedRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function RelatedRow({ icon, title, subtitle, onPress }: RelatedRowProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.relatedRow}>
      <View style={styles.relatedIcon}>
        <Feather name={icon} size={18} color={Colors.foundation.black} />
      </View>
      <View style={styles.relatedTextBlock}>
        <Text style={styles.relatedRowTitle}>{title}</Text>
        <Text style={styles.relatedSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={Colors.foundation.black} />
    </Pressable>
  );
}

interface PhotoGridModalProps {
  visible: boolean;
  photos: PlaceDetailPhoto[];
  onClose: () => void;
  onPressPhoto: (index: number) => void;
}

function PhotoGridModal({ visible, photos, onClose, onPressPhoto }: PhotoGridModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.headerButton}>
            <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
          </Pressable>
          <Text style={styles.modalTitle}>사진 {photos.length}장</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView contentContainerStyle={styles.photoGrid}>
          {photos.map((photo, index) => (
            <Pressable
              key={photo.id}
              onPress={() => {
                onClose();
                requestAnimationFrame(() => onPressPhoto(index));
              }}
              style={styles.gridPhoto}
            >
              <Image source={photo.source} style={styles.gridPhotoImage} resizeMode="cover" />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface RecordCreateModalProps {
  visible: boolean;
  draft: string;
  onChangeDraft: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

function RecordCreateModal({
  visible,
  draft,
  onChangeDraft,
  onClose,
  onSave,
}: RecordCreateModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.recordModal}>
          <View style={styles.recordModalHeader}>
            <Text style={styles.recordModalTitle}>기록 추가</Text>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose}>
              <Feather name="x" size={24} color={Colors.foundation.black} />
            </Pressable>
          </View>
          <AppTextInput
            multiline
            maxLength={500}
            onChangeText={onChangeDraft}
            placeholder="이 장소에서의 시간을 기록해보세요"
            placeholderTextColor={Colors.foundation.grey500}
            style={styles.recordInput}
            value={draft}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!draft.trim()}
            onPress={onSave}
            style={[styles.saveButton, !draft.trim() && styles.saveButtonDisabled]}
          >
            <Text style={styles.saveButtonText}>저장하기</Text>
          </Pressable>
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
    paddingHorizontal: Spacing.xl,
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
    width: 220,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    ...Shadows.card,
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
  photoThumbImage: {
    width: '100%',
    height: '100%',
  },
  recordList: {
    gap: Spacing.xl,
  },
  recordItem: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  recordTimeColumn: {
    width: 56,
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  recordTime: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey500,
  },
  recordLine: {
    width: 2,
    flex: 1,
    minHeight: 56,
    marginLeft: 14,
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
  },
  recordText: {
    ...Typography.body1Regular,
    flex: 1,
    color: Colors.foundation.black,
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
  relatedTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  relatedRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.foundation.grey100,
  },
  relatedIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.white,
  },
  relatedTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  relatedRowTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  relatedSubtitle: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    padding: Spacing.xl,
  },
  gridPhoto: {
    width: '32%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.grey100,
  },
  gridPhotoImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  recordModal: {
    width: '100%',
    maxWidth: 330,
    gap: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
  },
  recordModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordModalTitle: {
    ...Typography.body1Emphasized,
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
