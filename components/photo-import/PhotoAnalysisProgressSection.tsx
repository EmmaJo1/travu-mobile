import { StyleSheet, View } from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, Radius, Typography } from '@/constants/theme';

const DEFAULT_PREVIEW_TOTAL = 1246;

interface PhotoAnalysisProgressSectionProps {
  progress: number;
  scannedAssetCount?: number;
  totalAssetCount?: number;
}

export default function PhotoAnalysisProgressSection({
  progress,
  scannedAssetCount,
  totalAssetCount,
}: PhotoAnalysisProgressSectionProps) {
  const percent = Math.max(0, Math.min(100, Math.round(progress)));
  const total = totalAssetCount && totalAssetCount > 0 ? totalAssetCount : DEFAULT_PREVIEW_TOTAL;
  const scanned = scannedAssetCount && scannedAssetCount > 0
    ? Math.min(scannedAssetCount, total)
    : Math.round((total * percent) / 100);

  return (
    <View style={styles.container}>
      <Text style={styles.percentText}>{percent}%</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.caption}>
        {scanned.toLocaleString()} / {total.toLocaleString()}장 분석 완료
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    alignItems: 'center',
  },
  percentText: {
    ...Typography.title2,
    fontSize: 26,
    lineHeight: 34,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    marginTop: 12,
    overflow: 'hidden',
    borderRadius: Radius.full,
    backgroundColor: Colors.warm.beige,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.black,
  },
  caption: {
    marginTop: 10,
    ...Typography.body2Regular,
    color: Colors.foundation.grey400,
    textAlign: 'center',
  },
});
