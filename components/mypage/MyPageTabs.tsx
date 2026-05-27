import Text from '@/components/common/AppText';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Colors, FontFamily, Typography } from '@/constants/theme';

export type MyPageTabMode = 'trip' | 'reflection';

const INDICATOR_SWIPE_DURATION_MS = 300;

interface MyPageTabsProps {
  mode: MyPageTabMode;
  onChange: (mode: MyPageTabMode) => void;
  style?: StyleProp<ViewStyle>;
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.tab}>
      <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function MyPageTabs({ mode, onChange, style }: MyPageTabsProps) {
  const [tabRowWidth, setTabRowWidth] = useState(0);
  const indicatorSlide = useRef(new Animated.Value(mode === 'trip' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(indicatorSlide, {
      toValue: mode === 'trip' ? 0 : 1,
      duration: INDICATOR_SWIPE_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [mode, indicatorSlide]);

  const indicatorWidth = tabRowWidth / 2;
  const indicatorTranslateX = indicatorSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, indicatorWidth],
  });

  return (
    <View style={[styles.wrap, style]}>
      <View
        style={styles.tabRow}
        onLayout={(event) => setTabRowWidth(event.nativeEvent.layout.width)}
      >
        <Tab label="여행" active={mode === 'trip'} onPress={() => onChange('trip')} />
        <Tab label="성찰" active={mode === 'reflection'} onPress={() => onChange('reflection')} />
        {indicatorWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                width: indicatorWidth,
                transform: [{ translateX: indicatorTranslateX }],
              },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: Colors.foundation.grey100,
  },
  tabRow: {
    width: '100%',
    flexDirection: 'row',
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 60,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: -2,
    height: 2,
    backgroundColor: Colors.foundation.black,
  },
  tabText: {
    ...Typography.body1Regular,
  },
  tabTextActive: {
    fontFamily: FontFamily.pretendardMedium,
    color: Colors.foundation.black,
  },
  tabTextInactive: {
    fontFamily: FontFamily.pretendard,
    color: Colors.foundation.grey400,
  },
});
