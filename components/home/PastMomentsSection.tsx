import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import Text from '@/components/common/AppText';
import type { IdlePastMoment } from '@/constants/mockIdleHomeData';
import { Colors, FontFamily } from '@/constants/theme';

interface PastMomentsSectionProps {
  moments: IdlePastMoment[];
}

export default function PastMomentsSection({ moments }: PastMomentsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>지난 여행의 순간</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {moments.map((moment) => (
          <View key={moment.id} style={styles.card}>
            <Image source={moment.image} style={styles.image} resizeMode="cover" />
            <View style={styles.textBlock}>
              <Text style={styles.placeName} numberOfLines={1}>{moment.placeName}</Text>
              <Text style={styles.cityName} numberOfLines={1}>{moment.cityName}</Text>
              <Text style={styles.date} numberOfLines={1}>{moment.date}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  title: {
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.foundation.black,
  },
  listContent: {
    gap: 8,
    paddingRight: 20,
  },
  card: {
    width: 120,
    height: 216,
    gap: 10,
  },
  image: {
    width: 120,
    height: 150,
    borderRadius: 4,
  },
  textBlock: {
    gap: 2,
  },
  placeName: {
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.foundation.black,
  },
  cityName: {
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.foundation.grey800,
  },
  date: {
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.foundation.grey500,
  },
});
