alter table public.photos
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists file_size bigint;

create unique index if not exists photos_storage_path_key
on public.photos (storage_path)
where storage_path is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'photos_width_positive_check'
      and conrelid = 'public.photos'::regclass
  ) then
    alter table public.photos
      add constraint photos_width_positive_check
      check (width is null or width > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'photos_height_positive_check'
      and conrelid = 'public.photos'::regclass
  ) then
    alter table public.photos
      add constraint photos_height_positive_check
      check (height is null or height > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'photos_file_size_nonnegative_check'
      and conrelid = 'public.photos'::regclass
  ) then
    alter table public.photos
      add constraint photos_file_size_nonnegative_check
      check (file_size is null or file_size >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'photos_mime_type_check'
      and conrelid = 'public.photos'::regclass
  ) then
    alter table public.photos
      add constraint photos_mime_type_check
      check (
        mime_type is null
        or mime_type in (
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/heic',
          'image/heif'
        )
      );
  end if;
end;
$$;

drop policy if exists "Users can select own photos" on public.photos;

create policy "Users can select own photos"
on public.photos
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and deleted_at is null
);

drop policy if exists "Users can insert own photos" on public.photos;

create policy "Users can insert own photos"
on public.photos
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and deleted_at is null
  and trip_id is not null
  and trip_day_id is not null
  and storage_path is not null
  and btrim(coalesce(file_name, '')) <> ''
  and mime_type in (
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  )
  and width > 0
  and height > 0
  and file_size > 0
  and local_uri is null
  and image_url is null
  and split_part(storage_path, '/', 1) = (select auth.uid())::text
  and split_part(storage_path, '/', 2) = trip_id::text
  and split_part(split_part(storage_path, '/', 3), '.', 1) = id::text
  and split_part(storage_path, '/', 4) = ''
  and exists (
    select 1
    from public.trips as parent_trip
    join public.trip_days as parent_trip_day
      on parent_trip_day.trip_id = parent_trip.id
    where parent_trip.id = photos.trip_id
      and parent_trip.user_id = (select auth.uid())
      and parent_trip.deleted_at is null
      and parent_trip_day.id = photos.trip_day_id
      and parent_trip_day.deleted_at is null
  )
  and (
    place_id is null
    or exists (
      select 1
      from public.places as parent_place
      where parent_place.id = photos.place_id
        and parent_place.user_id = (select auth.uid())
        and parent_place.trip_id = photos.trip_id
        and parent_place.trip_day_id = photos.trip_day_id
        and parent_place.deleted_at is null
    )
  )
);

drop policy if exists "Users can update own photos" on public.photos;

drop policy if exists "Users can read own photos objects" on storage.objects;

create policy "Users can read own photos objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'photos'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.trips as parent_trip
    where parent_trip.id::text = (storage.foldername(name))[2]
      and parent_trip.user_id = (select auth.uid())
      and parent_trip.deleted_at is null
  )
);

drop policy if exists "Users can upload own photos objects" on storage.objects;

create policy "Users can upload own photos objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'photos'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.trips as parent_trip
    where parent_trip.id::text = (storage.foldername(name))[2]
      and parent_trip.user_id = (select auth.uid())
      and parent_trip.deleted_at is null
  )
);

drop policy if exists "Users can update own photos objects" on storage.objects;
drop policy if exists "Users can delete own photos objects" on storage.objects;

create policy "Users can delete own photos objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'photos'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.trips as parent_trip
    where parent_trip.id::text = (storage.foldername(name))[2]
      and parent_trip.user_id = (select auth.uid())
      and parent_trip.deleted_at is null
  )
);
