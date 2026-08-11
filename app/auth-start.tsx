/**
 * auth-start
 *
 * Figma: EfragPmsgNBJnt5wFEOAkB
 *   821:716  — 메인 랜딩 화면
 *   821:966  — 이용약관 및 개인정보 동의 바텀시트
 *   821:1033 — 이용약관 상세 시트
 *   821:1082 — 개인정보 처리방침 상세 시트
 *
 * Figma 확정 스펙 (821:716):
 *   - 배경: #F9F5F3
 *   - "TRAVEL JOURNAL APP": Pretendard 10/500, ls:4, #857B70
 *   - "Travu": Pretendard 56/700, black
 *   - 부제목: Noto Serif CJK KR 14/500, #292B2C
 *   - 버튼: w:320 h:48 r:8, 라벨 Pretendard 14/500
 *   - Apple 아이콘: 24×24 white
 *   - Google 아이콘: 16×16 4색 G
 */
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import AppTextInput from '@/components/common/AppTextInput';
import Text from '@/components/common/AppText';

import { Path, Svg } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SheetActionButton from '@/components/common/SheetActionButton';
import { LEGAL_DOCUMENTS } from '@/constants/legalDocuments';
import { Colors, FontFamily, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { acceptRequiredLegalDocuments } from '@/services/supabase/users';

type SheetType = 'none' | 'age' | 'terms' | 'privacy' | 'consent';
type AuthProviderName = 'google' | 'apple';

type BirthDateEligibility = 'eligible' | 'invalid' | 'underage';

const MIN_BIRTH_YEAR = 1900;
const MINIMUM_AGE = 14;

function evaluateBirthDateEligibility(
  yearText: string,
  monthText: string,
  dayText: string,
  today = new Date(),
): BirthDateEligibility {
  if (!/^\d{4}$/.test(yearText) || !/^\d{1,2}$/.test(monthText) || !/^\d{1,2}$/.test(dayText)) {
    return 'invalid';
  }

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const birthDate = new Date(year, month - 1, day);

  if (
    year < MIN_BIRTH_YEAR ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return 'invalid';
  }

  const isFutureDate =
    year > today.getFullYear() ||
    (
      year === today.getFullYear() &&
      (
        month > today.getMonth() + 1 ||
        (month === today.getMonth() + 1 && day > today.getDate())
      )
    );

  if (isFutureDate) {
    return 'invalid';
  }

  let age = today.getFullYear() - year;
  const birthdayHasPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!birthdayHasPassed) {
    age -= 1;
  }

  return age >= MINIMUM_AGE ? 'eligible' : 'underage';
}

/** 공식 Google G 로고 — 18×18 viewBox 기반 4색 SVG 경로 */
function GoogleLogo() {
  return (
    <Svg width={16} height={16} viewBox="0 0 18 18">
      {/* Blue */}
      <Path
        fill="#4285F4"
        d="M17.64 9.2045c0-.5909-.0534-1.1592-.1489-1.7091H9v3.2318h4.8436c-.2083 1.1218-.8417 2.0718-1.7964 2.7127v2.2545h2.9083c1.7018-1.5682 2.6845-3.8773 2.6845-6.4899z"
      />
      {/* Green */}
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1818l-2.9083-2.2545c-.8064.5418-1.8382.8618-3.048.8618-2.3455 0-4.3309-1.5845-5.0382-3.7127H.9574v2.3282C2.4382 15.9836 5.4818 18 9 18z"
      />
      {/* Yellow */}
      <Path
        fill="#FBBC05"
        d="M3.9618 10.71C3.7836 10.1682 3.6818 9.5918 3.6818 9s.1018-1.1682.28-1.71V4.9618H.9574C.3473 6.1773 0 7.5482 0 9s.3473 2.8227.9574 4.0382L3.9618 10.71z"
      />
      {/* Red */}
      <Path
        fill="#EA4335"
        d="M9 3.5782c1.3218 0 2.5073.4545 3.4409 1.3473l2.5818-2.5818C13.4636.8918 11.4327 0 9 0 5.4818 0 2.4382 2.0164.9574 4.9618L3.9618 7.29C4.6691 5.1618 6.6545 3.5782 9 3.5782z"
      />
    </Svg>
  );
}

/**
 * 단일 Modal 안에서 consent → terms/privacy 전환을 처리합니다.
 * - 딤: Modal 최초 열릴 때만 짧게 fadeIn (시트 전환 시 유지)
 * - 시트: 열릴 때 slideUp, 닫힐 때 slideDown
 * - sheet !== 'none' 이면 즉시 Modal 렌더 (mounted 지연 없음)
 */
function SheetModal({
  sheet,
  birthYear,
  birthMonth,
  birthDay,
  ageError,
  onChangeBirthYear,
  onChangeBirthMonth,
  onChangeBirthDay,
  onConfirmAge,
  onCloseAge,
  onClose,
  onOpenTerms,
  onOpenPrivacy,
  onBackToConsent,
  onAgree,
  agreedTerms,
  agreedPrivacy,
  onToggleTerms,
  onTogglePrivacy,
  canProceed,
  paddingBottom,
}: {
  sheet: SheetType;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  ageError: string | null;
  onChangeBirthYear: (value: string) => void;
  onChangeBirthMonth: (value: string) => void;
  onChangeBirthDay: (value: string) => void;
  onConfirmAge: () => void;
  onCloseAge: () => void;
  onClose: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onBackToConsent: () => void;
  onAgree: () => void;
  agreedTerms: boolean;
  agreedPrivacy: boolean;
  onToggleTerms: () => void;
  onTogglePrivacy: () => void;
  canProceed: boolean;
  paddingBottom: number;
}) {
  const isOpen = sheet !== 'none';
  const [presented, setPresented] = useState(false);
  const wasOpenRef = useRef(false);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const dimOpacity  = useRef(new Animated.Value(0)).current;
  const sheetTransY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    animRef.current?.stop();

    if (isOpen) {
      setPresented(true);
      const isFirstOpen = !wasOpenRef.current;
      wasOpenRef.current = true;

      if (isFirstOpen) {
        dimOpacity.setValue(0);
        sheetTransY.setValue(600);
        animRef.current = Animated.parallel([
          Animated.timing(dimOpacity,  { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(sheetTransY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]);
        animRef.current.start();
      } else {
        // consent ↔ terms/privacy 전환: 딤·시트 위치 유지
        dimOpacity.setValue(1);
        sheetTransY.setValue(0);
      }
      return;
    }

    // 닫힘 — 이전에 열린 적이 있을 때만 닫힘 애니메이션 실행
    if (!wasOpenRef.current) return;

    wasOpenRef.current = false;
    animRef.current = Animated.parallel([
      Animated.timing(dimOpacity,  { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetTransY, { toValue: 600, duration: 250, useNativeDriver: true }),
    ]);
    animRef.current.start(({ finished }) => {
      if (finished) setPresented(false);
    });

    return () => {
      animRef.current?.stop();
    };
  }, [isOpen, sheet, dimOpacity, sheetTransY]);

  // isOpen이면 즉시 표시, 닫히는 중이면 presented 유지
  if (!isOpen && !presented) return null;

  const isTall = sheet === 'terms' || sheet === 'privacy';
  const handleDismissRequest = sheet === 'age'
    ? onCloseAge
    : sheet === 'consent'
      ? onClose
      : onBackToConsent;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleDismissRequest}>
      <KeyboardAvoidingView
        style={styles.modalWrapper}
        behavior={sheet === 'age' && Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.dimmedBase, { opacity: dimOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismissRequest} />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomSheet,
            isTall && styles.bottomSheetTall,
            { paddingBottom, transform: [{ translateY: sheetTransY }] },
          ]}
          >
          {sheet === 'age' && (
            <AgeVerificationContent
              year={birthYear}
              month={birthMonth}
              day={birthDay}
              error={ageError}
              onChangeYear={onChangeBirthYear}
              onChangeMonth={onChangeBirthMonth}
              onChangeDay={onChangeBirthDay}
              onConfirm={onConfirmAge}
              onClose={onCloseAge}
            />
          )}
          {sheet === 'consent' && (
            <ConsentContent
              agreedTerms={agreedTerms}
              agreedPrivacy={agreedPrivacy}
              onToggleTerms={onToggleTerms}
              onTogglePrivacy={onTogglePrivacy}
              canProceed={canProceed}
              onClose={onClose}
              onAgree={onAgree}
              onOpenTerms={onOpenTerms}
              onOpenPrivacy={onOpenPrivacy}
            />
          )}
          {sheet === 'terms' && (
            <DetailContent
              title={LEGAL_DOCUMENTS['terms-of-service'].title}
              body={LEGAL_DOCUMENTS['terms-of-service'].content}
              onClose={onBackToConsent}
            />
          )}
          {sheet === 'privacy' && (
            <DetailContent
              title={LEGAL_DOCUMENTS['privacy-policy'].title}
              body={LEGAL_DOCUMENTS['privacy-policy'].content}
              onClose={onBackToConsent}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AgeVerificationContent({
  year,
  month,
  day,
  error,
  onChangeYear,
  onChangeMonth,
  onChangeDay,
  onConfirm,
  onClose,
}: {
  year: string;
  month: string;
  day: string;
  error: string | null;
  onChangeYear: (value: string) => void;
  onChangeMonth: (value: string) => void;
  onChangeDay: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const monthInputRef = useRef<React.ElementRef<typeof AppTextInput>>(null);
  const dayInputRef = useRef<React.ElementRef<typeof AppTextInput>>(null);
  const hasCompleteInput = year.length === 4 && month.length > 0 && day.length > 0;

  const normalizeDigits = (value: string, maxLength: number) =>
    value.replace(/\D/g, '').slice(0, maxLength);

  return (
    <>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
        <Ionicons name="close" size={20} color={Colors.foundation.black} />
      </TouchableOpacity>
      <Text style={styles.sheetTitle}>이용 가능 연령 확인</Text>
      <Text style={styles.sheetDesc}>
        Travu는 만 14세 이상만 이용할 수 있어요.{`\n`}
        이용 가능 연령 확인을 위해 생년월일을 입력해주세요.
      </Text>
      <View style={styles.birthDateInputs}>
        <View style={styles.birthDateFieldWide}>
          <AppTextInput
            value={year}
            onChangeText={(value) => onChangeYear(normalizeDigits(value, 4))}
            placeholder="YYYY"
            placeholderTextColor={Colors.light.textPlaceholder}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={4}
            returnKeyType="next"
            onSubmitEditing={() => monthInputRef.current?.focus()}
            style={styles.birthDateInput}
            accessibilityLabel="출생 연도"
          />
          <Text style={styles.birthDateUnit}>년</Text>
        </View>
        <View style={styles.birthDateField}>
          <AppTextInput
            ref={monthInputRef}
            value={month}
            onChangeText={(value) => onChangeMonth(normalizeDigits(value, 2))}
            placeholder="MM"
            placeholderTextColor={Colors.light.textPlaceholder}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            returnKeyType="next"
            onSubmitEditing={() => dayInputRef.current?.focus()}
            style={styles.birthDateInput}
            accessibilityLabel="출생 월"
          />
          <Text style={styles.birthDateUnit}>월</Text>
        </View>
        <View style={styles.birthDateField}>
          <AppTextInput
            ref={dayInputRef}
            value={day}
            onChangeText={(value) => onChangeDay(normalizeDigits(value, 2))}
            placeholder="DD"
            placeholderTextColor={Colors.light.textPlaceholder}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            returnKeyType="done"
            onSubmitEditing={onConfirm}
            style={styles.birthDateInput}
            accessibilityLabel="출생 일"
          />
          <Text style={styles.birthDateUnit}>일</Text>
        </View>
      </View>
      {error ? <Text style={styles.ageError}>{error}</Text> : null}
      <SheetActionButton
        label="확인"
        onPress={onConfirm}
        active={hasCompleteInput}
        style={styles.agreeBtn}
      />
    </>
  );
}

function ConsentContent({
  agreedTerms, agreedPrivacy, onToggleTerms, onTogglePrivacy,
  canProceed, onClose, onAgree, onOpenTerms, onOpenPrivacy,
}: {
  agreedTerms: boolean; agreedPrivacy: boolean;
  onToggleTerms: () => void; onTogglePrivacy: () => void;
  canProceed: boolean; onClose: () => void; onAgree: () => void;
  onOpenTerms: () => void; onOpenPrivacy: () => void;
}) {
  return (
    <>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
        <Ionicons name="close" size={20} color={Colors.foundation.black} />
      </TouchableOpacity>
      <Text style={styles.sheetTitle}>이용약관 및 개인정보 처리방침</Text>
      <Text style={styles.sheetDesc}>
        Travu는 회원님의 개인정보를 소중히 보호하며,{'\n'}
        안전한 서비스 제공을 위해 최선을 다합니다.
      </Text>
      <View style={styles.checkList}>
        <TouchableOpacity style={styles.checkRow} activeOpacity={0.7} onPress={onToggleTerms}>
          <View style={[styles.checkbox, agreedTerms && styles.checkboxChecked]}>
            {agreedTerms && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
          </View>
          <View style={styles.checkContent}>
            <Text style={styles.checkTitle}>이용약관</Text>
            <Text style={styles.checkDesc}>Travu 서비스 이용에 관한 약관입니다</Text>
          </View>
          <TouchableOpacity onPress={onOpenTerms} hitSlop={12}>
            <Ionicons name="chevron-forward" size={16} color={Colors.foundation.grey400} />
          </TouchableOpacity>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.checkRow} activeOpacity={0.7} onPress={onTogglePrivacy}>
          <View style={[styles.checkbox, agreedPrivacy && styles.checkboxChecked]}>
            {agreedPrivacy && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
          </View>
          <View style={styles.checkContent}>
            <Text style={styles.checkTitle}>개인정보 처리방침</Text>
            <Text style={styles.checkDesc}>회원님의 개인정보 처리에 관한 안내입니다.</Text>
          </View>
          <TouchableOpacity onPress={onOpenPrivacy} hitSlop={12}>
            <Ionicons name="chevron-forward" size={16} color={Colors.foundation.grey400} />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
      <SheetActionButton
        label="동의하고 시작하기"
        onPress={onAgree}
        active={canProceed}
        style={styles.agreeBtn}
      />
    </>
  );
}

function DetailContent({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  return (
    <>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
        <Ionicons name="close" size={20} color={Colors.foundation.black} />
      </TouchableOpacity>
      <Text style={styles.sheetTitle}>{title}</Text>
      <ScrollView style={styles.docScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.docText}>{body}</Text>
      </ScrollView>
      <SheetActionButton label="확인" onPress={onClose} style={styles.agreeBtn} />
    </>
  );
}

export default function AuthStartScreen() {
  const insets = useSafeAreaInsets();
  const {
    isAuthenticated,
    profile,
    profileStatus,
    setProfileSnapshot,
    signInWithApple,
    signInWithGoogle,
    signOut,
  } = useAuth();
  const [sheet, setSheet] = useState<SheetType>('none');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [ageError, setAgeError] = useState<string | null>(null);
  const [ageEligibilityConfirmed, setAgeEligibilityConfirmed] = useState(false);
  const [pendingAuthProvider, setPendingAuthProvider] = useState<AuthProviderName | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(true);
  const isConsentDismissalPendingRef = useRef(false);

  const canProceed = agreedTerms && agreedPrivacy;

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useEffect(() => {
    const shouldShowConsent = isAuthenticated
      && profileStatus === 'resolved'
      && profile?.onboarding_status === 'pending'
      && !(profile.terms_accepted_at && profile.privacy_accepted_at);

    if (shouldShowConsent && !isConsentDismissalPendingRef.current) {
      setAgreedTerms(false);
      setAgreedPrivacy(false);
      setSheet('consent');
    }
  }, [isAuthenticated, profile, profileStatus]);

  const beginSubmitting = () => {
    if (isSubmittingRef.current) {
      return false;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    return true;
  };

  const finishSubmitting = () => {
    isSubmittingRef.current = false;
    if (isMountedRef.current) {
      setIsSubmitting(false);
    }
  };

  const clearBirthDateInput = () => {
    setBirthYear('');
    setBirthMonth('');
    setBirthDay('');
  };

  const closeAgeSheet = () => {
    setSheet('none');
    setPendingAuthProvider(null);
    setAgeError(null);
    clearBirthDateInput();
  };

  const closeConsentSheet = () => {
    if (!beginSubmitting()) {
      return;
    }

    isConsentDismissalPendingRef.current = true;
    setSheet('none');
    setAgreedTerms(false);
    setAgreedPrivacy(false);

    void signOut().catch((error: unknown) => {
      console.warn('[auth-start] sign out after consent dismissal failed', error);
      if (isMountedRef.current) {
        isConsentDismissalPendingRef.current = false;
        setSheet('consent');
        Alert.alert(
          '로그인 상태를 정리하지 못했어요',
          '잠시 후 다시 시도해주세요.',
        );
      }
    }).finally(finishSubmitting);
  };

  const handleAgree = async () => {
    if (!canProceed || profile?.onboarding_status !== 'pending' || !beginSubmitting()) {
      return;
    }

    try {
      const nextProfile = await acceptRequiredLegalDocuments();
      setProfileSnapshot(nextProfile);
      setSheet('none');
    } catch (error) {
      console.warn('[auth-start] legal consent save failed', error);
      Alert.alert(
        '약관 동의를 저장하지 못했어요',
        '잠시 후 다시 시도해주세요.',
      );
    } finally {
      finishSubmitting();
    }
  };

  const executeProviderSignIn = async (provider: AuthProviderName) => {
    if (!beginSubmitting()) {
      return;
    }

    try {
      if (provider === 'apple' && Constants.appOwnership === 'expo') {
        Alert.alert(
          '개발 빌드가 필요해요',
          'Apple 로그인은 development build에서 테스트할 수 있어요.',
        );
        return;
      }

      const result = provider === 'google'
        ? await signInWithGoogle()
        : await signInWithApple();

      if (result.status !== 'authenticated') {
        return;
      }
    } catch (error) {
      console.warn(`[auth-start] ${provider} sign in failed`, error);
      Alert.alert(
        '\uB85C\uADF8\uC778\uC744 \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694.',
        '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
      );
    } finally {
      finishSubmitting();
    }
  };

  const handleProviderSignIn = (provider: AuthProviderName) => {
    if (!ageEligibilityConfirmed) {
      setPendingAuthProvider(provider);
      setAgeError(null);
      clearBirthDateInput();
      setSheet('age');
      return;
    }

    void executeProviderSignIn(provider);
  };

  const handleConfirmAge = () => {
    const eligibility = evaluateBirthDateEligibility(birthYear, birthMonth, birthDay);

    if (eligibility === 'invalid') {
      setAgeError('올바른 생년월일을 입력해주세요.');
      return;
    }

    clearBirthDateInput();

    if (eligibility === 'underage') {
      setAgeError('Travu는 만 14세 이상부터 이용할 수 있어요.');
      return;
    }

    const provider = pendingAuthProvider;
    setAgeEligibilityConfirmed(true);
    setPendingAuthProvider(null);
    setAgeError(null);
    setSheet('none');

    if (provider) {
      void executeProviderSignIn(provider);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── 메인 랜딩 ──────────────────────────────── */}
      <View style={styles.container}>
        {/* 로고 영역 — Figma: 상태바 하단 기준 218px */}
        <View style={styles.logoArea}>
          <Text style={styles.appLabel}>TRAVEL JOURNAL APP</Text>
          <Text style={styles.appTitle}>Travu</Text>
          <Text style={styles.appSubtitle}>여행의 순간을 기록하고 꺼내보세요</Text>
        </View>

        {/* 하단 버튼 영역 — Google 버튼 하단 64px */}
        <View style={styles.buttonArea}>
          <TouchableOpacity
            style={[styles.socialBtn, styles.appleBtn]}
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={() => handleProviderSignIn('apple')}
          >
            <Ionicons name="logo-apple" size={24} color="#FFFFFF" style={styles.appleIcon} />
            <Text style={[styles.socialLabel, styles.appleBtnLabel]}>Apple로 시작하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, styles.googleBtn]}
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={() => handleProviderSignIn('google')}
          >
            <View style={styles.googleIcon}>
              <GoogleLogo />
            </View>
            <Text style={[styles.socialLabel, styles.googleBtnLabel]}>Google로 시작하기</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 단일 Modal — 모든 시트를 하나의 Modal 안에서 처리 ── */}
      <SheetModal
        sheet={sheet}
        birthYear={birthYear}
        birthMonth={birthMonth}
        birthDay={birthDay}
        ageError={ageError}
        onChangeBirthYear={(value) => {
          setBirthYear(value);
          setAgeError(null);
        }}
        onChangeBirthMonth={(value) => {
          setBirthMonth(value);
          setAgeError(null);
        }}
        onChangeBirthDay={(value) => {
          setBirthDay(value);
          setAgeError(null);
        }}
        onConfirmAge={handleConfirmAge}
        onCloseAge={closeAgeSheet}
        onClose={closeConsentSheet}
        onOpenTerms={() => setSheet('terms')}
        onOpenPrivacy={() => setSheet('privacy')}
        onBackToConsent={() => setSheet('consent')}
        onAgree={handleAgree}
        agreedTerms={agreedTerms}
        agreedPrivacy={agreedPrivacy}
        onToggleTerms={() => setAgreedTerms(v => !v)}
        onTogglePrivacy={() => setAgreedPrivacy(v => !v)}
        canProceed={canProceed && !isSubmitting}
        paddingBottom={insets.bottom + 16}
      />
    </SafeAreaView>
  );
}

// ── 스타일 ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.warm.white,  // #F9F5F3
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // ── 로고 영역 — 상단~버튼 사이 flex 영역에서 수직 중앙 정렬 (원본 레이아웃)
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  appLabel: {
    ...Typography.captionSmall,
    lineHeight: 14,
    letterSpacing: 4,
    color: '#857B70',
    textAlign: 'center',
  },
  appTitle: {
    fontFamily: FontFamily.pretendardBold,
    fontSize: 56,
    lineHeight: 68,
    color: Colors.foundation.black,
    textAlign: 'center',
    marginTop: 4,
  },
  appSubtitle: {
    ...Typography.body2Regular,
    fontFamily: FontFamily.notoSerifKRMedium,
    color: '#292B2C',
    textAlign: 'center',
    marginTop: 4,
  },

  // ── 버튼 영역 ── (Figma: L+R, h:48 r:8, gap 8, Google 버튼 하단 64px)
  buttonArea: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 35,
    paddingBottom: 64,
  },
  socialBtn: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleIcon: {
    position: 'absolute',
    left: 79,
  },
  googleIcon: {
    position: 'absolute',
    left: 82,
  },
  appleBtn: {
    backgroundColor: Colors.foundation.black,
  },
  googleBtn: {
    backgroundColor: Colors.foundation.white,
    borderWidth: 1,
    borderColor: Colors.warm.beige,        // #E3DBD8
  },
  socialLabel: {
    ...Typography.body2Regular,
    fontFamily: FontFamily.pretendardMedium,
    textAlign: 'center',
  },
  appleBtnLabel: {
    color: Colors.foundation.white,
  },
  googleBtnLabel: {
    color: Colors.foundation.black,
  },

  // ── 모달 공통 ──
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dimmedBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.light.bgOverlay,
  },

  // ── 바텀시트 공통 ── (Figma: borderRadius 24)
  bottomSheet: {
    backgroundColor: Colors.foundation.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  bottomSheetTall: {
    height: '75%',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 4,
    marginTop: -8,
  },

  // ── 약관 동의 시트 ──
  sheetTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
    marginTop: -8,
    textAlign: 'center',
  },
  sheetDesc: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
    marginTop: -4,
    textAlign: 'center',
  },
  birthDateInputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  birthDateFieldWide: {
    flex: 1.35,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  birthDateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  birthDateInput: {
    ...Typography.body1Regular,
    flex: 1,
    minWidth: 0,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
    borderRadius: Radius.sm,
    color: Colors.foundation.black,
    textAlign: 'center',
    paddingHorizontal: Spacing.xs,
  },
  birthDateUnit: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
    flexShrink: 0,
  },
  ageError: {
    ...Typography.captionRegular,
    color: '#D13434',
    textAlign: 'center',
    marginTop: -Spacing.sm,
  },
  checkList: {
    gap: 0,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.foundation.grey300,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.foundation.black,
    borderColor: Colors.foundation.black,
  },
  checkContent: {
    flex: 1,
    gap: 2,
  },
  checkTitle: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  checkDesc: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.borderStrong,
    marginHorizontal: -20,
  },
  agreeBtn: {
    width: '100%',
    alignSelf: 'stretch',
    marginTop: 4,
  },

  // ── 약관 상세 시트 ──
  docScroll: {
    flex: 1,
    marginTop: -8,
  },
  docText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
    paddingBottom: 8,
  },
});
