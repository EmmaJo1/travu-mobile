/**
 * day-recording-detail
 * Figma: EfragPmsgNBJnt5wFEOAkB / node 1207:2245
 */
import BottomTabBar from '@/components/nav/BottomTabBar';
import ScreenHeader from '@/components/nav/ScreenHeader';
import PlaceEntryCard, { type PlaceEntry } from '@/components/trip/PlaceEntryCard';
import { Colors } from '@/constants/theme';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ENTRIES: PlaceEntry[] = [
  {
    id: 'entry-1',
    time: '3 PM',
    place: '본다이 비치',
    category: '관광명소',
    city: '시드니',
    rating: 5,
    text: '호주는 남반구라 3월에도 너무 후덥지근했다. 시드니에서 제일 유명한 바닷가라 그런지 사람이 정말 많았다. 항상 사진으로만 보았던 아이스버그 수영장을 직접 볼 수 있어서 좋았다.',
    photoUris: [
      'https://picsum.photos/seed/bondi-1/220/292',
      'https://picsum.photos/seed/bondi-2/220/292',
      'https://picsum.photos/seed/bondi-3/220/292',
    ],
    onEdit: () => {},
  },
  {
    id: 'entry-2',
    time: '6 PM',
    place: '천문대',
    category: '관광명소',
    city: '파리',
    rating: 5,
    text: '어제도 갔지만 너무 좋아서 오늘도 또 갔다. 역시 전문대에서 보는 모습은 정말이지 아름답다. 다만 아쉬운 점은 한국인이 너무 많아서 그냥 한국에 온 것 같은 기분이었다.',
    photoUris: [
      'https://picsum.photos/seed/paris-obs-1/220/292',
      'https://picsum.photos/seed/paris-obs-2/220/292',
    ],
    onEdit: () => {},
  },
  {
    id: 'entry-3',
    time: '8 PM',
    place: '글렌모어 호텔',
    category: '음식점',
    city: '시드니',
    rating: 5,
    text: '오페라 하우스 야경을 볼 수 있는 루프탑으로 유명한 글렌모어 호텔에 갔다. 역시 야경만 코이라서 그런지 루프탑은 자리를 잡기 어려웠다. 난간에서 잠깐 즐기며 야경을 바라봤는데 정말 생생하고 아름다웠다.',
    photoUris: [
      'https://picsum.photos/seed/glen-1/220/292',
      'https://picsum.photos/seed/glen-2/220/292',
      'https://picsum.photos/seed/glen-3/220/292',
    ],
    onEdit: () => {},
  },
];

export default function DayRecord12072245Screen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScreenHeader
          title="2025.3.6 목 ▼"
          style={styles.header}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mapCard}>
            <Text style={styles.mapText}>지도</Text>
          </View>

          {ENTRIES.map((entry) => (
            <PlaceEntryCard key={entry.id} entry={entry} />
          ))}
        </ScrollView>

        <BottomTabBar active="add" style={styles.tabBar} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9F5F3',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F5F3',
  },
  header: {
    width: '100%',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 112,
    gap: 24,
  },
  mapCard: {
    height: 154,
    borderRadius: 8,
    backgroundColor: Colors.foundation.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.foundation.grey500,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
