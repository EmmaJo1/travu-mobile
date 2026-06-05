import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import FrostedGlassSurface from '@/components/common/FrostedGlassSurface';
import Text from '@/components/common/AppText';
import { Colors, Radius } from '@/constants/theme';

const FIGMA_PRETENDARD = 'Pretendard';

interface TravelStatusButtonProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function TravelStatusButton({ onPress, style }: TravelStatusButtonProps) {
  return (
    <Pressable
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel="여행 중 상태"
      onPress={onPress}
    >
      <FrostedGlassSurface
        style={styles.glassSurface}
        contentStyle={styles.glassContent}
        borderRadius={16}
        intensity={80}
        tint="dark"
        fillColor="rgba(95, 95, 95, 0.30)"
        borderColor="rgba(255, 255, 255, 0.30)"
        highlightColor="rgba(255, 255, 255, 0.22)"
      >
        <View style={styles.statusContent}>
          <View style={styles.statusDot} />
          <Text style={styles.label}>여행 중</Text>
        </View>
        <View style={styles.chevronSlot}>
          <Svg width={4} height={6} viewBox="0 0 4 6" style={styles.chevronVector}>
            <Polygon points="0,3 4,0 4,6" fill="#F2F2F2" />
          </Svg>
        </View>
      </FrostedGlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 79,
    height: 28,
  },
  glassSurface: {
    width: 79,
    height: 28,
    borderRadius: 16,
  },
  glassContent: {
    width: 79,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 6,
  },
  statusContent: {
    width: 45,
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: '#D13434',
  },
  label: {
    width: 35,
    height: 16,
    fontFamily: FIGMA_PRETENDARD,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: Colors.foundation.white,
  },
  chevronSlot: {
    width: 16,
    height: 16,
    position: 'relative',
  },
  chevronVector: {
    position: 'absolute',
    left: 5,
    top: 6,
    transform: [{ rotate: '-90deg' }],
  },
});
