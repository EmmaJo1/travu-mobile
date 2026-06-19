import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';

import AppTextInput from '@/components/common/AppTextInput';
import Text from '@/components/common/AppText';
import {
  createCustomDestination,
  getDestinationCategories,
  getDestinationsByCategory,
  searchTripDestinations,
  type DestinationOption,
  type DestinationScope,
} from '@/constants/mockTripDestinations';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

type DestinationSelectModalProps = {
  visible: boolean;
  initialScope?: DestinationScope;
  initialCategoryId?: string;
  selectedDestination?: DestinationOption | null;
  onSelectDestination: (destination: DestinationOption) => void;
  onClose: () => void;
  onBack?: () => void;
  title?: string;
  autoFocus?: boolean;
};

function toImageSource(image: DestinationOption['image']): ImageSourcePropType | undefined {
  if (!image) return undefined;
  return typeof image === 'string' ? { uri: image } : image;
}

function formatCountry(option: DestinationOption): string {
  return option.country ?? option.countryName ?? '';
}

function getDestinationLabel(option: DestinationOption): string {
  const country = formatCountry(option);
  if (!country) return option.name;
  return `${option.name}, ${country}`;
}

function DestinationCountryTabs({
  selectedScope,
  onChangeScope,
}: {
  selectedScope: DestinationScope;
  onChangeScope: (scope: DestinationScope) => void;
}) {
  return (
    <View style={styles.scopeTabs}>
      {([
        ['domestic', '국내'],
        ['overseas', '해외'],
      ] as const).map(([scope, label]) => {
        const selected = selectedScope === scope;

        return (
          <Pressable
            key={scope}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={styles.scopeTab}
            onPress={() => onChangeScope(scope)}
          >
            <Text style={[styles.scopeTabText, selected && styles.scopeTabTextActive]}>
              {label}
            </Text>
            {selected ? <View style={styles.scopeTabIndicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function DestinationFilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.categoryChip, selected && styles.categoryChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function DestinationCategoryChipList({
  scope,
  selectedCategoryId,
  onSelectCategory,
}: {
  scope: DestinationScope;
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}) {
  return (
    <View style={styles.categoryBand}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
      >
        {getDestinationCategories(scope).map((category) => (
          <DestinationFilterChip
            key={category.id}
            label={category.label}
            selected={selectedCategoryId === category.id}
            onPress={() => onSelectCategory(category.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function PopularDestinationCard({
  destination,
  onPress,
}: {
  destination: DestinationOption;
  onPress: () => void;
}) {
  const imageSource = toImageSource(destination.image);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${getDestinationLabel(destination)} 선택`}
      style={styles.popularCard}
      onPress={onPress}
    >
      {imageSource ? (
        <Image source={imageSource} style={styles.popularImage} resizeMode="cover" />
      ) : (
        <View style={[styles.popularImage, styles.imagePlaceholder]} />
      )}
      <Text style={styles.popularLabel} numberOfLines={1}>
        {destination.name}
      </Text>
    </Pressable>
  );
}

function DestinationListItem({
  destination,
  onPress,
}: {
  destination: DestinationOption;
  onPress: () => void;
}) {
  const imageSource = toImageSource(destination.image);
  const country = formatCountry(destination);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${getDestinationLabel(destination)} 선택`}
      style={styles.listItem}
      onPress={onPress}
    >
      {imageSource ? (
        <Image source={imageSource} style={styles.listImage} resizeMode="cover" />
      ) : (
        <View style={[styles.listImage, styles.imagePlaceholder]} />
      )}

      <View style={styles.listTextBlock}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {destination.name}
        </Text>
        {country ? (
          <Text style={styles.listCountry} numberOfLines={1}>
            {country}
          </Text>
        ) : null}
      </View>

      <View style={styles.selectPill}>
        <Text style={styles.selectPillText}>선택</Text>
      </View>
    </Pressable>
  );
}

function DestinationDirectAddItem({
  query,
  prominent = false,
  onPress,
}: {
  query: string;
  prominent?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.directAddItem, prominent && styles.directAddItemProminent]}
      onPress={onPress}
    >
      <Feather name="plus" size={16} color={Colors.foundation.grey600} />
      <Text style={styles.directAddText} numberOfLines={1}>
        “{query}”로 직접 추가하기
      </Text>
    </Pressable>
  );
}

function DestinationEmptyState({
  query,
  onDirectAdd,
}: {
  query: string;
  onDirectAdd: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>검색 결과가 없어요</Text>
      <Text style={styles.emptyDescription}>입력한 이름으로 여행지를 추가할 수 있어요</Text>
      <DestinationDirectAddItem query={query} prominent onPress={onDirectAdd} />
    </View>
  );
}

export default function DestinationSelectModal({
  visible,
  initialScope = 'domestic',
  initialCategoryId = 'popular',
  selectedDestination,
  onSelectDestination,
  onClose,
  onBack,
  title = '여행지 선택',
  autoFocus = false,
}: DestinationSelectModalProps) {
  const { width, height } = useWindowDimensions();
  const [searchText, setSearchText] = React.useState('');
  const [scope, setScope] = React.useState<DestinationScope>(initialScope);
  const [categoryId, setCategoryId] = React.useState(initialCategoryId);

  React.useEffect(() => {
    if (!visible) return;

    setSearchText('');
    setScope(initialScope);
    setCategoryId(initialCategoryId);
  }, [initialCategoryId, initialScope, visible]);

  const trimmedSearchText = searchText.trim();
  const isSearching = trimmedSearchText.length > 0;
  const categoryDestinations = React.useMemo(
    () => getDestinationsByCategory(scope, categoryId),
    [categoryId, scope],
  );
  const searchResults = React.useMemo(
    () => searchTripDestinations(trimmedSearchText, scope),
    [scope, trimmedSearchText],
  );
  const panelWidth = Math.min(width - Spacing.xl * 2, 340);
  const panelHeight = Math.min(height - Spacing['3xl'], 596);

  const handleSelectDestination = (destination: DestinationOption) => {
    onSelectDestination(destination);
  };

  const handleDirectAdd = () => {
    if (!trimmedSearchText) return;
    handleSelectDestination(createCustomDestination(trimmedSearchText));
  };

  const handleChangeScope = (nextScope: DestinationScope) => {
    setScope(nextScope);
    setCategoryId('popular');
  };

  const renderContent = () => {
    if (isSearching) {
      if (searchResults.length === 0) {
        return (
          <DestinationEmptyState
            query={trimmedSearchText}
            onDirectAdd={handleDirectAdd}
          />
        );
      }

      return (
        <View style={styles.listContent}>
          {searchResults.map((destination) => (
            <DestinationListItem
              key={destination.id}
              destination={destination}
              onPress={() => handleSelectDestination(destination)}
            />
          ))}
          <DestinationDirectAddItem query={trimmedSearchText} onPress={handleDirectAdd} />
        </View>
      );
    }

    if (categoryId === 'popular') {
      return (
        <View style={styles.popularGrid}>
          {categoryDestinations.slice(0, 9).map((destination) => (
            <PopularDestinationCard
              key={destination.id}
              destination={destination}
              onPress={() => handleSelectDestination(destination)}
            />
          ))}
        </View>
      );
    }

    return (
      <View style={styles.listContent}>
        {categoryDestinations.map((destination) => (
          <DestinationListItem
            key={destination.id}
            destination={destination}
            onPress={() => handleSelectDestination(destination)}
          />
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.panel, { width: panelWidth, height: panelHeight }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="뒤로가기"
              style={styles.headerButton}
              hitSlop={8}
              onPress={onBack ?? onClose}
            >
              <Feather name="chevron-left" size={24} color={Colors.foundation.black} />
            </Pressable>

            <Text style={styles.title}>{title}</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              style={styles.headerButton}
              hitSlop={8}
              onPress={onClose}
            >
              <Feather name="x" size={24} color={Colors.foundation.black} />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={Colors.foundation.black} />
            <AppTextInput
              style={styles.searchInput}
              placeholder="도시나 국가를 검색해주세요"
              placeholderTextColor={Colors.foundation.grey500}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus={autoFocus}
              returnKeyType="search"
            />
            {searchText.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="검색어 지우기"
                hitSlop={8}
                onPress={() => setSearchText('')}
              >
                <Feather name="x-circle" size={18} color={Colors.foundation.grey500} />
              </Pressable>
            ) : null}
          </View>

          <DestinationCountryTabs
            selectedScope={scope}
            onChangeScope={handleChangeScope}
          />

          <DestinationCategoryChipList
            scope={scope}
            selectedCategoryId={categoryId}
            onSelectCategory={setCategoryId}
          />

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderContent()}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.bgOverlay,
  },
  panel: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: Colors.foundation.white,
    ...Shadows.modal,
  },
  header: {
    height: 56,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  searchBox: {
    height: 40,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#F2F2F2',
  },
  searchInput: {
    ...Typography.body2Regular,
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: Colors.foundation.black,
  },
  scopeTabs: {
    height: 32,
    borderBottomWidth: 2,
    borderBottomColor: Colors.foundation.grey100,
    flexDirection: 'row',
  },
  scopeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeTabText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey400,
  },
  scopeTabTextActive: {
    color: Colors.foundation.black,
  },
  scopeTabIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -2,
    height: 2,
    backgroundColor: Colors.foundation.black,
  },
  categoryBand: {
    height: 52,
    justifyContent: 'center',
    backgroundColor: '#F2F2F2',
  },
  categoryList: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  categoryChip: {
    height: 28,
    justifyContent: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    backgroundColor: Colors.foundation.white,
  },
  categoryChipActive: {
    backgroundColor: Colors.foundation.black,
  },
  categoryChipText: {
    fontFamily: Typography.body2Regular.fontFamily,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.foundation.black,
  },
  categoryChipTextActive: {
    fontFamily: Typography.body2Emphasized.fontFamily,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.foundation.white,
  },
  contentScroll: {
    flex: 1,
    alignSelf: 'stretch',
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
  },
  popularGrid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.lg,
  },
  popularCard: {
    width: 90,
    height: 96,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  popularImage: {
    width: 90,
    height: 68,
    borderRadius: Radius.xs,
  },
  imagePlaceholder: {
    backgroundColor: Colors.foundation.grey100,
  },
  popularLabel: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
    textAlign: 'center',
  },
  listContent: {
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  listItem: {
    alignSelf: 'stretch',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listImage: {
    width: 60,
    height: 48,
    borderRadius: Radius.xs,
  },
  listTextBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    marginLeft: Spacing.lg,
    marginRight: Spacing.md,
  },
  listTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  listCountry: {
    ...Typography.body2Regular,
    color: '#595959',
  },
  selectPill: {
    height: 24,
    minWidth: 41,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    backgroundColor: '#F2F2F2',
  },
  selectPillText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey800,
  },
  directAddItem: {
    minHeight: 48,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.warm.white,
  },
  directAddItemProminent: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warm.beige,
  },
  directAddText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
  },
  emptyState: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  emptyDescription: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
});
