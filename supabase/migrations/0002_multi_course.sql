-- Turns the single-course "progress" table into a multi-course one.
-- Non-destructive: existing rows are all from the Java course and are
-- backfilled with course_id = 'java', so no user progress is lost.

alter table public.progress
  add column if not exists course_id text not null default 'java';

-- Replace the old (user_id, chapter_id, exercise_type) primary key with one
-- that also disambiguates by course, since chapter numbers restart at 1 per course.
alter table public.progress drop constraint if exists progress_pkey;
alter table public.progress add primary key (user_id, course_id, chapter_id, exercise_type);

-- RLS policies are unaffected (they only reference user_id), kept as-is.

-- New 5-argument upsert_progress; drop the old 4-argument overload so callers
-- can't silently hit the pre-multi-course version.
drop function if exists public.upsert_progress(uuid, integer, text, integer);

create or replace function public.upsert_progress(
  p_user_id uuid,
  p_course_id text,
  p_chapter_id integer,
  p_exercise_type text,
  p_correct integer
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not allowed';
  end if;

  insert into public.progress (user_id, course_id, chapter_id, exercise_type, correct, total)
  values (
    p_user_id,
    p_course_id,
    p_chapter_id,
    p_exercise_type,
    greatest(p_correct, 0),
    1
  )
  on conflict (user_id, course_id, chapter_id, exercise_type)
  do update set
    correct = public.progress.correct + greatest(excluded.correct, 0),
    total = public.progress.total + 1,
    updated_at = now();
end;
$$;
