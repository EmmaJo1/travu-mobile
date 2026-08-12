drop policy if exists "Users can select own records" on public.records;

create policy "Users can select own records"
on public.records
for select
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists "Users can select own places" on public.places;

create policy "Users can select own places"
on public.places
for select
to authenticated
using (
  user_id = auth.uid()
);
