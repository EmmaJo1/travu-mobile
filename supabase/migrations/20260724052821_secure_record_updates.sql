create or replace function public.protect_record_update_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.trip_id is distinct from old.trip_id
    or new.trip_day_id is distinct from old.trip_day_id
    or new.place_id is distinct from old.place_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Record ownership and relationship fields cannot be changed.';
  end if;

  if old.deleted_at is not null then
    raise exception 'Deleted records cannot be updated.';
  end if;

  if new.deleted_at is not null then
    if new.text is distinct from old.text
      or new.visited_at is distinct from old.visited_at
    then
      raise exception 'Record content cannot be changed while deleting a record.';
    end if;
  else
    if btrim(coalesce(new.text, '')) = '' then
      raise exception 'Record text cannot be empty.';
    end if;

    if new.visited_at is null then
      raise exception 'Record visit time is required.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_record_update_fields on public.records;

create trigger protect_record_update_fields
before update on public.records
for each row execute function public.protect_record_update_fields();

drop policy if exists "Users can update own records" on public.records;

create policy "Users can update own records"
on public.records
for update
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and deleted_at is null
  and exists (
    select 1
    from public.places as parent_place
    join public.trip_days as parent_trip_day
      on parent_trip_day.id = records.trip_day_id
    join public.trips as parent_trip
      on parent_trip.id = records.trip_id
    where parent_place.id = records.place_id
      and parent_place.user_id = (select auth.uid())
      and parent_place.deleted_at is null
      and parent_place.trip_id = records.trip_id
      and parent_place.trip_day_id = records.trip_day_id
      and parent_trip_day.trip_id = records.trip_id
      and parent_trip_day.deleted_at is null
      and parent_trip.user_id = (select auth.uid())
      and parent_trip.deleted_at is null
  )
)
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and exists (
    select 1
    from public.places as parent_place
    join public.trip_days as parent_trip_day
      on parent_trip_day.id = records.trip_day_id
    join public.trips as parent_trip
      on parent_trip.id = records.trip_id
    where parent_place.id = records.place_id
      and parent_place.user_id = (select auth.uid())
      and parent_place.deleted_at is null
      and parent_place.trip_id = records.trip_id
      and parent_place.trip_day_id = records.trip_day_id
      and parent_trip_day.trip_id = records.trip_id
      and parent_trip_day.deleted_at is null
      and parent_trip.user_id = (select auth.uid())
      and parent_trip.deleted_at is null
      and (
        records.deleted_at is not null
        or (
          btrim(coalesce(records.text, '')) <> ''
          and records.visited_at is not null
          and (records.visited_at at time zone 'UTC')::date = parent_trip_day.date
        )
      )
  )
);
