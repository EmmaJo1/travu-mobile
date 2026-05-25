import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Text from '@/components/common/AppText';

import { Colors, Typography } from '@/constants/theme';

interface ProfileSummaryProps {
  userName: string;
  profileUri?: string;
  profileImage?: ImageSourcePropType;
  tagline?: string;
  recordCount: number;
  countryCount: number;
  tripCount: number;
  style?: StyleProp<ViewStyle>;
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statValue}>{unit}</Text>
      </Text>
    </View>
  );
}

export default function ProfileSummary({
  userName,
  profileUri,
  profileImage,
  tagline,
  recordCount,
  countryCount,
  tripCount,
  style,
}: ProfileSummaryProps) {
  const avatarSource = profileImage ?? (profileUri ? { uri: profileUri } : undefined);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.avatarWrap}>
        {avatarSource ? (
          <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={styles.avatarFallback} />
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{userName}</Text>
        {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
        <View style={styles.statsRow}>
          <Stat label="기록" value={recordCount} unit="번" />
          <View style={styles.divider} />
          <Stat label="국가" value={countryCount} unit="곳" />
          <View style={styles.divider} />
          <Stat label="여행" value={tripCount} unit="번" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 152,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 20,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D9D9D9',
  },
  content: {
    flex: 1,
    gap: 8,
  },
  name: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  tagline: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statBlock: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    ...Typography.captionRegular,
    color: Colors.foundation.black,
  },
  statValue: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  divider: {
    width: 2,
    height: 40,
    backgroundColor: Colors.foundation.grey100,
  },
});
