import { BlurView, type BlurTint } from 'expo-blur';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface FrostedGlassSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  intensity?: number;
  tint?: BlurTint;
  fillColor?: string;
  borderColor?: string;
}

export default function FrostedGlassSurface({
  children,
  style,
  contentStyle,
  borderRadius = 24,
  intensity = 42,
  tint = 'light',
  fillColor = 'rgba(255, 255, 255, 0.26)',
  borderColor = 'rgba(255, 255, 255, 0.56)',
}: FrostedGlassSurfaceProps) {
  return (
    <View style={[styles.shadowWrapper, { borderRadius }, style]}>
      <View style={[styles.clipContainer, { borderColor, borderRadius }, contentStyle]}>
        <BlurView
          intensity={intensity}
          tint={tint}
          experimentalBlurMethod="dimezisBlurView"
          blurReductionFactor={2.4}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.tintLayer, { backgroundColor: fillColor }]} />
        <View style={[styles.innerHighlight, { borderRadius }]} pointerEvents="none" />
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
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
  innerHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.72)',
    borderLeftColor: 'rgba(255, 255, 255, 0.48)',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
