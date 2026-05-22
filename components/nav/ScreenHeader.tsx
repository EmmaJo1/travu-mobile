import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import Text from '@/components/common/AppText';

import { Colors, Typography } from '@/constants/theme';

interface ScreenHeaderProps {
  title?: string;
  onBackPress?: () => void;
  rightSlot?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function ScreenHeader({ title, onBackPress, rightSlot, style }: ScreenHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <TouchableOpacity onPress={onBackPress} activeOpacity={0.75} style={styles.leftBtn}>
        <Image source={require('../../assets/images/screenheader-back.png')} style={styles.backIcon} resizeMode="contain" />
      </TouchableOpacity>

      <View style={styles.center}>{title ? <Text style={styles.title}>{title}</Text> : null}</View>

      <View style={styles.right}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: 390,
    height: 40,
    paddingLeft: 12,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F5F3',
  },
  leftBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  right: {
    minWidth: 24,
    alignItems: 'flex-end',
  },
});
