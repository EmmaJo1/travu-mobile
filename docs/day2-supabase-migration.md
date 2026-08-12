# Day 2 Supabase Migration SQL

작성일: 2026-07-03

## A. 실행 전 주의사항

1. 이 SQL은 Supabase SQL Editor에 한 번에 붙여넣어 실행하는 것을 기준으로 작성했습니다.
2. 현재 프로젝트에 기존 앱 테이블이 없다는 전제를 둡니다.
3. `auth.users`는 Supabase Auth가 제공하는 schema입니다. 직접 생성하지 않습니다.
4. MVP 삭제 정책은 soft delete입니다. 앱과 service layer는 `deleted_at is null`인 row만 조회해야 합니다.
5. Storage 원본 파일은 앱에서 즉시 삭제하지 않습니다. 삭제된 DB row의 파일 cleanup은 추후 별도 job/Edge Function으로 분리합니다.
6. `photos.thumbnail_url`은 MVP에서 앱이 직접 생성해 업로드한 썸네일 URL입니다. Edge Function thumbnail 생성은 포함하지 않습니다.
7. Google Edge Function은 아직 구현하지 않습니다. 이 문서는 DB/schema/storage/RLS까지만 포함합니다.
8. SQL 실행 후 Supabase Dashboard의 Table Editor, Authentication, Storage에서 생성 상태를 확인하세요.

## B. Supabase SQL Editor에 붙여넣을 전체 migration SQL

```sql
begin;

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 2. Common updated_at trigger function
-- ---------------------------------------------------------------------------

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete restrict,
  name text not null default 'User_name',
  based_in text,
  based_in_city text,
  based_in_country text,
  based_in_country_code text,
  based_in_google_place_id text,
  based_in_latitude double precision,
  based_in_longitude double precision,
  bio text,
  travel_styles text[] not null default '{}',
  profile_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.photo_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  status text not null default 'queued',
  progress integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint photo_import_jobs_status_check check (
    status in ('queued', 'running', 'success', 'empty', 'error', 'permission_denied', 'cancelled')
  ),
  constraint photo_import_jobs_progress_check check (progress >= 0 and progress <= 100)
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  destination_city text,
  destination_country text,
  destination_city_ko text,
  destination_country_ko text,
  start_date date,
  end_date date,
  is_end_date_undecided boolean not null default false,
  status text not null default 'draft',
  cover_photo_id uuid,
  photo_import_job_id uuid references public.photo_import_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint trips_status_check check (
    status in ('detected', 'draft', 'active', 'archived', 'ignored')
  )
);

create table if not exists public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete restrict,
  date date not null,
  day_index integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint trip_days_day_index_check check (day_index > 0)
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  trip_id uuid not null references public.trips(id) on delete restrict,
  trip_day_id uuid references public.trip_days(id) on delete set null,
  name text not null,
  custom_name text,
  memo text,
  address text,
  city text,
  country text,
  city_ko text,
  country_ko text,
  latitude double precision,
  longitude double precision,
  google_place_id text,
  google_types text[],
  google_rating numeric,
  google_user_ratings_total integer,
  google_maps_url text,
  source text not null default 'manual',
  cover_photo_id uuid,
  visited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint places_source_check check (source in ('google', 'manual', 'photo_cluster'))
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  trip_id uuid references public.trips(id) on delete restrict,
  trip_day_id uuid references public.trip_days(id) on delete set null,
  place_id uuid references public.places(id) on delete set null,
  image_url text,
  thumbnail_url text,
  local_uri text,
  taken_at timestamptz,
  latitude double precision,
  longitude double precision,
  city text,
  country text,
  city_ko text,
  country_ko text,
  exif_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  trip_id uuid not null references public.trips(id) on delete restrict,
  trip_day_id uuid references public.trip_days(id) on delete set null,
  place_id uuid not null references public.places(id) on delete restrict,
  text text,
  visited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.record_photos (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records(id) on delete restrict,
  photo_id uuid not null references public.photos(id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint record_photos_sort_order_check check (sort_order >= 0)
);

-- Add circular/late foreign keys after both sides exist.
alter table public.trips
  add constraint trips_cover_photo_id_fkey
  foreign key (cover_photo_id)
  references public.photos(id)
  on delete set null;

alter table public.places
  add constraint places_cover_photo_id_fkey
  foreign key (cover_photo_id)
  references public.photos(id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- 4. updated_at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists update_users_updated_at on public.users;
create trigger update_users_updated_at
before update on public.users
for each row execute function public.update_updated_at_column();

drop trigger if exists update_photo_import_jobs_updated_at on public.photo_import_jobs;
create trigger update_photo_import_jobs_updated_at
before update on public.photo_import_jobs
for each row execute function public.update_updated_at_column();

drop trigger if exists update_trips_updated_at on public.trips;
create trigger update_trips_updated_at
before update on public.trips
for each row execute function public.update_updated_at_column();

drop trigger if exists update_trip_days_updated_at on public.trip_days;
create trigger update_trip_days_updated_at
before update on public.trip_days
for each row execute function public.update_updated_at_column();

drop trigger if exists update_places_updated_at on public.places;
create trigger update_places_updated_at
before update on public.places
for each row execute function public.update_updated_at_column();

drop trigger if exists update_photos_updated_at on public.photos;
create trigger update_photos_updated_at
before update on public.photos
for each row execute function public.update_updated_at_column();

drop trigger if exists update_records_updated_at on public.records;
create trigger update_records_updated_at
before update on public.records
for each row execute function public.update_updated_at_column();

drop trigger if exists update_record_photos_updated_at on public.record_photos;
create trigger update_record_photos_updated_at
before update on public.record_photos
for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 5. Indexes
-- ---------------------------------------------------------------------------

create index if not exists users_deleted_at_idx on public.users(deleted_at);

create index if not exists photo_import_jobs_user_id_idx on public.photo_import_jobs(user_id);
create index if not exists photo_import_jobs_status_idx on public.photo_import_jobs(status);
create index if not exists photo_import_jobs_deleted_at_idx on public.photo_import_jobs(deleted_at);

create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists trips_status_idx on public.trips(status);
create index if not exists trips_deleted_at_idx on public.trips(deleted_at);
create index if not exists trips_photo_import_job_id_idx on public.trips(photo_import_job_id);
create index if not exists trips_cover_photo_id_idx on public.trips(cover_photo_id);

create index if not exists trip_days_trip_id_idx on public.trip_days(trip_id);
create index if not exists trip_days_date_idx on public.trip_days(date);
create index if not exists trip_days_deleted_at_idx on public.trip_days(deleted_at);

create index if not exists places_user_id_idx on public.places(user_id);
create index if not exists places_trip_id_idx on public.places(trip_id);
create index if not exists places_trip_day_id_idx on public.places(trip_day_id);
create index if not exists places_google_place_id_idx on public.places(google_place_id);
create index if not exists places_visited_at_idx on public.places(visited_at);
create index if not exists places_deleted_at_idx on public.places(deleted_at);
create index if not exists places_cover_photo_id_idx on public.places(cover_photo_id);

create index if not exists photos_user_id_idx on public.photos(user_id);
create index if not exists photos_trip_id_idx on public.photos(trip_id);
create index if not exists photos_trip_day_id_idx on public.photos(trip_day_id);
create index if not exists photos_place_id_idx on public.photos(place_id);
create index if not exists photos_taken_at_idx on public.photos(taken_at);
create index if not exists photos_deleted_at_idx on public.photos(deleted_at);

create index if not exists records_user_id_idx on public.records(user_id);
create index if not exists records_trip_id_idx on public.records(trip_id);
create index if not exists records_trip_day_id_idx on public.records(trip_day_id);
create index if not exists records_place_id_idx on public.records(place_id);
create index if not exists records_visited_at_idx on public.records(visited_at);
create index if not exists records_deleted_at_idx on public.records(deleted_at);

create index if not exists record_photos_record_id_idx on public.record_photos(record_id);
create index if not exists record_photos_photo_id_idx on public.record_photos(photo_id);
create index if not exists record_photos_deleted_at_idx on public.record_photos(deleted_at);

-- Partial unique indexes.
create unique index if not exists trips_one_active_per_user_idx
on public.trips(user_id)
where status = 'active' and deleted_at is null;

create unique index if not exists trip_days_trip_id_date_active_idx
on public.trip_days(trip_id, date)
where deleted_at is null;

create unique index if not exists trip_days_trip_id_day_index_active_idx
on public.trip_days(trip_id, day_index)
where deleted_at is null;

create unique index if not exists record_photos_record_id_photo_id_active_idx
on public.record_photos(record_id, photo_id)
where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.photo_import_jobs enable row level security;
alter table public.trips enable row level security;
alter table public.trip_days enable row level security;
alter table public.places enable row level security;
alter table public.photos enable row level security;
alter table public.records enable row level security;
alter table public.record_photos enable row level security;

-- users
drop policy if exists "Users can select own profile" on public.users;
create policy "Users can select own profile"
on public.users for select
using (id = auth.uid() and deleted_at is null);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
on public.users for insert
with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users for update
using (id = auth.uid())
with check (id = auth.uid());

-- photo_import_jobs
drop policy if exists "Users can select own photo import jobs" on public.photo_import_jobs;
create policy "Users can select own photo import jobs"
on public.photo_import_jobs for select
using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "Users can insert own photo import jobs" on public.photo_import_jobs;
create policy "Users can insert own photo import jobs"
on public.photo_import_jobs for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own photo import jobs" on public.photo_import_jobs;
create policy "Users can update own photo import jobs"
on public.photo_import_jobs for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- trips
drop policy if exists "Users can select own trips" on public.trips;
create policy "Users can select own trips"
on public.trips for select
using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "Users can insert own trips" on public.trips;
create policy "Users can insert own trips"
on public.trips for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own trips" on public.trips;
create policy "Users can update own trips"
on public.trips for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- trip_days
drop policy if exists "Users can select own trip days" on public.trip_days;
create policy "Users can select own trip days"
on public.trip_days for select
using (
  deleted_at is null
  and exists (
    select 1 from public.trips
    where trips.id = trip_days.trip_id
      and trips.user_id = auth.uid()
      and trips.deleted_at is null
  )
);

drop policy if exists "Users can insert own trip days" on public.trip_days;
create policy "Users can insert own trip days"
on public.trip_days for insert
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_days.trip_id
      and trips.user_id = auth.uid()
      and trips.deleted_at is null
  )
);

drop policy if exists "Users can update own trip days" on public.trip_days;
create policy "Users can update own trip days"
on public.trip_days for update
using (
  exists (
    select 1 from public.trips
    where trips.id = trip_days.trip_id
      and trips.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.trips
    where trips.id = trip_days.trip_id
      and trips.user_id = auth.uid()
  )
);

-- places
drop policy if exists "Users can select own places" on public.places;
create policy "Users can select own places"
on public.places for select
using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "Users can insert own places" on public.places;
create policy "Users can insert own places"
on public.places for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own places" on public.places;
create policy "Users can update own places"
on public.places for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- photos
drop policy if exists "Users can select own photos" on public.photos;
create policy "Users can select own photos"
on public.photos for select
using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "Users can insert own photos" on public.photos;
create policy "Users can insert own photos"
on public.photos for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own photos" on public.photos;
create policy "Users can update own photos"
on public.photos for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- records
drop policy if exists "Users can select own records" on public.records;
create policy "Users can select own records"
on public.records for select
using (user_id = auth.uid() and deleted_at is null);

drop policy if exists "Users can insert own records" on public.records;
create policy "Users can insert own records"
on public.records for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own records" on public.records;
create policy "Users can update own records"
on public.records for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- record_photos
drop policy if exists "Users can select own record photos" on public.record_photos;
create policy "Users can select own record photos"
on public.record_photos for select
using (
  deleted_at is null
  and (
    exists (
      select 1 from public.records
      where records.id = record_photos.record_id
        and records.user_id = auth.uid()
        and records.deleted_at is null
    )
    or exists (
      select 1 from public.photos
      where photos.id = record_photos.photo_id
        and photos.user_id = auth.uid()
        and photos.deleted_at is null
    )
  )
);

drop policy if exists "Users can insert own record photos" on public.record_photos;
create policy "Users can insert own record photos"
on public.record_photos for insert
with check (
  exists (
    select 1 from public.records
    where records.id = record_photos.record_id
      and records.user_id = auth.uid()
      and records.deleted_at is null
  )
  and exists (
    select 1 from public.photos
    where photos.id = record_photos.photo_id
      and photos.user_id = auth.uid()
      and photos.deleted_at is null
  )
);

drop policy if exists "Users can update own record photos" on public.record_photos;
create policy "Users can update own record photos"
on public.record_photos for update
using (
  exists (
    select 1 from public.records
    where records.id = record_photos.record_id
      and records.user_id = auth.uid()
  )
  or exists (
    select 1 from public.photos
    where photos.id = record_photos.photo_id
      and photos.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.records
    where records.id = record_photos.record_id
      and records.user_id = auth.uid()
  )
  and exists (
    select 1 from public.photos
    where photos.id = record_photos.photo_id
      and photos.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- 7. Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- MVP recommendation: avatars can be public for simple profile rendering.
-- If the product later needs private profiles, switch this bucket to private
-- and generate signed URLs from the app/service layer.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 8. Storage policies
-- ---------------------------------------------------------------------------

drop policy if exists "Users can read own photos objects" on storage.objects;
create policy "Users can read own photos objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload own photos objects" on storage.objects;
create policy "Users can upload own photos objects"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own photos objects" on storage.objects;
create policy "Users can update own photos objects"
on storage.objects for update
to authenticated
using (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Anyone can read avatars objects" on storage.objects;
create policy "Anyone can read avatars objects"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatars objects" on storage.objects;
create policy "Users can upload own avatars objects"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own avatars objects" on storage.objects;
create policy "Users can update own avatars objects"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own avatars objects" on storage.objects;
create policy "Users can delete own avatars objects"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
```

## C. 실행 후 확인해야 할 항목

SQL 실행 후 Supabase Dashboard 또는 SQL Editor에서 아래를 확인하세요.

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'users',
    'photo_import_jobs',
    'trips',
    'trip_days',
    'places',
    'photos',
    'records',
    'record_photos'
  )
order by table_name;
```

```sql
select tablename, policyname
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('photos', 'avatars');
```

```sql
select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'trips_one_active_per_user_idx',
    'trip_days_trip_id_date_active_idx',
    'trip_days_trip_id_day_index_active_idx',
    'record_photos_record_id_photo_id_active_idx'
  )
order by tablename, indexname;
```

확인 포인트:

- `trips_one_active_per_user_idx`가 생성되어 있어야 합니다.
- `photos.place_id`는 `on delete set null`입니다. 장소 hard delete가 발생해도 사진 row는 삭제되지 않습니다.
- `trips.cover_photo_id`, `places.cover_photo_id`는 late FK로 추가되어 있어야 합니다.
- 모든 앱 테이블에 RLS가 enable 되어 있어야 합니다.
- `photos` bucket은 private, `avatars` bucket은 public입니다.

## D. FK 순환 문제나 RLS 오류가 날 경우 수정 방법

### 1. cover_photo_id FK 오류

`trips.cover_photo_id` 또는 `places.cover_photo_id` FK 추가에서 오류가 나면 아래 순서로 확인합니다.

1. `photos` 테이블이 먼저 생성되었는지 확인합니다.
2. `trips.cover_photo_id`, `places.cover_photo_id` 컬럼이 uuid 타입인지 확인합니다.
3. 이미 같은 이름의 constraint가 있다면 constraint 이름을 확인 후 drop하고 다시 추가합니다.

수동 복구 예:

```sql
alter table public.trips drop constraint if exists trips_cover_photo_id_fkey;
alter table public.trips
  add constraint trips_cover_photo_id_fkey
  foreign key (cover_photo_id)
  references public.photos(id)
  on delete set null;

alter table public.places drop constraint if exists places_cover_photo_id_fkey;
alter table public.places
  add constraint places_cover_photo_id_fkey
  foreign key (cover_photo_id)
  references public.photos(id)
  on delete set null;
```

### 2. Storage policy 오류

`storage.foldername(name)` 관련 오류가 발생하면 Supabase Storage extension/schema가 준비되어 있는지 확인합니다.  
Supabase hosted project에서는 일반적으로 사용 가능합니다.

만약 정책 생성만 실패했다면 table migration은 유지하고 Storage 정책만 별도로 다시 실행하세요.

### 3. RLS로 insert가 막히는 경우

가장 흔한 원인:

- `users` row가 아직 없는데 `trips`를 먼저 insert함
- insert payload의 `user_id`가 `auth.uid()`와 다름
- anon key로 로그인 세션 없이 insert 시도함

Day 3 앱 연결 시에는 로그인 후 최초 profile bootstrap에서 `public.users` row를 먼저 upsert해야 합니다.

### 4. soft delete update가 막히는 경우

이 migration은 update policy에서 `deleted_at` 설정을 허용합니다.  
다만 update payload의 `user_id`를 다른 값으로 바꾸면 `with check`에 걸립니다.

soft delete 예:

```sql
update public.trips
set deleted_at = now()
where id = '<trip_id>'
  and user_id = auth.uid();
```

### 5. active trip unique index 오류

사용자당 active 여행은 `deleted_at is null` 상태에서 1개만 허용합니다.  
새 active trip을 만들기 전에 기존 active trip을 archived 또는 deleted 처리해야 합니다.

## E. Day 3에서 사용할 환경변수 이름

Expo 앱 기준 권장 이름:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Edge Function 내부/서버 환경 변수:

```text
GOOGLE_MAPS_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

주의:

- `EXPO_PUBLIC_*` 값은 앱 번들에 노출됩니다.
- Google server API key와 service role key는 절대 앱 코드에 넣지 않습니다.
- Places Autocomplete, Place Details, Nearby Search, Reverse Geocoding은 Edge Function에서만 서버 key를 사용합니다.

## F. Day 3에서 만들 파일 목록

Day 3 앱 연결 준비 파일:

```text
lib/supabase.ts
lib/queryClient.ts
providers/QueryProvider.tsx
services/supabase/users.ts
services/supabase/trips.ts
services/supabase/tripDays.ts
services/supabase/places.ts
services/supabase/photos.ts
services/supabase/records.ts
services/supabase/photoImportJobs.ts
types/supabase.ts
```

Day 3 이후 Edge Function 후보:

```text
supabase/functions/google-places-autocomplete/index.ts
supabase/functions/google-place-details/index.ts
supabase/functions/google-nearby-search/index.ts
supabase/functions/google-reverse-geocode/index.ts
supabase/functions/google-geocode/index.ts
```

Day 3에서 아직 하지 않을 것:

- 화면 UI 변경
- mock data 삭제
- Google Edge Function 구현
- React Query로 모든 화면을 즉시 교체
- Storage cleanup job 구현
