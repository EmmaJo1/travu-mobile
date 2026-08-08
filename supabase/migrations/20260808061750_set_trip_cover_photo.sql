create or replace function public.set_trip_cover_photo(
  p_trip_id uuid,
  p_photo_id uuid
)
returns table (
  trip_id uuid,
  cover_photo_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip public.trips%rowtype;
begin
  if v_user_id is null then
    raise exception 'Trip cover photo update is not permitted.'
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
    raise exception 'Trip cover photo update is not permitted.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.photos as target_photo
    join public.trip_days as parent_day
      on parent_day.id = target_photo.trip_day_id
    join public.places as parent_place
      on parent_place.id = target_photo.place_id
    where target_photo.id = p_photo_id
      and target_photo.user_id = v_user_id
      and target_photo.trip_id = v_trip.id
      and target_photo.deleted_at is null
      and parent_day.trip_id = v_trip.id
      and parent_day.deleted_at is null
      and parent_place.user_id = v_user_id
      and parent_place.trip_id = v_trip.id
      and parent_place.trip_day_id = parent_day.id
      and parent_place.deleted_at is null
      and (
        nullif(trim(target_photo.storage_path), '') is not null
        or nullif(trim(target_photo.image_url), '') is not null
        or nullif(trim(target_photo.thumbnail_url), '') is not null
      )
  ) then
    raise exception 'Trip cover photo update is not permitted.'
      using errcode = '42501';
  end if;

  update public.trips as target_trip
  set
    cover_photo_id = p_photo_id,
    updated_at = now()
  where target_trip.id = v_trip.id
    and target_trip.user_id = v_user_id;

  return query
  select v_trip.id, p_photo_id;
end;
$$;

revoke all on function public.set_trip_cover_photo(uuid, uuid) from public;
revoke all on function public.set_trip_cover_photo(uuid, uuid) from anon;
grant execute on function public.set_trip_cover_photo(uuid, uuid) to authenticated;

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
  join public.trip_days as photo_day
    on photo_day.id = trip_photo.trip_day_id
  join public.places as photo_place
    on photo_place.id = trip_photo.place_id
  where trip_photo.trip_id = v_trip.id
    and trip_photo.user_id = v_user_id
    and trip_photo.deleted_at is null
    and photo_day.trip_id = v_trip.id
    and photo_day.deleted_at is null
    and photo_place.user_id = v_user_id
    and photo_place.trip_id = v_trip.id
    and photo_place.trip_day_id = photo_day.id
    and photo_place.deleted_at is null;

  if v_trip.cover_photo_id is not null and exists (
    select 1
    from public.photos as current_cover
    join public.trip_days as current_day
      on current_day.id = current_cover.trip_day_id
    join public.places as current_place
      on current_place.id = current_cover.place_id
    where current_cover.id = v_trip.cover_photo_id
      and current_cover.trip_id = v_trip.id
      and current_cover.user_id = v_user_id
      and current_cover.deleted_at is null
      and current_day.trip_id = v_trip.id
      and current_day.deleted_at is null
      and current_place.user_id = v_user_id
      and current_place.trip_id = v_trip.id
      and current_place.trip_day_id = current_day.id
      and current_place.deleted_at is null
      and (
        nullif(trim(current_cover.storage_path), '') is not null
        or nullif(trim(current_cover.image_url), '') is not null
        or nullif(trim(current_cover.thumbnail_url), '') is not null
      )
  ) then
    v_trip_cover_photo_id := v_trip.cover_photo_id;
  else
    select replacement_photo.id
    into v_trip_cover_photo_id
    from public.photos as replacement_photo
    join public.trip_days as replacement_day
      on replacement_day.id = replacement_photo.trip_day_id
    join public.places as replacement_place
      on replacement_place.id = replacement_photo.place_id
    where replacement_photo.trip_id = v_trip.id
      and replacement_photo.user_id = v_user_id
      and replacement_photo.deleted_at is null
      and replacement_day.trip_id = v_trip.id
      and replacement_day.deleted_at is null
      and replacement_place.user_id = v_user_id
      and replacement_place.trip_id = v_trip.id
      and replacement_place.trip_day_id = replacement_day.id
      and replacement_place.deleted_at is null
      and (
        nullif(trim(replacement_photo.storage_path), '') is not null
        or nullif(trim(replacement_photo.image_url), '') is not null
        or nullif(trim(replacement_photo.thumbnail_url), '') is not null
      )
    order by
      replacement_day.date asc,
      replacement_day.day_index asc,
      replacement_place.visited_at asc nulls last,
      replacement_place.created_at asc,
      replacement_photo.taken_at asc nulls last,
      replacement_photo.created_at asc,
      replacement_photo.id asc
    limit 1;

    if v_trip.cover_photo_id is distinct from v_trip_cover_photo_id then
      update public.trips as target_trip
      set
        cover_photo_id = v_trip_cover_photo_id,
        updated_at = now()
      where target_trip.id = v_trip.id
        and target_trip.user_id = v_user_id;
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

revoke all on function public.ensure_photo_covers_for_trip(uuid) from public;
revoke all on function public.ensure_photo_covers_for_trip(uuid) from anon;
grant execute on function public.ensure_photo_covers_for_trip(uuid) to authenticated;
