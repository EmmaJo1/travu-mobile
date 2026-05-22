import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

const TAB_ICONS = {
  index: require('./tab-home.png'),
  record: require('./tab-plus.png'),
  profile: require('./tab-user.png'),
} as const;

type TabRouteName = keyof typeof TAB_ICONS;

function isTabRoute(name: string): name is TabRouteName {
  return name in TAB_ICONS;
}

export default function TravuTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        if (!isTabRoute(route.name)) return null;

        const isFocused = state.index === index;
        const icon = TAB_ICONS[route.name];
        const isRecord = route.name === 'record';

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.75}
            style={[styles.tabBtn, isRecord && styles.recordBtn]}
          >
            <Image
              source={icon}
              style={[styles.icon, isRecord && styles.recordIcon]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: Colors.foundation.white,
    paddingTop: 12,
    paddingHorizontal: 56,
    minHeight: 56,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.foundation.grey100,
  },
  tabBtn: {
    width: 24,
    height: 24,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtn: {
    width: 36,
    height: 36,
    marginTop: 0,
  },
  icon: {
    width: 24,
    height: 24,
  },
  recordIcon: {
    width: 36,
    height: 36,
  },
});
