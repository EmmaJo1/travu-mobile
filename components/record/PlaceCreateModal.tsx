import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
  type TextInputProps,
} from 'react-native';

import AuthActionButton from '@/components/common/AuthActionButton';
import Text from '@/components/common/AppText';
import AppTextInput from '@/components/common/AppTextInput';
import ManualPlaceEntryView from '@/components/record/ManualPlaceEntryView';
import PlaceSearchView from '@/components/record/PlaceSearchView';
import TimeWheelPickerModal from '@/components/record/TimeWheelPickerModal';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { mockPlaceSearchProvider } from '@/services/placeSearch/mockPlaceSearchProvider';
import type { SelectedPlace } from '@/services/placeSearch/types';
import {
  convertDateToPlaceEntryTime,
  formatPlaceEntryTime,
  getEarliestPhotoTakenAt,
  parsePlaceEntryTime,
  type PlaceEntryTime,
} from '@/utils/placeEntryTime';

export interface PlaceCreateInput {
  source?: SelectedPlace['source'];
  googlePlaceId?: string;
  place: string;
  placeName?: string;
  formattedAddress?: string;
  time?: string;
  category?: string;
  city?: string;
  cityName?: string;
  countryName?: string;
  latitude?: number;
  longitude?: number;
  text?: string;
  photoUris?: string[];
  photoSources?: ImageSourcePropType[];
}

export type PlaceEntryFormMode = 'create' | 'edit';

interface PlaceCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (place: PlaceCreateInput) => void;
  onDelete?: (entryId: string) => void;
  initialValue?: Partial<PlaceCreateInput> & { id?: string };
  mode?: PlaceEntryFormMode;
}

interface FormFieldProps extends TextInputProps {
  label: string;
}

function FormField({ label, multiline, style, ...props }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <AppTextInput
        multiline={multiline}
        placeholderTextColor={Colors.foundation.grey500}
        style={[styles.input, multiline && styles.memoInput, style]}
        {...props}
      />
    </View>
  );
}

interface SelectFieldProps {
  label: string;
  placeholder: string;
  value?: string;
  subtitle?: string;
  onPress: () => void;
}

function SelectField({ label, placeholder, value, subtitle, onPress }: SelectFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.7}
        onPress={onPress}
        style={styles.selectField}
      >
        <View style={styles.selectText}>
          <Text style={[styles.selectValue, !value && styles.selectPlaceholder]}>
            {value || placeholder}
          </Text>
          {subtitle ? <Text style={styles.selectSubtitle}>{subtitle}</Text> : null}
        </View>
        <Ionicons color={Colors.foundation.black} name="chevron-down" size={18} />
      </TouchableOpacity>
    </View>
  );
}

interface PhotoFieldProps {
  photoUris: string[];
  photoSources: ImageSourcePropType[];
  onAddPress: () => void;
  onRemovePress: (uri: string) => void;
  onRemoveSourcePress: (index: number) => void;
}

function PhotoField({
  photoUris,
  photoSources,
  onAddPress,
  onRemovePress,
  onRemoveSourcePress,
}: PhotoFieldProps) {
  const photoCount = photoSources.length + photoUris.length;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>사진</Text>
      <ScrollView
        contentContainerStyle={styles.photoList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {photoCount < 5 && (
          <TouchableOpacity
            accessibilityLabel="사진 추가"
            activeOpacity={0.7}
            onPress={onAddPress}
            style={styles.photoAddButton}
          >
            <Ionicons color={Colors.foundation.grey500} name="images-outline" size={22} />
            <Text style={styles.photoAddText}>{photoCount}/5</Text>
          </TouchableOpacity>
        )}

        {photoSources.map((source, index) => (
          <View key={`source-${index}`} style={styles.photoPreview}>
            <Image contentFit="cover" source={source} style={styles.photoImage} />
            <TouchableOpacity
              accessibilityLabel="사진 삭제"
              activeOpacity={0.7}
              onPress={() => onRemoveSourcePress(index)}
              style={styles.photoRemoveButton}
            >
              <Ionicons color={Colors.foundation.white} name="close" size={14} />
            </TouchableOpacity>
          </View>
        ))}

        {photoUris.map((uri) => (
          <View key={uri} style={styles.photoPreview}>
            <Image contentFit="cover" source={{ uri }} style={styles.photoImage} />
            <TouchableOpacity
              accessibilityLabel="사진 삭제"
              activeOpacity={0.7}
              onPress={() => onRemovePress(uri)}
              style={styles.photoRemoveButton}
            >
              <Ionicons color={Colors.foundation.white} name="close" size={14} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

type PickerPage =
  | 'form'
  | 'category'
  | 'place-search'
  | 'manual-place-entry';

const CATEGORIES = ['관광명소', '음식점', '카페', '숙소', '쇼핑', '기타'];

function getInitialSelectedPlace(value?: Partial<PlaceCreateInput>): SelectedPlace | undefined {
  const placeName = value?.placeName ?? value?.place;

  if (!placeName) {
    return undefined;
  }

  return {
    source: value?.source ?? 'manual',
    googlePlaceId: value?.googlePlaceId,
    placeName,
    formattedAddress: value?.formattedAddress,
    cityName: value?.cityName ?? value?.city,
    countryName: value?.countryName,
    latitude: value?.latitude,
    longitude: value?.longitude,
  };
}

function getPlaceSubtitle(place?: SelectedPlace) {
  return (
    place?.formattedAddress ||
    [place?.cityName, place?.countryName].filter(Boolean).join(', ') ||
    undefined
  );
}

export default function PlaceCreateModal({
  visible,
  onClose,
  onSubmit,
  onDelete,
  initialValue,
  mode = 'create',
}: PlaceCreateModalProps) {
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [text, setText] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [photoSources, setPhotoSources] = useState<ImageSourcePropType[]>([]);
  const [pickerPage, setPickerPage] = useState<PickerPage>('form');
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace>();
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [timeWheelVisible, setTimeWheelVisible] = useState(false);
  const [hasUserEditedTime, setHasUserEditedTime] = useState(false);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const placeSearchResults = useMemo(
    () => mockPlaceSearchProvider.search(placeSearchQuery),
    [placeSearchQuery],
  );

  const resetFields = () => {
    const nextPlace = getInitialSelectedPlace(initialValue);
    setSelectedPlace(nextPlace);
    setPlace(nextPlace?.placeName ?? '');
    setTime(initialValue?.time ?? '');
    setCategory(initialValue?.category ?? '');
    setCity(nextPlace?.cityName ?? '');
    setText(initialValue?.text ?? '');
    setPhotoUris(initialValue?.photoUris ?? []);
    setPhotoSources(initialValue?.photoSources ?? []);
    setPlaceSearchQuery('');
    setTimeWheelVisible(false);
    setHasUserEditedTime(false);
    setDeleteConfirmationVisible(false);
    setPickerPage('form');
  };

  useEffect(() => {
    if (visible) {
      const nextPlace = getInitialSelectedPlace(initialValue);
      setSelectedPlace(nextPlace);
      setPlace(nextPlace?.placeName ?? '');
      setTime(initialValue?.time ?? '');
      setCategory(initialValue?.category ?? '');
      setCity(nextPlace?.cityName ?? '');
      setText(initialValue?.text ?? '');
      setPhotoUris(initialValue?.photoUris ?? []);
      setPhotoSources(initialValue?.photoSources ?? []);
      setPlaceSearchQuery('');
      setTimeWheelVisible(false);
      setHasUserEditedTime(false);
      setDeleteConfirmationVisible(false);
      setPickerPage('form');
    }
  }, [visible, initialValue]);

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const handleSubmit = () => {
    const trimmedPlace = (selectedPlace?.placeName ?? place).trim();

    if (!trimmedPlace) {
      return;
    }

    const resolvedPlace: SelectedPlace = selectedPlace ?? {
      source: 'manual',
      placeName: trimmedPlace,
      cityName: city.trim() || undefined,
    };

    onSubmit({
      ...resolvedPlace,
      place: trimmedPlace,
      time: time.trim() || undefined,
      category: category.trim() || undefined,
      city: resolvedPlace.cityName,
      text: text.trim() || undefined,
      photoUris: photoUris.length > 0 ? photoUris : undefined,
      photoSources: photoSources.length > 0 ? photoSources : undefined,
    });
    resetFields();
  };

  const canSubmit = (selectedPlace?.placeName ?? place).trim().length > 0;

  const applySelectedPlace = (nextPlace: SelectedPlace) => {
    setSelectedPlace(nextPlace);
    setPlace(nextPlace.placeName);
    setCity(nextPlace.cityName ?? '');
    setPlaceSearchQuery('');
    setPickerPage('form');
  };

  const handleBack = () => {
    setPickerPage(pickerPage === 'manual-place-entry' ? 'place-search' : 'form');
  };

  const openTimePicker = () => {
    setTimeWheelVisible(true);
  };

  const saveTime = (nextTime: PlaceEntryTime) => {
    setTime(formatPlaceEntryTime(nextTime));
    setHasUserEditedTime(true);
    setTimeWheelVisible(false);
  };

  const handleAddPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5 - photoSources.length - photoUris.length,
        quality: 1,
        exif: true,
      });

      if (result.canceled) {
        return;
      }

      if (mode === 'create' && !hasUserEditedTime) {
        const photoTakenAt = getEarliestPhotoTakenAt(result.assets);

        if (photoTakenAt) {
          setTime(formatPlaceEntryTime(convertDateToPlaceEntryTime(photoTakenAt)));
        }
      }

      setPhotoUris((current) => [
        ...new Set([...current, ...result.assets.map((asset) => asset.uri)]),
      ].slice(0, 5 - photoSources.length));
    } catch {
      Alert.alert('사진 추가 실패', '사진을 불러오지 못했습니다. 다시 시도해주세요.');
    }
  };

  const handleConfirmDelete = () => {
    if (!initialValue?.id || !onDelete) {
      return;
    }

    setDeleteConfirmationVisible(false);
    onDelete(initialValue.id);
    resetFields();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={styles.modal}>
          <View style={styles.header}>
            {pickerPage !== 'form' && (
              <TouchableOpacity
                accessibilityLabel="이전 화면"
                activeOpacity={0.7}
                onPress={handleBack}
                style={styles.backButton}
              >
                <Ionicons color={Colors.foundation.black} name="chevron-back" size={22} />
              </TouchableOpacity>
            )}
            <Text style={styles.title}>
              {pickerPage === 'category'
                  ? '카테고리 선택'
                  : pickerPage === 'place-search'
                    ? '장소 검색'
                    : pickerPage === 'manual-place-entry'
                      ? '직접 입력'
                  : mode === 'edit'
                    ? '장소 기록 수정'
                    : '장소 기록 추가'}
            </Text>
            <TouchableOpacity
              accessibilityLabel="장소 추가 닫기"
              activeOpacity={0.7}
              onPress={handleClose}
              style={styles.closeButton}
            >
              <Ionicons color={Colors.foundation.black} name="close" size={22} />
            </TouchableOpacity>
          </View>

          {pickerPage === 'form' && (
            <>
              <ScrollView
                contentContainerStyle={styles.form}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <PhotoField
                  onAddPress={handleAddPhotos}
                  onRemovePress={(uri) => {
                    setPhotoUris((current) => current.filter((item) => item !== uri));
                  }}
                  onRemoveSourcePress={(index) => {
                    setPhotoSources((current) =>
                      current.filter((_, sourceIndex) => sourceIndex !== index),
                    );
                  }}
                  photoSources={photoSources}
                  photoUris={photoUris}
                />
                <SelectField
                  label="장소"
                  onPress={() => setPickerPage('place-search')}
                  placeholder="장소를 선택하세요"
                  subtitle={getPlaceSubtitle(selectedPlace)}
                  value={selectedPlace?.placeName ?? place}
                />
                <SelectField
                  label="방문 시간"
                  onPress={openTimePicker}
                  placeholder="시간을 선택하세요"
                  value={time}
                />
                <SelectField
                  label="카테고리"
                  onPress={() => setPickerPage('category')}
                  placeholder="카테고리를 선택하세요"
                  value={category}
                />
                <FormField
                  label="메모"
                  multiline
                  onChangeText={setText}
                  placeholder="장소에서의 기억을 남겨보세요"
                  textAlignVertical="top"
                  value={text}
                />
              </ScrollView>

              {mode === 'edit' ? (
                <View style={styles.editFooter}>
                  <AuthActionButton
                    label="수정 완료"
                    onPress={handleSubmit}
                    state={canSubmit ? 'on' : 'off'}
                  />

                  {initialValue?.id && onDelete ? (
                    <View style={styles.deleteArea}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setDeleteConfirmationVisible(true)}
                        style={styles.deleteAction}
                      >
                        <Text style={styles.deleteActionText}>장소 기록 삭제</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : (
                <AuthActionButton
                  label="추가하기"
                  onPress={handleSubmit}
                  state={canSubmit ? 'on' : 'off'}
                />
              )}
            </>
          )}

          {pickerPage === 'place-search' && (
            <PlaceSearchView
              onManualPress={() => setPickerPage('manual-place-entry')}
              onQueryChange={setPlaceSearchQuery}
              onSelect={applySelectedPlace}
              query={placeSearchQuery}
              results={placeSearchResults}
            />
          )}

          {pickerPage === 'manual-place-entry' && (
            <ManualPlaceEntryView
              countryName={placeSearchQuery ? undefined : selectedPlace?.countryName}
              initialCityName={placeSearchQuery ? undefined : selectedPlace?.cityName ?? city}
              initialPlaceName={placeSearchQuery || selectedPlace?.placeName}
              onApply={applySelectedPlace}
            />
          )}

          {pickerPage === 'category' && (
            <View style={styles.categoryList}>
              {CATEGORIES.map((item) => (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.7}
                  onPress={() => {
                    setCategory(item);
                    setPickerPage('form');
                  }}
                  style={[
                    styles.categoryOption,
                    category === item && styles.categoryOptionSelected,
                  ]}
                >
                  <Text style={styles.categoryText}>{item}</Text>
                  {category === item && (
                    <Ionicons color={Colors.foundation.black} name="checkmark" size={18} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      <TimeWheelPickerModal
        onClose={() => setTimeWheelVisible(false)}
        onConfirm={saveTime}
        value={parsePlaceEntryTime(time)}
        visible={timeWheelVisible}
      />

      {deleteConfirmationVisible ? (
        <View style={[StyleSheet.absoluteFill, styles.deleteConfirmationOverlay]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setDeleteConfirmationVisible(false)}
          />
          <View style={styles.deleteConfirmationModal}>
            <TouchableOpacity
              accessibilityLabel="삭제 확인 닫기"
              activeOpacity={0.7}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              onPress={() => setDeleteConfirmationVisible(false)}
              style={styles.deleteConfirmationCloseButton}
            >
              <Ionicons color={Colors.foundation.black} name="close" size={20} />
            </TouchableOpacity>
            <Text style={styles.deleteConfirmationTitle}>
              이 장소 기록을 삭제할까요?
            </Text>
            <Text style={styles.deleteConfirmationDescription}>
              {'앱에서만 삭제되며,\n기기의 원본 사진은 유지됩니다.'}
            </Text>
            <View style={styles.deleteConfirmationActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setDeleteConfirmationVisible(false)}
                style={[styles.deleteConfirmationButton, styles.deleteConfirmationCancel]}
              >
                <Text style={styles.deleteConfirmationCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleConfirmDelete}
                style={[styles.deleteConfirmationButton, styles.deleteConfirmationConfirm]}
              >
                <Text style={styles.deleteConfirmationConfirmText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.light.bgOverlay,
  },
  modal: {
    width: '100%',
    maxWidth: 350,
    maxHeight: '86%',
    padding: Spacing.xl,
    gap: Spacing.xl,
    backgroundColor: Colors.foundation.white,
    borderRadius: Radius.lg,
    ...Shadows.modal,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  title: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  form: {
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  input: {
    height: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: 0,
    textAlignVertical: 'center',
    borderWidth: 1,
    borderColor: Colors.foundation.grey500,
    borderRadius: Radius.sm,
    color: Colors.foundation.black,
    ...Typography.body2Regular,
  },
  memoInput: {
    height: 88,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  photoList: {
    gap: Spacing.sm,
  },
  photoAddButton: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    borderRadius: Radius.sm,
    backgroundColor: Colors.light.bgScreen,
  },
  photoAddText: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
  },
  photoPreview: {
    width: 72,
    height: 72,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.sm,
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.56)',
  },
  selectField: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.foundation.grey500,
    borderRadius: Radius.sm,
  },
  selectText: {
    flex: 1,
    gap: 2,
  },
  selectValue: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  selectSubtitle: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
  },
  selectPlaceholder: {
    color: Colors.foundation.grey500,
  },
  categoryList: {
    gap: Spacing.xs,
  },
  categoryOption: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderDefault,
  },
  categoryOptionSelected: {
    backgroundColor: Colors.light.bgScreen,
  },
  categoryText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  editFooter: {
    gap: Spacing.lg,
    marginTop: -Spacing.xs,
  },
  deleteArea: {
    alignItems: 'center',
  },
  deleteAction: {
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  deleteActionText: {
    ...Typography.body2Emphasized,
    color: Colors.warm.dark,
  },
  deleteConfirmationOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.light.bgOverlay,
    zIndex: 10,
  },
  deleteConfirmationModal: {
    width: '100%',
    maxWidth: 334,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: 52,
    paddingBottom: Spacing['3xl'],
    gap: Spacing['2xl'],
    backgroundColor: Colors.foundation.white,
    borderRadius: Radius.lg,
    ...Shadows.modal,
  },
  deleteConfirmationCloseButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmationTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  deleteConfirmationDescription: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteConfirmationActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  deleteConfirmationButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  deleteConfirmationCancel: {
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    backgroundColor: Colors.foundation.white,
  },
  deleteConfirmationConfirm: {
    backgroundColor: Colors.foundation.black,
  },
  deleteConfirmationCancelText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
  },
  deleteConfirmationConfirmText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
});
