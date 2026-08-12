import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { type Href, useRouter } from 'expo-router';
import React from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import { useIsActiveTraveling } from '@/constants/activeTravelSession';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

const TAB_ICONS = {
  index: require('./tab-home.png'),
  record: require('./tab-plus.png'),
  profile: require('./tab-user.png'),
} as const;

type TabRouteName = keyof typeof TAB_ICONS;

const FAB_SIZE = 56;
const ACTION_CARD_SIDE_INSET = 16;
const ACTIVE_ICON_COLOR = '#111111';
const INACTIVE_ICON_COLOR = '#A6A6A6';
const DESTRUCTIVE_ACTION_COLOR = '#D13434';
const DIM_OVERLAY_COLOR = 'rgba(0, 0, 0, 0.35)';

function isTabRoute(name: string): name is TabRouteName {
  return name in TAB_ICONS;
}

export default function TravuTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isActiveTraveling = useIsActiveTraveling();
  const [isMenuOpen, setMenuOpen] = React.useState(false);
  const menuProgress = React.useRef(new Animated.Value(0)).current;

  const bottomInset = Math.max(insets.bottom, Spacing.sm);

  React.useEffect(() => {
    Animated.timing(menuProgress, {
      toValue: isMenuOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen, menuProgress]);

  const closeMenu = React.useCallback(() => {
    setMenuOpen(false);
  }, []);

  const openStartOrEndTripFlow = React.useCallback(() => {
    closeMenu();
    const action = isActiveTraveling ? 'endTrip' : 'startTrip';
    router.push(`/(tabs)/?action=${action}&actionId=${Date.now()}` as Href);
  }, [closeMenu, isActiveTraveling, router]);

  const openPhotoImportFlow = React.useCallback(() => {
    closeMenu();
    router.push('/find-trips-start' as Href);
  }, [closeMenu, router]);

  const openManualTripFlow = React.useCallback(() => {
    closeMenu();
    router.push('/create-trip' as Href);
  }, [closeMenu, router]);

  const triggerLightImpact = React.useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const triggerSelectionHaptic = React.useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  const handleTabPress = React.useCallback(
    (routeName: TabRouteName) => {
      if (routeName === 'record') {
        if (!isMenuOpen) {
          triggerLightImpact();
        }

        setMenuOpen((prev) => !prev);
        return;
      }

      const routeIndex = state.routes.findIndex((route) => route.name === routeName);
      const isFocused = state.index === routeIndex;

      if (!isFocused) {
        triggerSelectionHaptic();
      }

      closeMenu();
      navigation.navigate(routeName);
    },
    [closeMenu, isMenuOpen, navigation, state.index, state.routes, triggerLightImpact, triggerSelectionHaptic],
  );

  const renderTabButton = (routeName: TabRouteName, isFocused: boolean) => {
    if (routeName === 'record') {
      return (
        <TouchableOpacity
          key={routeName}
          accessibilityRole="button"
          accessibilityLabel={isMenuOpen ? '빠른 메뉴 닫기' : '빠른 메뉴 열기'}
          onPress={() => handleTabPress(routeName)}
          activeOpacity={0.86}
          style={styles.fabButton}
        >
          <Animated.View
            style={[
              styles.fabIconWrap,
              {
                transform: [
                  {
                    rotate: menuProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '90deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Feather
              name={isMenuOpen ? 'x' : 'plus'}
              size={28}
              color={Colors.foundation.white}
            />
          </Animated.View>
        </TouchableOpacity>
      );
    }

    const icon = TAB_ICONS[routeName];
    const iconColor = isFocused ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;

    return (
      <TouchableOpacity
        key={routeName}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={() => handleTabPress(routeName)}
        activeOpacity={0.75}
        style={styles.tabBtn}
      >
        <Image
          source={icon}
          style={[styles.icon, { tintColor: iconColor }]}
          resizeMode="contain"
        />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <View style={[styles.bar, { paddingBottom: bottomInset }]}>
        {state.routes.map((route, index) => {
          if (!isTabRoute(route.name)) return null;

          return renderTabButton(route.name, state.index === index);
        })}
      </View>

      <Modal
        transparent
        visible={isMenuOpen}
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeMenu}
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.dimOverlay,
              {
                opacity: menuProgress,
              },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
          </Animated.View>

          <Animated.View
            style={[
              styles.menuStack,
              {
                bottom: bottomInset + 88,
                opacity: menuProgress,
                transform: [
                  {
                    translateY: menuProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <FabActionCard
              icon={isActiveTraveling ? 'power' : 'map-pin'}
              title={isActiveTraveling ? '여행 종료하기' : '여행 시작하기'}
              description={
                isActiveTraveling
                  ? '지금까지 정리한 여행 저장'
                  : '지금부터 사진과 이동을 자동 정리'
              }
              accentColor={isActiveTraveling ? DESTRUCTIVE_ACTION_COLOR : undefined}
              onPress={openStartOrEndTripFlow}
            />
            <FabActionCard
              icon="image"
              title="사진에서 여행 찾기"
              description="기존 사진첩에서 여행 후보 검색"
              onPress={openPhotoImportFlow}
            />
            <FabActionCard
              icon="edit-3"
              title="직접 여행 만들기"
              description="날짜와 장소를 직접 선택"
              onPress={openManualTripFlow}
            />
          </Animated.View>

          <View style={[styles.modalBar, { paddingBottom: bottomInset }]}>
            {renderTabButton('index', state.routes[state.index]?.name === 'index')}
            {renderTabButton('record', false)}
            {renderTabButton('profile', state.routes[state.index]?.name === 'profile')}
          </View>
        </View>
      </Modal>
    </>
  );
}

interface FabActionCardProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  description: string;
  accentColor?: string;
  onPress: () => void;
}

function FabActionCard({ icon, title, description, accentColor, onPress }: FabActionCardProps) {
  const iconColor = accentColor ?? ACTIVE_ICON_COLOR;

  const handlePress = React.useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
    >
      <View style={styles.actionIconBox}>
        <Feather name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.actionTextBlock}>
        <Text style={[styles.actionTitle, accentColor ? { color: accentColor } : null]}>
          {title}
        </Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: Colors.foundation.white,
    paddingTop: Spacing.md,
    paddingHorizontal: 56,
    minHeight: 64,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.foundation.grey100,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DIM_OVERLAY_COLOR,
  },
  modalBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: Colors.foundation.white,
    paddingTop: Spacing.md,
    paddingHorizontal: 56,
    minHeight: 64,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.foundation.grey100,
  },
  tabBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 28,
    height: 28,
  },
  fabButton: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    marginTop: -22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACTIVE_ICON_COLOR,
    ...Shadows.floating,
  },
  fabIconWrap: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuStack: {
    position: 'absolute',
    left: Spacing.xl + ACTION_CARD_SIDE_INSET,
    right: Spacing.xl + ACTION_CARD_SIDE_INSET,
    gap: Spacing.md,
    alignItems: 'center',
  },
  actionCard: {
    alignSelf: 'center',
    width: 268,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: 22,
    backgroundColor: Colors.foundation.white,
    ...Shadows.card,
  },
  actionCardPressed: {
    opacity: 0.9,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.bgScreen,
  },
  actionTextBlock: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  actionDescription: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
  },
});
