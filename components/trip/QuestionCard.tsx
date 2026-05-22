import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';

import { Colors, Typography } from '@/constants/theme';

export interface QuestionCardData {
  question: string;
  answer: string;
  date: string;
  city: string;
}

interface QuestionCardProps {
  data: QuestionCardData;
  style?: StyleProp<ViewStyle>;
}

export default function QuestionCard({ data, style }: QuestionCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.qaRow}>
        <Text style={styles.prefix}>Q.</Text>
        <Text style={styles.emphasis}>{data.question}</Text>
      </View>
      <View style={styles.qaBlock}>
        <Text style={styles.prefix}>A.</Text>
        <Text style={styles.answer}>{data.answer}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{data.date}</Text>
        <Text style={styles.meta}>{data.city}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 350,
    gap: 8,
  },
  qaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qaBlock: {
    flexDirection: 'row',
    gap: 4,
  },
  prefix: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  emphasis: {
    flex: 1,
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  answer: {
    flex: 1,
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey600,
  },
});
