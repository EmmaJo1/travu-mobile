import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import { Colors, Typography } from '@/constants/theme';

/** My Page 탭 — TODO: 마이페이지 화면 연결 */
export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>My Page</Text>
        <Text style={styles.caption}>TODO: My Page 화면 구현</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.warm.white,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  caption: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
  },
});
