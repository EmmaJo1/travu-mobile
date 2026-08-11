create policy "Users can select deleted own photos objects for cleanup"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'photos'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.allow_only_operation('object.delete_many')
  and exists (
    select 1
    from public.trips as parent_trip
    where parent_trip.id::text = (storage.foldername(name))[2]
      and parent_trip.user_id = (select auth.uid())
      and parent_trip.deleted_at is not null
  )
);
