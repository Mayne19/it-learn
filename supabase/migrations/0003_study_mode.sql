-- Mode Étude : nouvelles tables study_*
-- Ajout purement additif, aucune modification de progress ni de ses policies.

-- study_courses — un cours créé par l'utilisateur
create table if not exists public.study_courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  profile     text not null check (profile in ('programming', 'theory', 'mixed')),
  detected_lang text,
  created_at  timestamptz not null default now()
);

alter table public.study_courses enable row level security;

create policy "study_courses_user_own"
  on public.study_courses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- study_course_files — fichiers uploadés (PDF, slides)
create table if not exists public.study_course_files (
  id               uuid primary key default gen_random_uuid(),
  study_course_id  uuid not null references public.study_courses(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  storage_path     text not null,
  filename         text not null,
  status           text not null default 'pending'
                     check (status in ('pending', 'processing', 'done', 'error')),
  error_message    text,
  uploaded_at      timestamptz not null default now(),
  processed_at     timestamptz
);

alter table public.study_course_files enable row level security;

create policy "study_course_files_user_own"
  on public.study_course_files for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- study_chapters — chapitres extraits (un par bloc logique du PDF)
create table if not exists public.study_chapters (
  id               uuid primary key default gen_random_uuid(),
  study_course_id  uuid not null references public.study_courses(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  "order"          integer not null,
  title_de         text not null,
  title_fr         text not null,
  concepts         jsonb not null default '[]'::jsonb,
  summary          text not null,
  has_code         boolean not null default false,
  source_file_id   uuid references public.study_course_files(id) on delete set null,
  created_at       timestamptz not null default now(),

  unique (study_course_id, "order")
);

alter table public.study_chapters enable row level security;

create policy "study_chapters_user_own"
  on public.study_chapters for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- study_lessons_cache — cours détaillé généré, mis en cache
create table if not exists public.study_lessons_cache (
  study_chapter_id  uuid primary key references public.study_chapters(id) on delete cascade,
  content           jsonb not null,
  model             text not null,
  generated_at      timestamptz not null default now()
);

alter table public.study_lessons_cache enable row level security;

create policy "study_lessons_cache_via_chapter"
  on public.study_lessons_cache for all
  using (
    exists (
      select 1 from public.study_chapters c
      where c.id = study_lessons_cache.study_chapter_id
        and c.user_id = auth.uid()
    )
  );

-- study_flashcards — jeu de flashcards généré par chapitre
create table if not exists public.study_flashcards (
  id               uuid primary key default gen_random_uuid(),
  study_chapter_id uuid not null references public.study_chapters(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  front_de         text not null,
  back_de          text not null,
  back_fr          text not null,
  created_at       timestamptz not null default now()
);

alter table public.study_flashcards enable row level security;

create policy "study_flashcards_user_own"
  on public.study_flashcards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- study_flashcards_progress — progression SM-2 par carte et par utilisateur
create table if not exists public.study_flashcards_progress (
  flashcard_id    uuid not null references public.study_flashcards(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  interval_days   integer not null default 1,
  ease_factor     real not null default 2.5,
  due_at          timestamptz not null default now(),
  last_grade      text check (last_grade in ('again', 'hard', 'good', 'easy')),
  reviews         integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  primary key (flashcard_id, user_id)
);

alter table public.study_flashcards_progress enable row level security;

create policy "study_flashcards_progress_user_own"
  on public.study_flashcards_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
