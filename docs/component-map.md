# Travu Component Map

> Travu MVP에서 화면 구현 시 **반드시 참조하는 표준 컴포넌트 사용 규칙**  
> 업데이트: 2026-05-25

---

## 1. 기본 원칙

- 새 화면을 만들기 전에 반드시 `docs/component-map.md`와 `components/` 폴더를 확인한다.
- 기존 컴포넌트와 역할이 겹치면 새로 만들지 않는다.
- 단순 스타일 차이는 새 컴포넌트가 아니라 **props 또는 variant**로 처리한다.
- 화면 파일 안에 카드, 버튼, 필드, 모달, 시트를 직접 구현하지 않는다.
- 새 컴포넌트를 만들면 반드시 이 문서에 등록한다.
- `constants/theme.ts`의 Typography, Colors, Spacing, Radius를 우선 사용한다.
- Figma의 Frame 166, Frame 167, Component 5 같은 임시 이름을 코드 컴포넌트명으로 쓰지 않는다.
- Figma의 iPhone status bar와 home indicator는 구현하지 않는다.
- 탭바는 `app/(tabs)/_layout.tsx`에서만 관리하고, 각 화면 파일 안에서 직접 렌더링하지 않는다.
- **역할이 다른 컴포넌트를 억지로 재사용하지 않는다.** (예: ScreenHeader Date 영역에 `DayCard` 사용 금지 → `RecordDateButton` 사용)

---

## 2. 표준 컴포넌트 목록

### common

#### AppText
| 항목 | 내용 |
|------|------|
| **파일** | `components/common/AppText.tsx` |
| **사용 화면** | Home, Auth, Record, record-day-detail, My Page, day-archive-detail 등 대부분 |
| **역할** | `allowFontScaling={false}` Text 래퍼 |
| **새로 만들면 안 되는 UI** | 화면별 커스텀 Text 래퍼 |
| **확장 방식** | `Typography` 토큰 + `style` prop |

#### AppTextInput
| 항목 | 내용 |
|------|------|
| **파일** | `components/common/AppTextInput.tsx` |
| **사용 화면** | `TripCreateModal` 내부 |
| **역할** | fontScale 방지 TextInput |
| **새로 만들면 안 되는 UI** | 모달/폼 내부 raw TextInput |
| **확장 방식** | RN TextInputProps 그대로 전달 |

#### PrimaryButton
| 항목 | 내용 |
|------|------|
| **파일** | `components/common/PrimaryButton.tsx` |
| **사용 화면** | Record (`직접 추가`), My Page (정렬 — semantics 개선 예정) |
| **역할** | 소형 pill CTA (radius 16, padding 6×12) |
| **새로 만들면 안 되는 UI** | 검정 pill 소형 버튼 |
| **확장 방식** | `active`, `loading`, `numberOfLines`, `style` prop |

#### AuthActionButton
| 항목 | 내용 |
|------|------|
| **파일** | `components/common/AuthActionButton.tsx` |
| **사용 화면** | `TripCreateModal`, `TripCreatedModal`, button-test |
| **역할** | full-width 48h CTA (`state`: on/off) |
| **새로 만들면 안 되는 UI** | 320×48 검정/테두리 버튼 |
| **확장 방식** | `state`, `loading`, left icon slot (향후) |

#### SheetActionButton *(통합 후보)*
| 항목 | 내용 |
|------|------|
| **파일** | `components/common/SheetActionButton.tsx` |
| **사용 화면** | Auth (`auth-start.tsx`) |
| **역할** | 바텀시트 내부 full-width 48h CTA |
| **새로 만들면 안 되는 UI** | 시트 하단 검정 버튼 |
| **확장 방식** | `AuthActionButton`과 통합 검토 (`active` ↔ `state`) |

#### DateBadge
| 항목 | 내용 |
|------|------|
| **파일** | `components/common/DateBadge.tsx` |
| **사용 화면** | `DateBadgeList` → `TripCard` (간접), component-test |
| **역할** | 80×60 날짜 pill 썸네일 |
| **새로 만들면 안 되는 UI** | 날짜+요일 오버레이 썸네일 |
| **확장 방식** | `DateBadgeList`와 조합 |

#### MapPlaceholderCard
| 항목 | 내용 |
|------|------|
| **파일** | `components/common/MapPlaceholderCard.tsx` |
| **사용 화면** | My Page, record-day-detail, day-archive-detail |
| **역할** | 지도 API 연결 전 공통 placeholder |
| **새로 만들면 안 되는 UI** | 흰 카드 + "지도" 텍스트 인라인 View |
| **확장 방식** | `subtitle`, `height`, `align` prop |

#### FullScreenImageViewer
| 항목 | 내용 |
|------|------|
| **파일** | `components/common/FullScreenImageViewer.tsx` |
| **사용 화면** | `PlaceEntryCard` 내부에서 재사용 |
| **역할** | 여행 사진 썸네일 선택 시 전체화면 이미지 탐색 Modal |
| **확장 방식** | `images`, `initialIndex`, `visible`, `onClose` prop |

#### ScreenContainer
| 항목 | 내용 |
|------|------|
| **파일** | `components/common/ScreenContainer.tsx` |
| **사용 화면** | figma-node-1207-2245 (프로토타입 전용) |
| **역할** | SafeArea + scroll shell |
| **비고** | production 미사용. 신규 화면은 `SafeAreaView` + 표준 컴포넌트 조합 |

---

### nav

#### ScreenHeader
| 항목 | 내용 |
|------|------|
| **파일** | `components/nav/ScreenHeader.tsx` |
| **사용 화면** | Record, My Page, record-day-detail, day-archive-detail |
| **역할** | 40h 상단 헤더 (back, title, centerSlot, rightSlot, settings) |
| **새로 만들면 안 되는 UI** | back 버튼 + 타이틀 row |
| **확장 방식** | `centerSlot`, `rightSlot`, `balancedSlots` |
| **balancedSlots** | record-day-detail 전용 — LeftSlot(Back) · Date(fill, 화면 중앙) · RightSlot(동일 폭, 빈 슬롯). `margin`/`absolute` 없이 좌우 동일 폭으로 Date 중앙 정렬 |

#### TravuTabBar *(production 탭바)*
| 항목 | 내용 |
|------|------|
| **파일** | `components/nav/TravuTabBar.tsx` |
| **사용 화면** | `app/(tabs)/_layout.tsx` 전용 |
| **역할** | Expo Router `Tabs` + React Navigation `BottomTabBarProps` 연동 탭바 |
| **구조** | `(tabs)/_layout.tsx`에서 `tabBar={(props) => <TravuTabBar {...props} />}` |
| **탭 라우트** | `index`(Home), `record`, `profile`(My Page). `explore`는 `href: null`로 숨김 |
| **새로 만들면 안 되는 UI** | 화면 내부 하단 탭, 고정 390px 탭바 |
| **확장 방식** | `TravuTabBar.tsx`만 수정. 화면 파일에서 탭바 렌더 금지 |

#### BottomTabBar *(프로토타입/테스트 전용 — production 금지)*
| 항목 | 내용 |
|------|------|
| **파일** | `components/nav/BottomTabBar.tsx` |
| **사용 화면** | component-test, components-showcase, figma-node-1207-2245, day-record-1207-2245 |
| **역할** | 수동 `active: 'home' \| 'add' \| 'profile'` 정적 탭바 (Figma 미리보기용) |
| **비고** | **production에서 사용하지 않는다.** 실제 앱 탭바는 `TravuTabBar` |

---

### trip

#### TripCard
| 항목 | 내용 |
|------|------|
| **파일** | `components/trip/TripCard.tsx` |
| **사용 화면** | Record |
| **역할** | Record 대형 여행 카드 + bookmark + DateBadgeList |
| **새로 만들면 안 되는 UI** | 썸네일+stats+날짜뱃지 여행 카드 |
| **확장 방식** | `isSaved` + `onSavedChange` **controlled 필수** |

#### TripListCard
| 항목 | 내용 |
|------|------|
| **파일** | `components/trip/TripListCard.tsx` |
| **사용 화면** | My Page |
| **역할** | 북스파인형 소형 여행 카드 (101px) |
| **새로 만들면 안 되는 UI** | Prata 제목 + glass header 여행 카드 |
| **확장 방식** | `style` (grid width 101) |

#### DayCard
| 항목 | 내용 |
|------|------|
| **파일** | `components/trip/DayCard.tsx` |
| **사용 화면** | day-archive-detail |
| **역할** | **Day 단위 카드** — "Day N" + 날짜 + 드롭다운 triangle (109px) |
| **새로 만들면 안 되는 UI** | Day 번호 + 날짜 카드 row |
| **확장 방식** | `dayNumber`, `date`, `onPress`, `style` |
| **주의** | ScreenHeader Date 영역에는 사용하지 않음 → `RecordDateButton` |

#### PlaceEntryCard
| 항목 | 내용 |
|------|------|
| **파일** | `components/trip/PlaceEntryCard.tsx` |
| **사용 화면** | record-day-detail, day-archive-detail |
| **역할** | 타임라인 장소 기록 카드 + 여행 사진 전체화면 뷰어 진입 |
| **새로 만들면 안 되는 UI** | 시간+장소+사진 strip 카드 |
| **확장 방식** | `showRating` prop |

#### QuestionCard
| 항목 | 내용 |
|------|------|
| **파일** | `components/trip/QuestionCard.tsx` |
| **사용 화면** | My Page (성찰 탭) |
| **역할** | Q/A 성찰 카드 (350w) |
| **새로 만들면 안 되는 UI** | Q./A. 질문-답변 카드 |
| **확장 방식** | `data`, `style` |

#### ReflectionCard
| 항목 | 내용 |
|------|------|
| **파일** | `components/trip/ReflectionCard.tsx` |
| **사용 화면** | My Page (성찰 탭) |
| **역할** | 인용부 + 성찰 텍스트 (220×270) |
| **새로 만들면 안 되는 UI** | quote 아이콘 회고 카드 |
| **확장 방식** | `data`, `style` |

#### TodaySummary
| 항목 | 내용 |
|------|------|
| **파일** | `components/trip/TodaySummary.tsx` |
| **사용 화면** | Home |
| **역할** | Noto Serif "오늘은 X km…" 요약 |
| **새로 만들면 안 되는 UI** | 오늘 이동/방문/기록 서사 텍스트 |
| **확장 방식** | `distanceKm`, `placeCount`, `momentCount` |

#### TravelStatsCard
| 항목 | 내용 |
|------|------|
| **파일** | `components/trip/TravelStatsCard.tsx` |
| **사용 화면** | day-archive-detail |
| **역할** | 아이콘 + 방문/이동 수치 (87w) |
| **새로 만들면 안 되는 UI** | compact 통계 아이콘 row |
| **확장 방식** | `placeCount`, `distanceKm` |

---

### record

#### DateBadgeList
| 항목 | 내용 |
|------|------|
| **파일** | `components/record/DateBadgeList.tsx` |
| **사용 화면** | `TripCard` 내부 |
| **역할** | DateBadge 가로 스크롤 + 선택 dim |
| **확장 방식** | `items`, `selectedId`, `onSelect` |

#### RecordDateButton
| 항목 | 내용 |
|------|------|
| **파일** | `components/record/RecordDateButton.tsx` |
| **사용 화면** | record-day-detail (ScreenHeader centerSlot) |
| **역할** | **Date** — 날짜+요일만 표시하는 헤더용 선택 UI (예: "2025.3.6 목"). Day 번호 없음 |
| **새로 만들면 안 되는 UI** | ScreenHeader 중앙 날짜+triangle Pressable |
| **확장 방식** | `dateLabel`, `onPress`, `style` |
| **주의** | `DayCard`와 역할 다름. `DateBadge`와도 다름 (썸네일 pill 아님) |

#### DaySelectorSheet
| 항목 | 내용 |
|------|------|
| **파일** | `components/record/DaySelectorSheet.tsx` |
| **사용 화면** | record-day-detail (days), My Page (options/정렬) |
| **역할** | Day 선택 또는 옵션 선택 바텀시트 |
| **새로 만들면 안 되는 UI** | Modal + FlatList 선택 시트 |
| **확장 방식** | `days` 또는 `options` + `title` prop. 정렬 등 option 모드 문서화됨 |

#### TripCreateModal
| 항목 | 내용 |
|------|------|
| **파일** | `components/record/TripCreateModal.tsx` |
| **사용 화면** | Record |
| **역할** | 여행 직접 추가 multi-step modal |
| **확장 방식** | `visible`, `onClose`, `onCreate` |

#### PlaceCreateModal
| Item | Detail |
|------|--------|
| **File** | `components/record/PlaceCreateModal.tsx` |
| **Screen** | record-day-detail |
| **Role** | Add a place entry to the currently selected day |
| **Props** | `visible`, `onClose`, `onSubmit`, `initialValue` (time/category/photoUris included) |

#### TimeWheelPickerModal
| Item | Detail |
|------|--------|
| **File** | `components/record/TimeWheelPickerModal.tsx` |
| **Screen** | PlaceCreateModal |
| **Role** | Bottom sheet wheel picker for place-entry time |
| **Props** | `visible`, `value`, `onClose`, `onConfirm` |

#### TripCreatedModal
| 항목 | 내용 |
|------|------|
| **파일** | `components/record/TripCreatedModal.tsx` |
| **사용 화면** | Record |
| **역할** | 여행 생성 완료 확인 modal |
| **확장 방식** | `visible`, `onClose`, `onStartDayOne` |

#### DestinationSelectField
| 항목 | 내용 |
|------|------|
| **파일** | `components/record/DestinationSelectField.tsx` |
| **사용 화면** | `TripCreateModal` |
| **역할** | 여행지 선택 필드 |
| **통합 후보** | `TripDateRangeField`와 동일 구조 → 향후 `FormSelectField` |

#### TripDateRangeField
| 항목 | 내용 |
|------|------|
| **파일** | `components/record/TripDateRangeField.tsx` |
| **사용 화면** | `TripCreateModal` |
| **역할** | 기간 선택 필드 |
| **통합 후보** | `DestinationSelectField`와 동일 구조 |

---

### mypage

#### ProfileSummary
| 항목 | 내용 |
|------|------|
| **파일** | `components/mypage/ProfileSummary.tsx` |
| **사용 화면** | My Page |
| **역할** | 프로필 이미지, 사용자 이름, 기록/국가/여행 통계, **사용자 소개 문구(tagline/bio)** 를 포함하는 표준 프로필 요약 |
| **새로 만들면 안 되는 UI** | 프로필 요약 row, My Page에서 tagline/bio를 화면에 직접 렌더링 |
| **확장 방식** | count props, optional `tagline` (자기소개/상태 메시지). **tagline은 ProfileSummary prop으로 전달하고 컴포넌트 내부에서만 렌더링** |

#### MyPageTabs
| 항목 | 내용 |
|------|------|
| **파일** | `components/mypage/MyPageTabs.tsx` |
| **사용 화면** | My Page |
| **역할** | 여행 / 성찰 segmented tab |
| **새로 만들면 안 되는 UI** | 프로필 하단 2탭 UI |
| **확장 방식** | `mode`, `onChange` |

---

## 3. 화면별 사용 규칙

### Home — `app/(tabs)/index.tsx`

| 구분 | 내용 |
|------|------|
| **현재 사용** | `AppText`, `TodaySummary` |
| **반드시 재사용** | `TodaySummary`, `AppText`, `theme.ts` 토큰 |
| **직접 구현 금지** | stats 카드(TodaySummary로 대체), 소형 CTA(PrimaryButton), 사진 카드(향후 공통 컴포넌트) |
| **예외** | 히어로 이미지·그라데이션은 Home 고유 레이아웃 (향후 `HomeHero` 분리 검토) |

### Auth — `app/auth-start.tsx`

| 구분 | 내용 |
|------|------|
| **현재 사용** | `AppText`, `SheetActionButton` |
| **반드시 재사용** | `AuthActionButton`(소셜 버튼), `SheetActionButton`, `AppText` |
| **직접 구현 금지** | 320×48 소셜 버튼, 시트 하단 CTA, checkbox row (향후 legal 컴포넌트) |
| **예외** | 약관 전문 텍스트, Google SVG 로고 |

### Record — `app/(tabs)/record.tsx`

| 구분 | 내용 |
|------|------|
| **현재 사용** | `ScreenHeader`, `PrimaryButton`, `TripCard`, `TripCreateModal`, `TripCreatedModal` |
| **반드시 재사용** | 위 전부 + `TripCard` controlled bookmark |
| **직접 구현 금지** | 여행 카드, 생성 modal |

### record-day-detail — `app/record-day-detail.tsx`

| 구분 | 내용 |
|------|------|
| **현재 사용** | `ScreenHeader`(balancedSlots), `RecordDateButton`, `DaySelectorSheet`, `PlaceEntryCard`, `MapPlaceholderCard` |
| **반드시 재사용** | `ScreenHeader` + `balancedSlots` + `RecordDateButton`(Date), `DaySelectorSheet`, `PlaceEntryCard`, `MapPlaceholderCard` |
| **헤더 구조** | LeftSlot(Back) · Date(`RecordDateButton`, fill·중앙) · RightSlot(빈 View, Left와 동일 width) |
| **직접 구현 금지** | 날짜+triangle 인라인, `margin`/`absolute`로 Date 억지 중앙 정렬, ScreenHeader에 `DayCard` 사용, 지도 placeholder, 장소 카드 |

### My Page — `app/(tabs)/profile.tsx`

| 구분 | 내용 |
|------|------|
| **현재 사용** | `ScreenHeader`, `ProfileSummary`, `MyPageTabs`, `TripListCard`, `ReflectionCard`, `QuestionCard`, `PrimaryButton`, `DaySelectorSheet`, `MapPlaceholderCard` |
| **반드시 재사용** | 위 전부 |
| **직접 구현 금지** | TripListCard 유사 카드, 프로필 요약, **사용자 소개 문구(tagline/bio)를 profile.tsx에 직접 렌더링**, 탭 UI, 지도 placeholder |
| **주의** | 정렬 버튼은 `PrimaryButton` misuse — 향후 FilterChip variant. **tagline/bio는 `ProfileSummary`의 `tagline` prop으로 전달** |

### day-archive-detail — `app/day-archive-detail.tsx`

| 구분 | 내용 |
|------|------|
| **현재 사용** | `ScreenHeader`, `DayCard`, `TravelStatsCard`, `PlaceEntryCard`, `MapPlaceholderCard` |
| **반드시 재사용** | 위 전부 |
| **직접 구현 금지** | 장소 카드, 지도 placeholder, stats(DayCard+TravelStatsCard) |
| **예외** | 히어로(Prata 96px + photo frame) — 화면 고유 |

### modal / sheet

| 유형 | 표준 컴포넌트 | 비고 |
|------|--------------|------|
| Day/Option 선택 | `DaySelectorSheet` | 정렬 option 모드 포함 |
| 여행 생성 | `TripCreateModal` | |
| 생성 완료 | `TripCreatedModal` | |
| Auth 약관 | `auth-start` 내 `SheetModal` | 향후 shell 추출 |
| 시트 CTA | `SheetActionButton` | AuthActionButton 통합 후보 |
| Modal CTA | `AuthActionButton` | |

---

## 4. 금지 규칙

- 기존 `TripCard`와 유사한 카드를 새로 만들지 말 것
- 기존 `TripListCard`와 유사한 카드를 새로 만들지 말 것
- 기존 `PlaceEntryCard`와 유사한 장소 카드를 새로 만들지 말 것
- 기존 `DateBadge`가 있는데 날짜 뱃지를 새로 만들지 말 것
- 기존 `ScreenHeader`가 있는데 새 헤더를 화면 내부에 만들지 말 것
- **`BottomTabBar`를 production 화면에 쓰지 말 것** — production 탭바는 `TravuTabBar` + `(tabs)/_layout.tsx`만
- 화면 파일 안에서 탭바를 중복 렌더링하지 말 것
- 지도 placeholder는 **`MapPlaceholderCard`**를 사용할 것 (인라인 View 금지)
- 저장/bookmark 상태는 **부모 controlled** (`isSaved` + `onSavedChange`)로 통일할 것
- Figma 목업용 status bar와 home indicator는 구현하지 말 것
- **존재하지 않는 컴포넌트명을 표준으로 적지 말 것**
- **`DayCard`를 ScreenHeader Date 영역에 쓰지 말 것** — `RecordDateButton` 사용
- **역할이 다른 컴포넌트를 억지로 재사용하지 말 것** (`DayCard` ≠ Date 헤더)

---

## 5. 현재 리팩터링 우선순위

### A. 지금 바로 수정할 항목 ✅ (2026-05-25 적용)

- [x] record-day-detail ScreenHeader Date → `RecordDateButton` (Day 번호 없음, Figma Date 기준)
- [x] `TripCard` bookmark controlled/uncontrolled 혼재 제거
- [x] 지도 placeholder 3곳 → `MapPlaceholderCard` 공통화

### B. My Page 진행 전 수정할 항목

- profile 정렬 버튼 semantics 정리 (PrimaryButton → FilterChip variant)
- `DaySelectorSheet` option selector 역할 문서화 (정렬 시트)
- `TripListCard` grid layout 기준 정리 (width 101, columnGap 23)

### C. 나중에 수정할 항목

- Home hero 분리
- Auth 소셜 버튼 → `AuthActionButton`
- `AuthActionButton` / `SheetActionButton` 통합
- `DestinationSelectField` / `TripDateRangeField` → `FormSelectField`
- `BottomSheetShell` / `ModalShell` 추출
- Expo scaffold (`explore`, `ThemedText`, `HelloWave` 등) 정리
- `BottomTabBar` 프로토타입 전용 파일 archive

---

## 부록: 탭바 구조 (실제 코드 기준)

```
app/(tabs)/_layout.tsx
└── Expo Router <Tabs>
    └── tabBar={(props) => <TravuTabBar {...props} />}
        ├── index      → Home
        ├── record     → Record
        ├── profile    → My Page
        └── explore    → href: null (탭바 미표시)
```

`BottomTabBar.tsx`는 Figma/테스트 화면(`component-test`, `components-showcase`, `figma-node-1207-2245`)에서만 import된다.
