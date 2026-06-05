import { BlurView, type BlurTint } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';

interface FrostedGlassSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  borderWidth?: number;
  intensity?: number;
  tint?: BlurTint;
  fillColor?: string;
  borderColor?: string;
  highlightColor?: string;
  shadowEnabled?: boolean;
}

export default function FrostedGlassSurface({
  children,
  style,
  contentStyle,
  borderRadius = Radius.lg,
  borderWidth = 1,
  intensity = 80,
  tint = 'light',
  fillColor = 'rgba(255, 255, 255, 0.40)',
  borderColor = 'rgba(199, 199, 199, 0.50)',
  highlightColor = 'rgba(255, 255, 255, 0.28)',
  shadowEnabled = true,
}: FrostedGlassSurfaceProps) {
  return (
    <View style={[shadowEnabled && styles.shadowWrapper, { borderRadius }, style]}>
      <View style={[styles.clipContainer, { borderColor, borderRadius, borderWidth }, contentStyle]}>
        <BlurView
          intensity={intensity}
          tint={tint}
          experimentalBlurMethod="dimezisBlurView"
          blurReductionFactor={2.4}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.tintLayer, { backgroundColor: fillColor }]} />
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.42)',
            'rgba(255, 255, 255, 0.10)',
            'rgba(255, 255, 255, 0.02)',
          ]}
          locations={[0, 0.44, 1]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.28)',
            'rgba(255, 255, 255, 0.02)',
            'rgba(255, 255, 255, 0.22)',
          ]}
          locations={[0, 0.52, 1]}
          start={{ x: 0.12, y: 0 }}
          end={{ x: 0.88, y: 1 }}
          style={styles.refractionLayer}
        />
        <LinearGradient
          colors={[
            'rgba(52, 145, 255, 0.10)',
            'rgba(255, 255, 255, 0)',
            'rgba(255, 112, 145, 0.10)',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.dispersionLayer}
        />
        <View style={[styles.innerHighlight, { borderColor: highlightColor, borderRadius }]} pointerEvents="none" />
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  clipContainer: {
    flex: 1,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tintLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  refractionLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  dispersionLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  innerHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
