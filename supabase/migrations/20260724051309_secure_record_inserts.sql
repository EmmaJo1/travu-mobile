drop policy if exists "Users can insert own records" on public.records;

create policy "Users can insert own records"
on public.records
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and btrim(coalesce(records.text, '')) <> ''
  and records.visited_at is not null
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
      and (records.visited_at at time zone 'UTC')::date = parent_trip_day.date
      and parent_trip.user_id = (select auth.uid())
      and parent_trip.deleted_at is null
  )
);
