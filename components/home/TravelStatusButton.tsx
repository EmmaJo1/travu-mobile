import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

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
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.24)',
          'rgba(255, 255, 255, 0.06)',
          'rgba(255, 255, 255, 0)',
        ]}
        locations={[0, 0.45, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.glassLight}
      />
      <View style={styles.frostLayer} />
      <View style={styles.statusContent}>
        <View style={styles.statusDot} />
        <Text style={styles.label}>여행 중</Text>
      </View>
      <View style={styles.chevronSlot}>
        <Svg width={4} height={6} viewBox="0 0 4 6" style={styles.chevronVector}>
          <Polygon points="0,3 4,0 4,6" fill="#F2F2F2" />
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    backgroundColor: 'rgba(95, 95, 95, 0.30)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  glassLight: {
    ...StyleSheet.absoluteFillObject,
  },
  frostLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
