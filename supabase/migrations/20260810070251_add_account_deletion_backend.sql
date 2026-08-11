alter table public.users
drop constraint if exists users_id_fkey;

alter table public.users
add constraint users_id_fkey
foreign key (id)
references auth.users(id)
on delete cascade;

create or replace function public.list_account_storage_objects(
  p_user_id uuid,
  p_limit integer default 1000
)
returns table (
  bucket_id text,
  object_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_object.bucket_id,
    target_object.name as object_name
  from storage.objects as target_object
  where target_object.bucket_id in ('photos', 'avatars')
    and (storage.foldername(target_object.name))[1] = p_user_id::text
  order by target_object.bucket_id asc, target_object.name asc
  limit greatest(1, least(coalesce(p_limit, 1000), 1000));
$$;

revoke all on function public.list_account_storage_objects(uuid, integer) from public;
revoke all on function public.list_account_storage_objects(uuid, integer) from anon;
revoke all on function public.list_account_storage_objects(uuid, integer) from authenticated;
grant execute on function public.list_account_storage_objects(uuid, integer) to service_role;

create or replace function public.hard_delete_account_data(
  p_user_id uuid
)
returns table (
  deleted_record_photo_count bigint,
  deleted_record_count bigint,
  deleted_photo_count bigint,
  deleted_place_count bigint,
  deleted_destination_count bigint,
  deleted_trip_day_count bigint,
  deleted_trip_count bigint,
  deleted_photo_import_job_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_record_photo_count bigint := 0;
  v_deleted_record_count bigint := 0;
  v_deleted_photo_count bigint := 0;
  v_deleted_place_count bigint := 0;
  v_deleted_destination_count bigint := 0;
  v_deleted_trip_day_count bigint := 0;
  v_deleted_trip_count bigint := 0;
  v_deleted_photo_import_job_count bigint := 0;
begin
  if p_user_id is null then
    raise exception using
      errcode = '22004',
      message = 'ACCOUNT_USER_ID_REQUIRED';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  if exists (
    select 1
    from storage.objects as target_object
    where target_object.bucket_id in ('photos', 'avatars')
      and (storage.foldername(target_object.name))[1] = p_user_id::text
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'ACCOUNT_STORAGE_NOT_EMPTY';
  end if;

  delete from public.record_photos as target_link
  where exists (
    select 1
    from public.records as owned_record
    where owned_record.id = target_link.record_id
      and owned_record.user_id = p_user_id
  )
  or exists (
    select 1
    from public.photos as owned_photo
    where owned_photo.id = target_link.photo_id
      and owned_photo.user_id = p_user_id
  );
  get diagnostics v_deleted_record_photo_count = row_count;

  delete from public.records as target_record
  where target_record.user_id = p_user_id;
  get diagnostics v_deleted_record_count = row_count;

  delete from public.photos as target_photo
  where target_photo.user_id = p_user_id;
  get diagnostics v_deleted_photo_count = row_count;

  delete from public.places as target_place
  where target_place.user_id = p_user_id;
  get diagnostics v_deleted_place_count = row_count;

  delete from public.trip_destinations as target_destination
  where exists (
    select 1
    from public.trips as owned_trip
    where owned_trip.id = target_destination.trip_id
      and owned_trip.user_id = p_user_id
  );
  get diagnostics v_deleted_destination_count = row_count;

  delete from public.trip_days as target_trip_day
  where exists (
    select 1
    from public.trips as owned_trip
    where owned_trip.id = target_trip_day.trip_id
      and owned_trip.user_id = p_user_id
  );
  get diagnostics v_deleted_trip_day_count = row_count;

  delete from public.trips as target_trip
  where target_trip.user_id = p_user_id;
  get diagnostics v_deleted_trip_count = row_count;

  delete from public.photo_import_jobs as target_job
  where target_job.user_id = p_user_id;
  get diagnostics v_deleted_photo_import_job_count = row_count;

  return query
  select
    v_deleted_record_photo_count,
    v_deleted_record_count,
    v_deleted_photo_count,
    v_deleted_place_count,
    v_deleted_destination_count,
    v_deleted_trip_day_count,
    v_deleted_trip_count,
    v_deleted_photo_import_job_count;
end;
$$;

revoke all on function public.hard_delete_account_data(uuid) from public;
revoke all on function public.hard_delete_account_data(uuid) from anon;
revoke all on function public.hard_delete_account_data(uuid) from authenticated;
grant execute on function public.hard_delete_account_data(uuid) to service_role;
