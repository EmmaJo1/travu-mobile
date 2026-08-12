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
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

export interface FullScreenImageViewerAction {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: (index: number) => void;
}

interface FullScreenImageViewerProps {
  images: ImageSourcePropType[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  actionLabel?: string;
  onPressAction?: (index: number) => void;
  actions?: FullScreenImageViewerAction[];
  leadingAction?: FullScreenImageViewerAction;
  renderActionSheet?: (params: { currentIndex: number; closeSheet: () => void }) => React.ReactNode;
  presentation?: 'modal' | 'inline';
}

function clampIndex(index: number, imageCount: number): number {
  return Math.max(0, Math.min(index, imageCount - 1));
}

export default function FullScreenImageViewer({
  images,
  initialIndex,
  visible,
  onClose,
  actionLabel,
  onPressAction,
  actions = [],
  leadingAction,
  renderActionSheet,
  presentation = 'modal',
}: FullScreenImageViewerProps) {
  const listRef = useRef<FlatList<ImageSourcePropType>>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const selectedIndex = clampIndex(initialIndex, images.length);
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const [isActionMenuOpen, setActionMenuOpen] = useState(false);
  const [isActionSheetOpen, setActionSheetOpen] = useState(false);

  useEffect(() => {
    if (!visible || images.length === 0) {
      return;
    }

    setCurrentIndex(selectedIndex);
    setActionMenuOpen(false);
    setActionSheetOpen(false);
    const animationFrameId = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        animated: false,
        offset: selectedIndex * width,
      });
    });

    return () => cancelAnimationFrame(animationFrameId);
  }, [images.length, selectedIndex, visible, width]);

  if (!visible || images.length === 0) {
    return null;
  }

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrentIndex(
      clampIndex(Math.round(event.nativeEvent.contentOffset.x / width), images.length),
    );
  };

  const closeActionSheet = () => setActionSheetOpen(false);

  const handleClose = () => {
    if (isActionSheetOpen) {
      closeActionSheet();
      return;
    }

    onClose();
  };

  const handlePressBottomAction = () => {
    onPressAction?.(currentIndex);

    if (renderActionSheet) {
      setActionSheetOpen(true);
    }
  };

  const viewerContent = (
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
            <Pressable accessibilityRole="button" onPress={handleClose} style={[styles.page, { width }]}>
              <Image resizeMode="contain" source={item} style={styles.image} />
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
        />

        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {leadingAction ? (
            <TouchableOpacity
              accessibilityLabel={leadingAction.label}
              accessibilityRole="button"
              activeOpacity={0.7}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              onPress={() => leadingAction.onPress(currentIndex)}
              style={[styles.leadingButton, { top: insets.top + 12 }]}
            >
              <Ionicons
                color={leadingAction.destructive ? '#EB524D' : '#FFFFFF'}
                name={leadingAction.icon}
                size={24}
              />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            accessibilityLabel="이미지 뷰어 닫기"
            accessibilityRole="button"
            activeOpacity={0.7}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            onPress={handleClose}
            style={[
              styles.closeButton,
              actions.length > 0 && !leadingAction ? styles.closeButtonLeft : styles.closeButtonRight,
              { top: insets.top + 12 },
            ]}
          >
            <Ionicons color="#FFFFFF" name="close" size={28} />
          </TouchableOpacity>

          {actions.length > 0 ? (
            <TouchableOpacity
              accessibilityLabel="사진 메뉴 열기"
              accessibilityRole="button"
              activeOpacity={0.7}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              onPress={() => setActionMenuOpen((open) => !open)}
              style={[styles.moreButton, { top: insets.top + 12 }]}
            >
              <Ionicons color="#FFFFFF" name="ellipsis-horizontal" size={24} />
            </TouchableOpacity>
          ) : null}

          {isActionMenuOpen ? (
            <>
              <Pressable style={styles.menuDismissLayer} onPress={() => setActionMenuOpen(false)} />
              <View style={[styles.actionMenu, { top: insets.top + 62 }]}>
                {actions.map((action) => (
                  <Pressable
                    accessibilityRole="button"
                    key={action.key}
                    onPress={() => {
                      setActionMenuOpen(false);
                      action.onPress(currentIndex);
                    }}
                    style={styles.actionRow}
                  >
                    <Ionicons
                      color={action.destructive ? '#EB524D' : Colors.foundation.black}
                      name={action.icon}
                      size={18}
                    />
                    <Text style={[styles.actionText, action.destructive && styles.actionTextDestructive]}>
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {images.length > 1 ? (
            <Text style={[styles.indexText, { top: insets.top + 24 }]}>
              {currentIndex + 1} / {images.length}
            </Text>
          ) : null}

          {actionLabel && (onPressAction || renderActionSheet) ? (
            <Pressable
              accessibilityRole="button"
              onPress={handlePressBottomAction}
              style={[styles.bottomAction, { bottom: insets.bottom + 24 }]}
            >
              <Ionicons color={Colors.foundation.white} name="create-outline" size={18} />
              <Text style={styles.bottomActionText}>{actionLabel}</Text>
            </Pressable>
          ) : null}

          {isActionSheetOpen && renderActionSheet
            ? renderActionSheet({ currentIndex, closeSheet: closeActionSheet })
            : null}
    </View>
    </View>
  );

  if (presentation === 'inline') {
    return <View style={styles.inlineViewer}>{viewerContent}</View>;
  }

  return (
    <Modal animationType="fade" onRequestClose={handleClose} transparent visible={visible}>
      {viewerContent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewer: {
    flex: 1,
    backgroundColor: '#050505',
  },
  inlineViewer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  closeButtonLeft: {
    left: 16,
  },
  closeButtonRight: {
    right: 16,
  },
  leadingButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  moreButton: {
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
  menuDismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  actionMenu: {
    position: 'absolute',
    right: Spacing.lg,
    width: 210,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    ...Shadows.card,
  },
  actionRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  actionText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  actionTextDestructive: {
    color: '#EB524D',
  },
  bottomAction: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  bottomActionText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
});
