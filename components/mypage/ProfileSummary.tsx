import Text from '@/components/common/AppText';
import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Colors, Typography } from '@/constants/theme';

interface ProfileSummaryProps {
  userName: string;
  profileUri?: string;
  profileImage?: ImageSourcePropType;
  cityCount?: number;
  recordCount?: number;
  countryCount: number;
  tripCount: number;
  basedIn?: string;
  /** 사용자가 직접 작성·수정하는 자기소개/상태 메시지 (mock 또는 Supabase 연동 예정) */
  tagline?: string;
  style?: StyleProp<ViewStyle>;
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statValue}>{unit}</Text>
      </View>
    </View>
  );
}

export default function ProfileSummary({
  userName,
  profileUri,
  profileImage,
  cityCount,
  recordCount,
  countryCount,
  tripCount,
  basedIn,
  tagline,
  style,
}: ProfileSummaryProps) {
  const avatarSource = profileImage ?? (profileUri ? { uri: profileUri } : undefined);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.profileRow}>
        <View style={styles.avatarWrap}>
          {avatarSource ? (
            <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={styles.avatarFallback} />
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.name}>{userName}</Text>
          <View style={styles.statsRow}>
            <Stat label="도시" value={cityCount ?? recordCount ?? 0} unit="곳" />
            <View style={styles.divider} />
            <Stat label="국가" value={countryCount} unit="곳" />
            <View style={styles.divider} />
            <Stat label="여행" value={tripCount} unit="번" />
          </View>
        </View>
      </View>

      <View style={styles.profileTextBlock}>
        {basedIn ? (
          <Text style={styles.basedIn} accessibilityRole="text">
            {'Based in '}
            {basedIn}
          </Text>
        ) : null}
        {tagline ? (
          <Text
            style={styles.tagline}
            accessibilityRole="text"
            accessibilityLabel={`Bio, ${tagline}`}
          >
            {tagline}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 16,
  },
  profileRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
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
    gap: 2,
  },
  statLabel: {
    ...Typography.captionRegular,
    color: Colors.foundation.black,
  },
  statValue: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  statValueRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    width: 2,
    height: 40,
    backgroundColor: Colors.foundation.grey100,
  },
  profileTextBlock: {
    gap: 4,
  },
  basedIn: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  tagline: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
});
