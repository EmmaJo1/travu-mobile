import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

export type MyPageTabMode = 'trip' | 'reflection';

interface MyPageTabsProps {
  mode: MyPageTabMode;
  onChange: (mode: MyPageTabMode) => void;
  style?: StyleProp<ViewStyle>;
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function MyPageTabs({ mode, onChange, style }: MyPageTabsProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Tab label="여행" active={mode === 'trip'} onPress={() => onChange('trip')} />
      <Tab label="성찰" active={mode === 'reflection'} onPress={() => onChange('reflection')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 390,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: Colors.foundation.grey100,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 60,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.foundation.black,
    marginBottom: -2,
  },
  tabText: {
    fontSize: 16,
    lineHeight: 22,
  },
  tabTextActive: {
    fontFamily: 'Pretendard-Medium',
    fontWeight: '500',
    color: Colors.foundation.black,
  },
  tabTextInactive: {
    fontFamily: 'Pretendard-Regular',
    fontWeight: '400',
    color: Colors.foundation.grey400,
  },
});
