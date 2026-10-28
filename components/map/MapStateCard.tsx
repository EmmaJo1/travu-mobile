import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import Text from '@/components/common/AppText';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface MapStateCardProps {
  description?: string;
  height?: number;
  isLoading?: boolean;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
}

export default function MapStateCard({
  description,
  height = 240,
  isLoading = false,
  onRetry,
  style,
  title,
}: MapStateCardProps) {
  return (
    <View style={[styles.card, { height }, style]}>
      {isLoading ? <ActivityIndicator color={Colors.foundation.grey700} /> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  title: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey800,
    textAlign: 'center',
  },
  description: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 36,
    justifyContent: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.black,
  },
  retryText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
  },
});
