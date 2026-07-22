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
import AuthActionButton from '@/components/common/AuthActionButton';
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
  selectedDestinations?: DestinationOption[];
  isConfirming?: boolean;
  onSelectDestination: (destination: DestinationOption) => void;
  onConfirmDestinations?: (destinations: DestinationOption[]) => void;
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

function getDestinationKey(destination: DestinationOption) {
  const name = (destination.name ?? destination.displayName).trim().toLowerCase();
  const country = (destination.country ?? destination.countryName ?? '').trim().toLowerCase();

  return `${destination.id}|${name}|${country}`;
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
  selected,
  onPress,
}: {
  destination: DestinationOption;
  selected: boolean;
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
      {selected ? (
        <View style={styles.popularCheckBadge}>
          <Feather name="check" size={14} color={Colors.foundation.white} />
        </View>
      ) : null}
      <Text style={styles.popularLabel} numberOfLines={1}>
        {destination.name}
      </Text>
    </Pressable>
  );
}

function DestinationListItem({
  destination,
  selected,
  onPress,
}: {
  destination: DestinationOption;
  selected: boolean;
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

      <View style={[styles.selectPill, selected && styles.selectPillActive]}>
        {selected ? <Feather name="check" size={14} color={Colors.foundation.white} /> : null}
        <Text style={[styles.selectPillText, selected && styles.selectPillTextActive]}>
          {selected ? '선택됨' : '선택'}
        </Text>
      </View>
    </Pressable>
  );
}


function SelectedDestinationChip({
  destination,
  onRemove,
}: {
  destination: DestinationOption;
  onRemove: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={styles.selectedChip}
      onPress={onRemove}
    >
      <Text style={styles.selectedChipText} numberOfLines={1}>
        {destination.name}
      </Text>
      <Feather name="x" size={14} color={Colors.foundation.grey700} />
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
  selectedDestinations,
  isConfirming = false,
  onSelectDestination,
  onConfirmDestinations,
  onClose,
  onBack,
  title = '여행지 선택',
  autoFocus = false,
}: DestinationSelectModalProps) {
  const { width, height } = useWindowDimensions();
  const [searchText, setSearchText] = React.useState('');
  const [scope, setScope] = React.useState<DestinationScope>(initialScope);
  const [categoryId, setCategoryId] = React.useState(initialCategoryId);
  const [draftDestinations, setDraftDestinations] = React.useState<DestinationOption[]>([]);
  const isMultiSelect = Boolean(onConfirmDestinations);

  React.useEffect(() => {
    if (!visible) return;

    setSearchText('');
    setScope(initialScope);
    setCategoryId(initialCategoryId);
    setDraftDestinations(selectedDestinations ?? (selectedDestination ? [selectedDestination] : []));
  }, [initialCategoryId, initialScope, selectedDestination, selectedDestinations, visible]);

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
  const selectedKeys = React.useMemo(
    () => new Set(draftDestinations.map(getDestinationKey)),
    [draftDestinations],
  );
  const selectedCount = draftDestinations.length;

  const isDestinationSelected = React.useCallback(
    (destination: DestinationOption) => selectedKeys.has(getDestinationKey(destination)),
    [selectedKeys],
  );

  const handleSelectDestination = (destination: DestinationOption) => {
    if (!isMultiSelect) {
      onSelectDestination(destination);
      return;
    }

    const destinationKey = getDestinationKey(destination);

    setDraftDestinations((current) => {
      if (current.some((item) => getDestinationKey(item) === destinationKey)) {
        return current.filter((item) => getDestinationKey(item) !== destinationKey);
      }

      return [...current, destination];
    });
  };

  const handleDirectAdd = () => {
    if (!trimmedSearchText) return;
    handleSelectDestination(createCustomDestination(trimmedSearchText));
  };

  const handleRemoveDestination = (destination: DestinationOption) => {
    const destinationKey = getDestinationKey(destination);

    setDraftDestinations((current) =>
      current.filter((item) => getDestinationKey(item) !== destinationKey),
    );
  };

  const handleConfirm = () => {
    if (!onConfirmDestinations || draftDestinations.length === 0) return;

    onConfirmDestinations(draftDestinations);
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
              selected={isDestinationSelected(destination)}
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
              selected={isDestinationSelected(destination)}
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
            selected={isDestinationSelected(destination)}
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

          {isMultiSelect ? (
            <View style={styles.selectionFooter}>
              {selectedCount > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.selectedChipList}
                >
                  {draftDestinations.map((destination) => (
                    <SelectedDestinationChip
                      key={getDestinationKey(destination)}
                      destination={destination}
                      onRemove={() => handleRemoveDestination(destination)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.selectionEmptyText}>선택한 여행지 0개</Text>
              )}

              <AuthActionButton
                disabled={selectedCount === 0 || isConfirming}
                loading={isConfirming}
                label={selectedCount > 0 ? `완료 (${selectedCount})` : '완료'}
                onPress={handleConfirm}
                state={selectedCount > 0 ? 'on' : 'off'}
              />
            </View>
          ) : null}
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
    position: 'relative',
  },
  popularImage: {
    width: 90,
    height: 68,
    borderRadius: Radius.xs,
  },
  popularCheckBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.black,
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
    flexDirection: 'row',
    gap: Spacing.xs,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    backgroundColor: '#F2F2F2',
  },
  selectPillActive: {
    backgroundColor: Colors.foundation.black,
  },
  selectPillText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey800,
  },
  selectPillTextActive: {
    color: Colors.foundation.white,
  },
  selectedChip: {
    maxWidth: 120,
    minHeight: 32,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warm.white,
  },
  selectedChipText: {
    ...Typography.captionEmphasized,
    flexShrink: 1,
    color: Colors.foundation.grey800,
  },
  selectionFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.foundation.grey100,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.foundation.white,
  },
  selectedChipList: {
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  selectionEmptyText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey500,
    textAlign: 'center',
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
