-- Repair active descendants left behind by legacy trip-only soft deletes.
update public.record_photos as target_link
set
  deleted_at = parent_trip.deleted_at,
  updated_at = now()
from public.records as linked_record
join public.trips as parent_trip
  on parent_trip.id = linked_record.trip_id
where target_link.record_id = linked_record.id
  and linked_record.user_id = parent_trip.user_id
  and parent_trip.deleted_at is not null
  and target_link.deleted_at is null;

update public.records as target_record
set
  deleted_at = parent_trip.deleted_at,
  updated_at = now()
from public.trips as parent_trip
where parent_trip.id = target_record.trip_id
  and target_record.user_id = parent_trip.user_id
  and parent_trip.deleted_at is not null
  and target_record.deleted_at is null;

update public.trip_destinations as target_destination
set
  deleted_at = parent_trip.deleted_at,
  updated_at = now()
from public.trips as parent_trip
where parent_trip.id = target_destination.trip_id
  and parent_trip.deleted_at is not null
  and target_destination.deleted_at is null;

-- Delete days before places/photos so legacy cover triggers ignore deleted days.
update public.trip_days as target_day
set
  deleted_at = parent_trip.deleted_at,
  updated_at = now()
from public.trips as parent_trip
where parent_trip.id = target_day.trip_id
  and parent_trip.deleted_at is not null
  and target_day.deleted_at is null;

update public.places as target_place
set
  deleted_at = parent_trip.deleted_at,
  updated_at = now()
from public.trips as parent_trip
where parent_trip.id = target_place.trip_id
  and target_place.user_id = parent_trip.user_id
  and parent_trip.deleted_at is not null
  and target_place.deleted_at is null;

update public.photos as target_photo
set
  deleted_at = parent_trip.deleted_at,
  updated_at = now()
from public.trips as parent_trip
where parent_trip.id = target_photo.trip_id
  and target_photo.user_id = parent_trip.user_id
  and parent_trip.deleted_at is not null
  and target_photo.deleted_at is null;

create or replace function public.soft_delete_place_tree(p_place_id uuid)
returns table (
  place_id uuid,
  trip_id uuid,
  trip_day_id uuid,
  deleted_at timestamptz,
  already_deleted boolean,
  deleted_record_photo_count bigint,
  deleted_record_count bigint,
  deleted_photo_count bigint,
  trip_cover_photo_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_place public.places%rowtype;
  v_trip public.trips%rowtype;
  v_deleted_at timestamptz;
  v_already_deleted boolean;
  v_deleted_record_photo_count bigint := 0;
  v_deleted_record_count bigint := 0;
  v_deleted_photo_count bigint := 0;
  v_trip_cover_photo_id uuid;
begin
  if v_user_id is null then
    raise exception 'Place deletion is not permitted.' using errcode = '42501';
  end if;

  select target_place.*
  into v_place
  from public.places as target_place
  where target_place.id = p_place_id
    and target_place.user_id = v_user_id;

  if not found then
    raise exception 'Place deletion is not permitted.' using errcode = '42501';
  end if;

  select parent_trip.*
  into v_trip
  from public.trips as parent_trip
  where parent_trip.id = v_place.trip_id
    and parent_trip.user_id = v_user_id
    and parent_trip.deleted_at is null
  for update;

  if not found then
    raise exception 'Place deletion is not permitted.' using errcode = '42501';
  end if;

  select target_place.*
  into v_place
  from public.places as target_place
  where target_place.id = p_place_id
    and target_place.user_id = v_user_id
    and target_place.trip_id = v_trip.id
  for update;

  if not found then
    raise exception 'Place deletion is not permitted.' using errcode = '42501';
  end if;

  v_already_deleted := v_place.deleted_at is not null;
  v_deleted_at := coalesce(v_place.deleted_at, now());

  update public.record_photos as target_link
  set
    deleted_at = v_deleted_at,
    updated_at = now()
  where target_link.deleted_at is null
    and exists (
      select 1
      from public.records as linked_record
      where linked_record.id = target_link.record_id
        and linked_record.user_id = v_user_id
        and linked_record.trip_id = v_trip.id
        and linked_record.place_id = v_place.id
    );
  get diagnostics v_deleted_record_photo_count = row_count;

  update public.records as target_record
  set
    deleted_at = v_deleted_at,
    updated_at = now()
  where target_record.user_id = v_user_id
    and target_record.trip_id = v_trip.id
    and target_record.place_id = v_place.id
    and target_record.deleted_at is null;
  get diagnostics v_deleted_record_count = row_count;

  update public.photos as target_photo
  set
    deleted_at = v_deleted_at,
    updated_at = now()
  where target_photo.user_id = v_user_id
    and target_photo.trip_id = v_trip.id
    and target_photo.place_id = v_place.id
    and target_photo.deleted_at is null;
  get diagnostics v_deleted_photo_count = row_count;

  update public.places as target_place
  set
    deleted_at = v_deleted_at,
    updated_at = now()
  where target_place.id = v_place.id
    and target_place.user_id = v_user_id
    and target_place.deleted_at is null;

  select cover_result.trip_cover_photo_id
  into v_trip_cover_photo_id
  from public.ensure_photo_covers_for_trip(v_trip.id) as cover_result;

  return query
  select
    v_place.id,
    v_trip.id,
    v_place.trip_day_id,
    v_deleted_at,
    v_already_deleted,
    v_deleted_record_photo_count,
    v_deleted_record_count,
    v_deleted_photo_count,
    v_trip_cover_photo_id;
end;
$$;

create or replace function public.soft_delete_trip_tree(p_trip_id uuid)
returns table (
  trip_id uuid,
  deleted_at timestamptz,
  already_deleted boolean,
  deleted_record_photo_count bigint,
  deleted_record_count bigint,
  deleted_destination_count bigint,
  deleted_trip_day_count bigint,
  deleted_place_count bigint,
  deleted_photo_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip public.trips%rowtype;
  v_deleted_at timestamptz;
  v_already_deleted boolean;
  v_deleted_record_photo_count bigint := 0;
  v_deleted_record_count bigint := 0;
  v_deleted_destination_count bigint := 0;
  v_deleted_trip_day_count bigint := 0;
  v_deleted_place_count bigint := 0;
  v_deleted_photo_count bigint := 0;
begin
  if v_user_id is null then
    raise exception 'Trip deletion is not permitted.' using errcode = '42501';
  end if;

  select target_trip.*
  into v_trip
  from public.trips as target_trip
  where target_trip.id = p_trip_id
    and target_trip.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Trip deletion is not permitted.' using errcode = '42501';
  end if;

  v_already_deleted := v_trip.deleted_at is not null;
  v_deleted_at := coalesce(v_trip.deleted_at, now());

  update public.record_photos as target_link
  set
    deleted_at = v_deleted_at,
    updated_at = now()
  where target_link.deleted_at is null
    and exists (
      select 1
      from public.records as linked_record
      where linked_record.id = target_link.record_id
        and linked_record.user_id = v_user_id
        and linked_record.trip_id = v_trip.id
    );
  get diagnostics v_deleted_record_photo_count = row_count;

  update public.records as target_record
  set
    deleted_at = v_deleted_at,
    updated_at = now()
  where target_record.user_id = v_user_id
    and target_record.trip_id = v_trip.id
    and target_record.deleted_at is null;
  get diagnostics v_deleted_record_count = row_count;

  update public.trip_destinations as target_destination
  set
    deleted_at = v_deleted_at,
    updated_at = now()
  where target_destination.trip_id = v_trip.id
    and target_destination.deleted_at is null;
  get diagnostics v_deleted_destination_count = row_count;

  update public.trip_days as target_day
  set
    deleted_at = v_deleted_at,
    updated_at = now()
  where target_day.trip_id = v_trip.id
    and target_day.deleted_at is null;
  get diagnostics v_deleted_trip_day_count = row_count;

  update public.places as target_place
  set
    deleted_at = v_deleted_at,
    updated_at = now()
  where target_place.user_id = v_user_id
    and target_place.trip_id = v_trip.id
    and target_place.deleted_at is null;
  get diagnostics v_deleted_place_count = row_count;

  update public.photos as target_photo
  set
    deleted_at = v_deleted_at,
    updated_at = now()
  where target_photo.user_id = v_user_id
    and target_photo.trip_id = v_trip.id
    and target_photo.deleted_at is null;
  get diagnostics v_deleted_photo_count = row_count;

  update public.trips as target_trip
  set
    deleted_at = v_deleted_at,
    updated_at = now()
  where target_trip.id = v_trip.id
    and target_trip.user_id = v_user_id
    and target_trip.deleted_at is null;

  return query
  select
    v_trip.id,
    v_deleted_at,
    v_already_deleted,
    v_deleted_record_photo_count,
    v_deleted_record_count,
    v_deleted_destination_count,
    v_deleted_trip_day_count,
    v_deleted_place_count,
    v_deleted_photo_count;
end;
$$;

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
  )
);

create or replace function public.list_pending_photo_storage_cleanup(
  p_limit integer default 1000
)
returns table (
  photo_id uuid,
  trip_id uuid,
  storage_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 1000), 1000));
begin
  if v_user_id is null then
    raise exception 'Photo storage cleanup is not permitted.' using errcode = '42501';
  end if;

  return query
  select
    target_photo.id,
    target_photo.trip_id,
    target_photo.storage_path
  from public.photos as target_photo
  join public.trips as parent_trip
    on parent_trip.id = target_photo.trip_id
   and parent_trip.user_id = v_user_id
  join storage.objects as stored_object
    on stored_object.bucket_id = 'photos'
   and stored_object.name = target_photo.storage_path
  where target_photo.user_id = v_user_id
    and target_photo.trip_id is not null
    and target_photo.deleted_at is not null
    and nullif(trim(target_photo.storage_path), '') is not null
    and (storage.foldername(stored_object.name))[1] = v_user_id::text
    and (storage.foldername(stored_object.name))[2] = target_photo.trip_id::text
  order by target_photo.deleted_at asc, target_photo.id asc
  limit v_limit;
end;
$$;

revoke all on function public.soft_delete_place_tree(uuid) from public;
revoke all on function public.soft_delete_place_tree(uuid) from anon;
grant execute on function public.soft_delete_place_tree(uuid) to authenticated;

revoke all on function public.soft_delete_trip_tree(uuid) from public;
revoke all on function public.soft_delete_trip_tree(uuid) from anon;
grant execute on function public.soft_delete_trip_tree(uuid) to authenticated;

revoke all on function public.list_pending_photo_storage_cleanup(integer) from public;
revoke all on function public.list_pending_photo_storage_cleanup(integer) from anon;
grant execute on function public.list_pending_photo_storage_cleanup(integer) to authenticated;
