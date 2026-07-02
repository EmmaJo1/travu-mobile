# Day 1 백엔드/Google API 연동 사전 점검 결과

작성일: 2026-07-03

## 1. mock/placeholder/임시 Alert 목록

| 파일 경로 | 역할 | 현재 mock/임시 데이터 또는 임시 동작 | 교체 대상 | 우선순위 |
| --- | --- | --- | --- | --- |
| `providers/PhotoImportFlowProvider.tsx` | 온보딩/홈 사진첩 여행 감지 상태 관리 | `MOCK_PHOTO_IMPORT_CANDIDATES`, mock delay, 고정 progress 62% | MediaLibrary 권한/스캔 결과, Supabase `trips/photos/trip_days` 저장 | 높음 |
| `services/photoImport/mockPhotoImportProvider.ts` | 사진첩 여행 감지 provider | 권한 항상 granted, 후보 mock, 저장 id만 메모리 반영 | 실제 사진 권한, EXIF/GPS 분석, trip 후보 생성 API | 높음 |
| `constants/mockDetectedTrips.ts` | record 탭 감지 여행 mock | 감지된 여행 카드/DaySelector 데이터 | Supabase trips/trip_days/photos + 감지 후보 테이블 | 높음 |
| `constants/mockRecordDayDetail.ts` | record-day-detail 장소 카드 mock | PlaceEntry mock, 사진 asset 기반 | Supabase places/photos/records 조회 | 높음 |
| `constants/mockArchiveDetail.ts` | archive-day-detail mock | 여행 상세/날짜/장소/지도/사진 mock | Supabase trips/trip_days/places/photos 집계 | 높음 |
| `constants/mockPlaceDetails.ts` | place-detail mock 상세 | 장소 상세, 사진, 기록 mock; 일부 문자열 깨짐 | Supabase places/photos/records + Google Place Details | 높음 |
| `constants/mockHome.ts`, `constants/mockHomeTimeline.ts` | 홈 여행 중 상태와 타임라인 mock | currentTrip/timeline fallback | active trip, selected day photos/places/records | 높음 |
| `constants/mockIdleHomeData.ts` | 일상 홈 빈/과거 여행 mock | 최근 여행, 과거 순간 mock | Supabase trips/photos/derived moments | 중간 |
| `constants/mockMyPageTrips.ts` | 마이페이지 여행 책자 mock | 여행 리스트/정렬/통계 mock | Supabase trips/photos aggregate | 높음 |
| `constants/savedMyPageTrips.ts` | 저장된 여행 임시 store | module-level 메모리 store, fallback 영어명 매핑 | Supabase persistence 또는 local cache + sync | 높음 |
| `constants/mockMyPageProfile.ts`, `providers/UserProfileProvider.tsx` | 프로필 mock 및 상태 | mock 기본값, in-memory update TODO | Supabase users/profile + AsyncStorage cache | 중간 |
| `services/placeSearch/mockPlaceSearchProvider.ts`, `constants/mockPlaceSearchResults.ts` | 장소 검색 provider | mock 장소 검색 결과 | Places Autocomplete + Place Details | 높음 |
| `components/common/PlaceSearchModal.tsx` | 장소 검색 UI | 컴포넌트 내부 `PLACE_DATA` mock 추천/검색 | 공통 Google Places provider | 높음 |
| `components/common/MapPlaceholderCard.tsx` | 지도 placeholder | 실제 지도 대신 grey placeholder | Google Maps SDK 지도/마커/경로 | 높음 |
| `components/common/DestinationSelectModal.tsx`, `components/record/DestinationSelectView.tsx`, `constants/mockDestinations.ts`, `constants/mockTripDestinations.ts` | 여행지 선택 | mock destination catalog | Places/Geocoding 기반 도시·국가 검색 | 중간 |
| `app/(tabs)/index.tsx` | 홈/여행 중 플로우 | activeTrip/timeline 로컬 state, setTimeout 완료, Alert | Supabase active trip/session + Edge Function 감지 상태 | 높음 |
| `app/record-day-detail.tsx` | 감지 여행 기록 검토 | 사진 추가/삭제/장소 추가가 로컬 state, 저장은 `addSavedCompletedTrip` | Supabase insert/update/delete cascade | 높음 |
| `app/day-archive-detail.tsx` | 저장 여행 상세 | 여행정보/장소/대표사진/삭제가 로컬 patch 또는 memory store | Supabase update/delete | 높음 |
| `app/place-detail.tsx` | 장소 상세 | 기록/사진/대표사진/장소 수정이 로컬 state, 공유/사진 정보 Alert | Supabase places/photos/records update + OS share | 높음 |
| `app/(tabs)/profile.tsx` | 마이페이지 | mock+savedTrips merge, long press 삭제 로컬 | Supabase trips aggregate/delete | 높음 |
| `app/settings.tsx` | 설정 | 로그아웃/회원 탈퇴/외부 링크 Alert | Auth signOut/delete user, external links | 중간 |
| `components/record/PlaceCreateModal.tsx` | 장소 추가/수정 모달 | 기본 `tripId='mock-trip'`, `dayId='mock-day'`, ImagePicker local uri | Supabase places/photos insert/update, Google place details | 높음 |
| `app/component-test.tsx`, `app/components-showcase.tsx`, `app/button-test.tsx`, `app/figma-node-1207-2245.tsx` | 시각 검수/샘플 화면 | mock/test/sample 데이터 | 개발용 유지 또는 라우트 제외 | 낮음 |
| `constants/theme.ts` | 디자인 토큰 | 미확정 dark mode/component TODO | 디자인 시스템 정리 | 낮음 |

## 2. TODO/FIXME 목록

| 파일 경로 | TODO/FIXME 요약 | 교체/정리 방향 | 우선순위 |
| --- | --- | --- | --- |
| `providers/PhotoImportFlowProvider.tsx` | mock delay를 실제 사진 분석 상태로 교체 | 분석 job 상태 모델 필요 | 높음 |
| `services/photoImport/mockPhotoImportProvider.ts` | mock 권한 결과 교체 | `expo-media-library`/권한 provider 연결 | 높음 |
| `components/onboarding/OnboardingPager.tsx` | 실제 권한 flow 복구, mock preview/save delay | 온보딩 완료와 감지 시작을 실제 provider로 연결 | 높음 |
| `app/(tabs)/index.tsx` | imported-trip 결과 route, EXIF/GPS metadata, 수동 장소 Supabase 저장, placeId source of truth | 홈 active trip 데이터 모델 확정 | 높음 |
| `components/home/HomeIdleState.tsx` | 월별 photo count 분리 | photo taken_at 기반 집계 | 중간 |
| `constants/mockHomeTimeline.ts` | timeline을 photo metadata groups에서 생성 | 사진 클러스터링/장소 그룹화 로직 | 높음 |
| `app/record-day-detail.tsx` | 여행정보 수정 저장, 감지 후보 saved/ignored 처리 | trips update, detection candidate status | 높음 |
| `app/day-archive-detail.tsx` | 여행정보 수정, 새 장소 Supabase 저장 | trips/places/photos insert/update | 높음 |
| `app/(tabs)/profile.tsx` | 여행 삭제 backend 연결 | trips cascade/soft delete 정책 | 높음 |
| `constants/savedMyPageTrips.ts` | 영어 목적지명을 fallback mapping 대신 저장 | geocoding/photo metadata 저장 필드 확정 | 중간 |
| `constants/mockMyPageTrips.ts` | cover title fallback 제거 | trips.title_en 또는 display title 저장 | 낮음 |
| `providers/UserProfileProvider.tsx` | in-memory update를 Supabase/durable persistence로 교체 | users/profile 저장 | 중간 |
| `constants/theme.ts` | 미확정 토큰 TODO | 백엔드 연동 범위 아님 | 낮음 |

## 3. 실제 동작하지 않거나 로컬에만 반영되는 플로우 목록

| 화면 | 버튼/플로우 | 현재 동작 | 실제 연결 기능 | 대상 테이블/API | 우선순위 |
| --- | --- | --- | --- | --- | --- |
| 온보딩 | 사진첩 연결하기 | mock provider로 결과 후보 표시 | 사진 권한 요청, 사진 스캔, 후보 생성 | MediaLibrary, `photos`, `trips` | 높음 |
| 온보딩 | 온보딩 완료/저장 | mock candidate를 memory savedTrips에 추가 | 사용자별 trip 생성, onboarding state 저장 | `users`, `trips`, `trip_days`, `photos` | 높음 |
| 홈 | + 사진첩에서 여행 찾기 | mock loading/result 전환 | 실제 감지 job 시작/상태 구독 | MediaLibrary, Edge Function | 높음 |
| 홈 | 여행 시작 | 로컬 `activeTrip` state | active trip/session 생성 | `trips`, `trip_days` | 높음 |
| 홈 | 여행 정보 수정 | 로컬 activeTrip patch | trips update | `trips` | 높음 |
| 홈 | 장소 추가 | timelineItems에 로컬 추가 | places/photos/records insert | `places`, `photos`, records 테이블 필요 | 높음 |
| record-day-detail | 장소 추가/수정 | entriesByDay 로컬 변경 | places insert/update | `places`, `photos`, records | 높음 |
| record-day-detail | 사진 추가/삭제 | ImagePicker uri를 로컬 entry에 반영 | Storage upload/delete, photo row update | Supabase Storage, `photos` | 높음 |
| record-day-detail | 여행 저장/삭제 | savedTrips memory, route 이동 | detection candidate status, trips persistence | `trips`, detection status | 높음 |
| archive-day-detail | 여행 정보 수정 | localTripPatch + savedTrips memory | trips update | `trips` | 높음 |
| archive-day-detail | 장소 추가/삭제 | local state + deletion registry | places delete/insert, cascade detail invalidation | `places`, `photos`, records | 높음 |
| archive-day-detail | 대표사진 변경 | local coverImage patch | cover_photo_id update | `trips.cover_photo_id` | 중간 |
| place-detail | 장소 정보 수정 | 화면 state에만 반영 | places update | `places` + Google fields | 높음 |
| place-detail | 대표사진 변경 | local cover photo state | places.cover_photo_id update | `places.cover_photo_id` | 중간 |
| place-detail | 사진 추가/삭제 | local photos 배열 변경 | Storage upload/delete or association update | `photos`, Storage | 높음 |
| place-detail | 기록 추가/삭제 | local records 배열 변경 | records insert/delete | records 테이블 필요 | 높음 |
| place-detail | 공유/사진 정보 | Alert “추후 연결 예정” | OS share, photo metadata view | OS Share, `photos.exif_data` | 낮음 |
| 사진 그리드/뷰어 | 사진 전체보기 | local arrays로 동작 | route간 실제 photo id/source 동기화 | `photos` | 중간 |
| 마이페이지 | 여행 리스트 | mock + savedTrips memory merge | user trips query, stats aggregate | `trips`, `trip_days`, `places`, `photos` | 높음 |
| 마이페이지 | 여행 삭제 | local memory/removeSaved only | trip delete/soft delete | `trips` cascade | 높음 |
| 설정 | 로그아웃/탈퇴 | Alert | Supabase Auth signOut/delete | Supabase Auth | 중간 |

## 4. 화면별 실제 데이터 연동 필요 지점

| 화면 | 현재 표시 데이터 | 현재 상태 | 필요한 Supabase 테이블 | Google API 여부 | 주의할 점 |
| --- | --- | --- | --- | --- | --- |
| 온보딩 | 사진첩 감지 후보, 분석 progress | mock provider + provider state | `users`, `trips`, `trip_days`, `photos` | Reverse Geocoding, Geocoding | 권한 거부/빈 결과/에러 상태 유지, 감지 job 중복 방지 |
| 홈 | 일상 홈, 여행 중 타임라인, photo import 결과 | `HOME_MOCK_DATA`, `HOME_TIMELINE_ITEMS`, 로컬 activeTrip | `trips`, `trip_days`, `places`, `photos`, records | Reverse Geocoding | active trip을 user별 1개로 제한할지 결정 |
| 여행 시작 모달 | 목적지/기간 | mock destination + local state | `trips`, `trip_days` | Places Autocomplete, Geocoding | 국가/도시 단위 선택과 place 단위 검색 분리 |
| 여행 정보 수정 모달 | 여행지/일자 | local patch | `trips`, `trip_days` | Geocoding | 날짜 변경 시 trip_days 재생성/이동 정책 필요 |
| record-day-detail | 감지된 하루의 장소/사진/지도 | mock constants + local edits | `trips`, `trip_days`, `places`, `photos`, records | Maps SDK, Reverse Geocoding | 감지 후보를 저장 전 임시 상태로 둘지 DB에 둘지 결정 |
| archive-day-detail | 저장된 여행 하루, 장소 카드, 지도 | mock/savedTrips + local patch | `trips`, `trip_days`, `places`, `photos`, records | Maps SDK | record-day-detail과 PlaceEntryCard 공유 영향 큼 |
| place-detail | 장소 상세, 사진, 기록 | mock detail + route params + local state | `places`, `photos`, records | Place Details, Maps URL | route params fallback 제거하고 placeId 조회 중심으로 전환 |
| 장소 추가 모달 | 장소/일자/시간/기록/사진 | local form, ImagePicker uri | `places`, `photos`, records | Places Autocomplete, Place Details | `mock/manual/google` source 타입 확장 필요 |
| 장소 정보 수정 모달 | 기존 장소 필드 | local form | `places` | Place Details 선택적 갱신 | 사진 추가 숨김 옵션 유지 |
| 사진 전체화면 뷰어 | ImageSource 배열, index | parent local state | `photos`, records 연결 | 없음 | photo id를 잃지 않게 source와 id를 함께 전달 |
| 사진 그리드 보기 | 장소 사진 목록/선택 모드 | local route/state | `photos` | 없음 | view/select/delete/cover 모드 분리 유지 |
| 마이페이지 | 프로필, 지도 placeholder, 여행 리스트 | profile provider + mock/savedTrips | `users`, `trips`, `places`, `photos` | Maps SDK | 통계는 DB aggregate 또는 materialized view 검토 |
| 여행 리스트 | 여행 책자 카드/정렬 | mock + memory merge | `trips`, `photos` | 없음 | 삭제 후 cascade/soft delete 정책 필요 |

## 5. Supabase 테이블 초안

### users

| 필드 | 타입 제안 | 비고 |
| --- | --- | --- |
| `id` | uuid PK | Supabase Auth user id 참조 |
| `name` | text | 기본 `User_name` |
| `based_in` | text | 표시용 도시/국가 |
| `based_in_city` | text nullable | 구조화된 city |
| `based_in_country` | text nullable | 구조화된 country |
| `based_in_place_id` | text nullable | Google place id |
| `based_in_latitude` / `based_in_longitude` | double precision nullable | 위치 기반 감지 보정 |
| `bio` | text | 자기소개 |
| `travel_styles` | text[] | 복수 선택 |
| `profile_image_url` | text nullable | Storage public/signed URL |
| `created_at`, `updated_at` | timestamptz | audit |

### trips

요청 필드 모두 필요합니다.

| 필드 | 타입 제안 | 비고 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK users.id | RLS 기준 |
| `title` | text | 책자 제목 |
| `destination_city` | text | 표시/검색용 |
| `destination_country` | text | 표시/검색용 |
| `destination_city_ko`, `destination_country_ko` | text nullable | 한국어 표시 안정화 |
| `start_date`, `end_date` | date | end undecided 가능하면 nullable 또는 `is_end_date_undecided` |
| `is_active` | boolean default false | 여행 중 상태 |
| `status` | text | detected/draft/active/archived/deleted |
| `cover_photo_id` | uuid nullable FK photos.id | 대표사진 |
| `created_at`, `updated_at` | timestamptz | |

### trip_days

| 필드 | 타입 제안 | 비고 |
| --- | --- | --- |
| `id` | uuid PK | |
| `trip_id` | uuid FK trips.id | |
| `date` | date | |
| `day_index` | int | 1일차 기준 |
| `created_at` | timestamptz | |

### places

요청 필드 모두 필요합니다.

| 필드 | 타입 제안 | 비고 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK users.id | RLS/검색 편의 |
| `trip_id` | uuid FK trips.id | |
| `trip_day_id` | uuid FK trip_days.id | 날짜 변경 시 갱신 |
| `name` | text | Google/원본 이름 |
| `custom_name` | text nullable | 사용자가 수정한 이름 |
| `memo` | text nullable | 장소 메모 |
| `address` | text nullable | formatted address |
| `city`, `country` | text nullable | 원본 또는 표시용 |
| `city_ko`, `country_ko` | text nullable | 한국어 표시 |
| `latitude`, `longitude` | double precision nullable | 지도/거리 |
| `google_place_id` | text nullable | Google Place Details |
| `google_types` | text[] nullable | 카테고리 mapping |
| `google_rating` | numeric nullable | |
| `google_user_ratings_total` | int nullable | |
| `google_maps_url` | text nullable | |
| `cover_photo_id` | uuid nullable FK photos.id | 대표사진 |
| `visited_at` | timestamptz nullable | 정렬 기준 |
| `created_at`, `updated_at` | timestamptz | |

추가 권장: `source`(google/manual/photo_cluster), `deleted_at`(soft delete), `timezone`.

### photos

요청 필드 모두 필요합니다.

| 필드 | 타입 제안 | 비고 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK users.id | RLS |
| `trip_id` | uuid nullable FK trips.id | 감지 전에는 nullable 가능 |
| `trip_day_id` | uuid nullable FK trip_days.id | |
| `place_id` | uuid nullable FK places.id | |
| `image_url` | text | Storage URL |
| `thumbnail_url` | text nullable | grid 최적화 |
| `local_uri` | text nullable | 업로드 전 임시 |
| `taken_at` | timestamptz nullable | EXIF |
| `latitude`, `longitude` | double precision nullable | EXIF GPS |
| `city`, `country` | text nullable | reverse geocoding |
| `exif_data` | jsonb nullable | 원본 metadata |
| `created_at`, `updated_at` | timestamptz | |

추가 필요 가능성: records 테이블. 현재 기록 기능이 있으므로 `records(id,user_id,trip_id,trip_day_id,place_id,text,visited_at,created_at,updated_at)`와 `record_photos(record_id,photo_id,sort_order)`가 필요합니다.

## 6. Google API 연동 지점

| API | 사용 화면 | 사용 목적 | 호출 위치 | 저장 데이터 | 비용 관리 주의점 |
| --- | --- | --- | --- | --- | --- |
| Google Maps SDK | record-day-detail, archive-day-detail, 마이페이지 지도, place-detail 지도 확장 | 지도, 마커, 경로/방문 장소 표시 | 앱 직접 사용 | place lat/lng, trip route bounds | 지도 로딩 화면 최소화, 마커 데이터만 DB에서 조회 |
| Places Autocomplete | 장소 추가 모달, 장소 정보 수정, 여행지 선택, Based in 위치 선택 | 도시/국가/장소 검색 | Supabase Edge Function 권장 | place_id, display text, structured_formatting | session token 사용, debounce, 최소 글자 수 |
| Place Details | 장소 선택 후 저장, place-detail 메타 보강 | 주소, 위치, types, rating, maps url | Edge Function 권장 | `google_place_id`, address, lat/lng, types, rating | 필요한 fields만 요청 |
| Nearby Search | 사진 GPS 기반 장소 후보 추천, 수동 장소 추가 추천 | 사진 좌표 주변 장소 후보 | Edge Function 권장 | 후보 place_id/name/distance/types | 사용 시점 제한, radius 제한, 캐싱 |
| Geocoding / Reverse Geocoding | 사진 감지, 여행지 도시/국가 정규화, Based in | GPS→도시/국가, 도시→좌표 | Edge Function 권장 | city/country/country_code/lat/lng | 중복 좌표 캐싱, batch 전략 필요 |

## 7. 위험하거나 먼저 정리해야 할 코드

| 위험 지점 | 이유 | 선행 정리 제안 |
| --- | --- | --- |
| `PlaceEntry` 형태가 record/archive/home/place-detail에서 조금씩 다름 | 실제 DB row와 mapping 시 누락 위험 | `PlaceEntryViewModel`과 DB `Place` 타입 분리 |
| `place-detail`이 mock + route params + local state를 섞어 상세 생성 | 실제 조회 전환 시 stale data 가능 | `placeId` 기반 fetch hook으로 단일화 |
| 사진 데이터가 `ImageSourcePropType`, uri string, photo id로 혼재 | 저장/삭제/대표사진 연결 정합성 위험 | `PhotoViewModel { id, uri, thumbnailUri, source }` 도입 |
| `savedMyPageTrips.ts` module-level store | 앱 재시작/멀티 화면 동기화 불가 | Supabase query + React Query/Zustand cache 검토 |
| `PlaceSearchModal` 내부 mock과 `mockPlaceSearchProvider` 중복 | Google Provider 교체 시 한쪽 누락 가능 | 공통 `placeSearchProvider` 하나로 통합 |
| 사진 삭제/장소 삭제/여행 삭제 | cascade 정책 미정 | hard delete/soft delete, Storage cleanup 정책 결정 |
| 날짜 변경 | trip_day_id 이동과 사진/장소 재연결 필요 | 날짜 변경 service 함수 선행 설계 |
| record-day-detail와 archive-day-detail이 PlaceCreateModal/PlaceEntryCard 공유 | prop 추가 시 양쪽 회귀 위험 | 공통 컴포넌트 contract 문서화 및 최소 통합 테스트 |
| Google 비용 | Autocomplete/Details/Nearby를 앱에서 남발 가능 | Edge Function, session token, cache, field mask 필수 |
| 일부 mock 한글 문자열 깨짐 | 실제 데이터 연동 전 QA 혼선 | mock 상수 또는 seed 데이터 UTF-8 정리 |

## 8. Day 2로 넘어가기 전 결정해야 할 사항

1. records 테이블을 별도 생성할지, places.memo에 흡수할지 결정해야 합니다. 현재 UI는 복수 기록과 기록별 사진 연결이 있으므로 별도 records + record_photos 권장.
2. 여행 삭제/장소 삭제/사진 삭제를 soft delete로 할지 hard delete로 할지 결정해야 합니다.
3. 사진 원본을 앱 local uri로만 둘지 Supabase Storage에 업로드할지, 업로드 타이밍을 결정해야 합니다.
4. 감지 후보를 DB에 저장하는 `detected_trips`/`photo_import_jobs` 계층을 둘지 결정해야 합니다.
5. Google API key를 앱에 직접 넣지 않고 Edge Function으로 감쌀 범위를 결정해야 합니다.
6. 지도는 Day 2에 실제 SDK까지 붙일지, 먼저 DB schema/service layer만 붙일지 결정해야 합니다.
7. 한국어 표시용 city/country/category를 DB에 저장할지, 표시 유틸에서만 normalize할지 결정해야 합니다.
8. 상태 관리를 React Query/Zustand/Supabase realtime 중 무엇으로 정리할지 결정해야 합니다.

## 9. Day 2 추천 작업 순서

1. Supabase 프로젝트 환경 변수와 client 초기화 파일 추가.
2. DB migration 초안 작성: `users`, `trips`, `trip_days`, `places`, `photos`, `records`, `record_photos`.
3. Storage bucket 정책 초안 작성: `photos`, `avatars`.
4. RLS 정책 초안 작성: user_id 기반 select/insert/update/delete.
5. `services/trips`, `services/places`, `services/photos`, `services/records` service layer skeleton 작성.
6. mock constants를 바로 제거하지 말고 repository/provider interface를 만들고 fallback으로 유지.
7. 우선 마이페이지 여행 리스트를 Supabase read-only query로 연결.
8. 그 다음 place-detail을 `placeId` 조회 중심으로 연결.
9. 마지막으로 장소 추가/기록 추가/사진 추가 같은 write flow를 하나씩 연결.
10. Google Places는 장소 검색 provider부터 Edge Function 형태로 붙이고, Details 저장은 장소 저장 시점에만 호출.

## 이번 Day 1에서 코드 수정 여부

기능/디자인 코드는 수정하지 않았습니다. 이 문서만 추가했습니다.
