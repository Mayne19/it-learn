-- Bucket de stockage pour les fichiers de cours uploadés dans le mode
-- étude (/etude). Upload direct client → Storage (pas via une route API
-- Next, qui a une limite de payload trop basse pour des PDF de cours
-- complets — voir doc §5.3 étape 1). Chemin attendu :
-- {user_id}/{study_course_id}/{filename}, pour que les policies RLS
-- puissent s'appuyer sur le premier segment du chemin.

insert into storage.buckets (id, name, public)
values ('study-course-files', 'study-course-files', false)
on conflict (id) do nothing;

drop policy if exists "Users manage their own study course files" on storage.objects;
create policy "Users manage their own study course files"
  on storage.objects
  for all
  using (
    bucket_id = 'study-course-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'study-course-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
