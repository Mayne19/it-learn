create table if not exists public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id integer not null,
  exercise_type text not null,
  correct integer not null default 0 check (correct >= 0),
  total integer not null default 0 check (total >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_id, exercise_type)
);

alter table public.progress enable row level security;

drop policy if exists "Users can read their own progress" on public.progress;
create policy "Users can read their own progress"
  on public.progress
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own progress" on public.progress;
create policy "Users can insert their own progress"
  on public.progress
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own progress" on public.progress;
create policy "Users can update their own progress"
  on public.progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.upsert_progress(
  p_user_id uuid,
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

  insert into public.progress (user_id, chapter_id, exercise_type, correct, total)
  values (
    p_user_id,
    p_chapter_id,
    p_exercise_type,
    greatest(p_correct, 0),
    1
  )
  on conflict (user_id, chapter_id, exercise_type)
  do update set
    correct = public.progress.correct + greatest(excluded.correct, 0),
    total = public.progress.total + 1,
    updated_at = now();
end;
$$;
