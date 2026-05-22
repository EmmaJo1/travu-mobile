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
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '@/components/common/AppText';

import { Path, Svg } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SheetActionButton from '@/components/common/SheetActionButton';
import { Colors, FontFamily, Typography } from '@/constants/theme';

type SheetType = 'none' | 'terms' | 'privacy' | 'consent';

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

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalWrapper}>
        <Animated.View style={[styles.dimmedBase, { opacity: dimOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomSheet,
            isTall && styles.bottomSheetTall,
            { paddingBottom, transform: [{ translateY: sheetTransY }] },
          ]}
        >
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
              title="이용약관"
              body={TERMS_TEXT}
              onClose={onBackToConsent}
            />
          )}
          {sheet === 'privacy' && (
            <DetailContent
              title="개인정보 처리방침"
              body={PRIVACY_TEXT}
              onClose={onBackToConsent}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
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
  const [sheet, setSheet] = useState<SheetType>('none');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [agreedPrivacy, setAgreedPrivacy] = useState(true);

  const canProceed = agreedTerms && agreedPrivacy;

  const handleAgree = () => {
    if (!canProceed) return;
    setSheet('none');
    router.replace('/(tabs)');
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
            onPress={() => setSheet('consent')}
          >
            <Ionicons name="logo-apple" size={22} color="#FFFFFF" style={styles.socialIcon} />
            <Text style={[styles.socialLabel, styles.appleBtnLabel]}>Apple로 시작하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, styles.googleBtn]}
            activeOpacity={0.85}
            onPress={() => setSheet('consent')}
          >
            <View style={styles.socialIcon}>
              <GoogleLogo />
            </View>
            <Text style={[styles.socialLabel, styles.googleBtnLabel]}>Google로 시작하기</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 단일 Modal — 모든 시트를 하나의 Modal 안에서 처리 ── */}
      <SheetModal
        sheet={sheet}
        onClose={() => setSheet('none')}
        onOpenTerms={() => setSheet('terms')}
        onOpenPrivacy={() => setSheet('privacy')}
        onBackToConsent={() => setSheet('consent')}
        onAgree={handleAgree}
        agreedTerms={agreedTerms}
        agreedPrivacy={agreedPrivacy}
        onToggleTerms={() => setAgreedTerms(v => !v)}
        onTogglePrivacy={() => setAgreedPrivacy(v => !v)}
        canProceed={canProceed}
        paddingBottom={insets.bottom + 16}
      />
    </SafeAreaView>
  );
}

// ── 약관 텍스트 ──────────────────────────────────────────────────────────────
// ※ 참고용 초안입니다. 법률 자문이 아니며, 실서비스 배포 전 반드시 변호사 검토가 필요합니다.
// ※ 개인정보보호법 §30 법정 필수 11개 항목 기준 작성 (2026.9.11 시행 개정법 반영 기준)

const TERMS_TEXT = `시행일: 2026년 __월 __일

제1조 (목적)
이 약관은 Travu(이하 "서비스")를 이용함에 있어 운영자와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
① "서비스"란 운영자가 제공하는 여행 기록 모바일 애플리케이션 및 관련 서비스를 의미합니다.
② "회원"이란 서비스에 가입하여 이용하는 자를 의미합니다.
③ "콘텐츠"란 회원이 서비스 내에 업로드하는 사진, 텍스트, 기록 등 일체의 자료를 의미합니다.

제3조 (약관의 효력 및 변경)
① 이 약관은 서비스를 이용하는 모든 회원에게 적용됩니다.
② 운영자는 합리적인 사유가 발생할 경우 약관을 변경할 수 있으며, 변경 내용은 서비스 내 공지사항을 통해 7일 전 고지합니다.
③ 회원이 변경된 약관에 동의하지 않을 경우 서비스를 탈퇴할 수 있습니다.

제4조 (서비스의 제공)
① 운영자는 다음과 같은 서비스를 제공합니다.
  1. 여행 기록 작성 및 관리
  2. 여행 사진 저장 및 정리
  3. 여행 통계 및 요약 제공
② 운영자는 시스템 점검·서비스 개선 등의 이유로 서비스를 일시 중단할 수 있으며, 사전에 공지합니다.

제5조 (회원 가입 및 탈퇴)
① 회원 가입은 Apple 또는 Google 소셜 로그인을 통해 이루어집니다.
② 만 14세 미만은 서비스를 이용할 수 없습니다.
③ 회원은 언제든지 앱 내 설정을 통해 탈퇴할 수 있으며, 탈퇴 시 관련 법령에서 정한 경우를 제외하고 개인정보 및 콘텐츠는 삭제됩니다.

제6조 (회원의 의무)
회원은 다음 행위를 해서는 안 됩니다.
  1. 타인의 개인정보·저작권을 침해하는 콘텐츠 업로드
  2. 운영자의 사전 동의 없는 영리 목적 이용
  3. 서비스의 정상적인 운영을 방해하는 행위
  4. 기타 관련 법령에 위반되는 행위

제7조 (콘텐츠의 권리)
① 회원이 업로드한 콘텐츠의 저작권은 해당 회원에게 귀속됩니다.
② 회원은 운영자에게 서비스 운영 및 개선 목적에 한하여 콘텐츠를 이용할 수 있는 비독점적 라이선스를 부여합니다.

제8조 (서비스 이용 제한)
운영자는 회원이 약관을 위반하거나 서비스의 정상 운영을 방해할 경우, 경고·일시 정지·영구 이용 중지 등의 조치를 취할 수 있습니다.

제9조 (손해배상 및 면책)
① 운영자는 무료로 제공되는 서비스와 관련하여 회원에게 발생한 손해에 대해 책임을 지지 않습니다.
② 천재지변, 서버 장애 등 불가항력으로 인한 서비스 중단의 경우 책임이 면제됩니다.
③ 회원이 업로드한 콘텐츠로 인해 발생하는 분쟁에 대해 운영자는 책임을 지지 않습니다.

제10조 (준거법 및 관할법원)
① 이 약관의 해석 및 분쟁 해결은 대한민국 법령에 따릅니다.
② 서비스 이용으로 발생한 분쟁의 관할법원은 운영자 소재지를 관할하는 법원으로 합니다.

부칙
본 약관은 2026년 __월 __일부터 시행됩니다.`;

const PRIVACY_TEXT = `시행일: 2026년 __월 __일

Travu(이하 "서비스")는 개인정보보호법 제30조에 따라 정보주체의 개인정보를 보호하고 관련 고충을 신속히 처리할 수 있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.

제1조 (개인정보의 처리 목적)
서비스는 다음의 목적을 위해 개인정보를 처리합니다.
  1. 회원 가입 및 관리: 회원 자격 확인·유지, 서비스 부정이용 방지
  2. 서비스 제공: 여행 사진·기록 저장 및 관리, 여행 통계 산출
  3. 고객 지원: 문의 처리, 공지사항 전달

제2조 (처리하는 개인정보의 항목)
① 소셜 로그인 시 수집
  - Apple/Google 소셜 고유 식별자(UID), 이메일 주소, 프로필 이름
② 서비스 이용 시 수집
  - 사진: 사용자가 직접 업로드한 여행 사진 및 EXIF 메타데이터(촬영 날짜·위치)
  - 위치 정보: 사용자 동의 후 여행 장소 기록 시 수집되는 GPS 좌표
  - 텍스트 기록: 여행 메모, 감상 등 사용자가 직접 입력한 데이터
③ 자동 수집
  - 기기 정보(OS 종류·버전, 앱 버전), 서비스 이용 기록, 접속 로그

제3조 (개인정보의 처리 및 보유 기간)
  - 회원 정보: 회원 탈퇴 시까지
  - 여행 기록 및 사진: 회원 탈퇴 후 30일 이내 파기
  - 서비스 이용 로그: 1년
  ※ 관련 법령에 따라 보존 의무가 있는 경우 해당 기간 동안 보관됩니다.

제4조 (개인정보의 제3자 제공)
서비스는 정보주체의 개인정보를 제1조에서 명시한 목적 범위를 초과하여 제3자에게 제공하지 않습니다. 단, 정보주체의 별도 동의가 있거나 법령에 의한 경우는 예외입니다.

제5조 (개인정보 처리 위탁 및 국외 이전)
서비스는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다.

  수탁사: Supabase, Inc. / 소재지: 미국
  위탁 업무: 데이터베이스 저장·관리, 사용자 인증
  보유 기간: 회원 탈퇴 시까지

  수탁사: Apple Inc. / 소재지: 미국
  위탁 업무: 소셜 로그인 인증
  보유 기간: 인증 세션 종료 시

  수탁사: Google LLC / 소재지: 미국
  위탁 업무: 소셜 로그인 인증
  보유 기간: 인증 세션 종료 시

※ 위 수탁사들은 국외 소재로, 개인정보보호법 제28조의8에 따라 국외 이전에 대한 동의를 받고 있습니다.
※ 서비스 운영에 필요한 추가 수탁사가 발생할 경우 본 방침을 통해 사전 공지합니다.

제6조 (정보주체의 권리·의무 및 행사방법)
① 정보주체는 언제든지 다음의 권리를 행사할 수 있습니다.
  1. 개인정보 열람 요구
  2. 오류 정정 요구
  3. 삭제 요구
  4. 처리 정지 요구
② 권리 행사는 앱 내 설정 또는 개인정보 보호책임자에게 이메일로 요청하시면 지체없이 조치합니다.

제7조 (개인정보의 파기)
① 보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체없이 파기합니다.
② 전자적 파일은 복구·재생이 불가능한 기술적 방법으로 삭제합니다.

제8조 (개인정보 보호책임자)
  - 성명: 추후 지정 예정
  - 연락처: 추후 공개 예정
  ※ 개인정보 관련 문의, 불만 처리, 피해 구제 등은 위 담당자에게 연락해 주십시오.

제9조 (개인정보의 안전성 확보 조치)
서비스는 개인정보보호법 제29조에 따라 다음의 조치를 시행합니다.
  1. 개인정보에 대한 접근 제한 및 접근권한 최소화
  2. 전송 구간 암호화 (SSL/TLS)
  3. Supabase Row Level Security(RLS)를 활용한 데이터 접근 통제

제10조 (개인정보 자동수집 장치의 설치·운영 및 거부)
서비스는 서비스 품질 개선을 위해 앱 내 이용 정보를 자동으로 수집합니다. 기기 설정에서 앱의 위치 정보·사진 접근 권한을 거부할 수 있으며, 이 경우 일부 기능 이용이 제한될 수 있습니다.

제11조 (개인정보처리방침 변경)
이 방침은 시행일로부터 적용되며, 내용 변경 시 변경 7일 전에 앱 공지사항을 통해 고지합니다.

부칙
본 방침은 2026년 __월 __일부터 시행됩니다.`;

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

  // ── 버튼 영역 ── (Figma: w:320 h:48 r:8, gap 8, Google 버튼 하단 64px)
  buttonArea: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 64,
  },
  socialBtn: {
    width: 320,
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    position: 'absolute',
    left: 16,
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
