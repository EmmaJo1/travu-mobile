import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, FontFamily, Radius, Spacing, Typography } from '@/constants/theme';

interface StartTripConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function StartTripConfirmModal({
  visible,
  onCancel,
  onConfirm,
}: StartTripConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="여행 시작 안내 닫기"
            hitSlop={8}
            style={styles.closeButton}
            onPress={onCancel}
          >
            <Feather name="x" size={22} color={Colors.foundation.grey800} />
          </Pressable>

          <View style={styles.illustration}>
            <View style={[styles.cloud, styles.cloudLeft]} />
            <View style={[styles.cloud, styles.cloudRight]} />
            <View style={styles.mapBase}>
              <View style={styles.mapFold} />
              <View style={styles.mapFoldCenter} />
              <View style={styles.mapFold} />
            </View>
            <View style={styles.cameraBubble}>
              <Feather name="camera" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.pinBubble}>
              <Ionicons name="location-sharp" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.clockBubble}>
              <Feather name="clock" size={22} color={Colors.foundation.grey800} />
            </View>
          </View>

          <Text style={styles.title}>여행을 시작할까요?</Text>

          <View style={styles.featureList}>
            <FeatureItem
              iconName="camera"
              title="촬영한 사진이 자동으로 수집돼요"
              description="시간과 장소를 기반으로 정리해요"
            />
            <FeatureItem
              iconName="map-pin"
              title="이동 경로와 방문 장소를 기록해요"
              description="지도를 통해 한눈에 확인할 수 있어요"
            />
            <FeatureItem
              iconName="sparkles"
              title="여행이 끝나면 하나의 기록이 완성돼요"
              description="나만의 여행을 오래 간직할 수 있어요"
            />
          </View>

          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={onConfirm}>
            <LinearGradient
              colors={[Colors.foundation.black, Colors.warm.dark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryGradient}
            >
              <Text style={styles.primaryLabel}>여행 시작하기</Text>
            </LinearGradient>
          </Pressable>

          <Pressable accessibilityRole="button" hitSlop={8} onPress={onCancel}>
            <Text style={styles.secondaryLabel}>나중에 시작하기</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FeatureItem({
  iconName,
  title,
  description,
}: {
  iconName: 'camera' | 'map-pin' | 'sparkles';
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconWrap}>
        {iconName === 'sparkles' ? (
          <Ionicons name="sparkles" size={22} color={Colors.foundation.grey800} />
        ) : (
          <Feather name={iconName} size={22} color={Colors.foundation.grey800} />
        )}
      </View>
      <View style={styles.featureTextBlock}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
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
    maxWidth: 349,
    borderRadius: 24,
    backgroundColor: Colors.foundation.white,
    paddingTop: 14,
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  illustration: {
    width: 176,
    height: 104,
    marginTop: 28,
    marginBottom: 12,
  },
  cloud: {
    position: 'absolute',
    width: 28,
    height: 18,
    borderRadius: 12,
    backgroundColor: '#F0ECEA',
  },
  cloudLeft: {
    top: 16,
    left: 14,
  },
  cloudRight: {
    top: 10,
    right: 16,
  },
  mapBase: {
    position: 'absolute',
    left: 36,
    right: 32,
    bottom: 18,
    height: 48,
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#E3DBD8',
    overflow: 'hidden',
  },
  mapFold: {
    flex: 1,
    backgroundColor: '#F4EFEC',
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.82)',
  },
  mapFoldCenter: {
    flex: 1,
    backgroundColor: '#E8E0DD',
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.82)',
  },
  cameraBubble: {
    position: 'absolute',
    left: 18,
    bottom: 20,
    width: 42,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warm.dark,
  },
  pinBubble: {
    position: 'absolute',
    top: 2,
    left: 74,
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.grey800,
  },
  clockBubble: {
    position: 'absolute',
    right: 8,
    bottom: 24,
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: Colors.foundation.grey400,
  },
  title: {
    fontFamily: FontFamily.pretendardBold,
    fontSize: 22,
    lineHeight: 30,
    color: Colors.foundation.black,
    textAlign: 'center',
    marginBottom: 24,
  },
  featureList: {
    alignSelf: 'stretch',
    gap: 20,
    marginBottom: 28,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  featureIconWrap: {
    width: 28,
    alignItems: 'center',
    paddingTop: 2,
    transform: [{ translateX: 2 }],
  },
  featureTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  featureTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  featureDescription: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    marginBottom: 18,
  },
  primaryGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
  },
  secondaryLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey800,
    textAlign: 'center',
  },
});
