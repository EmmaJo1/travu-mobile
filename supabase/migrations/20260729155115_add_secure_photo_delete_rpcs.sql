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
    update public.photos
    set
      deleted_at = now(),
      updated_at = now()
    where id = v_photo.id
      and user_id = v_user_id;
  end if;

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

      update public.places
      set
        cover_photo_id = v_place_cover_photo_id,
        updated_at = now()
      where id = v_photo.place_id
        and trip_id = v_photo.trip_id
        and user_id = v_user_id;
    end if;
  end if;

  select target_trip.cover_photo_id
  into v_trip_cover_photo_id
  from public.trips as target_trip
  where target_trip.id = v_photo.trip_id
    and target_trip.user_id = v_user_id
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

    update public.trips
    set
      cover_photo_id = v_trip_cover_photo_id,
      updated_at = now()
    where id = v_photo.trip_id
      and user_id = v_user_id;
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

create or replace function public.ensure_photo_covers_for_trip(p_trip_id uuid)
returns table (
  trip_id uuid,
  trip_cover_photo_id uuid,
  updated_place_count integer,
  active_photo_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip public.trips%rowtype;
  v_trip_cover_photo_id uuid;
  v_updated_place_count integer := 0;
  v_active_photo_count bigint := 0;
begin
  if v_user_id is null then
    raise exception 'Photo cover access is not permitted.'
      using errcode = '42501';
  end if;

  select target_trip.*
  into v_trip
  from public.trips as target_trip
  where target_trip.id = p_trip_id
    and target_trip.user_id = v_user_id
    and target_trip.deleted_at is null
  for update;

  if not found then
    raise exception 'Photo cover access is not permitted.'
      using errcode = '42501';
  end if;

  select count(*)
  into v_active_photo_count
  from public.photos as trip_photo
  where trip_photo.trip_id = v_trip.id
    and trip_photo.user_id = v_user_id
    and trip_photo.deleted_at is null;

  if v_trip.cover_photo_id is not null and exists (
    select 1
    from public.photos as current_cover
    where current_cover.id = v_trip.cover_photo_id
      and current_cover.trip_id = v_trip.id
      and current_cover.user_id = v_user_id
      and current_cover.deleted_at is null
  ) then
    v_trip_cover_photo_id := v_trip.cover_photo_id;
  else
    select replacement_photo.id
    into v_trip_cover_photo_id
    from public.photos as replacement_photo
    where replacement_photo.trip_id = v_trip.id
      and replacement_photo.user_id = v_user_id
      and replacement_photo.deleted_at is null
    order by
      replacement_photo.taken_at asc nulls last,
      replacement_photo.created_at asc,
      replacement_photo.id asc
    limit 1;

    if v_trip.cover_photo_id is distinct from v_trip_cover_photo_id then
      update public.trips
      set
        cover_photo_id = v_trip_cover_photo_id,
        updated_at = now()
      where id = v_trip.id
        and user_id = v_user_id;
    end if;
  end if;

  with place_cover_candidates as (
    select
      target_place.id as place_id,
      (
        select replacement_photo.id
        from public.photos as replacement_photo
        where replacement_photo.place_id = target_place.id
          and replacement_photo.trip_id = v_trip.id
          and replacement_photo.user_id = v_user_id
          and replacement_photo.deleted_at is null
        order by
          replacement_photo.taken_at asc nulls last,
          replacement_photo.created_at asc,
          replacement_photo.id asc
        limit 1
      ) as next_cover_photo_id
    from public.places as target_place
    where target_place.trip_id = v_trip.id
      and target_place.user_id = v_user_id
      and target_place.deleted_at is null
      and (
        target_place.cover_photo_id is null
        or not exists (
          select 1
          from public.photos as current_cover
          where current_cover.id = target_place.cover_photo_id
            and current_cover.place_id = target_place.id
            and current_cover.trip_id = v_trip.id
            and current_cover.user_id = v_user_id
            and current_cover.deleted_at is null
        )
      )
  ),
  updated_places as (
    update public.places as target_place
    set
      cover_photo_id = candidate.next_cover_photo_id,
      updated_at = now()
    from place_cover_candidates as candidate
    where target_place.id = candidate.place_id
      and target_place.user_id = v_user_id
      and target_place.cover_photo_id is distinct from candidate.next_cover_photo_id
    returning target_place.id
  )
  select count(*)::integer
  into v_updated_place_count
  from updated_places;

  return query
  select
    v_trip.id,
    v_trip_cover_photo_id,
    v_updated_place_count,
    v_active_photo_count;
end;
$$;

revoke all on function public.soft_delete_photo(uuid) from public;
revoke all on function public.soft_delete_photo(uuid) from anon;
grant execute on function public.soft_delete_photo(uuid) to authenticated;

revoke all on function public.ensure_photo_covers_for_trip(uuid) from public;
revoke all on function public.ensure_photo_covers_for_trip(uuid) from anon;
grant execute on function public.ensure_photo_covers_for_trip(uuid) to authenticated;
