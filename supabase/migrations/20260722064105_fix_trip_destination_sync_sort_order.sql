create or replace function public.sync_active_trip_destinations(
  p_trip_id uuid,
  p_destinations jsonb
)
returns setof public.trip_destinations
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  destination_count integer;
  temporary_sort_base integer;
  destination_item jsonb;
  destination_index integer;
  existing_destination_id uuid;
  selected_destination_ids uuid[] := array[]::uuid[];
  first_destination jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'A Supabase session is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.trips
    where trips.id = p_trip_id
      and trips.user_id = (select auth.uid())
      and trips.status = 'active'
      and trips.deleted_at is null
  ) then
    raise exception 'No owned active trip was found.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_destinations) <> 'array' then
    raise exception 'Destinations must be a JSON array.' using errcode = '22023';
  end if;

  destination_count := jsonb_array_length(p_destinations);

  if destination_count < 1 then
    raise exception 'At least one destination is required.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_destinations) as item
    where nullif(trim(item ->> 'destination_key'), '') is null
      or nullif(trim(item ->> 'name'), '') is null
      or coalesce(item ->> 'destination_type', 'city') not in ('city', 'country')
  ) then
    raise exception 'Each destination requires a key, name, and valid type.' using errcode = '22023';
  end if;

  if (
    select count(distinct trim(item ->> 'destination_key'))
    from jsonb_array_elements(p_destinations) as item
  ) <> destination_count then
    raise exception 'Destination keys must be unique.' using errcode = '22023';
  end if;

  select coalesce(max(sort_order), -1) + destination_count + 100
    into temporary_sort_base
  from public.trip_destinations
  where trip_id = p_trip_id
    and deleted_at is null;

  update public.trip_destinations
  set
    is_primary = false,
    sort_order = sort_order + temporary_sort_base,
    updated_at = now()
  where trip_id = p_trip_id
    and deleted_at is null;

  for destination_item, destination_index in
    select item, ordinality::integer - 1
    from jsonb_array_elements(p_destinations) with ordinality as destinations(item, ordinality)
  loop
    select id
      into existing_destination_id
    from public.trip_destinations
    where trip_id = p_trip_id
      and destination_key = trim(destination_item ->> 'destination_key')
    order by deleted_at nulls first, updated_at desc
    limit 1;

    if existing_destination_id is null then
      insert into public.trip_destinations (
        trip_id,
        destination_key,
        name,
        name_ko,
        country,
        country_ko,
        destination_type,
        sort_order,
        is_primary
      ) values (
        p_trip_id,
        trim(destination_item ->> 'destination_key'),
        trim(destination_item ->> 'name'),
        nullif(trim(destination_item ->> 'name_ko'), ''),
        nullif(trim(destination_item ->> 'country'), ''),
        nullif(trim(destination_item ->> 'country_ko'), ''),
        coalesce(destination_item ->> 'destination_type', 'city'),
        temporary_sort_base * 2 + destination_index,
        false
      )
      returning id into existing_destination_id;
    else
      update public.trip_destinations
      set
        name = trim(destination_item ->> 'name'),
        name_ko = nullif(trim(destination_item ->> 'name_ko'), ''),
        country = nullif(trim(destination_item ->> 'country'), ''),
        country_ko = nullif(trim(destination_item ->> 'country_ko'), ''),
        destination_type = coalesce(destination_item ->> 'destination_type', 'city'),
        sort_order = temporary_sort_base * 2 + destination_index,
        is_primary = false,
        updated_at = now(),
        deleted_at = null
      where id = existing_destination_id;
    end if;

    selected_destination_ids := array_append(selected_destination_ids, existing_destination_id);
  end loop;

  update public.trip_destinations
  set
    is_primary = false,
    updated_at = now(),
    deleted_at = now()
  where trip_id = p_trip_id
    and deleted_at is null
    and not (id = any(selected_destination_ids));

  for destination_index in 0..destination_count - 1 loop
    update public.trip_destinations
    set
      sort_order = destination_index,
      is_primary = destination_index = 0,
      updated_at = now()
    where id = selected_destination_ids[destination_index + 1];
  end loop;

  first_destination := p_destinations -> 0;

  update public.trips
  set
    destination_city = trim(first_destination ->> 'name'),
    destination_city_ko = coalesce(
      nullif(trim(first_destination ->> 'name_ko'), ''),
      trim(first_destination ->> 'name')
    ),
    destination_country = nullif(trim(first_destination ->> 'country'), ''),
    destination_country_ko = coalesce(
      nullif(trim(first_destination ->> 'country_ko'), ''),
      nullif(trim(first_destination ->> 'country'), '')
    ),
    updated_at = now()
  where id = p_trip_id
    and user_id = (select auth.uid())
    and status = 'active'
    and deleted_at is null;

  return query
  select trip_destinations.*
  from public.trip_destinations
  where trip_destinations.trip_id = p_trip_id
    and trip_destinations.deleted_at is null
  order by trip_destinations.sort_order;
end;
$$;

revoke all on function public.sync_active_trip_destinations(uuid, jsonb) from public;
grant execute on function public.sync_active_trip_destinations(uuid, jsonb) to authenticated;
