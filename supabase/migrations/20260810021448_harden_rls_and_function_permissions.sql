revoke all privileges on table
  public.users,
  public.photo_import_jobs,
  public.trips,
  public.trip_days,
  public.trip_destinations,
  public.places,
  public.photos,
  public.records,
  public.record_photos
from anon;

revoke delete, truncate, references, trigger on table
  public.users,
  public.photo_import_jobs,
  public.trips,
  public.trip_days,
  public.trip_destinations,
  public.places,
  public.photos,
  public.records,
  public.record_photos
from authenticated;

grant select, insert, update on table
  public.users,
  public.photo_import_jobs,
  public.trips,
  public.trip_days,
  public.trip_destinations,
  public.places,
  public.photos,
  public.records,
  public.record_photos
to authenticated;

alter policy "Users can insert own photo import jobs"
on public.photo_import_jobs
to authenticated
with check ((select auth.uid()) = user_id);

alter policy "Users can select own photo import jobs"
on public.photo_import_jobs
to authenticated
using (
  (select auth.uid()) = user_id
  and deleted_at is null
);

alter policy "Users can update own photo import jobs"
on public.photo_import_jobs
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy "Users can insert own places"
on public.places
to authenticated
with check ((select auth.uid()) = user_id);

alter policy "Users can update own places"
on public.places
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy "Users can insert own record photos"
on public.record_photos
to authenticated
with check (
  exists (
    select 1
    from public.records as linked_record
    join public.photos as linked_photo
      on linked_photo.id = record_photos.photo_id
    where linked_record.id = record_photos.record_id
      and linked_record.user_id = (select auth.uid())
      and linked_photo.user_id = (select auth.uid())
      and linked_record.deleted_at is null
      and linked_photo.deleted_at is null
      and linked_photo.trip_id is not distinct from linked_record.trip_id
      and linked_photo.trip_day_id is not distinct from linked_record.trip_day_id
      and linked_photo.place_id is not distinct from linked_record.place_id
  )
);

alter policy "Users can select own record photos"
on public.record_photos
to authenticated
using (
  record_photos.deleted_at is null
  and exists (
    select 1
    from public.records as linked_record
    join public.photos as linked_photo
      on linked_photo.id = record_photos.photo_id
    where linked_record.id = record_photos.record_id
      and linked_record.user_id = (select auth.uid())
      and linked_photo.user_id = (select auth.uid())
      and linked_record.deleted_at is null
      and linked_photo.deleted_at is null
      and linked_photo.trip_id is not distinct from linked_record.trip_id
      and linked_photo.trip_day_id is not distinct from linked_record.trip_day_id
      and linked_photo.place_id is not distinct from linked_record.place_id
  )
);

alter policy "Users can update own record photos"
on public.record_photos
to authenticated
using (
  exists (
    select 1
    from public.records as linked_record
    join public.photos as linked_photo
      on linked_photo.id = record_photos.photo_id
    where linked_record.id = record_photos.record_id
      and linked_record.user_id = (select auth.uid())
      and linked_photo.user_id = (select auth.uid())
      and linked_photo.trip_id is not distinct from linked_record.trip_id
      and linked_photo.trip_day_id is not distinct from linked_record.trip_day_id
      and linked_photo.place_id is not distinct from linked_record.place_id
  )
)
with check (
  exists (
    select 1
    from public.records as linked_record
    join public.photos as linked_photo
      on linked_photo.id = record_photos.photo_id
    where linked_record.id = record_photos.record_id
      and linked_record.user_id = (select auth.uid())
      and linked_photo.user_id = (select auth.uid())
      and linked_photo.trip_id is not distinct from linked_record.trip_id
      and linked_photo.trip_day_id is not distinct from linked_record.trip_day_id
      and linked_photo.place_id is not distinct from linked_record.place_id
  )
);

alter policy "Users can insert own trip days"
on public.trip_days
to authenticated
with check (
  exists (
    select 1
    from public.trips as parent_trip
    where parent_trip.id = trip_days.trip_id
      and parent_trip.user_id = (select auth.uid())
      and parent_trip.deleted_at is null
  )
);

alter policy "Users can update own trip days"
on public.trip_days
to authenticated
using (
  exists (
    select 1
    from public.trips as parent_trip
    where parent_trip.id = trip_days.trip_id
      and parent_trip.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.trips as parent_trip
    where parent_trip.id = trip_days.trip_id
      and parent_trip.user_id = (select auth.uid())
  )
);

alter policy "Users can insert own trips"
on public.trips
to authenticated
with check ((select auth.uid()) = user_id);

alter policy "Users can insert own profile"
on public.users
to authenticated
with check ((select auth.uid()) = id);

alter policy "Users can select own profile"
on public.users
to authenticated
using (
  (select auth.uid()) = id
  and deleted_at is null
);

alter policy "Users can update own profile"
on public.users
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

alter function public.update_updated_at_column() security invoker;

revoke execute on function public.rls_auto_enable()
from public, anon, authenticated;
revoke execute on function public.update_updated_at_column()
from public, anon, authenticated;
revoke execute on function public.protect_record_update_fields()
from public, anon, authenticated;

revoke execute on function public.sync_active_trip_destinations(uuid, jsonb)
from public, anon;
grant execute on function public.sync_active_trip_destinations(uuid, jsonb)
to authenticated;

revoke execute on function public.ensure_photo_covers_for_trip(uuid)
from public, anon;
grant execute on function public.ensure_photo_covers_for_trip(uuid)
to authenticated;

revoke execute on function public.set_place_cover_photo(uuid, uuid)
from public, anon;
grant execute on function public.set_place_cover_photo(uuid, uuid)
to authenticated;

revoke execute on function public.set_trip_cover_photo(uuid, uuid)
from public, anon;
grant execute on function public.set_trip_cover_photo(uuid, uuid)
to authenticated;

revoke execute on function public.soft_delete_photo(uuid)
from public, anon;
grant execute on function public.soft_delete_photo(uuid)
to authenticated;

revoke execute on function public.soft_delete_record_photo_links(uuid, uuid[])
from public, anon;
grant execute on function public.soft_delete_record_photo_links(uuid, uuid[])
to authenticated;

revoke execute on function public.set_trip_day_cover_photo(uuid, uuid)
from public, anon, authenticated;

revoke execute on function public.repair_trip_day_cover_after_photo_soft_delete()
from public, anon, authenticated;
revoke execute on function public.repair_trip_day_cover_after_place_soft_delete()
from public, anon, authenticated;
