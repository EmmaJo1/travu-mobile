create or replace function public.soft_delete_record_photo_links(
  p_record_id uuid,
  p_photo_ids uuid[]
)
returns table (
  requested_photo_count integer,
  deleted_photo_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_record public.records%rowtype;
  v_photo_ids uuid[] := '{}'::uuid[];
  v_requested_photo_count integer := 0;
  v_deleted_photo_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Record photo link deletion is not permitted.'
      using errcode = '42501';
  end if;

  select target_record.*
  into v_record
  from public.records as target_record
  join public.trips as parent_trip
    on parent_trip.id = target_record.trip_id
  join public.places as parent_place
    on parent_place.id = target_record.place_id
  where target_record.id = p_record_id
    and target_record.user_id = v_user_id
    and target_record.deleted_at is null
    and parent_trip.user_id = v_user_id
    and parent_trip.deleted_at is null
    and parent_place.user_id = v_user_id
    and parent_place.trip_id = target_record.trip_id
    and parent_place.trip_day_id is not distinct from target_record.trip_day_id
    and parent_place.deleted_at is null
    and (
      target_record.trip_day_id is null
      or exists (
        select 1
        from public.trip_days as parent_trip_day
        where parent_trip_day.id = target_record.trip_day_id
          and parent_trip_day.trip_id = target_record.trip_id
          and parent_trip_day.deleted_at is null
      )
    )
  for update of target_record;

  if not found then
    raise exception 'Record photo link deletion is not permitted.'
      using errcode = '42501';
  end if;

  select coalesce(
    array_agg(distinct requested_photo.photo_id order by requested_photo.photo_id),
    '{}'::uuid[]
  )
  into v_photo_ids
  from unnest(coalesce(p_photo_ids, '{}'::uuid[])) as requested_photo(photo_id)
  where requested_photo.photo_id is not null;

  v_requested_photo_count := cardinality(v_photo_ids);

  if v_requested_photo_count = 0 then
    return query
    select v_requested_photo_count, v_deleted_photo_count;
    return;
  end if;

  if exists (
    select 1
    from public.record_photos as target_link
    join public.photos as linked_photo
      on linked_photo.id = target_link.photo_id
    where target_link.record_id = v_record.id
      and target_link.photo_id = any(v_photo_ids)
      and target_link.deleted_at is null
      and (
        linked_photo.user_id is distinct from v_user_id
        or linked_photo.trip_id is distinct from v_record.trip_id
        or linked_photo.trip_day_id is distinct from v_record.trip_day_id
        or linked_photo.place_id is distinct from v_record.place_id
      )
  ) then
    raise exception 'Record photo link deletion is not permitted.'
      using errcode = '42501';
  end if;

  with deleted_links as (
    update public.record_photos as target_link
    set
      deleted_at = now(),
      updated_at = now()
    where target_link.record_id = v_record.id
      and target_link.photo_id = any(v_photo_ids)
      and target_link.deleted_at is null
      and exists (
        select 1
        from public.photos as linked_photo
        where linked_photo.id = target_link.photo_id
          and linked_photo.user_id = v_user_id
          and linked_photo.trip_id = v_record.trip_id
          and linked_photo.trip_day_id is not distinct from v_record.trip_day_id
          and linked_photo.place_id is not distinct from v_record.place_id
      )
    returning target_link.photo_id
  )
  select count(*)::integer
  into v_deleted_photo_count
  from deleted_links;

  return query
  select v_requested_photo_count, v_deleted_photo_count;
end;
$$;

create or replace function public.soft_delete_photo(p_photo_id uuid)
returns table (
  photo_id uuid,
  trip_id uuid,
  trip_day_id uuid,
  place_id uuid,
  storage_path text,
  already_deleted boolean,
  place_cover_photo_id uuid,
  trip_cover_photo_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_photo public.photos%rowtype;
  v_place_cover_photo_id uuid;
  v_trip_cover_photo_id uuid;
begin
  if v_user_id is null then
    raise exception 'Photo deletion is not permitted.'
      using errcode = '42501';
  end if;

  select target_photo.*
  into v_photo
  from public.photos as target_photo
  join public.trips as parent_trip
    on parent_trip.id = target_photo.trip_id
  where target_photo.id = p_photo_id
    and target_photo.user_id = v_user_id
    and parent_trip.user_id = v_user_id
    and parent_trip.deleted_at is null
  for update of target_photo;

  if not found then
    raise exception 'Photo deletion is not permitted.'
      using errcode = '42501';
  end if;

  if v_photo.deleted_at is null then
    update public.photos as target_photo
    set
      deleted_at = now(),
      updated_at = now()
    where target_photo.id = v_photo.id
      and target_photo.user_id = v_user_id;
  end if;

  update public.record_photos as target_link
  set
    deleted_at = now(),
    updated_at = now()
  where target_link.photo_id = v_photo.id
    and target_link.deleted_at is null
    and exists (
      select 1
      from public.records as linked_record
      where linked_record.id = target_link.record_id
        and linked_record.user_id = v_user_id
    );

  if v_photo.place_id is not null then
    select target_place.cover_photo_id
    into v_place_cover_photo_id
    from public.places as target_place
    where target_place.id = v_photo.place_id
      and target_place.trip_id = v_photo.trip_id
      and target_place.user_id = v_user_id
      and target_place.deleted_at is null
    for update;

    if found and v_place_cover_photo_id = v_photo.id then
      select replacement_photo.id
      into v_place_cover_photo_id
      from public.photos as replacement_photo
      where replacement_photo.place_id = v_photo.place_id
        and replacement_photo.trip_id = v_photo.trip_id
        and replacement_photo.user_id = v_user_id
        and replacement_photo.deleted_at is null
        and replacement_photo.id <> v_photo.id
      order by
        replacement_photo.taken_at asc nulls last,
        replacement_photo.created_at asc,
        replacement_photo.id asc
      limit 1;

      update public.places as target_place
      set
        cover_photo_id = v_place_cover_photo_id,
        updated_at = now()
      where target_place.id = v_photo.place_id
        and target_place.trip_id = v_photo.trip_id
        and target_place.user_id = v_user_id;
    end if;
  end if;

  select target_trip.cover_photo_id
  into v_trip_cover_photo_id
  from public.trips as target_trip
  where target_trip.id = v_photo.trip_id
    and target_trip.user_id = v_user_id
    and target_trip.deleted_at is null
  for update;

  if found and v_trip_cover_photo_id = v_photo.id then
    select replacement_photo.id
    into v_trip_cover_photo_id
    from public.photos as replacement_photo
    where replacement_photo.trip_id = v_photo.trip_id
      and replacement_photo.user_id = v_user_id
      and replacement_photo.deleted_at is null
      and replacement_photo.id <> v_photo.id
    order by
      replacement_photo.taken_at asc nulls last,
      replacement_photo.created_at asc,
      replacement_photo.id asc
    limit 1;

    update public.trips as target_trip
    set
      cover_photo_id = v_trip_cover_photo_id,
      updated_at = now()
    where target_trip.id = v_photo.trip_id
      and target_trip.user_id = v_user_id;
  end if;

  return query
  select
    v_photo.id,
    v_photo.trip_id,
    v_photo.trip_day_id,
    v_photo.place_id,
    v_photo.storage_path,
    v_photo.deleted_at is not null,
    v_place_cover_photo_id,
    v_trip_cover_photo_id;
end;
$$;

revoke all on function public.soft_delete_record_photo_links(uuid, uuid[]) from public;
revoke all on function public.soft_delete_record_photo_links(uuid, uuid[]) from anon;
grant execute on function public.soft_delete_record_photo_links(uuid, uuid[]) to authenticated;

revoke all on function public.soft_delete_photo(uuid) from public;
revoke all on function public.soft_delete_photo(uuid) from anon;
grant execute on function public.soft_delete_photo(uuid) to authenticated;
