# Plan d'implémentation — Mode Étude au quotidien (`/etude`)

Statut : **plan détaillé, prêt pour implémentation étape par étape.**
Fondé sur : `docs/etude-mode-plan.md` (proposition de base) + analyse du code source existant.
Dernière mise à jour : 2026-08-16.

---

## Résumé exécutif

**Ce que c'est** : un outil d'apprentissage au jour le jour, complémentaire à la phase Klausur existante. L'utilisateur upload ses vrais PDF de cours du semestre → le système détecte le type de cours → génère des cours exhaustifs, des flashcards, et des exercices adaptés au profil (programmation → code, théorie → QCM/matching, mixte → combiné). Interface ludique et motivante, avec répétition espacée (SM-2).

**Langue** : contenu **majoritairement en allemand** (Fachbegriffe, explications, exercices). Le français sert de complément pédagogique pour élucider les concepts difficiles — pas pour tout traduire. Quand le français est utilisé, c'est avec un bon niveau, rigoureusement. Les Fachbegriffe allemands sont toujours respectés (jamais traduits par erreur).

**UX/UI** : l'interface doit donner envie d'apprendre — couleurs claires, animations légères, feedbacks positifs, progression visible, sens du "machen Spaß". Chaque écran doit donner envie de continuer, pas de fermer l'onglet.

**Isolation** : le mode étude vit dans son propre espace (`/etude`), ses propres fichiers (`lib/study/*`), ses propres tables Supabase (`study_*`). **Aucun fichier existant n'est modifié.** Own `.env.local` = même clé Anthropic, mais tables Supabase séparées.

**Coût estimé** : ~10-12 $ sur tout le semestre (1 seul utilisateur, usage quotidien, Sonnet partout).

**Base technique** : Next.js 16, React 19, Supabase, Anthropic Claude Sonnet (qualité pédagogique maximale).

**Tests** : chaque étape est testée rigoureusement avant de passer à la suivante. Quand les vrais cours du semestre seront disponibles, tests grandeur nature avec les vrais PDF.

---

## 1. Faisabilité — vérification du code existant

| Point vérifié | Résultat |
|---|---|
| Auth Supabase | ✅ Fonctionnelle, utilisable telle quelle pour le mode étude |
| Table `progress` + RPC `upsert_progress` | ✅ Reste intacte pour le mode Klausur. Nouvelle table `study_flashcards_progress` séparée |
| `lib/pyodide.ts` + `components/exercises/code-exercise.tsx` | ✅ Réutilisables pour les exercices de programmation du nouveau mode |
| Composants UI (Card, Badge, Alert, Spinner, Collapsible) | ✅ Disponibles dans `components/ui/*` |
| Composants exercices (`components/exercises/mcq-exercise.tsx` etc.) | ✅ Réutilisables si on adapte les props (les formats JSON sont suffisamment proches) |
| `proxy.ts` (auth middleware) | ✅ Protège déjà toutes les routes, `/etude/*` sera automatiquement protégé |
| Format JSON des exercices (`lib/prompts.ts`) | ✅ Base solide, les prompts existants font déjà du bilingue DE/FR |

**Verdict** : faisable à 100% sans toucher aux fichiers existants.

---

## 2. Choix IA et coûts (tarifs vérifiés au 16/08/2026)

### 2.1 Tarifs Anthropic actuels (par million de tokens)

| Modèle | Input | Output | Cache read | Cache write (5min) |
|---|---|---|---|---|
| Claude Sonnet 4.6 (`claude-sonnet-4-6`) | 3 $ | 15 $ | 0.30 $ | 3.75 $ |
| Claude Haiku 4.5 (`claude-haiku-4-5`) | 1 $ | 5 $ | 0.10 $ | 1.25 $ |

### 2.2 Quel modèle pour quelle tâche

**Décision : Sonnet pour tout.** Haiku est réservé en réserve si besoin de réduire, mais la priorité est la qualité pédagogique.

| Tâche | Modèle | Justification |
|---|---|---|
| Ingestion PDF (découpage chapitres + détection profil) | **Sonnet** | Contenu ambigu, jugement nécessaire → qualité. 1× par fichier (caché) |
| Cours détaillé pédagogique | **Sonnet** | Rédaction riche, analogies, mnémotechniques. 1× par chapitre (caché) |
| Flashcards (génération) | **Sonnet** | Questions pertinentes, traductions FR nuancées, pièges fins. 1× par chapitre (caché) |
| Speed Round, exercices session | **Sonnet** | Distracteurs intelligents, explications pédagogiques. Non caché (variabilité) |
| Exercices adaptés (QCM, matching, etc.) | **Sonnet** | Même exigence de qualité que le Speed Round |

### 2.3 Pourquoi rester sur Anthropic avec Sonnet

- **Déjà intégré** : aucun SDK supplémentaire, aucune clé API en plus, zero complexité d'intégration
- **Qualité pédagogique** : Sonnet produit des flashcards plus pertinentes, des distracteurs plus fins, des explications plus riches — c'est ce qui rend l'outil "pointu"
- **Coût maîtrisé** : ~12 $/semestre pour 1 utilisateur, pas un poste de dépense significatif
- **Pourquoi pas Haiku pour les tâches fréquentes ?** : la différence de qualité se voit sur les distracteurs du Speed Round et la richesse des explications FR. Pour ~6 $ de plus sur un semestre, Sonnet partout vaut le coup
- **Pourquoi pas Gemini Flash (0.15$/M) ou DeepSeek (0.14$/M) ?** : 10-20× moins cher par token, mais nécessite un 2e SDK, des 2es clés API, gérer 2 formats de réponse, 2 stratégies d'erreur. **Option gardée en backlog** : abstraction via `lib/study/llm.ts` permettrait de basculer plus tard sans tout réécrire.

### 2.4 Estimation de coût par semestre (Sonnet pour tout)

| Poste | Calcul | Coût |
|---|---|---|
| Ingestion (20 fichiers, ~15-40k tokens in chacun) | 20 × 0.15 $ | ~3 $ |
| Cours détaillé (60 chapitres, ~1.5k in / ~3k out) | 60 × 0.015 $ | ~1 $ |
| Flashcards (60 chapitres, ~1k in / ~1.5k out) | 60 × 0.005 $ | ~0.30 $ |
| Pratique quotidienne (18 exos/session × 120 jours) | 2160 × 0.003 $ | ~6 $ |
| **Total semestre** | | **~10-12 $** |

---

## 3. Architecture — nouveaux fichiers

```
lib/study/
  types.ts                    # Types TypeScript (StudyCourse, StudyChapter, Flashcard, etc.)
  ai-client.ts                # Helper unifié : callClaude({ model, prompt, maxTokens })
  exercise-strategy.ts        # Moteur d'adaptation : CourseProfile → types d'exercices
  spaced-repetition.ts        # Algorithme SM-2 pur (logique pure, pas d'API)

components/study/
  course-card.tsx              # Carte d'un cours sur le dashboard (titre DE, profil)
  upload-zone.tsx              # Drag & drop / selecteur de fichiers PDF
  chapter-list.tsx             # Liste des chapitres extraits (titres DE, profil détecté)
  detailed-lesson-view.tsx     # Cours exhaustif (DE principal, FR complément)
  flashcard-view.tsx           # Interface flashcards (front DE, back DE+FR, flip animation)
  speed-round-view.tsx         # Speed Round chronométré (questions DE, explications FR)
  today-card.tsx               # Carte "Aujourd'hui" (dash homepage)

app/etude/
  page.tsx                     # Dashboard /today (entrée principale)
  [courseId]/
    page.tsx                   # Vue d'un cours (chapitres, fichiers)
    kapitel/[id]/
      page.tsx                 # Vue d'un chapitre (cours + exercices)

app/api/study/
  courses/
    route.ts                   # GET liste, POST création
  upload/
    route.ts                   # POST upload fichier vers Supabase Storage + lancement ingestion
  ingest/
    route.ts                   # POST : extraction texte + analyse IA → chapitres proposés
  chapters/
    route.ts                   # POST : sauvegarde des chapitres validés
  lesson/
    route.ts                   # POST : cours détaillé d'un chapitre (caché en base)
  flashcards/
    route.ts                   # GET flashcards d'un chapitre, POST nouvelle génération
    review/
      route.ts                 # POST : enregistre un grade (again/hard/good/easy)
  exercises/
    speed-round/
      route.ts                 # POST : génère un set d'exercices Speed Round
    adapted/
      route.ts                 # POST : génère un exercice adapté au profil

supabase/migrations/
  0003_study_mode.sql          # Nouvelles tables study_*

public/
  (rien de nouveau)
```

---

## 3b. Politique linguistique — DE primaire, FR complément

### Règle fondamentale

**L'allemand est la langue principale.** Le français sert uniquement à :
- Expliquer un concept difficile quand l'explication allemande seule ne suffit pas
- Donner une astuce/mnémotechnique en français
- Traduire les explications de pièges/fréquente erreurs

**Le français n'est JAMAIS utilisé pour :**
- Les titres de chapitres (toujours DE)
- Les questions d'exercices (toujours DE)
- Les options de QCM (toujours DE)
- Les termes techniques / Fachbegriffe (toujours en DE, jamais traduits)

### Exemples concrets

| Élément | Langue | Exemple |
|---|---|---|
| Titre de chapitre | DE | "Vererbung und Polymorphie" |
| Question QCM | DE | "Was ist der Unterschied zwischen extends und implements?" |
| Options QCM | DE | "A: Vererbung vs. Implementierung" |
| Explication d'un piège | DE + FR | "Achtung: extends ≠ implements" / "Attention : extends ≠ implements, deux mécanismes différents" |
| Méthode mnémotechnique | FR | "Pense à l'héritage comme à une famille : l'enfant hérite des traits des parents" |
| Flashcard front | DE | "Was ist Polymorphie?" |
| Flashcard back | DE + FR | "Eine Methode kann je nach Objekttyp unterschiedliches Verhalten zeigen" / "Une méthode peut avoir un comportement selon le type d'objet" |
| Explication de cours | DE | "Polymorphie ermöglicht es, verschiedene Implementierungen unter einer gemeinsamen Schnittstelle zu verwenden" |
| Note FR complémentaire | FR | "(en français : le polymorphisme permet d'utiliser différentes implémentations sous une interface commune)" |

### Fachbegriffe — règles strictes

Les termes techniques allemands **ne sont jamais traduits** dans les contenus DE :
- `Vererbung` (pas "héritage" dans un texte DE)
- `Polymorphie` (pas "polymorphisme")
- `Schnittstelle` (pas "interface" — sauf si c'est un mot technique accepté en DE)
- `Referenz` (pas "référence")
- `Instanzvariable` (pas "variable d'instance")

Exception : quand une explication FR est ajoutée en complément, la traduction FR est donnée entre parenthèses.

---

## 3c. UX/UI — "machen Spaß" et motivation

### Principes de design

1. **Donner envie d'apprendre** : chaque écran doit être visuellement attractif, pas austère
2. **Feedback positif immédiat** : animation de succès quand une réponse est correcte, streak visible
3. **Progression visible** : barres de progression, compteurs de chapitres complétés, temps de révision
4. **Variété** : pas toujours le même format — alterner flashcards, Speed Round, exercices classiques
5. **Ton amical** : les messages d'encouragement, les explications de pièges doivent sentir le prof qui veut t'aider, pas l'examen qui te juge

### Éléments visuels spécifiques

- **Dashboard** (`/etude`) : cartes colorées par cours, nombre de chapitres "aujourd'hui", streak de révision, prochain exercice recommandé
- **Flashcards** : design "carte à retourner" avec flip animation, couleurs differentes par statut (nouveau = bleu, en cours = orange, maîtrisé = vert)
- **Speed Round** : chronomètre visible, barre de score en temps réel, animation de streak, écran de résumé avec statistiques
- **Cours détaillé** : sections bien séparées, code avec coloration syntaxique, callouts colorés pour pièges/alertes
- **Chapitre** : vue d'ensemble avec score global, liens rapides vers les exercices, indicateur "dernière révision"

### Feedback et micro-interactions

- ✅ Bonne réponse : flash vert + son léger + "+10 pts"
- ❌ Mauvaise réponse : flash rouge + explication FR qui s'affiche
- 🔥 Streak : compteur visible, milestone à 5/10/25/50
- 📊 Progression : mise à jour en temps réel après chaque action

---

## 3d. Environnement isolé — env et DB séparés

### Variables d'environnement

Le mode étude partage `ANTHROPIC_API_KEY` avec le reste du projet, mais utilise ses propres tables Supabase. Pas besoin de variables supplémentaires pour la DB — les tables `study_*` vivent dans le même projet Supabase que `progress`.

### Tables Supabase

Toutes les tables du mode étude sont préfixées `study_` :
- `study_courses`
- `study_course_files`
- `study_chapters`
- `study_lessons_cache`
- `study_flashcards`
- `study_flashcards_progress`

Aucune modification des tables existantes (`progress`). Les politiques RLS sont indépendantes.

### Séparation des routes

- Existant : `/cours/*`, `/kapitel/*`, `/api/exercise`, `/api/lesson`, `/api/klausur`
- Nouveau : `/etude/*`, `/api/study/*`

Les deux coexistent sans interaction. L'auth Supabase est partagée (même projet).

---

## 3e. Stratégie de tests

### Tests par étape

Chaque étape est testée **avant de passer à la suivante** :

| Étape | Test requis | Critère de succès |
|---|---|---|
| 0 — Fondations | `pnpm build` vert, migration appliquée | 0 erreur, 0 régression |
| 1 — Upload & ingestion | Uploader un vrai PDF, vérifier les chapitres extraits | Découpage cohérent, profil correct |
| 2 — Cours détaillé | Générer un cours pour 2 chapitres (1 theorique, 1 prog) | Couverture complète, FR correct, Fachbegriffe respectés |
| 3 — Stratégie exercices | Vérifier sur 3 profils | Exercices pertinents, pas de code si pas de code |
| 4 — Lernkartei | Générer flashcards + simuler 5 reviews SM-2 | Intervalles qui croissent, dates correctes |
| 5 — Speed Round | Jouer 3 manches | Fun, JSON valide, explications FR correctes |
| 6 — Dashboard | Vérifier les 3 sections | Cartes dues, chapitres vus, exercice recommandé |

### Tests grandeur nature

Quand les vrais cours du semestre seront disponibles :
1. Uploader 2-3 vrais PDF (un complet + 1-2 Vorlesung)
2. Vérifier que le découpage est cohérent avec la vraie structure du cours
3. Tester les flashcards sur un chapitre complet — sont-elles vraiment utiles ?
4. Jouer au Speed Round — est-ce que ça donne envie de continuer ?
5. Vérifier le coût réel après 1 semaine d'usage

### Tests de non-régression

Après chaque étape, vérifier que :
- Les anciennes routes fonctionnent toujours
- Le build reste propre
- L'auth fonctionne dans les deux modes

---

## 4. Migration Supabase (`0003_study_mode.sql`)

```sql
-- Mode Étude : nouvelles tables study_*
-- Ajout purement additif, aucune modification de progress ni de ses policies.

-- 4.1 study_courses — un cours créé par l'utilisateur
create table if not exists public.study_courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  profile     text not null check (profile in ('programming', 'theory', 'mixed')),
  detected_lang text,  -- 'java' | 'python' | 'perl' | 'javascript' | null
  created_at  timestamptz not null default now()
);

alter table public.study_courses enable row level security;

create policy "study_courses_user_own"
  on public.study_courses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4.2 study_course_files — fichiers uploadés (PDF, slides)
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

-- 4.3 study_chapters — chapitres extraits (un par bloc logique du PDF)
create table if not exists public.study_chapters (
  id               uuid primary key default gen_random_uuid(),
  study_course_id  uuid not null references public.study_courses(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  "order"          integer not null,
  title_de         text not null,
  title_fr         text not null,
  concepts         jsonb not null default '[]'::jsonb,  -- tableau de chaînes
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

-- 4.4 study_lessons_cache — cours détaillé généré, mis en cache
create table if not exists public.study_lessons_cache (
  study_chapter_id  uuid primary key references public.study_chapters(id) on delete cascade,
  content           jsonb not null,  -- le cours détaillé complet (sections, code, pièges, etc.)
  model             text not null,   -- ex: 'claude-sonnet-4-6'
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

-- 4.5 study_flashcards — jeu de flashcards généré par chapitre
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

-- 4.6 study_flashcards_progress — progression SM-2 par carte et par utilisateur
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
```

---

## 5. Types TypeScript (`lib/study/types.ts`)

```ts
import type { Lang } from "@/lib/chapters/types"

export type CourseProfile = "programming" | "theory" | "mixed"

export interface StudyCourse {
  id: string
  user_id: string
  title: string
  profile: CourseProfile
  detected_lang: Lang | null
  created_at: string
}

export interface StudyCourseFile {
  id: string
  study_course_id: string
  user_id: string
  storage_path: string
  filename: string
  status: "pending" | "processing" | "done" | "error"
  error_message: string | null
  uploaded_at: string
  processed_at: string | null
}

export interface StudyChapter {
  id: string
  study_course_id: string
  user_id: string
  order: number
  title_de: string
  title_fr: string
  concepts: string[]
  summary: string
  has_code: boolean
  source_file_id: string | null
  created_at: string
}

export interface LessonCache {
  study_chapter_id: string
  content: DetailedLesson
  model: string
  generated_at: string
}

export interface DetailedLesson {
  title_de: string
  intro_fr: string
  sections: {
    heading_de: string
    content_de: string          // langue principale — explication détaillée
    content_fr: string | null   // complément FR UNIQUEMENT pour concepts difficiles (null si pas nécessaire)
    code: string | null
    method_fr: string           // astuce/mnémotechnique en français (obligatoire)
    example_concret: string | null  // exemple concret illustratif
  }[]
  key_points_de: string[]       // points essentiels en allemand
  traps: { trap_de: string; trap_fr: string }[]  // pièges DE + explication FR
}

export interface Flashcard {
  id: string
  study_chapter_id: string
  user_id: string
  front_de: string
  back_de: string
  back_fr: string
}

export interface FlashcardProgress {
  flashcard_id: string
  user_id: string
  interval_days: number
  ease_factor: number
  due_at: string
  last_grade: "again" | "hard" | "good" | "easy" | null
  reviews: number
}

/** Types d'exercices disponibles dans le mode étude */
export type StudyExerciseType =
  | "mcq"
  | "matching"
  | "trueFalse"
  | "fillBlank"
  | "codeAnalysis"
  | "code"          // Python exécutable via Pyodide
  | "speedRound"
  | "bugHunt"       // trouver et corriger des erreurs dans du code
  | "conceptMap"    // relier des concepts entre eux (textuel)
```

---

## 6. Helper IA unifié (`lib/study/ai-client.ts`)

```ts
type ClaudeModel = "claude-sonnet-4-6"  // Sonnet pour tout (qualité pédagogique)
// "claude-haiku-4-5" réservé si besoin de réduire les coûts plus tard

interface CallClaudeOptions {
  model: ClaudeModel
  prompt: string
  maxTokens?: number
}

export async function callClaude({ model, prompt, maxTokens = 2000 }: CallClaudeOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante")

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? "Erreur Anthropic")

  const text = data.content?.[0]?.text ?? ""
  return text
}

/** Extrait le premier JSON valide d'une réponse IA */
export function extractJSON(text: string): unknown {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("Pas de JSON trouvé dans la réponse IA")
  return JSON.parse(text.slice(start, end + 1))
}
```

---

## 7. Algorithme SM-2 (`lib/study/spaced-repetition.ts`)

```ts
/** Note de révision selon la qualité de la réponse */
export type Grade = "again" | "hard" | "good" | "easy"

interface CardState {
  interval_days: number
  ease_factor: number
  reviews: number
}

const MIN_EASE = 1.3

/**
 * SM-2 simplifié : calcule le prochain état d'une carte après un grade.
 * Logique pure, pas d'effet de bord, testable sans mock.
 *
 * - again : on recommence (interval = 1), ease baisse
 * - hard : interval × 1.2, ease baisse légèrement
 * - good : interval × ease_factor, ease stable ou léger bonus
 * - easy : interval × ease_factor × 1.3, ease augmente
 */
export function scheduleNext(state: CardState, grade: Grade): CardState {
  const { interval_days, ease_factor, reviews } = state

  switch (grade) {
    case "again":
      return {
        interval_days: 1,
        ease_factor: Math.max(MIN_EASE, ease_factor - 0.2),
        reviews: reviews + 1,
      }

    case "hard":
      return {
        interval_days: Math.max(1, Math.ceil(interval_days * 1.2)),
        ease_factor: Math.max(MIN_EASE, ease_factor - 0.15),
        reviews: reviews + 1,
      }

    case "good": {
      const newEase = reviews === 0
        ? ease_factor
        : Math.min(ease_factor + 0.05, 3.0)
      return {
        interval_days: Math.max(1, Math.ceil(interval_days * ease_factor)),
        ease_factor: newEase,
        reviews: reviews + 1,
      }
    }

    case "easy":
      return {
        interval_days: Math.max(1, Math.ceil(interval_days * ease_factor * 1.3)),
        ease_factor: Math.min(ease_factor + 0.15, 3.0),
        reviews: reviews + 1,
      }
  }
}

/** Calcule la date de prochaine révision (jours depuis aujourd'hui) */
export function daysUntilDue(state: CardState, grade: Grade): number {
  return scheduleNext(state, grade).interval_days
}
```

---

## 8. Moteur d'adaptation des exercices (`lib/study/exercise-strategy.ts`)

```ts
import type { CourseProfile, StudyExerciseType } from "./types"

interface ExerciseSlot {
  type: StudyExerciseType
  weight: number  // 0-1, pondère la fréquence de sélection
  requires_code: boolean
}

/**
 * Détermine les exercices disponibles et leur dosage selon le profil.
 * Logique pure (pas d'appel IA).
 */
export function getExerciseSlots(profile: CourseProfile, hasCode: boolean): ExerciseSlot[] {
  switch (profile) {
    case "programming":
      return [
        { type: "speedRound",   weight: 0.20, requires_code: false },
        { type: "code",         weight: 0.25, requires_code: true },
        { type: "bugHunt",      weight: 0.20, requires_code: true },
        { type: "fillBlank",    weight: 0.15, requires_code: false },
        { type: "mcq",          weight: 0.10, requires_code: false },
        { type: "codeAnalysis", weight: 0.10, requires_code: true },
      ].filter(s => !s.requires_code || hasCode)

    case "theory":
      return [
        { type: "speedRound",  weight: 0.20, requires_code: false },
        { type: "mcq",         weight: 0.25, requires_code: false },
        { type: "matching",    weight: 0.20, requires_code: false },
        { type: "trueFalse",   weight: 0.15, requires_code: false },
        { type: "fillBlank",   weight: 0.10, requires_code: false },
        { type: "conceptMap",  weight: 0.10, requires_code: false },
      ]

    case "mixed":
      return [
        { type: "speedRound",   weight: 0.15, requires_code: false },
        { type: "mcq",          weight: 0.15, requires_code: false },
        { type: "code",         weight: 0.15, requires_code: true },
        { type: "matching",     weight: 0.10, requires_code: false },
        { type: "trueFalse",    weight: 0.10, requires_code: false },
        { type: "bugHunt",      weight: 0.10, requires_code: true },
        { type: "fillBlank",    weight: 0.10, requires_code: false },
        { type: "conceptMap",   weight: 0.05, requires_code: false },
      ].filter(s => !s.requires_code || hasCode)
  }
}

/** Sélectionne un type au hasard pondéré par les weights */
export function pickRandomExerciseType(slots: ExerciseSlot[]): StudyExerciseType {
  const total = slots.reduce((s, slot) => s + slot.weight, 0)
  let rand = Math.random() * total
  for (const slot of slots) {
    rand -= slot.weight
    if (rand <= 0) return slot.type
  }
  return slots[slots.length - 1].type
}
```

---

## 9. Étapes d'implémentation — détail

### Prérequis : `.env.local`

Avant de commencer, créer un fichier `.env.local` à la racine du projet avec au minimum :

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Sans cette clé, aucune route `/api/study/*` ne fonctionnera (erreur 500). Les variables Supabase seront ajoutées à l'étape 1.

### Étape 0 — Fondations

**Fichiers à créer :**
- `lib/study/types.ts`
- `lib/study/ai-client.ts`
- `lib/study/spaced-repetition.ts`
- `lib/study/exercise-strategy.ts`
- `supabase/migrations/0003_study_mode.sql`

**Tests :**
1. `supabase db push` ou exécution manuelle du SQL → tables créées sans erreur
2. `pnpm build` → vert, aucune erreur
3. Les anciennes routes `/cours/*`, `/kapitel/*`, `/api/exercise`, `/api/lesson`, `/api/klausur` fonctionnent toujours

**Critère de validation :** 0 régression, les types compilent, la migration est purement additive.

---

### Étape 1 — Upload & ingestion de cours

**Dépendance à ajouter :** `unpdf` (extraction texte PDF côté serveur, wrapper de pdf.js) ou `pdfjs-dist` directement.
```bash
pnpm add unpdf
```

**Fichiers :**
- `app/etude/page.tsx` — dashboard principal (liste des cours + formulaire création)
- `app/api/study/courses/route.ts` — GET (liste), POST (création)
- `app/api/study/upload/route.ts` — POST multipart → upload vers Supabase Storage bucket `study-files`
- `app/api/study/ingest/route.ts` — POST : lecture du fichier dans Storage, extraction texte, envoi Sonnet pour analyse

**Contrat d'API `POST /api/study/ingest` :**
```jsonc
// Entrée
{ "course_file_id": "uuid" }

// Sortie (proposé par l'IA, utilisateur valide)
{
  "profile": "programming",
  "detected_lang": "java",
  "chapters": [
    {
      "order": 1,
      "title_de": "Einführung in Java",
      "title_fr": "Introduction à Java",
      "concepts": ["JVM", "bytecode", "JDK", "JRE"],
      "summary": "Fondamentaux de l'exécution Java...",
      "has_code": false
    }
  ]
}
```

**Flux utilisateur :**
1. Crée un cours (titre libre) → arrive sur la page du cours
2. Upload un ou plusieurs fichiers (PDF ou texte) → statut "pending" dans `study_course_files`
3. Lance l'ingestion → statut "processing" → Sonnet analyse le PDF
4. Résultat affiché : profil détecté + chapitres proposés → l'utilisateur valide ou corrige
5. Validation → POST `/api/study/chapters` → chapitres enregistrés dans `study_chapters`

**Prompt d'ingestion (Sonnet) :**
```
Du bist ein Analytiker für universitäre Kursmaterialien. Extrahiere aus dem folgenden Text die Kapitelstruktur.

Text aus dem PDF:
---
{text}
---

Für jedes Kapitel / jeden logischen Block:
- title_de: Titel auf Deutsch (originalgetreu aus dem Kursmaterial)
- title_fr: Titel übersetzt ins Französische
- concepts: Liste der Schlüsselkonzepte (3-8), auf Deutsch
- summary: Zusammenfassung in 2-3 Sätzen, auf Deutsch
- has_code: true wenn das Kapitel Programmiercode enthält

Zusätzlich erkenne:
- profile: "programming" | "theory" | "mixed"
- detected_lang: "java" | "python" | "perl" | "javascript" | null

Antworte AUSSCHLIESSLICH mit gültigem JSON. Kein Markdown, keine Backticks.
```

**Tests :**
1. Uploader un PDF de slides (texte extrait proprement → chapitres cohérents)
2. Uploader un PDF contenant du code → `has_code: true`, `profile: programming`
3. Vérifier le statut dans la table `study_course_files` passe de `pending` → `processing` → `done`

---

### Étape 2 — Cours détaillé exhaustif

**Fichiers :**
- `app/api/study/lesson/route.ts` — POST, cache dans `study_lessons_cache`
- `components/study/detailed-lesson-view.tsx`
- `app/etude/[courseId]/kapitel/[id]/page.tsx` — page d'un chapitre

**Contrat d'API `POST /api/study/lesson` :**
```jsonc
// Entrée
{ "chapter_id": "uuid" }

// Sortie (cours détaillé complet, stocké dans study_lessons_cache.content)
{
  "title_de": "Vererbung in Java",
  "intro_fr": "La héritage est le mécanisme par lequel une classe acquired les attributs et méthodes d'une autre...",
  "sections": [
    {
      "heading_de": "Vererbung — Grundlagen",
      "content_de": "Vererbung ermöglicht es, eine Klasse von einer anderen abzuleiten...",
      "content_fr": "L'héritage permet de dériver une classe d'une autre...",
      "code": "class Tier { void rufen() { ... } }\nclass Hund extends Tier { ... }",
      "method_fr": "Pense à l'héritage comme à une famille : l'enfant hérite des traits des parents mais peut les modifier.",
      "example_concret": "Dans un jeu vidéo, 'EnnemiVolant' hérite de 'Ennemi' mais ajoute la méthode 'voler()'."
    }
  ],
  "key_points_de": [
    "extends für Klassen, implements für Interfaces",
    "Konstruktor wird NICHT vererbt",
    "private Mitglieder sind NICHT sichtbar in Subklassen"
  ],
  "traps": [
    {
      "trap_de": "extends vs. implements verwechseln",
      "trap_fr": "extends = héritage de classe, implements = implémentation d'interface — ce sont deux mécanismes différents"
    }
  ]
}
```

**Prompt du cours détaillé (Sonnet) :**
```
Du bist ein erfahrener Universitätsprofessor. Erstelle einen erschöpfenden, pädagogischen Kurs zum Kapitel "{title_de}".

Der Student ist frankophon, studiert in Deutschland, und muss ALLES in diesem Kapitel verstehen.

Quelleninhalt des Kapitels:
---
{chapter_summary}
Konzepte: {concepts}
---

SPRACHREGELN (WICHTIG):
- content_de: HAUPTSPRACHE — ausführliche Erklärung auf Deutsch (3-5 Sätze pro Abschnitt)
- content_fr: NUR als Ergänzung — kurze french Erklärung für schwierige Konzepte (1-2 Sätze)
- method_fr: Astuce/Mnémotechnique EN FRANÇAIS pour mémoriser
- Fachbegriffe: TOUJOURS en allemand, jamais traduits (Vererbung, Polymorphie, etc.)

Règles:
1. UNE SECTION par concept clé (aucun concept ne doit être oublié)
2. Chaque section contient:
   - content_de: explication détaillée en allemand (3-5 phrases, langue principale)
   - content_fr: explication courte en français UNIQUEMENT si le concept est difficile (sinon null)
   - code: exemple de code si pertinent, null sinon
   - method_fr: astuce ou analogie en français pour retenir (obligatoire)
   - example_concret: exemple concret de la vraie vie ou du cours
3. key_points_de: liste des 3-7 points essentiels à retenir pour l'examen (en DE)
4. traps: pièges fréquents (2-4), chaque piege a trap_de (DE) et trap_fr (FR)

Antworte AUSSCHLIESSLICH mit gültigem JSON. Kein Markdown.
```

**Tests :**
1. Générer le cours pour un chapitre théorique (ex: Projektmanagement) → vérifier couverture complète
2. Générer le cours pour un chapitre de programmation (ex: Java Vererbung) → vérifier présence de code + analogies
3. Vérifier que `method_fr` est bien présent dans chaque section
4. Recharger la page → le cours doit venir du cache (pas d'appel IA)

---

### Étape 3 — Moteur d'adaptation (déjà fait à l'étape 0)

`lib/study/exercise-strategy.ts` est déjà créé. Tests :
1. Pour chaque profil (programming/theory/mixed) → la liste d'exercices est cohérente
2. Si `has_code: false` → aucun exercice requérant du code n'est proposé
3. `pickRandomExerciseType` retourne bien des types différents sur 100 appels

---

### Étape 4 — Lernkartei (flashcards + SM-2)

**Fichiers :**
- `app/api/study/flashcards/route.ts` — GET (cartes d'un chapitre) + POST (générer)
- `app/api/study/flashcards/review/route.ts` — POST (enregistrer un grade)
- `components/study/flashcard-view.tsx` — interface flip-card + 4 boutons de grade

**Contrat d'API flashcards `POST /api/study/flashcards` :**
```jsonc
// Entrée
{ "chapter_id": "uuid" }

// Sortie (sauvegardé dans study_flashcards)
{
  "flashcards": [
    {
      "front_de": "Was ist der Unterschied zwischen extends und implements?",
      "back_de": "extends = Vererbung von Klassen, implements = Implementierung von Interfaces",
      "back_fr": "extends = héritage de classe, implements = implémentation d'interface"
    }
  ]
}
```

**Algorithme de révision (flux) :**
1. GET `/api/study/flashcards/review?chapter_id=X` → retourne les cartes dues (`due_at <= now()`)
2. L'utilisateur voit chaque carte, la retourne (flip), se note (again/hard/good/easy)
3. POST `/api/study/flashcards/review` → enregistre le grade, met à jour `interval_days`, `ease_factor`, `due_at`

**Contrat review `POST /api/study/flashcards/review` :**
```jsonc
// Entrée
{ "flashcard_id": "uuid", "grade": "good" }

// Sortie
{ "next_due_at": "2026-08-23T10:00:00Z", "interval_days": 3 }
```

**Prompt flashcards (Sonnet) :**
```
Erstelle 8-12 Lernkarten zum Kapitel "{title_de}".

Inhalt:
---
{chapter_summary}
Konzepte: {concepts}
---

SPRACHREGELN:
- front_de: Frage auf Deutsch (Fachbegriffe immer auf Deutsch!)
- back_de: Antwort auf Deutsch (1-2 Sätze, präzise)
- back_fr: Même réponse en français (complément pédagogique)

Règles:
- Mix de types: définition, comparaison, application, piège fréquent
- Couvrir TOUS les concepts, pas de répétition
- Fachbegriffe: TOUJOURS en allemand (Vererbung, Polymorphie, etc.)

Antworte AUSSCHLIESSLICH mit gültigem JSON. Kein Markdown.
{
  "flashcards": [
    { "front_de": "...", "back_de": "...", "back_fr": "..." }
  ]
}
```

**Tests :**
1. Générer des flashcards pour un chapitre → toutes les cartes ont `front_de`, `back_de`, `back_fr`
2. Simuler 5 reviews successives (mock dates) → `interval_days` croît bien, `ease_factor` évolue
3. `again` → reset à 1 jour, `easy` → bond plus long
4. `pnpm test` sur le module `spaced-repetition.ts` (si test framework ajouté)

---

### Étape 5 — Speed Round

**Fichiers :**
- `app/api/study/exercises/speed-round/route.ts` — POST (génère 10 questions, Sonnet, non caché)
- `components/study/speed-round-view.tsx` — chronomètre, score, streak, feedback immédiat

**Contrat `POST /api/study/exercises/speed-round` :**
```jsonc
// Entrée
{ "chapter_id": "uuid", "profile": "theory" }

// Sortie (non caché, régénéré à chaque session)
{
  "questions": [
    {
      "question_de": "Was ist polymorphie?",
      "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
      "correct_index": 2,
      "time_limit_seconds": 15,
      "explanation_fr": "Le polymorphisme permet..."
    }
  ],
  "time_limit_total_seconds": 120
}
```

**Comportement UI :**
- Chronomètre global (120 secondes) + chrono par question (15s)
- Score : +10 points si correct, +bonus vitesse, streak multiplier
- Après chaque réponse : feedback immédiat (vert/rouge + explication courte)
- Résumé de fin : score, streak max, % correct, lien vers chapitre pour revoir

**Prompt Speed Round (Sonnet) :**
```
Speed Round: 10 schnelle Fragen zum Kapitel "{chapter_id}", Profil {profile}.

SPRACHREGELN:
- question_de: Frage auf Deutsch (Fachbegriffe immer auf Deutsch!)
- options: 4 Optionen auf Deutsch, A/B/C/D
- explanation_fr: Erklärung auf Französisch (nur wenn Konzept schwierig)

Chaque question: 4 options, 1 seule bonne, piège fréquent.
Mélange: concepts de base (40%), pièges de confusion (30%), applications (30%).

Antworte AUSSCHLIESSLICH mit gültigem JSON.
{
  "questions": [
    {
      "question_de": "...",
      "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
      "correct_index": 0,
      "time_limit_seconds": 15,
      "explanation_fr": "..."
    }
  ]
}
```

**Tests :**
1. Lancer un Speed Round → 10 questions avec 4 options chacune
2. Vérifier que le JSON est valide et les indices sont dans les bornes
3. Mesurer le fun : jouer 3 manches, vérifier que c'est engageant
4. Vérifier que Sonnet est bien appelé (pas Haiku)

---

### Étape 6 — Tableau de bord "aujourd'hui"

**Fichiers :**
- `app/etude/page.tsx` — réécriture pour inclure les 3 sections
- `components/study/today-card.tsx`

**Sections de la page d'accueil `/etude` :**
1. **À réviser aujourd'hui** : nombre de flashcards dues (SM-2), bouton "Réviser"
2. **Chapitres jamais vus** : liste des chapitres sans aucune activité
3. **Exercice recommandé** : sélectionné par `pickRandomExerciseType` selon le profil du cours le plus récent

---

## 10. Navigation et header

**Modification minimale du header** (`components/header.tsx`) :
- Ajouter un lien "Étude" dans le header, à côté de "IT Lernen"
- C'est un `<Link href="/etude">` classique, aucun composant existant n'est altéré

**`lib/study/ai-client.ts`** peut être utilisé par l'ensemble des routes `app/api/study/*`, centralisant la logique d'appel à Claude et le choix du modèle.

---

## 11. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| PDF slides mal extraits (texte vide ou chaotique) | Découpage chapitres incohérent | Validation utilisateur obligatoire. Fallback : si extraction < 100 mots, signaler erreur et suggérer un autre fichier |
| Cache de cours détaillé trop gros en DB | Espace Supabase | Contenu JSON typiquement 5-15k chars par chapitre. 60 chapitres = ~500k chars max, bien dans les limites |
| JSON mal formaté (Speed Round, flashcards) | Réponse mal formatée | Prompt strict avec schéma JSON + extraction robuste (déjà en place dans `lib/api-errors.ts`). Fallback : régénérer 1 fois si JSON invalide |
| Deux systèmes de progression parallèles | Confusion utilisateur | Assumé : les deux modes sont complémentaires, pas unifiés. UI séparée, pas de mélange |
| Coût réel > estimation | Budget dépassé | Cache agressif (contenu pédagogique jamais régénéré). Monitoring simple : compter les appels API par mois. Option Haiku en réserve si besoin |

---

## 12. Backlog (pas oublié, reporté)

- **Fusion Vorlesung** : quand un 2e fichier arrive pour un même cours, fusionner les chapitres plutôt que tout recréer
- **Édition manuelle** : modifier le découpage chapitres après extraction
- **Recherche web** : trouver des sources fiables pour enrichir un concept (coût + fiabilité à évaluer)
- **Exercices supplémentaires** : Memory (paires), Quiz Combo, Concept Map interactive (après retour d'usage sur Speed Round)
- **Gamification** : XP, niveaux, streak sur plusieurs jours
- **Support formats** : TXT, Markdown en plus des PDF

---

## 13. Ordre d'implémentation recommandé

```
Étape 0  → Étape 1  → Étape 2  → Étape 3  → Étape 4  → Étape 5  → Étape 6
fondations  upload      cours      stratégie   SM-2       speed     dashboard
            +ingest     détaillé               flashcards round
```

Chaque étape est indépendante et testable isolément. On ne passe à l'étape N+1 que quand l'étape N est validée (`pnpm build` vert + tests manuels OK + aucune régression sur les anciennes routes).
