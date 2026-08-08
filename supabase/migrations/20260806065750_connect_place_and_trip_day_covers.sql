alter table public.places
  add column category text;

alter table public.places
  add constraint places_category_check
  check (
    category is null
    or category in ('attraction', 'restaurant', 'cafe', 'lodging', 'shopping', 'other')
  );

alter table public.trip_days
  add column cover_photo_id uuid;

alter table public.trip_days
  add constraint trip_days_cover_photo_id_fkey
  foreign key (cover_photo_id)
  references public.photos(id)
  on delete set null;

create index trip_days_cover_photo_id_idx
  on public.trip_days(cover_photo_id);

create or replace function public.set_place_cover_photo(
  p_place_id uuid,
  p_photo_id uuid
)
returns table (
  place_id uuid,
  cover_photo_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_place public.places%rowtype;
begin
  if v_user_id is null then
    raise exception 'Place cover photo update is not permitted.'
      using errcode = '42501';
  end if;

  select target_place.*
  into v_place
  from public.places as target_place
  join public.trips as parent_trip
    on parent_trip.id = target_place.trip_id
  where target_place.id = p_place_id
    and target_place.user_id = v_user_id
    and target_place.deleted_at is null
    and parent_trip.user_id = v_user_id
    and parent_trip.deleted_at is null
  for update of target_place;

  if not found then
    raise exception 'Place cover photo update is not permitted.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.photos as target_photo
    where target_photo.id = p_photo_id
      and target_photo.user_id = v_user_id
      and target_photo.trip_id = v_place.trip_id
      and target_photo.trip_day_id is not distinct from v_place.trip_day_id
      and target_photo.place_id = v_place.id
      and target_photo.deleted_at is null
      and (
        nullif(trim(target_photo.storage_path), '') is not null
        or nullif(trim(target_photo.image_url), '') is not null
        or nullif(trim(target_photo.thumbnail_url), '') is not null
      )
  ) then
    raise exception 'Place cover photo update is not permitted.'
      using errcode = '42501';
  end if;

  update public.places as target_place
  set
    cover_photo_id = p_photo_id,
    updated_at = now()
  where target_place.id = v_place.id
    and target_place.user_id = v_user_id;

  return query
  select v_place.id, p_photo_id;
end;
$$;

create or replace function public.set_trip_day_cover_photo(
  p_trip_day_id uuid,
  p_photo_id uuid
)
returns table (
  trip_day_id uuid,
  cover_photo_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip_day public.trip_days%rowtype;
begin
  if v_user_id is null then
    raise exception 'Trip day cover photo update is not permitted.'
      using errcode = '42501';
  end if;

  select target_trip_day.*
  into v_trip_day
  from public.trip_days as target_trip_day
  join public.trips as parent_trip
    on parent_trip.id = target_trip_day.trip_id
  where target_trip_day.id = p_trip_day_id
    and target_trip_day.deleted_at is null
    and parent_trip.user_id = v_user_id
    and parent_trip.deleted_at is null
  for update of target_trip_day;

  if not found then
    raise exception 'Trip day cover photo update is not permitted.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.photos as target_photo
    join public.places as parent_place
      on parent_place.id = target_photo.place_id
    where target_photo.id = p_photo_id
      and target_photo.user_id = v_user_id
      and target_photo.trip_id = v_trip_day.trip_id
      and target_photo.trip_day_id = v_trip_day.id
      and target_photo.deleted_at is null
      and parent_place.user_id = v_user_id
      and parent_place.trip_id = v_trip_day.trip_id
      and parent_place.trip_day_id = v_trip_day.id
      and parent_place.deleted_at is null
      and (
        nullif(trim(target_photo.storage_path), '') is not null
        or nullif(trim(target_photo.image_url), '') is not null
        or nullif(trim(target_photo.thumbnail_url), '') is not null
      )
  ) then
    raise exception 'Trip day cover photo update is not permitted.'
      using errcode = '42501';
  end if;

  update public.trip_days as target_trip_day
  set
    cover_photo_id = p_photo_id,
    updated_at = now()
  where target_trip_day.id = v_trip_day.id;

  return query
  select v_trip_day.id, p_photo_id;
end;
$$;

create or replace function public.repair_trip_day_cover_after_photo_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    update public.trip_days as target_trip_day
    set
      cover_photo_id = (
        select replacement_photo.id
        from public.photos as replacement_photo
        join public.places as replacement_place
          on replacement_place.id = replacement_photo.place_id
        where replacement_photo.trip_day_id = target_trip_day.id
          and replacement_photo.trip_id = target_trip_day.trip_id
          and replacement_photo.user_id = new.user_id
          and replacement_photo.deleted_at is null
          and replacement_place.user_id = new.user_id
          and replacement_place.trip_id = target_trip_day.trip_id
          and replacement_place.trip_day_id = target_trip_day.id
          and replacement_place.deleted_at is null
          and (
            nullif(trim(replacement_photo.storage_path), '') is not null
            or nullif(trim(replacement_photo.image_url), '') is not null
            or nullif(trim(replacement_photo.thumbnail_url), '') is not null
          )
        order by
          replacement_photo.taken_at asc nulls last,
          replacement_photo.created_at asc,
          replacement_photo.id asc
        limit 1
      ),
      updated_at = now()
    where target_trip_day.cover_photo_id = new.id
      and target_trip_day.trip_id = new.trip_id
      and target_trip_day.deleted_at is null;
  end if;

  return new;
end;
$$;

create or replace function public.repair_trip_day_cover_after_place_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    update public.trip_days as target_trip_day
    set
      cover_photo_id = (
        select replacement_photo.id
        from public.photos as replacement_photo
        join public.places as replacement_place
          on replacement_place.id = replacement_photo.place_id
        where replacement_photo.trip_day_id = target_trip_day.id
          and replacement_photo.trip_id = target_trip_day.trip_id
          and replacement_photo.user_id = new.user_id
          and replacement_photo.deleted_at is null
          and replacement_place.user_id = new.user_id
          and replacement_place.trip_id = target_trip_day.trip_id
          and replacement_place.trip_day_id = target_trip_day.id
          and replacement_place.deleted_at is null
          and (
            nullif(trim(replacement_photo.storage_path), '') is not null
            or nullif(trim(replacement_photo.image_url), '') is not null
            or nullif(trim(replacement_photo.thumbnail_url), '') is not null
          )
        order by
          replacement_photo.taken_at asc nulls last,
          replacement_photo.created_at asc,
          replacement_photo.id asc
        limit 1
      ),
      updated_at = now()
    where target_trip_day.trip_id = new.trip_id
      and target_trip_day.deleted_at is null
      and exists (
        select 1
        from public.photos as current_cover
        where current_cover.id = target_trip_day.cover_photo_id
          and current_cover.place_id = new.id
      );
  end if;

  return new;
end;
$$;

create trigger repair_trip_day_cover_after_photo_soft_delete
after update of deleted_at on public.photos
for each row
execute function public.repair_trip_day_cover_after_photo_soft_delete();

create trigger repair_trip_day_cover_after_place_soft_delete
after update of deleted_at on public.places
for each row
execute function public.repair_trip_day_cover_after_place_soft_delete();

revoke all on function public.set_place_cover_photo(uuid, uuid) from public;
revoke all on function public.set_place_cover_photo(uuid, uuid) from anon;
grant execute on function public.set_place_cover_photo(uuid, uuid) to authenticated;

revoke all on function public.set_trip_day_cover_photo(uuid, uuid) from public;
revoke all on function public.set_trip_day_cover_photo(uuid, uuid) from anon;
grant execute on function public.set_trip_day_cover_photo(uuid, uuid) to authenticated;

revoke all on function public.repair_trip_day_cover_after_photo_soft_delete() from public;
revoke all on function public.repair_trip_day_cover_after_photo_soft_delete() from anon;
revoke all on function public.repair_trip_day_cover_after_photo_soft_delete() from authenticated;

revoke all on function public.repair_trip_day_cover_after_place_soft_delete() from public;
revoke all on function public.repair_trip_day_cover_after_place_soft_delete() from anon;
revoke all on function public.repair_trip_day_cover_after_place_soft_delete() from authenticated;
