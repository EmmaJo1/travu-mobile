import { Feather } from '@expo/vector-icons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import ScreenHeader from '@/components/nav/ScreenHeader';
import { Colors, FontFamily, Radius, Spacing, Typography } from '@/constants/theme';

type DestinationScope = 'domestic' | 'overseas';

interface DestinationItem {
  id: string;
  name: string;
  country: string;
  scope: DestinationScope;
  categories: string[];
  image: ImageSourcePropType;
  keywords: string[];
}

const BACKGROUND = Colors.light.bgScreen;
const GREY_50 = '#F2F2F2';
const GREY_700 = '#595959';
const SEARCH_BG = '#F0F0F0';
const GRID_CARD_WIDTH = 108;
const GRID_IMAGE_HEIGHT = 81;
const GRID_ROW_GAP = 12;

const CATEGORY_LABELS: Record<DestinationScope, { id: string; label: string }[]> = {
  domestic: [
    { id: 'popular', label: '인기' },
    { id: 'jeju', label: '제주' },
    { id: 'seoul', label: '서울' },
    { id: 'busan', label: '부산' },
    { id: 'gangwon', label: '강원' },
    { id: 'chungcheong', label: '충청' },
    { id: 'jeolla', label: '전라' },
    { id: 'gyeongsang', label: '경상' },
  ],
  overseas: [
    { id: 'popular', label: '인기' },
    { id: 'japan', label: '일본' },
    { id: 'china', label: '중국' },
    { id: 'taiwan-hongkong', label: '대만/홍콩' },
    { id: 'southeast-asia', label: '동남아' },
    { id: 'europe', label: '유럽' },
    { id: 'oceania', label: '오세아니아' },
    { id: 'america', label: '미주' },
  ],
};

const DESTINATIONS: DestinationItem[] = [
  {
    id: 'kr-seoul',
    name: '서울',
    country: '대한민국',
    scope: 'domestic',
    categories: ['popular', 'seoul'],
    image: require('../assets/images/home-hero-paris.png'),
    keywords: ['서울', 'seoul'],
  },
  {
    id: 'kr-busan',
    name: '부산',
    country: '대한민국',
    scope: 'domestic',
    categories: ['popular', 'busan'],
    image: require('../assets/images/record-day-bondi-1.png'),
    keywords: ['부산', 'busan'],
  },
  {
    id: 'kr-jeju',
    name: '제주',
    country: '대한민국',
    scope: 'domestic',
    categories: ['popular', 'jeju'],
    image: require('../assets/images/record-day-glenmore-1.png'),
    keywords: ['제주', 'jeju'],
  },
  {
    id: 'kr-sokcho',
    name: '속초',
    country: '대한민국',
    scope: 'domestic',
    categories: ['popular', 'gangwon'],
    image: require('../assets/images/record-day-observatory-2.png'),
    keywords: ['속초', '강원', 'sokcho'],
  },
  {
    id: 'kr-yeosu',
    name: '여수',
    country: '대한민국',
    scope: 'domestic',
    categories: ['popular', 'jeolla'],
    image: require('../assets/images/record-day-bondi-2.png'),
    keywords: ['여수', '전라', 'yeosu'],
  },
  {
    id: 'kr-jeonju',
    name: '전주',
    country: '대한민국',
    scope: 'domestic',
    categories: ['popular', 'jeolla'],
    image: require('../assets/images/record-trip-kyoto-day-2.png'),
    keywords: ['전주', '전라', 'jeonju'],
  },
  {
    id: 'kr-gyeongju',
    name: '경주',
    country: '대한민국',
    scope: 'domestic',
    categories: ['popular', 'gyeongsang'],
    image: require('../assets/images/record-trip-kyoto-day-3.png'),
    keywords: ['경주', '경상', 'gyeongju'],
  },
  {
    id: 'kr-gangneung',
    name: '강릉',
    country: '대한민국',
    scope: 'domestic',
    categories: ['popular', 'gangwon'],
    image: require('../assets/images/record-day-observatory-1.png'),
    keywords: ['강릉', '강원', 'gangneung'],
  },
  {
    id: 'kr-gapyeong',
    name: '가평',
    country: '대한민국',
    scope: 'domestic',
    categories: ['popular', 'gangwon'],
    image: require('../assets/images/record-day-glenmore-2.png'),
    keywords: ['가평', '경기', 'gapyeong'],
  },
  {
    id: 'kr-andong',
    name: '안동',
    country: '대한민국',
    scope: 'domestic',
    categories: ['popular', 'gyeongsang'],
    image: require('../assets/images/record-trip-kyoto-day-1.png'),
    keywords: ['안동', '경상', 'andong'],
  },
  {
    id: 'kr-yeongwol',
    name: '영월',
    country: '대한민국',
    scope: 'domestic',
    categories: ['popular', 'gangwon'],
    image: require('../assets/images/record-day-glenmore-3.png'),
    keywords: ['영월', '강원', 'yeongwol'],
  },
  {
    id: 'kr-tongyeong',
    name: '통영',
    country: '대한민국',
    scope: 'domestic',
    categories: ['popular', 'gyeongsang'],
    image: require('../assets/images/record-day-bondi-3.png'),
    keywords: ['통영', '경상', 'tongyeong'],
  },
  {
    id: 'jp-osaka',
    name: '오사카',
    country: '일본',
    scope: 'overseas',
    categories: ['popular', 'japan'],
    image: require('../assets/images/mypage-trips/mypage-trip-osaka.png'),
    keywords: ['오사카', '일본', 'osaka'],
  },
  {
    id: 'jp-kyoto',
    name: '교토',
    country: '일본',
    scope: 'overseas',
    categories: ['popular', 'japan'],
    image: require('../assets/images/record-trip-kyoto-cover.png'),
    keywords: ['교토', '일본', 'kyoto'],
  },
  {
    id: 'jp-tokyo',
    name: '도쿄',
    country: '일본',
    scope: 'overseas',
    categories: ['popular', 'japan'],
    image: require('../assets/images/mypage-trips/mypage-trip-tokyo.png'),
    keywords: ['도쿄', '일본', 'tokyo'],
  },
  {
    id: 'hk-hongkong',
    name: '홍콩',
    country: '홍콩',
    scope: 'overseas',
    categories: ['popular', 'taiwan-hongkong'],
    image: require('../assets/images/mypage-trips/mypage-trip-hongkong.png'),
    keywords: ['홍콩', 'hongkong'],
  },
  {
    id: 'tw-taipei',
    name: '대만',
    country: '대만',
    scope: 'overseas',
    categories: ['popular', 'taiwan-hongkong'],
    image: require('../assets/images/mypage-trips/mypage-trip-macao.png'),
    keywords: ['대만', '타이베이', 'taiwan'],
  },
  {
    id: 'sg-singapore',
    name: '싱가포르',
    country: '싱가포르',
    scope: 'overseas',
    categories: ['popular', 'southeast-asia'],
    image: require('../assets/images/mypage-trips/mypage-trip-singapore.png'),
    keywords: ['싱가포르', 'singapore'],
  },
  {
    id: 'th-bangkok',
    name: '방콕',
    country: '태국',
    scope: 'overseas',
    categories: ['popular', 'southeast-asia'],
    image: require('../assets/images/mypage-trips/mypage-trip-bangkok.png'),
    keywords: ['방콕', '태국', 'bangkok'],
  },
  {
    id: 'vn-danang',
    name: '다낭',
    country: '베트남',
    scope: 'overseas',
    categories: ['popular', 'southeast-asia'],
    image: require('../assets/images/record-trip-portugal-day-3.png'),
    keywords: ['다낭', '베트남', 'danang'],
  },
  {
    id: 'vn-phuquoc',
    name: '푸꾸옥',
    country: '베트남',
    scope: 'overseas',
    categories: ['popular', 'southeast-asia'],
    image: require('../assets/images/record-trip-sydney-day-1.png'),
    keywords: ['푸꾸옥', '베트남', 'phuquoc'],
  },
  {
    id: 'fr-paris',
    name: '파리',
    country: '프랑스',
    scope: 'overseas',
    categories: ['popular', 'europe'],
    image: require('../assets/images/mypage-trips/mypage-trip-paris.png'),
    keywords: ['파리', '프랑스', 'paris', 'france'],
  },
  {
    id: 'au-sydney',
    name: '시드니',
    country: '호주',
    scope: 'overseas',
    categories: ['popular', 'oceania'],
    image: require('../assets/images/record-trip-sydney-cover.png'),
    keywords: ['시드니', '호주', 'sydney', 'australia'],
  },
  {
    id: 'gb-london',
    name: '런던',
    country: '영국',
    scope: 'overseas',
    categories: ['popular', 'europe'],
    image: require('../assets/images/archive-frame-paris.jpg'),
    keywords: ['런던', '영국', 'london', 'uk'],
  },
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function destinationLabel(destination: DestinationItem) {
  return `${destination.name}, ${destination.country}`;
}

export default function SelectTripDestinationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [scope, setScope] = React.useState<DestinationScope>('domestic');
  const [categoryId, setCategoryId] = React.useState('popular');
  const [query, setQuery] = React.useState('');

  const destinations = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery) {
      return DESTINATIONS.filter((destination) => {
        if (destination.scope !== scope) return false;
        return [destination.name, destination.country, ...destination.keywords].some((keyword) =>
          keyword.toLowerCase().includes(normalizedQuery),
        );
      });
    }

    return DESTINATIONS.filter(
      (destination) => destination.scope === scope && destination.categories.includes(categoryId),
    );
  }, [categoryId, query, scope]);

  const isPopularGrid = !query.trim() && categoryId === 'popular';

  const handleChangeScope = (nextScope: DestinationScope) => {
    setScope(nextScope);
    setCategoryId('popular');
    setQuery('');
  };

  const handleSelectDestination = (destination: DestinationItem) => {
    router.replace({
      pathname: '/create-trip',
      params: {
        destinationId: destination.id,
        destinationName: destination.name,
        destinationCountry: destination.country,
        destinationLabel: destinationLabel(destination),
        startDate: firstParam(params.startDate),
        endDate: firstParam(params.endDate),
      },
    } as Href);
  };

  const handleAddCustomDestination = () => {
    const customDestinationName = query.trim();

    if (!customDestinationName) return;

    router.replace({
      pathname: '/create-trip',
      params: {
        destinationId: `custom-${Date.now()}`,
        destinationName: customDestinationName,
        destinationCountry: '',
        destinationLabel: customDestinationName,
        isCustomDestination: 'true',
        startDate: firstParam(params.startDate),
        endDate: firstParam(params.endDate),
      },
    } as Href);
  };

  const renderDestination = ({ item }: { item: DestinationItem }) => {
    if (isPopularGrid) {
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => handleSelectDestination(item)}
          style={styles.gridItem}
        >
          <Image source={item.image} style={styles.gridImage} resizeMode="cover" />
          <Text style={styles.gridLabel}>{item.name}</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => handleSelectDestination(item)}
        style={styles.listItem}
      >
        <Image source={item.image} style={styles.listImage} resizeMode="cover" />
        <View style={styles.listTextBlock}>
          <Text style={styles.listTitle}>{item.name}</Text>
          <Text style={styles.listCountry}>{item.country}</Text>
        </View>
        <View style={styles.selectPill}>
          <Text style={styles.selectPillLabel}>선택</Text>
        </View>
      </Pressable>
    );
  };

  const renderEmptyDestination = () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return <Text style={styles.emptyText}>검색 결과가 없어요</Text>;
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>검색 결과가 없어요</Text>
        <Text style={styles.emptyDescription}>입력한 여행지를 직접 추가할 수 있어요</Text>

        <Pressable
          accessibilityRole="button"
          onPress={handleAddCustomDestination}
          style={styles.customDestinationButton}
        >
          <Feather name="plus" size={18} color={Colors.foundation.white} />
          <Text style={styles.customDestinationButtonText}>
            {trimmedQuery} 직접 추가하기
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader title="여행지 선택" onBackPress={() => router.back()} style={styles.header} />

      <View style={styles.searchBox}>
        <Feather name="search" size={20} color={Colors.foundation.black} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="도시나 국가를 검색해주세요"
          placeholderTextColor={Colors.foundation.grey500}
          style={styles.searchInput}
          allowFontScaling={false}
        />
      </View>

      <View style={styles.scopeTabs}>
        <Pressable
          accessibilityRole="button"
          onPress={() => handleChangeScope('domestic')}
          style={styles.scopeTab}
        >
          <Text style={[styles.scopeTabLabel, scope === 'domestic' && styles.scopeTabLabelActive]}>
            국내
          </Text>
          {scope === 'domestic' ? <View style={styles.scopeUnderline} /> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => handleChangeScope('overseas')}
          style={styles.scopeTab}
        >
          <Text style={[styles.scopeTabLabel, scope === 'overseas' && styles.scopeTabLabelActive]}>
            해외
          </Text>
          {scope === 'overseas' ? <View style={styles.scopeUnderline} /> : null}
        </Pressable>
      </View>

      <View style={styles.chipBand}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipContent}
        >
          {CATEGORY_LABELS[scope].map((category) => {
            const active = category.id === categoryId && !query.trim();

            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                onPress={() => {
                  setCategoryId(category.id);
                  setQuery('');
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {category.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={destinations}
        key={isPopularGrid ? 'grid' : 'list'}
        numColumns={isPopularGrid ? 3 : 1}
        keyExtractor={(item) => item.id}
        renderItem={renderDestination}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          isPopularGrid ? styles.gridContent : styles.listContent,
          destinations.length === 0 && styles.emptyContent,
        ]}
        columnWrapperStyle={isPopularGrid ? styles.gridRow : undefined}
        ListEmptyComponent={renderEmptyDestination}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    height: 44,
  },
  searchBox: {
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.xl,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: SEARCH_BG,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  searchInput: {
    ...Typography.body2Regular,
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: Colors.foundation.black,
    textAlignVertical: 'center',
  },
  scopeTabs: {
    marginTop: Spacing.lg,
    height: 32,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 2,
    borderBottomColor: Colors.foundation.grey100,
  },
  scopeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeTabLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey400,
  },
  scopeTabLabelActive: {
    color: Colors.foundation.black,
  },
  scopeUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -2,
    height: 2,
    backgroundColor: Colors.foundation.black,
  },
  chipBand: {
    height: 52,
    backgroundColor: GREY_50,
  },
  chipContent: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chip: {
    height: 28,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.white,
  },
  chipActive: {
    backgroundColor: Colors.foundation.black,
  },
  chipLabel: {
    fontFamily: FontFamily.pretendard,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.foundation.black,
  },
  chipLabelActive: {
    fontFamily: FontFamily.pretendardSemiBold,
    color: Colors.foundation.white,
  },
  gridContent: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: GRID_ROW_GAP,
  },
  gridItem: {
    width: GRID_CARD_WIDTH,
    height: 109,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gridImage: {
    width: GRID_CARD_WIDTH,
    height: GRID_IMAGE_HEIGHT,
    borderRadius: Radius.xs,
    backgroundColor: GREY_50,
  },
  gridLabel: {
    width: GRID_CARD_WIDTH,
    ...Typography.body2Regular,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  listContent: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  listItem: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listImage: {
    width: 60,
    height: 48,
    borderRadius: Radius.xs,
    backgroundColor: GREY_50,
  },
  listTextBlock: {
    flex: 1,
    marginLeft: Spacing.xl,
    justifyContent: 'center',
  },
  listTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  listCountry: {
    ...Typography.body2Regular,
    color: GREY_700,
  },
  selectPill: {
    height: 28,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: GREY_50,
  },
  selectPillLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey800,
  },
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: Spacing.sm,
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
    textAlign: 'center',
  },
  customDestinationButton: {
    marginTop: Spacing.xl,
    height: 44,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.black,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  customDestinationButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
});
