-- Mode "révision quotidienne" (/etude). Tables entièrement nouvelles,
-- préfixées study_* : n'ajoute ni ne modifie rien sur la table `progress`
-- ni sur les policies/RPC existants (0001, 0002). Chaque table a RLS
-- activé avec des policies user_id = auth.uid(), même schéma que `progress`.

create table if not exists public.study_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  profile text not null check (profile in ('programming', 'theory', 'mixed')),
  detected_language text,
  created_at timestamptz not null default now()
);

alter table public.study_courses enable row level security;

drop policy if exists "Users manage their own study courses" on public.study_courses;
create policy "Users manage their own study courses"
  on public.study_courses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.study_course_files (
  id uuid primary key default gen_random_uuid(),
  study_course_id uuid not null references public.study_courses(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'error')),
  error_message text,
  uploaded_at timestamptz not null default now()
);

alter table public.study_course_files enable row level security;

drop policy if exists "Users manage files of their own study courses" on public.study_course_files;
create policy "Users manage files of their own study courses"
  on public.study_course_files
  for all
  using (
    exists (
      select 1 from public.study_courses c
      where c.id = study_course_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.study_courses c
      where c.id = study_course_id and c.user_id = auth.uid()
    )
  );

create table if not exists public.study_chapters (
  id uuid primary key default gen_random_uuid(),
  study_course_id uuid not null references public.study_courses(id) on delete cascade,
  "order" integer not null,
  title_de text not null,
  title_fr text not null,
  concepts text[] not null default '{}',
  summary text not null default '',
  has_code boolean not null default false,
  source_file_id uuid references public.study_course_files(id) on delete set null
);

alter table public.study_chapters enable row level security;

drop policy if exists "Users manage chapters of their own study courses" on public.study_chapters;
create policy "Users manage chapters of their own study courses"
  on public.study_chapters
  for all
  using (
    exists (
      select 1 from public.study_courses c
      where c.id = study_course_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.study_courses c
      where c.id = study_course_id and c.user_id = auth.uid()
    )
  );

-- Cache du cours détaillé généré par chapitre (une entrée par chapitre,
-- régénérée uniquement sur action explicite — voir doc §4.5/§4.6).
create table if not exists public.study_lessons_cache (
  study_chapter_id uuid primary key references public.study_chapters(id) on delete cascade,
  content jsonb not null,
  generated_at timestamptz not null default now()
);

alter table public.study_lessons_cache enable row level security;

drop policy if exists "Users manage lesson cache of their own study courses" on public.study_lessons_cache;
create policy "Users manage lesson cache of their own study courses"
  on public.study_lessons_cache
  for all
  using (
    exists (
      select 1 from public.study_chapters ch
      join public.study_courses c on c.id = ch.study_course_id
      where ch.id = study_chapter_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.study_chapters ch
      join public.study_courses c on c.id = ch.study_course_id
      where ch.id = study_chapter_id and c.user_id = auth.uid()
    )
  );

create table if not exists public.study_flashcards (
  id uuid primary key default gen_random_uuid(),
  study_chapter_id uuid not null references public.study_chapters(id) on delete cascade,
  front_de text not null,
  back_de text not null,
  back_fr text not null
);

alter table public.study_flashcards enable row level security;

drop policy if exists "Users manage flashcards of their own study courses" on public.study_flashcards;
create policy "Users manage flashcards of their own study courses"
  on public.study_flashcards
  for all
  using (
    exists (
      select 1 from public.study_chapters ch
      join public.study_courses c on c.id = ch.study_course_id
      where ch.id = study_chapter_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.study_chapters ch
      join public.study_courses c on c.id = ch.study_course_id
      where ch.id = study_chapter_id and c.user_id = auth.uid()
    )
  );

-- Progression SM-2 par carte et par utilisateur. Sémantique différente de
-- `progress` (compteur correct/total) : ici on stocke l'état de
-- planification (intervalle, facteur de facilité, échéance).
create table if not exists public.study_flashcards_progress (
  flashcard_id uuid not null references public.study_flashcards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  interval_days integer not null default 0,
  ease_factor numeric not null default 2.5,
  due_at timestamptz not null default now(),
  last_grade text check (last_grade in ('again', 'hard', 'good', 'easy')),
  updated_at timestamptz not null default now(),
  primary key (flashcard_id, user_id)
);

alter table public.study_flashcards_progress enable row level security;

drop policy if exists "Users manage their own flashcard progress" on public.study_flashcards_progress;
create policy "Users manage their own flashcard progress"
  on public.study_flashcards_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Historique des tentatives d'exercice, utilisé par l'algorithme de
-- sélection pondérée (lib/study/next-up.ts) pour prioriser les types
-- d'exercice les moins maîtrisés par chapitre.
create table if not exists public.study_exercise_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_chapter_id uuid not null references public.study_chapters(id) on delete cascade,
  exercise_type text not null,
  correct boolean not null,
  answered_at timestamptz not null default now()
);

alter table public.study_exercise_history enable row level security;

drop policy if exists "Users manage their own exercise history" on public.study_exercise_history;
create policy "Users manage their own exercise history"
  on public.study_exercise_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists study_exercise_history_user_chapter_idx
  on public.study_exercise_history (user_id, study_chapter_id);
