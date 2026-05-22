import { Tabs } from 'expo-router';
import React from 'react';

import TravuTabBar from '@/components/nav/TravuTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TravuTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Page',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
