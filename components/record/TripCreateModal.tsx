import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '@/components/common/AppText';
import AppTextInput from '@/components/common/AppTextInput';

import AuthActionButton from '@/components/common/AuthActionButton';
import DestinationSelectField from '@/components/record/DestinationSelectField';
import TripDateRangeField from '@/components/record/TripDateRangeField';
import {
  DESTINATION_COUNTRIES,
  formatDestinationLabel,
  getCitiesByCountry,
  type MockDestination,
  RECOMMENDED_DESTINATIONS,
  searchDestinations,
} from '@/constants/mockDestinations';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

export type TripCreateStep = 'create' | 'destination' | 'countryCity' | 'date';

export interface SelectedDateRange {
  start: string;
  end: string;
  label: string;
}

interface TripCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (payload: {
    destination: MockDestination;
    dateRange: SelectedDateRange;
  }) => void;
}

const MOCK_CALENDAR_WEEKS = [
  [null, null, null, null, 1, 2, 3],
  [4, 5, 6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15, 16, 17],
  [18, 19, 20, 21, 22, 23, 24],
  [25, 26, 27, 28, 29, 30, 31],
];

const MOCK_MONTH_LABEL = '2025년 8월';
const MOCK_SELECTED_RANGE: SelectedDateRange = {
  start: '2025-08-25',
  end: '2025-09-01',
  label: '2025.08.25 - 2025.09.01',
};

export default function TripCreateModal({ visible, onClose, onCreate }: TripCreateModalProps) {
  const [step, setStep] = useState<TripCreateStep>('create');
  const [selectedDestination, setSelectedDestination] = useState<MockDestination | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<SelectedDateRange | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const destinationLabel = selectedDestination
    ? formatDestinationLabel(selectedDestination)
    : undefined;

  const canCreate = Boolean(selectedDestination && selectedDateRange);

  const destinationResults = useMemo(
    () => searchDestinations(searchQuery),
    [searchQuery],
  );

  const countryCities = selectedCountry ? getCitiesByCountry(selectedCountry) : [];

  const resetState = () => {
    setStep('create');
    setSelectedDestination(null);
    setSelectedCountry(null);
    setSelectedDateRange(null);
    setSearchQuery('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleBack = () => {
    if (step === 'countryCity') {
      setStep('destination');
      return;
    }
    if (step === 'destination' || step === 'date') {
      setStep('create');
    }
  };

  const handleSelectDestination = (destination: MockDestination) => {
    setSelectedDestination(destination);
    setStep('create');
    setSearchQuery('');
  };

  const handleSelectCountry = (country: string) => {
    setSelectedCountry(country);
    setStep('countryCity');
  };

  const handleApplyDate = () => {
    setSelectedDateRange(MOCK_SELECTED_RANGE);
    setStep('create');
  };

  const handleCreate = () => {
    if (!selectedDestination || !selectedDateRange) return;
    onCreate({ destination: selectedDestination, dateRange: selectedDateRange });
    resetState();
  };

  const renderHeader = () => {
    if (step === 'create') {
      return (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>새 여행 만들기</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const titles: Record<Exclude<TripCreateStep, 'create'>, string> = {
      destination: '여행지 선택',
      countryCity: selectedCountry ?? '',
      date: '여행 기간 선택',
    };

    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={8}>
          <Image
            source={require('../../assets/images/screenheader-back.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitleStep}>{titles[step]}</Text>
        <TouchableOpacity onPress={handleClose} hitSlop={12}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCreateStep = () => (
    <View style={styles.stepBody}>
      <DestinationSelectField
        label="여행지"
        placeholder="여행지를 선택하세요"
        value={destinationLabel}
        onPress={() => setStep('destination')}
      />
      <TripDateRangeField
        label="여행 기간"
        placeholder="날짜를 선택하세요"
        value={selectedDateRange?.label}
        onPress={() => setStep('date')}
      />
      <AuthActionButton
        label="여행 만들기"
        onPress={() => {
          if (canCreate) handleCreate();
        }}
        state={canCreate ? 'on' : 'off'}
      />
    </View>
  );

  const renderDestinationStep = () => (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={styles.stepScrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AppTextInput
        style={styles.searchInput}
        placeholder="도시 또는 국가 검색"
        placeholderTextColor={Colors.foundation.grey500}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Text style={styles.sectionTitle}>
        {searchQuery.trim() ? '검색 결과' : '추천 여행지'}
      </Text>
      {(searchQuery.trim() ? destinationResults : RECOMMENDED_DESTINATIONS).map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.listRow}
          onPress={() => handleSelectDestination(item)}
        >
          <Text style={styles.listRowText}>{formatDestinationLabel(item)}</Text>
        </TouchableOpacity>
      ))}

      {!searchQuery.trim() && (
        <>
          <Text style={[styles.sectionTitle, styles.sectionGap]}>국가별로 찾아보기</Text>
          {DESTINATION_COUNTRIES.map((country) => (
            <TouchableOpacity
              key={country}
              style={styles.listRow}
              onPress={() => handleSelectCountry(country)}
            >
              <Text style={styles.listRowText}>{country}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );

  const renderCountryCityStep = () => (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={styles.stepScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {countryCities.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.listRow}
          onPress={() => handleSelectDestination(item)}
        >
          <Text style={styles.listRowText}>{item.city}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderDateStep = () => (
    <View style={styles.stepBody}>
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.monthArrow} activeOpacity={0.6}>
          <Text style={styles.monthArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MOCK_MONTH_LABEL}</Text>
        <TouchableOpacity style={styles.monthArrow} activeOpacity={0.6}>
          <Text style={styles.monthArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeader}>
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <Text key={d} style={styles.weekDay}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.calendar}>
        {MOCK_CALENDAR_WEEKS.map((week, wi) => (
          <View key={wi} style={styles.calendarRow}>
            {week.map((day, di) => {
              if (day == null) {
                return <View key={`empty-${wi}-${di}`} style={styles.dayCell} />;
              }

              const inRange = day >= 25 && day <= 31;
              const isStart = day === 25;
              const isEnd = day === 31;

              return (
                <View
                  key={day}
                  style={[
                    styles.dayCell,
                    inRange && styles.dayInRange,
                    isStart && styles.dayStart,
                    isEnd && styles.dayEnd,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      (isStart || isEnd) && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={styles.selectedRange}>{MOCK_SELECTED_RANGE.label}</Text>

      <AuthActionButton label="적용하기" onPress={handleApplyDate} state="on" />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {renderHeader()}
          {step === 'create' && renderCreateStep()}
          {step === 'destination' && renderDestinationStep()}
          {step === 'countryCity' && renderCountryCityStep()}
          {step === 'date' && renderDateStep()}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.light.bgOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modal: {
    width: '100%',
    maxWidth: 329,
    maxHeight: '85%',
    borderRadius: Radius.lg,
    backgroundColor: Colors.foundation.white,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    ...Shadows.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    minHeight: 28,
  },
  headerTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    flex: 1,
  },
  headerTitleStep: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  closeText: {
    fontSize: 22,
    lineHeight: 22,
    color: Colors.foundation.black,
  },
  stepBody: {
    gap: Spacing.lg,
  },
  stepScroll: {
    maxHeight: 420,
  },
  stepScrollContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  searchInput: {
    ...Typography.body1Regular,
    minHeight: 48,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warm.beige,
    paddingHorizontal: Spacing.lg,
    color: Colors.foundation.black,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey600,
    marginTop: Spacing.sm,
  },
  sectionGap: {
    marginTop: Spacing.lg,
  },
  listRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.foundation.grey100,
  },
  listRowText: {
    ...Typography.body1Regular,
    color: Colors.foundation.black,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthArrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowText: {
    fontSize: 20,
    color: Colors.foundation.grey600,
  },
  monthLabel: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  weekDay: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
    width: 36,
    textAlign: 'center',
  },
  calendar: {
    gap: 4,
    marginVertical: Spacing.sm,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xs,
  },
  dayInRange: {
    backgroundColor: Colors.warm.white,
  },
  dayStart: {
    backgroundColor: Colors.foundation.black,
    borderTopLeftRadius: Radius.sm,
    borderBottomLeftRadius: Radius.sm,
  },
  dayEnd: {
    backgroundColor: Colors.foundation.black,
    borderTopRightRadius: Radius.sm,
    borderBottomRightRadius: Radius.sm,
  },
  dayText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  dayTextSelected: {
    color: Colors.foundation.white,
    ...Typography.body2Emphasized,
  },
  selectedRange: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    textAlign: 'center',
  },
});
