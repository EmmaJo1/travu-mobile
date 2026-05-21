import { Colors } from '@/constants/theme';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';

interface BottomTabBarProps {
  active: 'home' | 'add' | 'profile';
  onPressHome?: () => void;
  onPressAdd?: () => void;
  onPressProfile?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function BottomTabBar({
  active,
  onPressHome,
  onPressAdd,
  onPressProfile,
  style,
}: BottomTabBarProps) {
  return (
    <View style={[styles.bar, style]}>
      <TouchableOpacity onPress={onPressHome} style={styles.homeBtn} activeOpacity={0.75}>
        <Image source={require('./tab-home.png')} style={styles.homeIcon} resizeMode="contain" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onPressAdd} style={styles.addBtn} activeOpacity={0.75}>
        <Image source={require('./tab-plus.png')} style={styles.addIcon} resizeMode="contain" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onPressProfile} style={styles.profileBtn} activeOpacity={0.75}>
        <Image source={require('./tab-user.png')} style={styles.profileIcon} resizeMode="contain" />
      </TouchableOpacity>
      <Image
        source={require('./bottomtab-home-indicator.png')}
        style={styles.homeIndicator}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: 390,
    height: 80,
    backgroundColor: Colors.foundation.white,
    position: 'relative',
    paddingHorizontal: 56,
    paddingTop: 12,
  },
  homeBtn: {
    position: 'absolute',
    left: 56,
    right: 310,
    top: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    position: 'absolute',
    left: 177,
    right: 177,
    top: 12,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtn: {
    position: 'absolute',
    left: 310,
    right: 56,
    top: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIcon: {
    width: 24,
    height: 24,
  },
  profileIcon: {
    width: 24,
    height: 24,
  },
  addIcon: {
    width: 36,
    height: 36,
  },
  homeIndicator: {
    position: 'absolute',
    left: 0,
    top: 46,
    width: 390,
    height: 34,
  },
});
