drop policy if exists "Users can select own trip days"
on public.trip_days;

create policy "Users can select own trip days"
on public.trip_days
for select
to authenticated
using (
  exists (
    select 1
    from public.trips
    where trips.id = trip_days.trip_id
      and trips.user_id = auth.uid()
      and trips.deleted_at is null
  )
);
