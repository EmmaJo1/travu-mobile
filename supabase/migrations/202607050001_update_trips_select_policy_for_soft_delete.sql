drop policy if exists "Users can select own trips" on public.trips;

create policy "Users can select own trips"
on public.trips
for select
to authenticated
using (
  user_id = auth.uid()
);
