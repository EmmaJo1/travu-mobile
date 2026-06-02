import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import { Typography } from '@/constants/theme';

interface FullScreenImageViewerProps {
  images: ImageSourcePropType[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
}

function clampIndex(index: number, imageCount: number): number {
  return Math.max(0, Math.min(index, imageCount - 1));
}

export default function FullScreenImageViewer({
  images,
  initialIndex,
  visible,
  onClose,
}: FullScreenImageViewerProps) {
  const listRef = useRef<FlatList<ImageSourcePropType>>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const selectedIndex = clampIndex(initialIndex, images.length);
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);

  useEffect(() => {
    if (!visible || images.length === 0) {
      return;
    }

    setCurrentIndex(selectedIndex);
    const animationFrameId = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        animated: false,
        offset: selectedIndex * width,
      });
    });

    return () => cancelAnimationFrame(animationFrameId);
  }, [images.length, selectedIndex, visible, width]);

  if (images.length === 0) {
    return null;
  }

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrentIndex(
      clampIndex(Math.round(event.nativeEvent.contentOffset.x / width), images.length),
    );
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.viewer}>
        <FlatList
          ref={listRef}
          data={images}
          getItemLayout={(_, index) => ({
            index,
            length: width,
            offset: width * index,
          })}
          horizontal
          initialScrollIndex={selectedIndex}
          keyExtractor={(_, index) => `image-${index}`}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          pagingEnabled
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={onClose} style={[styles.page, { width }]}>
              <Image resizeMode="contain" source={item} style={styles.image} />
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
        />

        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <TouchableOpacity
            accessibilityLabel="이미지 뷰어 닫기"
            accessibilityRole="button"
            activeOpacity={0.7}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            onPress={onClose}
            style={[styles.closeButton, { top: insets.top + 12 }]}
          >
            <Ionicons color="#FFFFFF" name="close" size={28} />
          </TouchableOpacity>

          {images.length > 1 ? (
            <Text style={[styles.indexText, { bottom: insets.bottom + 20 }]}>
              {currentIndex + 1} / {images.length}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewer: {
    flex: 1,
    backgroundColor: '#050505',
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  indexText: {
    position: 'absolute',
    alignSelf: 'center',
    ...Typography.body2Emphasized,
    color: '#FFFFFF',
  },
});
