import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthActionButton from '@/components/common/AuthActionButton';
import Text from '@/components/common/AppText';
import AppTextInput from '@/components/common/AppTextInput';
import type { TodayTimelineItem } from '@/components/home/TodayTimelineSection';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

export interface TimelineRecordDraft {
  text?: string;
  photoUris: string[];
}

interface TimelineRecordModalProps {
  visible: boolean;
  place: TodayTimelineItem | null;
  dayLabel?: string;
  onCancel: () => void;
  onSave: (record: TimelineRecordDraft) => void;
}

export default function TimelineRecordModal({
  visible,
  place,
  dayLabel,
  onCancel,
  onSave,
}: TimelineRecordModalProps) {
  const insets = useSafeAreaInsets();
  const [memo, setMemo] = React.useState('');
  const [photoUris, setPhotoUris] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (visible) {
      setMemo('');
      setPhotoUris([]);
    }
  }, [visible]);

  const trimmedMemo = memo.trim();
  const canSave = trimmedMemo.length > 0 || photoUris.length > 0;
  const placeMeta = [place?.categoryLabel, place?.cityLabel].filter(Boolean).join(' · ');
  const timeMeta = [place?.timeLabel, dayLabel].filter(Boolean).join(' · ');

  const handlePickPhotos = React.useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    setPhotoUris((current) => {
      const next = [...current];

      result.assets.forEach((asset) => {
        if (!next.includes(asset.uri)) {
          next.push(asset.uri);
        }
      });

      return next;
    });
  }, []);

  const handleRemovePhoto = React.useCallback((uri: string) => {
    setPhotoUris((current) => current.filter((item) => item !== uri));
  }, []);

  const handleSubmit = React.useCallback(() => {
    if (!canSave) {
      return;
    }

    onSave({
      text: trimmedMemo || undefined,
      photoUris,
    });
  }, [canSave, onSave, photoUris, trimmedMemo]);

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={10}>
            <Text style={styles.headerAction}>취소</Text>
          </Pressable>
          <Text style={styles.headerTitle}>기록 남기기</Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit}
            disabled={!canSave}
            hitSlop={10}
          >
            <Text style={[styles.headerAction, !canSave && styles.disabledAction]}>저장</Text>
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 112 }]}
        >
          {!!place && (
            <View style={styles.placeSummary}>
              <Image source={place.imageSource} style={styles.placeImage} />
              <View style={styles.placeTextBlock}>
                <Text style={styles.placeName} numberOfLines={1}>
                  {place.placeName}
                </Text>
                <Text style={styles.placeMeta} numberOfLines={1}>
                  {placeMeta}
                </Text>
                <Text style={styles.placeMeta} numberOfLines={1}>
                  {timeMeta}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>사진 추가 (선택)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoList}
            >
              <Pressable
                accessibilityRole="button"
                onPress={handlePickPhotos}
                style={({ pressed }) => [styles.photoPickerTile, pressed && styles.pressed]}
              >
                <Feather name="camera" size={24} color={Colors.foundation.black} />
                <Text style={styles.photoPickerText}>카메라</Text>
              </Pressable>

              {photoUris.map((uri) => (
                <View key={uri} style={styles.selectedPhotoWrap}>
                  <Image source={{ uri }} style={styles.selectedPhoto} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleRemovePhoto(uri)}
                    style={styles.removePhotoButton}
                    hitSlop={8}
                  >
                    <Feather name="x" size={14} color={Colors.foundation.black} />
                  </Pressable>
                </View>
              ))}

              <Pressable
                accessibilityRole="button"
                onPress={handlePickPhotos}
                style={({ pressed }) => [styles.addPhotoTile, pressed && styles.pressed]}
              >
                <Feather name="plus" size={28} color={Colors.foundation.grey600} />
              </Pressable>
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>메모</Text>
            <AppTextInput
              multiline
              value={memo}
              onChangeText={setMemo}
              placeholder="이 순간에 대해 남겨보세요"
              placeholderTextColor={Colors.foundation.grey400}
              style={styles.memoInput}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.counter}>{memo.length}/500</Text>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <AuthActionButton
            label="저장하기"
            onPress={handleSubmit}
            state={canSave ? 'on' : 'off'}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: Colors.foundation.white,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.foundation.white,
  },
  headerAction: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  disabledAction: {
    color: Colors.foundation.grey300,
  },
  headerTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing['2xl'],
  },
  placeSummary: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
    ...Shadows.card,
  },
  placeImage: {
    width: 64,
    height: 64,
    borderRadius: Radius.xs,
  },
  placeTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  placeName: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  placeMeta: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  photoList: {
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  photoPickerTile: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  photoPickerText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.black,
  },
  selectedPhotoWrap: {
    width: 72,
    height: 72,
  },
  selectedPhoto: {
    width: 72,
    height: 72,
    borderRadius: Radius.sm,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.white,
    ...Shadows.cardSmall,
  },
  addPhotoTile: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.foundation.grey300,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  pressed: {
    opacity: 0.72,
  },
  memoInput: {
    minHeight: 136,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.borderDefault,
    borderRadius: Radius.sm,
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  counter: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey400,
    textAlign: 'right',
    marginTop: -Spacing.sm,
  },
  bottomBar: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    bottom: 0,
    paddingTop: Spacing.md,
    backgroundColor: Colors.foundation.white,
  },
});
