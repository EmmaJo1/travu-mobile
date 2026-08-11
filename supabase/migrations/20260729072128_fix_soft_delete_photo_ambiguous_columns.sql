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
  v_target_photo public.photos%rowtype;
  v_place_cover_photo_id uuid;
  v_trip_cover_photo_id uuid;
begin
  if v_user_id is null then
    raise exception 'Photo deletion is not permitted.'
      using errcode = '42501';
  end if;

  select p.*
  into v_target_photo
  from public.photos as p
  join public.trips as t
    on t.id = p.trip_id
  where p.id = p_photo_id
    and p.user_id = v_user_id
    and t.user_id = v_user_id
    and t.deleted_at is null
  for update of p;

  if not found then
    raise exception 'Photo deletion is not permitted.'
      using errcode = '42501';
  end if;

  if v_target_photo.deleted_at is null then
    update public.photos as p
    set
      deleted_at = now(),
      updated_at = now()
    where p.id = v_target_photo.id
      and p.user_id = v_user_id;
  end if;

  if v_target_photo.place_id is not null then
    select pl.cover_photo_id
    into v_place_cover_photo_id
    from public.places as pl
    where pl.id = v_target_photo.place_id
      and pl.trip_id = v_target_photo.trip_id
      and pl.user_id = v_user_id
      and pl.deleted_at is null
    for update;

    if found and v_place_cover_photo_id = v_target_photo.id then
      select replacement.id
      into v_place_cover_photo_id
      from public.photos as replacement
      where replacement.place_id = v_target_photo.place_id
        and replacement.trip_id = v_target_photo.trip_id
        and replacement.user_id = v_user_id
        and replacement.deleted_at is null
        and replacement.id <> v_target_photo.id
      order by
        replacement.taken_at asc nulls last,
        replacement.created_at asc,
        replacement.id asc
      limit 1;

      update public.places as pl
      set
        cover_photo_id = v_place_cover_photo_id,
        updated_at = now()
      where pl.id = v_target_photo.place_id
        and pl.trip_id = v_target_photo.trip_id
        and pl.user_id = v_user_id;
    end if;
  end if;

  select t.cover_photo_id
  into v_trip_cover_photo_id
  from public.trips as t
  where t.id = v_target_photo.trip_id
    and t.user_id = v_user_id
    and t.deleted_at is null
  for update;

  if found and v_trip_cover_photo_id = v_target_photo.id then
    select replacement.id
    into v_trip_cover_photo_id
    from public.photos as replacement
    where replacement.trip_id = v_target_photo.trip_id
      and replacement.user_id = v_user_id
      and replacement.deleted_at is null
      and replacement.id <> v_target_photo.id
    order by
      replacement.taken_at asc nulls last,
      replacement.created_at asc,
      replacement.id asc
    limit 1;

    update public.trips as t
    set
      cover_photo_id = v_trip_cover_photo_id,
      updated_at = now()
    where t.id = v_target_photo.trip_id
      and t.user_id = v_user_id;
  end if;

  return query
  select
    v_target_photo.id,
    v_target_photo.trip_id,
    v_target_photo.trip_day_id,
    v_target_photo.place_id,
    v_target_photo.storage_path,
    v_target_photo.deleted_at is not null,
    v_place_cover_photo_id,
    v_trip_cover_photo_id;
end;
$$;

revoke all on function public.soft_delete_photo(uuid) from public;
revoke all on function public.soft_delete_photo(uuid) from anon;
grant execute on function public.soft_delete_photo(uuid) to authenticated;
