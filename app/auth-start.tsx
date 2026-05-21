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
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SheetActionButton from '@/components/common/SheetActionButton';
import { Colors, FontFamily, Typography } from '@/constants/theme';

type SheetType = 'none' | 'terms' | 'privacy' | 'consent';

/** Figma devicon:google 4색 G 로고 근사 구현 */
function GoogleLogo() {
  return (
    <View style={googleStyles.wrap}>
      <View style={[googleStyles.arcOuter, googleStyles.arcRed]} />
      <View style={[googleStyles.arcOuter, googleStyles.arcBlue]} />
      <View style={googleStyles.inner} />
      <View style={googleStyles.bar} />
      <Text style={googleStyles.g}>G</Text>
    </View>
  );
}

const googleStyles = StyleSheet.create({
  wrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcOuter: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
  },
  arcRed:  { borderColor: '#E33629' },
  arcBlue: { borderColor: '#4285F4', borderTopColor: 'transparent', borderLeftColor: 'transparent' },
  inner: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.foundation.white,
  },
  bar: {
    position: 'absolute',
    right: 0,
    top: 5,
    width: 7,
    height: 3,
    backgroundColor: '#4285F4',
  },
  g: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4285F4',
    lineHeight: 11,
  },
});

export default function AuthStartScreen() {
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<SheetType>('none');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [agreedPrivacy, setAgreedPrivacy] = useState(true);

  const canProceed = agreedTerms && agreedPrivacy;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── 메인 랜딩 ──────────────────────────────── */}
      <View style={styles.container}>
        {/* 중앙 로고 영역 */}
        <View style={styles.logoArea}>
          <Text style={styles.appLabel}>TRAVEL JOURNAL APP</Text>
          <Text style={styles.appTitle}>Travu</Text>
          <Text style={styles.appSubtitle}>여행의 순간을 기록하고 꺼내보세요</Text>
        </View>

        {/* 하단 버튼 영역 */}
        <View style={[styles.buttonArea, { paddingBottom: insets.bottom + 32 }]}>
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

      {/* ── 약관 동의 바텀시트 (821:966) ──────────── */}
      <Modal
        visible={sheet === 'consent'}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet('none')}
      >
        <View style={styles.modalWrapper}>
          <Pressable style={styles.dimmed} onPress={() => setSheet('none')} />
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSheet('none')} hitSlop={12}>
              <Ionicons name="close" size={20} color={Colors.foundation.black} />
            </TouchableOpacity>

            <Text style={styles.sheetTitle}>이용약관 및 개인정보 처리방침</Text>
            <Text style={styles.sheetDesc}>
              Travu는 회원님의 개인정보를 소중히 보호하며,{'\n'}
              안전한 서비스 제공을 위해 최선을 다합니다.
            </Text>

            <View style={styles.checkList}>
              <TouchableOpacity
                style={styles.checkRow}
                activeOpacity={0.7}
                onPress={() => setAgreedTerms(v => !v)}
              >
                <View style={[styles.checkbox, agreedTerms && styles.checkboxChecked]}>
                  {agreedTerms && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
                <View style={styles.checkContent}>
                  <Text style={styles.checkTitle}>이용약관</Text>
                  <Text style={styles.checkDesc}>Travu 서비스 이용에 관한 약관입니다</Text>
                </View>
                <TouchableOpacity onPress={() => setSheet('terms')} hitSlop={12}>
                  <Ionicons name="chevron-forward" size={16} color={Colors.foundation.grey400} />
                </TouchableOpacity>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.checkRow}
                activeOpacity={0.7}
                onPress={() => setAgreedPrivacy(v => !v)}
              >
                <View style={[styles.checkbox, agreedPrivacy && styles.checkboxChecked]}>
                  {agreedPrivacy && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
                <View style={styles.checkContent}>
                  <Text style={styles.checkTitle}>개인정보 처리방침</Text>
                  <Text style={styles.checkDesc}>회원님의 개인정보 처리에 관한 안내입니다.</Text>
                </View>
                <TouchableOpacity onPress={() => setSheet('privacy')} hitSlop={12}>
                  <Ionicons name="chevron-forward" size={16} color={Colors.foundation.grey400} />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>

            <SheetActionButton
              label="동의하고 시작하기"
              onPress={() => setSheet('none')}
              active={canProceed}
              style={styles.agreeBtn}
            />
          </View>
        </View>
      </Modal>

      {/* ── 이용약관 상세 시트 (821:1033) ─────────── */}
      <Modal
        visible={sheet === 'terms'}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet('consent')}
      >
        <View style={styles.modalWrapper}>
          <Pressable style={styles.dimmed} onPress={() => setSheet('consent')} />
          <View style={[styles.bottomSheet, styles.bottomSheetTall, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSheet('consent')} hitSlop={12}>
              <Ionicons name="close" size={20} color={Colors.foundation.black} />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>이용약관</Text>
            <ScrollView style={styles.docScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.docText}>{TERMS_TEXT}</Text>
            </ScrollView>
            <SheetActionButton
              label="확인"
              onPress={() => setSheet('consent')}
              style={styles.agreeBtn}
            />
          </View>
        </View>
      </Modal>

      {/* ── 개인정보 처리방침 상세 시트 (821:1082) ── */}
      <Modal
        visible={sheet === 'privacy'}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet('consent')}
      >
        <View style={styles.modalWrapper}>
          <Pressable style={styles.dimmed} onPress={() => setSheet('consent')} />
          <View style={[styles.bottomSheet, styles.bottomSheetTall, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSheet('consent')} hitSlop={12}>
              <Ionicons name="close" size={20} color={Colors.foundation.black} />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>개인정보 처리방침</Text>
            <ScrollView style={styles.docScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.docText}>{PRIVACY_TEXT}</Text>
            </ScrollView>
            <SheetActionButton
              label="확인"
              onPress={() => setSheet('consent')}
              style={styles.agreeBtn}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── 약관 텍스트 ──────────────────────────────────────────────────────────────
// ※ 참고용 초안입니다. 법률 자문이 아니며, 실서비스 배포 전 반드시 변호사 검토가 필요합니다.
// ※ 개인정보보호법 §30 법정 필수 11개 항목 기준 작성 (2026.9.11 시행 개정법 반영 기준)

const TERMS_TEXT = `이용약관

시행일: 2026년 __월 __일

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

const PRIVACY_TEXT = `개인정보처리방침

시행일: 2026년 __월 __일

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

  // ── 로고 영역 ──
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  appLabel: {
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 4,
    color: '#857B70',                      // Figma: rgba(133,123,112)
    textAlign: 'center',
  },
  appTitle: {
    fontFamily: FontFamily.pretendardBold, // Pretendard 700 (NOT SansitaSwashed)
    fontSize: 56,
    lineHeight: 68,
    fontWeight: '700',
    color: Colors.foundation.black,
    textAlign: 'center',
    marginTop: 4,
  },
  appSubtitle: {
    fontFamily: FontFamily.notoSerifKR,    // Noto Serif CJK KR 14/500
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#292B2C',                      // Figma: rgba(41,43,44) — 거의 검정
    textAlign: 'center',
    marginTop: 4,
  },

  // ── 버튼 영역 ── (Figma: w:320 h:48 r:8)
  buttonArea: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
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
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
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
  dimmed: {
    flex: 1,
    backgroundColor: Colors.light.bgOverlay,
  },

  // ── 바텀시트 공통 ──
  bottomSheet: {
    backgroundColor: Colors.foundation.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  },
  sheetDesc: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
    lineHeight: 18,
    marginTop: -4,
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
    lineHeight: 22,
    paddingBottom: 8,
  },
});
