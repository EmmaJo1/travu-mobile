import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

export interface ReflectionCardData {
  country: string;
  date: string;
  reflection: string;
}

interface ReflectionCardProps {
  data: ReflectionCardData;
  style?: StyleProp<ViewStyle>;
}

export default function ReflectionCard({ data, style }: ReflectionCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.country}>{data.country}</Text>
          <Text style={styles.date}>{data.date}</Text>
        </View>
        <View style={styles.mark} />
      </View>

      <View style={styles.body}>
        <Image source={require('../../assets/images/quote-left.png')} style={styles.quote} resizeMode="contain" />
        <Text style={styles.text}>{data.reflection}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    height: 270,
    padding: 20,
    gap: 8,
    backgroundColor: Colors.foundation.white,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  country: {
    fontFamily: 'Pretendard-Medium',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    color: Colors.foundation.black,
  },
  date: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    color: Colors.foundation.grey600,
  },
  mark: {
    width: 38,
    height: 50,
    borderRadius: 2,
    backgroundColor: '#F2F2F2',
  },
  body: {
    gap: 4,
  },
  quote: {
    width: 12,
    height: 12,
  },
  text: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: Colors.foundation.black,
  },
});
