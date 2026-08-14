import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from 'react-native';

import AuthActionButton from '@/components/common/AuthActionButton';
import AppTextInput from '@/components/common/AppTextInput';
import Text from '@/components/common/AppText';
import { PlaceSearchContent, type PlaceOption } from '@/components/common/PlaceSearchModal';
import ManualPlaceEntryView from '@/components/record/ManualPlaceEntryView';
import TimeWheelPickerModal from '@/components/record/TimeWheelPickerModal';
import {
  getPlaceCategoryLabel,
  normalizePlaceCategoryValue,
  PLACE_CATEGORY_OPTIONS,
} from '@/constants/placeCategories';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
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
  googleDisplayName?: string;
  place: string;
  placeName?: string;
  formattedAddress?: string;
  time?: string;
  category?: string;
  city?: string;
  cityName?: string;
  countryName?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  text?: string;
  photoAssets?: ImagePicker.ImagePickerAsset[];
  photoUris?: string[];
  photoSources?: ImageSourcePropType[];
  dayId?: string;
  dayNumber?: number;
  dateKey?: string;
  dateLabel?: string;
  weekdayLabel?: string;
}

export type PlaceEntryFormMode = 'create' | 'edit';

export interface PlaceEntryDayOption {
  id: string;
  dayNumber: number;
  dateLabel: string;
  weekdayLabel: string;
  photoCount?: number;
}

interface PlaceCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (place: PlaceCreateInput) => Promise<void> | void;
  onDelete?: (entryId: string) => void;
  initialValue?: Partial<PlaceCreateInput> & { id?: string };
  mode?: PlaceEntryFormMode;
  tripId?: string;
  dayId?: string;
  tripDestinationName?: string;
  tripDestinationCountry?: string;
  tripLatitude?: number;
  tripLongitude?: number;
  dayOptions?: PlaceEntryDayOption[];
  selectedDayId?: string;
  requireTripDay?: boolean;
  showPhotoSection?: boolean;
  showRecordField?: boolean;
  showOptionalRecordSection?: boolean;
  showCategoryField?: boolean;
  titleLabel?: string;
  submitLabel?: string;
  submittingLabel?: string;
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
        <Ionicons color={Colors.foundation.black} name="chevron-forward" size={18} />
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
        <TouchableOpacity
          accessibilityLabel="사진 추가"
          activeOpacity={0.7}
          onPress={onAddPress}
          style={styles.photoAddButton}
        >
          <Ionicons color={Colors.foundation.grey500} name="images-outline" size={22} />
          <Text style={styles.photoAddText}>{photoCount}장</Text>
        </TouchableOpacity>

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
  | 'manual-place-entry'
  | 'travel-day'
  | 'date-picker';

type CalendarView = 'days' | 'years' | 'months';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const CALENDAR_MONTHS = Array.from({ length: 12 }, (_, index) => index);
const CALENDAR_SWIPE_THRESHOLD = 40;
const CALENDAR_SELECTOR_CELL_HEIGHT = 44;
const CALENDAR_SELECTOR_ROW_GAP = Spacing.sm;

function getInitialSelectedPlace(value?: Partial<PlaceCreateInput>): SelectedPlace | undefined {
  const placeName = value?.placeName ?? value?.place;

  if (!placeName) {
    return undefined;
  }

  return {
    source: value?.source ?? 'manual',
    googlePlaceId: value?.googlePlaceId,
    googleDisplayName: value?.googleDisplayName,
    placeName,
    formattedAddress: value?.formattedAddress,
    cityName: value?.cityName ?? value?.city,
    countryName: value?.countryName,
    countryCode: value?.countryCode,
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

function toPlaceOption(place?: SelectedPlace): PlaceOption | null {
  if (!place?.placeName) {
    return null;
  }

  return {
    id: place.googlePlaceId ?? place.placeName,
    name: place.placeName,
    address: place.formattedAddress,
    city: place.cityName,
    country: place.countryName,
    countryCode: place.countryCode,
    googleDisplayName: place.googleDisplayName,
    placeId: place.googlePlaceId,
    latitude: place.latitude,
    longitude: place.longitude,
    source: place.source,
  };
}

function toSelectedPlace(place: PlaceOption): SelectedPlace {
  return {
    source: place.source,
    googlePlaceId: place.placeId,
    googleDisplayName: place.googleDisplayName,
    placeName: place.name,
    formattedAddress: place.address,
    cityName: place.city,
    countryName: place.country,
    countryCode: place.countryCode,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDayOptionDate(day?: PlaceEntryDayOption): Date | null {
  if (!day) {
    return null;
  }

  const matched = day.dateLabel.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);

  if (!matched) {
    return null;
  }

  return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]));
}

function getDayOptionDateKey(day: PlaceEntryDayOption): string | null {
  const date = parseDayOptionDate(day);
  return date ? toDateKey(date) : null;
}

function formatDateLabel(date: Date): string {
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

function createDayOptionFromDate(date: Date): PlaceEntryDayOption {
  const dateKey = toDateKey(date);

  return {
    id: `local-${dateKey}`,
    dayNumber: 0,
    dateLabel: formatDateLabel(date),
    weekdayLabel: WEEKDAY_LABELS[date.getDay()],
    photoCount: 0,
  };
}

function normalizeDayOptions(days: PlaceEntryDayOption[]): PlaceEntryDayOption[] {
  const dayMap = new Map<string, PlaceEntryDayOption>();

  for (const day of days) {
    const dateKey = getDayOptionDateKey(day);
    if (!dateKey) {
      continue;
    }

    dayMap.set(dateKey, dayMap.get(dateKey) ?? day);
  }

  return [...dayMap.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([, day], index) => ({
      ...day,
      dayNumber: index + 1,
    }));
}

function createCalendarWeeks(month: Date): (Date | null)[][] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: firstDay }, () => null);

  for (let day = 1; day <= lastDate; day += 1) {
    cells.push(new Date(year, monthIndex, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
}

function formatDayFieldValue(day?: PlaceEntryDayOption) {
  if (!day) {
    return undefined;
  }

  return `${day.dayNumber}일차 · ${day.dateLabel} ${day.weekdayLabel}`;
}

const PLACE_PHOTO_PICKER_QUALITY = 0.8;

export default function PlaceCreateModal({
  visible,
  onClose,
  onSubmit,
  onDelete,
  initialValue,
  mode = 'create',
  tripId = '',
  dayId = '',
  tripDestinationName,
  tripDestinationCountry,
  tripLatitude,
  tripLongitude,
  dayOptions = [],
  selectedDayId,
  requireTripDay = false,
  showPhotoSection = true,
  showRecordField = false,
  showOptionalRecordSection = false,
  showCategoryField = true,
  titleLabel,
  submitLabel,
  submittingLabel,
}: PlaceCreateModalProps) {
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [text, setText] = useState('');
  const [isOptionalRecordExpanded, setOptionalRecordExpanded] = useState(false);
  const [photoAssets, setPhotoAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [photoSources, setPhotoSources] = useState<ImageSourcePropType[]>([]);
  const [pickerPage, setPickerPage] = useState<PickerPage>('form');
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace>();
  const [timeWheelVisible, setTimeWheelVisible] = useState(false);
  const [hasUserEditedTime, setHasUserEditedTime] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [customDayOptions, setCustomDayOptions] = useState<PlaceEntryDayOption[]>([]);
  const [selectedDay, setSelectedDay] = useState<PlaceEntryDayOption>();
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('days');
  const [yearSelectorHeight, setYearSelectorHeight] = useState(0);
  const yearSelectorRef = useRef<ScrollView>(null);
  const formScrollRef = useRef<ScrollView>(null);
  const optionalRecordInputRef = useRef<TextInput>(null);
  const isRecordInputFocusedRef = useRef(false);
  const pendingOptionalRecordFocusRef = useRef(false);
  const recordScrollFrameRef = useRef<number | null>(null);
  const normalizedPropDayOptions = useMemo(() => normalizeDayOptions(dayOptions), [dayOptions]);
  const availableDayOptions = useMemo(
    () => normalizeDayOptions([...dayOptions, ...customDayOptions]),
    [customDayOptions, dayOptions],
  );
  const calendarYears = useMemo(
    () => Array.from({ length: 51 }, (_, index) => 2000 + index),
    [],
  );
  const activeYearIndex = Math.max(0, calendarYears.indexOf(calendarMonth.getFullYear()));

  const scrollToFocusedRecord = useCallback(() => {
    if (!isRecordInputFocusedRef.current || pickerPage !== 'form') {
      return;
    }

    if (recordScrollFrameRef.current != null) {
      cancelAnimationFrame(recordScrollFrameRef.current);
    }

    recordScrollFrameRef.current = requestAnimationFrame(() => {
      recordScrollFrameRef.current = null;
      formScrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [pickerPage]);

  const getInitialSelectedDay = useCallback(() => {
    const initialDayId = initialValue?.dayId ?? selectedDayId;

    return (
      normalizedPropDayOptions.find((day) => day.id === initialDayId) ??
      normalizedPropDayOptions[0]
    );
  }, [initialValue?.dayId, normalizedPropDayOptions, selectedDayId]);

  const resetFields = () => {
    const nextPlace = getInitialSelectedPlace(initialValue);
    const nextDay = getInitialSelectedDay();
    setSelectedPlace(nextPlace);
    setPlace(nextPlace?.placeName ?? '');
    setTime(initialValue?.time ?? '');
    setCategory(normalizePlaceCategoryValue(initialValue?.category) ?? '');
    setCity(nextPlace?.cityName ?? '');
    setText(initialValue?.text ?? '');
    setOptionalRecordExpanded(Boolean(initialValue?.text?.trim()));
    setPhotoAssets(initialValue?.photoAssets ?? []);
    setPhotoUris(initialValue?.photoUris ?? []);
    setPhotoSources(initialValue?.photoSources ?? []);
    setTimeWheelVisible(false);
    setHasUserEditedTime(false);
    setSubmitting(false);
    setDeleteConfirmationVisible(false);
    setCustomDayOptions([]);
    setSelectedDay(nextDay);
    setCalendarMonth(parseDayOptionDate(nextDay ?? dayOptions[0]) ?? new Date());
    setCalendarView('days');
    setPickerPage('form');
  };

  useEffect(() => {
    if (visible && !isSubmitting) {
      const nextPlace = getInitialSelectedPlace(initialValue);
      const nextDay = getInitialSelectedDay();
      setSelectedPlace(nextPlace);
      setPlace(nextPlace?.placeName ?? '');
      setTime(initialValue?.time ?? '');
      setCategory(normalizePlaceCategoryValue(initialValue?.category) ?? '');
      setCity(nextPlace?.cityName ?? '');
      setText(initialValue?.text ?? '');
      setOptionalRecordExpanded(Boolean(initialValue?.text?.trim()));
      setPhotoAssets(initialValue?.photoAssets ?? []);
      setPhotoUris(initialValue?.photoUris ?? []);
      setPhotoSources(initialValue?.photoSources ?? []);
      setTimeWheelVisible(false);
      setHasUserEditedTime(false);
      setDeleteConfirmationVisible(false);
      setCustomDayOptions([]);
      setSelectedDay(nextDay);
      setCalendarMonth(parseDayOptionDate(nextDay ?? dayOptions[0]) ?? new Date());
      setCalendarView('days');
      setPickerPage('form');
      isRecordInputFocusedRef.current = false;
      pendingOptionalRecordFocusRef.current = false;

      const frame = requestAnimationFrame(() => {
        formScrollRef.current?.scrollTo({ y: 0, animated: false });
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [visible, initialValue, dayOptions, selectedDayId, getInitialSelectedDay, isSubmitting]);

  useEffect(() => {
    if (!visible) {
      isRecordInputFocusedRef.current = false;
      pendingOptionalRecordFocusRef.current = false;
      return;
    }

    const keyboardEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardSubscription = Keyboard.addListener(keyboardEvent, scrollToFocusedRecord);

    return () => keyboardSubscription.remove();
  }, [scrollToFocusedRecord, visible]);

  useEffect(() => {
    if (!isOptionalRecordExpanded || !pendingOptionalRecordFocusRef.current) {
      return;
    }

    pendingOptionalRecordFocusRef.current = false;
    const frame = requestAnimationFrame(() => {
      optionalRecordInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [isOptionalRecordExpanded]);

  useEffect(
    () => () => {
      if (recordScrollFrameRef.current != null) {
        cancelAnimationFrame(recordScrollFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (pickerPage !== 'date-picker' || calendarView !== 'years' || yearSelectorHeight <= 0) {
      return;
    }

    const selectedRow = Math.floor(activeYearIndex / 3);
    const rowHeight = CALENDAR_SELECTOR_CELL_HEIGHT + CALENDAR_SELECTOR_ROW_GAP;
    const targetOffset = Math.max(
      0,
      selectedRow * rowHeight - (yearSelectorHeight - CALENDAR_SELECTOR_CELL_HEIGHT) / 2,
    );
    const frame = requestAnimationFrame(() => {
      yearSelectorRef.current?.scrollTo({ y: targetOffset, animated: false });
    });

    return () => cancelAnimationFrame(frame);
  }, [activeYearIndex, calendarView, pickerPage, yearSelectorHeight]);

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    isRecordInputFocusedRef.current = false;
    pendingOptionalRecordFocusRef.current = false;
    resetFields();
    onClose();
  };

  const handleToggleOptionalRecord = () => {
    if (isOptionalRecordExpanded) {
      pendingOptionalRecordFocusRef.current = false;
      optionalRecordInputRef.current?.blur();
      setOptionalRecordExpanded(false);
      return;
    }

    pendingOptionalRecordFocusRef.current = true;
    setOptionalRecordExpanded(true);
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    const trimmedPlace = place.trim();

    if (
      !trimmedPlace ||
      (availableDayOptions.length > 0 && !selectedDay) ||
      (requireTripDay && !selectedDay)
    ) {
      return;
    }

    const resolvedPlace: SelectedPlace = selectedPlace ?? {
      source: 'manual',
      placeName: trimmedPlace,
      cityName: city.trim() || undefined,
    };

    setSubmitting(true);

    try {
      await onSubmit({
        ...resolvedPlace,
        place: trimmedPlace,
        placeName: trimmedPlace,
        time: time.trim() || undefined,
        category: category.trim() || undefined,
        city: resolvedPlace.cityName,
        text: text.trim() || undefined,
        photoAssets: photoUris
          .map((uri) => photoAssets.find((asset) => asset.uri === uri))
          .filter((asset): asset is ImagePicker.ImagePickerAsset => Boolean(asset)),
        photoUris: photoUris.length > 0 ? photoUris : undefined,
        photoSources: photoSources.length > 0 ? photoSources : undefined,
        dayId: selectedDay?.id,
        dayNumber: selectedDay?.dayNumber,
        dateKey: selectedDay ? getDayOptionDateKey(selectedDay) ?? undefined : undefined,
        dateLabel: selectedDay?.dateLabel,
        weekdayLabel: selectedDay?.weekdayLabel,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    !isSubmitting &&
    (mode !== 'edit' ||
      place.trim() !==
        (initialValue?.placeName ?? initialValue?.place ?? '').trim() ||
      time.trim() !== (initialValue?.time ?? '').trim() ||
      category !== (normalizePlaceCategoryValue(initialValue?.category) ?? '') ||
      city.trim() !== (initialValue?.cityName ?? initialValue?.city ?? '').trim() ||
      text.trim() !== (initialValue?.text ?? '').trim() ||
      selectedDay?.id !== (initialValue?.dayId ?? selectedDayId) ||
      photoUris.join('|') !== (initialValue?.photoUris ?? []).join('|') ||
      photoSources.length !== (initialValue?.photoSources ?? []).length ||
      photoAssets.map((asset) => asset.uri).join('|') !==
        (initialValue?.photoAssets ?? []).map((asset) => asset.uri).join('|')) &&
    place.trim().length > 0 &&
    (availableDayOptions.length === 0 || Boolean(selectedDay)) &&
    (!requireTripDay || Boolean(selectedDay));

  const applySelectedPlace = (nextPlace: SelectedPlace) => {
    setSelectedPlace(nextPlace);
    setPlace(nextPlace.placeName);
    setCity(nextPlace.cityName ?? '');
    setPickerPage('form');
  };

  const applyPlaceOption = (nextPlace: PlaceOption) => {
    applySelectedPlace(toSelectedPlace(nextPlace));
  };

  const handleBack = () => {
    if (pickerPage === 'date-picker' && calendarView === 'months') {
      setCalendarView('years');
      return;
    }

    if (pickerPage === 'date-picker' && calendarView === 'years') {
      setCalendarView('days');
      return;
    }

    setPickerPage('form');
  };

  const openTimePicker = () => {
    setTimeWheelVisible(true);
  };

  const saveTime = (nextTime: PlaceEntryTime) => {
    setTime(formatPlaceEntryTime(nextTime));
    setHasUserEditedTime(true);
    setTimeWheelVisible(false);
  };

  const applySelectedDay = (nextDay: PlaceEntryDayOption) => {
    setSelectedDay(nextDay);
    setCalendarView('days');
    setPickerPage('form');
  };

  const openDatePicker = () => {
    setCalendarView('days');
    setPickerPage('date-picker');
  };

  const handleChangeCalendarMonth = useCallback((offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }, []);

  const handleSelectCalendarYear = (year: number) => {
    setCalendarMonth((current) => new Date(year, current.getMonth(), 1));
    setCalendarView('days');
  };

  const handleSelectCalendarMonth = (monthIndex: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), monthIndex, 1));
    setCalendarView('days');
  };

  const calendarSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          calendarView === 'days' &&
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) < CALENDAR_SWIPE_THRESHOLD) {
            return;
          }

          handleChangeCalendarMonth(gesture.dx < 0 ? 1 : -1);
        },
      }),
    [calendarView, handleChangeCalendarMonth],
  );

  const handleSelectCalendarDate = (date: Date) => {
    const dateKey = toDateKey(date);
    const existingDay = availableDayOptions.find((day) => getDayOptionDateKey(day) === dateKey);

    if (existingDay) {
      applySelectedDay(existingDay);
      return;
    }

    Alert.alert(
      '선택한 날짜를 여행 일정에 추가할까요?',
      undefined,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '추가',
          onPress: () => {
            const newDay = createDayOptionFromDate(date);
            const nextDays = normalizeDayOptions([...availableDayOptions, newDay]);
            const nextSelectedDay = nextDays.find((day) => getDayOptionDateKey(day) === dateKey);

            setCustomDayOptions((current) => normalizeDayOptions([...current, newDay]));
            setSelectedDay(nextSelectedDay ?? newDay);
            setCalendarView('days');
            setPickerPage('form');
          },
        },
      ],
    );
  };

  const handleAddPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 0,
        quality: PLACE_PHOTO_PICKER_QUALITY,
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

      setPhotoAssets((current) => {
        const assetsByIdentifier = new Map(
          current.map((asset) => [asset.uri, asset]),
        );

        result.assets.forEach((asset) => {
          assetsByIdentifier.set(asset.uri, asset);
        });

        return [...assetsByIdentifier.values()];
      });
      setPhotoUris((current) => [
        ...new Set([...current, ...result.assets.map((asset) => asset.uri)]),
      ]);
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
  const travelDayField = availableDayOptions.length > 0 ? (
    <SelectField
      label="여행일자"
      onPress={() => setPickerPage('travel-day')}
      placeholder="여행일자를 선택하세요"
      value={formatDayFieldValue(selectedDay)}
    />
  ) : null;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={pickerPage === 'place-search' ? undefined : Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={pickerPage !== 'place-search'}
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
                      : pickerPage === 'travel-day'
                        ? '여행일자 선택'
                        : pickerPage === 'date-picker'
                          ? '다른 날짜 선택'
                  : mode === 'edit'
                    ? titleLabel ?? '장소 기록 수정'
                    : titleLabel ?? '장소 기록 추가'}
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
                ref={formScrollRef}
                contentContainerStyle={styles.form}
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {showPhotoSection ? (
                  <PhotoField
                    onAddPress={handleAddPhotos}
                    onRemovePress={(uri) => {
                      setPhotoUris((current) => current.filter((item) => item !== uri));
                      setPhotoAssets((current) => current.filter((asset) => asset.uri !== uri));
                    }}
                    onRemoveSourcePress={(index) => {
                      setPhotoSources((current) =>
                        current.filter((_, sourceIndex) => sourceIndex !== index),
                      );
                    }}
                    photoSources={photoSources}
                    photoUris={photoUris}
                  />
                ) : null}
                {showOptionalRecordSection ? travelDayField : null}
                <SelectField
                  label="장소"
                  onPress={() => setPickerPage('place-search')}
                  placeholder="장소를 선택하세요"
                  subtitle={getPlaceSubtitle(selectedPlace)}
                  value={selectedPlace?.placeName ?? place}
                />
                {selectedPlace?.source === 'google' ? (
                  <View style={styles.googleLabelField}>
                    <Text style={styles.googleReferenceText}>
                      Google Maps 장소: {selectedPlace.googleDisplayName ?? selectedPlace.placeName}
                    </Text>
                    <AppTextInput
                      onChangeText={setPlace}
                      placeholder="저장할 장소 이름"
                      placeholderTextColor={Colors.foundation.grey500}
                      style={styles.googleLabelInput}
                      value={place}
                    />
                  </View>
                ) : null}
                {!showOptionalRecordSection ? travelDayField : null}
                <SelectField
                  label="방문 시간"
                  onPress={openTimePicker}
                  placeholder="시간을 선택하세요"
                  value={time}
                />
                {showRecordField ? (
                  <View style={styles.field}>
                    <Text style={styles.label}>기록</Text>
                    <TextInput
                      multiline
                      onChangeText={setText}
                      placeholder="기록을 입력하세요"
                      placeholderTextColor={Colors.foundation.grey500}
                      style={styles.recordInput}
                      textAlignVertical="top"
                      value={text}
                    />
                  </View>
                ) : null}
                {showOptionalRecordSection ? (
                  <View style={styles.field}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      activeOpacity={0.7}
                      onPress={handleToggleOptionalRecord}
                      style={styles.optionalRecordToggle}
                    >
                      <View style={styles.optionalRecordTitleRow}>
                        <Text style={styles.optionalRecordLabel}>기록 추가</Text>
                        <Text style={styles.optionalRecordHint}>(선택)</Text>
                      </View>
                      <Ionicons
                        color={Colors.foundation.grey500}
                        name={isOptionalRecordExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                      />
                    </TouchableOpacity>
                    {isOptionalRecordExpanded ? (
                      <TextInput
                        ref={optionalRecordInputRef}
                        multiline
                        onChangeText={setText}
                        onContentSizeChange={scrollToFocusedRecord}
                        onBlur={() => {
                          isRecordInputFocusedRef.current = false;
                        }}
                        onFocus={() => {
                          isRecordInputFocusedRef.current = true;
                          scrollToFocusedRecord();
                        }}
                        placeholder="이 장소에서 기억하고 싶은 것을 남겨보세요"
                        placeholderTextColor={Colors.foundation.grey500}
                        style={styles.recordInput}
                        textAlignVertical="top"
                        value={text}
                      />
                    ) : null}
                  </View>
                ) : null}
                {showCategoryField ? (
                  <SelectField
                    label="카테고리"
                    onPress={() => setPickerPage('category')}
                    placeholder="카테고리를 선택하세요"
                    value={getPlaceCategoryLabel(category)}
                  />
                ) : null}
              </ScrollView>

              {mode === 'edit' ? (
                <View style={styles.editFooter}>
                  <AuthActionButton
                    disabled={isSubmitting}
                    label={
                      isSubmitting && photoAssets.length > 0 && submittingLabel
                        ? submittingLabel
                        : submitLabel ?? '수정 완료'
                    }
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
                  disabled={isSubmitting}
                  label={
                    isSubmitting && photoAssets.length > 0 && submittingLabel
                      ? submittingLabel
                      : submitLabel ?? '추가하기'
                  }
                  onPress={handleSubmit}
                  state={canSubmit ? 'on' : 'off'}
                />
              )}
            </>
          )}

          {pickerPage === 'place-search' && (
            <View style={styles.searchStep}>
              <PlaceSearchContent
                tripId={tripId}
                dayId={dayId}
                tripDestinationName={tripDestinationName ?? selectedPlace?.cityName ?? city}
                tripDestinationCountry={tripDestinationCountry ?? selectedPlace?.countryName}
                tripLatitude={tripLatitude}
                tripLongitude={tripLongitude}
                selectedPlace={toPlaceOption(selectedPlace)}
                onSelectPlace={applyPlaceOption}
                autoFocus
              />
            </View>
          )}

          {pickerPage === 'manual-place-entry' && (
            <ManualPlaceEntryView
              countryName={selectedPlace?.countryName}
              initialCityName={selectedPlace?.cityName ?? city}
              initialPlaceName={selectedPlace?.placeName}
              onApply={applySelectedPlace}
            />
          )}

          {pickerPage === 'category' && (
            <View style={styles.categoryList}>
              {PLACE_CATEGORY_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  activeOpacity={0.7}
                  onPress={() => {
                    setCategory(item.value);
                    setPickerPage('form');
                  }}
                  style={[
                    styles.categoryOption,
                    category === item.value && styles.categoryOptionSelected,
                  ]}
                >
                  <Text style={styles.categoryText}>{item.label}</Text>
                  {category === item.value && (
                    <Ionicons color={Colors.foundation.black} name="checkmark" size={18} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {pickerPage === 'travel-day' && (
            <ScrollView
              contentContainerStyle={styles.dayPickerList}
              showsVerticalScrollIndicator={false}
            >
              {availableDayOptions.map((day) => {
                const selected = selectedDay?.id === day.id;

                return (
                  <TouchableOpacity
                    key={day.id}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    onPress={() => applySelectedDay(day)}
                    style={[styles.dayPickerOption, selected && styles.dayPickerOptionSelected]}
                  >
                    <View style={styles.dayPickerTextGroup}>
                      <Text style={styles.dayPickerDayText}>{day.dayNumber}일차</Text>
                      <Text style={styles.dayPickerDateText}>
                        {day.dateLabel} {day.weekdayLabel}
                      </Text>
                    </View>
                    {selected ? (
                      <Ionicons color={Colors.foundation.grey800} name="checkmark" size={18} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.7}
                onPress={openDatePicker}
                style={styles.addOtherDayOption}
              >
                <Text style={styles.addOtherDayText}>+ 다른 날짜 선택</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {pickerPage === 'date-picker' && (
            <View style={styles.calendarStep}>
              <View style={styles.calendarHeader}>
                {calendarView === 'days' ? (
                  <View style={styles.calendarHeaderGroup}>
                    <TouchableOpacity
                      accessibilityLabel="이전 달"
                      accessibilityRole="button"
                      activeOpacity={0.7}
                      onPress={() => handleChangeCalendarMonth(-1)}
                      style={styles.calendarNavButton}
                    >
                      <Ionicons color={Colors.foundation.black} name="chevron-back" size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityLabel="연월 선택"
                      accessibilityRole="button"
                      activeOpacity={0.7}
                      onPress={() => setCalendarView('years')}
                      style={styles.calendarTitleButton}
                    >
                      <Text style={styles.calendarTitle}>
                        {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityLabel="다음 달"
                      accessibilityRole="button"
                      activeOpacity={0.7}
                      onPress={() => handleChangeCalendarMonth(1)}
                      style={styles.calendarNavButton}
                    >
                      <Ionicons color={Colors.foundation.black} name="chevron-forward" size={20} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    accessibilityLabel="연월 선택 전환"
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    onPress={() => setCalendarView(calendarView === 'years' ? 'days' : 'years')}
                    style={styles.calendarTitleButton}
                  >
                    <Text style={styles.calendarTitle}>
                      {calendarView === 'years' ? '연도 선택' : `${calendarMonth.getFullYear()}년`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {calendarView === 'days' && (
                <View {...calendarSwipeResponder.panHandlers}>
                  <View style={styles.weekdayRow}>
                    {WEEKDAY_LABELS.map((weekday) => (
                      <Text key={weekday} style={styles.weekdayText}>{weekday}</Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {createCalendarWeeks(calendarMonth).map((week, weekIndex) => (
                      <View key={`week-${weekIndex}`} style={styles.calendarRow}>
                        {week.map((date, dayIndex) => {
                          if (!date) {
                            return <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.calendarDayCell} />;
                          }

                          const dateKey = toDateKey(date);
                          const selectedDateKey = selectedDay ? getDayOptionDateKey(selectedDay) : null;
                          const selected = dateKey === selectedDateKey;

                          return (
                            <TouchableOpacity
                              key={dateKey}
                              accessibilityRole="button"
                              activeOpacity={0.7}
                              onPress={() => handleSelectCalendarDate(date)}
                              style={[styles.calendarDayCell, selected && styles.calendarDaySelected]}
                            >
                              <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected]}>
                                {date.getDate()}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {calendarView === 'years' && (
                <ScrollView
                  ref={yearSelectorRef}
                  contentContainerStyle={styles.calendarSelectorGrid}
                  onLayout={(event) => setYearSelectorHeight(event.nativeEvent.layout.height)}
                  showsVerticalScrollIndicator={false}
                  style={styles.calendarSelectorScroll}
                >
                  {calendarYears.map((year) => {
                    const active = year === calendarMonth.getFullYear();

                    return (
                      <TouchableOpacity
                        key={year}
                        accessibilityRole="button"
                        activeOpacity={0.7}
                        onPress={() => handleSelectCalendarYear(year)}
                        style={[styles.calendarSelectorCell, active && styles.calendarSelectorCellActive]}
                      >
                        <Text style={[styles.calendarSelectorText, active && styles.calendarSelectorTextActive]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {calendarView === 'months' && (
                <View style={styles.calendarSelectorGrid}>
                  {CALENDAR_MONTHS.map((monthIndex) => {
                    const active = monthIndex === calendarMonth.getMonth();

                    return (
                      <TouchableOpacity
                        key={monthIndex}
                        accessibilityRole="button"
                        activeOpacity={0.7}
                        onPress={() => handleSelectCalendarMonth(monthIndex)}
                        style={[styles.calendarSelectorCell, active && styles.calendarSelectorCellActive]}
                      >
                        <Text style={[styles.calendarSelectorText, active && styles.calendarSelectorTextActive]}>
                          {monthIndex + 1}월
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
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
    overflow: 'hidden',
    ...Shadows.modal,
  },
  searchStep: {
    height: 430,
    marginHorizontal: -Spacing.xl,
    overflow: 'hidden',
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
  googleLabelField: {
    gap: Spacing.sm,
  },
  googleReferenceText: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
  },
  googleLabelInput: {
    height: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: Colors.foundation.grey500,
    borderRadius: Radius.sm,
    color: Colors.foundation.black,
    ...Typography.body2Regular,
  },
  recordInput: {
    minHeight: 104,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.foundation.grey500,
    borderRadius: Radius.sm,
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  optionalRecordToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  optionalRecordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  optionalRecordLabel: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  optionalRecordHint: {
    ...Typography.body2Regular,
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
  dayPickerList: {
    gap: Spacing.sm,
  },
  dayPickerOption: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  dayPickerOptionSelected: {
    backgroundColor: Colors.light.bgScreen,
  },
  dayPickerTextGroup: {
    gap: 2,
  },
  dayPickerDayText: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  dayPickerDateText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  addOtherDayOption: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  addOtherDayText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey700,
  },
  calendarStep: {
    height: 360,
    gap: Spacing.lg,
  },
  calendarHeader: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitleButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  calendarTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayText: {
    flex: 1,
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey500,
    textAlign: 'center',
  },
  calendarGrid: {
    gap: Spacing.xs,
  },
  calendarRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  calendarDayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  calendarDaySelected: {
    backgroundColor: Colors.foundation.black,
  },
  calendarDayText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  calendarDayTextSelected: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  calendarSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  calendarSelectorScroll: {
    flex: 1,
  },
  calendarSelectorCell: {
    width: '31%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  calendarSelectorCellActive: {
    backgroundColor: Colors.foundation.black,
  },
  calendarSelectorText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  calendarSelectorTextActive: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
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
    backgroundColor: '#EB524D',
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
