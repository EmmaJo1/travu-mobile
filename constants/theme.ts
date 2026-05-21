/**
 * Travu Design Tokens
 *
 * Source: Figma "Travu" — 01_MVP Screens · 02_System & Components
 * https://www.figma.com/design/EfragPmsgNBJnt5wFEOAkB/Travu
 *
 * 컴포넌트 이름은 Figma Section 3 확정 기준 PascalCase를 사용합니다.
 * 이 파일은 MVP 구현에 필요한 최소 토큰만 정의합니다.
 * Figma에서 확인되지 않은 값은 TODO 주석으로 표시합니다.
 *
 * 업데이트: 2026-05-16
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

/** Foundation palette — 02_System & Components 기준 */
const foundation = {
  black:    '#000000',
  white:    '#FFFFFF',
  grey100:  '#DBDBDB',  // 구분선, 비활성 배경
  grey300:  '#A8A8A8',  // 보조 텍스트 (lighter)
  grey400:  '#979797',  // 보조 아이콘
  grey500:  '#7D7D7D',  // 플레이스홀더
  grey600:  '#727272',  // 날짜·보조 정보
  grey800:  '#454545',  // 강조 보조 텍스트
} as const;

/** Warm palette — 홈/상세 화면 전용 */
const warm = {
  white:    '#F9F5F3',  // 스크린 배경
  beige:    '#E3DBD8',  // 버튼 테두리(off), 구분선
  grey:     '#A29C9A',  // 비활성 버튼 텍스트
  dark:     '#565252',  // 어두운 warm 텍스트
} as const;

export const Colors = {
  /** Light 모드 — 현재 Figma에서 확인된 단일 모드 */
  light: {
    // Semantic
    bgScreen:       warm.white,         // #F9F5F3 — 대부분의 화면 배경
    bgCard:         foundation.white,   // #FFFFFF — 카드·모달 배경
    bgOverlay:      'rgba(141, 141, 141, 0.50)', // 모달 딤
    bgGlass:        'rgba(255, 255, 255, 0.60)', // 사진 위 반투명 뱃지

    textPrimary:    foundation.black,   // #000000
    textSecondary:  foundation.grey600, // #727272 — 날짜, 부제목
    textPlaceholder:foundation.grey500, // #7D7D7D
    textDisabled:   warm.grey,          // #A29C9A — 비활성 버튼

    borderDefault:  warm.beige,         // #E3DBD8
    borderStrong:   foundation.grey100, // #DBDBDB — 구분선

    // 하위 호환 (기존 ThemedText/ThemedView에서 사용)
    text:           foundation.black,
    background:     warm.white,
    tint:           foundation.black,
    icon:           foundation.grey500,
    tabIconDefault: foundation.grey500,
    tabIconSelected:foundation.black,
  },

  /**
   * Dark 모드
   * TODO: Figma에서 다크 모드 프레임이 확인되지 않음.
   *       아래 값은 임시 placeholder입니다. 확정 전까지 사용하지 마세요.
   */
  dark: {
    bgScreen:       '#1A1816',
    bgCard:         '#2A2724',
    bgOverlay:      'rgba(0, 0, 0, 0.70)',
    bgGlass:        'rgba(0, 0, 0, 0.50)',

    textPrimary:    '#F0EDEA',
    textSecondary:  '#9A9694',
    textPlaceholder:'#6A6664',
    textDisabled:   '#5A5856',

    borderDefault:  '#3A3634',
    borderStrong:   '#4A4846',

    text:           '#F0EDEA',
    background:     '#1A1816',
    tint:           '#F0EDEA',
    icon:           '#9A9694',
    tabIconDefault: '#9A9694',
    tabIconSelected:'#F0EDEA',
  },

  /** 원시 팔레트 (컴포넌트 내부 참조용) */
  foundation,
  warm,
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/**
 * 폰트 패밀리
 * - Pretendard: UI·본문 (expo-font로 로드 필요)
 * - NotoSerifKR: 대시보드 강조 전용 (지연 로드 가능)
 */
export const FontFamily = Platform.select({
  ios: {
    pretendard:         'Pretendard-Regular',
    pretendardMedium:   'Pretendard-Medium',
    pretendardSemiBold: 'Pretendard-SemiBold',
    pretendardBold:     'Pretendard-Bold',
    notoSerifKR:        'NotoSerifKR-Regular',
    notoSerifKRBold:    'NotoSerifKR-Bold',
    notoSerifKRBlack:   'NotoSerifKR-Black',
    prata:              'Prata-Regular',
    pointEN:            'SansitaSwashed-Bold',
  },
  default: {
    pretendard:         'Pretendard-Regular',
    pretendardMedium:   'Pretendard-Medium',
    pretendardSemiBold: 'Pretendard-SemiBold',
    pretendardBold:     'Pretendard-Bold',
    notoSerifKR:        'NotoSerifKR-Regular',
    notoSerifKRBold:    'NotoSerifKR-Bold',
    notoSerifKRBlack:   'NotoSerifKR-Black',
    prata:              'Prata-Regular',
    pointEN:            'SansitaSwashed-Bold',
  },
}) ?? {
  pretendard:         'Pretendard-Regular',
  pretendardMedium:   'Pretendard-Medium',
  pretendardSemiBold: 'Pretendard-SemiBold',
  pretendardBold:     'Pretendard-Bold',
  notoSerifKR:        'NotoSerifKR-Regular',
  notoSerifKRBold:    'NotoSerifKR-Bold',
  notoSerifKRBlack:   'NotoSerifKR-Black',
  prata:              'Prata-Regular',
  pointEN:            'SansitaSwashed-Bold',
};

/** Pretendard 타입 스케일 */
export const Typography = {
  title1: {
    fontFamily:  FontFamily.pretendardSemiBold,
    fontSize:    28,
    lineHeight:  40,
    fontWeight:  '600' as const,
  },
  title2: {
    fontFamily:  FontFamily.pretendardSemiBold,
    fontSize:    18,
    lineHeight:  24,
    fontWeight:  '600' as const,
  },
  body1Emphasized: {
    fontFamily:  FontFamily.pretendardMedium,
    fontSize:    16,
    lineHeight:  22,
    fontWeight:  '500' as const,
  },
  body1Regular: {
    fontFamily:  FontFamily.pretendard,
    fontSize:    16,
    lineHeight:  22,
    fontWeight:  '400' as const,
  },
  body2Emphasized: {
    fontFamily:  FontFamily.pretendardSemiBold,
    fontSize:    14,
    lineHeight:  20,
    fontWeight:  '600' as const,
  },
  body2Regular: {
    fontFamily:  FontFamily.pretendard,
    fontSize:    14,
    lineHeight:  20,
    fontWeight:  '400' as const,
  },
  captionRegular: {
    fontFamily:  FontFamily.pretendard,
    fontSize:    12,
    lineHeight:  16,
    fontWeight:  '400' as const,
  },
  captionEmphasized: {
    fontFamily:  FontFamily.pretendardMedium,
    fontSize:    12,
    lineHeight:  16,
    fontWeight:  '500' as const,
  },
  captionSmall: {
    fontFamily:  FontFamily.pretendardMedium,
    fontSize:    10,
    lineHeight:  12,
    fontWeight:  '500' as const,
  },
  /** Noto Serif KR — 대시보드 전용 */
  dashboardNum: {
    fontFamily:  FontFamily.notoSerifKRBlack,
    fontSize:    20,
    lineHeight:  24,
    fontWeight:  '900' as const,
  },
  dashboardEmphasis: {
    fontFamily:  FontFamily.notoSerifKRBold,
    fontSize:    16,
    lineHeight:  24,
    fontWeight:  '700' as const,
  },
  dashboardText: {
    fontFamily:  FontFamily.notoSerifKR,
    fontSize:    16,
    lineHeight:  24,
    fontWeight:  '400' as const,
  },
  /** TripListCard / Mypage 제목 전용 — Prata 14/400/18 */
  tripListTitle: {
    fontFamily:  FontFamily.prata,
    fontSize:    14,
    lineHeight:  18,
    fontWeight:  '400' as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

/** 4px 그리드 기반. screenPaddingH = xl(20) */
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,   // screenPaddingH — 화면 수평 패딩
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------

export const Radius = {
  xs:   4,    // 썸네일 이미지
  sm:   8,    // 카드, 버튼, 태그
  lg:   16,   // 모달/시트, 대형 버튼
  full: 100,  // pill 뱃지
} as const;

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

/**
 * React Native 그림자 스타일.
 * iOS: shadow* 속성 / Android: elevation
 * boxShadow 원본 값은 주석으로 유지합니다.
 */
export const Shadows = {
  /** 일반 카드: 0px 0px 16px 0px rgba(0,0,0,0.10) */
  card: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.10,
    shadowRadius:  8,
    elevation:     3,
  },
  /** 소형 요소: 0px 0px 4px 0px rgba(0,0,0,0.25) */
  cardSmall: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius:  2,
    elevation:     2,
  },
  /** 플로팅 버튼: 0px 4px 4px 0px rgba(0,0,0,0.25) */
  floating: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius:  2,
    elevation:     4,
  },
  /** 모달 시트: 4px 4px 24px 0px rgba(0,0,0,0.12) */
  modal: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 4, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius:  12,
    elevation:     8,
  },
  /** 사이드 패널: 8px 0px 16px 0px rgba(0,0,0,0.16) */
  sidebar: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 8, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius:  8,
    elevation:     5,
  },
} as const;

// ---------------------------------------------------------------------------
// Component Tokens
// ---------------------------------------------------------------------------
// Figma Section 3 확정 컴포넌트 이름 기준.
// 각 항목은 위에서 정의된 토큰(Spacing, Radius, Colors 등)을 참조한다.
// 미확인 값은 TODO 주석으로 표시한다.

export const ComponentTokens = {
  // ── Buttons ──────────────────────────────────────────────────────────────

  /** PrimaryButton: 일반 CTA 버튼 */
  PrimaryButton: {
    height:          40,
    borderRadius:    Radius.sm,          // 8
    backgroundColor: Colors.foundation.black,
    textColor:       Colors.foundation.white,
    // TODO: disabled 상태 backgroundColor / textColor Figma 확인 필요
  },

  /** AuthActionButton: 로그인·회원가입 화면 전용 액션 버튼 */
  AuthActionButton: {
    borderRadius: Radius.sm,             // 8
    // TODO: 높이, 배경색, 텍스트 색상 Figma Section 3 확인 필요
  },

  /** SheetActionButton: 바텀시트 내부 전체 너비 버튼 */
  SheetActionButton: {
    borderRadius: Radius.sm,             // 8
    // TODO: 높이 및 배경색 Figma Section 3 확인 필요
  },

  // ── Cards ─────────────────────────────────────────────────────────────────

  /** TripCard: 저장된 여행 또는 대표 여행 카드 */
  TripCard: {
    thumbnailWidth:  140,
    thumbnailHeight: 110,
    thumbnailRadius: Radius.xs,          // 4
    infoGap:         Spacing.md,         // 12
    badgeHeight:     52,
    badgeRadius:     Radius.sm,          // 8
    badgeBackground: Colors.foundation.white,
  },

  /** TripListCard: 리스트형/소형 여행 카드 */
  TripListCard: {
    thumbnailWidth:  80,
    thumbnailHeight: 60,
    thumbnailRadius: Radius.xs,          // 4
    // TODO: 카드 전체 높이·padding Figma Section 3 확인 필요
  },

  /** DayCard: Day 1, Day 2 같은 하루 선택 카드 */
  DayCard: {
    // TODO: 크기·padding·선택 상태 스타일 Figma Section 3 확인 필요
  },

  /** PlaceEntryCard: day-record 화면 안의 장소별 기록 카드 */
  PlaceEntryCard: {
    // TODO: padding·radius Figma Section 3 확인 필요
  },

  /** ReflectionCard: 따옴표 아이콘 + 성찰 기록 카드 */
  ReflectionCard: {
    // TODO: padding·radius Figma Section 3 확인 필요
  },

  /** QuestionCard: 질문 카드 */
  QuestionCard: {
    // TODO: 크기·padding·radius Figma Section 3 확인 필요
  },

  /** TodaySummary: 오늘 요약 컴포넌트 */
  TodaySummary: {
    // TODO: 레이아웃·padding Figma Section 3 확인 필요
  },

  /** TravelStatsCard: 여행 통계 카드 (Noto Serif KR 사용) */
  TravelStatsCard: {
    // TODO: 크기·padding Figma Section 3 확인 필요
  },

  // ── Navigation / Headers ─────────────────────────────────────────────────

  /** BottomTabBar: 앱 하단 탭 내비게이션 */
  BottomTabBar: {
    // TODO: 높이 및 safe area 처리 기준 Figma Section 3 확인 필요
  },

  /** ScreenHeader: 화면 상단 헤더 */
  ScreenHeader: {
    // TODO: 높이·백버튼 스타일 Figma Section 3 확인 필요
  },

  /** MyPageTabs: 마이페이지 내부 탭 */
  MyPageTabs: {
    // TODO: 탭 인디케이터 색상·두께 Figma Section 3 확인 필요
  },

  /** ProfileSummary: 프로필 요약 컴포넌트 */
  ProfileSummary: {
    // TODO: 레이아웃·padding Figma Section 3 확인 필요
  },

  /** DateBadge: 날짜 뱃지 */
  DateBadge: {
    borderRadius:    Radius.full,        // 100 — pill 형태
    backgroundColor: Colors.warm.white,  // #F9F5F3
    // TODO: 높이·padding Figma Section 3 확인 필요
  },
} as const;

// ---------------------------------------------------------------------------
// Legacy export (기존 constants/theme.ts 호환)
// ---------------------------------------------------------------------------

/**
 * 기존 useThemeColor 훅에서 사용하던 Fonts export.
 * 신규 코드에서는 FontFamily를 사용하세요.
 */
export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
