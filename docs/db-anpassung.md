# DB Anpassung — Mise à jour de la base de données Supabase

Statut : à exécuter par toi dans le dashboard Supabase. Ce document liste
les requêtes SQL exactes, dans l'ordre, avec le contexte de sécurité.
Rien de ce document n'a été exécuté sur ta base — c'est une checklist à
suivre manuellement.

**Ce schéma a été vérifié champ par champ contre les 3 pages actuelles
du mode `/etude`** (`app/etude/page.tsx`, `app/etude/dashboard/page.tsx`,
`app/etude/[courseId]/kapitel/[id]/page.tsx`) — toutes les colonnes
qu'elles lisent existent dans ce schéma, sous les noms exacts attendus.

Dernière mise à jour : 2026-08-16.

## 0. Où exécuter ces requêtes

1. Va sur [supabase.com/dashboard](https://supabase.com/dashboard) → sélectionne ton projet `it-learn`.
2. Menu de gauche → **SQL Editor**.
3. **New query**, colle le bloc SQL concerné, clique **Run**.
4. Fais-le dans l'ordre des sections ci-dessous — certaines tables référencent les précédentes (clés étrangères).

Alternative si tu as la CLI Supabase installée en local :
```bash
supabase db push
```
Elle applique automatiquement tous les fichiers de `supabase/migrations/`
pas encore joués, dans l'ordre numérique — mais **cette fois le fichier
`0003_study_mode.sql` du dépôt ne correspond plus exactement au SQL de ce
document** (voir §7 "à reporter dans le fichier"), donc pour l'instant
utilise le copier-coller manuel dans le SQL Editor plutôt que `db push`.

**Comment savoir ce qui est déjà appliqué** :
```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'study_%'
order by table_name;
```
Si ça retourne des lignes, une partie de la migration a déjà tourné.
Tous les blocs ci-dessous utilisent `create table if not exists` et
`drop policy if exists` avant chaque `create policy`, donc les rejouer
sans rien avoir supprimé au préalable est sans risque.

---

## 1. Sécurité — ce qui est déjà garanti, et ce qui reste à vérifier

### 1.1 Mots de passe : déjà sécurisés, rien à faire

L'app utilise l'API **Supabase Auth** (`supabase.auth.signInWithPassword`,
`supabase.auth.signUp` dans `app/login/page.tsx`) — pas de système de mot
de passe fait maison :

- Le mot de passe en clair ne transite que sur HTTPS entre le navigateur et les serveurs Supabase.
- Supabase le **hashe avec bcrypt** avant tout stockage — ton code applicatif n'a jamais accès au hash ni au mot de passe en clair au-delà du formulaire de connexion.
- Il n'existe **aucune table `users` avec une colonne `password`** gérée par ce projet — les identifiants vivent dans le schéma interne `auth.*` de Supabase, que tu ne touches jamais directement.

Aucune action requise sur ce point.

### 1.2 RLS (Row Level Security) : principe appliqué partout

Chaque table `study_*` a RLS activé, avec une policy qui limite l'accès
aux lignes appartenant à l'utilisateur connecté (`auth.uid() = user_id`).
Sans ça, n'importe quel utilisateur connecté pourrait lire/modifier les
données de n'importe qui d'autre via l'API Supabase — RLS empêche ça au
niveau de la base, indépendamment de ce que le code frontend filtre ou
oublie de filtrer.

### 1.3 `with check` présent sur toutes les policies

Sur une policy `for all`, `using` contrôle la lecture (et quelles lignes
existantes peuvent être modifiées/supprimées), `with check` contrôle ce
qu'une **nouvelle ligne insérée ou modifiée** est autorisée à contenir.
Une policy sans `with check` est incomplète par omission. Toutes les
policies de ce document ont les deux — y compris `study_lessons_cache`,
qui ne l'avait pas dans la version précédente.

### 1.4 Clés d'environnement — ce qui est public, ce qui ne l'est jamais

Dans `Project Settings → API` du dashboard Supabase :

| Clé | Où l'utiliser | Peut être publique ? |
|---|---|---|
| `anon` / `public` | `.env.local` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Oui — protégée par RLS, prévue pour être exposée au navigateur |
| `service_role` | **Jamais dans ce projet** | Non, jamais — elle **contourne RLS entièrement** |
| `ANTHROPIC_API_KEY` | `.env.local`, jamais préfixée `NEXT_PUBLIC_` | Non — reste côté serveur (routes `app/api/*`) |

Vérifie que `.env.local` est listé dans `.gitignore` (déjà le cas via le
motif `.env*`) avant d'y mettre quoi que ce soit.

---

## 2. Ordre d'exécution — vue d'ensemble

| # | Contenu | Déjà en prod ? |
|---|---|---|
| 1 | `0001_progress.sql` — table `progress` mono-cours d'origine | Probablement oui si l'app tourne déjà |
| 2 | `0002_multi_course.sql` — ajoute `course_id` à `progress` | Probablement oui |
| 3 | **Ce document, §3** — tables `study_*` (mode Étude), schéma complet | **Non — à jouer maintenant** |
| 4 | **Ce document, §4** — vue de progression calculée | **Non — à jouer maintenant** |
| 5 | **Ce document, §5** — bucket Storage pour les PDF uploadés | **Non — à jouer maintenant** |

Si tu n'es pas sûr que `0001`/`0002` sont déjà appliquées :
```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'progress';
```
Si `course_id` apparaît, `0001` et `0002` sont déjà en place — passe
directement à la section 3.

---

## 3. Requête — tables `study_*` (schéma complet, aligné sur les pages)

Copie-colle ce bloc complet dans le SQL Editor et exécute-le.

**Ce qui a changé par rapport à la version précédente de ce document**,
et pourquoi — chaque page du mode `/etude` a été relue en détail pour
lister tous les champs qu'elle attend réellement :

| Colonne ajoutée | Table | Pourquoi |
|---|---|---|
| `title` | `study_chapters` | `app/etude/page.tsx` et la page chapitre affichent `chapter.title` (un champ simple), en plus de `title_de`/`title_fr` qui servent à l'ingestion IA et au cours détaillé bilingue — les deux coexistent, rien n'est supprimé |
| `code_snippets` | `study_chapters` | La page chapitre calcule `hasCode` à partir de `chapter.code_snippets`, pas de `has_code` (qui reste aussi, utilisé par le prompt d'ingestion) |
| `code_lang` | `study_chapters` | Utilisé pour choisir la coloration syntaxique (`Lang`) dans `CodeBlock` |
| `profile` | `study_chapters` | La page chapitre lit `chapter.profile` pour choisir le dosage d'exercices (`getExerciseSlots`), en plus de `study_courses.profile` qui reste la valeur de référence — synchronisée par trigger, voir plus bas |
| `file_name` | `study_course_files` | Le dashboard lit `f.file_name`, pas `f.filename` — **on garde `filename` comme colonne réelle et on ajoute `file_name` en alias via une colonne générée**, pour ne pas casser `lib/study/queries.ts` qui écrit déjà `filename` |

`mastery_pct` et `next_review`, utilisés par `app/etude/page.tsx`, ne
sont **volontairement pas** des colonnes ici — voir §4 : ce sont des
valeurs dérivées de `study_flashcards_progress`, calculées à la volée
par une vue plutôt que stockées, pour ne jamais risquer qu'elles se
désynchronisent de la vraie progression.

```sql
-- Mode Étude : nouvelles tables study_*
-- Ajout purement additif, aucune modification de progress ni de ses policies.

-- study_courses — un cours créé par l'utilisateur
create table if not exists public.study_courses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  profile       text not null check (profile in ('programming', 'theory', 'mixed')),
  detected_lang text,
  created_at    timestamptz not null default now()
);

alter table public.study_courses enable row level security;

drop policy if exists "study_courses_user_own" on public.study_courses;
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
  -- Alias en lecture seule pour matcher app/etude/dashboard/page.tsx
  -- (qui lit `f.file_name`) sans renommer la colonne source `filename`
  -- utilisée par lib/study/queries.ts.
  file_name        text generated always as (filename) stored,
  status           text not null default 'pending'
                     check (status in ('pending', 'processing', 'done', 'error')),
  error_message    text,
  uploaded_at      timestamptz not null default now(),
  processed_at     timestamptz
);

alter table public.study_course_files enable row level security;

drop policy if exists "study_course_files_user_own" on public.study_course_files;
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

  -- Titres bilingues (ingestion IA + cours détaillé) et titre simple
  -- (affichage dans app/etude/page.tsx et la page chapitre). title est
  -- rempli automatiquement depuis title_de si non fourni — voir trigger
  -- plus bas.
  title_de         text not null,
  title_fr         text not null,
  title            text,

  concepts         jsonb not null default '[]'::jsonb,
  summary          text not null,

  has_code         boolean not null default false,
  code_snippets    jsonb not null default '[]'::jsonb,
  code_lang        text,

  -- Dupliqué depuis study_courses.profile pour un accès direct depuis la
  -- page chapitre (chapter.profile) sans jointure supplémentaire ; tenu
  -- à jour automatiquement par trigger, jamais à écrire à la main.
  profile          text,

  source_file_id   uuid references public.study_course_files(id) on delete set null,
  created_at       timestamptz not null default now(),

  unique (study_course_id, "order")
);

alter table public.study_chapters enable row level security;

drop policy if exists "study_chapters_user_own" on public.study_chapters;
create policy "study_chapters_user_own"
  on public.study_chapters for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Remplit title/profile automatiquement à l'insertion ou la mise à jour,
-- pour que le code applicatif n'ait jamais à les gérer en double.
create or replace function public.study_chapters_fill_derived()
returns trigger
language plpgsql
as $$
begin
  if new.title is null then
    new.title := new.title_de;
  end if;

  select c.profile into new.profile
  from public.study_courses c
  where c.id = new.study_course_id;

  return new;
end;
$$;

drop trigger if exists study_chapters_fill_derived_trg on public.study_chapters;
create trigger study_chapters_fill_derived_trg
  before insert or update on public.study_chapters
  for each row execute function public.study_chapters_fill_derived();

-- study_lessons_cache — cours détaillé généré, mis en cache
create table if not exists public.study_lessons_cache (
  study_chapter_id  uuid primary key references public.study_chapters(id) on delete cascade,
  content           jsonb not null,
  model             text not null,
  generated_at      timestamptz not null default now()
);

alter table public.study_lessons_cache enable row level security;

drop policy if exists "study_lessons_cache_via_chapter" on public.study_lessons_cache;
create policy "study_lessons_cache_via_chapter"
  on public.study_lessons_cache for all
  using (
    exists (
      select 1 from public.study_chapters c
      where c.id = study_lessons_cache.study_chapter_id
        and c.user_id = auth.uid()
    )
  )
  with check (
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

drop policy if exists "study_flashcards_user_own" on public.study_flashcards;
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

drop policy if exists "study_flashcards_progress_user_own" on public.study_flashcards_progress;
create policy "study_flashcards_progress_user_own"
  on public.study_flashcards_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**Ce que ce bloc crée**, en résumé :

| Table | Rôle | RLS basé sur |
|---|---|---|
| `study_courses` | Un cours créé par toi (titre, profil détecté) | `user_id` direct |
| `study_course_files` | Les PDF que tu uploades pour un cours | `user_id` direct |
| `study_chapters` | Les chapitres extraits d'un PDF par l'IA | `user_id` direct |
| `study_lessons_cache` | Le cours détaillé généré, mis en cache par chapitre | via jointure vers `study_chapters` |
| `study_flashcards` | Les cartes de révision générées par chapitre | `user_id` direct |
| `study_flashcards_progress` | Ta progression de révision espacée (SM-2) par carte | `user_id` direct |

---

## 4. Requête — vue de progression (`mastery_pct`, `next_review`)

`app/etude/page.tsx` lit `chapter.mastery_pct` et `chapter.next_review`
directement sur chaque chapitre. Ces deux valeurs ne sont écrites nulle
part dans le code actuel — elles doivent être **calculées**, pas
stockées, sinon rien ne les tient à jour après chaque révision. La bonne
solution PostgreSQL est une vue :

```sql
-- Vue qui calcule, pour chaque chapitre, la maîtrise (% de cartes en
-- ease_factor élevé / peu d'échecs récents) et la prochaine échéance de
-- révision (la carte due la plus proche), à partir de la table réelle
-- study_flashcards_progress. Recalculée à chaque lecture — jamais
-- désynchronisée, rien à maintenir manuellement dans le code applicatif.

create or replace view public.study_chapters_with_progress as
select
  c.*,
  coalesce(
    round(
      100.0 * count(*) filter (
        where p.reviews > 0 and p.ease_factor >= 2.5 and p.last_grade in ('good', 'easy')
      ) / nullif(count(f.id), 0)
    ),
    0
  )::int as mastery_pct,
  min(p.due_at) filter (where p.reviews > 0) as next_review
from public.study_chapters c
left join public.study_flashcards f on f.study_chapter_id = c.id
left join public.study_flashcards_progress p
  on p.flashcard_id = f.id and p.user_id = c.user_id
group by c.id;
```

**Comment ça marche** :
- `mastery_pct` = pourcentage de cartes du chapitre dont la dernière
  révision était "good" ou "easy" avec un `ease_factor` déjà monté à 2.5+
  (signe qu'elle est bien retenue). `0` si le chapitre n'a aucune carte
  encore révisée — ce qui correspond exactement au filtre `neverExplored`
  de `app/etude/page.tsx`.
- `next_review` = la date d'échéance la plus proche parmi les cartes déjà
  révisées au moins une fois. `null` si aucune carte n'a encore été
  révisée (donc jamais "due" au sens de l'écran "Aujourd'hui").

**Une vue hérite automatiquement du RLS des tables sous-jacentes** —
comme `study_chapters` a déjà une policy RLS, cette vue est
automatiquement filtrée par utilisateur, sans policy à ajouter dessus.

**Changement côté code requis** (à faire quand tu seras prêt à reprendre
le développement, pas maintenant) : `lib/study/lesson-queries.ts` devra
lire depuis `study_chapters_with_progress` plutôt que `study_chapters`
dans `listAllStudyChaptersForUser`, pour que `mastery_pct`/`next_review`
arrivent jusqu'à `app/etude/page.tsx`. Je ne touche pas au code
maintenant, seulement à la base — tu me diras quand relancer ce chantier.

---

## 5. Requête — bucket de stockage des fichiers uploadés

Une fois les sections 3 et 4 exécutées avec succès, copie-colle ce bloc.

```sql
-- Bucket de stockage pour les fichiers de cours uploadés dans le mode
-- étude (/etude). Upload direct client → Storage (pas via une route API
-- Next, qui a une limite de payload trop basse pour des PDF de cours
-- complets). Chemin attendu : {user_id}/{study_course_id}/{filename},
-- pour que les policies RLS puissent s'appuyer sur le premier segment
-- du chemin.

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
```

**Pourquoi `public = false`** : le bucket est privé — les fichiers ne
sont jamais accessibles par une URL publique directe. Seul un
utilisateur authentifié dont l'ID correspond au premier segment du
chemin de stockage peut lire/écrire son propre fichier.

**Vérification après exécution** : onglet **Storage** du dashboard, le
bucket `study-course-files` doit apparaître avec un cadenas (privé).

---

## 6. Vérification finale

```sql
-- 1. Tables présentes, RLS actif, au moins une policy chacune
select
  t.table_name,
  (select count(*) from pg_policies p where p.tablename = t.table_name) as nb_policies,
  c.relrowsecurity as rls_active
from information_schema.tables t
join pg_class c on c.relname = t.table_name
where t.table_schema = 'public'
  and t.table_name like 'study_%'
order by t.table_name;

-- 2. La vue de progression existe et se lit sans erreur
select * from public.study_chapters_with_progress limit 1;

-- 3. Le bucket existe et est privé
select id, public from storage.buckets where id = 'study-course-files';
```

Résultat attendu : 6 lignes dans la première requête, `rls_active = true`
partout, `nb_policies >= 1` partout ; la deuxième requête ne renvoie pas
d'erreur (même si elle renvoie 0 ligne, faute de données) ; la troisième
renvoie une ligne avec `public = false`.

Si une ligne de la première requête a `rls_active = false` ou
`nb_policies = 0`, ne lance pas l'app dessus tant que ce n'est pas
corrigé — ça exposerait les données de tous les utilisateurs à tous les
autres utilisateurs authentifiés.

---

## 7. À reporter dans le fichier de migration versionné (plus tard)

Ce document contient le SQL de référence à exécuter maintenant dans le
dashboard. Le fichier `supabase/migrations/0003_study_mode.sql` du dépôt
n'a **pas** été mis à jour avec ce contenu — je n'ai touché à aucun
fichier de code dans ce tour, uniquement à ce document. Quand tu seras
prêt à reprendre le code, il faudra reporter le SQL des sections 3 et 4
dans le fichier de migration (et créer un `0005_study_progress_view.sql`
séparé pour la vue, par cohérence avec le découpage existant), pour que
`supabase db push` reste la source de vérité à terme.
