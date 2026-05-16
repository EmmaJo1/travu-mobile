# Travu — MVP Design System

> Figma 소스: [Travu](https://www.figma.com/design/EfragPmsgNBJnt5wFEOAkB/Travu)  
> 페이지: `01_MVP Screens` · `02_System & Components`  
> 목적: Expo React Native MVP 구현에 필요한 최소 디자인 기준  
> 업데이트: 2026-05-15

---

## 1. Design Direction

Travu는 **따뜻하고 차분한 photo-first 모바일 여행 기록 앱**이다.

- **Tone**: 차분한 웜-뉴트럴. 채도 높은 포인트 컬러 없음.
- **Typography role**: Pretendard(UI/본문) + Noto Serif KR(대시보드 강조). 세리프는 "여행 기록" 감성 연출에만 제한적으로 사용.
- **Photo-first**: 사진이 콘텐츠 주인공. 텍스트와 UI는 사진을 보조하는 역할.
- **Density**: 여백이 넓고 카드 기반. 정보 밀도 낮음.

---

## 2. Color System

### Foundation Palette (02_System & Components 기준)

| 토큰                        | HEX        | 용도                               |
| --------------------------- | ---------- | ---------------------------------- |
| `Foundation/Black`          | `#000000`  | 기본 텍스트, 아이콘                |
| `Foundation/White`          | `#FFFFFF`  | 카드 배경, 모달 배경               |
| `Foundation/Grey/grey-100`  | `#DBDBDB`  | 구분선, 비활성 배경                |
| `Foundation/Grey/grey-300`  | `#A8A8A8`  | 보조 텍스트 (lighter)              |
| `Foundation/Grey/grey-400`  | `#979797`  | 보조 아이콘                        |
| `Foundation/Grey/grey-500`  | `#7D7D7D`  | 플레이스홀더, 보조 텍스트          |
| `Foundation/Grey/grey-600`  | `#727272`  | 날짜·보조 정보                     |
| `Foundation/Grey/grey-800`  | `#454545`  | 강조 보조 텍스트                   |

### Warm Palette (앱 전용 — 하드코딩값, 향후 토큰화 권장)

| 이름                | HEX        | 용도                                        |
| ------------------- | ---------- | ------------------------------------------- |
| `warmWhite`         | `#F9F5F3`  | 스크린 배경 (홈, 상세 등 대부분의 화면)     |
| `warmBeige`         | `#E3DBD8`  | 버튼 테두리(off-state), 구분선              |
| `warmGrey`          | `#A29C9A`  | 비활성 버튼 텍스트                          |
| `warmDark`          | `#565252`  | 어두운 warm 텍스트                          |
| `warmWhiteAlt`      | `#F9F5F3`  | 태그·뱃지 배경                              |

### Semantic (구현 시 아래 매핑을 기준으로 사용)

| 시맨틱 토큰           | 값                         | 설명                        |
| --------------------- | -------------------------- | --------------------------- |
| `bg.screen`           | `#F9F5F3`                  | 기본 화면 배경              |
| `bg.card`             | `#FFFFFF`                  | 카드·모달 배경              |
| `bg.overlay`          | `rgba(141, 141, 141, 0.5)` | 모달 딤 배경                |
| `bg.glass`            | `rgba(255, 255, 255, 0.6)` | 사진 위 텍스트 뱃지 배경    |
| `text.primary`        | `#000000`                  | 기본 텍스트                 |
| `text.secondary`      | `#727272`                  | 날짜, 부제목                |
| `text.placeholder`    | `#7D7D7D`                  | 입력 필드 플레이스홀더      |
| `text.disabled`       | `#A29C9A`                  | 비활성 버튼 텍스트          |
| `border.default`      | `#E3DBD8`                  | 기본 테두리                 |
| `border.strong`       | `#DBDBDB`                  | 구분선                      |

> **TODO**: 다크 모드 대응 여부 확인 필요. 현재 Figma에는 Light 모드 단일 구성.

---

## 3. Typography

### Font Families

| 역할             | 패밀리          | 비고                                      |
| ---------------- | --------------- | ----------------------------------------- |
| UI · 본문        | **Pretendard**  | 한/영 혼합 최적화. MVP 주 폰트.           |
| 대시보드 강조    | **Noto Serif KR** | 여행 기록 감성. 숫자·통계 영역에 한정.  |

> React Native에서 Pretendard는 `expo-font`로 로드해야 한다.  
> Noto Serif KR은 대시보드 컴포넌트에서만 사용하므로 지연 로드 가능.

### Type Scale (Pretendard)

| 이름                  | fontSize | fontWeight | lineHeight | 용도                                  |
| --------------------- | -------- | ---------- | ---------- | ------------------------------------- |
| `Title 1`             | 28px     | 600        | 40px       | 화면 대제목                           |
| `Title 2`             | 18px     | 600        | 24px       | 카드 제목, 섹션 헤더                  |
| `Body 1 Emphasized`   | 16px     | 500        | 22px       | 버튼 레이블, 중요 본문                |
| `Body 1 Regular`      | 16px     | 400        | 22px       | 일반 본문                             |
| `Body 2 Emphasized`   | 14px     | 600        | 20px       | 태그·뱃지 수치 강조                   |
| `Body 2 Regular`      | 14px     | 400        | 20px       | 카드 날짜·부제                        |
| `Caption Regular`     | 12px     | 400        | 16px       | 내비게이션 레이블, 보조 설명          |
| `Caption Small`       | 10px     | 500        | 12px       | 최소 단위 레이블 (뱃지 등)            |

### Type Scale (Noto Serif KR — 대시보드 전용)

| 이름                        | fontSize | fontWeight | lineHeight | 용도                    |
| --------------------------- | -------- | ---------- | ---------- | ----------------------- |
| `Dashboard Num`             | 20px     | 900 (Black)| 24px       | 여행 통계 숫자          |
| `Dashboard Text Emphasis`   | 16px     | 700 (Bold) | 24px       | 대시보드 강조 텍스트    |
| `Dashboard Text`            | 16px     | 400        | 24px       | 대시보드 일반 텍스트    |

---

## 4. Spacing

스크린 기준 390px (iPhone 16 표준). 레이아웃 단위는 4px 그리드 기반.

| 토큰       | 값   | 사용 예시                              |
| ---------- | ---- | -------------------------------------- |
| `xs`       | 4px  | 인접 요소 간 최소 간격                 |
| `sm`       | 8px  | 아이콘-텍스트 간격, 작은 gap           |
| `md`       | 12px | 카드 내부 세로 gap, 입력 필드 padding  |
| `lg`       | 16px | 섹션 간격, 카드 내부 padding           |
| `xl`       | 20px | 화면 수평 패딩 (screenPaddingH)        |
| `2xl`      | 24px | 섹션 타이틀 하단 간격                  |
| `3xl`      | 32px | 카드 리스트 세로 간격                  |
| `4xl`      | 48px | 큰 섹션 간격                           |

> **screenPaddingH = 20px** — 거의 모든 화면에서 `paddingHorizontal: 20` 적용.

---

## 5. Border Radius

| 토큰     | 값     | 사용 예시                               |
| -------- | ------ | --------------------------------------- |
| `xs`     | 4px    | 썸네일 이미지 모서리                    |
| `sm`     | 8px    | 카드, 버튼 (primary/secondary), 태그    |
| `lg`     | 16px   | 모달/시트, 대형 버튼                    |
| `full`   | 100px  | 뱃지(pill), Dynamic Island             |

---

## 6. Elevation / Shadow

MVP에서 확인된 그림자 패턴. React Native `shadow*` 또는 `elevation` 속성으로 구현.

| 이름          | CSS 표현                                  | 사용 위치                  |
| ------------- | ----------------------------------------- | -------------------------- |
| `card`        | `0px 0px 16px 0px rgba(0,0,0,0.10)`       | 카드 (일반)                |
| `cardSmall`   | `0px 0px 4px 0px rgba(0,0,0,0.25)`        | 소형 요소 (뱃지 등)        |
| `sidebar`     | `8px 0px 16px 0px rgba(0,0,0,0.16)`       | 사이드 패널                |
| `floating`    | `0px 4px 4px 0px rgba(0,0,0,0.25)`        | FAB, 플로팅 버튼           |
| `modal`       | `4px 4px 24px 0px rgba(0,0,0,0.12)`       | 모달 시트                  |
| `overlay`     | `backdrop-filter: blur(4px)`              | 모달 딤 레이어 (iOS blur)  |

> **React Native 제약**: `backdropFilter`는 React Native에서 직접 지원 안 됨.  
> iOS: `@react-native-community/blur` 또는 Expo BlurView 사용. Android: dim 배경만 적용.

---

## 7. Buttons

### PrimaryButton

- 일반 CTA 버튼
- 높이: `40px`
- 배경: `Foundation/Black` (`#000000`)
- 텍스트: `Foundation/White` · `Body 1 Emphasized` (16/500)
- 반경: `8px`
- 전체 너비 or 콘텐츠 너비 상황별 사용

### Secondary Button (Off-state)

- 높이: `40px`
- 배경: `Foundation/White`
- 테두리: `1px solid #E3DBD8`
- 텍스트: `#A29C9A` · `Body 1 Emphasized` (16/500)
- 반경: `8px`

### AuthActionButton

- 로그인·회원가입 화면 전용 액션 버튼
- **TODO**: 높이, 배경, 반경 등 Figma Section 3에서 상세 스펙 확인 필요

### SheetActionButton

- 바텀시트 내부 전체 너비 버튼
- 반경: `8px`
- **TODO**: 높이 및 배경색 Figma Section 3에서 확인 필요

### Chip / Tag Button

- 높이: `52px` (주요 태그) or `40px` (소형)
- 배경: `Foundation/White` or `#F9F5F3`
- 패딩: `6px 12px`
- 반경: `8px`
- 텍스트: `Caption Regular` (12/400) 레이블 + `Body 2 Emphasized` (14/600) 수치

> **TODO**: 버튼 disabled 상태 색상 확인 필요 (Figma에서 명시적 상태가 확인되지 않음).

---

## 8. Inputs

Figma `02_System & Components`에서 독립 Input 컴포넌트가 명시되지 않음.  
MVP Screens에서 추론한 스펙:

- 높이: `40px` (단일 라인) · `48px` (여행 제목 등 강조)
- 패딩: `12px` (좌우)
- 배경: `Foundation/White`
- 테두리: `1px solid #E3DBD8` (기본)
- 텍스트: `Body 1 Regular` (16/400)
- 플레이스홀더: `#7D7D7D` (`grey-500`)
- 반경: `8px`

> **Need confirmation**: Focus 상태 테두리 색 / 에러 상태 미확인.

---

## 9. Cards

### TripCard

- 저장된 여행 또는 대표 여행 카드
- 레이아웃: 수평 row — 썸네일(140×110) + 우측 정보 영역
- 썸네일 반경: `4px`
- 정보 영역 갭: `12px` (세로)
- 제목: `Title 2` (18/600) · `Foundation/Black`
- 날짜: `Body 2 Regular` (14/400) · `grey-600`
- 하단 뱃지(기간/사진 수): `height 52px` · `radius 8px` · 배경 `Foundation/White`
- 카드 자체 배경: 없음(투명) — 화면 배경이 `#F9F5F3`이므로 카드 테두리 없어도 자연스러움

### TripListCard

- 리스트형/소형 여행 카드
- 상세 스펙: **TODO** — 02_System & Components에서 별도 확인 필요

### DayCard

- Day 1, Day 2 같은 하루 선택 카드
- 상세 스펙: **TODO** — Figma Section 3에서 확인 필요

### PlaceEntryCard

- `day-record` 화면 안의 장소별 기록 카드
- 상세 스펙: **TODO** — 컴포넌트 내부 padding/radius 확인 필요

### ReflectionCard

- 따옴표 아이콘 + 텍스트 콘텐츠 (성찰 기록 카드)
- 상세 스펙: **TODO** — 컴포넌트 내부 padding/radius 확인 필요

### QuestionCard

- 질문 카드
- 상세 스펙: **TODO** — Figma Section 3에서 확인 필요

### TodaySummary

- 오늘 요약 컴포넌트
- 상세 스펙: **TODO** — Figma Section 3에서 확인 필요

### TravelStatsCard

- 여행 통계 카드 (Noto Serif KR `dashboardNum` 스케일 사용)
- 상세 스펙: **TODO** — Figma Section 3에서 확인 필요

---

## 10. Navigation & Headers

### BottomTabBar

- 앱 하단 탭 내비게이션 바
- **TODO**: 높이 및 safe area 처리 기준 Figma Section 3에서 확인 필요
- **TODO**: 탭 아이콘 크기 및 레이블 스타일 확인 필요

### ScreenHeader

- 화면 상단 헤더 컴포넌트
- **TODO**: 높이, 백버튼 스타일, 타이틀 정렬 Figma Section 3에서 확인 필요

### MyPageTabs

- 마이페이지 내부 탭 컴포넌트 (ProfileSummary 하단)
- **TODO**: 탭 레이아웃, 인디케이터 색상·두께 확인 필요

---

## 11. Modal / Sheet

### Modal (modal-trip-created 패턴)

- 배경 딤: `rgba(141, 141, 141, 0.5)` + `backdropFilter: blur(4px)`
- 모달 컨테이너: `329×385px` · `radius 16px` · 배경 `Foundation/White`
- 닫기 버튼(×): 우상단 절대 위치 · `20×20`
- 버튼 영역: PrimaryButton(검정/40px) + Secondary(테두리/40px) 수직 배치
- 그림자: `4px 4px 24px 0px rgba(0,0,0,0.12)`

### Bottom Sheet (sheet-terms-consent 패턴)

- 반경: 상단만 `16px`
- 내부 버튼: `SheetActionButton` 컴포넌트 (전체 너비)
- 딤 배경 동일

---

## 12. Image / Photo

- **썸네일**: `140×110` · `radius 4px` · `objectFit: cover`
- **리스트 소형 썸네일**: `80×60` · `radius 4px`
- **전체 화면 배경 이미지**: `objectFit: cover` · `scaleMode: FILL`
- 이미지 위 텍스트 오버레이: `rgba(255,255,255,0.6)` 반투명 배경 사용
- **폴백 배경색**: `#5D5D5D` (이미지 로드 전 회색)

---

## 13. Copy Tone

Figma 화면 텍스트 기반 추론:

- **친근하고 부드러운 존댓말** ("여행이 만들어졌어요!", "Day 1 부터 기록을 시작해볼까요?")
- 동사형 마무리 선호 ("기록하기", "직접 추가", "나중에 하기")
- **감성적 서사** 지향 — 데이터 표시보다 경험 강조
- 짧고 명확한 레이블. 설명 문장은 최소화.

---

## 14. Implementation Notes

### Component Naming

Travu MVP 전반에서 아래 네이밍 규칙을 적용한다.

| 분류 | 규칙 | 예시 |
| --- | --- | --- |
| Figma 컴포넌트명 | PascalCase | `TripCard`, `BottomTabBar` |
| React Native 컴포넌트명 | PascalCase | `TripCard`, `ScreenHeader` |
| 컴포넌트 파일명 | `PascalCase.tsx` | `TripCard.tsx`, `DayCard.tsx` |
| 변수·함수·props | camelCase | `tripId`, `onPress`, `isActive` |
| 화면 ID·라우트명 | kebab-case | `day-record`, `trip-detail` |
| Expo Router 파일명 | 현재 구조 유지 | `(tabs)/index.tsx` |

#### 확정된 컴포넌트 이름 (Figma Section 3 기준)

**Cards**

| 컴포넌트 | 설명 |
| --- | --- |
| `TripCard` | 저장된 여행 또는 대표 여행 카드 |
| `TripListCard` | 리스트형/소형 여행 카드 |
| `DayCard` | Day 1, Day 2 같은 하루 선택 카드 |
| `PlaceEntryCard` | `day-record` 화면 안의 장소별 기록 카드 |
| `ReflectionCard` | 따옴표 아이콘 + 성찰 기록 카드 |
| `QuestionCard` | 질문 카드 |
| `TodaySummary` | 오늘 요약 컴포넌트 |
| `TravelStatsCard` | 여행 통계 카드 |

**Buttons**

| 컴포넌트 | 설명 |
| --- | --- |
| `PrimaryButton` | 일반 CTA 버튼 |
| `AuthActionButton` | 로그인·회원가입 화면 액션 버튼 |
| `SheetActionButton` | 바텀시트 내부 전체 너비 버튼 |

**Navigation / Headers**

| 컴포넌트 | 설명 |
| --- | --- |
| `BottomTabBar` | 앱 하단 탭 내비게이션 |
| `ScreenHeader` | 화면 상단 헤더 |
| `MyPageTabs` | 마이페이지 내부 탭 |
| `ProfileSummary` | 프로필 요약 컴포넌트 |
| `DateBadge` | 날짜 뱃지 컴포넌트 |

> **중요**: `day-record`는 화면(route) 이름이다. `DayRecord`라는 컴포넌트명은 사용하지 않는다.

### 폰트 로드 (Expo)

```ts
// app/_layout.tsx
import { useFonts } from 'expo-font';

const [loaded] = useFonts({
  'Pretendard-Regular':   require('../assets/fonts/Pretendard-Regular.otf'),
  'Pretendard-Medium':    require('../assets/fonts/Pretendard-Medium.otf'),
  'Pretendard-SemiBold':  require('../assets/fonts/Pretendard-SemiBold.otf'),
  'Pretendard-Bold':      require('../assets/fonts/Pretendard-Bold.otf'),
  // Noto Serif KR — TravelStatsCard 전용 (지연 로드 가능)
  'NotoSerifKR-Regular':  require('../assets/fonts/NotoSerifKR-Regular.otf'),
  'NotoSerifKR-Bold':     require('../assets/fonts/NotoSerifKR-Bold.otf'),
  'NotoSerifKR-Black':    require('../assets/fonts/NotoSerifKR-Black.otf'),
});
```

### 포트폴리오 목업 데이터

Figma 화면의 텍스트("시드니", "2025. 3. 5 - 3. 15", 여행 사진 등)는 포트폴리오 예시 데이터다.  
실제 구현 시 `src/mocks/mockData.ts` 등으로 분리하고 하드코딩하지 않는다.

### 다크 모드

현재 Figma에서 다크 모드 프레임이 확인되지 않음.  
`constants/theme.ts`의 `Colors.dark`는 임시 placeholder. 추후 확정 필요.

### 화면 너비 기준

Figma 프레임 기준: `390×840` (iPhone 16 표준).  
`screenPaddingH: 20`으로 좌우 여백을 고정하고, 내부 콘텐츠는 `350px` 기준으로 설계.

### 미확인 항목 (Need confirmation)

- [ ] `PrimaryButton` · `AuthActionButton` · `SheetActionButton` disabled 상태 색상
- [ ] Input focus / error 상태 테두리 색
- [ ] `TripListCard` · `DayCard` · `PlaceEntryCard` · `QuestionCard` · `TodaySummary` · `TravelStatsCard` 상세 padding·radius
- [ ] `AuthActionButton` 높이·배경·반경 Figma Section 3 확인
- [ ] `BottomTabBar` 높이 및 safe area 처리 기준
- [ ] `ScreenHeader` 높이·백버튼 스타일
- [ ] `MyPageTabs` 인디케이터 색상·두께
- [ ] 다크 모드 색상 대응 방향
- [ ] 텍스트 입력 키보드 회피(KeyboardAvoidingView) 전략
