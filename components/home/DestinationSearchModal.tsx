import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import AuthActionButton from '@/components/common/AuthActionButton';
import AppTextInput from '@/components/common/AppTextInput';
import Text from '@/components/common/AppText';
import {
  searchTripDestinations,
  type DestinationOption,
} from '@/constants/mockTripDestinations';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

interface DestinationSearchModalProps {
  visible: boolean;
  currentDestination: DestinationOption;
  onCancel: () => void;
  onSave: (destination: DestinationOption) => void;
}

function getTypeLabel(option: DestinationOption): string {
  if (option.type === 'country') {
    return 'Country';
  }

  return `City · ${option.countryName}`;
}

export default function DestinationSearchModal({
  visible,
  currentDestination,
  onCancel,
  onSave,
}: DestinationSearchModalProps) {
  const [query, setQuery] = React.useState('');
  const [draftDestination, setDraftDestination] = React.useState(currentDestination);

  React.useEffect(() => {
    if (visible) {
      setQuery('');
      setDraftDestination(currentDestination);
    }
  }, [currentDestination, visible]);

  const results = React.useMemo(() => searchTripDestinations(query), [query]);
  const canSave = draftDestination.id !== currentDestination.id;

  const handleSave = () => {
    if (!canSave) return;
    onSave(draftDestination);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>여행지 변경</Text>
            <Pressable hitSlop={12} onPress={onCancel}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.currentBox}>
            <Text style={styles.currentLabel}>현재 여행지</Text>
            <Text style={styles.currentValue}>{currentDestination.displayName}</Text>
          </View>

          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={Colors.foundation.grey500} />
            <AppTextInput
              style={styles.searchInput}
              placeholder="도시 또는 국가 검색"
              placeholderTextColor={Colors.foundation.grey500}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          <ScrollView
            style={styles.resultList}
            contentContainerStyle={styles.resultListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {results.map((option) => {
              const isSelected = option.id === draftDestination.id;

              return (
                <Pressable
                  key={option.id}
                  style={[styles.resultRow, isSelected && styles.resultRowSelected]}
                  onPress={() => setDraftDestination(option)}
                >
                  <View style={styles.resultTextBlock}>
                    <Text style={styles.resultTitle}>{option.displayName}</Text>
                    <Text style={styles.resultMeta}>{getTypeLabel(option)}</Text>
                  </View>
                  {isSelected ? (
                    <Feather name="check" size={18} color={Colors.foundation.black} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.actionRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelLabel}>취소</Text>
            </Pressable>
            <AuthActionButton
              label="저장"
              state={canSave ? 'on' : 'off'}
              onPress={handleSave}
              style={styles.saveButton}
            />
          </View>
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
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.light.bgOverlay,
  },
  modal: {
    width: '100%',
    maxWidth: 350,
    maxHeight: '84%',
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    ...Shadows.modal,
  },
  header: {
    minHeight: 28,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  closeText: {
    fontSize: 22,
    lineHeight: 22,
    color: Colors.foundation.black,
  },
  currentBox: {
    minHeight: 56,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warm.beige,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    gap: 2,
    marginBottom: Spacing.lg,
  },
  currentLabel: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey500,
  },
  currentValue: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  searchBox: {
    height: 48,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warm.beige,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    ...Typography.body1Regular,
    flex: 1,
    color: Colors.foundation.black,
    paddingVertical: 0,
  },
  resultList: {
    maxHeight: 300,
  },
  resultListContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  resultRow: {
    minHeight: 58,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warm.beige,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.foundation.white,
  },
  resultRowSelected: {
    borderColor: Colors.foundation.black,
    backgroundColor: Colors.warm.white,
  },
  resultTextBlock: {
    gap: 2,
  },
  resultTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  resultMeta: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.warm.beige,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.white,
  },
  cancelLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  saveButton: {
    flex: 1,
  },
});
